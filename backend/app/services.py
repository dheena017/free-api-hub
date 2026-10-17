import asyncio
import json
import os
import time
import httpx
from typing import List, Optional, Dict, Any, Tuple
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
    HealthCheckResult
)
from app.config import settings
from app.logger import logger

class CatalogService:
    def __init__(self, data_path: str = settings.DATA_FILE_PATH):
        self.data_path = data_path
        self._apis: List[ApiItem] = []
        self._submissions: List[Dict[str, Any]] = []
        self._probe_count: int = 0
        self.load_data()

    def load_data(self) -> None:
        if os.path.exists(self.data_path):
            with open(self.data_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                self._apis = [ApiItem(**item) for item in raw_data]
            logger.info(f"Loaded {len(self._apis)} verified APIs into master catalog ({self.data_path})")
        else:
            self._apis = []
            logger.warning(f"Data file not found at: {self.data_path}")

    def sync_from_remote(self, limit: int = 0, dry_run: bool = False) -> Dict[str, Any]:
        from app.scripts.sync_apis import sync_catalog
        res = sync_catalog(limit=limit, dry_run=dry_run)
        if not dry_run:
            self.load_data()
        return res

    def get_all(self) -> List[ApiItem]:
        return self._apis

    def get_by_slug(self, slug: str) -> Optional[ApiItem]:
        for api in self._apis:
            if api.slug.lower() == slug.lower() or api.id.lower() == slug.lower():
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
        sort: Optional[str] = "popular",
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[ApiItem], int]:
        results = self._apis

        # Filter by collection
        if collection:
            c = collection.lower().strip()
            if c in ("no-auth", "no_auth"):
                results = [a for a in results if a.auth_type == "none"]
            elif c in ("cors-enabled", "cors-ready", "cors"):
                results = [a for a in results if a.cors_supported]
            elif c in ("mock-data", "mock", "prototyping"):
                results = [a for a in results if "mock-data" in a.tags or a.category == "developer-tools"]
            elif c in ("high-uptime", "uptime"):
                results = [a for a in results if a.health.uptime_percent >= 99.7]
            elif c in ("fast-response", "ultra-fast", "low-latency"):
                results = [a for a in results if a.health.avg_latency_ms < 120]
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
                    # Calculate relevance score: name match = 100, tag match = 50, exact phrase = 40, desc = 10
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

            if sort == "popular":
                # For default sort with query, sort primarily by relevance score, then health
                scored_results.sort(key=lambda item: (item[0], item[1].health.uptime_percent, -item[1].health.avg_latency_ms), reverse=True)
                results = [item[1] for item in scored_results]
            else:
                results = [item[1] for item in scored_results]

        # Filter by category
        if category and category.lower() != "all":
            cat_norm = category.lower().strip()
            results = [a for a in results if a.category.lower() == cat_norm]

        # Filter by auth type
        if auth_type and auth_type.lower() != "all":
            results = [a for a in results if getattr(a.auth_type, "value", str(a.auth_type)) == auth_type]

        # Filter by pricing tier
        if pricing_tier and pricing_tier.lower() != "all":
            results = [a for a in results if getattr(a.pricing_tier, "value", str(a.pricing_tier)) == pricing_tier]

        # Filter by health status
        if status and status.lower() != "all":
            st_norm = status.lower().strip()
            results = [a for a in results if getattr(a.health.status, "value", str(a.health.status)).lower() == st_norm]

        # Sort results (if not already sorted by relevance for popular)
        if not (q and sort == "popular"):
            if sort == "latency":
                results = sorted(results, key=lambda a: a.health.avg_latency_ms)
            elif sort == "uptime":
                results = sorted(results, key=lambda a: a.health.uptime_percent, reverse=True)
            elif sort == "alphabetical":
                results = sorted(results, key=lambda a: a.name.lower())
            else: # "popular" default
                results = sorted(results, key=lambda a: (a.health.uptime_percent, -a.health.avg_latency_ms), reverse=True)

        total = len(results)
        paginated = results[offset : offset + limit]
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
        avg_latency = int(sum(a.health.avg_latency_ms for a in self._apis) / total)
        avg_uptime = round(sum(a.health.uptime_percent for a in self._apis) / total, 2)
        total_checks = (total * 24) + self._probe_count

        return CatalogStats(
            total_apis=total,
            healthy_count=healthy_count,
            degraded_count=degraded_count,
            offline_count=offline_count,
            avg_latency_ms=avg_latency,
            global_uptime_percent=avg_uptime,
            total_checks_today=total_checks
        )

    async def check_api_health(self, slug: str, timeout: float = 8.0) -> HealthCheckResult:
        """
        Sends an authentic live HTTP request directly to the API's target endpoint.
        Measures real network latency, inspects the response status code,
        determines live operational health, and updates the catalog item in real time.
        """
        api = self.get_by_slug(slug)
        if not api:
            raise ValueError(f"API with slug or ID '{slug}' was not found in the catalog")

        full_url = api.base_url.rstrip("/") + "/" + api.sample_endpoint.lstrip("/")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FreeAPIHub-HealthChecker/1.0",
            "Accept": "application/json, text/plain, */*"
        }
        if api.default_headers and isinstance(api.default_headers, dict):
            headers.update(api.default_headers)

        start_time = time.perf_counter()
        status_code = 0
        error_msg = None

        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                response = await client.request(
                    method=api.method.upper() if api.method else "GET",
                    url=full_url,
                    headers=headers,
                    params=api.default_params or {}
                )
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                status_code = response.status_code
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
    ) -> Dict[str, Any]:
        """
        Executes real concurrent HTTP health probes across a list or slice of APIs.
        """
        if slugs and len(slugs) > 0:
            target_apis = [self.get_by_slug(s) for s in slugs if self.get_by_slug(s)]
        else:
            target_apis = self._apis[:limit]

        sem = asyncio.Semaphore(max_concurrency)

        async def probe_with_semaphore(item: ApiItem) -> HealthCheckResult:
            async with sem:
                try:
                    return await self.check_api_health(item.slug)
                except Exception as ex:
                    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    return HealthCheckResult(
                        slug=item.slug,
                        name=item.name,
                        target_url=f"{item.base_url}/{item.sample_endpoint}",
                        status=HealthStatus.OFFLINE,
                        status_code=0,
                        latency_ms=9999,
                        uptime_percent=item.health.uptime_percent,
                        last_checked=now_iso,
                        message=f"Probe failed: {str(ex)}",
                        is_live_tested=True
                    )

        tasks = [probe_with_semaphore(api) for api in target_apis if api]
        results: List[HealthCheckResult] = await asyncio.gather(*tasks)

        stats = self.get_stats()
        return {
            "total_probed": len(results),
            "healthy_count": sum(1 for r in results if r.status == HealthStatus.HEALTHY),
            "degraded_count": sum(1 for r in results if r.status == HealthStatus.DEGRADED),
            "offline_count": sum(1 for r in results if r.status == HealthStatus.OFFLINE),
            "stats": stats.model_dump(),
            "results": [r.model_dump() for r in results]
        }

    async def execute_proxy(self, req: ProxyRequest) -> ProxyResponse:
        start_time = time.perf_counter()
        headers = dict(req.headers or {})
        headers.setdefault("User-Agent", "Free-API-Hub-Playground/1.0")

        # Basic URL validation
        if not req.url or not (req.url.startswith("http://") or req.url.startswith("https://")):
            return ProxyResponse(
                status_code=400,
                latency_ms=0,
                headers={},
                data=None,
                error="Invalid Target URL: The URL must start with 'http://' or 'https://'."
            )

        # Basic SSRF prevention: forbid localhost/private IPs if requested
        lowered_url = req.url.lower()
        if "127.0.0.1" in lowered_url or "localhost" in lowered_url or "192.168." in lowered_url or "10." in lowered_url:
            return ProxyResponse(
                status_code=403,
                latency_ms=0,
                headers={},
                data=None,
                error="Security Exception: Requests to localhost, private IP ranges (127.0.0.1, 10.x, 192.168.x), or internal networks are blocked."
            )

        try:
            async with httpx.AsyncClient(timeout=settings.PROXY_TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = await client.request(
                    method=req.method.upper(),
                    url=req.url,
                    headers=headers,
                    params=req.params or {},
                    content=req.body if req.body else None
                )
                latency = int((time.perf_counter() - start_time) * 1000)

                # Attempt to parse json
                try:
                    data = response.json()
                except Exception:
                    data = response.text

                # Sanitize response headers
                clean_headers = {
                    k: v for k, v in response.headers.items()
                    if k.lower() in ("content-type", "server", "date", "content-length", "x-rate-limit-remaining")
                }

                error_msg = None
                if response.status_code == 401:
                    error_msg = "HTTP 401 Unauthorized: Target endpoint requires authentication credentials or an API Key. Please provide the required key in query params or headers."
                elif response.status_code == 403:
                    error_msg = "HTTP 403 Forbidden: Access denied by target API server. This endpoint may require higher permissions, an authorized key, or blocked automated proxy access."
                elif response.status_code == 404:
                    error_msg = f"HTTP 404 Not Found: The endpoint path '{req.url}' does not exist on this server. Check path spelling and parameters."
                elif response.status_code == 429:
                    error_msg = "HTTP 429 Too Many Requests: Rate limit quota exceeded on target API. Please wait a moment before sending more requests."
                elif response.status_code >= 500:
                    error_msg = f"HTTP {response.status_code} Server Error: Upstream server encountered an internal failure processing the request."

                logger.proxy(target_url=req.url, method=req.method.upper(), status_code=response.status_code, latency_ms=latency)
                return ProxyResponse(
                    status_code=response.status_code,
                    latency_ms=latency,
                    headers=clean_headers,
                    data=data,
                    error=error_msg
                )
        except httpx.TimeoutException:
            latency = int((time.perf_counter() - start_time) * 1000)
            logger.error(f"Proxy timeout ({latency}ms) on {req.method.upper()} {req.url}")
            return ProxyResponse(
                status_code=504,
                latency_ms=latency,
                headers={},
                data=None,
                error=f"Gateway Timeout (504): Target endpoint '{req.url}' timed out after {settings.PROXY_TIMEOUT_SECONDS}s. The upstream server is taking too long to respond or is unreachable."
            )
        except httpx.ConnectError:
            latency = int((time.perf_counter() - start_time) * 1000)
            logger.error(f"Proxy connection error ({latency}ms) on {req.method.upper()} {req.url}")
            return ProxyResponse(
                status_code=502,
                latency_ms=latency,
                headers={},
                data=None,
                error=f"Connection Error (502): Unable to connect to '{req.url}'. The domain might be invalid, DNS resolution failed, or the host is offline."
            )
        except Exception as ex:
            latency = int((time.perf_counter() - start_time) * 1000)
            logger.error(f"Proxy relay error on {req.method.upper()} {req.url}: {ex}")
            return ProxyResponse(
                status_code=502,
                latency_ms=latency,
                headers={},
                data=None,
                error=f"Proxy Relay Error: {str(ex)}"
            )

    async def validate_endpoint(self, req: ValidationRequest) -> ValidationResult:
        full_url = req.base_url.rstrip("/") + "/" + req.sample_endpoint.lstrip("/")
        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                res = await client.request(req.method.upper(), full_url, headers={"User-Agent": "Free-API-Hub-Validator/1.0"})
                latency = int((time.perf_counter() - start_time) * 1000)
                is_valid = res.status_code < 400

                try:
                    data = res.json()
                except Exception:
                    data = res.text[:200]

                if is_valid:
                    msg = "Endpoint verified successfully! HTTP 200 OK."
                elif res.status_code == 401:
                    msg = "Validation failed: HTTP 401 Unauthorized. Target endpoint requires authentication or an API Key. For free directory listing, please provide an open public sample endpoint."
                elif res.status_code == 403:
                    msg = "Validation failed: HTTP 403 Forbidden. Access was denied by upstream server (bot protection, Cloudflare challenge, or auth required)."
                elif res.status_code == 404:
                    msg = f"Validation failed: HTTP 404 Not Found. Path '{req.sample_endpoint}' does not exist on base URL '{req.base_url}'."
                elif res.status_code == 429:
                    msg = "Validation failed: HTTP 429 Too Many Requests. Target API rate limit reached."
                else:
                    msg = f"Validation failed: Endpoint returned HTTP {res.status_code} error."

                return ValidationResult(
                    is_valid=is_valid,
                    status_code=res.status_code,
                    latency_ms=latency,
                    message=msg,
                    sample_data=data
                )
        except httpx.TimeoutException:
            latency = int((time.perf_counter() - start_time) * 1000)
            return ValidationResult(
                is_valid=False,
                status_code=0,
                latency_ms=latency,
                message=f"Validation failed: Connection timed out after 8.0s. Host '{req.base_url}' did not respond in time.",
                sample_data=None
            )
        except httpx.ConnectError:
            latency = int((time.perf_counter() - start_time) * 1000)
            return ValidationResult(
                is_valid=False,
                status_code=0,
                latency_ms=latency,
                message=f"Validation failed: Host unreachable or DNS resolution failed for '{req.base_url}'. Verify the domain name.",
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
        submission_record = {
            "name": payload.name,
            "category": payload.category,
            "base_url": payload.base_url,
            "sample_endpoint": payload.sample_endpoint,
            "documentation_url": payload.documentation_url,
            "auth_type": payload.auth_type.value,
            "pricing_tier": payload.pricing_tier.value,
            "description": payload.description,
            "status": "pending_verification",
            "submitted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        self._submissions.append(submission_record)
        return submission_record

catalog_service = CatalogService()
