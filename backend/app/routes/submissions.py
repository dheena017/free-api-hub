from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any
from app.models import ValidationRequest, ValidationResult, SubmissionPayload
from app.services import catalog_service
from app.security import submission_rate_limiter
import asyncio

router = APIRouter(prefix="/submit", tags=["submissions"])
validate_semaphore = asyncio.Semaphore(10)

@router.post("/validate", response_model=ValidationResult)
async def validate_submission(request: ValidationRequest, req: Request):
    """
    Validates a submitted API live to guarantee it responds with 200 OK before being submitted.
    Enforces SSRF checking and rate limits.
    """
    client_ip = req.client.host if req.client else "unknown"
    allowed, _, retry_after = submission_rate_limiter.is_allowed(client_ip, max_requests=30, window_seconds=60.0)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for endpoint validation. Please retry after {retry_after}s.",
            headers={"Retry-After": str(int(retry_after))}
        )

    async with validate_semaphore:
        return await catalog_service.validate_endpoint(request)


@router.post("", response_model=Dict[str, Any])
async def submit_api(payload: SubmissionPayload, req: Request):
    """
    Accepts a validated community API submission into the persistent review queue.
    Detects and rejects duplicates.
    """
    client_ip = req.client.host if req.client else "unknown"
    allowed, _, retry_after = submission_rate_limiter.is_allowed(client_ip, max_requests=20, window_seconds=60.0)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for submissions. Please retry after {retry_after}s.",
            headers={"Retry-After": str(int(retry_after))}
        )

    record = catalog_service.record_submission(payload)
    if record.get("duplicate"):
        return {
            "success": False,
            "message": record.get("reason", "Duplicate API submission detected."),
            "duplicate": True,
            "submission": record
        }

    return {
        "success": True,
        "message": "API submission received! It will be reviewed by automated health bots.",
        "duplicate": False,
        "submission": record
    }

@router.get("/status/{submission_id}")
async def get_submission_status_endpoint(submission_id: str):
    """
    Look up the moderation and verification status of a community submission.
    """
    sub = catalog_service.get_submission_status(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission '{submission_id}' was not found.")
    return sub

@router.get("/list")
async def list_submissions_endpoint(limit: int = 50):
    """
    Returns recent community submissions in the review queue.
    """
    return {
        "total": len(catalog_service.list_submissions(limit=limit)),
        "submissions": catalog_service.list_submissions(limit=limit)
    }

@router.post("/report")
async def report_broken_api_endpoint(payload: Dict[str, Any], req: Request):
    """
    Report an issue with an API (e.g. broken sample, offline, paywall added).
    Protected against spamming and client abuse.
    """
    from app.security import report_rate_limiter
    from app.models import ReportPayload

    client_ip = req.client.host if req.client else "unknown"
    allowed, _, retry_after = report_rate_limiter.is_allowed(client_ip, max_requests=10, window_seconds=60.0)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for reports. Please wait {retry_after}s.",
            headers={"Retry-After": str(int(retry_after))}
        )

    try:
        report_data = ReportPayload(**payload)
        record = catalog_service.record_report(report_data, client_ip=client_ip)
        return {
            "success": True,
            "message": "Thank you for reporting! Our automated verification system and maintainers will inspect this API.",
            "report": record
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record report: {str(e)}")
