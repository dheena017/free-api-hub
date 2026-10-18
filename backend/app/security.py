import ipaddress
import re
import socket
import urllib.parse
from typing import Dict, Any, Optional, Tuple, List, Set, Union
import httpx
import httpcore
from httpcore._backends.auto import AutoBackend

# Blocked ports for outbound proxy/validator/health requests
PROHIBITED_PORTS: Set[int] = {
    0, 20, 21, 22, 23, 25, 53, 67, 68, 69, 110, 123, 135, 137, 138, 139,
    143, 161, 162, 389, 445, 514, 636, 1433, 1521, 2049, 2375, 2376, 3306,
    3389, 5000, 5432, 5900, 6379, 8000, 8500, 9000, 9200, 9300, 11211,
    27017, 27018, 28017
}

# Exhaustive list of non-public / reserved network ranges (both IPv4 and IPv6)
PROHIBITED_NETWORKS = [
    # IPv4 Special & Reserved
    ipaddress.ip_network("0.0.0.0/8"),          # Current network (only valid as source address)
    ipaddress.ip_network("10.0.0.0/8"),         # Private RFC1918
    ipaddress.ip_network("100.64.0.0/10"),      # Shared Address Space (Carrier-Grade NAT)
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
    ipaddress.ip_network("ff00::/8"),           # Multicast
]

# Sensitive or internal headers that should never be forwarded
STRIP_REQUEST_HEADERS = {
    "host", "transfer-encoding", "connection", "upgrade", "keep-alive",
    "proxy-authenticate", "proxy-authorization", "te", "trailer",
    "x-forwarded-for", "x-real-ip", "x-forwarded-host", "x-forwarded-proto"
}

class SSRFSecurityError(Exception):
    """Raised when an outbound request destination is prohibited by SSRF security policy."""
    pass

def parse_int_part(p: str) -> int:
    """Parses integer string allowing hex (0x), octal (0o or leading zero), or decimal."""
    p = p.strip()
    if p.startswith(("0x", "0X")):
        return int(p, 16)
    if len(p) > 1 and p.startswith("0") and p.isdigit():
        return int(p, 8)
    return int(p, 10)

def parse_literal_ip(host: str) -> Optional[Union[ipaddress.IPv4Address, ipaddress.IPv6Address]]:
    """
    Parses literal IP address representations, including:
    - Standard IPv4 / IPv6 notation
    - Integer representations (e.g. 2130706433)
    - Hex representations (e.g. 0x7f000001)
    - Octal dotted-quad notation (e.g. 0177.0.0.1)
    """
    host = host.strip("[]").strip()
    # 1. Standard library attempt
    try:
        return ipaddress.ip_address(host)
    except ValueError:
        pass

    # 2. Integer or Hex representation of IPv4
    try:
        val = parse_int_part(host)
        if 0 <= val <= 0xFFFFFFFF:
            return ipaddress.IPv4Address(val)
    except Exception:
        pass

    # 3. Dotted-quad with potential octal/hex segments (e.g. 0177.0.0.1)
    parts = host.split(".")
    if len(parts) == 4:
        try:
            int_parts = [parse_int_part(p) for p in parts]
            if len(int_parts) == 4 and all(0 <= x <= 255 for x in int_parts):
                return ipaddress.IPv4Address(
                    (int_parts[0] << 24) + (int_parts[1] << 16) + (int_parts[2] << 8) + int_parts[3]
                )
        except Exception:
            pass

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

    # 2. Check for local/internal hostname aliases
    if hostname_clean in ("localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback"):
        raise SSRFSecurityError("Requests to localhost or internal network destinations are blocked.")

    # 3. Resolve DNS and verify ALL returned IP addresses
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
    """Strips prohibited hop-by-hop and spoofable internal headers."""
    if not headers:
        return {}
    clean = {}
    for k, v in headers.items():
        if k.lower().strip() not in STRIP_REQUEST_HEADERS:
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
    max_response_bytes: int = 5 * 1024 * 1024
) -> Tuple[int, int, Dict[str, str], bytes]:
    """
    Executes a secure outbound HTTP request with:
    - Pre-flight SSRF validation
    - Connection-time IP verification (anti-DNS-rebinding)
    - Safe redirect following with SSRF re-validation on every redirect hop
    - Streaming response size enforcement (prevents decompression and memory exhaustion bombs)
    - Sanitized headers
    Returns (status_code, latency_ms, response_headers, response_bytes).
    """
    import time
    start_time = time.perf_counter()

    current_url = url
    current_method = method.upper()
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
            req_content = content if current_method in ("POST", "PUT", "PATCH") else None

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

                # Pre-validate redirect destination
                validate_url_ssrf(next_url)

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
