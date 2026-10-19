from app.security import MAX_REQUEST_BODY_BYTES
import asyncio
import base64
import json
import os
import time
from typing import List, Optional, Dict, Any, Tuple
import httpx

from app.models import (
    ApiItem,
    CategorySummary,
    CatalogStats,
    ProxyRequest,
    ProxyResponse,
    ValidationRequest,
    ValidationResult,
    SubmissionPayload,
    HealthStatus,
    HealthCheckResult,
    EndpointStatusItem,
    StatusDashboardResponse,
    BatchHealthCheckResponse,
    ReportPayload
)
from app.config import settings
from app.logger import logger
from app.security import (
    safe_http_request,
    SSRFSecurityError,
    validate_url_ssrf,
    ALLOWED_PROXY_METHODS
)


class CatalogService:
    def __init__(
        self,
        data_path: str = settings.DATA_FILE_PATH,
        submissions_path: str = settings.SUBMISSIONS_FILE_PATH,
        health_history_path: str = settings.HEALTH_HISTORY_FILE_PATH
    ):
        self.data_path = data_path
        self.submissions_path = submissions_path
        self.health_history_path = health_history_path
        self.reports_path = os.path.join(os.path.dirname(data_path), "reports.json")
        self._apis: List[ApiItem] = []
        self._submissions: List[Dict[str, Any]] = []
        self._reports: List[Dict[str, Any]] = []
        self._health_history: List[Dict[str, Any]] = []
        self._probe_count: int = 0
        self.load_data()
        self._load_submissions()
        self._load_reports()
        self._load_health_history()

    def _apply_health_from_history(self) -> None:
        """Applies authentic recorded health observations to APIs."""
        if not self._health_history or not self._apis:
            return

        obs_by_slug: Dict[str, List[Dict[str, Any]]] = {}
        for obs in self._health_history:
            s = str(obs.get("slug", "")).lower().strip()
            if s:
                obs_by_slug.setdefault(s, []).append(obs)

        for api in self._apis:
            slug = api.slug.lower().strip()
            if slug in obs_by_slug:
                observations = obs_by_slug[slug]
                latest = observations[-1]

                healthy_runs = sum(1 for o in observations if o.get("status") == "healthy")
                degraded_runs = sum(1 for o in observations if o.get("status") == "degraded")
                uptime = round((healthy_runs + (degraded_runs * 0.5)) / len(observations) * 100.0, 1)

                valid_latencies = [o.get("latency_ms", 0) for o in observations if 0 < o.get("latency_ms", 0) < 9000]
                avg_lat = int(sum(valid_latencies) / len(valid_latencies)) if valid_latencies else latest.get("latency_ms", 120)

                status_str = latest.get("status", "healthy")
                if status_str == "healthy":
                    status_enum = HealthStatus.HEALTHY
                elif status_str == "degraded":
                    status_enum = HealthStatus.DEGRADED
                elif status_str == "offline":
                    status_enum = HealthStatus.OFFLINE
                else:
                    status_enum = HealthStatus.UNTESTED

                api.health.status = status_enum
                api.health.uptime_percent = uptime
                api.health.avg_latency_ms = avg_lat
                api.health.last_checked = latest.get("timestamp")
                api.health.last_status_code = latest.get("status_code", 200)
                api.health.message = f"Live Verified (HTTP {api.health.last_status_code} in {api.health.avg_latency_ms}ms)"

    def _load_reports(self) -> None:
        if os.path.exists(self.reports_path):
            try:
                with open(self.reports_path, "r", encoding="utf-8") as f:
                    self._reports = json.load(f)
            except Exception:
                self._reports = []
        else:
            self._reports = []

    def _save_reports(self) -> None:
        try:
            os.makedirs(os.path.dirname(self.reports_path), exist_ok=True)
            with open(self.reports_path, "w", encoding="utf-8") as f:
                json.dump(self._reports, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save reports: {e}")

    def load_data(self) -> None:
        """Loads and validates catalog entries from JSON data file."""
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                valid_apis = []
                for item in raw_data:
                    try:
                        valid_apis.append(ApiItem(**item))
                    except Exception as ex:
                        logger.warning(f"Skipping malformed catalog entry {item.get('name', 'unknown')}: {ex}")
                self._apis = valid_apis
                logger.info(f"Loaded {len(self._apis)} verified APIs into master catalog ({self.data_path})")
            except Exception as e:
                logger.error(f"Failed to load catalog data from {self.data_path}: {e}")
                self._apis = []
        else:
            self._apis = []
            logger.warning(f"Data file not found at: {self.data_path}")

    def _load_submissions(self) -> None:
        """Loads persisted community submissions from disk."""
        if os.path.exists(self.submissions_path):
            try:
                with open(self.submissions_path, "r", encoding="utf-8") as f:
                    self._submissions = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load submissions file: {e}")
                self._submissions = []
        else:
            self._submissions = []

    def _save_submissions(self) -> None:
        """Persists community submissions to disk."""
        try:
            os.makedirs(os.path.dirname(self.submissions_path), exist_ok=True)
            with open(self.submissions_path, "w", encoding="utf-8") as f:
                json.dump(self._submissions, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist submissions to {self.submissions_path}: {e}")

    def _load_health_history(self) -> None:
        """Loads recorded historical health observations."""
        if os.path.exists(self.health_history_path):
            try:
                with open(self.health_history_path, "r", encoding="utf-8") as f:
                    self._health_history = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load health history file: {e}")
                self._health_history = []
        else:
            self._health_history = []
        self._apply_health_from_history()

    def _record_health_observation(self, slug: str, status: str, status_code: int, latency_ms: int) -> None:
        """Persists a live health observation with timestamp."""
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        obs = {
            "slug": slug,
            "timestamp": now_iso,
            "status": status,
            "status_code": status_code,
            "latency_ms": latency_ms
        }
        self._health_history.append(obs)
        if len(self._health_history) > 5000:
            self._health_history = self._health_history[-5000:]
        try:
            os.makedirs(os.path.dirname(self.health_history_path), exist_ok=True)
            with open(self.health_history_path, "w", encoding="utf-8") as f:
                json.dump(self._health_history, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to persist health observation: {e}")

    def sync_from_remote(self, limit: int = 0, dry_run: bool = False) -> Dict[str, Any]:
        from app.scripts.sync_apis import sync_catalog
        res = sync_catalog(limit=limit, dry_run=dry_run)
        if not dry_run:
            self.load_data()
        return res

    def get_all(self) -> List[ApiItem]:
        return self._apis

    def get_by_slug(self, slug: str) -> Optional[ApiItem]:
        target = slug.lower().strip()
        for api in self._apis:
            if api.slug.lower() == target:
                return api
        return None

    def search_apis(
        self,
        q: Optional[str] = None,
        category: Optional[str] = None,
        auth_type: Optional[str] = None,
        pricing_tier: Optional[str] = None,
        collection: Optional[str] = None,
        status: Optional[str] = None,
        slugs: Optional[List[str]] = None,
        sort: Optional[str] = "popular",
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[ApiItem], int]:
        results = self._apis

        # Filter by specific slugs (e.g. for saved / bookmarked APIs)
        if slugs is not None:
            slug_set = {s.lower().strip() for s in slugs if s and s.strip()}
            results = [a for a in results if a.slug.lower() in slug_set]

        # Filter by collection
        if collection:
            c = collection.lower().strip()
            if c in ("no-auth", "no_auth"):
                results = [a for a in results if getattr(a.auth_type, "value", str(a.auth_type)).lower() == "none"]
            elif c in ("cors-enabled", "cors-ready", "cors"):
                results = [a for a in results if a.cors_supported]
            elif c in ("developer-tools", "dev-tools", "tools"):
                results = [a for a in results if a.category == "developer-tools" or "developer-tools" in a.tags]
            elif c in ("high-uptime", "uptime"):
                results = [a for a in results if a.health.uptime_percent is not None and a.health.uptime_percent >= 99.0]
            elif c in ("fast-response", "ultra-fast", "low-latency"):
                results = [a for a in results if a.health.avg_latency_ms is not None and a.health.avg_latency_ms < 150]
            elif c in ("open-data", "public-data"):
                results = [a for a in results if a.category in ("open-data", "science", "geography") or "open-data" in a.tags]

        # Filter by query with multi-word tokenization and relevance scoring
        if q:
            term = q.lower().strip()
            words = [w for w in term.split() if w]
            scored_results = []
            for a in results:
                name_l = a.name.lower()
                desc_l = a.description.lower()
                cat_l = a.category.lower()
                tags_l = [t.lower() for t in a.tags]
                combined = f"{name_l} {desc_l} {cat_l} {' '.join(tags_l)}"

                # Check if all search words appear
                if all(w in combined for w in words):
                    score = 0
                    if term in name_l:
                        score += 100
                    if any(term == t for t in tags_l):
                        score += 50
                    if term in combined:
                        score += 30
                    if all(w in name_l for w in words):
                        score += 40
                    scored_results.append((score, a))

            norm_sort = (sort or "popular").lower().strip()
            if norm_sort == "popular":
                scored_results.sort(key=lambda item: (item[0], item[1].health.uptime_percent or 0.0, -(item[1].health.avg_latency_ms or 99999)), reverse=True)
                results = [item[1] for item in scored_results]
            else:
                results = [item[1] for item in scored_results]

        # Filter by category
        if category and category.lower() != "all":
            cat_norm = category.lower().strip()
            results = [a for a in results if a.category.lower() == cat_norm]

        # Filter by auth type
        if auth_type and auth_type.lower() != "all":
            auth_norm = auth_type.lower().strip()
            results = [a for a in results if getattr(a.auth_type, "value", str(a.auth_type)).lower() == auth_norm]

        # Filter by pricing tier
        if pricing_tier and pricing_tier.lower() != "all":
            pt_norm = pricing_tier.lower().strip()
            results = [a for a in results if getattr(a.pricing_tier, "value", str(a.pricing_tier)).lower() == pt_norm]

        # Filter by health status
        if status and status.lower() != "all":
            st_norm = status.lower().strip()
            results = [a for a in results if getattr(a.health.status, "value", str(a.health.status)).lower() == st_norm]

        # Sort results
        norm_sort = (sort or "popular").lower().strip()
        if not (q and norm_sort == "popular"):
            if norm_sort == "latency":
                results = sorted(results, key=lambda a: a.health.avg_latency_ms if a.health.avg_latency_ms is not None else 99999)
            elif norm_sort == "uptime":
                results = sorted(results, key=lambda a: a.health.uptime_percent if a.health.uptime_percent is not None else 0.0, reverse=True)
            elif norm_sort == "alphabetical":
                results = sorted(results, key=lambda a: a.name.lower())
            else:
                results = sorted(results, key=lambda a: (a.health.uptime_percent or 0.0, -(a.health.avg_latency_ms or 99999)), reverse=True)

        total = len(results)
        bounded_limit = max(1, min(limit, 500))
        bounded_offset = max(0, offset)
        paginated = results[bounded_offset : bounded_offset + bounded_limit]
        return paginated, total

    def get_categories(self) -> List[CategorySummary]:
        cat_counts: Dict[str, int] = {}
        for api in self._apis:
            cat = api.category.lower()
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        category_metadata = {
            "developer-tools": {"name": "Developer Tools & Testing", "icon": "Code2", "desc": "Compilers, regex, code generators, testing utilities, and prototyping fixtures."},
            "security": {"name": "Security, Identity & Auth", "icon": "ShieldCheck", "desc": "Authentication, cybersecurity, threat intelligence, SSL, and vulnerability scanners."},
            "cloud-storage": {"name": "Cloud, Hosting & Storage", "icon": "Cloud", "desc": "Object storage, CDNs, serverless runtimes, and distributed hosting APIs."},
            "database": {"name": "Databases, BaaS & CMS", "icon": "Database", "desc": "Managed SQL/NoSQL databases, Backend-as-a-Service, and headless content management."},
            "devops-ci": {"name": "DevOps, CI/CD & Monitoring", "icon": "Terminal", "desc": "Continuous integration, deployment pipelines, APM telemetry, and uptime monitoring."},
            "communication": {"name": "Communication & Messaging", "icon": "Send", "desc": "SMS gateways, email delivery, chat channels, webhooks, and telephony services."},
            "productivity": {"name": "Productivity & Documents", "icon": "FileText", "desc": "PDF processors, spreadsheets, calendars, task management, and workflow automation."},
            "ai-ml": {"name": "AI & Machine Learning", "icon": "Cpu", "desc": "Large language models, computer vision, audio transcription, and neural network APIs."},
            "finance": {"name": "Finance, Banking & Markets", "icon": "TrendingUp", "desc": "Stock tickers, central banking rates, financial ledgers, and market analytics."},
            "crypto-web3": {"name": "Crypto, Web3 & Blockchain", "icon": "Coins", "desc": "Cryptocurrency exchange rates, blockchain node endpoints, and smart contract feeds."},
            "ecommerce": {"name": "eCommerce & Payments", "icon": "ShoppingCart", "desc": "Payment gateways, digital checkout, merchant tooling, and shopping catalog feeds."},
            "geography": {"name": "Geography, Maps & Location", "icon": "Globe", "desc": "Reverse geocoding, boundary maps, IP geolocation, and coordinates."},
            "transportation": {"name": "Transit, Vehicles & Flights", "icon": "Truck", "desc": "Public transit, airline status, flight tracking, and vehicle telemetry."},
            "gaming": {"name": "Gaming, Esports & Comics", "icon": "Gamepad2", "desc": "Video game databases, Steam stats, esports brackets, and anime catalogs."},
            "music": {"name": "Music, Sound & Podcasts", "icon": "Music", "desc": "Audio recognition, Spotify feeds, lyrics catalogs, and streaming podcasts."},
            "video-movies": {"name": "Video, Movies & TV Feeds", "icon": "Film", "desc": "Movie metadata, IMDb/TMDB feeds, video streaming, and cinema schedules."},
            "art-design": {"name": "Art, Design & Graphics", "icon": "Palette", "desc": "Color palettes, stock photography, vector icons, and font catalogs."},
            "science": {"name": "Science, Space & Math", "icon": "Orbit", "desc": "NASA astronomy feeds, orbital tracking, planetary data, and physics computations."},
            "health-medical": {"name": "Health, Medicine & Fitness", "icon": "HeartPulse", "desc": "Clinical datasets, drug libraries, workout metrics, and nutrition calculators."},
            "food-drink": {"name": "Food, Dining & Recipes", "icon": "Utensils", "desc": "Recipe collections, wine pairings, nutritional databases, and restaurant menus."},
            "education-books": {"name": "Books, Education & Libraries", "icon": "BookOpen", "desc": "ISBN registries, university catalogs, open dictionaries, and encyclopedia feeds."},
            "weather": {"name": "Weather & Climate", "icon": "CloudSun", "desc": "Real-time forecast, atmospheric records, and historical climate tracking."},
            "sports": {"name": "Sports & Athletics", "icon": "Trophy", "desc": "Live match scores, athletic league tables, fixtures, and player statistics."},
            "animals": {"name": "Animals & Pets", "icon": "PawPrint", "desc": "Canine breeds, feline trivia, wildlife conservation, and animal rescue directories."},
            "social-news": {"name": "News, Journalism & Social", "icon": "Newspaper", "desc": "Headlines, RSS aggregators, community forums, and social telemetry."},
            "open-data": {"name": "Open Data & Demographics", "icon": "Building2", "desc": "Government census databases, patent filings, and public demographic records."},
            "entertainment": {"name": "Entertainment & Culture", "icon": "Sparkles", "desc": "Interactive trivia, pop culture quotes, jokes, and digital entertainment."},
            "reference": {"name": "Reference & Directories", "icon": "BookOpen", "desc": "General directories, lexicon lookups, and citation tools."},
            "news": {"name": "Media & News", "icon": "Newspaper", "desc": "Broadcast media, journalism archives, and breaking alerts."}
        }

        summaries = []
        for cat_slug, count in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True):
            meta = category_metadata.get(cat_slug, {
                "name": cat_slug.replace("-", " ").title(),
                "icon": "Box",
                "desc": f"Explore verified free {cat_slug} APIs."
            })
            summaries.append(
                CategorySummary(
                    slug=cat_slug,
                    name=meta["name"],
                    count=count,
                    icon=meta["icon"],
                    description=meta["desc"]
                )
            )
        return summaries

    def get_probe_count(self) -> int:
        return self._probe_count

    def get_stats(self) -> CatalogStats:
        total = len(self._apis)
        if total == 0:
            return CatalogStats(
                total_apis=0,
                healthy_count=0,
                degraded_count=0,
                offline_count=0,
                avg_latency_ms=0,
                global_uptime_percent=100.0,
                total_checks_today=0
            )

        healthy_count = sum(1 for a in self._apis if a.health.status == HealthStatus.HEALTHY)
        degraded_count = sum(1 for a in self._apis if a.health.status == HealthStatus.DEGRADED)
        offline_count = sum(1 for a in self._apis if a.health.status == HealthStatus.OFFLINE)
        untested_count = sum(1 for a in self._apis if a.health.status == HealthStatus.UNTESTED)

        tested_latency = [a.health.avg_latency_ms for a in self._apis if a.health.avg_latency_ms is not None]
        avg_latency = int(sum(tested_latency) / len(tested_latency)) if tested_latency else 0

        tested_uptime = [a.health.uptime_percent for a in self._apis if a.health.uptime_percent is not None]
        avg_uptime = round(sum(tested_uptime) / len(tested_uptime), 2) if tested_uptime else 100.0

        # Reflect actual timestamped observations performed today
        today_prefix = time.strftime("%Y-%m-%d", time.gmtime())
        historical_checks_today = sum(
            1 for obs in self._health_history
            if obs.get("timestamp", "").startswith(today_prefix)
        )
        total_checks = historical_checks_today + self._probe_count

        return CatalogStats(
            total_apis=total,
            healthy_count=healthy_count,
            degraded_count=degraded_count,
            offline_count=offline_count,
            untested_count=untested_count,
            avg_latency_ms=avg_latency,
            global_uptime_percent=avg_uptime,
            total_checks_today=total_checks
        )

    async def check_api_health(self, slug: str, timeout: float = 8.0) -> HealthCheckResult:
        """
        Sends an authentic live HTTP request directly to the API's target endpoint
        via the SSRF-protected safe request engine.
        Measures real network latency, inspects the response status code,
        determines live operational health, and records real observations.
        """
        api = self.get_by_slug(slug)
        if not api:
            raise ValueError(f"API with slug or ID '{slug}' was not found in the catalog")

        full_url = api.base_url.rstrip("/") + "/" + api.endpoint.lstrip("/")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FreeAPIHub-HealthChecker/1.0",
            "Accept": "application/json, text/plain, */*"
        }
        if api.default_headers and isinstance(api.default_headers, dict):
            headers.update(api.default_headers)

        start_time = time.perf_counter()
        status_code = 0
        error_msg = None
        latency_ms = 0

        probe_method = "GET"
        if api.endpoints and len(api.endpoints) > 0:
            for ep in api.endpoints:
                if ep.path == api.endpoint and ep.method:
                    probe_method = ep.method.upper()
                    break
            else:
                if api.endpoints[0].method:
                    probe_method = api.endpoints[0].method.upper()

        try:
            status_code, latency_ms, _, _ = await safe_http_request(
                method=probe_method,
                url=full_url,
                headers=headers,
                params=api.default_params or {},
                timeout=timeout
            )
        except SSRFSecurityError as s_err:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            status_code = 0
            error_msg = f"Security Policy Block: {str(s_err)}"
        except httpx.TimeoutException:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            status_code = 0
            error_msg = f"Timed out after {timeout}s (Host did not reply)"
        except httpx.ConnectError:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            status_code = 0
            error_msg = "Connection failed (Host unreachable or connection refused)"
        except Exception as ex:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            status_code = 0
            error_msg = f"Probe error: {str(ex)}"

        # Status determination based on genuine HTTP response
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        is_healthy = 200 <= status_code < 400

        if is_healthy:
            if latency_ms < 2000:
                health_status = HealthStatus.HEALTHY
                message = f"Operational - HTTP {status_code} in {latency_ms}ms"
            else:
                health_status = HealthStatus.DEGRADED
                message = f"Degraded - Slow response latency ({latency_ms}ms)"
        elif status_code in (429, 403):
            health_status = HealthStatus.DEGRADED
            message = f"Degraded - HTTP {status_code} ({'Rate limited' if status_code == 429 else 'Forbidden / Bot protection'})"
        elif status_code in (404, 410):
            health_status = HealthStatus.OFFLINE
            message = f"Offline - Endpoint not found (HTTP {status_code})"
        elif status_code >= 500:
            health_status = HealthStatus.OFFLINE
            message = f"Offline - Server error (HTTP {status_code})"
        else:
            health_status = HealthStatus.OFFLINE
            message = f"Offline - {error_msg or f'Probe failed with status {status_code}'}"

        # Rolling uptime calculation
        prev_uptime = api.health.uptime_percent if api.health else 99.0
        probe_score = 100.0 if health_status == HealthStatus.HEALTHY else (50.0 if health_status == HealthStatus.DEGRADED else 0.0)
        new_uptime = round(prev_uptime * 0.95 + probe_score * 0.05, 1)

        # Update in-memory item state so subsequent reads immediately reflect this real check
        api.health.status = health_status
        api.health.last_status_code = status_code
        api.health.avg_latency_ms = latency_ms
        api.health.last_checked = now_iso
        api.health.uptime_percent = max(0.0, min(100.0, new_uptime))
        api.health.message = message

        self._probe_count += 1
        self._record_health_observation(api.slug, health_status.value, status_code, latency_ms)
        logger.health(slug=api.slug, status=health_status.value, latency_ms=latency_ms, status_code=status_code)

        return HealthCheckResult(
            slug=api.slug,
            name=api.name,
            target_url=full_url,
            status=health_status,
            status_code=status_code,
            latency_ms=latency_ms,
            uptime_percent=api.health.uptime_percent,
            last_checked=now_iso,
            message=message,
            is_live_tested=True
        )

    async def check_batch_health(
        self,
        slugs: Optional[List[str]] = None,
        limit: int = 25,
        max_concurrency: int = 8
    ) -> BatchHealthCheckResponse:
        """
        Executes real concurrent HTTP health probes across a deduplicated list of APIs.
        Enforces bounded concurrency and bounded batch size.
        """
        if slugs and len(slugs) > 0:
            seen_slugs = set()
            unique_slugs = []
            for s in slugs:
                clean_s = str(s).strip()
                if clean_s and clean_s not in seen_slugs:
                    seen_slugs.add(clean_s)
                    unique_slugs.append(clean_s)
            target_apis = [self.get_by_slug(s) for s in unique_slugs[:50] if self.get_by_slug(s)]
        else:
            bounded_limit = min(max(1, limit), 50)
            target_apis = self._apis[:bounded_limit]

        bounded_concurrency = min(max(1, max_concurrency), 10)
        sem = asyncio.Semaphore(bounded_concurrency)

        async def probe_with_semaphore(item: ApiItem) -> HealthCheckResult:
            async with sem:
                try:
                    return await self.check_api_health(item.slug)
                except Exception as ex:
                    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    return HealthCheckResult(
                        slug=item.slug,
                        name=item.name,
                        target_url=f"{item.base_url}/{item.endpoint}",
                        status=HealthStatus.OFFLINE,
                        status_code=0,
                        latency_ms=0,
                        uptime_percent=item.health.uptime_percent,
                        last_checked=now_iso,
                        message=f"Probe failed: {str(ex)}",
                        is_live_tested=True
                    )

        tasks = [probe_with_semaphore(api) for api in target_apis if api]
        results: List[HealthCheckResult] = await asyncio.gather(*tasks)

        stats = self.get_stats()
        return BatchHealthCheckResponse(
            total_probed=len(results),
            probes_executed=len(results),
            healthy_count=sum(1 for r in results if r.status == HealthStatus.HEALTHY),
            degraded_count=sum(1 for r in results if r.status == HealthStatus.DEGRADED),
            offline_count=sum(1 for r in results if r.status == HealthStatus.OFFLINE),
            stats=stats,
            results=results
        )

    async def execute_proxy(self, req: ProxyRequest) -> ProxyResponse:
        """
        Relays client request to target public API through SSRF-hardened engine.
        Enforces allowed methods, body limits, header sanitization, anti-DNS-rebinding, and safe redirects.
        """
        start_time = time.perf_counter()

        method = (req.method or "GET").upper()
        if method not in ALLOWED_PROXY_METHODS:
            return ProxyResponse(
                status_code=405,
                latency_ms=0,
                headers={},
                data=None,
                error=f"Method Not Allowed (HTTP 405): Method '{method}' is not permitted by security policy. Allowed methods: {', '.join(sorted(ALLOWED_PROXY_METHODS))}."
            )

        # Handle request body serialization
        body_bytes = None
        headers = dict(req.headers or {})
        if req.body is not None:
            if isinstance(req.body, bytes):
                body_bytes = req.body
            elif isinstance(req.body, str):
                body_bytes = req.body.encode("utf-8")
            elif isinstance(req.body, (dict, list)):
                body_bytes = json.dumps(req.body).encode("utf-8")
                headers.setdefault("Content-Type", "application/json")
            else:
                body_bytes = str(req.body).encode("utf-8")

            if len(body_bytes) > MAX_REQUEST_BODY_BYTES:
                return ProxyResponse(
                    status_code=413,
                    latency_ms=0,
                    headers={},
                    data=None,
                    error=f"Payload Too Large (HTTP 413): Request body exceeds maximum allowed size ({MAX_REQUEST_BODY_BYTES // 1024}KB)."
                )

        try:
            status_code, latency, res_headers, raw_body = await safe_http_request(
                method=method,
                url=req.url,
                headers=headers,
                params=req.params,
                content=body_bytes,
                timeout=float(settings.PROXY_TIMEOUT_SECONDS)
            )

            # Attempt to parse response body (handling JSON, binary media/images, and text)
            data = None
            if raw_body:
                content_type = res_headers.get("content-type", "").lower()
                is_media = any(content_type.startswith(t) for t in ("image/", "audio/", "video/", "application/pdf"))
                if is_media:
                    b64 = base64.b64encode(raw_body).decode("ascii")
                    mime = content_type.split(";")[0].strip() or "image/png"
                    data = f"data:{mime};base64,{b64}"
                else:
                    try:
                        data = json.loads(raw_body.decode("utf-8"))
                    except Exception:
                        try:
                            data = raw_body.decode("utf-8", errors="replace")
                        except Exception:
                            data = str(raw_body)

            error_msg = None
            if status_code == 401:
                error_msg = "HTTP 401 Unauthorized: Target endpoint requires authentication credentials or an API Key."
            elif status_code == 403:
                error_msg = "HTTP 403 Forbidden: Access denied by target API server."
            elif status_code == 404:
                error_msg = f"HTTP 404 Not Found: The endpoint path '{req.url}' does not exist on this server."
            elif status_code == 429:
                error_msg = "HTTP 429 Too Many Requests: Rate limit quota exceeded on target API."
            elif status_code >= 500:
                error_msg = f"HTTP {status_code} Server Error: Upstream server encountered an internal failure processing the request."

            logger.proxy(target_url=req.url, method=req.method.upper(), status_code=status_code, latency_ms=latency)
            return ProxyResponse(
                status_code=status_code,
                latency_ms=latency,
                headers=res_headers,
                data=data,
                error=error_msg
            )
        except SSRFSecurityError as s_err:
            logger.warning(f"SSRF policy blocked request to {req.url}: {s_err}")
            raise s_err
        except httpx.TimeoutException:
            latency = int((time.perf_counter() - start_time) * 1000)
            logger.error(f"Proxy timeout ({latency}ms) on {req.method.upper()} {req.url}")
            return ProxyResponse(
                status_code=504,
                latency_ms=latency,
                headers={},
                data=None,
                error=f"Gateway Timeout (504): Target endpoint '{req.url}' timed out after {settings.PROXY_TIMEOUT_SECONDS}s."
            )
        except httpx.ConnectError:
            latency = int((time.perf_counter() - start_time) * 1000)
            logger.error(f"Proxy connection error ({latency}ms) on {req.method.upper()} {req.url}")
            return ProxyResponse(
                status_code=502,
                latency_ms=latency,
                headers={},
                data=None,
                error=f"Connection Error (502): Unable to connect to '{req.url}'. Host is unreachable or offline."
            )
        except Exception as ex:
            latency = int((time.perf_counter() - start_time) * 1000)
            logger.error(f"Proxy relay error on {req.method.upper()} {req.url}: {ex}")
            return ProxyResponse(
                status_code=502,
                latency_ms=latency,
                headers={},
                data=None,
                error="Proxy Relay Error: Unable to complete outbound request to target server."
            )

    async def validate_endpoint(self, req: ValidationRequest) -> ValidationResult:
        full_url = req.base_url.rstrip("/") + "/" + req.endpoint.lstrip("/")
        start_time = time.perf_counter()
        try:
            status_code, latency, _, raw_body = await safe_http_request(
                method=req.method.upper(),
                url=full_url,
                headers={"User-Agent": "Free-API-Hub-Validator/1.0", "Accept": "application/json, text/plain, */*"},
                timeout=8.0
            )

            is_valid = 200 <= status_code < 400

            data = None
            if raw_body:
                try:
                    data = json.loads(raw_body.decode("utf-8"))
                except Exception:
                    data = raw_body.decode("utf-8", errors="replace")[:200]

            if is_valid:
                msg = f"Endpoint verified successfully! HTTP {status_code} OK."
            elif status_code == 401:
                msg = "Validation failed: HTTP 401 Unauthorized. Target endpoint requires authentication or an API Key."
            elif status_code == 403:
                msg = "Validation failed: HTTP 403 Forbidden. Access was denied by upstream server."
            elif status_code == 404:
                msg = f"Validation failed: HTTP 404 Not Found. Path '{req.endpoint}' does not exist on base URL."
            elif status_code == 429:
                msg = "Validation failed: HTTP 429 Too Many Requests. Target API rate limit reached."
            else:
                msg = f"Validation failed: Endpoint returned HTTP {status_code} error."

            return ValidationResult(
                is_valid=is_valid,
                status_code=status_code,
                latency_ms=latency,
                message=msg,
                sample_data=data
            )
        except SSRFSecurityError as s_err:
            latency = int((time.perf_counter() - start_time) * 1000)
            return ValidationResult(
                is_valid=False,
                status_code=0,
                latency_ms=latency,
                message=f"Validation failed: Destination address is prohibited ({str(s_err)}).",
                sample_data=None
            )
        except httpx.TimeoutException:
            latency = int((time.perf_counter() - start_time) * 1000)
            return ValidationResult(
                is_valid=False,
                status_code=0,
                latency_ms=latency,
                message=f"Validation failed: Connection timed out after 8.0s. Host did not respond in time.",
                sample_data=None
            )
        except httpx.ConnectError:
            latency = int((time.perf_counter() - start_time) * 1000)
            return ValidationResult(
                is_valid=False,
                status_code=0,
                latency_ms=latency,
                message=f"Validation failed: Host unreachable or connection failed. Verify the domain name.",
                sample_data=None
            )
        except Exception as ex:
            latency = int((time.perf_counter() - start_time) * 1000)
            return ValidationResult(
                is_valid=False,
                status_code=0,
                latency_ms=latency,
                message=f"Validation failed: {str(ex)}",
                sample_data=None
            )

    def record_submission(self, payload: SubmissionPayload) -> Dict[str, Any]:
        """
        Durable submission recording with duplicate detection against catalog
        and pending review submissions.
        """
        norm_name = payload.name.strip().lower()
        norm_url = f"{payload.base_url.rstrip('/')}/{payload.endpoint.lstrip('/')}".lower()

        # Check existing catalog for duplicates
        for api in self._apis:
            if api.name.strip().lower() == norm_name:
                return {
                    "duplicate": True,
                    "reason": f"An API with the name '{api.name}' already exists in the catalog.",
                    "status": "duplicate_rejected"
                }
            api_full = f"{api.base_url.rstrip('/')}/{api.endpoint.lstrip('/')}".lower()
            if api_full == norm_url:
                return {
                    "duplicate": True,
                    "reason": f"An API with the target endpoint '{api_full}' already exists in the catalog ({api.name}).",
                    "status": "duplicate_rejected"
                }

        # Check existing pending submissions for duplicates
        for sub in self._submissions:
            if sub.get("name", "").strip().lower() == norm_name:
                return {
                    "duplicate": True,
                    "reason": f"A submission for '{payload.name}' is already currently in the review queue.",
                    "status": "duplicate_pending"
                }

        submission_id = f"sub_{int(time.time())}_{len(self._submissions) + 1}"
        submission_record = {
            "id": submission_id,
            "name": payload.name.strip(),
            "category": payload.category.strip().lower(),
            "base_url": payload.base_url.strip(),
            "endpoint": payload.endpoint.strip(),
            "documentation_url": payload.documentation_url.strip(),
            "auth_type": getattr(payload.auth_type, "value", str(payload.auth_type)),
            "pricing_tier": getattr(payload.pricing_tier, "value", str(payload.pricing_tier)),
            "description": payload.description.strip(),
            "detailed_description": payload.detailed_description.strip() if payload.detailed_description else None,
            "status": "pending_review",
            "submitted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duplicate": False
        }
        self._submissions.append(submission_record)
        self._save_submissions()
        return submission_record

    def get_submission_status(self, submission_id: str) -> Optional[Dict[str, Any]]:
        for sub in self._submissions:
            if sub.get("id") == submission_id:
                return sub
        return None

    def list_submissions(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._submissions[-limit:]

    def record_report(self, payload: ReportPayload, client_ip: str) -> Dict[str, Any]:
        """
        Records a persistent report about a broken, offline, or outdated catalog API.
        """
        api = self.get_by_slug(payload.api_slug)
        if not api:
            raise ValueError(f"API with slug '{payload.api_slug}' was not found in catalog.")

        import uuid
        rep_id = f"rep_{uuid.uuid4().hex[:10]}"
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        report_record = {
            "id": rep_id,
            "api_slug": payload.api_slug,
            "api_name": api.name,
            "issue_type": payload.issue_type,
            "details": payload.details,
            "contact_email": payload.contact_email,
            "client_ip": client_ip,
            "created_at": now_iso,
            "status": "under_investigation"
        }
        self._reports.append(report_record)
        self._save_reports()
        logger.warning(f"Recorded broken API report {rep_id} for {payload.api_slug} ({payload.issue_type})")
        return report_record

    def get_status_dashboard(self, limit: int = 100, offset: int = 0) -> StatusDashboardResponse:
        """Returns dedicated typed status dashboard data."""
        apis = self._apis
        stats = self.get_stats()
        bounded_limit = max(1, min(limit, 200))
        bounded_offset = max(0, offset)
        paginated_apis = apis[bounded_offset : bounded_offset + bounded_limit]

        endpoint_items: List[EndpointStatusItem] = [
            EndpointStatusItem(
                name=a.name,
                slug=a.slug,
                category=a.category,
                base_url=a.base_url,
                endpoint=a.endpoint,
                status=a.health.status,
                uptime_percent=a.health.uptime_percent,
                avg_latency_ms=a.health.avg_latency_ms,
                last_checked=a.health.last_checked,
                last_status_code=a.health.last_status_code,
                message=a.health.message
            )
            for a in paginated_apis
        ]

        return StatusDashboardResponse(
            stats=stats,
            total=len(apis),
            endpoints=endpoint_items
        )


catalog_service = CatalogService()
