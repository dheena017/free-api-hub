import sys
import os
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
import httpx
from app.main import app
from app.services import catalog_service


@pytest.fixture
async def async_client():
    """Async HTTP test client bound to the FastAPI application."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
@pytest.mark.offline
class TestApiEndpoints:
    """
    PURPOSE 3: Backend REST API Integration Tests
    Validates all catalog queries, filters, slugs matching, statistics, and error handling.
    """

    async def test_root_endpoint(self, async_client):
        """GET / returns status online and API metadata."""
        res = await async_client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "online"
        assert "apis_endpoint" in data

    async def test_list_apis_default(self, async_client):
        """GET /api/v1/apis returns paginated list of catalog entries."""
        res = await async_client.get("/api/v1/apis?limit=24")
        assert res.status_code == 200
        data = res.json()
        assert "total" in data
        assert "items" in data
        assert data["total"] > 0
        assert len(data["items"]) <= 24

    async def test_list_apis_pagination(self, async_client):
        """Paging with limit and offset yields disjoint subsets."""
        res1 = await async_client.get("/api/v1/apis?limit=5&offset=0")
        res2 = await async_client.get("/api/v1/apis?limit=5&offset=5")
        assert res1.status_code == 200
        assert res2.status_code == 200
        items1 = res1.json()["items"]
        items2 = res2.json()["items"]
        ids1 = {item["slug"] for item in items1}
        ids2 = {item["slug"] for item in items2}
        assert len(ids1.intersection(ids2)) == 0, "Offsets should return non-overlapping pages"

    async def test_filter_by_slugs_single(self, async_client, apis_raw):
        """Filter by a single slug returns precisely that API (used for bookmarks / saved APIs)."""
        sample_slug = apis_raw[0]["slug"]
        res = await async_client.get(f"/api/v1/apis?slugs={sample_slug}")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["slug"] == sample_slug

    async def test_filter_by_slugs_multiple(self, async_client, apis_raw):
        """Filter by multiple comma-separated slugs returns only the requested APIs."""
        if len(apis_raw) >= 3:
            slugs = [
                apis_raw[0]["slug"],
                apis_raw[1]["slug"],
                apis_raw[2]["slug"]
            ]
            slugs_param = ",".join(slugs)
            res = await async_client.get(f"/api/v1/apis?slugs={slugs_param}")
            assert res.status_code == 200
            data = res.json()
            assert data["total"] == 3
            returned_slugs = {item["slug"] for item in data["items"]}
            assert returned_slugs == set(slugs)

    async def test_filter_by_category(self, async_client):
        """Filtering by category returns only items belonging to that category."""
        target_category = "developer-tools"
        res = await async_client.get(f"/api/v1/apis?category={target_category}&limit=20")
        assert res.status_code == 200
        data = res.json()
        for item in data["items"]:
            assert item["category"] == target_category

    async def test_filter_by_auth_type(self, async_client):
        """Filtering by auth_type none returns only open APIs requiring no key."""
        res = await async_client.get("/api/v1/apis?auth_type=none&limit=20")
        assert res.status_code == 200
        data = res.json()
        for item in data["items"]:
            assert item["auth_type"] == "none"

    async def test_filter_by_status(self, async_client):
        """Filtering by status healthy returns only operational endpoints."""
        res = await async_client.get("/api/v1/apis?status=healthy&limit=20")
        assert res.status_code == 200
        data = res.json()
        for item in data["items"]:
            assert item["health"]["status"] == "healthy"

    async def test_search_query(self, async_client):
        """Keyword search matches relevant APIs and ranks them."""
        res = await async_client.get("/api/v1/apis?q=weather&limit=10")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] > 0
        # First item should match weather in name, description, tags, or category
        first_item = data["items"][0]
        combined = f"{first_item['name']} {first_item['description']} {' '.join(first_item['tags'])} {first_item['category']}".lower()
        assert "weather" in combined

    async def test_get_api_by_slug_found(self, async_client, apis_raw):
        """GET /api/v1/apis/{slug} returns the full API spec for an existing slug."""
        sample_slug = apis_raw[0]["slug"]
        res = await async_client.get(f"/api/v1/apis/{sample_slug}")
        assert res.status_code == 200
        data = res.json()
        assert data["slug"] == sample_slug
        assert "base_url" in data
        assert "endpoint" in data

    async def test_get_api_by_slug_not_found(self, async_client):
        """GET /api/v1/apis/{slug} returns 404 for a non-existent slug."""
        res = await async_client.get("/api/v1/apis/this-slug-does-not-exist-xyz-999")
        assert res.status_code == 404
        data = res.json()
        assert "detail" in data

    async def test_get_categories(self, async_client):
        """GET /api/v1/apis/categories returns taxonomy summaries with counts."""
        res = await async_client.get("/api/v1/apis/categories")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0
        for cat in data:
            assert "slug" in cat
            assert "name" in cat
            assert "count" in cat
            assert cat["count"] > 0

    async def test_get_stats(self, async_client):
        """GET /api/v1/apis/stats returns dynamic telemetry counters."""
        res = await async_client.get("/api/v1/apis/stats")
        assert res.status_code == 200
        data = res.json()
        assert data["total_apis"] > 0
        assert data["healthy_count"] > 0
        assert "degraded_count" in data
        assert "offline_count" in data
        assert data["global_uptime_percent"] >= 0.0
        assert data["avg_latency_ms"] >= 0

    async def test_health_check_endpoint(self, async_client):
        """GET /health returns 200 OK and system status."""
        res = await async_client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("healthy", "operational", "ok")

    async def test_submission_validation_valid(self, async_client):
        """POST /api/v1/submit/validate verifies a working public URL."""
        payload = {
            "base_url": "https://api.coindesk.com",
            "endpoint": "/v1/bpi/currentprice.json",
            "method": "GET"
        }
        res = await async_client.post("/api/v1/submit/validate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "is_valid" in data
        assert "latency_ms" in data

    async def test_sync_endpoint_dry_run(self, async_client):
        """POST /api/v1/apis/sync?dry_run=true simulates catalog synchronization."""
        res = await async_client.post("/api/v1/apis/sync?dry_run=true&limit=5")
        assert res.status_code == 200
        data = res.json()
        assert data.get("status") == "dry_run"
        assert "existing" in data
        assert "total_projected" in data

    async def test_batch_health_check_endpoint(self, async_client, apis_raw):
        """POST /api/v1/health/check-batch tests probing multiple slugs in one roundtrip."""
        test_slugs = [apis_raw[0]["slug"]]
        if len(apis_raw) > 1:
            test_slugs.append(apis_raw[1]["slug"])
        res = await async_client.post("/api/v1/health/check-batch", json={"slugs": test_slugs})
        assert res.status_code == 200
        data = res.json()
        assert "results" in data
        assert len(data["results"]) == len(test_slugs)
        assert "healthy_count" in data or "degraded_count" in data or "offline_count" in data
