import asyncio
import json
import os
import sys
import time
import httpx
from typing import List, Dict, Any

# Ensure project root is in path when executed directly
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings

async def ping_endpoint(client: httpx.AsyncClient, api: Dict[str, Any]) -> Dict[str, Any]:
    full_url = api["base_url"].rstrip("/") + "/" + api["sample_endpoint"].lstrip("/")
    start_time = time.perf_counter()
    headers = {"User-Agent": "Free-API-Hub-HealthChecker/1.0"}
    
    # Include default headers if present
    if "default_headers" in api and isinstance(api["default_headers"], dict):
        headers.update(api["default_headers"])

    try:
        response = await client.get(full_url, headers=headers, timeout=10.0, follow_redirects=True)
        latency = int((time.perf_counter() - start_time) * 1000)
        status_code = response.status_code
        is_healthy = status_code < 400
    except Exception as ex:
        latency = 9999
        status_code = 0
        is_healthy = False

    # Status classification
    if is_healthy and latency < 2000:
        health_status = "healthy"
    elif is_healthy and latency >= 2000:
        health_status = "degraded"
    elif status_code in (429, 403):
        health_status = "degraded"
    else:
        health_status = "offline"

    # Rolling uptime calculation
    current_health = api.get("health", {})
    prev_uptime = current_health.get("uptime_percent", 99.9)
    # Smooth update: 95% weight on history, 5% on current probe
    probe_score = 100.0 if is_healthy else 0.0
    new_uptime = round(prev_uptime * 0.95 + probe_score * 0.05, 1)

    prev_latency = current_health.get("avg_latency_ms", latency)
    new_latency = int(prev_latency * 0.8 + (latency if latency < 9999 else prev_latency) * 0.2)

    return {
        "status": health_status,
        "uptime_percent": max(0.0, min(100.0, new_uptime)),
        "avg_latency_ms": new_latency,
        "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "last_status_code": status_code,
        "message": f"Operational (HTTP {status_code})" if is_healthy else f"Degraded/Offline (HTTP {status_code})"
    }

async def run_health_checks(data_path: str = settings.DATA_FILE_PATH):
    print(f"[{time.strftime('%X')}] Starting automated health check across catalog: {data_path}")
    if not os.path.exists(data_path):
        print(f"Data file {data_path} not found.")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        apis = json.load(f)

    async with httpx.AsyncClient(limits=httpx.Limits(max_connections=10)) as client:
        tasks = [ping_endpoint(client, api) for api in apis]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    healthy_count = 0
    degraded_count = 0
    offline_count = 0

    for i, res in enumerate(results):
        if isinstance(res, dict):
            apis[i]["health"] = res
            status = res["status"]
            if status == "healthy":
                healthy_count += 1
            elif status == "degraded":
                degraded_count += 1
            else:
                offline_count += 1

    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(apis, f, indent=2)

    print(
        f"[{time.strftime('%X')}] Health check complete! "
        f"🟢 Healthy: {healthy_count} | 🟡 Degraded: {degraded_count} | 🔴 Offline: {offline_count}"
    )

async def main_loop(interval_seconds: int = 86400):
    while True:
        try:
            await run_health_checks()
        except Exception as e:
            print(f"Error during health check loop: {e}")
        await asyncio.sleep(interval_seconds)

if __name__ == "__main__":
    if "--loop" in sys.argv:
        asyncio.run(main_loop())
    else:
        asyncio.run(run_health_checks())
