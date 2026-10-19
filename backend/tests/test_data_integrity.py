import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path regardless of execution CWD
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
from urllib.parse import urlparse
from app.models import ApiItem, AuthType, PricingTier, HealthStatus

VALID_CATEGORIES = {
    "developer-tools",
    "security",
    "cloud-storage",
    "database",
    "devops-ci",
    "communication",
    "ai-ml",
    "productivity",
    "finance",
    "crypto-web3",
    "ecommerce",
    "weather",
    "geography",
    "transportation",
    "entertainment",
    "gaming",
    "music",
    "video-movies",
    "art-design",
    "science",
    "health-medical",
    "food-drink",
    "education-books",
    "social-news",
    "open-data",
    "reference",
    "news",
    "animals",
    "sports"
}

REQUIRED_ROOT_FIELDS = [
    "slug",
    "name",
    "description",
    "category",
    "base_url",
    "pricing_tier",
    "cors_supported",
    "https",
    "documentation_url",
    "tags"
]

REQUIRED_HEALTH_FIELDS = [
    "status",
    "uptime_percent",
    "avg_latency_ms",
    "last_checked",
    "last_status_code"
]

@pytest.mark.offline
class TestDataIntegrity:
    """
    PURPOSE 1: Data Integrity Tests
    Runs completely offline in < 1 second.
    Verifies that apis.json contains no typos, syntax bugs, missing fields, or duplicate entries.
    """

    def test_catalog_is_not_empty(self, apis_raw):
        """Catalog must contain entries."""
        assert len(apis_raw) > 0, "apis.json should not be empty"

    def test_no_duplicate_slugs(self, apis_raw):
        """Each API slug must be unique and URL-safe."""
        slugs = [item.get("slug") for item in apis_raw if "slug" in item]
        duplicates = [x for x in slugs if slugs.count(x) > 1]
        assert len(duplicates) == 0, f"Duplicate API slugs found: {set(duplicates)}"

    def test_no_duplicate_names(self, apis_raw):
        """API names must be unique (case-insensitive)."""
        names = [item.get("name", "").strip().lower() for item in apis_raw]
        duplicates = [x for x in names if names.count(x) > 1]
        assert len(duplicates) == 0, f"Duplicate API names found: {set(duplicates)}"

    def test_no_duplicate_endpoints(self, apis_raw):
        """No two APIs should have the identical full sample URL."""
        endpoints = [
            f"{item.get('base_url', '').rstrip('/')}/{item.get('endpoint') or (item.get('endpoints')[0]['path'] if item.get('endpoints') else '')}".lower().lstrip('/')
            for item in apis_raw
        ]
        duplicates = [x for x in endpoints if endpoints.count(x) > 1]
        assert len(duplicates) == 0, f"Duplicate sample endpoints found: {set(duplicates)}"

    def test_no_missing_required_fields(self, apis_raw):
        """Every entry must contain all required top-level attributes."""
        for item in apis_raw:
            item_name = item.get("name", "UNKNOWN_ITEM")

            # Check root fields
            for field in REQUIRED_ROOT_FIELDS:
                assert field in item, (
                    f"API '{item_name}' is missing required field: '{field}'"
                )

            # Check non-empty string fields
            for str_field in ["slug", "name", "description", "category", "base_url", "documentation_url"]:
                assert isinstance(item[str_field], str) and item[str_field].strip() != "", (
                    f"API '{item_name}' has an empty or non-string '{str_field}'"
                )

            # Check tags array
            assert isinstance(item["tags"], list) and len(item["tags"]) > 0, (
                f"API '{item_name}' must have a non-empty 'tags' array"
            )

            # Check health fields if present
            if "health" in item and item["health"]:
                health = item["health"]
                assert isinstance(health, dict), f"API '{item_name}' 'health' must be an object"
                for h_field in REQUIRED_HEALTH_FIELDS:
                    assert h_field in health, (
                        f"API '{item_name}' health object is missing '{h_field}'"
                    )

    def test_valid_urls(self, apis_raw):
        """Ensure base_url, endpoint, and documentation_url are well-formed."""
        for item in apis_raw:
            item_name = item.get("name", "UNKNOWN_ITEM")
            base_url = item.get("base_url", "")
            doc_url = item.get("documentation_url", "")
            endpoint = item.get("endpoint") or (item.get("endpoints")[0]["path"] if item.get("endpoints") else "")

            # Base URL check
            parsed_base = urlparse(base_url)
            assert parsed_base.scheme in ("http", "https"), (
                f"API '{item_name}' has invalid scheme in base_url '{base_url}'"
            )
            assert parsed_base.netloc != "", (
                f"API '{item_name}' base_url '{base_url}' lacks valid domain host"
            )

            # Documentation URL check
            parsed_doc = urlparse(doc_url)
            assert parsed_doc.scheme in ("http", "https"), (
                f"API '{item_name}' documentation_url '{doc_url}' must start with http:// or https://"
            )

            # Endpoint path check
            if endpoint:
                assert endpoint.startswith("/") or endpoint.startswith("?"), (
                    f"API '{item_name}' endpoint '{endpoint}' must start with '/' or '?'"
                )

    def test_valid_enums(self, apis_raw):
        """Enforce strict enum compliance for auth_type, pricing_tier, health status, and category."""
        valid_auth_values = {e.value for e in AuthType}
        valid_pricing_values = {e.value for e in PricingTier}
        valid_health_values = {e.value for e in HealthStatus}

        for item in apis_raw:
            item_name = item.get("name", "UNKNOWN_ITEM")

            # auth_type
            auth = item.get("auth_type")
            if auth:
                assert auth in valid_auth_values, (
                    f"API '{item_name}' has invalid auth_type '{auth}'. Must be one of {valid_auth_values}"
                )

            # pricing_tier
            pricing = item.get("pricing_tier")
            assert pricing in valid_pricing_values, (
                f"API '{item_name}' has invalid pricing_tier '{pricing}'. Must be one of {valid_pricing_values}"
            )

            # category
            category = item.get("category")
            assert category in VALID_CATEGORIES, (
                f"API '{item_name}' has unknown category '{category}'. Must be one of {VALID_CATEGORIES}"
            )

            # health status
            if "health" in item and item["health"]:
                status = item["health"].get("status")
                if status:
                    assert status in valid_health_values, (
                        f"API '{item_name}' has invalid health.status '{status}'. Must be one of {valid_health_values}"
                    )

    def test_pydantic_schema_validation(self, apis_raw):
        """Every entry in apis.json must successfully deserialize into the Pydantic ApiItem schema."""
        for item in apis_raw:
            # Will raise ValidationError if any field violates typing
            api_item = ApiItem(**item)
            assert api_item.slug == item["slug"]
            if api_item.health and api_item.health.uptime_percent is not None:
                assert 0.0 <= api_item.health.uptime_percent <= 100.0

if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main(["-v", __file__]))
