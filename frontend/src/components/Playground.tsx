import React, { useState, useMemo } from 'react';
import { ApiItem, ProxyResponse } from '../types/api';
import { executeProxy } from '../api/client';
import {
  SUPPORTED_LANGUAGES,
  SnippetLanguage,
  generateSnippetForLanguage,
  buildFullUrl,
  formatLatencyBadge
} from '../utils/codeSnippets';
import { extractMediaItems } from '../utils/mediaExtractor';
import { MediaPreviewViewer } from './MediaPreviewViewer';
import {
  Play,
  Copy,
  Check,
  Code2,
  Clock,
  Database,
  Terminal,
  Layers,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Info,
  Download,
  Plus,
  Trash2,
  Image as ImageIcon,
  Search,
  Table as TableIcon,
  FileText,
  AlignLeft,
  Sparkles,
  RefreshCw,
  Braces,
  ShieldAlert
} from 'lucide-react';
import { logger } from '../utils/logger';
import { CustomSelect, SelectOption } from './CustomSelect';

function getErrorDiagnostics(statusCode: number, errorMessage?: string | null) {
  if (statusCode === 400) {
    return {
      title: 'Bad Request (HTTP 400)',
      badge: 'Invalid Parameters',
      badgeColor: 'bg-[#FDD663]/10 text-[#FDD663] border-[#FDD663]/30',
      description: 'The remote server rejected the request syntax, required query parameters, or formatting.',
      tips: [
        'Check query parameters for missing required arguments (e.g. ?id=, ?q=, or ?latitude=).',
        'Verify that parameter values are properly formatted numbers, dates, or URL-encoded strings.',
        'If a payload body was sent, ensure it adheres to valid JSON syntax without trailing commas.'
      ]
    };
  }
  if (statusCode === 401) {
    return {
      title: 'Authentication Required (HTTP 401)',
      badge: 'Auth Required',
      badgeColor: 'bg-[#FDD663]/10 text-[#FDD663] border-[#FDD663]/30',
      description: 'The target API requires authentication credentials or an API Key before serving requests.',
      tips: [
        'Check the official documentation to obtain your free developer API key or bearer token.',
        'Add the required key into query parameters (e.g. ?key=YOUR_KEY) or headers in your request.',
        'If this API is listed as "No Key Required", its public demo endpoint may have been updated.'
      ]
    };
  }
  if (statusCode === 403) {
    return {
      title: 'Access Forbidden (HTTP 403)',
      badge: 'Access Denied',
      badgeColor: 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/30',
      description: 'The target server received the request but refused to authorize it. This often occurs when quota is exceeded, Cloudflare bot protection intervenes, or domain restrictions apply.',
      tips: [
        'The endpoint may require higher permissions, client registration, or User-Agent whitelisting.',
        'Check if an API key or custom header is required in the documentation.',
        'The remote host may block server-side proxies or automated scanners.'
      ]
    };
  }
  if (statusCode === 404) {
    return {
      title: 'Endpoint Not Found (HTTP 404)',
      badge: 'Path Not Found',
      badgeColor: 'bg-[#FDD663]/10 text-[#FDD663] border-[#FDD663]/30',
      description: 'The URL path does not exist on the target API server.',
      tips: [
        'Check for typos in the endpoint path in the URL bar above.',
        'Ensure path variables (e.g. {id} or :city) have been replaced with real sample values.',
        'Consult the API documentation to verify the exact base URL and version prefix (e.g. /v1 vs /v2).'
      ]
    };
  }
  if (statusCode === 405) {
    return {
      title: 'Method Not Allowed (HTTP 405)',
      badge: 'Method Unsupported',
      badgeColor: 'bg-[#8AB4F8]/10 text-[#8AB4F8] border-[#8AB4F8]/30',
      description: 'The endpoint exists, but does not support the selected HTTP method.',
      tips: [
        'Check if this endpoint requires GET instead of POST, or vice versa.',
        'Review the API documentation to verify supported CRUD verbs for this specific path.',
        'Switch the HTTP Method dropdown selector at the top-left of the Playground.'
      ]
    };
  }
  if (statusCode === 408) {
    return {
      title: 'Request Timeout (HTTP 408)',
      badge: 'Timeout',
      badgeColor: 'bg-[#FDD663]/10 text-[#FDD663] border-[#FDD663]/30',
      description: 'The target API server closed the connection before receiving the complete request.',
      tips: [
        'The remote server may be under heavy load or experiencing high latency.',
        'Try sending a simpler query or smaller parameter payload.',
        'Wait a few seconds and run the test again.'
      ]
    };
  }
  if (statusCode === 422) {
    return {
      title: 'Unprocessable Entity (HTTP 422)',
      badge: 'Validation Failed',
      badgeColor: 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/30',
      description: 'The request syntax is valid, but the target server was unable to process the contained instructions.',
      tips: [
        'Inspect query parameter values for semantic errors (e.g. non-numeric ID or invalid ISO date).',
        'Verify required schema constraints in the official API documentation.',
        'Check that coordinate or range parameters fall within allowable bounds.'
      ]
    };
  }
  if (statusCode === 429) {
    return {
      title: 'Rate Limit Exceeded (HTTP 429)',
      badge: 'Rate Limited',
      badgeColor: 'bg-[#FDD663]/10 text-[#FDD663] border-[#FDD663]/30',
      description: 'Too many requests were sent to this free API in a short duration.',
      tips: [
        'Wait 30-60 seconds before retrying the request in the playground.',
        'Consider registering for a personal free developer key to obtain dedicated quota limits.',
        'Implement exponential backoff and response caching in your application code.'
      ]
    };
  }
  if (statusCode === 502) {
    return {
      title: 'Bad Gateway (HTTP 502)',
      badge: 'Upstream Proxy Failure',
      badgeColor: 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/30',
      description: 'The remote gateway or reverse proxy received an invalid response from the upstream origin server.',
      tips: [
        'The third-party API service is experiencing internal network or DNS routing issues.',
        'Check third-party status monitors (e.g. status.io or incident boards).',
        'Retry after the upstream provider restores service.'
      ]
    };
  }
  if (statusCode === 503) {
    return {
      title: 'Service Unavailable (HTTP 503)',
      badge: 'Service Offline',
      badgeColor: 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/30',
      description: 'The remote API server is currently unable to handle the request due to maintenance or overload.',
      tips: [
        'The external provider may be in planned maintenance mode.',
        'The remote service capacity is temporarily exhausted.',
        'Wait 1-2 minutes and test the endpoint again.'
      ]
    };
  }
  if (statusCode === 504) {
    return {
      title: 'Gateway Timeout (HTTP 504)',
      badge: 'Upstream Timeout',
      badgeColor: 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/30',
      description: 'The target endpoint timed out (10s threshold). The server is taking too long to respond.',
      tips: [
        'The remote server is hanging or bogged down by slow database queries.',
        'Try querying with narrower filters or pagination limits.',
        'If the timeout persists, the service may be down.'
      ]
    };
  }
  if (statusCode >= 500 && statusCode < 600) {
    return {
      title: `Upstream Server Error (HTTP ${statusCode})`,
      badge: 'Server Failure',
      badgeColor: 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/30',
      description: 'The upstream API server encountered an unexpected internal exception.',
      tips: [
        'The external provider may currently be experiencing intermittent maintenance or downtime.',
        'Check the API status page or try again in a few minutes.',
        'Verify if the target server requires specific content-type or payload format.'
      ]
    };
  }
  if (statusCode <= 0 || (errorMessage && errorMessage.toLowerCase().includes('connection refused'))) {
    return {
      title: 'Backend Proxy Offline / Connection Refused',
      badge: 'Proxy Unreachable',
      badgeColor: 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/30',
      description: 'Could not connect to the Free API Hub backend proxy service.',
      tips: [
        'Ensure the Python FastAPI backend is running on http://localhost:8000.',
        'Check terminal logs for backend crashes or port binding conflicts.',
        'Verify that your local firewall is not blocking localhost HTTP traffic.'
      ]
    };
  }
  return {
    title: `Request Failed (Code: ${statusCode || 'Network Error'})`,
    badge: 'Request Error',
    badgeColor: 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/30',
    description: errorMessage || 'An unexpected error occurred while communicating with the remote server.',
    tips: [
      'Ensure the target server URL starts with http:// or https://.',
      'Check that your network connection is stable and the remote host is reachable.',
      'Review the official API documentation for required parameters.'
    ]
  };
}

