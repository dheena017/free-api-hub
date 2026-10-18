import { ApiItem } from '../types/api';
import { getEndpointPresets } from './endpointPresets';

export interface PathParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: string;
}

export interface QueryParameter {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  example?: string;
  description: string;
}

export interface RequestHeader {
  name: string;
  value: string;
  required: boolean;
  description: string;
}

export interface ApiEndpointDoc {
  id: string;
  path: string;
  fullUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  summary: string;
  description: string;
  pathParams: PathParameter[];
  queryParams: QueryParameter[];
  headers: RequestHeader[];
  requestBody?: {
    contentType: string;
    schemaDescription: string;
    samplePayload: string;
  };
  successResponse?: {
    statusCode: number;
    description: string;
    samplePayload: unknown;
  };
}

export interface AuthDocumentation {
  type: 'none' | 'api_key' | 'bearer' | 'oauth';
  title: string;
  headerKey?: string;
  headerFormat?: string;
  queryParamKey?: string;
  description: string;
  instructions: string[];
  securityBestPractices: string[];
  docUrl?: string;
}

export interface FullApiDocumentation {
  api: ApiItem;
  endpoints: ApiEndpointDoc[];
  auth: AuthDocumentation;
}

/**
 * Build rich, structured documentation for any given API based on catalog data and presets
 */
