import { ApiItem } from '../types/api';
import { EndpointPreset, getEndpointPresets } from './endpointPresets';

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
  successResponse: {
    statusCode: number;
    description: string;
    samplePayload: unknown;
  };
}

export interface AuthDocumentation {
  type: 'none' | 'api_key' | 'bearer' | 'oauth' | 'basic';
  title: string;
  headerKey?: string;
  headerFormat?: string;
  queryParamKey?: string;
  description: string;
  instructions: string[];
  securityBestPractices: string[];
  docUrl?: string;
}

export interface ErrorCodeDoc {
  statusCode: number;
  statusText: string;
  severity: 'success' | 'client_error' | 'server_error' | 'rate_limit';
  description: string;
  sampleResponse: Record<string, unknown>;
  troubleshooting: string;
}

export interface SdkItem {
  language: string;
  name: string;
  packageManager: string;
  installCommand: string;
  link: string;
}

export interface RateLimitDocumentation {
  requestsPerMinute: string;
  requestsPerDay: string;
  concurrencyLimit: string;
  burstAllowance: string;
  headers: Array<{
    header: string;
    example: string;
    description: string;
  }>;
  guidelines: string[];
}

export interface FullApiDocumentation {
  api: ApiItem;
  endpoints: ApiEndpointDoc[];
  auth: AuthDocumentation;
  errorCodes: ErrorCodeDoc[];
  sdks: SdkItem[];
  rateLimits: RateLimitDocumentation;
}

/**
 * Standard HTTP Error matrix applicable to REST APIs
 */
export const STANDARD_ERROR_CODES: ErrorCodeDoc[] = [
  {
    statusCode: 200,
    statusText: 'OK',
    severity: 'success',
    description: 'The request was successful. The server returned the requested data.',
    sampleResponse: {
      status: 'success',
      data: { id: 1, message: 'Resource retrieved successfully' }
    },
    troubleshooting: 'No action needed. Inspect the response body for your payload.'
  },
  {
    statusCode: 201,
    statusText: 'Created',
    severity: 'success',
    description: 'Resource successfully created in response to a POST request.',
    sampleResponse: {
      status: 'created',
      id: 'res_99812',
      created_at: '2026-10-18T10:00:00Z'
    },
    troubleshooting: 'Check the returned ID or Location header for the new resource reference.'
  },
  {
    statusCode: 400,
    statusText: 'Bad Request',
    severity: 'client_error',
    description: 'The request syntax is invalid, missing required parameters, or has a malformed body.',
    sampleResponse: {
      error: 'Bad Request',
      message: 'Invalid parameter "limit": must be a positive integer between 1 and 100',
      code: 'INVALID_QUERY_PARAM'
    },
    troubleshooting: 'Verify all query parameters, JSON body syntax, and ensure values match required types.'
  },
  {
    statusCode: 401,
    statusText: 'Unauthorized',
    severity: 'client_error',
    description: 'Missing or invalid authentication token, API key, or credentials.',
    sampleResponse: {
      error: 'Unauthorized',
      message: 'Authentication credential was not provided or has expired',
      code: 'AUTH_REQUIRED'
    },
    troubleshooting: 'Attach your API key or Bearer token in the request header or query string as instructed.'
  },
  {
    statusCode: 403,
    statusText: 'Forbidden',
    severity: 'client_error',
    description: 'The authenticated user does not have permission to access the requested resource.',
    sampleResponse: {
      error: 'Forbidden',
      message: 'You do not have required permissions to access this tier or scope',
      code: 'INSUFFICIENT_SCOPE'
    },
    troubleshooting: 'Check your API account tier, IP allowlists, or required OAuth authorization scopes.'
  },
  {
    statusCode: 404,
    statusText: 'Not Found',
    severity: 'client_error',
    description: 'The requested resource, ID, or URI endpoint was not found on the upstream server.',
    sampleResponse: {
      error: 'Not Found',
      message: 'Resource with the specified identifier does not exist',
      code: 'RESOURCE_NOT_FOUND'
    },
    troubleshooting: 'Verify the endpoint URL, path parameters, and ensure the target ID exists in the database.'
  },
  {
    statusCode: 422,
    statusText: 'Unprocessable Entity',
    severity: 'client_error',
    description: 'The request was well-formed, but semantic validation errors occurred in the payload fields.',
    sampleResponse: {
      error: 'Unprocessable Entity',
      message: 'Validation failed for body fields',
      errors: [{ field: 'email', message: 'Must be a valid email format' }]
    },
    troubleshooting: 'Check your JSON payload structure against the schema documentation.'
  },
  {
    statusCode: 429,
    statusText: 'Too Many Requests',
    severity: 'rate_limit',
    description: 'Rate limit quota exceeded. Too many requests were sent in a given time period.',
    sampleResponse: {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded: 60 requests/minute limit reached. Retry in 45 seconds.',
      retry_after_seconds: 45
    },
    troubleshooting: 'Implement exponential backoff and jitter. Inspect the "Retry-After" or "X-RateLimit-Reset" header.'
  },
  {
    statusCode: 500,
    statusText: 'Internal Server Error',
    severity: 'server_error',
    description: 'The upstream server encountered an unexpected condition that prevented it from fulfilling the request.',
    sampleResponse: {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing your request on the upstream provider.',
      reference_id: 'err_4410928a'
    },
    troubleshooting: 'The upstream service is experiencing internal issues. Retry after a few minutes or report the issue.'
  },
  {
    statusCode: 503,
    statusText: 'Service Unavailable',
    severity: 'server_error',
    description: 'The upstream API server is temporarily unable to handle the request due to maintenance or overload.',
    sampleResponse: {
      error: 'Service Unavailable',
      message: 'Service is temporarily down for planned maintenance. Expected back online shortly.',
      code: 'SERVICE_MAINTENANCE'
    },
    troubleshooting: 'Check the API status telemetry badge or official status page for incident updates.'
  }
];

