from fastapi import APIRouter
from typing import Dict, Any
from app.models import ValidationRequest, ValidationResult, SubmissionPayload
from app.services import catalog_service

router = APIRouter(prefix="/submit", tags=["submissions"])

@router.post("/validate", response_model=ValidationResult)
async def validate_submission(request: ValidationRequest):
    """
    Validates a submitted API live to guarantee it responds with 200 OK before being submitted.
    """
    return await catalog_service.validate_endpoint(request)

@router.post("", response_model=Dict[str, Any])
async def submit_api(payload: SubmissionPayload):
    """
    Accepts a validated community API submission into the review queue.
    """
    record = catalog_service.record_submission(payload)
    return {
        "success": True,
        "message": "API submission received! It will be reviewed by automated health bots.",
        "submission": record
    }