export function getFullApiDocumentation(api: ApiItem): FullApiDocumentation {
  const presets = getEndpointPresets(api);
  const baseUrlClean = api.base_url.replace(/\/+$/, '');

  // Endpoints list
  const endpoints: ApiEndpointDoc[] = presets.map((preset, index) => {
    const rawPath = preset.endpoint.startsWith('/') ? preset.endpoint : `/${preset.endpoint}`;
    const cleanPath = rawPath.split('?')[0];

    // Detect path parameters like /products/1 or /pokemon/ditto or /products/{id}
    const pathSegments = cleanPath.split('/').filter(Boolean);
    const pathParams: PathParameter[] = [];

    pathSegments.forEach((segment) => {
      if (/^\d+$/.test(segment)) {
        pathParams.push({
          name: 'id',
          type: 'number',
          required: true,
          description: `Unique numeric identifier for target record`,
          example: segment
        });
      } else if (segment.startsWith('{') && segment.endsWith('}')) {
        const paramName = segment.slice(1, -1);
        pathParams.push({
          name: paramName,
          type: 'string',
          required: true,
          description: `Path variable for ${paramName}`,
          example: 'sample_value'
        });
      } else if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        pathParams.push({
          name: paramName,
          type: 'string',
          required: true,
          description: `Dynamic path variable for ${paramName}`,
          example: 'sample_value'
        });
      } else if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
      ) {
        pathParams.push({
          name: 'uuid',
          type: 'string',
          required: true,
          description: 'Unique UUID resource identifier',
          example: segment
        });
      }
    });

    // Query parameters
    const queryParams: QueryParameter[] = [];
    if (preset.params) {
      Object.entries(preset.params).forEach(([k, v]) => {
        queryParams.push({
          name: k,
          type: Number.isFinite(Number(v)) && v !== '' ? 'number' : v === 'true' || v === 'false' ? 'boolean' : 'string',
          required: false,
          defaultValue: v,
          example: v,
          description: `Filter or query parameter: ${k}`
        });
      });
    } else if (api.default_params && index === 0) {
      Object.entries(api.default_params).forEach(([k, v]) => {
        queryParams.push({
          name: k,
          type: Number.isFinite(Number(v)) && v !== '' ? 'number' : 'string',
          required: false,
          defaultValue: v,
          example: v,
          description: `Query parameter: ${k}`
        });
      });
    }

    // Headers
    const headers: RequestHeader[] = [
      {
        name: 'Accept',
        value: 'application/json',
        required: true,
        description: 'Instructs server to serialize response as JSON'
      }
    ];

    if (preset.method === 'POST' || preset.method === 'PUT' || preset.method === 'PATCH') {
      headers.push({
        name: 'Content-Type',
        value: 'application/json',
        required: true,
        description: 'MIME type of the request payload body'
      });
    }

    if (api.auth_type === 'api_key') {
      headers.push({
        name: 'x-api-key',
        value: 'YOUR_API_KEY',
        required: true,
        description: 'Developer authentication API key'
      });
    } else if (api.auth_type === 'oauth') {
      headers.push({
        name: 'Authorization',
        value: 'Bearer YOUR_ACCESS_TOKEN',
        required: true,
        description: 'OAuth 2.0 Bearer access token'
      });
    }

    // Request body
    let requestBody: ApiEndpointDoc['requestBody'] = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(preset.method)) {
      requestBody = {
        contentType: 'application/json',
        schemaDescription: 'JSON object payload for entity creation/mutation',
        samplePayload:
          preset.body ||
          JSON.stringify(
            {
              title: `${api.name} Record`,
              category: api.category,
              description: `Sample payload for ${api.name}`,
              status: 'active'
            },
            null,
            2
          )
      };
    }

    return {
      id: preset.id,
      path: cleanPath,
      fullUrl: `${baseUrlClean}${cleanPath}`,
      method: (preset.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') || 'GET',
      summary: preset.label,
      description: preset.description,
      pathParams,
      queryParams,
      headers,
      requestBody,
      successResponse: {
        statusCode: 200,
        description: 'Standard JSON data response from endpoint',
        samplePayload: {
          status: 200,
          data: {
            endpoint: cleanPath,
            service: api.name,
            category: api.category,
            message: `${api.name} verified live response`
          }
        }
      }
    };
  });

  // Authentication documentation
  let auth: AuthDocumentation;
  if (api.auth_type === 'none') {
    auth = {
      type: 'none',
      title: 'Public Access (No Key Required)',
      description: 'This API is open and public. It requires zero API keys, client secrets, or account registration. Requests can be sent directly from frontend browsers or backend servers.',
      instructions: [
        'No signup, account registration, or credit card required.',
        'Send HTTP GET or POST requests directly to the endpoint URL.',
        'CORS is supported so requests can be executed straight from browser client apps without a proxy.'
      ],
      securityBestPractices: [
        'Cache responses in your frontend or local storage to minimize unnecessary network calls.',
        'Implement reasonable request throttling to respect upstream capacity.',
        'Use HTTPS to ensure encrypted transmission.'
      ],
      docUrl: api.documentation_url
    };
  } else if (api.auth_type === 'api_key') {
    auth = {
      type: 'api_key',
      title: 'Developer API Key Required',
      headerKey: 'x-api-key',
      headerFormat: 'x-api-key: YOUR_API_KEY',
      queryParamKey: 'api_key',
      description: 'Access requires an authorized API Key. You must pass your personal key with every HTTP request in the request header or query parameter.',
      instructions: [
        `Register for a free developer account on the official portal at ${api.documentation_url || api.base_url}.`,
        'Generate an API key in your developer dashboard.',
        'Attach the key to your requests via header: `x-api-key: YOUR_API_KEY` (or as a query parameter `?api_key=YOUR_API_KEY`).'
      ],
      securityBestPractices: [
        'Never expose your API key in client-side code or commit it to public GitHub repositories.',
        'Store your API key in an environment variable (e.g. `VITE_API_KEY` or `API_KEY` in `.env`).',
        'Route requests through a backend server if calling from a production browser app.'
      ],
      docUrl: api.documentation_url
    };
  } else {
    auth = {
      type: 'oauth',
      title: 'OAuth 2.0 / Bearer Token Authentication',
      headerKey: 'Authorization',
      headerFormat: 'Authorization: Bearer <ACCESS_TOKEN>',
      description: 'Access is protected by standard OAuth 2.0 authentication. Requests must include an active Bearer token in the Authorization header.',
      instructions: [
        `Register your application on the official developer platform at ${api.documentation_url || api.base_url}.`,
        'Obtain your Client ID and Client Secret.',
        'Exchange credentials for an access token using standard OAuth flows.',
        'Include the token in request headers: `Authorization: Bearer <YOUR_ACCESS_TOKEN>`.'
      ],
      securityBestPractices: [
        'Safeguard your Client Secret strictly on backend servers; never publish it in public code.',
        'Implement automatic token refresh before access tokens expire.',
        'Request only the minimum necessary authorization scopes for your use case.'
      ],
      docUrl: api.documentation_url
    };
  }

  return {
    api,
    endpoints,
    auth
  };
}
