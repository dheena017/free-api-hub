import ipaddress
import re
import socket
import urllib.parse
from typing import Dict, Any, Optional, Tuple, List, Set, Union
import httpx
import httpcore
from httpcore._backends.auto import AutoBackend
import time
import collections

# Blocked ports for outbound proxy/validator/health requests
PROHIBITED_PORTS: Set[int] = {
    0, 20, 21, 22, 23, 25, 53, 67, 68, 69, 110, 123, 135, 137, 138, 139,
    143, 161, 162, 389, 445, 514, 636, 1433, 1521, 2049, 2375, 2376, 3306,
    3389, 5000, 5432, 5900, 6379, 8000, 8080, 8500, 9000, 9200, 9300, 11211,
    27017, 27018, 28017
}

# Exhaustive list of non-public / reserved network ranges (both IPv4 and IPv6)
PROHIBITED_NETWORKS = [
    # IPv4 Special & Reserved
    ipaddress.ip_network("0.0.0.0/8"),          # Current network
    ipaddress.ip_network("10.0.0.0/8"),         # Private RFC1918
    ipaddress.ip_network("100.64.0.0/10"),      # Shared Address Space (Carrier-Grade NAT)
    ipaddress.ip_network("100.100.100.200/32"), # Alibaba Cloud Metadata
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),     # Link-Local (including cloud metadata: 169.254.169.254)
    ipaddress.ip_network("172.16.0.0/12"),      # Private RFC1918
    ipaddress.ip_network("192.0.0.0/24"),       # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),       # Documentation (TEST-NET-1)
    ipaddress.ip_network("192.88.99.0/24"),     # 6to4 Relay Anycast
    ipaddress.ip_network("192.168.0.0/16"),     # Private RFC1918
    ipaddress.ip_network("198.18.0.0/15"),      # Network Interconnect Device Benchmark
    ipaddress.ip_network("198.51.100.0/24"),    # Documentation (TEST-NET-2)
    ipaddress.ip_network("203.0.113.0/24"),     # Documentation (TEST-NET-3)
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved for Future Use
    ipaddress.ip_network("255.255.255.255/32"), # Limited Broadcast

    # IPv6 Special & Reserved
    ipaddress.ip_network("::/128"),             # Unspecified address
    ipaddress.ip_network("::1/128"),            # Loopback
    ipaddress.ip_network("::ffff:0:0/96"),      # IPv4-mapped IPv6
    ipaddress.ip_network("64:ff9b::/96"),       # IPv4/IPv6 translation
    ipaddress.ip_network("64:ff9b:1::/48"),     # Local IPv4/IPv6 translation
    ipaddress.ip_network("100::/64"),           # Discard prefix
    ipaddress.ip_network("2001::/23"),          # IETF Protocol Assignments
    ipaddress.ip_network("2001:db8::/32"),      # Documentation
    ipaddress.ip_network("2002::/16"),          # 6to4
    ipaddress.ip_network("fc00::/7"),           # Unique Local Address (ULA)
    ipaddress.ip_network("fe80::/10"),          # Link-Local Unicast
    ipaddress.ip_network("fd00:ec2::254/128"),  # AWS IPv6 Metadata
    ipaddress.ip_network("ff00::/8"),           # Multicast
]

PROHIBITED_HOSTNAMES: Set[str] = {
    "localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback",
    "metadata.google.internal", "metadata", "instance-data",
    "169.254.169.254"
}

PROHIBITED_DOMAIN_SUFFIXES: Tuple[str, ...] = (
    ".local", ".internal", ".localhost", ".lan", ".corp", ".home.arpa"
)

# Sensitive or internal headers that should never be forwarded by default
STRIP_REQUEST_HEADERS = {
    "host", "transfer-encoding", "connection", "upgrade", "keep-alive",
    "proxy-authenticate", "proxy-authorization", "te", "trailer",
    "x-forwarded-for", "x-real-ip", "x-forwarded-host", "x-forwarded-proto",
    "content-length"
}

# Sensitive auth credentials to strip when following redirects to a different origin
SENSITIVE_AUTH_HEADERS = {
    "authorization", "proxy-authorization", "cookie", "x-api-key",
    "api-key", "apikey", "access-token"
}

