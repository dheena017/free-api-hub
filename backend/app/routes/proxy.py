from fastapi import APIRouter
from app.models import ProxyRequest, ProxyResponse
from app.services import catalog_service

router = APIRouter(prefix="/proxy", tags=["proxy"])

@router.post("", response_model=ProxyResponse)
async def proxy_endpoint(request: ProxyRequest):
    """
    Relays a client request to a 3rd party public API to bypass browser CORS restrictions safely.
    """
    return await catalog_service.execute_proxy(request)
