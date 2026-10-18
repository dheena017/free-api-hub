from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import List, Optional, Dict, Any
from enum import Enum

class AuthType(str, Enum):
    NONE = "none"
    API_KEY = "api_key"
    OAUTH = "oauth"

class PricingTier(str, Enum):
    OPEN = "open"
    FREE_FOREVER = "free_forever"
    FREEMIUM_NO_CC = "freemium_no_cc"

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    UNTESTED = "untested"

class HealthInfo(BaseModel):
    status: HealthStatus = HealthStatus.UNTESTED
    uptime_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    avg_latency_ms: Optional[int] = Field(default=None, ge=0)
    last_checked: Optional[str] = Field(default=None)
    last_status_code: Optional[int] = Field(default=None)
    message: Optional[str] = Field(default="Awaiting live verification probe")

class HealthCheckResult(BaseModel):
    slug: str
    name: str
    target_url: str
    status: HealthStatus
    status_code: int
    latency_ms: int
    uptime_percent: Optional[float] = None
    last_checked: str
    message: str
    is_live_tested: bool = True

    def __getitem__(self, item: str) -> Any:
        return getattr(self, item)


class EndpointItem(BaseModel):
    id: Optional[str] = None
    name: str
    path: str
    method: str = "GET"
    description: Optional[str] = None
    params: Optional[Dict[str, str]] = Field(default_factory=dict)
    headers: Optional[Dict[str, str]] = Field(default_factory=dict)
    body: Optional[str] = None
    badge: Optional[str] = None


class ApiItem(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    short_description: Optional[str] = Field(default=None)
    detailed_description: Optional[str] = Field(default=None)
    category: str
    base_url: str
    sample_endpoint: str
    method: str = "GET"
    auth_type: AuthType = AuthType.NONE
    pricing_tier: PricingTier = PricingTier.OPEN
    cors_supported: bool = True
    https: bool = True
    documentation_url: str
    tags: List[str] = Field(default_factory=list)
    health: HealthInfo = Field(default_factory=HealthInfo)
    default_params: Optional[Dict[str, str]] = Field(default_factory=dict)
    default_headers: Optional[Dict[str, str]] = Field(default_factory=dict)
    endpoints: Optional[List[EndpointItem]] = Field(default_factory=list)
    use_cases: Optional[List[str]] = Field(default_factory=list)
    features: Optional[List[str]] = Field(default_factory=list)
    rate_limit: Optional[str] = Field(default=None)
    sample_response: Optional[Any] = Field(default=None)


class ApiListResponse(BaseModel):
    total: int
    items: List[ApiItem]
    limit: int
    offset: int

class CategorySummary(BaseModel):
    name: str
    slug: str
    count: int
    icon: Optional[str] = None
    description: Optional[str] = None

class CatalogStats(BaseModel):
    total_apis: int
    healthy_count: int
    degraded_count: int = 0
    offline_count: int = 0
    untested_count: int = 0
    avg_latency_ms: int
    global_uptime_percent: float
    total_checks_today: int

class EndpointStatusItem(BaseModel):
    id: str
    name: str
    slug: str
    category: str
    base_url: str
    sample_endpoint: str
    status: HealthStatus
    uptime_percent: Optional[float] = None
    avg_latency_ms: Optional[int] = None
    last_checked: Optional[str] = None
    last_status_code: Optional[int] = None
    message: Optional[str] = None

class StatusDashboardResponse(BaseModel):
    stats: CatalogStats
    total: int
    endpoints: List[EndpointStatusItem]

class BatchHealthCheckResponse(BaseModel):
    total_probed: int
    probes_executed: Optional[int] = None
    healthy_count: int
    degraded_count: int
    offline_count: int
    stats: CatalogStats
    results: List[HealthCheckResult]

    def __getitem__(self, item: str) -> Any:
        return getattr(self, item)


class ProxyRequest(BaseModel):
    url: str = Field(..., max_length=2048, description="Target URL starting with http:// or https://")
    method: str = Field(default="GET", description="HTTP method")
    headers: Optional[Dict[str, str]] = Field(default_factory=dict)
    params: Optional[Dict[str, str]] = Field(default_factory=dict)
    body: Optional[Any] = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Target URL cannot be empty.")
        if any(c in v for c in ("\r", "\n")):
            raise ValueError("Target URL contains illegal CRLF characters.")
        lower = v.lower()
        if not (lower.startswith("http://") or lower.startswith("https://")):
            raise ValueError("Target URL must start with 'http://' or 'https://'.")
        return v

    @field_validator("method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        m = v.strip().upper()
        allowed = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
        if m not in allowed:
            raise ValueError(f"HTTP method '{v}' is not supported. Must be one of: {', '.join(sorted(allowed))}")
        return m

class ProxyResponse(BaseModel):
    status_code: int
    latency_ms: int
    headers: Dict[str, str] = Field(default_factory=dict)
    data: Any
    error: Optional[str] = None

class ValidationRequest(BaseModel):
    base_url: str = Field(..., max_length=2048)
    sample_endpoint: str = Field(default="/", max_length=1024)
    method: str = Field(default="GET")

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Base URL cannot be empty.")
        if any(c in v for c in ("\r", "\n")):
            raise ValueError("Base URL contains illegal CRLF characters.")
        lower = v.lower()
        if not (lower.startswith("http://") or lower.startswith("https://")):
            raise ValueError("Base URL must start with 'http://' or 'https://'.")
        return v

    @field_validator("method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        m = v.strip().upper()
        if m not in {"GET", "POST", "HEAD", "OPTIONS"}:
            raise ValueError(f"Method '{v}' not supported for validation probe.")
        return m

class ValidationResult(BaseModel):
    is_valid: bool
    status_code: int
    latency_ms: int
    message: str
    sample_data: Optional[Any] = None

class SubmissionPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: str = Field(..., min_length=2, max_length=50)
    base_url: str = Field(..., max_length=2048)
    sample_endpoint: str = Field(default="/", max_length=1024)
    documentation_url: str = Field(..., max_length=2048)
    auth_type: AuthType = AuthType.NONE
    pricing_tier: PricingTier = PricingTier.OPEN
    description: str = Field(..., min_length=10, max_length=2000)
    short_description: Optional[str] = Field(default=None, max_length=300)
    detailed_description: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("base_url", "documentation_url")
    @classmethod
    def validate_urls(cls, v: str) -> str:
        v = v.strip()
        if not (v.lower().startswith("http://") or v.lower().startswith("https://")):
            raise ValueError("URL must start with 'http://' or 'https://'.")
        if any(c in v for c in ("\r", "\n")):
            raise ValueError("URL contains illegal CRLF characters.")
        return v

class SubmissionStatusResponse(BaseModel):
    id: str
    name: str
    category: str
    base_url: str
    status: str
    submitted_at: str
    review_notes: Optional[str] = None

class ReportPayload(BaseModel):
    api_slug: str
    issue_type: str = Field(description="Issue category: offline, outdated_docs, broken_sample, payment_wall, other")
    details: str = Field(min_length=5, max_length=2000, description="Description of the issue encountered")
    contact_email: Optional[str] = None

class ReportResponse(BaseModel):
    success: bool
    report_id: str
    message: str
    created_at: str
