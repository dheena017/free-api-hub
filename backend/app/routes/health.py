from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
import time
from app.services import catalog_service
from app.models import HealthCheckResult
from app.logger import logger

router = APIRouter(tags=["health"])

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
async def check_single_endpoint(slug: str):
    """
    Real-time live probe to the specified API target endpoint.
    Sends an actual HTTP request, measures exact round-trip latency,
    records true HTTP status code, and dynamically updates catalog health.
    """
    try:
        return await catalog_service.check_api_health(slug)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/health/check-batch")
async def check_batch_endpoints(
    payload: Optional[Dict[str, Any]] = Body(None),
    limit: int = Query(25, ge=1, le=100)
):
    """
    Executes real live concurrent health checks across multiple catalog endpoints.
    """
    slugs = payload.get("slugs") if payload else None
    return await catalog_service.check_batch_health(slugs=slugs, limit=limit)

@router.get("/status-dashboard")
async def status_dashboard(
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    apis = catalog_service.get_all()
    stats = catalog_service.get_stats()
    paginated_apis = apis[offset:offset + limit]
    
    endpoint_status_list: List[Dict[str, Any]] = [
        {
            "id": a.id,
            "name": a.name,
            "slug": a.slug,
            "category": a.category,
            "base_url": a.base_url,
            "sample_endpoint": a.sample_endpoint,
            "status": a.health.status.value,
            "uptime_percent": a.health.uptime_percent,
            "avg_latency_ms": a.health.avg_latency_ms,
            "last_checked": a.health.last_checked,
            "last_status_code": a.health.last_status_code,
            "message": a.health.message
        }
        for a in paginated_apis
    ]

    return {
        "stats": stats.model_dump(),
        "total": len(apis),
        "endpoints": endpoint_status_list
    }
