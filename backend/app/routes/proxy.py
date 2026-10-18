import asyncio
from fastapi import APIRouter, Request, HTTPException
from app.models import ProxyRequest, ProxyResponse
from app.services import catalog_service
from app.security import proxy_rate_limiter

router = APIRouter(prefix="/proxy", tags=["proxy"])
proxy_semaphore = asyncio.Semaphore(10)

@router.post("", response_model=ProxyResponse)
async def proxy_endpoint(request: ProxyRequest, req: Request):
    """
    Relays a client request to a 3rd party public API to bypass browser CORS restrictions safely.
    Enforces per-client rate limiting, bounded concurrency, and SSRF filtering.
    """
    client_ip = req.client.host if req.client else "unknown"
    allowed, remaining, retry_after = proxy_rate_limiter.is_allowed(client_ip, max_requests=60, window_seconds=60.0)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Please retry after {retry_after}s.",
            headers={"Retry-After": str(int(retry_after))}
        )

    try:
        async with asyncio.timeout(15.0):
            async with proxy_semaphore:
                return await catalog_service.execute_proxy(request)
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Proxy request timed out waiting for capacity.")
