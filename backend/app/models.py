from pydantic import BaseModel, Field, HttpUrl
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

class HealthInfo(BaseModel):
    status: HealthStatus = HealthStatus.HEALTHY
    uptime_percent: float = Field(default=99.9, ge=0.0, le=100.0)
    avg_latency_ms: int = Field(default=120, ge=0)
    last_checked: str = Field(default="2026-10-17T12:00:00Z")
    last_status_code: int = Field(default=200)
    message: Optional[str] = Field(default=None)

class HealthCheckResult(BaseModel):
    slug: str
    name: str
    target_url: str
    status: HealthStatus
    status_code: int
    latency_ms: int
    uptime_percent: float
    last_checked: str
    message: str
    is_live_tested: bool = True

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
    avg_latency_ms: int
    global_uptime_percent: float
    total_checks_today: int

class ProxyRequest(BaseModel):
    url: str
    method: str = "GET"
    headers: Optional[Dict[str, str]] = Field(default_factory=dict)
    params: Optional[Dict[str, str]] = Field(default_factory=dict)
    body: Optional[Any] = None

class ProxyResponse(BaseModel):
    status_code: int
    latency_ms: int
    headers: Dict[str, str] = Field(default_factory=dict)
    data: Any
    error: Optional[str] = None

class ValidationRequest(BaseModel):
    base_url: str
    sample_endpoint: str
    method: str = "GET"

class ValidationResult(BaseModel):
    is_valid: bool
    status_code: int
    latency_ms: int
    message: str
    sample_data: Optional[Any] = None

class SubmissionPayload(BaseModel):
    name: str
    category: str
    base_url: str
    sample_endpoint: str
    documentation_url: str
    auth_type: AuthType = AuthType.NONE
    pricing_tier: PricingTier = PricingTier.OPEN
    description: str
    short_description: Optional[str] = None
    detailed_description: Optional[str] = None
