from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional, List
from app.models import ApiListResponse, ApiItem, CategorySummary, CatalogStats, HealthCheckResult
from app.services import catalog_service
from app.security import health_rate_limiter

router = APIRouter(prefix="/apis", tags=["apis"])

VALID_SORT_OPTIONS = {"popular", "latency", "uptime", "alphabetical"}

@router.get("", response_model=ApiListResponse)
async def list_apis(
    q: Optional[str] = Query(None, max_length=200, description="Search term across name, description, tags"),
    category: Optional[str] = Query(None, max_length=50, description="Filter by category slug"),
    auth_type: Optional[str] = Query(None, max_length=20, description="Filter by auth requirement (none, api_key, oauth)"),
    pricing_tier: Optional[str] = Query(None, max_length=30, description="Filter by pricing tier (open, free_forever, freemium_no_cc)"),
    collection: Optional[str] = Query(None, max_length=30, description="Filter by curated collection (no-auth, cors-enabled, mock-data)"),
    status: Optional[str] = Query(None, max_length=20, description="Filter by health status (healthy, degraded, offline)"),
    slugs: Optional[str] = Query(None, max_length=2000, description="Comma-separated list of API slugs to filter by"),
    sort: Optional[str] = Query("popular", description="Sort order: popular, latency, uptime, alphabetical"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    if sort and sort.lower().strip() not in VALID_SORT_OPTIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid sort option '{sort}'. Must be one of: {', '.join(sorted(VALID_SORT_OPTIONS))}"
        )

    slug_list = [s.strip() for s in slugs.split(",") if s.strip()] if slugs else None
    items, total = catalog_service.search_apis(
        q=q,
        category=category,
        auth_type=auth_type,
        pricing_tier=pricing_tier,
        collection=collection,
        status=status,
        slugs=slug_list,
        sort=sort,
        limit=limit,
        offset=offset
    )
    return ApiListResponse(total=total, items=items, limit=limit, offset=offset)

@router.get("/categories", response_model=List[CategorySummary])
async def list_categories():
    return catalog_service.get_categories()

@router.get("/stats", response_model=CatalogStats)
async def get_stats():
    return catalog_service.get_stats()

@router.post("/sync")
async def sync_catalog_endpoint(
    limit: int = Query(0, ge=0, le=1000, description="Max new APIs to add (0 for unlimited)"),
    dry_run: bool = Query(False, description="Simulate sync without saving")
):
    """
    Dynamically trigger live API synchronization across multiple public registries
    without hardcoding APIs. Immediately reloads catalog in memory.
    """
    return catalog_service.sync_from_remote(limit=limit, dry_run=dry_run)

@router.post("/refresh")
async def refresh_catalog_endpoint():
    """Reload apis.json from disk into memory."""
    catalog_service.load_data()
    return {"status": "reloaded", "total": len(catalog_service.get_all())}

@router.get("/{slug}", response_model=ApiItem)
async def get_api_by_slug(slug: str):
    api = catalog_service.get_by_slug(slug)
    if not api:
        raise HTTPException(status_code=404, detail=f"API with slug '{slug}' not found")
    return api

@router.get("/{slug}/check", response_model=HealthCheckResult)
@router.post("/{slug}/check", response_model=HealthCheckResult)
async def check_api_health_endpoint(slug: str, req: Request):
    """
    On-demand real-time health verification for this specific API.
    Sends a real HTTP probe, calculates latency and status, and updates catalog.
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

@router.post("/{slug}/report")
async def report_api_issue_endpoint(slug: str, payload: dict, req: Request):
    """
    Submits a broken API report specifically for this catalog entry.
    """
    from app.security import report_rate_limiter
    from app.models import ReportPayload

    client_ip = req.client.host if req.client else "unknown"
    allowed, _, retry_after = report_rate_limiter.is_allowed(client_ip, max_requests=10, window_seconds=60.0)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for reports. Please wait {retry_after}s.",
            headers={"Retry-After": str(int(retry_after))}
        )

    payload["api_slug"] = slug
    try:
        report_data = ReportPayload(**payload)
        record = catalog_service.record_report(report_data, client_ip=client_ip)
        return {
            "success": True,
            "message": f"Report submitted for '{slug}'. Thank you for helping keep the directory verified!",
            "report": record
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record report: {str(e)}")
