import asyncio
import json
import os
import sys
import time
import httpx
from typing import List, Dict, Any, Optional

# Ensure project root is in path when executed directly
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
from app.logger import logger

async def ping_endpoint(client: httpx.AsyncClient, api: Dict[str, Any], semaphore: asyncio.Semaphore) -> Dict[str, Any]:
    async with semaphore:
        base_url = api.get("base_url", "").rstrip("/")
        sample_endpoint = api.get("sample_endpoint", "").lstrip("/")
        full_url = f"{base_url}/{sample_endpoint}" if sample_endpoint else base_url
        
        start_time = time.perf_counter()
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Free-API-Hub-DailyHealthChecker/1.0",
            "Accept": "application/json, text/plain, */*"
        }
        
        if "default_headers" in api and isinstance(api["default_headers"], dict):
            headers.update(api["default_headers"])

        try:
            response = await client.get(full_url, headers=headers, timeout=8.0, follow_redirects=True)
            latency = int((time.perf_counter() - start_time) * 1000)
            status_code = response.status_code
            is_healthy = 200 <= status_code < 400
        except httpx.TimeoutException:
            latency = 8000
            status_code = 0
            is_healthy = False
        except httpx.ConnectError:
            latency = 9999
            status_code = 0
            is_healthy = False
        except Exception:
            latency = 9999
            status_code = 0
            is_healthy = False

        # Status classification
        if is_healthy:
            if latency < 2000:
                health_status = "healthy"
                message = f"Operational (HTTP {status_code} in {latency}ms)"
            else:
                health_status = "degraded"
                message = f"Degraded - High Latency ({latency}ms)"
        elif status_code in (429, 403):
            health_status = "degraded"
            message = f"Degraded (HTTP {status_code} - Throttled or Auth Required)"
        else:
            health_status = "offline"
            message = f"Offline (HTTP {status_code} - Connection Refused / 404)"

        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return {
            "slug": api.get("slug", ""),
            "name": api.get("name", ""),
            "target_url": full_url,
            "status": health_status,
            "status_code": status_code,
            "latency_ms": latency if latency < 9999 else 0,
            "last_checked": now_iso,
            "message": message
        }

async def run_daily_health_check(
    data_path: str = settings.DATA_FILE_PATH,
    history_path: str = settings.HEALTH_HISTORY_FILE_PATH,
    batch_size: int = 100,
    max_concurrency: int = 10
) -> Dict[str, Any]:
    """
    Performs authentic network probes to verify which APIs genuinely exist and are operational.
    Records real observations with timestamps into health_history.json.
    """
    logger.info(f"Starting scheduled daily API existence and health check ({data_path})")
    if not os.path.exists(data_path):
        logger.warning(f"Data file {data_path} not found.")
        return {"error": "Catalog data file not found"}

    try:
        with open(data_path, "r", encoding="utf-8") as f:
            apis = json.load(f)
    except Exception as e:
        logger.error(f"Failed to read catalog data: {e}")
        return {"error": str(e)}

    # Load existing history
    observations = []
    if os.path.exists(history_path):
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                observations = json.load(f)
        except Exception:
            observations = []

    semaphore = asyncio.Semaphore(max_concurrency)
    healthy_count = 0
    degraded_count = 0
    offline_count = 0
    probed_results = []

    # Target up to batch_size APIs per run to respect upstream rate limits smoothly
    target_apis = apis[:batch_size] if batch_size > 0 else apis

    async with httpx.AsyncClient(limits=httpx.Limits(max_connections=max_concurrency)) as client:
        tasks = [ping_endpoint(client, api, semaphore) for api in target_apis]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    for res in results:
        if isinstance(res, dict) and res.get("slug"):
            probed_results.append(res)
            st = res.get("status")
            if st == "healthy":
                healthy_count += 1
            elif st == "degraded":
                degraded_count += 1
            else:
                offline_count += 1

            observations.append({
                "slug": res["slug"],
                "timestamp": res["last_checked"],
                "status": res["status"],
                "status_code": res["status_code"],
                "latency_ms": res["latency_ms"]
            })

    # Keep latest 10,000 observations
    if len(observations) > 10000:
        observations = observations[-10000:]

    try:
        os.makedirs(os.path.dirname(history_path), exist_ok=True)
        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(observations, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write health history: {e}")

    logger.success(
        f"Daily health verification complete! Probed: {len(probed_results)} | "
        f"Operational: {healthy_count} | Degraded: {degraded_count} | Offline: {offline_count}"
    )

    return {
        "status": "completed",
        "timestamp": now_iso,
        "probed_count": len(probed_results),
        "healthy_count": healthy_count,
        "degraded_count": degraded_count,
        "offline_count": offline_count
    }

async def daily_health_check_loop(interval_seconds: int = 86400):
    """
    Background worker loop that triggers real health checks once every 24 hours.
    """
    logger.info(f"Daily health check daemon started (Interval: {interval_seconds}s)")
    while True:
        try:
            # Run check on catalog
            await run_daily_health_check(batch_size=50)
            
            # If backend catalog service is available, reload in-memory state
            try:
                from app.services import catalog_service
                catalog_service._load_health_history()
                catalog_service._apply_health_from_history()
            except Exception:
                pass
        except asyncio.CancelledError:
            logger.info("Daily health check daemon stopping on shutdown.")
            break
        except Exception as e:
            logger.error(f"Error in daily health check loop: {e}")
            
        await asyncio.sleep(interval_seconds)

if __name__ == "__main__":
    if "--loop" in sys.argv:
        asyncio.run(daily_health_check_loop())
    else:
        asyncio.run(run_daily_health_check(batch_size=50))
