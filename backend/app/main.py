import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.logger import logger
from app.routes import apis, proxy, health, submissions
from app.security import SSRFSecurityError, sanitize_url_for_logging
from app.services import catalog_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.success(f"FastAPI Server ready! Listening on port {settings.PORT}")
    logger.info(f"API endpoints mounted at: {settings.API_V1_STR} | Docs: http://localhost:{settings.PORT}/docs")
    yield
    logger.info("FastAPI server shut down successfully.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="The ultimate verified free-first API search engine and playground backend.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware setup with configured allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)


# Exception handler for SSRF Security errors
@app.exception_handler(SSRFSecurityError)
async def ssrf_security_exception_handler(request: Request, exc: SSRFSecurityError):
    return JSONResponse(
        status_code=403,
        content={"detail": f"Outbound request to the destination address or port is blocked by security policy."}
    )


# Global exception handler to prevent leaking internal traces to untrusted clients
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error on {request.method} {request.url.path}: {exc}", exc=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."}
    )


# High-contrast HTTP Request / Response Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.perf_counter()
    client_ip = request.client.host if request.client else ""
    try:
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        query_str = f"?{request.url.query}" if request.url.query else ""
        if not (request.url.path.endswith("/logs") or "/health/logs" in request.url.path):
            try:
                clean_path = sanitize_url_for_logging(f"{request.url.path}{query_str}")
                logger.http_request(
                    method=request.method,
                    path=clean_path,
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                    client_ip=client_ip
                )
            except Exception:
                pass
        return response
    except Exception as exc:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        try:
            clean_path = sanitize_url_for_logging(request.url.path)
            logger.error(f"Unhandled error on {request.method} {clean_path}: {exc}", exc=exc)
        except Exception:
            pass
        raise exc


# Register routers under prefix
app.include_router(apis.router, prefix=settings.API_V1_STR)
app.include_router(proxy.router, prefix=settings.API_V1_STR)
app.include_router(submissions.router, prefix=settings.API_V1_STR)
app.include_router(health.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "apis_endpoint": f"{settings.API_V1_STR}/apis"
    }


# Convenience root health endpoints
@app.get("/health")
async def root_health():
    stats = catalog_service.get_stats()
    return {
        "status": "ok",
        "service": "Free API Hub Backend",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_apis": stats.total_apis,
        "healthy_apis": stats.healthy_count,
        "global_uptime_percent": stats.global_uptime_percent,
        "live_probes_performed": catalog_service.get_probe_count()
    }


@app.get("/health/logs")
async def root_health_logs(limit: int = 50):
    entries = logger.get_logs(limit=limit)
    return {"total": len(entries), "limit": limit, "logs": entries}


@app.get("/status-dashboard")
async def root_status_dashboard(limit: int = 100, offset: int = 0):
    return catalog_service.get_status_dashboard(limit=limit, offset=offset)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
