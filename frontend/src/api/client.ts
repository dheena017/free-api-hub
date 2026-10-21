import {
  ApiListResponse,
  ApiItem,
  CategorySummary,
  CatalogStats,
  ProxyRequest,
  ProxyResponse,
  ValidationRequest,
  ValidationResult,
  SubmissionPayload,
  HealthCheckResult,
  BatchHealthCheckResponse,
  StatusDashboardResponse,
  HealthHistoryResponse
} from '../types/api';
import { logger } from '../utils/logger';

// Prefer relative '/api/v1' by default so that both Vite's dev proxy and production Nginx reverse proxy work seamlessly
const ENV_BASE = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = ENV_BASE !== undefined ? ENV_BASE : '';
const API_PREFIX = BASE_URL ? `${BASE_URL.replace(/\/+$/, '')}/api/v1` : '/api/v1';

async function handleResponseError(res: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  try {
    const text = await res.text();
    if (text) {
      try {
        const errorJson = JSON.parse(text);
        if (errorJson?.detail) {
          const detailStr = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
          message = `[HTTP ${res.status}] ${detailStr}`;
        } else if (errorJson?.message) {
          const msgStr = typeof errorJson.message === 'string' ? errorJson.message : JSON.stringify(errorJson.message);
          message = `[HTTP ${res.status}] ${msgStr}`;
        } else {
          message = `[HTTP ${res.status} ${res.statusText || 'Error'}] ${fallbackMessage}`;
        }
      } catch {
        // Plain text error response
        message = `[HTTP ${res.status}] ${text.slice(0, 200)}`;
      }
    } else {
      message = `[HTTP ${res.status} ${res.statusText || 'Error'}] ${fallbackMessage}`;
    }
  } catch {
    message = `[HTTP ${res.status} ${res.statusText || 'Error'}] ${fallbackMessage}`;
  }
  throw new Error(message);
}

async function loggedFetch<T>(url: string, init?: RequestInit, fallbackErr?: string): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  const startTime = performance.now();
  let parsedBody: any;
  if (init?.body && typeof init.body === 'string') {
    try {
      parsedBody = JSON.parse(init.body);
    } catch {
      parsedBody = init.body;
    }
  }

  logger.apiReq(method, url, parsedBody);

  try {
    const res = await fetch(url, init);
    const duration = performance.now() - startTime;
    if (!res.ok) {
      logger.apiErr(method, url, `HTTP ${res.status} ${res.statusText}`, duration);
      return await handleResponseError(res, fallbackErr || `Request failed to ${url}`);
    }

    // Safely handle empty (204 No Content, 0-byte body) or non-JSON responses
    const text = await res.text();
    let data: any = null;
    if (text && text.trim().length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    logger.apiRes(method, url, res.status, duration, data);
    return data as T;
  } catch (err: unknown) {
    const duration = performance.now() - startTime;
    logger.apiErr(method, url, err, duration);
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error(`Connection Error: Cannot reach backend API at ${url}. Ensure the server is running.`);
    }
    throw err;
  }
}

export interface ApiQueryParams {
  q?: string;
  category?: string;
  auth_type?: string;
  pricing_tier?: string;
  collection?: string;
  status?: string;
  slugs?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export function normalizeApiItem(api: ApiItem): ApiItem {
  if (!api) return api;
  const endpoint = api.endpoint || (api.endpoints?.[0]?.path) || '/';
  const base_url = api.base_url || '';
  return {
    ...api,
    base_url,
    endpoint,
  };
}

export async function fetchApis(params?: ApiQueryParams): Promise<ApiListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.category && params.category !== 'all') query.set('category', params.category);
  if (params?.auth_type && params.auth_type !== 'all') query.set('auth_type', params.auth_type);
  if (params?.pricing_tier && params.pricing_tier !== 'all') query.set('pricing_tier', params.pricing_tier);
  if (params?.collection) query.set('collection', params.collection);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.slugs) query.set('slugs', params.slugs);
  if (params?.sort) query.set('sort', params.sort);
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());

  const res = await loggedFetch<ApiListResponse>(`${API_PREFIX}/apis?${query.toString()}`, undefined, 'Failed to fetch APIs from server');
  if (res && Array.isArray(res.items)) {
    res.items = res.items.map(normalizeApiItem);
  }
  return res;
}