const HTTP_METHOD_OPTIONS: SelectOption[] = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' }
];

interface PlaygroundProps {
  api: ApiItem;
}

export const Playground: React.FC<PlaygroundProps> = ({ api }) => {
  const initialUrl = api.base_url.replace(/\/+$/, '');
  const initialEndpoint = api.sample_endpoint.startsWith('/')
    ? api.sample_endpoint
    : `/${api.sample_endpoint}`;
  const fullInitialUrl = `${initialUrl}${initialEndpoint}`;

  const [method, setMethod] = useState(api.method || 'GET');
  const [endpointUrl, setEndpointUrl] = useState(fullInitialUrl);
  const [params, setParams] = useState<Array<{ key: string; value: string }>>(() => {
    if (api.default_params) {
      return Object.entries(api.default_params).map(([key, value]) => ({ key, value }));
    }
    return [];
  });

  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(() => {
    if (api.default_headers) {
      return Object.entries(api.default_headers).map(([key, value]) => ({ key, value }));
    }
    return [];
  });

  const [requestBody, setRequestBody] = useState<string>('');
  const [activeParamTab, setActiveParamTab] = useState<'params' | 'headers' | 'body'>('params');

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ProxyResponse | null>(null);

  // Response Inspector Tabs
  const [activeResponseTab, setActiveResponseTab] = useState<'json' | 'media' | 'headers' | 'table' | 'raw'>('json');
  const [jsonSearchQuery, setJsonSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Snippets
  const [activeSnippetLang, setActiveSnippetLang] = useState<SnippetLanguage>('curl');
  const [snippetCategory, setSnippetCategory] = useState<string>('All');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedError, setCopiedError] = useState(false);
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);

  // Convert param list to map
  const paramMap = useMemo(() => {
    return params.reduce((acc, p) => {
      if (p.key.trim()) acc[p.key.trim()] = p.value;
      return acc;
    }, {} as Record<string, string>);
  }, [params]);

  // Convert header list to map
  const headerMap = useMemo(() => {
    return headers.reduce((acc, h) => {
      if (h.key.trim()) acc[h.key.trim()] = h.value;
      return acc;
    }, {} as Record<string, string>);
  }, [headers]);

  // Extract media items whenever response data changes
  const mediaItems = useMemo(() => {
    if (!response?.data) return [];
    return extractMediaItems(response.data);
  }, [response?.data]);

  const handleRunTest = async () => {
    setUrlValidationError(null);

    const trimmedUrl = endpointUrl.trim();
    if (!trimmedUrl) {
      setUrlValidationError('Target request URL cannot be empty. Please enter a valid URL.');
      return;
    }
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setUrlValidationError('Malformed URL: Request target must begin with "https://" or "http://".');
      return;
    }

    setIsLoading(true);
    setResponse(null);

    const targetUrl = buildFullUrl(trimmedUrl, paramMap);

    // Prepare body
    let parsedBody: unknown = undefined;
    if (requestBody.trim() && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      try {
        parsedBody = JSON.parse(requestBody.trim());
      } catch {
        parsedBody = requestBody.trim();
      }
    }

    try {
      const result = await executeProxy({
        url: targetUrl,
        method: method,
        headers: {
          ...(api.default_headers || {}),
          ...headerMap
        },
        params: {},
        body: parsedBody
      });
      logger.playground(targetUrl, method, result.status_code, result.latency_ms);
      setResponse(result);

      // Auto-switch to Media Preview if media is detected in response
      const detected = extractMediaItems(result.data);
      if (detected.length > 0) {
        setActiveResponseTab('media');
      } else {
        setActiveResponseTab('json');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute request';
      setResponse({
        status_code: 500,
        latency_ms: 0,
        headers: {},
        data: null,
        error: errorMsg
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSampleEndpoint = (url: string, newMethod: string = 'GET') => {
    setEndpointUrl(url);
    setMethod(newMethod);
    setParams([]);
    setTimeout(() => {
      handleRunTest();
    }, 50);
  };

  const handleCopyErrorReport = () => {
    if (!response) return;
    const targetUrl = buildFullUrl(endpointUrl, paramMap);
    const diag = getErrorDiagnostics(response.status_code, response.error);
    const lines = [
      '========================================',
      ' FREE API HUB — DIAGNOSTIC ERROR REPORT',
      '========================================',
      `Target URL   : ${targetUrl}`,
      `HTTP Method  : ${method}`,
      `HTTP Status  : ${response.status_code || '0 (Network Error)'}`,
      `Latency      : ${response.latency_ms}ms`,
      `Diagnostic   : ${diag.title}`,
      `Message      : ${response.error || diag.description}`,
      '',
      'Troubleshooting Recommendations:',
      ...diag.tips.map((tip, idx) => `  ${idx + 1}. ${tip}`),
      ''
    ];
    if (response.data) {
      lines.push('Upstream Server Payload:');
      lines.push(typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data));
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedError(true);
    setTimeout(() => setCopiedError(false), 2000);
  };

  const getActiveSnippet = () => {
    const targetUrl = buildFullUrl(endpointUrl, paramMap);
    const mergedHeaders = { ...(api.default_headers || {}), ...headerMap };
    return generateSnippetForLanguage(
      activeSnippetLang,
      targetUrl,
      method,
      mergedHeaders,
      {},
      requestBody.trim() ? requestBody.trim() : undefined
    );
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getActiveSnippet());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyJson = () => {
    if (response?.data) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handleDownloadJson = () => {
    if (response?.data) {
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${api.slug || 'api'}-response.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getPayloadSize = (data: unknown) => {
    try {
      const bytes = new Blob([typeof data === 'string' ? data : JSON.stringify(data)]).size;
      return bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
    } catch {
      return '';
    }
  };

  const handleFormatRequestBody = () => {
    try {
      const parsed = JSON.parse(requestBody);
      setRequestBody(JSON.stringify(parsed, null, 2));
    } catch {
      // ignore
    }
  };

  // Filtered JSON text if searching
  const filteredJsonContent = useMemo(() => {
    if (!response?.data) return '';
    const formatted = JSON.stringify(response.data, null, 2);
    if (!jsonSearchQuery.trim()) return formatted;

    const query = jsonSearchQuery.toLowerCase();
    const lines = formatted.split('\n');
    const matched = lines.filter((line) => line.toLowerCase().includes(query));
    if (matched.length === 0) {
      return `// No matches found for "${jsonSearchQuery}" in response payload.\n\n${formatted}`;
    }
    return `// Showing lines matching "${jsonSearchQuery}" (${matched.length} matches):\n\n` + matched.join('\n');
  }, [response?.data, jsonSearchQuery]);

  // Flattened data for table view
  const flattenedTableData = useMemo(() => {
    if (!response?.data) return [];
    const res: Array<{ key: string; value: string; type: string }> = [];

    const recurse = (obj: unknown, prefix = '') => {
      if (obj === null || obj === undefined) {
        res.push({ key: prefix, value: 'null', type: 'null' });
      } else if (Array.isArray(obj)) {
        if (obj.length === 0) {
          res.push({ key: prefix, value: '[]', type: 'Array(0)' });
        } else {
          obj.slice(0, 20).forEach((item, idx) => {
            recurse(item, prefix ? `${prefix}[${idx}]` : `[${idx}]`);
          });
        }
      } else if (typeof obj === 'object') {
        const entries = Object.entries(obj as Record<string, unknown>);
        if (entries.length === 0) {
          res.push({ key: prefix, value: '{}', type: 'Object(0)' });
        } else {
          entries.slice(0, 30).forEach(([k, v]) => {
            recurse(v, prefix ? `${prefix}.${k}` : k);
          });
        }
      } else {
        res.push({ key: prefix, value: String(obj), type: typeof obj });
      }
    };

    recurse(response.data);
    return res.slice(0, 100);
  }, [response?.data]);

  // Language options filter
  const filteredLanguages = useMemo(() => {
    if (snippetCategory === 'All') return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter((l) => l.category === snippetCategory);
  }, [snippetCategory]);

  return (
    <div className="w-full space-y-4">
      {/* Top Request Bar */}
      <div className="bg-[#28292A] rounded-2xl p-4 border border-[#3C4043] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Method Selector Dropdown */}
          <div className="w-28 flex-shrink-0">
            <CustomSelect
              value={method}
              onChange={(val) => {
                setMethod(val);
                if (['POST', 'PUT', 'PATCH'].includes(val) && !requestBody) {
                  setRequestBody('{\n  "exampleKey": "value"\n}');
                  setActiveParamTab('body');
                }
              }}
              options={HTTP_METHOD_OPTIONS}
              size="md"
              variant="default"
            />
          </div>

          {/* URL Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#3C4043] rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 focus:border-[#8AB4F8] focus:outline-none transition-colors"
              placeholder="https://api.example.com/v1/..."
            />
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunTest}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#1F1F1F] font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Running...' : 'Run Test'}</span>
          </button>
        </div>

        {/* Real-time URL Validation Error Banner */}
        {urlValidationError && (
          <div className="p-3 bg-[#F28B82]/10 border border-[#F28B82]/30 rounded-xl flex items-center gap-2.5 text-xs text-[#F28B82]">
            <ShieldAlert className="h-4 w-4 text-[#F28B82] flex-shrink-0" />
            <span>{urlValidationError}</span>
          </div>
        )}

        {/* Parameter & Header Tabs Navigation */}
        <div className="pt-2 border-t border-[#3C4043] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-[#1F1F1F] p-1 rounded-xl border border-[#3C4043]">
              <button
                type="button"
                onClick={() => setActiveParamTab('params')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  activeParamTab === 'params'
                    ? 'bg-[#8AB4F8] text-[#1F1F1F] font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Query Params {params.length > 0 && `(${params.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveParamTab('headers')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  activeParamTab === 'headers'
                    ? 'bg-[#8AB4F8] text-[#1F1F1F] font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Headers {headers.length > 0 && `(${headers.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveParamTab('body')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  activeParamTab === 'body'
                    ? 'bg-[#8AB4F8] text-[#1F1F1F] font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Braces className="h-3 w-3" />
                <span>Body {requestBody.trim() ? '(JSON)' : ''}</span>
              </button>
            </div>

            {activeParamTab === 'params' && (
              <button
                type="button"
                onClick={() => setParams((prev) => [...prev, { key: '', value: '' }])}
                className="text-xs text-[#8AB4F8] hover:text-[#A8C7FA] flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add Query Param</span>
              </button>
            )}

            {activeParamTab === 'headers' && (
              <button
                type="button"
                onClick={() => setHeaders((prev) => [...prev, { key: '', value: '' }])}
                className="text-xs text-[#8AB4F8] hover:text-[#A8C7FA] flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add Header</span>
              </button>
            )}

            {activeParamTab === 'body' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFormatRequestBody}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] transition-colors"
                  title="Format JSON"
                >
                  <Sparkles className="h-3 w-3 text-[#8AB4F8]" />
                  <span>Format JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestBody('')}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Tab View: Params */}
          {activeParamTab === 'params' && (
            params.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {params.map((p, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-[#1F1F1F] px-2.5 py-1.5 rounded-lg border border-[#3C4043]">
                    <input
                      type="text"
                      placeholder="key"
                      value={p.key}
                      onChange={(e) => {
                        const updated = [...params];
                        updated[index].key = e.target.value;
                        setParams(updated);
                      }}
                      className="w-24 bg-transparent text-xs font-mono text-[#8AB4F8] outline-none placeholder:text-slate-600"
                    />
                    <span className="text-slate-500 font-mono">=</span>
                    <input
                      type="text"
                      placeholder="value"
                      value={p.value}
                      onChange={(e) => {
                        const updated = [...params];
                        updated[index].value = e.target.value;
                        setParams(updated);
                      }}
                      className="flex-1 bg-transparent text-xs font-mono text-slate-200 outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setParams((prev) => prev.filter((_, i) => i !== index))}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      title="Remove parameter"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] font-mono text-slate-500 py-1">
                No query parameters attached. Click "+ Add Query Param" to add custom filters or pagination.
              </div>
            )
          )}

          {/* Active Tab View: Headers */}
          {activeParamTab === 'headers' && (
            headers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {headers.map((h, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-[#1F1F1F] px-2.5 py-1.5 rounded-lg border border-[#3C4043]">
                    <input
                      type="text"
                      placeholder="Header-Name"
                      value={h.key}
                      onChange={(e) => {
                        const updated = [...headers];
                        updated[index].key = e.target.value;
                        setHeaders(updated);
                      }}
                      className="w-28 bg-transparent text-xs font-mono text-emerald-400 font-medium outline-none placeholder:text-slate-600"
                    />
                    <span className="text-slate-500 font-mono">:</span>
                    <input
                      type="text"
                      placeholder="Value"
                      value={h.value}
                      onChange={(e) => {
                        const updated = [...headers];
                        updated[index].value = e.target.value;
                        setHeaders(updated);
                      }}
                      className="flex-1 bg-transparent text-xs font-mono text-slate-200 outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setHeaders((prev) => prev.filter((_, i) => i !== index))}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      title="Remove header"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] font-mono text-slate-500 py-1">
                No custom headers specified. Standard headers are automatically set by the proxy relay.
              </div>
            )
          )}

          {/* Active Tab View: Body */}
          {activeParamTab === 'body' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Request Payload Body (Raw JSON for POST/PUT/PATCH):</span>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span>Templates:</span>
                  <button
                    type="button"
                    onClick={() => setRequestBody(JSON.stringify({ query: 'search', limit: 10 }, null, 2))}
                    className="hover:text-[#8AB4F8] underline"
                  >
                    Query
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setRequestBody(JSON.stringify({ name: 'Test Item', status: 'active' }, null, 2))}
                    className="hover:text-[#8AB4F8] underline"
                  >
                    Object
                  </button>
                </div>
              </div>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder={'{\n  "key": "value"\n}'}
                rows={4}
                className="w-full bg-[#1F1F1F] border border-[#3C4043] rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#8AB4F8]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Split Grid: Live Response Inspector & Code Snippets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Comprehensive Response Payload Inspector */}
        <div className="bg-[#28292A] rounded-2xl border border-[#3C4043] flex flex-col h-[560px] overflow-hidden">
          {/* Header Bar */}
          <div className="px-4 py-2.5 border-b border-[#3C4043] bg-[#28292A] flex flex-wrap items-center justify-between gap-2">
            {/* Left Title & Status */}
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#8AB4F8]" />
              <span className="text-xs font-bold text-slate-200">Response Payload</span>

              {/* Status Code badge */}
              {response && (
                <div className="flex items-center gap-1.5 ml-1">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      response.status_code >= 200 && response.status_code < 300
                        ? 'bg-[#81C995]/10 text-[#81C995] border-[#81C995]/30'
                        : response.status_code >= 400
                        ? 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/30'
                        : 'bg-[#FDD663]/10 text-[#FDD663] border-[#FDD663]/30'
                    }`}
                  >
                    {response.status_code} {response.status_code === 200 ? 'OK' : ''}
                  </span>

                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {response.latency_ms} ms
                  </span>

                  {Boolean(response?.data) && (
                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-[#1F1F1F] border border-[#3C4043]">
                      {getPayloadSize(response.data)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Header Right Actions */}
            {Boolean(response?.data) && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={`p-1.5 rounded text-xs transition-colors border border-[#3C4043] ${
                    isSearchOpen ? 'bg-[#8AB4F8]/20 text-[#8AB4F8]' : 'bg-[#1F1F1F] text-slate-400 hover:text-white'
                  }`}
                  title="Search in response"
                >
                  <Search className="h-3 w-3" />
                </button>

                <button
                  onClick={handleCopyJson}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] transition-colors"
                  title="Copy JSON"
                >
                  {copiedJson ? <Check className="h-3 w-3 text-[#81C995]" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedJson ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownloadJson}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] transition-colors"
                  title="Download JSON file"
                >
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </button>
              </div>
            )}
          </div>

          {/* Response View Selector Tabs (JSON, Media Preview, Headers, Table, Raw) */}
          <div className="px-3 py-1.5 bg-[#232425] border-b border-[#3C4043] flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveResponseTab('json')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activeResponseTab === 'json'
                    ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-[#303134]'
                }`}
              >
                <Code2 className="h-3 w-3" />
                <span>JSON</span>
              </button>

              <button
                onClick={() => setActiveResponseTab('media')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activeResponseTab === 'media'
                    ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-[#303134]'
                }`}
              >
                <ImageIcon className="h-3 w-3" />
                <span>Media Preview</span>
                {mediaItems.length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#8AB4F8] text-[#1F1F1F]">
                    {mediaItems.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveResponseTab('headers')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activeResponseTab === 'headers'
                    ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-[#303134]'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>Headers</span>
                {response?.headers && Object.keys(response.headers).length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300">
                    {Object.keys(response.headers).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveResponseTab('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activeResponseTab === 'table'
                    ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-[#303134]'
                }`}
              >
                <TableIcon className="h-3 w-3" />
                <span>Structure</span>
              </button>

              <button
                onClick={() => setActiveResponseTab('raw')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activeResponseTab === 'raw'
                    ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-[#303134]'
                }`}
              >
                <AlignLeft className="h-3 w-3" />
                <span>Raw</span>
              </button>
            </div>

            {/* Quick summary of response */}
            {response && (
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                {typeof response.data === 'object' && response.data !== null
                  ? Array.isArray(response.data)
                    ? `${response.data.length} array items`
                    : `${Object.keys(response.data).length} root keys`
                  : 'Scalar'}
              </span>
            )}
          </div>

          {/* Quick Search Bar (Collapsible) */}
          {isSearchOpen && (
            <div className="px-3 py-2 bg-[#1A1A1A] border-b border-[#3C4043] flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter response JSON by keyword or property name..."
                value={jsonSearchQuery}
                onChange={(e) => setJsonSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs font-mono text-slate-200 outline-none placeholder:text-slate-600"
                autoFocus
              />
              {jsonSearchQuery && (
                <button
                  onClick={() => setJsonSearchQuery('')}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Body Viewer Area */}
          <div className="flex-1 p-4 overflow-auto font-mono text-xs bg-[#1F1F1F]">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8AB4F8]" />
                <p>Sending proxy probe to target endpoint...</p>
              </div>
            ) : response?.error || (response?.status_code && response.status_code >= 400) ? (
              (() => {
                const diag = getErrorDiagnostics(response.status_code, response.error);
                return (
                  <div className="space-y-4 font-sans">
                    {/* Diagnostic Summary Card */}
                    <div className="p-4 rounded-xl bg-[#28292A] border border-[#F28B82]/30 text-[#F28B82] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3C4043] pb-3">
                        <div className="flex items-center gap-2 font-semibold text-[#F28B82] text-xs">
                          <AlertCircle className="h-4 w-4 text-[#F28B82] flex-shrink-0" />
                          <span>{diag.title}</span>
                        </div>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${diag.badgeColor}`}>
                          {diag.badge}
                        </span>
                      </div>

                      {/* Descriptive error */}
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        {response.error || diag.description}
                      </p>

                      {/* Actionable Troubleshooting Steps */}
                      <div className="bg-[#1F1F1F] p-3 rounded-lg border border-[#3C4043] space-y-2 font-sans">
                        <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                          <HelpCircle className="h-3.5 w-3.5 text-[#8AB4F8]" />
                          <span>Troubleshooting & Recommendations:</span>
                        </div>
                        <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside">
                          {diag.tips.map((tip, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Action Links & Tools */}
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleCopyErrorReport}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3C4043] text-slate-200 hover:text-white text-xs font-medium border border-[#3C4043] transition-colors"
                        >
                          {copiedError ? <Check className="h-3.5 w-3.5 text-[#81C995]" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                          <span>{copiedError ? 'Diagnostics Copied!' : 'Copy Error Report'}</span>
                        </button>

                        <button
                          onClick={handleRunTest}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3C4043] text-slate-200 hover:text-white text-xs font-medium border border-[#3C4043] transition-colors disabled:opacity-50"
                        >
                          <Play className="h-3 w-3 fill-current text-slate-400" />
                          <span>Retry Request</span>
                        </button>

                        {api.documentation_url && (
                          <a
                            href={api.documentation_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8AB4F8]/10 hover:bg-[#8AB4F8]/20 text-[#8AB4F8] hover:text-white text-xs font-medium border border-[#8AB4F8]/30 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>View API Documentation</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Upstream Server Payload */}
                    {Boolean(response.data) && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span className="font-mono flex items-center gap-1.5">
                            <Info className="h-3 w-3 text-slate-400" />
                            Upstream Server Payload ({typeof response.data === 'object' ? 'JSON' : 'Text'}):
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-[#141414] border border-[#3C4043] overflow-auto max-h-56">
                          <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed text-[11px] font-mono">
                            {typeof response.data === 'object'
                              ? JSON.stringify(response.data, null, 2)
                              : String(response.data)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : response ? (
              /* Success / Normal Response Views */
              activeResponseTab === 'json' ? (
                <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed selection:bg-[#8AB4F8] selection:text-[#1F1F1F]">
                  {filteredJsonContent}
                </pre>
              ) : activeResponseTab === 'media' ? (
                /* Media Preview Tab */
                <MediaPreviewViewer
                  mediaItems={mediaItems}
                  onLoadSampleEndpoint={handleLoadSampleEndpoint}
                />
              ) : activeResponseTab === 'headers' ? (
                /* Response Headers Tab */
                <div className="space-y-2">
                  <div className="text-[11px] font-sans text-slate-400 pb-1 border-b border-[#3C4043]">
                    HTTP Response Headers ({Object.keys(response.headers || {}).length}):
                  </div>
                  {response.headers && Object.keys(response.headers).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#3C4043] text-slate-500 text-[10px] uppercase">
                            <th className="py-1.5 pr-4 font-mono">Header</th>
                            <th className="py-1.5 font-mono">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3C4043]/50">
                          {Object.entries(response.headers).map(([key, value]) => (
                            <tr key={key} className="hover:bg-[#28292A]/50 group">
                              <td className="py-1.5 pr-4 text-[#8AB4F8] font-mono font-medium whitespace-nowrap align-top">
                                {key}
                              </td>
                              <td className="py-1.5 text-slate-300 font-mono break-all selection:bg-[#8AB4F8] selection:text-[#1F1F1F]">
                                {value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 font-sans text-xs">No explicit headers forwarded by target server.</p>
                  )}
                </div>
              ) : activeResponseTab === 'table' ? (
                /* Flattened Structure Inspector */
                <div className="space-y-2">
                  <div className="text-[11px] font-sans text-slate-400 pb-1 border-b border-[#3C4043]">
                    Flattened Property Hierarchy ({flattenedTableData.length} entries):
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-[#3C4043] text-slate-500 text-[10px] uppercase font-mono">
                          <th className="py-1.5 pr-3">Property Path</th>
                          <th className="py-1.5 pr-3">Type</th>
                          <th className="py-1.5">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3C4043]/40 font-mono">
                        {flattenedTableData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#28292A]/60">
                            <td className="py-1.5 pr-3 text-[#8AB4F8] font-semibold whitespace-nowrap">
                              {row.key || '(root)'}
                            </td>
                            <td className="py-1.5 pr-3 text-slate-500 text-[10px]">
                              {row.type}
                            </td>
                            <td className="py-1.5 text-slate-300 break-all">
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Raw text representation */
                <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                  {typeof response.data === 'string' ? response.data : JSON.stringify(response.data)}
                </pre>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-center px-4 font-sans">
                <Play className="h-8 w-8 text-slate-600 mb-1" />
                <p className="font-medium text-slate-300">No test executed yet</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Click <strong className="text-[#8AB4F8]">"Run Test"</strong> above to send a live request, inspect JSON payloads, headers, and media previews.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Multilingual Code Snippets */}
        <div className="bg-[#28292A] rounded-2xl border border-[#3C4043] flex flex-col h-[560px] overflow-hidden">
          {/* Header with Category Filter & Language Scroll Bar */}
          <div className="px-4 py-2 border-b border-[#3C4043] bg-[#28292A] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#8AB4F8]" />
                <span className="text-xs font-bold text-slate-200">Integration Client Code</span>
              </div>

              {/* Copy Code Button */}
              <button
                onClick={handleCopySnippet}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] transition-colors"
              >
                {copiedSnippet ? <Check className="h-3 w-3 text-[#81C995]" /> : <Copy className="h-3 w-3" />}
                <span>{copiedSnippet ? 'Copied Snippet' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Language Scroll Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setActiveSnippetLang(lang.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium whitespace-nowrap transition-colors ${
                    activeSnippetLang === lang.id
                      ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-[#303134]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Snippet Code Box */}
          <div className="flex-1 p-4 overflow-auto font-mono text-xs bg-[#1F1F1F] text-slate-200 relative group">
            <pre className="whitespace-pre-wrap leading-relaxed selection:bg-[#8AB4F8] selection:text-[#1F1F1F]">
              {getActiveSnippet()}
            </pre>
          </div>

          {/* Snippet Footer Info */}
          <div className="px-4 py-2 bg-[#232425] border-t border-[#3C4043] flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span className="font-mono text-[#8AB4F8]">
              {SUPPORTED_LANGUAGES.find((l) => l.id === activeSnippetLang)?.label} snippet
            </span>
            <span>Production ready • Timeout: 10s • Auto-serialized</span>
          </div>
        </div>
      </div>
    </div>
  );
};
