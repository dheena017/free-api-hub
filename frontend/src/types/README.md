# Data Contracts & TypeScript Definitions: `frontend/src/types`

This directory defines all TypeScript interfaces and types, enforcing strict end-to-end type safety between frontend UI state and backend Pydantic models.

---

## 📐 Core Contracts (`api.ts`)

### `ApiItem`
Represents an individual public API entry in the catalog:
```typescript
export type AuthType = 'none' | 'api_key' | 'oauth';
export type PricingTier = 'open' | 'free_forever' | 'freemium_no_cc';
export type HealthStatus = 'healthy' | 'degraded' | 'offline';

export interface HealthInfo {
  status: HealthStatus;
  uptime_percent: number;
  avg_latency_ms: number;
  last_checked: string;
  last_status_code: number;
}

export interface ApiItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  base_url: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  auth_type: AuthType;
  pricing_tier: PricingTier;
  cors_supported: boolean;
  https: boolean;
  documentation_url: string;
  tags: string[];
  health: HealthInfo;
  default_params?: Record<string, string>;
  default_headers?: Record<string, string>;
}
```

### `ProxyRequest` & `ProxyResponse`
```typescript
export interface ProxyRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
}

export interface ProxyResponse {
  status_code: number;
  latency_ms: number;
  headers: Record<string, string>;
  data: unknown;
  error?: string;
}
```

### `CatalogStats`
```typescript
export interface CatalogStats {
  total_apis: number;
  healthy_count: number;
  avg_latency_ms: number;
  global_uptime_percent: number;
  total_checks_today: number;
}
```

### `SubmissionPayload`
```typescript
export interface SubmissionPayload {
  name: string;
  category: string;
  base_url: string;
  endpoint: string;
  documentation_url: string;
  auth_type: AuthType;
  pricing_tier: PricingTier;
  description: string;
}
```
