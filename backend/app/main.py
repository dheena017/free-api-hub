import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.logger import logger
from app.routes import apis, proxy, health, submissions

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="The ultimate verified free-first API search engine and playground backend.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev flexibility with Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
                logger.http_request(
                    method=request.method,
                    path=f"{request.url.path}{query_str}",
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
            logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc=exc)
        except Exception:
            pass
        raise exc

@app.on_event("startup")
async def startup_event():
    logger.success(f"FastAPI Server ready! Listening on port {settings.PORT}")
    logger.info(f"API endpoints mounted at: {settings.API_V1_STR} | Docs: http://localhost:{settings.PORT}/docs")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI server shut down successfully.")

# Register routers under prefix
app.include_router(apis.router, prefix=settings.API_V1_STR)
app.include_router(proxy.router, prefix=settings.API_V1_STR)
app.include_router(submissions.router, prefix=settings.API_V1_STR)
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(health.router)  # Also mount root /health

@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "apis_endpoint": f"{settings.API_V1_STR}/apis"
    }


if __name__ == "__main__":
    import uvicorn
    import subprocess
    import os
    import sys

    # Free port if running directly via Python to prevent address collision
    try:
        if sys.platform == "win32":
            out = subprocess.check_output("netstat -ano -p tcp", shell=True, text=True)
            for line in out.splitlines():
                if f":{settings.PORT} " in line and "LISTENING" in line:
                    parts = line.strip().split()
                    pid = int(parts[-1])
                    if pid != os.getpid() and pid != 0:
                        subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            subprocess.run(f"fuser -k {settings.PORT}/tcp", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)


