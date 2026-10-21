from fastapi import APIRouter, HTTPException, Query, Body, Request
from typing import Dict, Any, List, Optional
import time
from app.services import catalog_service
from app.models import (
    HealthCheckResult,
    StatusDashboardResponse,
    BatchHealthCheckResponse,
    HealthHistoryResponse
)
from app.logger import logger
from app.security import health_rate_limiter
import asyncio

router = APIRouter(tags=["health"])
batch_semaphore = asyncio.Semaphore(5)

@router.get("/logs")
@router.get("/health/logs")
async def get_system_logs(
    limit: int = Query(50, ge=1, le=250),
    level: Optional[str] = Query(None),
    category: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Returns recent structured server logs for real-time in-browser dev inspection.
    """
    entries = logger.get_logs(limit=limit, level=level, category=category)
    return {
        "total": len(entries),
        "limit": limit,
        "logs": entries
    }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    stats = catalog_service.get_stats()
    return {
        "status": "ok",
        "service": "Free API Hub Backend",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_apis": stats.total_apis,
        "healthy_apis": stats.healthy_count,
        "global_uptime_percent": stats.global_uptime_percent,
        "live_probes_performed": catalog_service.get_probe_count()
    }

@router.get("/health/check/{slug}", response_model=HealthCheckResult)
@router.post("/health/check/{slug}", response_model=HealthCheckResult)
async def check_single_endpoint(slug: str, req: Request):
    """
    Real-time live probe to the specified API target endpoint.
    Sends an actual HTTP request, measures exact round-trip latency,
    records true HTTP status code, and dynamically updates catalog health.
    """
    client_ip = req.client.host if req.client else "unknown"
    allowed, _, retry_after = health_rate_limiter.is_allowed(client_ip, max_requests=40, window_seconds=60.0)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for health checks. Please retry after {retry_after}s.",
            headers={"Retry-After": str(int(retry_after))}
        )

    try:
        return await catalog_service.check_api_health(slug)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/health/history/{slug}", response_model=HealthHistoryResponse)
async def get_endpoint_health_history(
    slug: str,
    limit: int = Query(40, ge=5, le=100)
):
    """
    Returns authentic detailed telemetry history, latency distributions (min, avg, p95, max),
    30-day uptime timeline, and network waterfall breakdown for an endpoint.
    """
    try:
        return catalog_service.get_health_history(slug, limit=limit)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/health/check-batch", response_model=BatchHealthCheckResponse)
async def check_batch_endpoints(
    req: Request,
    payload: Optional[Dict[str, Any]] = Body(None),
    limit: int = Query(25, ge=1, le=50)
):
    """
    Executes real live concurrent health checks across multiple deduplicated catalog endpoints.
    Enforces bounded concurrency and rate limiting.
    """
    client_ip = req.client.host if req.client else "unknown"
    allowed, _, retry_after = health_rate_limiter.is_allowed(client_ip, max_requests=10, window_seconds=60.0)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for batch health checks. Please retry after {retry_after}s.",
            headers={"Retry-After": str(int(retry_after))}
        )

    slugs = payload.get("slugs") if payload else None
    async with batch_semaphore:
        return await catalog_service.check_batch_health(slugs=slugs, limit=limit)

@router.get("/status-dashboard", response_model=StatusDashboardResponse)
async def status_dashboard(
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0)
) -> StatusDashboardResponse:
    """
    Dedicated typed endpoint returning real-time status dashboard statistics and endpoint states.
    """
    return catalog_service.get_status_dashboard(limit=limit, offset=offset)


@router.post("/health/run-daily-check")
async def trigger_daily_health_check(
    batch_size: int = Query(50, ge=1, le=200)
) -> Dict[str, Any]:
    """
    Trigger daily existence and health verification run across catalog APIs.
    Authentically probes endpoints and records results to persistent history.
    """
    from app.workers.health_checker import run_daily_health_check
    result = await run_daily_health_check(batch_size=batch_size)
    catalog_service._load_health_history()
    catalog_service._apply_health_from_history()
    return result