# Sensitive query parameter names to mask in logs
SENSITIVE_PARAM_NAMES = {
    "key", "api_key", "apikey", "token", "access_token",
    "secret", "auth", "password", "pwd", "credential"
}

ALLOWED_PROXY_METHODS: Set[str] = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
MAX_REQUEST_BODY_BYTES: int = 1024 * 1024       # 1MB
MAX_RESPONSE_BODY_BYTES: int = 5 * 1024 * 1024    # 5MB


class SSRFSecurityError(Exception):
    """Raised when an outbound request destination is prohibited by SSRF security policy."""
    pass


def parse_int_part(p: str) -> Optional[int]:
    """Parses integer string allowing hex (0x), octal (0o or leading zero), or decimal."""
    p = p.strip()
    if not p:
        return None
    try:
        if p.startswith(("0x", "0X")):
            return int(p, 16)
        if len(p) > 1 and p.startswith("0") and p.isdigit():
            # If all octal digits (0-7), parse as octal; otherwise fallback to decimal
            if all('0' <= c <= '7' for c in p):
                return int(p, 8)
            return int(p, 10)
        return int(p, 10)
    except Exception:
        return None


def parse_literal_ip(host: str) -> Optional[Union[ipaddress.IPv4Address, ipaddress.IPv6Address]]:
    """
    Parses literal IP address representations, including:
    - Standard IPv4 / IPv6 notation
    - Integer representations (e.g. 2130706433)
    - Hex representations (e.g. 0x7f000001, 0x7f.1)
    - Octal dotted-quad notation (e.g. 0177.0.0.1)
    - Abbreviated IPv4 forms (e.g. 127.1, 127.0.1, 0)
    - IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
    """
    if not host or not isinstance(host, str):
        return None
    host = host.strip("[]").strip()
    if not host:
        return None

    # 1. Standard library attempt
    try:
        ip = ipaddress.ip_address(host)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            return ip.ipv4_mapped
        return ip
    except ValueError:
        pass

    # 2. Dotted notation or single numeric/hex IPv4 representation
    parts = host.split(".")
    if 1 <= len(parts) <= 4:
        parsed_parts = [parse_int_part(p) for p in parts]
        if all(p is not None for p in parsed_parts):
            if len(parsed_parts) == 1:
                val = parsed_parts[0]
                if 0 <= val <= 0xFFFFFFFF:
                    return ipaddress.IPv4Address(val)
            elif len(parsed_parts) == 2:
                a, b = parsed_parts
                if 0 <= a <= 255 and 0 <= b <= 0xFFFFFF:
                    return ipaddress.IPv4Address((a << 24) + b)
            elif len(parsed_parts) == 3:
                a, b, c = parsed_parts
                if 0 <= a <= 255 and 0 <= b <= 255 and 0 <= c <= 0xFFFF:
                    return ipaddress.IPv4Address((a << 24) + (b << 16) + c)
            elif len(parsed_parts) == 4:
                a, b, c, d = parsed_parts
                if all(0 <= x <= 255 for x in (a, b, c, d)):
                    return ipaddress.IPv4Address((a << 24) + (b << 16) + (c << 8) + d)

    return None