/**
 * Build rich 6-pillar documentation for any given API
 */
export function getFullApiDocumentation(api: ApiItem): FullApiDocumentation {
  const presets = getEndpointPresets(api);
  const baseUrlClean = api.base_url.replace(/\/+$/, '');

  // 1. ENDPOINTS & METHODS
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
          description: `Unique numeric identifier for the target ${api.category.replace('-', ' ')} record`,
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
      } else if (
        ['ditto', 'pikachu', 'smartphones', 'laptops', 'france', 'germany'].includes(segment.toLowerCase())
      ) {
        pathParams.push({
          name: 'identifier',
          type: 'string',
          required: true,
          description: `Resource name, slug, or category identifier`,
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
          description: `Filter or query constraint parameter: ${k}`
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
          description: `Configured query parameter: ${k}`
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
        description: 'MIME type of the sent request body payload'
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
        schemaDescription: 'JSON object containing attributes for entity creation/mutation',
        samplePayload:
          preset.body ||
          JSON.stringify(
            {
              title: 'Sample Item Title',
              description: 'Demonstration payload for free API testing',
              status: 'active',
              timestamp: new Date().toISOString()
            },
            null,
            2
          )
      };
    }

    // Success response sample
    const samplePayload: Record<string, unknown> = {
      status: 200,
      data: {
        id: pathParams.length > 0 ? (Number(pathParams[0].example) || pathParams[0].example) : 1,
        title: `${api.name} verified response item`,
        category: api.category,
        endpoint: cleanPath,
        verified_live: true,
        timestamp: new Date().toISOString()
      }
    };

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
        description: 'Standard JSON data response representing queried entities',
        samplePayload
      }
    };
  });

  // If only 1 preset, generate standard RESTful endpoints for completeness
  if (endpoints.length === 1) {
    const baseSample = api.sample_endpoint.split('?')[0];
    const cleanSample = baseSample.startsWith('/') ? baseSample : `/${baseSample}`;

    // Add a collection/list endpoint if current is single item, or single item if current is collection
    if (cleanSample.includes('/')) {
      const parts = cleanSample.split('/').filter(Boolean);
      const resource = parts[0] || 'items';

      endpoints.push({
        id: 'collection-list',
        path: `/${resource}`,
        fullUrl: `${baseUrlClean}/${resource}`,
        method: 'GET',
        summary: `List all ${resource}`,
        description: `Retrieve paginated collection of ${resource} records`,
        pathParams: [],
        queryParams: [
          { name: 'limit', type: 'number', required: false, defaultValue: '10', example: '10', description: 'Maximum items to return' },
          { name: 'page', type: 'number', required: false, defaultValue: '1', example: '1', description: 'Page number offset' }
        ],
        headers: [{ name: 'Accept', value: 'application/json', required: true, description: 'Accept header' }],
        successResponse: {
          statusCode: 200,
          description: `Array of ${resource} objects`,
          samplePayload: { total: 100, page: 1, limit: 10, items: [{ id: 1, name: 'Sample Item' }] }
        }
      });

      endpoints.push({
        id: 'create-record',
        path: `/${resource}`,
        fullUrl: `${baseUrlClean}/${resource}`,
        method: 'POST',
        summary: `Create new ${resource} record`,
        description: `Submit JSON payload to create or simulate creating a new ${resource} entry`,
        pathParams: [],
        queryParams: [],
        headers: [
          { name: 'Content-Type', value: 'application/json', required: true, description: 'Payload content type' },
          { name: 'Accept', value: 'application/json', required: true, description: 'Accept header' }
        ],
        requestBody: {
          contentType: 'application/json',
          schemaDescription: `JSON attributes required for new ${resource}`,
          samplePayload: JSON.stringify({ name: `New ${resource} sample`, category: api.category, active: true }, null, 2)
        },
        successResponse: {
          statusCode: 201,
          description: `Created ${resource} confirmation`,
          samplePayload: { id: 101, created: true, message: 'Resource successfully created' }
        }
      });
    }
  }

  // 2. AUTHENTICATION DETAILS
  let auth: AuthDocumentation;
  if (api.auth_type === 'none') {
    auth = {
      type: 'none',
      title: 'Public Access (No Authentication Required)',
      description: 'This API is 100% open and requires zero API keys, client tokens, or user registration. Anyone can send direct HTTP requests immediately.',
      instructions: [
        'No signup, account registration, or credit card required.',
        'Simply send HTTP GET or POST requests directly to the base URL.',
        'CORS is supported so requests can be executed directly from frontend client browsers or backend servers.'
      ],
      securityBestPractices: [
        'Even without an API key, respect the rate limit guidelines to avoid temporary IP throttling.',
        'Cache responses in your frontend or server to minimize unnecessary network roundtrips.',
        'Use HTTPS transport to ensure data integrity during transmission.'
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
        `Visit the official developer portal at ${api.documentation_url || api.base_url} to register for a free developer account.`,
        'Navigate to your Developer Dashboard or API Keys section to generate a new key.',
        'Include the key in your HTTP request header: `x-api-key: YOUR_API_KEY` (or as a query parameter `?api_key=YOUR_API_KEY`).'
      ],
      securityBestPractices: [
        'Never expose your API key in client-side frontend code or commit it to public GitHub repositories.',
        'Store your API key in an environment variable (e.g., `API_KEY` in a `.env` file).',
        'Route requests through a backend server or proxy if consuming from a browser web application.'
      ],
      docUrl: api.documentation_url
    };
  } else {
    auth = {
      type: 'oauth',
      title: 'OAuth 2.0 / Bearer Token Authentication',
      headerKey: 'Authorization',
      headerFormat: 'Authorization: Bearer <ACCESS_TOKEN>',
      description: 'Access is protected by standard OAuth 2.0 protocol. Requests must include an active Bearer access token in the Authorization header.',
      instructions: [
        `Register your client application on the official developer platform at ${api.documentation_url}.`,
        'Obtain your Client ID and Client Secret credentials.',
        'Implement the OAuth authorization code or client credentials flow to exchange for an access token.',
        'Attach the token to every request header: `Authorization: Bearer <YOUR_ACCESS_TOKEN>`.'
      ],
      securityBestPractices: [
        'Safeguard your Client Secret strictly on backend servers; never publish it in frontend web or mobile apps.',
        'Implement automatic token refresh using refresh tokens before access tokens expire.',
        'Request only the minimum necessary authorization scopes for your application use cases.'
      ],
      docUrl: api.documentation_url
    };
  }

  // 5. SDKs & LIBRARIES
  const nameSafe = api.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const sdks: SdkItem[] = [
    {
      language: 'JavaScript / Node.js',
      name: `${nameSafe}-client`,
      packageManager: 'npm',
      installCommand: `npm install axios`,
      link: api.documentation_url || 'https://www.npmjs.com'
    },
    {
      language: 'Python',
      name: `${nameSafe}-python`,
      packageManager: 'pip',
      installCommand: `pip install requests`,
      link: api.documentation_url || 'https://pypi.org'
    },
    {
      language: 'Go',
      name: `${nameSafe}-go`,
      packageManager: 'go get',
      installCommand: `go get github.com/go-resty/resty/v2`,
      link: api.documentation_url || 'https://pkg.go.dev'
    },
    {
      language: 'PHP',
      name: `${nameSafe}-php`,
      packageManager: 'composer',
      installCommand: `composer require guzzlehttp/guzzle`,
      link: api.documentation_url || 'https://packagist.org'
    }
  ];

  // 6. RATE LIMITS & GUIDELINES
  const rateLimits: RateLimitDocumentation = {
    requestsPerMinute: api.pricing_tier === 'open' ? '60 requests / minute' : '120 requests / minute',
    requestsPerDay: api.pricing_tier === 'open' ? '10,000 requests / day' : '50,000 requests / day',
    concurrencyLimit: '5 concurrent simultaneous connections',
    burstAllowance: '10 requests per second burst',
    headers: [
      {
        header: 'X-RateLimit-Limit',
        example: '60',
        description: 'The maximum number of permitted requests in the current rate limit window.'
      },
      {
        header: 'X-RateLimit-Remaining',
        example: '58',
        description: 'The number of remaining requests allowed in the current rate limit window.'
      },
      {
        header: 'X-RateLimit-Reset',
        example: '1729249200',
        description: 'Unix epoch timestamp indicating when the current rate limit window resets.'
      },
      {
        header: 'Retry-After',
        example: '30',
        description: 'Sent with HTTP 429 status code indicating the number of seconds to wait before retrying.'
      }
    ],
    guidelines: [
      'Implement client-side caching: Store response data in memory or session storage for queries that change infrequently.',
      'Handle HTTP 429 gracefully: Parse the "Retry-After" header and apply exponential backoff with random jitter.',
      'Batch queries where supported: Use paginated limit/offset parameters instead of querying records one by one.',
      'Use Gzip/Brotli compression: Ensure your client accepts compressed payloads using "Accept-Encoding: gzip, deflate, br".'
    ]
  };

  return {
    api,
    endpoints,
    auth,
    errorCodes: STANDARD_ERROR_CODES,
    sdks,
    rateLimits
  };
}
