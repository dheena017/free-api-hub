export type AuthType = 'none' | 'api_key' | 'oauth';
export type PricingTier = 'open' | 'free_forever' | 'freemium_no_cc';
export type HealthStatus = 'healthy' | 'degraded' | 'offline' | 'untested';

export interface HealthInfo {
  status: HealthStatus;
  uptime_percent?: number | null;
  avg_latency_ms?: number | null;
  last_checked?: string | null;
  last_status_code?: number | null;
  message?: string | null;
  observations_count?: number;
  freshness?: string;
}

export interface HealthObservation {
  timestamp: string;
  status: HealthStatus;
  status_code: number;
  latency_ms: number;
  message?: string | null;
}

export interface DailyUptimeRecord {
  date: string;
  uptime_percent: number;
  status: HealthStatus;
  total_probes: number;
  avg_latency_ms: number;
}

export interface NetworkWaterfall {
  dns_ms: number;
  tcp_ms: number;
  tls_ms?: number | null;
  ttfb_ms: number;
  download_ms: number;
}

export interface HealthHistoryResponse {
  slug: string;
  name: string;
  target_url: string;
  current_status: HealthStatus;
  uptime_percent: number;
  current_latency_ms: number;
  min_latency_ms: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  max_latency_ms: number;
  jitter_ms: number;
  total_probes: number;
  last_checked: string;
  network_waterfall: NetworkWaterfall;
  observations: HealthObservation[];
  daily_uptime: DailyUptimeRecord[];
}

export interface HealthCheckResult {
  slug: string;
  name: string;
  target_url: string;
  status: HealthStatus;
  status_code: number;
  latency_ms: number;
  uptime_percent?: number | null;
  last_checked: string;
  message: string;
  is_live_tested?: boolean;
  observations_count?: number;
  freshness?: string;
}

export interface BatchHealthCheckResponse {
  probes_executed?: number;
  total_probed: number;
  healthy_count: number;
  degraded_count: number;
  offline_count: number;
  stats: CatalogStats;
  results: HealthCheckResult[];
}

export interface EndpointStatusItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  base_url: string;
  endpoint: string;
  status: HealthStatus;
  uptime_percent?: number | null;
  avg_latency_ms?: number | null;
  last_checked?: string | null;
  last_status_code?: number | null;
  message?: string;
}

export interface StatusDashboardResponse {
  stats: CatalogStats;
  total: number;
  endpoints: EndpointStatusItem[];
}

export interface EndpointItem {
  id?: string;
  name: string;
  path: string;
  method?: string;
  description?: string;
  params?: Record<string, any>;
  headers?: Record<string, any>;
  body?: string;
  badge?: string;
}

export interface ApiItem {
  name: string;
  slug: string;
  description: string;
  detailed_description?: string;
  category: string;
  base_url: string;
  endpoint: string;
  auth_type: AuthType;
  auth_required?: boolean;
  pricing_tier: PricingTier;
  cors_supported: boolean;
  https: boolean;
  is_active?: boolean;
  documentation_url: string;
  tags: string[];
  health: HealthInfo;
  default_params?: Record<string, any>;
  default_headers?: Record<string, any>;
  endpoints?: EndpointItem[];
  use_cases?: string[];
  features?: string[];
  rate_limit?: string;
  sample_response?: unknown;
}

export interface ApiListResponse {
  total: number;
  items: ApiItem[];
  limit: number;
  offset: number;
}

export interface CategorySummary {
  name: string;
  slug: string;
  count: number;
  icon?: string;
  description?: string;
}

export interface CatalogStats {
  total_apis: number;
  healthy_count: number;
  degraded_count?: number;
  offline_count?: number;
  untested_count?: number;
  avg_latency_ms: number;
  global_uptime_percent: number;
  total_checks_today: number;
}

export interface ProxyRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
}

export interface ProxyResponse {
  status_code: number;
  latency_ms: number;
  headers: Record<string, string>;
  data: unknown;
  error?: string;
}

export interface ValidationRequest {
  base_url: string;
  endpoint: string;
  method?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  status_code: number;
  latency_ms: number;
  message: string;
  sample_data?: unknown;
}

export interface SubmissionPayload {
  name: string;
  category: string;
  base_url: string;
  endpoint: string;
  documentation_url: string;
  auth_type: AuthType;
  pricing_tier: PricingTier;
  description: string;
  detailed_description?: string;
}