def is_ip_prohibited(ip: Union[str, ipaddress.IPv4Address, ipaddress.IPv6Address]) -> bool:
    """
    Checks if an IP address belongs to any private, loopback, link-local,
    multicast, cloud-metadata, or reserved CIDR block.
    """
    if isinstance(ip, str):
        parsed = parse_literal_ip(ip)
        if parsed is None:
            return True
        ip = parsed

    # Unpack IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped

    if (
        ip.is_loopback
        or ip.is_private
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return True

    for network in PROHIBITED_NETWORKS:
        if ip in network:
            return True

    return False


def is_hostname_prohibited(hostname: str) -> bool:
    """Checks if hostname is a forbidden local/internal or cloud metadata destination."""
    h = hostname.strip().lower()
    if h in PROHIBITED_HOSTNAMES:
        return True
    for suffix in PROHIBITED_DOMAIN_SUFFIXES:
        if h.endswith(suffix):
            return True
    return False


def validate_url_ssrf(url_str: str) -> Tuple[str, str, int]:
    """
    Validates a target URL against SSRF rules:
    - Enforces scheme: http or https only
    - Rejects credentials (user:pass@host)
    - Rejects prohibited ports
    - Rejects literal private/loopback/metadata/reserved IPs
    - Resolves DNS and rejects any hostname that resolves to a prohibited IP
    Returns (scheme, host, port).
    """
    if not url_str or not isinstance(url_str, str):
        raise SSRFSecurityError("Target URL is missing or invalid.")

    url_str = url_str.strip()
    if any(c in url_str for c in ('\r', '\n')):
        raise SSRFSecurityError("URL contains illegal CRLF control characters.")
    if any(ord(c) < 32 or ord(c) == 127 for c in url_str):
        raise SSRFSecurityError("URL contains illegal control characters.")

    try:
        parsed = urllib.parse.urlsplit(url_str)
    except Exception as e:
        raise SSRFSecurityError(f"Malformed URL: {e}")

    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise SSRFSecurityError(f"Unsupported scheme '{scheme}'. Only 'http' and 'https' are allowed.")

    if parsed.username or parsed.password:
        raise SSRFSecurityError("Embedded credentials in target URL are prohibited.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFSecurityError("Target URL must specify a valid destination hostname.")

    hostname_clean = hostname.strip().lower()

    if is_hostname_prohibited(hostname_clean):
        raise SSRFSecurityError("Requests to localhost, cloud metadata, or internal networks are blocked.")

    # Determine port
    port = parsed.port
    if port is None:
        port = 443 if scheme == "https" else 80

    if port in PROHIBITED_PORTS or port < 1 or port > 65535:
        raise SSRFSecurityError(f"Access to destination port {port} is prohibited.")

    # 1. Check if hostname is directly a literal IP address
    literal_ip = parse_literal_ip(hostname_clean)
    if literal_ip is not None:
        if is_ip_prohibited(literal_ip):
            raise SSRFSecurityError("Requests to private, loopback, or internal IP addresses are blocked.")
        return scheme, str(literal_ip), port

    # 2. Resolve DNS and verify ALL returned IP addresses
    try:
        addr_info = socket.getaddrinfo(hostname_clean, port, proto=socket.IPPROTO_TCP)
        if not addr_info:
            raise SSRFSecurityError(f"DNS resolution returned no addresses for host '{hostname}'.")

        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            resolved_ip = ipaddress.ip_address(ip_str)
            if is_ip_prohibited(resolved_ip):
                raise SSRFSecurityError(
                    f"Destination hostname resolves to a prohibited network address ({ip_str})."
                )
    except socket.gaierror as e:
        raise SSRFSecurityError(f"DNS resolution failed for host '{hostname}': {e}")
    except SSRFSecurityError:
        raise
    except Exception as e:
        raise SSRFSecurityError(f"Failed to verify destination address: {e}")

    return scheme, hostname_clean, port


class SafeBackend(AutoBackend):
    """
    Network backend that intercepts TCP socket connections right before socket creation.
    Resolves the destination hostname, verifies against SSRF rules, and connects to
    a verified safe IP directly, completely defeating DNS rebinding attacks.
    """
    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: Optional[float] = None,
        local_address: Optional[str] = None,
        socket_options: Any = None,
    ):
        clean_host = host.strip("[]").strip().lower()

        if port in PROHIBITED_PORTS or port < 1 or port > 65535:
            raise SSRFSecurityError(f"Access to destination port {port} is prohibited.")

        if is_hostname_prohibited(clean_host):
            raise SSRFSecurityError("Connection to prohibited host or internal network is blocked.")

        literal = parse_literal_ip(clean_host)
        if literal is not None:
            if is_ip_prohibited(literal):
                raise SSRFSecurityError("Connection to private, loopback, or internal IP is blocked.")
            return await super().connect_tcp(
                str(literal),
                port,
                timeout=timeout,
                local_address=local_address,
                socket_options=socket_options
            )

        try:
            addr_info = socket.getaddrinfo(clean_host, port, proto=socket.IPPROTO_TCP)
            if not addr_info:
                raise SSRFSecurityError(f"Cannot resolve host '{clean_host}' at connection time.")

            safe_ip: Optional[str] = None
            for family, _, _, _, sockaddr in addr_info:
                ip_str = sockaddr[0]
                ip_obj = ipaddress.ip_address(ip_str)
                if is_ip_prohibited(ip_obj):
                    raise SSRFSecurityError(
                        f"Host resolved to prohibited IP address ({ip_str}) at connection time."
                    )
                if safe_ip is None:
                    safe_ip = ip_str

            if safe_ip is None:
                raise SSRFSecurityError("No safe IP address available to connect.")

            return await super().connect_tcp(
                safe_ip,
                port,
                timeout=timeout,
                local_address=local_address,
                socket_options=socket_options
            )
        except socket.gaierror as e:
            raise SSRFSecurityError(f"DNS lookup failed for '{clean_host}': {e}")


class SafeConnectionPool(httpcore.AsyncConnectionPool):
    """httpcore AsyncConnectionPool wired to use SafeBackend."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._network_backend = SafeBackend()


def create_safe_transport() -> httpx.AsyncHTTPTransport:
    """Creates an httpx AsyncHTTPTransport configured with the SSRF-protecting SafeBackend."""
    transport = httpx.AsyncHTTPTransport()
    transport._pool = SafeConnectionPool()
    return transport


def sanitize_request_headers(headers: Optional[Dict[str, str]]) -> Dict[str, str]:
    """Strips prohibited hop-by-hop and spoofable internal headers, and rejects CRLF injection."""
    if not headers:
        return {}
    clean = {}
    for k, v in headers.items():
        if not isinstance(k, str) or not isinstance(v, str):
            continue
        if any(c in k or c in v for c in ('\r', '\n')):
            continue  # Drop CRLF injection attempts
        if k.lower().strip() not in STRIP_REQUEST_HEADERS:
            clean[k] = v
    return clean


def sanitize_url_for_logging(url: str) -> str:
    """Masks values of sensitive query parameters for safe logging."""
    if not url or "?" not in url:
        return url
    try:
        parsed = urllib.parse.urlsplit(url)
        if not parsed.query:
            return url
        query_pairs = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
        sanitized_pairs = []
        for k, v in query_pairs:
            k_lower = k.lower()
            if k_lower in SENSITIVE_PARAM_NAMES or any(s in k_lower for s in ("token", "secret", "key", "auth", "pwd")):
                sanitized_pairs.append((k, "[REDACTED]"))
            else:
                sanitized_pairs.append((k, v))
        new_query = urllib.parse.urlencode(sanitized_pairs, safe="[]")
        return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))
    except Exception:
        return url


def sanitize_headers_for_logging(headers: Optional[Dict[str, str]]) -> Dict[str, str]:
    """Masks values of sensitive headers for safe logging."""
    if not headers:
        return {}
    clean = {}
    for k, v in headers.items():
        k_lower = k.lower().strip()
        if (
            k_lower in SENSITIVE_AUTH_HEADERS
            or any(s in k_lower for s in ("auth", "token", "secret", "key", "cookie"))
        ):
            clean[k] = "[REDACTED]"
        else:
            clean[k] = v
    return clean


async def safe_http_request(
    method: str,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    content: Optional[bytes] = None,
    timeout: float = 10.0,
    max_redirects: int = 3,
    max_response_bytes: int = MAX_RESPONSE_BODY_BYTES,
    max_request_bytes: int = MAX_REQUEST_BODY_BYTES
) -> Tuple[int, int, Dict[str, str], bytes]:
    """
    Executes a secure outbound HTTP request with:
    - Supported HTTP method validation
    - Payload size enforcement
    - Pre-flight SSRF validation
    - Connection-time IP verification (anti-DNS-rebinding)
    - Safe redirect following with SSRF re-validation on every redirect hop
    - Cross-origin redirect credential stripping
    - Streaming response size enforcement (prevents memory exhaustion bombs)
    - Sanitized headers
    Returns (status_code, latency_ms, response_headers, response_bytes).
    """
    current_method = method.upper().strip()
    if current_method not in ALLOWED_PROXY_METHODS:
        raise SSRFSecurityError(f"HTTP method '{current_method}' is not supported.")

    if content is not None and len(content) > max_request_bytes:
        raise SSRFSecurityError(f"Request body exceeds maximum size of {max_request_bytes // 1024}KB.")

    start_time = time.perf_counter()
    current_url = url
    initial_origin = urllib.parse.urlsplit(url).netloc.lower()
    redirects_remaining = max_redirects

    clean_headers = sanitize_request_headers(headers)
    clean_headers.setdefault("User-Agent", "Free-API-Hub-SafeProxy/1.0")

    transport = create_safe_transport()

    async with httpx.AsyncClient(
        transport=transport,
        timeout=httpx.Timeout(timeout, connect=min(5.0, timeout)),
        follow_redirects=False
    ) as client:
        while True:
            # 1. Pre-validate current URL before sending request
            validate_url_ssrf(current_url)

            # 2. Issue request without automatic redirect
            req_params = params if current_url == url else None
            req_content = content if current_method in ("POST", "PUT", "PATCH", "DELETE") else None

            response = await client.request(
                method=current_method,
                url=current_url,
                headers=clean_headers,
                params=req_params,
                content=req_content
            )

            # 3. Check for redirects (301, 302, 303, 307, 308)
            if response.status_code in (301, 302, 303, 307, 308) and "location" in response.headers:
                if redirects_remaining <= 0:
                    raise SSRFSecurityError(f"Exceeded maximum allowed redirects ({max_redirects}).")

                redirect_url = response.headers["location"]
                next_url = urllib.parse.urljoin(current_url, redirect_url)

                # Pre-validate redirect destination against SSRF
                validate_url_ssrf(next_url)

                # Strip sensitive auth headers if redirecting to a different origin
                next_origin = urllib.parse.urlsplit(next_url).netloc.lower()
                if next_origin != initial_origin:
                    clean_headers = {
                        k: v for k, v in clean_headers.items()
                        if k.lower() not in SENSITIVE_AUTH_HEADERS
                    }

                if response.status_code == 303 or (response.status_code in (301, 302) and current_method == "POST"):
                    current_method = "GET"
                    content = None

                current_url = next_url
                redirects_remaining -= 1
                continue

            # 4. Stream response body enforcing max size limit
            body_chunks = []
            total_bytes = 0
            async for chunk in response.aiter_bytes():
                total_bytes += len(chunk)
                if total_bytes > max_response_bytes:
                    raise SSRFSecurityError(
                        f"Response payload exceeds maximum allowed size ({max_response_bytes // (1024 * 1024)}MB)."
                    )
                body_chunks.append(chunk)

            raw_body = b"".join(body_chunks)
            latency_ms = int((time.perf_counter() - start_time) * 1000)

            # Sanitize response headers (strip Set-Cookie)
            res_headers = {
                k: v for k, v in response.headers.items()
                if not k.lower().startswith("set-cookie")
            }

            return response.status_code, latency_ms, res_headers, raw_body


class InMemoryRateLimiter:
    """
    Sliding-window in-memory rate limiter per client IP.
    Thread-safe and async-safe with automatic stale entry cleanup.
    """
    def __init__(self):
        self._requests: Dict[str, List[float]] = collections.defaultdict(list)
        self._last_cleanup = time.time()

    def _cleanup(self, now: float, window: float):
        if now - self._last_cleanup > 60:
            stale_keys = []
            for ip, timestamps in list(self._requests.items()):
                valid_ts = [t for t in timestamps if now - t < window]
                if valid_ts:
                    self._requests[ip] = valid_ts
                else:
                    stale_keys.append(ip)
            for k in stale_keys:
                self._requests.pop(k, None)
            self._last_cleanup = now

    def is_allowed(self, client_ip: str, max_requests: int = 60, window_seconds: float = 60.0) -> Tuple[bool, int, float]:
        """
        Returns (is_allowed, remaining_requests, retry_after_seconds).
        """
        now = time.time()
        self._cleanup(now, window_seconds)
        timestamps = self._requests[client_ip]
        valid = [t for t in timestamps if now - t < window_seconds]
        self._requests[client_ip] = valid

        if len(valid) >= max_requests:
            oldest = valid[0]
            retry_after = round(max(0.1, window_seconds - (now - oldest)), 1)
            return False, 0, retry_after

        self._requests[client_ip].append(now)
        remaining = max_requests - len(self._requests[client_ip])
        return True, remaining, 0.0


proxy_rate_limiter = InMemoryRateLimiter()
submission_rate_limiter = InMemoryRateLimiter()
health_rate_limiter = InMemoryRateLimiter()
report_rate_limiter = InMemoryRateLimiter()
outbound_concurrency_semaphore = httpx.AsyncClient  # or initialized in main/services
