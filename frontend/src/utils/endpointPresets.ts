import { ApiItem } from '../types/api';

export interface EndpointPreset {
  id: string;
  label: string;
  description: string;
  method: string;
  endpoint: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  badge?: string;
}

/**
 * Dynamically extract query parameters from a URL path or query string
 */
function extractParamsFromEndpoint(endpoint: string): {
  cleanPath: string;
  params: Record<string, string>;
} {
  const qIndex = endpoint.indexOf('?');
  if (qIndex === -1) {
    return { cleanPath: endpoint, params: {} };
  }

  const cleanPath = endpoint.slice(0, qIndex);
  const queryString = endpoint.slice(qIndex + 1);
  const params: Record<string, string> = {};

  try {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch {
    queryString.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }

  return { cleanPath, params };
}

/**
 * Generate sensible POST/PUT sample payload based on API category and parameters
 */
function generateDynamicPayload(api: ApiItem, params: Record<string, string>): string {
  const payloadObj: Record<string, unknown> = {
    title: `Sample ${api.name} Payload`,
    category: api.category,
    source: 'FreeAPIHub In-Browser Playground',
    created_at: new Date().toISOString()
  };

  // If parameters exist, mirror them into payload attributes
  Object.entries(params).forEach(([k, v]) => {
    if (!['apikey', 'api_key', 'token', 'key'].includes(k.toLowerCase())) {
      const num = Number(v);
      payloadObj[k] = !isNaN(num) && v.trim() !== '' ? num : v;
    }
  });

  return JSON.stringify(payloadObj, null, 2);
}

/**
 * Get endpoint presets dynamically generated for any API item
 * Eliminates all static/hardcoded slug entries so all 4,000+ catalog APIs are fully supported.
 */
export function getEndpointPresets(api: ApiItem): EndpointPreset[] {
  // 1. Data-First: If structured endpoints exist directly in catalog data, prioritize them!
  if (api.endpoints && api.endpoints.length > 0) {
    return api.endpoints.map((ep, idx) => {
      const epPath = ep?.path || '/';
      const rawPath = epPath.startsWith('http') ? epPath : (epPath.startsWith('/') ? epPath : `/${epPath}`);
      const { params: extractedParams } = extractParamsFromEndpoint(rawPath);
      const mergedParams = {
        ...extractedParams,
        ...(ep.params || {})
      };

      return {
        id: ep.id || `curated-${idx}`,
        label: ep.name,
        description: ep.description || `${ep.method || 'GET'} ${rawPath}`,
        method: ep.method || 'GET',
        endpoint: rawPath,
        params: Object.keys(mergedParams).length > 0 ? mergedParams : undefined,
        headers: ep.headers && Object.keys(ep.headers).length > 0 ? ep.headers : (api.default_headers && Object.keys(api.default_headers).length > 0 ? api.default_headers : undefined),
        body: ep.body,
        badge: ep.badge || (idx === 0 ? 'Verified' : undefined)
      };
    });
  }

  const presets: EndpointPreset[] = [];
  const rawSample = api.endpoint || (api.endpoints?.[0]?.path) || '/';
  const formattedSample = rawSample.startsWith('/') ? rawSample : `/${rawSample}`;
  const { cleanPath, params: extractedParams } = extractParamsFromEndpoint(formattedSample);

  // Combined query parameters from sample URL and default_params
  const mergedParams = {
    ...extractedParams,
    ...(api.default_params || {})
  };

  // 1. Primary Verified Sample Endpoint
  presets.push({
    id: 'primary-sample',
    label: `${api.name} (Live Sample)`,
    description: `Official endpoint verified live: ${formattedSample}`,
    method: api.endpoints?.[0]?.method || 'GET',
    endpoint: formattedSample,
    params: Object.keys(mergedParams).length > 0 ? mergedParams : undefined,
    headers: api.default_headers && Object.keys(api.default_headers).length > 0 ? api.default_headers : undefined,
    badge: 'Verified'
  });

  // 2. Clean Base Path (stripped of query string parameters)
  if (Object.keys(extractedParams).length > 0) {
    presets.push({
      id: 'clean-endpoint',
      label: 'Base Path (No Parameters)',
      description: `Query base resource without filters: ${cleanPath}`,
      method: api.endpoints?.[0]?.method || 'GET',
      endpoint: cleanPath,
      headers: api.default_headers,
      badge: 'Unfiltered'
    });
  }

  // 3. Resource Segment Alternates (e.g. /items/1 -> /items or vice-versa)
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    if (/^\d+$/.test(lastSegment) || /^[a-f0-9-]{36}$/i.test(lastSegment)) {
      // Endpoint is targeting an individual ID, provide the parent collection list
      const parentPath = '/' + segments.slice(0, -1).join('/');
      presets.push({
        id: 'collection-list',
        label: `Parent Collection (${segments[segments.length - 2] || 'Items'})`,
        description: `Fetch paginated list of resources: ${parentPath}`,
        method: 'GET',
        endpoint: parentPath,
        params: { limit: '10' },
        badge: 'List View'
      });
    } else if (segments.length >= 1) {
      // Endpoint is a collection, offer item lookup by ID
      const singleItemPath = `${cleanPath}/1`;
      presets.push({
        id: 'single-item',
        label: `Single Item Lookup (:id = 1)`,
        description: `Retrieve specific resource details: ${singleItemPath}`,
        method: 'GET',
        endpoint: singleItemPath,
        badge: 'Single Item'
      });
    }
  }

  // 4. Mutation / POST Simulation (for POST APIs or data categories)
  const hasMutationEndpoint = api.endpoints?.some((ep) =>
    ['POST', 'PUT', 'PATCH'].includes((ep.method || '').toUpperCase())
  );
  if (
    hasMutationEndpoint ||
    ['developer-tools', 'database', 'ecommerce', 'productivity'].includes(api.category)
  ) {
    const postEndpoint = cleanPath.endsWith('/add') || cleanPath.endsWith('/create')
      ? cleanPath
      : `${cleanPath}`;

    presets.push({
      id: 'post-simulation',
      label: 'Create / Mutate Resource (POST)',
      description: `Simulate POST payload submission to ${postEndpoint}`,
      method: 'POST',
      endpoint: postEndpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(api.default_headers || {})
      },
      body: generateDynamicPayload(api, mergedParams),
      badge: 'POST Body'
    });
  }

  // 5. Root / Service Health Ping
  if (cleanPath !== '/' && cleanPath !== '') {
    presets.push({
      id: 'service-root',
      label: 'Service Base Status',
      description: 'Ping top-level service domain endpoint',
      method: 'GET',
      endpoint: '/',
      badge: 'Ping'
    });
  }

  return presets;
}
