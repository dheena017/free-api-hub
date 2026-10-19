import sys
import os
from pathlib import Path
import pytest
import httpx
import ipaddress

# Ensure backend root is on sys.path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.security import (
    validate_url_ssrf,
    parse_literal_ip,
    is_ip_prohibited,
    is_hostname_prohibited,
    sanitize_url_for_logging,
    sanitize_headers_for_logging,
    SSRFSecurityError,
    InMemoryRateLimiter,
    safe_http_request
)
from app.services import catalog_service
from app.models import SubmissionPayload, AuthType, PricingTier


@pytest.fixture
async def async_client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.offline
class TestSecuritySSRF:
    """Automated security test suite for SSRF, IP parsing, redirects, ports, schemas, and rate limits."""

    def test_blocked_private_ipv4(self):
        """Standard private and loopback IPv4 addresses must be blocked."""
        blocked_ips = [
            "127.0.0.1",
            "127.0.0.2",
            "10.0.0.1",
            "10.254.1.1",
            "172.16.0.1",
            "172.31.255.254",
            "192.168.0.1",
            "192.168.1.100",
            "0.0.0.0",
            "169.254.169.254",
            "100.64.0.1",
            "100.100.100.200"
        ]
        for ip in blocked_ips:
            with pytest.raises(SSRFSecurityError):
                validate_url_ssrf(f"http://{ip}/api/data")

    def test_blocked_ipv6(self):
        """IPv6 loopback, link-local, and cloud metadata addresses must be blocked."""
        blocked_ipv6 = [
            "::1",
            "[::1]",
            "fe80::1",
            "[fe80::1]",
            "fc00::1",
            "[fc00::1]",
            "::ffff:127.0.0.1",
            "[::ffff:127.0.0.1]",
            "fd00:ec2::254",
            "[fd00:ec2::254]"
        ]
        for ip in blocked_ipv6:
            clean = ip.strip("[]")
            assert is_ip_prohibited(clean), f"{ip} should be recognized as prohibited"

    def test_alternate_ip_representations(self):
        """Octal, hex, dword, and abbreviated IP representations must be normalized and blocked."""
        alternate_forms = [
            ("0177.0.0.1", "127.0.0.1"),        # Octal dotted quad
            ("0x7f000001", "127.0.0.1"),        # Hex 32-bit int
            ("0x7f.0.0.1", "127.0.0.1"),        # Mixed hex dotted quad
            ("0x7f.1", "127.0.0.1"),            # Hex + 24-bit int
            ("127.1", "127.0.0.1"),             # Abbreviated 2-part IPv4
            ("127.0.1", "127.0.0.1"),           # Abbreviated 3-part IPv4
            ("0", "0.0.0.0"),                   # 0.0.0.0 shorthand
            ("2130706433", "127.0.0.1"),        # Decimal 32-bit int
            ("017700000001", "127.0.0.1"),      # Octal 32-bit int
        ]
        for raw, expected in alternate_forms:
            parsed = parse_literal_ip(raw)
            assert parsed is not None, f"Failed to parse alternate form '{raw}'"
            assert str(parsed) == expected, f"Parsed {raw} into {parsed}, expected {expected}"
            assert is_ip_prohibited(parsed), f"{raw} ({parsed}) must be prohibited"

            with pytest.raises(SSRFSecurityError):
                validate_url_ssrf(f"http://{raw}/status")

    def test_prohibited_hostnames(self):
        """Localhost and cloud metadata hostnames must be prohibited."""
        bad_hosts = [
            "localhost",
            "localhost.localdomain",
            "ip6-localhost",
            "metadata.google.internal",
            "instance-data",
            "service.local",
            "internal.lan",
            "db.corp"
        ]
        for host in bad_hosts:
            assert is_hostname_prohibited(host), f"Hostname '{host}' should be prohibited"
            with pytest.raises(SSRFSecurityError):
                validate_url_ssrf(f"http://{host}/secrets")

    def test_prohibited_ports(self):
        """Non-HTTP service ports like SSH, MySQL, Redis, internal 8000 must be blocked."""
        prohibited_ports = [0, 21, 22, 23, 25, 53, 3306, 5432, 6379, 8000, 27017]
        for port in prohibited_ports:
            with pytest.raises(SSRFSecurityError):
                validate_url_ssrf(f"http://93.184.216.34:{port}/")

    def test_invalid_and_dangerous_schemes(self):
        """Schemes other than http/https must be rejected."""
        dangerous_urls = [
            "ftp://example.com/file",
            "file:///etc/passwd",
            "gopher://example.com/",
            "javascript:alert(1)",
            "data:text/html,test",
            "dict://example.com/",
            "ldap://example.com/"
        ]
        for url in dangerous_urls:
            with pytest.raises(SSRFSecurityError):
                validate_url_ssrf(url)

    def test_crlf_injection_prevention(self):
        """CRLF characters in URL or headers must be blocked."""
        crlf_urls = [
            "http://example.com/api\r\nHost: evil.com",
            "http://example.com/api\nSet-Cookie: admin=1",
            "http://example.com/path\r\n\r\nPOST /evil HTTP/1.1"
        ]
        for url in crlf_urls:
            with pytest.raises(SSRFSecurityError):
                validate_url_ssrf(url)

    def test_sensitive_data_logging_redaction(self):
        """Sensitive URL query parameters and auth headers must be redacted."""
        url_with_secrets = "https://api.example.com/v1/data?key=SECRET123&api_key=TOP_SECRET&user=john&token=XYZ987"
        sanitized = sanitize_url_for_logging(url_with_secrets)
        assert "SECRET123" not in sanitized
        assert "TOP_SECRET" not in sanitized
        assert "XYZ987" not in sanitized
        assert "[REDACTED]" in sanitized
        assert "user=john" in sanitized

        headers = {
            "Authorization": "Bearer super_secret_token",
            "X-Api-Key": "my_secret_key",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        clean_headers = sanitize_headers_for_logging(headers)
        assert clean_headers["Authorization"] == "[REDACTED]"
        assert clean_headers["X-Api-Key"] == "[REDACTED]"
        assert clean_headers["Accept"] == "application/json"

    def test_rate_limiter_logic(self):
        """Rate limiter must enforce quotas and return remaining allowance."""
        limiter = InMemoryRateLimiter()
        client_ip = "198.51.100.99"

        # Allow up to 3 requests
        for i in range(3):
            allowed, remaining, retry_after = limiter.is_allowed(client_ip, max_requests=3, window_seconds=60.0)
            assert allowed is True
            assert remaining == 2 - i

        # 4th request must be rejected
        allowed, remaining, retry_after = limiter.is_allowed(client_ip, max_requests=3, window_seconds=60.0)
        assert allowed is False
        assert remaining == 0
        assert retry_after > 0


@pytest.mark.asyncio
@pytest.mark.offline
class TestEndpointSecurityAndCorrectness:
    """Tests FastAPI endpoint level validation, proxy security, rate limiting, and dashboard schema."""

    async def test_proxy_blocks_private_ip(self, async_client):
        """POST /api/v1/proxy must reject loopback, private IPs, and metadata with 403."""
        payload = {"url": "http://127.0.0.1:8000/internal", "method": "GET"}
        res = await async_client.post("/api/v1/proxy", json=payload)
        # Should return 403 Forbidden
        assert res.status_code == 403
        data = res.json()
        assert "error" in data or "detail" in data

    async def test_proxy_blocks_cloud_metadata(self, async_client):
        """POST /api/v1/proxy must reject requests to AWS/GCP metadata IP 169.254.169.254."""
        payload = {"url": "http://169.254.169.254/latest/meta-data/", "method": "GET"}
        res = await async_client.post("/api/v1/proxy", json=payload)
        assert res.status_code == 403

    async def test_proxy_unsupported_method(self, async_client):
        """POST /api/v1/proxy must reject unsupported methods like TRACE or CONNECT."""
        payload = {"url": "https://api.example.com", "method": "TRACE"}
        res = await async_client.post("/api/v1/proxy", json=payload)
        assert res.status_code == 422  # Pydantic validation error

    async def test_validate_endpoint_blocks_private_ip(self, async_client):
        """POST /api/v1/submit/validate must block internal IP targets."""
        payload = {"base_url": "http://10.0.0.1", "endpoint": "/data", "method": "GET"}
        res = await async_client.post("/api/v1/submit/validate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_valid"] is False
        assert "prohibited" in data["message"].lower()

    async def test_submission_duplicate_detection(self, async_client, apis_raw):
        """Submitting an API with an identical existing name or endpoint detects duplicate."""
        existing = apis_raw[0]
        payload = {
            "name": existing["name"],
            "category": existing["category"],
            "base_url": existing["base_url"],
            "endpoint": existing.get("endpoint") or "/",
            "documentation_url": existing["documentation_url"],
            "auth_type": "none",
            "pricing_tier": "open",
            "description": "A duplicate submission testing duplicate rejection logic."
        }
        res = await async_client.post("/api/v1/submit", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["duplicate"] is True
        assert "already exists" in data["message"].lower()

    async def test_status_dashboard_typed_response(self, async_client):
        """GET /api/v1/status-dashboard returns the dedicated StatusDashboardResponse schema."""
        res = await async_client.get("/api/v1/status-dashboard?limit=10")
        assert res.status_code == 200
        data = res.json()
        assert "stats" in data
        assert "total" in data
        assert "endpoints" in data
        assert isinstance(data["endpoints"], list)
        if len(data["endpoints"]) > 0:
            ep = data["endpoints"][0]
            assert "slug" in ep
            assert "name" in ep
            assert "status" in ep
            assert "uptime_percent" in ep
            assert "avg_latency_ms" in ep
            assert "last_checked" in ep
            assert "last_status_code" in ep

    async def test_apis_invalid_sort_rejected(self, async_client):
        """Invalid sort option must return 422 Unprocessable Entity."""
        res = await async_client.get("/api/v1/apis?sort=malicious_injection")
        assert res.status_code == 422

    async def test_batch_health_check_deduplication(self, async_client, apis_raw):
        """POST /api/v1/health/check-batch deduplicates identical slugs."""
        slug = apis_raw[0]["slug"]
        # Send 5 duplicates of the same slug
        payload = {"slugs": [slug, slug, slug, slug, slug]}
        res = await async_client.post("/api/v1/health/check-batch", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "total_probed" in data
        assert data["total_probed"] == 1  # Deduplicated from 5 to 1
