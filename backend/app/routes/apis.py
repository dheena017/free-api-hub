from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.models import ApiListResponse, ApiItem, CategorySummary, CatalogStats, HealthCheckResult
from app.services import catalog_service

router = APIRouter(prefix="/apis", tags=["apis"])

@router.get("", response_model=ApiListResponse)
async def list_apis(
    q: Optional[str] = Query(None, description="Search term across name, description, tags"),
    category: Optional[str] = Query(None, description="Filter by category slug"),
    auth_type: Optional[str] = Query(None, description="Filter by auth requirement (none, api_key, oauth)"),
    pricing_tier: Optional[str] = Query(None, description="Filter by pricing tier (open, free_forever, freemium_no_cc)"),
    collection: Optional[str] = Query(None, description="Filter by curated collection (no-auth, cors-enabled, mock-data)"),
    sort: Optional[str] = Query("popular", description="Sort order: popular, latency, uptime, alphabetical"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    items, total = catalog_service.search_apis(
        q=q,
        category=category,
        auth_type=auth_type,
        pricing_tier=pricing_tier,
        collection=collection,
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
    limit: int = Query(0, description="Max new APIs to add (0 for unlimited)"),
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
async def check_api_health_endpoint(slug: str):
    """
    On-demand real-time health verification for this specific API.
    Sends a real HTTP probe, calculates latency and status, and updates catalog.
    """
    try:
        return await catalog_service.check_api_health(slug)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

