import pytest
import time
import httpx
from typing import Dict, Any, List

# Cloudflare and anti-bot challenge signatures
CLOUDFLARE_HEADERS = {"cf-ray", "cf-cache-status"}
CHALLENGE_TITLE_SNIPPETS = ["just a moment...", "attention required! | cloudflare", "ddos-guard"]

async def probe_endpoint(client: httpx.AsyncClient, api: Dict[str, Any], timeout: float = 8.0):
    """Helper sending a real HTTP GET probe to an endpoint."""
    full_url = api["base_url"].rstrip("/") + "/" + api["sample_endpoint"].lstrip("/")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FreeAPIHub-HealthChecker/1.0",
        "Accept": "application/json, text/plain, */*"
    }
    if "default_headers" in api and isinstance(api["default_headers"], dict):
        headers.update(api["default_headers"])

    start_time = time.perf_counter()
    try:
        response = await client.get(full_url, headers=headers, timeout=timeout, follow_redirects=True)
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "api_name": api["name"],
            "url": full_url,
            "status_code": response.status_code,
            "latency_ms": latency_ms,
            "headers": response.headers,
            "text": response.text[:500],
            "error": None
        }
    except Exception as ex:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "api_name": api["name"],
            "url": full_url,
            "status_code": 0,
            "latency_ms": latency_ms,
            "headers": {},
            "text": "",
            "error": str(ex)
        }

@pytest.mark.live
class TestLiveUptimeAndHealth:
    """
    PURPOSE 2: Live Uptime & Health Tests
    Runs daily on schedule (via GitHub Actions, cron, or pytest -m live).
    Calls external APIs to answer: "Is this API actually working right now?"
    """

    @pytest.mark.asyncio
    async def test_live_sample_endpoints_batch(self, apis_raw):
        """
        Sends real HTTP requests to a representative sample of catalog APIs.
        Asserts 200 OK status codes, acceptable latency, and no bot blocking.
        """
        # Test sample of high-traffic endpoints
        sample_slugs = ["pokeapi", "open-meteo", "rest-countries", "frankfurter-rates", "dummyjson"]
        targets = [api for api in apis_raw if api["slug"] in sample_slugs]

        async with httpx.AsyncClient(limits=httpx.Limits(max_connections=5)) as client:
            results = []
            for target in targets:
                res = await probe_endpoint(client, target)
                results.append(res)

        failures = []
        for res in results:
            # 1. Assert Real HTTP Status Code is 200 OK
            if res["status_code"] != 200:
                failures.append(
                    f"{res['api_name']} failed with status {res['status_code']} (Error: {res['error']})"
                )

            # 2. Measure Latency (must respond under 3500ms)
            assert res["latency_ms"] < 3500, (
                f"{res['api_name']} was degraded: took {res['latency_ms']}ms (> 3500ms)"
            )

            # 3. Detect Cloudflare / Anti-Bot Walls
            assert res["status_code"] != 403, (
                f"{res['api_name']} hit an anti-bot 403 Forbidden wall."
            )
            lower_text = res["text"].lower()
            for challenge in CHALLENGE_TITLE_SNIPPETS:
                assert challenge not in lower_text, (
                    f"{res['api_name']} returned a Cloudflare captcha challenge: '{challenge}'"
                )

        assert len(failures) == 0, f"Live uptime failures detected:\n" + "\n".join(failures)

    @pytest.mark.asyncio
    async def test_anti_bot_and_cloudflare_detection(self, apis_raw):
        """
        Verifies that automated requests receive legitimate JSON/REST responses
        instead of Cloudflare Captcha or 403 Forbidden anti-bot walls.
        """
        # Test Open-Meteo as a gold standard open API
        open_meteo = next(a for a in apis_raw if a["slug"] == "open-meteo")
        async with httpx.AsyncClient() as client:
            res = await probe_endpoint(client, open_meteo)

        assert res["status_code"] == 200, f"Expected 200 OK, got {res['status_code']}"
        assert res["latency_ms"] < 2500, f"Latency too high: {res['latency_ms']}ms"

        # Check content is JSON, not HTML captcha
        content_type = res["headers"].get("content-type", "")
        assert "application/json" in content_type.lower(), (
            f"Expected JSON content-type, but got '{content_type}' (possible bot challenge)"
        )

    @pytest.mark.asyncio
    async def test_real_live_health_check_service(self):
        """
        Tests the actual CatalogService.check_api_health method against a real API.
        Asserts that the probe completes, records live status code, and updates health metrics.
        """
        from app.services import catalog_service
        from app.models import HealthStatus

        result = await catalog_service.check_api_health("open-meteo")
        assert result.slug == "open-meteo"
        assert result.status_code == 200
        assert result.status in (HealthStatus.HEALTHY, HealthStatus.DEGRADED)
        assert result.latency_ms > 0
        assert result.is_live_tested is True
        assert "Operational" in result.message or "HTTP 200" in result.message or "Degraded" in result.message

        # Verify catalog in-memory state was updated
        item = catalog_service.get_by_slug("open-meteo")
        assert item is not None
        assert item.health.last_status_code == 200
        assert item.health.avg_latency_ms == result.latency_ms

    @pytest.mark.asyncio
    async def test_real_batch_health_check_service(self):
        """
        Tests the batch live probe capability across multiple real endpoints.
        """
        from app.services import catalog_service

        batch_res = await catalog_service.check_batch_health(
            slugs=["open-meteo", "pokeapi"],
            max_concurrency=2
        )
        assert batch_res["total_probed"] == 2
        assert len(batch_res["results"]) == 2
        assert (batch_res["healthy_count"] + batch_res["degraded_count"]) >= 1
        for res in batch_res["results"]:
            assert res["status_code"] == 200
            assert res["latency_ms"] > 0

