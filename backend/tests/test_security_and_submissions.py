import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.security import (
    validate_url_ssrf,
    SSRFSecurityError,
    proxy_rate_limiter,
    ALLOWED_PROXY_METHODS,
    MAX_REQUEST_BODY_BYTES
)

@pytest.fixture
def client():
    return TestClient(app)

class TestSecuritySSRF:
    def test_ssrf_rejects_localhost_and_loopback(self):
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://localhost:8000/secret")
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://127.0.0.1:80/data")
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://127.0.0.2:8080/")

    def test_ssrf_rejects_cloud_metadata(self):
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://169.254.169.254/latest/meta-data/")

    def test_ssrf_rejects_private_cidrs(self):
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://10.0.0.1/")
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://192.168.1.1/")
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://172.16.0.1/")

    def test_ssrf_rejects_prohibited_ports(self):
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://example.com:22/")
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://example.com:3306/")
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("http://example.com:6379/")

    def test_ssrf_rejects_unsupported_schemes(self):
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("ftp://example.com/file")
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("file:///etc/passwd")
        with pytest.raises(SSRFSecurityError):
            validate_url_ssrf("gopher://example.com/")

    def test_proxy_endpoint_blocks_ssrf(self, client):
        resp = client.post("/api/v1/proxy", json={
            "url": "http://127.0.0.1:8000/internal",
            "method": "GET"
        })
        # Blocked either at HTTP middleware level (403) or as ProxyResponse (status_code 403)
        if resp.status_code == 403:
            data = resp.json()
            assert "blocked by security policy" in data.get("detail", "").lower()
        else:
            assert resp.status_code == 200
            data = resp.json()
            assert data["status_code"] == 403

    def test_proxy_endpoint_blocks_disallowed_method(self, client):
        resp = client.post("/api/v1/proxy", json={
            "url": "https://api.github.com",
            "method": "TRACE"
        })
        # Rejected by schema validation (422) or proxy method filter (405)
        assert resp.status_code in (422, 405)

    def test_proxy_endpoint_blocks_oversized_payload(self, client):
        large_body = "x" * (MAX_REQUEST_BODY_BYTES + 100)
        resp = client.post("/api/v1/proxy", json={
            "url": "https://httpbin.org/post",
            "method": "POST",
            "body": large_body
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status_code"] == 413
        assert "Payload Too Large" in data["error"]


class TestSubmissionsAndReporting:
    def test_submission_duplicate_detection(self, client):
        # Open-Meteo is an existing catalog API
        dup_payload = {
            "name": "Open-Meteo Weather API",
            "category": "weather",
            "base_url": "https://api.open-meteo.com",
            "sample_endpoint": "/v1/forecast",
            "documentation_url": "https://open-meteo.com/en/docs",
            "auth_type": "none",
            "pricing_tier": "open",
            "description": "Duplicate weather API test submission."
        }
        resp = client.post("/api/v1/submit", json=dup_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["duplicate"] is True
        assert data["success"] is False
        assert "already exists" in data["message"]

    def test_submission_moderation_lookup(self, client):
        # Check non-existent submission returns 404
        resp = client.get("/api/v1/submit/status/sub_nonexistent_999")
        assert resp.status_code == 404

        # List submissions returns list
        resp = client.get("/api/v1/submit/list")
        assert resp.status_code == 200
        data = resp.json()
        assert "submissions" in data
        assert isinstance(data["submissions"], list)

    def test_report_broken_api_endpoint(self, client):
        report_payload = {
            "api_slug": "pokeapi",
            "issue_type": "broken_sample",
            "details": "Sample endpoint returned unexpected structure during testing.",
            "contact_email": "dev@example.com"
        }
        resp = client.post("/api/v1/submit/report", json=report_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "report" in data
        assert data["report"]["api_slug"] == "pokeapi"
        assert data["report"]["status"] == "under_investigation"

    def test_report_broken_api_slug_route(self, client):
        resp = client.post("/api/v1/apis/pokeapi/report", json={
            "issue_type": "offline",
            "details": "API is currently returning 500 server errors."
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "report" in data
