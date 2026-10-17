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
  BatchHealthCheckResponse
} from '../types/api';
import { logger } from '../utils/logger';

// Prefer relative '/api/v1' in development to utilize Vite's dev proxy seamlessly without CORS
const ENV_BASE = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = ENV_BASE !== undefined ? ENV_BASE : '';
const API_PREFIX = BASE_URL ? `${BASE_URL}/api/v1` : '/api/v1';

async function handleResponseError(res: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  try {
    const errorJson = await res.json();
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
    // response was not JSON, fallback to HTTP status info
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
      return handleResponseError(res, fallbackErr || `Request failed to ${url}`);
    }
    const data = await res.json();
    logger.apiRes(method, url, res.status, duration, data);
    return data as T;
  } catch (err: unknown) {
    const duration = performance.now() - startTime;
    logger.apiErr(method, url, err, duration);
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error(`Connection Refused: Cannot reach backend API at ${url}. Ensure the Python FastAPI service is active on ${BASE_URL}.`);
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
  sort?: string;
  limit?: number;
  offset?: number;
}

export async function fetchApis(params?: ApiQueryParams): Promise<ApiListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.category && params.category !== 'all') query.set('category', params.category);
  if (params?.auth_type && params.auth_type !== 'all') query.set('auth_type', params.auth_type);
  if (params?.pricing_tier && params.pricing_tier !== 'all') query.set('pricing_tier', params.pricing_tier);
  if (params?.collection) query.set('collection', params.collection);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.sort) query.set('sort', params.sort);
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());

  return loggedFetch<ApiListResponse>(`${API_PREFIX}/apis?${query.toString()}`, undefined, 'Failed to fetch APIs from server');
}

export async function fetchApiBySlug(slug: string): Promise<ApiItem> {
  return loggedFetch<ApiItem>(`${API_PREFIX}/apis/${encodeURIComponent(slug)}`, undefined, `API '${slug}' not found in catalog`);
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

export async function submitApi(payload: SubmissionPayload): Promise<{ success: boolean; message: string }> {
  return loggedFetch<{ success: boolean; message: string }>(`${API_PREFIX}/submit`, {
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

export async function fetchStatusDashboard(params?: { limit?: number; offset?: number }): Promise<{
  stats: CatalogStats;
  total: number;
  endpoints: ApiItem[];
}> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());
  return loggedFetch<{
    stats: CatalogStats;
    total: number;
    endpoints: ApiItem[];
  }>(`${API_PREFIX}/status-dashboard?${query.toString()}`, undefined, 'Failed to load status dashboard metrics');
}