export async function fetchApiBySlug(slug: string): Promise<ApiItem> {
  const res = await loggedFetch<ApiItem>(`${API_PREFIX}/apis/${encodeURIComponent(slug)}`, undefined, `API '${slug}' not found in catalog`);
  return normalizeApiItem(res);
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  return loggedFetch<CategorySummary[]>(`${API_PREFIX}/apis/categories`, undefined, 'Failed to load category taxonomy');
}

export async function fetchStats(): Promise<CatalogStats> {
  return loggedFetch<CatalogStats>(`${API_PREFIX}/apis/stats`, undefined, 'Failed to load platform statistics');
}

export async function executeProxy(payload: ProxyRequest): Promise<ProxyResponse> {
  return loggedFetch<ProxyResponse>(`${API_PREFIX}/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }, 'Proxy relay request failed');
}

export async function validateEndpoint(payload: ValidationRequest): Promise<ValidationResult> {
  return loggedFetch<ValidationResult>(`${API_PREFIX}/submit/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }, 'Live endpoint validation service request failed');
}

export async function submitApi(payload: SubmissionPayload): Promise<{ success: boolean; message: string; submission_id?: string; duplicate?: boolean }> {
  return loggedFetch<{ success: boolean; message: string; submission_id?: string; duplicate?: boolean }>(`${API_PREFIX}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }, 'API submission request was rejected by the server');
}

export async function checkApiHealth(slug: string): Promise<HealthCheckResult> {
  return loggedFetch<HealthCheckResult>(`${API_PREFIX}/health/check/${encodeURIComponent(slug)}`, {
    method: 'POST'
  }, `Real-time health probe failed for '${slug}'`);
}

export async function fetchHealthHistory(slug: string, limit: number = 40): Promise<HealthHistoryResponse> {
  return loggedFetch<HealthHistoryResponse>(
    `${API_PREFIX}/health/history/${encodeURIComponent(slug)}?limit=${limit}`,
    undefined,
    `Failed to fetch health telemetry history for '${slug}'`
  );
}

export async function checkBatchHealth(params?: { slugs?: string[]; limit?: number }): Promise<BatchHealthCheckResponse> {
  const query = params?.limit ? `?limit=${params.limit}` : '';
  return loggedFetch<BatchHealthCheckResponse>(`${API_PREFIX}/health/check-batch${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params?.slugs ? { slugs: params.slugs } : {})
  }, 'Batch health probe request failed');
}

export async function fetchStatusDashboard(params?: { limit?: number; offset?: number }): Promise<StatusDashboardResponse> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());
  return loggedFetch<StatusDashboardResponse>(`${API_PREFIX}/status-dashboard?${query.toString()}`, undefined, 'Failed to load status dashboard metrics');
}

export async function reportApiIssue(
  slug: string,
  payload: { issue_type: string; details: string; contact_email?: string }
): Promise<{ success: boolean; message: string; report?: any }> {
  return loggedFetch<{ success: boolean; message: string; report?: any }>(
    `${API_PREFIX}/apis/${encodeURIComponent(slug)}/report`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    'Failed to submit broken API report'
  );
}

export async function fetchSubmissionStatus(submissionId: string): Promise<any> {
  return loggedFetch<any>(
    `${API_PREFIX}/submit/status/${encodeURIComponent(submissionId)}`,
    undefined,
    `Submission '${submissionId}' not found`
  );
}

export async function fetchSubmissionsList(limit: number = 20): Promise<{ total: number; submissions: any[] }> {
  return loggedFetch<{ total: number; submissions: any[] }>(
    `${API_PREFIX}/submit/list?limit=${limit}`,
    undefined,
    'Failed to fetch community submissions list'
  );
}
