import React, { useState, useMemo, useEffect } from 'react';
import { ApiItem, ProxyResponse } from '../types/api';
import { executeProxy } from '../api/client';
import {
  SUPPORTED_LANGUAGES,
  SnippetLanguage,
  generateSnippetForLanguage,
  buildFullUrl
} from '../utils/codeSnippets';
import { extractMediaItems } from '../utils/mediaExtractor';
import { MediaPreviewViewer } from './MediaPreviewViewer';
import { HtmlPreviewViewer } from './HtmlPreviewViewer';
import { JsonTreeViewer } from './JsonTreeViewer';
import { CurlImportModal } from './CurlImportModal';
import { RequestHistoryView, HistoryItem } from './RequestHistoryBar';
import { getEndpointPresets, EndpointPreset } from '../utils/endpointPresets';
import { generateTypeScriptTypes, generateJsonSchema } from '../utils/typeGenerator';
import { ParsedCurl } from '../utils/curlParser';
import { CodeSnippetViewer } from './CodeSnippetViewer';
import {
  Play,
  Copy,
  Check,
  Code2,
  Clock,
  Database,
  Terminal,
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
  Braces,
  ShieldAlert,
  Maximize2,
  Columns,
  Rows,
  FileCode,
  Zap,
  ArrowRight,
  Globe,
  History,
  X,
  Lock,
  ChevronDown,
  SlidersHorizontal,
  KeyRound,
  Settings2,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  LayoutTemplate
} from 'lucide-react';
import { logger } from '../utils/logger';

function getErrorDiagnostics(statusCode: number, errorMessage?: string | null) {
  if (statusCode === 400) {
    return {
      title: 'Bad Request (HTTP 400)',
      badge: 'Invalid Parameters',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
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
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
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
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
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
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
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
      badgeColor: 'bg-accent/10 text-accent border-accent/30',
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
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
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
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
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
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      description: 'Too many requests were sent to this free API in a short duration.',
      tips: [
        'Wait 30-60 seconds before retrying the request in the playground.',
        'Consider registering for a personal free developer key to obtain dedicated quota limits.',
        'Implement exponential backoff and response caching in your application code.'
      ]
    };
  }
  if (statusCode >= 500 && statusCode < 600) {
    return {
      title: `Upstream Server Error (HTTP ${statusCode})`,
      badge: 'Server Failure',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      description: 'The upstream API server encountered an unexpected internal exception.',
      tips: [
        'The external provider may currently be experiencing intermittent maintenance or downtime.',
        'Check the API status page or try again in a few minutes.',
        'Verify if the target server requires specific content-type or payload format.'
      ]
    };
  }
  return {
    title: `Request Failed (Code: ${statusCode || 'Network Error'})`,
    badge: 'Request Error',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    description: errorMessage || 'An unexpected error occurred while communicating with the remote server.',
    tips: [
      'Ensure the target server URL starts with http:// or https://.',
      'Check that your network connection is stable and the remote host is reachable.',
      'Review the official API documentation for required parameters.'
    ]
  };
}

const METHOD_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  POST: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
  PUT: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  DELETE: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  PATCH: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' }
};

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

const POPULAR_LANG_LIST: Array<{ id: SnippetLanguage; label: string }> = [
  { id: 'curl', label: 'cURL' },
  { id: 'js', label: 'Fetch' },
  { id: 'axios', label: 'Axios' },
  { id: 'ts', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' }
];

function extractQueryParamsList(url: string): Array<{ key: string; value: string }> {
  try {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return [];
    const queryString = url.slice(qIndex + 1);
    const searchParams = new URLSearchParams(queryString);
    const list: Array<{ key: string; value: string }> = [];
    searchParams.forEach((value, key) => {
      list.push({ key, value });
    });
    return list;
  } catch {
    return [];
  }
}

function applyParamsToUrl(url: string, newParams: Array<{ key: string; value: string }>): string {
  try {
    const qIndex = url.indexOf('?');
    const basePath = qIndex !== -1 ? url.slice(0, qIndex) : url;
    const validParams = newParams.filter((p) => p.key.trim());
    if (validParams.length === 0) return basePath;
    const searchParams = new URLSearchParams();
    validParams.forEach((p) => {
      searchParams.set(p.key.trim(), p.value);
    });
    return `${basePath}?${searchParams.toString()}`;
  } catch {
    return url;
  }
}

interface PlaygroundProps {
  api: ApiItem;
  initialEndpoint?: string;
  initialMethod?: string;
  initialParams?: Record<string, string>;
  initialBody?: string;
  onOpenDocs?: () => void;
}

export const Playground: React.FC<PlaygroundProps> = ({
  api,
  initialEndpoint,
  initialMethod,
  initialParams,
  initialBody
}) => {
  const initialUrl = (api?.base_url || '').replace(/\/+$/, '');
  const rawSample = api?.endpoint || (api?.endpoints?.[0]?.path) || '';
  const initialEndpointStr = rawSample
    ? (rawSample.startsWith('/') ? rawSample : `/${rawSample}`)
    : '';
  const fullInitialUrl = `${initialUrl}${initialEndpointStr}`;

  // Presets State
  const presets = useMemo(() => getEndpointPresets(api), [api]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(() => {
    return presets.length > 0 ? presets[0].id : null;
  });

  // Request State
  const [method, setMethod] = useState(initialMethod || api?.endpoints?.[0]?.method || 'GET');
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const [endpointUrl, setEndpointUrl] = useState(() => {
    if (initialEndpoint) {
      return initialEndpoint.startsWith('http')
        ? initialEndpoint
        : `${initialUrl}${initialEndpoint.startsWith('/') ? initialEndpoint : `/${initialEndpoint}`}`;
    }
    return fullInitialUrl;
  });
  const [params, setParams] = useState<Array<{ key: string; value: string }>>(() => {
    if (initialParams) {
      return Object.entries(initialParams).map(([key, value]) => ({ key, value }));
    }
    if (api?.default_params && Object.keys(api.default_params).length > 0) {
      return Object.entries(api.default_params).map(([key, value]) => ({ key, value }));
    }
    const fromUrl = extractQueryParamsList(fullInitialUrl);
    if (fromUrl.length > 0) return fromUrl;
    if (presets[0]?.params) {
      return Object.entries(presets[0].params).map(([key, value]) => ({ key, value }));
    }
    return [];
  });
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(() => {
    if (api?.default_headers) {
      return Object.entries(api.default_headers).map(([key, value]) => ({ key, value }));
    }
    return [];
  });
  type RequestTab = 'params' | 'headers' | 'body' | 'response' | 'snippets' | 'auth' | 'settings';
  type RequestAuthMode = 'none' | 'apiKey' | 'bearer' | 'basic';
  type WorkbenchLayout = 'tabs' | 'split';

  const [workbenchLayout, setWorkbenchLayout] = useState<WorkbenchLayout>('tabs');
  const [requestBody, setRequestBody] = useState<string>(initialBody || '');
  const [activeParamTab, setActiveParamTab] = useState<RequestTab>(
    initialBody ? 'body' : 'params'
  );

  const handleSetWorkbenchLayout = (mode: WorkbenchLayout) => {
    setWorkbenchLayout(mode);
    if (mode === 'split' && (activeParamTab === 'response' || activeParamTab === 'snippets')) {
      setActiveParamTab('params');
    }
  };

  // Auth State
  const [authType, setAuthType] = useState<RequestAuthMode>(() => {
    if (api?.auth_type === 'api_key') return 'apiKey';
    if (api?.auth_type === 'oauth') return 'bearer';
    return 'none';
  });
  const [apiKeyName, setApiKeyName] = useState(() => {
    return api?.auth_type === 'api_key' ? 'X-API-Key' : 'api_key';
  });
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiKeyLocation, setApiKeyLocation] = useState<'header' | 'query'>('header');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Settings State
  const [requestTimeout, setRequestTimeout] = useState<number>(10000);
  const [followRedirects, setFollowRedirects] = useState<boolean>(true);
  const [bypassCache, setBypassCache] = useState<boolean>(false);

  // Synchronize params changes to URL
  const handleUpdateParams = (
    updater: (prev: Array<{ key: string; value: string }>) => Array<{ key: string; value: string }>
  ) => {
    setParams((prev) => {
      const updated = updater(prev);
      setEndpointUrl((curUrl) => applyParamsToUrl(curUrl, updated));
      return updated;
    });
  };

  // Synchronize URL change to params
  const handleEndpointUrlChange = (newUrl: string) => {
    setEndpointUrl(newUrl);
    if (urlValidationError) setUrlValidationError(null);
    const extracted = extractQueryParamsList(newUrl);
    setParams(extracted);
  };

  // Sync when initial props change
  useEffect(() => {
    if (initialEndpoint) {
      const base = (api?.base_url || '').replace(/\/+$/, '');
      const fullUrl = initialEndpoint.startsWith('http')
        ? initialEndpoint
        : `${base}${initialEndpoint.startsWith('/') ? initialEndpoint : `/${initialEndpoint}`}`;
      setEndpointUrl(fullUrl);
      if (!initialParams) {
        const fromUrl = extractQueryParamsList(fullUrl);
        if (fromUrl.length > 0) setParams(fromUrl);
      }
    }
    if (initialMethod) {
      setMethod(initialMethod);
    }
    if (initialParams) {
      setParams(Object.entries(initialParams).map(([key, value]) => ({ key, value })));
    }
    if (initialBody !== undefined) {
      setRequestBody(initialBody);
      if (initialBody) setActiveParamTab('body');
    }
  }, [initialEndpoint, initialMethod, initialParams, initialBody, api.base_url]);

  // Response State
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [viewLayout, setViewLayout] = useState<'split' | 'focus' | 'stacked'>('split');
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);

  // Response Inspector Tabs
  const [activeResponseTab, setActiveResponseTab] = useState<
    'json' | 'preview' | 'media' | 'headers' | 'table' | 'types' | 'raw' | 'history'
  >('json');
  const [jsonDisplayMode, setJsonDisplayMode] = useState<'tree' | 'raw'>('tree');
  const [typesDisplayMode, setTypesDisplayMode] = useState<'typescript' | 'schema'>('typescript');
  const [jsonSearchQuery, setJsonSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Snippets
  const [activeSnippetLang, setActiveSnippetLang] = useState<SnippetLanguage>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedTypes, setCopiedTypes] = useState(false);
  const [copiedError, setCopiedError] = useState(false);
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);

  // Request History State (Session)
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const stored = sessionStorage.getItem(`fah_history_${api?.slug || 'api'}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  // Sync history to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(`fah_history_${api?.slug || 'api'}`, JSON.stringify(history.slice(0, 10)));
    } catch {
      // ignore
    }
  }, [history, api?.slug]);

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

  // Merge Headers with Auth, Cache Control, and custom headers
  const effectiveHeaders = useMemo(() => {
    const result: Record<string, string> = { ...(api.default_headers || {}), ...headerMap };
    if (authType === 'bearer' && bearerToken.trim()) {
      result['Authorization'] = `Bearer ${bearerToken.trim()}`;
    } else if (authType === 'apiKey' && apiKeyLocation === 'header' && apiKeyValue.trim()) {
      result[apiKeyName.trim() || 'X-API-Key'] = apiKeyValue.trim();
    } else if (authType === 'basic' && (basicUsername.trim() || basicPassword.trim())) {
      try {
        result['Authorization'] = `Basic ${btoa(`${basicUsername.trim()}:${basicPassword.trim()}`)}`;
      } catch {
        // ignore
      }
    }
    if (bypassCache) {
      result['Cache-Control'] = 'no-cache';
      result['Pragma'] = 'no-cache';
    }
    return result;
  }, [api.default_headers, headerMap, authType, bearerToken, apiKeyLocation, apiKeyName, apiKeyValue, basicUsername, basicPassword, bypassCache]);

  // Merge Query Params with Auth
  const effectiveParams = useMemo(() => {
    const result: Record<string, string> = { ...paramMap };
    if (authType === 'apiKey' && apiKeyLocation === 'query' && apiKeyValue.trim()) {
      result[apiKeyName.trim() || 'api_key'] = apiKeyValue.trim();
    }
    return result;
  }, [paramMap, authType, apiKeyLocation, apiKeyName, apiKeyValue]);

  // Detect if the response payload is an HTML document
  const isHtmlResponse = useMemo(() => {
    if (!response?.data) return false;
    const contentType = response.headers
      ? Object.entries(response.headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1]?.toLowerCase()
      : '';
    if (contentType && (contentType.includes('text/html') || contentType.includes('application/xhtml+xml'))) {
      return true;
    }
    if (typeof response.data === 'string') {
      const trimmed = response.data.trim().toLowerCase();
      return (
        trimmed.startsWith('<!doctype html') ||
        trimmed.startsWith('<html') ||
        (trimmed.includes('<head') && trimmed.includes('<body')) ||
        (trimmed.includes('<title>') && trimmed.includes('</title>'))
      );
    }
    return false;
  }, [response]);

  // Extract media items whenever response data changes
  const mediaItems = useMemo(() => {
    if (!response?.data) return [];
    return extractMediaItems(response.data, endpointUrl);
  }, [response?.data, endpointUrl]);

  // Generated TypeScript / JSON Schema
  const generatedTypesCode = useMemo(() => {
    if (!response?.data) return '';
    const safeSlug = api?.slug || 'api';
    const rootName = `${safeSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Response`;
    if (typesDisplayMode === 'typescript') {
      return generateTypeScriptTypes(response.data, rootName);
    }
    return generateJsonSchema(response.data, rootName);
  }, [response?.data, api?.slug, typesDisplayMode]);

  const handleRunTest = async (overrideTargetUrl?: string, overrideMethod?: string, overrideBody?: string) => {
    setUrlValidationError(null);

    const baseToUse = overrideTargetUrl || endpointUrl;
    const methodToUse = overrideMethod || method;
    const bodyToUse = overrideBody !== undefined ? overrideBody : requestBody;

    const trimmedUrl = baseToUse.trim();
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
    if (workbenchLayout === 'tabs') {
      setActiveParamTab('response');
    }

    const targetUrl = buildFullUrl(trimmedUrl, effectiveParams);

    // Prepare body
    let parsedBody: unknown = undefined;
    if (bodyToUse.trim() && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(methodToUse.toUpperCase())) {
      try {
        parsedBody = JSON.parse(bodyToUse.trim());
      } catch {
        parsedBody = bodyToUse.trim();
      }
    }

    try {
      const result = await executeProxy({
        url: targetUrl,
        method: methodToUse,
        headers: effectiveHeaders,
        params: {},
        body: parsedBody
      });
      logger.playground(targetUrl, methodToUse, result.status_code, result.latency_ms);
      setResponse(result);

      // Auto-switch tab if HTML detected or media detected
      const isResultHtml = (() => {
        const ct = result.headers
          ? Object.entries(result.headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1]?.toLowerCase()
          : '';
        if (ct && (ct.includes('text/html') || ct.includes('application/xhtml+xml'))) {
          return true;
        }
        if (typeof result.data === 'string') {
          const trimmed = result.data.trim().toLowerCase();
          return (
            trimmed.startsWith('<!doctype html') ||
            trimmed.startsWith('<html') ||
            (trimmed.includes('<head') && trimmed.includes('<body')) ||
            (trimmed.includes('<title>') && trimmed.includes('</title>'))
          );
        }
        return false;
      })();

      const detected = extractMediaItems(result.data, targetUrl);
      if (isResultHtml && activeResponseTab !== 'headers' && activeResponseTab !== 'raw') {
        setActiveResponseTab('preview');
      } else if (detected.length > 0 && activeResponseTab !== 'types' && activeResponseTab !== 'headers') {
        setActiveResponseTab('media');
      }

      // Record in Session Request History
      const pathSuffix = targetUrl.replace(initialUrl, '') || targetUrl;
      const historyEntry: HistoryItem = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        method: methodToUse,
        url: targetUrl,
        endpointDisplay: pathSuffix.length > 32 ? `${pathSuffix.slice(0, 32)}…` : pathSuffix,
        statusCode: result.status_code,
        latencyMs: result.latency_ms,
        params,
        headers,
        body: bodyToUse,
        dataSnapshot: result.data
      };
      setHistory((prev) => [historyEntry, ...prev.slice(0, 9)]);
      setCurrentHistoryId(historyEntry.id);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute request';
      const failResult: ProxyResponse = {
        status_code: 500,
        latency_ms: 0,
        headers: {},
        data: null,
        error: errorMsg
      };
      setResponse(failResult);

      const pathSuffix = targetUrl.replace(initialUrl, '') || targetUrl;
      const failEntry: HistoryItem = {
        id: `req_${Date.now()}_err`,
        timestamp: Date.now(),
        method: methodToUse,
        url: targetUrl,
        endpointDisplay: pathSuffix.length > 32 ? `${pathSuffix.slice(0, 32)}…` : pathSuffix,
        statusCode: 500,
        latencyMs: 0,
        params,
        headers,
        body: bodyToUse
      };
      setHistory((prev) => [failEntry, ...prev.slice(0, 9)]);
      setCurrentHistoryId(failEntry.id);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to execute test
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunTest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [endpointUrl, method, params, headers, requestBody]);

  const handleSelectPreset = (preset: EndpointPreset) => {
    setSelectedPresetId(preset.id);
    const presetEp = preset.endpoint || '';
    const newUrl = presetEp.startsWith('http')
      ? presetEp
      : `${initialUrl}${presetEp.startsWith('/') ? '' : '/'}${presetEp}`;

    const newParams = preset.params
      ? Object.entries(preset.params).map(([k, v]) => ({ key: k, value: v }))
      : [];
    const newHeaders = preset.headers
      ? Object.entries(preset.headers).map(([k, v]) => ({ key: k, value: v }))
      : [];
    const newBody = preset.body || '';

    setEndpointUrl(newUrl);
    setMethod(preset.method);
    setParams(newParams);
    setHeaders(newHeaders);
    setRequestBody(newBody);

    if (newBody) {
      setActiveParamTab('body');
    } else if (newParams.length > 0) {
      setActiveParamTab('params');
    }

    setTimeout(() => {
      handleRunTest(newUrl, preset.method, newBody);
    }, 40);
  };

  const handleImportCurl = (parsed: ParsedCurl) => {
    setEndpointUrl(parsed.url);
    setMethod(parsed.method);
    setHeaders(parsed.headers);
    setParams(parsed.params);
    if (parsed.body) {
      setRequestBody(parsed.body);
      setActiveParamTab('body');
    } else if (parsed.params.length > 0) {
      setActiveParamTab('params');
    } else if (parsed.headers.length > 0) {
      setActiveParamTab('headers');
    }
    setTimeout(() => {
      handleRunTest(parsed.url, parsed.method, parsed.body || '');
    }, 50);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setCurrentHistoryId(item.id);
    setEndpointUrl(item.url);
    setMethod(item.method);
    setParams(item.params || []);
    setHeaders(item.headers || []);
    setRequestBody(item.body || '');
    if (item.dataSnapshot !== undefined) {
      setResponse({
        status_code: item.statusCode,
        latency_ms: item.latencyMs,
        headers: {},
        data: item.dataSnapshot
      });
    }
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
    const targetUrl = buildFullUrl(endpointUrl, effectiveParams);
    return generateSnippetForLanguage(
      activeSnippetLang,
      targetUrl,
      method,
      effectiveHeaders,
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

  const handleCopyTypes = () => {
    if (generatedTypesCode) {
      navigator.clipboard.writeText(generatedTypesCode);
      setCopiedTypes(true);
      setTimeout(() => setCopiedTypes(false), 2000);
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

  // Popular vs additional snippet languages
  const isPopularLang = POPULAR_LANG_LIST.some((l) => l.id === activeSnippetLang);
  const additionalLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter((l) => !POPULAR_LANG_LIST.some((p) => p.id === l.id));
  }, []);


  const renderResponseInspector = (isUnified: boolean = false) => {
    return (
      <div className={`${isUnified ? "rounded-xl border border-border bg-surface-elevated/20 flex flex-col min-h-[460px] h-[540px] overflow-hidden shadow-sm transition-colors" : "bg-surface rounded-2xl border border-border flex flex-col min-h-[480px] h-[540px] overflow-hidden shadow-sm transition-colors"}`}>
          {/* Header Bar */}
          <div className="px-4 py-3 border-b border-border bg-surface-elevated/60 flex flex-wrap items-center justify-between gap-2">
            {/* Left Title & Status */}
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-accent/10 text-accent">
                <Database className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-text-base tracking-tight">Response Payload</span>

              {/* Status Code badge */}
              {response ? (
                <div className="flex items-center gap-2 ml-1">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                      response.status_code >= 200 && response.status_code < 300
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : response.status_code >= 400
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    <span>{response.status_code} {response.status_code === 200 ? 'OK' : ''}</span>
                  </span>

                  <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {response.latency_ms} ms
                  </span>

                  {Boolean(response?.data) && (
                    <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded-md bg-surface border border-border">
                      {getPayloadSize(response.data)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] font-mono text-text-muted/70 px-2 py-0.5 rounded-full bg-surface border border-border flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-text-muted/40" />
                  <span>Awaiting Request</span>
                </span>
              )}
            </div>

            {/* Header Right Actions (Search, Copy, Download, Layout controls) */}
            <div className="flex items-center gap-1.5">
              {Boolean(response?.data) && (
                <>
                  <button
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className={`p-1.5 rounded-lg text-xs transition-colors border cursor-pointer ${
                      isSearchOpen
                        ? 'bg-accent/20 text-accent border-accent/40'
                        : 'bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-base border-border'
                    }`}
                    title="Search in response payload"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={handleCopyJson}
                    className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border transition-colors cursor-pointer"
                    title="Copy full JSON"
                  >
                    {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{copiedJson ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border transition-colors cursor-pointer"
                    title="Download JSON file"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </>
              )}

              {!isUnified && (
                <div className="flex items-center bg-surface p-0.5 rounded-xl border border-border ml-1">
                <button
                  onClick={() => setViewLayout('split')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'split' ? 'bg-accent text-background font-bold shadow-sm' : 'text-text-muted hover:text-text-base'
                  }`}
                  title="Side-by-side Split View"
                >
                  <Columns className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setViewLayout('focus')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'focus' ? 'bg-accent text-background font-bold shadow-sm' : 'text-text-muted hover:text-text-base'
                  }`}
                  title="Full Width Focus View"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setViewLayout('stacked')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'stacked' ? 'bg-accent text-background font-bold shadow-sm' : 'text-text-muted hover:text-text-base'
                  }`}
                  title="Stacked Top/Bottom View"
                >
                  <Rows className="h-3 w-3" />
                </button>
              </div>
              )}
            </div>
          </div>

          {/* Response View Selector Tabs */}
          <div className="px-3 py-1.5 bg-surface-elevated/40 border-b border-border flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setActiveResponseTab('json')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeResponseTab === 'json'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                }`}
              >
                <Code2 className="h-3 w-3" />
                <span>JSON</span>
              </button>

              <button
                onClick={() => setActiveResponseTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeResponseTab === 'preview'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                }`}
              >
                <Globe className="h-3 w-3" />
                <span>Preview</span>
                {isHtmlResponse && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    HTML
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveResponseTab('media')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeResponseTab === 'media'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                }`}
              >
                <ImageIcon className="h-3 w-3" />
                <span>Media</span>
                {mediaItems.length > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeResponseTab === 'media' ? 'bg-black/20 text-background' : 'bg-accent/20 text-accent'
                  }`}>
                    {mediaItems.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveResponseTab('headers')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeResponseTab === 'headers'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>Headers</span>
                {response?.headers && Object.keys(response.headers).length > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeResponseTab === 'headers' ? 'bg-black/20 text-background' : 'bg-surface text-text-muted border border-border'
                  }`}>
                    {Object.keys(response.headers).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveResponseTab('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeResponseTab === 'table'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                }`}
              >
                <TableIcon className="h-3 w-3" />
                <span>Schema</span>
              </button>

              <button
                onClick={() => setActiveResponseTab('types')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeResponseTab === 'types'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                }`}
              >
                <FileCode className="h-3 w-3" />
                <span>Types</span>
              </button>

              <button
                onClick={() => setActiveResponseTab('raw')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeResponseTab === 'raw'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                }`}
              >
                <AlignLeft className="h-3 w-3" />
                <span>Raw</span>
              </button>

              <button
                onClick={() => setActiveResponseTab('history')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeResponseTab === 'history'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                }`}
              >
                <History className="h-3 w-3" />
                <span>History</span>
                {history.length > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeResponseTab === 'history' ? 'bg-black/20 text-background' : 'bg-surface text-text-muted border border-border'
                  }`}>
                    {history.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tree vs Raw text toggle if on JSON tab */}
            {activeResponseTab === 'json' && Boolean(response?.data) && (
              <div className="flex items-center bg-surface p-0.5 rounded-lg border border-border">
                <button
                  onClick={() => setJsonDisplayMode('tree')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer ${
                    jsonDisplayMode === 'tree' ? 'bg-accent text-background font-bold shadow-sm' : 'text-text-muted hover:text-text-base'
                  }`}
                >
                  Tree
                </button>
                <button
                  onClick={() => setJsonDisplayMode('raw')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer ${
                    jsonDisplayMode === 'raw' ? 'bg-accent text-background font-bold shadow-sm' : 'text-text-muted hover:text-text-base'
                  }`}
                >
                  Plain
                </button>
              </div>
            )}
          </div>

          {/* Quick Search Bar */}
          {isSearchOpen && (
            <div className="px-3.5 py-2 bg-surface border-b border-border flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Filter response JSON by keyword or property name..."
                value={jsonSearchQuery}
                onChange={(e) => setJsonSearchQuery(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-transparent text-xs font-mono text-text-base outline-none placeholder:text-text-muted/50"
                autoFocus
              />
              {jsonSearchQuery && (
                <button
                  onClick={() => setJsonSearchQuery('')}
                  className="text-xs text-text-muted hover:text-text-base cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Body Viewer Area */}
          <div className="flex-1 p-4 overflow-auto font-mono text-xs bg-surface dark:bg-[#131416] text-text-base transition-colors">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
                <p className="text-xs font-medium">Executing live request through proxy...</p>
              </div>
            ) : activeResponseTab === 'history' ? (
              <RequestHistoryView
                history={history}
                onSelect={(item) => {
                  handleSelectHistoryItem(item);
                  setActiveResponseTab('json');
                }}
                onReRun={(item) => {
                  handleSelectHistoryItem(item);
                  handleRunTest(item.url, item.method, item.body);
                }}
                onClear={() => {
                  setHistory([]);
                  sessionStorage.removeItem(`fah_history_${api?.slug || 'api'}`);
                }}
                currentHistoryId={currentHistoryId}
              />
            ) : response?.error || (response?.status_code && response.status_code >= 400) ? (
              (() => {
                const diag = getErrorDiagnostics(response.status_code, response.error);
                return (
                  <div className="space-y-4 font-sans">
                    {/* Diagnostic Summary Card */}
                    <div className="p-4 rounded-xl bg-surface border border-rose-500/30 text-rose-400 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2 font-semibold text-rose-400 text-xs">
                          <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                          <span>{diag.title}</span>
                        </div>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${diag.badgeColor}`}>
                          {diag.badge}
                        </span>
                      </div>

                      {/* Descriptive error */}
                      <p className="text-xs text-text-base leading-relaxed">
                        {response.error || diag.description}
                      </p>

                      {/* Actionable Troubleshooting Steps */}
                      <div className="bg-surface-elevated p-3 rounded-xl border border-border space-y-2">
                        <div className="text-[11px] font-semibold text-text-base flex items-center gap-1.5">
                          <HelpCircle className="h-3.5 w-3.5 text-accent" />
                          <span>Troubleshooting & Recommendations:</span>
                        </div>
                        <ul className="text-[11px] text-text-muted space-y-1.5 list-disc list-inside">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated text-text-base text-xs font-medium border border-border transition-colors cursor-pointer"
                        >
                          {copiedError ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-text-muted" />}
                          <span>{copiedError ? 'Diagnostics Copied!' : 'Copy Error Report'}</span>
                        </button>

                        <button
                          onClick={() => handleRunTest()}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated text-text-base text-xs font-medium border border-border transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-current text-text-muted" />
                          <span>Retry Request</span>
                        </button>

                        {api.documentation_url && (
                          <a
                            href={api.documentation_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium border border-accent/30 transition-colors"
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
                        <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
                          <span className="font-mono flex items-center gap-1.5">
                            <Info className="h-3 w-3 text-text-muted" />
                            Upstream Server Payload ({typeof response.data === 'object' ? 'JSON' : 'Text'}):
                          </span>
                        </div>
                        <div className="rounded-xl border border-border overflow-hidden">
                          <CodeSnippetViewer
                            code={typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data)}
                            language="json"
                            showLineNumbers={true}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : response ? (
              /* Success Response Views */
              activeResponseTab === 'preview' ? (
                /* Web Page / HTML Preview Tab */
                <HtmlPreviewViewer
                  html={typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
                  url={endpointUrl}
                  statusCode={response.status_code}
                  latencyMs={response.latency_ms}
                />
              ) : activeResponseTab === 'json' ? (
                <div className="space-y-3">
                  {isHtmlResponse && (
                    <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 flex flex-wrap items-center justify-between gap-2.5 font-sans">
                      <div className="flex items-center gap-2 text-text-base text-xs">
                        <Globe className="h-4 w-4 text-accent flex-shrink-0" />
                        <span>
                          <strong>HTML Web Document Detected:</strong> This endpoint returned a rendered HTML web page ({response.status_code} OK).
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveResponseTab('preview')}
                        className="px-3 py-1 rounded-lg bg-accent hover:bg-accent-hover text-background font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span>Switch to Web Preview</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {jsonDisplayMode === 'tree' ? (
                    <JsonTreeViewer
                      data={response.data}
                      searchQuery={jsonSearchQuery}
                    />
                  ) : (
                    <CodeSnippetViewer
                      code={filteredJsonContent}
                      language="json"
                      showLineNumbers={true}
                      showCopyButton={true}
                    />
                  )}
                </div>
              ) : activeResponseTab === 'media' ? (
                /* Media Preview Tab */
                <MediaPreviewViewer
                  mediaItems={mediaItems}
                  onLoadSampleEndpoint={(url) => {
                    setEndpointUrl(url);
                    handleRunTest(url);
                  }}
                />
              ) : activeResponseTab === 'headers' ? (
                /* Response Headers Tab */
                <div className="space-y-2">
                  <div className="text-[11px] font-sans text-text-muted pb-1 border-b border-border">
                    HTTP Response Headers ({Object.keys(response.headers || {}).length}):
                  </div>
                  {response.headers && Object.keys(response.headers).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border text-text-muted text-[10px] uppercase">
                            <th className="py-2 pr-4 font-mono">Header</th>
                            <th className="py-2 font-mono">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {Object.entries(response.headers).map(([key, value]) => (
                            <tr key={key} className="hover:bg-surface-elevated/40 group">
                              <td className="py-2 pr-4 text-accent font-mono font-medium whitespace-nowrap align-top">
                                {key}
                              </td>
                              <td className="py-2 text-text-base font-mono break-all">
                                {value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-text-muted font-sans text-xs py-4 text-center">No explicit headers forwarded by target server.</p>
                  )}
                </div>
              ) : activeResponseTab === 'types' ? (
                /* TypeScript / JSON Schema Generator View */
                <div className="space-y-3 font-sans h-full flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border">
                      <button
                        onClick={() => setTypesDisplayMode('typescript')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          typesDisplayMode === 'typescript'
                            ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                            : 'text-text-muted hover:text-text-base'
                        }`}
                      >
                        TypeScript Interface
                      </button>
                      <button
                        onClick={() => setTypesDisplayMode('schema')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          typesDisplayMode === 'schema'
                            ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                            : 'text-text-muted hover:text-text-base'
                        }`}
                      >
                        JSON Schema
                      </button>
                    </div>

                    <button
                      onClick={handleCopyTypes}
                      className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border transition-colors cursor-pointer"
                    >
                      {copiedTypes ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedTypes ? 'Copied Types!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto rounded-xl border border-border">
                    <CodeSnippetViewer
                      code={generatedTypesCode}
                      language={typesDisplayMode === 'typescript' ? 'typescript' : 'json'}
                      showLineNumbers={true}
                    />
                  </div>
                </div>
              ) : activeResponseTab === 'table' ? (
                /* Flattened Structure Inspector */
                <div className="space-y-2">
                  <div className="text-[11px] font-sans text-text-muted pb-1 border-b border-border">
                    Flattened Property Hierarchy ({flattenedTableData.length} entries):
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-border text-text-muted text-[10px] uppercase font-mono">
                          <th className="py-2 pr-3">Property Path</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono">
                        {flattenedTableData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-surface-elevated/40">
                            <td className="py-1.5 pr-3 text-accent font-semibold whitespace-nowrap">
                              {row.key || '(root)'}
                            </td>
                            <td className="py-1.5 pr-3 text-text-muted text-[10px]">
                              {row.type}
                            </td>
                            <td className="py-1.5 text-text-base break-all">
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
                <CodeSnippetViewer
                  code={typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
                  language="json"
                  showLineNumbers={true}
                  showCopyButton={true}
                />
              )
            ) : (
              /* Enhanced Developer Empty State */
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4 font-sans py-8">
                {/* Visual Hero Orb */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent/20 via-sky-500/10 to-indigo-500/20 border border-accent/30 flex items-center justify-center text-accent shadow-lg shadow-accent/10">
                    <Play className="h-7 w-7 fill-current ml-0.5" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-white ring-4 ring-surface dark:ring-[#131416]">
                    <Zap className="h-3 w-3 fill-current" />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-sm">
                  <p className="font-bold text-text-base text-base tracking-tight">Ready to Test Endpoint</p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Send a live HTTP request to inspect response trees, extract media, generate TypeScript interfaces, and test edge cases.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    onClick={() => handleRunTest()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-xs transition-all shadow-md shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>Run Sample Request</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15 font-normal ml-0.5">
                      ⌘↵
                    </span>
                  </button>

                  {presets[0] && (
                    <button
                      onClick={() => handleSelectPreset(presets[0])}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface-hover text-text-base border border-border text-xs font-mono transition-colors cursor-pointer"
                    >
                      <span className="text-accent font-semibold">{presets[0].method}</span>
                      <span className="truncate max-w-[150px]">{presets[0].label}</span>
                      <ArrowRight className="h-3 w-3 text-accent" />
                    </button>
                  )}
                </div>

                {/* Developer Feature Checklist */}
                <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-text-muted">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-border">
                    <span className="text-emerald-400">✓</span> Live Proxy Telemetry
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-border">
                    <span className="text-accent">✓</span> Auto TypeScript Generator
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-border">
                    <span className="text-purple-400">✓</span> HTML & Media Preview
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
    );
  };

  const renderSnippetsPanel = (isUnified: boolean = false) => {
    return (
      <div className={`${isUnified ? "rounded-xl border border-border bg-surface-elevated/20 flex flex-col min-h-[460px] h-[540px] overflow-hidden shadow-sm transition-colors" : "bg-surface rounded-2xl border border-border flex flex-col min-h-[480px] h-[540px] overflow-hidden shadow-sm transition-colors"}`}>
            {/* Header with Language Tabs */}
            <div className="px-4 py-3 border-b border-border bg-surface-elevated/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded-lg bg-accent/10 text-accent">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-text-base tracking-tight">Integration Client Code</span>
                </div>

                {/* Copy Code Button */}
                <button
                  onClick={handleCopySnippet}
                  className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border transition-colors cursor-pointer"
                >
                  {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-text-muted" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Language Pill Selector with Quick Tabs + Clean Dropdown (NO Duplicate cURL!) */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {POPULAR_LANG_LIST.map((lang) => {
                    const isActive = activeSnippetLang === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setActiveSnippetLang(lang.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                            : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                        }`}
                      >
                        {lang.label}
                      </button>
                    );
                  })}

                  {/* Clean Secondary Dropdown */}
                  <div className="relative">
                    <select
                      value={isPopularLang ? '' : activeSnippetLang}
                      onChange={(e) => {
                        if (e.target.value) {
                          setActiveSnippetLang(e.target.value as SnippetLanguage);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all outline-none cursor-pointer border ${
                        !isPopularLang
                          ? 'bg-accent text-background font-bold border-accent shadow-sm shadow-accent/20'
                          : 'bg-surface text-text-muted hover:text-text-base border-border hover:border-border-light'
                      }`}
                      title="Choose from additional languages"
                    >
                      <option value="" disabled>
                        {isPopularLang ? 'More...' : SUPPORTED_LANGUAGES.find((l) => l.id === activeSnippetLang)?.label || 'More...'}
                      </option>
                      {additionalLanguages.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Snippet Code Box with Line Numbers & Syntax Highlighting */}
            <div className="flex-1 overflow-auto font-mono text-xs bg-[#16181D] text-slate-200 relative group">
              <CodeSnippetViewer
                code={getActiveSnippet()}
                language={
                  activeSnippetLang === 'curl'
                    ? 'curl'
                    : ['js', 'axios', 'ts'].includes(activeSnippetLang)
                      ? 'javascript'
                      : activeSnippetLang.includes('python')
                        ? 'python'
                        : 'text'
                }
                showLineNumbers={true}
              />
            </div>

            {/* Snippet Footer Info */}
            <div className="px-4 py-2 bg-surface-elevated/40 border-t border-border flex items-center justify-between text-[11px] text-text-muted font-sans">
              <div className="flex items-center gap-1.5 font-mono text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span>{SUPPORTED_LANGUAGES.find((l) => l.id === activeSnippetLang)?.label} snippet</span>
              </div>
              <span className="hidden sm:inline">Production ready • Timeout: 10s • Auto-serialized</span>
            </div>
          </div>
    );
  };

    const activeMethodStyle = METHOD_STYLES[method] || METHOD_STYLES.GET;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* cURL Import Modal */}
      <CurlImportModal
        isOpen={isCurlModalOpen}
        onClose={() => setIsCurlModalOpen(false)}
        onImport={handleImportCurl}
        sampleCurl={getActiveSnippet()}
      />

      {/* Top Request Section */}
      <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-border shadow-sm space-y-4 transition-colors">
        {/* Presets Bar */}
        {presets.length > 0 && (
          <div className="space-y-2 pb-3 border-b border-border">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-base tracking-tight">Preset Scenarios</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted border border-border">
                    {presets.length} available
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCurlModalOpen(true)}
                className="text-xs font-mono text-accent hover:text-accent-hover flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                title="Paste and import any cURL command"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Import cURL</span>
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {presets.map((preset) => {
                const isActive = selectedPresetId === preset.id;
                const mStyle = METHOD_STYLES[preset.method] || METHOD_STYLES.GET;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-accent text-background font-bold border-accent shadow-sm shadow-accent/20'
                        : 'bg-surface-elevated text-text-base hover:text-text-base border-border hover:border-border-light hover:bg-surface-hover'
                    }`}
                    title={preset.description}
                  >
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-black/20 text-background'
                          : `${mStyle.bg} ${mStyle.text} border ${mStyle.border}`
                      }`}
                    >
                      {preset.method}
                    </span>
                    <span className="font-medium">{preset.label}</span>
                    {preset.badge && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isActive
                            ? 'bg-black/15 text-background'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        <Check className="h-2.5 w-2.5" />
                        <span>{preset.badge}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Omnibar Request Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface-elevated/70 p-2 rounded-2xl border border-border focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15 transition-all">
          {/* Method Selector Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
              className={`flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold border cursor-pointer transition-all ${activeMethodStyle.bg} ${activeMethodStyle.text} ${activeMethodStyle.border} min-w-[92px]`}
              title="Change HTTP Request Verb"
            >
              <span>{method}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isMethodDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMethodDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMethodDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1.5 w-32 bg-surface border border-border rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                  {HTTP_METHODS.map((m) => {
                    const style = METHOD_STYLES[m];
                    const isSelected = method === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMethod(m);
                          setIsMethodDropdownOpen(false);
                          if (['POST', 'PUT', 'PATCH'].includes(m) && !requestBody) {
                            setRequestBody('{\n  "exampleKey": "value"\n}');
                            setActiveParamTab('body');
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                          isSelected
                            ? `${style.bg} ${style.text}`
                            : 'text-text-base hover:bg-surface-elevated'
                        }`}
                      >
                        <span className={style.text}>{m}</span>
                        {isSelected && <Check className="h-3 w-3 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* URL Input */}
          <div className="flex-1 relative flex items-center min-w-0">
            <div className="pl-2 pr-1 text-text-muted shrink-0" title={endpointUrl.startsWith('https://') ? 'Secure HTTPS Endpoint' : 'HTTP Endpoint'}>
              {endpointUrl.startsWith('https://') ? (
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Globe className="h-3.5 w-3.5 text-accent" />
              )}
            </div>
            <input
              type="text"
              value={endpointUrl}
              onChange={(e) => handleEndpointUrlChange(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="w-full bg-transparent border-0 px-2.5 py-2 text-xs font-mono text-text-base focus:outline-none placeholder:text-text-muted/50"
              placeholder="https://api.example.com/v1/resource..."
            />
            {endpointUrl && (
              <button
                type="button"
                onClick={() => handleEndpointUrlChange('')}
                className="text-text-muted hover:text-text-base p-1 mr-1 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer shrink-0"
                title="Clear URL"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Run / Send Request Button */}
          <button
            onClick={() => handleRunTest()}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-xs shadow-md shadow-accent/25 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] shrink-0"
            title="Execute live proxy request (Ctrl + Enter)"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Sending...' : 'Run Test'}</span>
            <span className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15 text-background font-normal ml-0.5">
              ⌘↵
            </span>
          </button>
        </div>

        {/* Real-time URL Validation Error Banner */}
        {urlValidationError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-400">
            <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{urlValidationError}</span>
          </div>
        )}

        {/* Parameter & Header Tabs Navigation */}
        <div className="pt-2 border-t border-border space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* The Request & Response Tabs */}
            <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-border overflow-x-auto scrollbar-none flex-nowrap shrink max-w-full">
              {/* Tab 1: Params */}
              <button
                type="button"
                onClick={() => setActiveParamTab('params')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  activeParamTab === 'params'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>Params</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeParamTab === 'params' ? 'bg-black/20 text-background' : 'bg-surface text-text-muted border border-border'
                }`}>
                  {params.length}
                </span>
              </button>

              {/* Tab 2: Headers */}
              <button
                type="button"
                onClick={() => setActiveParamTab('headers')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  activeParamTab === 'headers'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>Headers</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeParamTab === 'headers' ? 'bg-black/20 text-background' : 'bg-surface text-text-muted border border-border'
                }`}>
                  {headers.length}
                </span>
              </button>

              {/* Tab 3: Body */}
              <button
                type="button"
                onClick={() => setActiveParamTab('body')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  activeParamTab === 'body'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                <Braces className="h-3 w-3" />
                <span>Body</span>
                {requestBody.trim() && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              {/* Tab 4: Auth */}
              <button
                type="button"
                onClick={() => setActiveParamTab('auth')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  activeParamTab === 'auth'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                <KeyRound className="h-3 w-3" />
                <span>Auth</span>
                {authType !== 'none' && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeParamTab === 'auth' ? 'bg-black/20 text-background' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    ✓
                  </span>
                )}
              </button>

              {/* Tab 5: Settings */}
              <button
                type="button"
                onClick={() => setActiveParamTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  activeParamTab === 'settings'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                <Settings2 className="h-3 w-3" />
                <span>Settings</span>
                {bypassCache && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </button>

              {/* Divider and Result Tabs (Only shown in Tabs mode) */}
              {workbenchLayout === 'tabs' && (
                <>
                  <div className="h-4 w-px bg-border mx-1 self-center shrink-0" />

                  {/* Tab 6: Response */}
                  <button
                    type="button"
                    onClick={() => setActiveParamTab('response')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                      activeParamTab === 'response'
                        ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                        : 'text-text-muted hover:text-text-base'
                    }`}
                  >
                    <Database className="h-3 w-3" />
                    <span>Response</span>
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-current" />
                    ) : response ? (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                          activeParamTab === 'response'
                            ? 'bg-black/20 text-background'
                            : response.status_code >= 200 && response.status_code < 300
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : response.status_code >= 400
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {response.status_code}
                      </span>
                    ) : null}
                  </button>

                  {/* Tab 7: Client Code */}
                  <button
                    type="button"
                    onClick={() => setActiveParamTab('snippets')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                      activeParamTab === 'snippets'
                        ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                        : 'text-text-muted hover:text-text-base'
                    }`}
                  >
                    <Terminal className="h-3 w-3" />
                    <span>Client Code</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeParamTab === 'snippets' ? 'bg-black/20 text-background' : 'bg-surface text-text-muted border border-border'
                    }`}>
                      {SUPPORTED_LANGUAGES.find((l) => l.id === activeSnippetLang)?.label || 'cURL'}
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* Contextual Action Buttons & Mode Switcher */}
            <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
              {activeParamTab === 'params' && (
                <button
                  type="button"
                  onClick={() => handleUpdateParams((prev) => [...prev, { key: '', value: '' }])}
                  className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Query Param</span>
                </button>
              )}

              {activeParamTab === 'headers' && (
                <button
                  type="button"
                  onClick={() => setHeaders((prev) => [...prev, { key: '', value: '' }])}
                  className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Header</span>
                </button>
              )}

              {activeParamTab === 'body' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFormatRequestBody}
                    className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                    title="Pretty-format JSON syntax"
                  >
                    <Sparkles className="h-3 w-3 text-accent" />
                    <span>Format JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestBody('')}
                    className="text-xs text-text-muted hover:text-rose-400 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                    title="Clear body"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                </div>
              )}

              {activeParamTab === 'response' && Boolean(response?.data) && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                    title="Copy full JSON"
                  >
                    {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-text-muted" />}
                    <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                    title="Download JSON file"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              )}

              {activeParamTab === 'snippets' && (
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                  title="Copy integration code"
                >
                  {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-text-muted" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy Code'}</span>
                </button>
              )}

              {activeParamTab === 'auth' && authType !== 'none' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthType('none');
                    setApiKeyValue('');
                    setBearerToken('');
                    setBasicUsername('');
                    setBasicPassword('');
                  }}
                  className="text-xs text-text-muted hover:text-rose-400 font-medium flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Auth</span>
                </button>
              )}

              {activeParamTab === 'settings' && (
                <button
                  type="button"
                  onClick={() => {
                    setRequestTimeout(10000);
                    setFollowRedirects(true);
                    setBypassCache(false);
                  }}
                  className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
                >
                  <span>Reset Defaults</span>
                </button>
              )}

              {/* Workbench Mode Toggle: Tabs vs Split */}
              <div className="flex items-center bg-surface-elevated p-0.5 rounded-xl border border-border ml-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetWorkbenchLayout('tabs')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    workbenchLayout === 'tabs'
                      ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                      : 'text-text-muted hover:text-text-base'
                  }`}
                  title="Single Tabbed Workbench"
                >
                  <LayoutTemplate className="h-3 w-3" />
                  <span className="hidden sm:inline">Tabs</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetWorkbenchLayout('split')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    workbenchLayout === 'split'
                      ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                      : 'text-text-muted hover:text-text-base'
                  }`}
                  title="Split Multi-Pane Layout"
                >
                  <Columns className="h-3 w-3" />
                  <span className="hidden sm:inline">Split</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tab View 1: Query Params */}
          {activeParamTab === 'params' && (
            params.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {params.map((p, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-surface-elevated px-3 py-2 rounded-xl border border-border hover:border-border-light transition-all">
                    <input
                      type="text"
                      placeholder="key"
                      value={p.key}
                      spellCheck={false}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateParams((prev) => {
                          const copy = [...prev];
                          copy[index] = { ...copy[index], key: val };
                          return copy;
                        });
                      }}
                      className="w-24 bg-transparent text-xs font-mono text-accent font-medium outline-none placeholder:text-text-muted/40"
                    />
                    <span className="text-text-muted/60 font-mono text-xs">=</span>
                    <input
                      type="text"
                      placeholder="value"
                      value={p.value}
                      spellCheck={false}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateParams((prev) => {
                          const copy = [...prev];
                          copy[index] = { ...copy[index], value: val };
                          return copy;
                        });
                      }}
                      className="flex-1 bg-transparent text-xs font-mono text-text-base outline-none placeholder:text-text-muted/40"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateParams((prev) => prev.filter((_, i) => i !== index))}
                      className="text-text-muted hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove parameter"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border border-dashed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-text-muted">
                <div>
                  <span className="font-semibold text-text-base">No query parameters attached.</span>
                  <p className="text-[11px] text-text-muted mt-0.5">Parameters will automatically sync with the URL bar above.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleUpdateParams((prev) => [...prev, { key: 'limit', value: '10' }])}
                    className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
                  >
                    + limit=10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateParams((prev) => [...prev, { key: 'format', value: 'json' }])}
                    className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
                  >
                    + format=json
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateParams((prev) => [...prev, { key: 'page', value: '1' }])}
                    className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
                  >
                    + page=1
                  </button>
                </div>
              </div>
            )
          )}

          {/* Tab View 2: Auth */}
          {activeParamTab === 'auth' && (
            <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div>
                  <span className="text-xs font-bold text-text-base">Authorization Type</span>
                  <p className="text-[11px] text-text-muted mt-0.5">Configure authentication headers or API keys for remote endpoint authorization.</p>
                </div>

                {/* Auth Type Pills */}
                <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border overflow-x-auto scrollbar-none">
                  {(['none', 'apiKey', 'bearer', 'basic'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAuthType(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer capitalize ${
                        authType === t
                          ? 'bg-accent text-background font-bold shadow-sm'
                          : 'text-text-muted hover:text-text-base'
                      }`}
                    >
                      {t === 'none' ? 'No Auth' : t === 'apiKey' ? 'API Key' : t === 'bearer' ? 'Bearer Token' : 'Basic Auth'}
                    </button>
                  ))}
                </div>
              </div>

              {/* No Auth State */}
              {authType === 'none' && (
                <div className="flex items-center justify-between text-xs text-text-muted py-2">
                  <span>This request does not use any authentication credentials.</span>
                  {api.auth_type !== 'none' && (
                    <button
                      type="button"
                      onClick={() => setAuthType('apiKey')}
                      className="text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>This API lists {api.auth_type}. Click to configure API Key.</span>
                    </button>
                  )}
                </div>
              )}

              {/* API Key View */}
              {authType === 'apiKey' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-text-muted mb-1">Key Name</label>
                    <input
                      type="text"
                      placeholder="X-API-Key or api_key"
                      value={apiKeyName}
                      onChange={(e) => setApiKeyName(e.target.value)}
                      spellCheck={false}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-text-muted mb-1">Key Value</label>
                    <div className="relative flex items-center">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        placeholder="Paste your developer key..."
                        value={apiKeyValue}
                        onChange={(e) => setApiKeyValue(e.target.value)}
                        spellCheck={false}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 pr-9 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-2.5 text-text-muted hover:text-text-base cursor-pointer"
                        title={showSecret ? 'Hide key' : 'Show key'}
                      >
                        {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-text-muted mb-1">Pass Key In</label>
                    <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border h-[38px]">
                      <button
                        type="button"
                        onClick={() => setApiKeyLocation('header')}
                        className={`flex-1 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                          apiKeyLocation === 'header' ? 'bg-accent text-background font-bold shadow-sm' : 'text-text-muted hover:text-text-base'
                        }`}
                      >
                        Header
                      </button>
                      <button
                        type="button"
                        onClick={() => setApiKeyLocation('query')}
                        className={`flex-1 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                          apiKeyLocation === 'query' ? 'bg-accent text-background font-bold shadow-sm' : 'text-text-muted hover:text-text-base'
                        }`}
                      >
                        Query Param
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bearer Token View */}
              {authType === 'bearer' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-mono text-text-muted">Bearer Token</label>
                  <div className="relative flex items-center">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      placeholder="eyJhbGciOi... or OAuth token"
                      value={bearerToken}
                      onChange={(e) => setBearerToken(e.target.value)}
                      spellCheck={false}
                      className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 pr-9 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 text-text-muted hover:text-text-base cursor-pointer"
                      title={showSecret ? 'Hide token' : 'Show token'}
                    >
                      {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-text-muted">
                    Sends header: <span className="text-accent">Authorization: Bearer {bearerToken ? '••••••••' : '<token>'}</span>
                  </p>
                </div>
              )}

              {/* Basic Auth View */}
              {authType === 'basic' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-text-muted mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="Username / Client ID"
                      value={basicUsername}
                      onChange={(e) => setBasicUsername(e.target.value)}
                      spellCheck={false}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-text-muted mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Password / Secret"
                      value={basicPassword}
                      onChange={(e) => setBasicPassword(e.target.value)}
                      spellCheck={false}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab View 3: Headers */}
          {activeParamTab === 'headers' && (
            headers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {headers.map((h, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-surface-elevated px-3 py-2 rounded-xl border border-border hover:border-border-light transition-all">
                    <input
                      type="text"
                      placeholder="Header-Name"
                      value={h.key}
                      spellCheck={false}
                      onChange={(e) => {
                        const updated = [...headers];
                        updated[index].key = e.target.value;
                        setHeaders(updated);
                      }}
                      className="w-28 bg-transparent text-xs font-mono text-emerald-400 font-medium outline-none placeholder:text-text-muted/40"
                    />
                    <span className="text-text-muted/60 font-mono text-xs">:</span>
                    <input
                      type="text"
                      placeholder="Value"
                      value={h.value}
                      spellCheck={false}
                      onChange={(e) => {
                        const updated = [...headers];
                        updated[index].value = e.target.value;
                        setHeaders(updated);
                      }}
                      className="flex-1 bg-transparent text-xs font-mono text-text-base outline-none placeholder:text-text-muted/40"
                    />
                    <button
                      type="button"
                      onClick={() => setHeaders((prev) => prev.filter((_, i) => i !== index))}
                      className="text-text-muted hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove header"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border border-dashed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-text-muted">
                <div>
                  <span className="font-semibold text-text-base">No custom headers specified.</span>
                  <p className="text-[11px] text-text-muted mt-0.5">Standard HTTP headers (Accept, User-Agent) are automatically supplied by the proxy.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setHeaders((prev) => [...prev, { key: 'Accept', value: 'application/json' }])}
                    className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
                  >
                    + Accept: application/json
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaders((prev) => [...prev, { key: 'User-Agent', value: 'FreeApiHub-Client/1.0' }])}
                    className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
                  >
                    + User-Agent
                  </button>
                </div>
              </div>
            )
          )}

          {/* Tab View 4: Body */}
          {activeParamTab === 'body' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Request Payload Body (JSON for POST/PUT/PATCH):</span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>Templates:</span>
                  <button
                    type="button"
                    onClick={() => setRequestBody(JSON.stringify({ query: 'search', limit: 10 }, null, 2))}
                    className="text-accent hover:underline cursor-pointer"
                  >
                    Query
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setRequestBody(JSON.stringify({ name: 'Test Item', status: 'active' }, null, 2))}
                    className="text-accent hover:underline cursor-pointer"
                  >
                    Object
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setRequestBody('{\n  \n}')}
                    className="text-accent hover:underline cursor-pointer"
                  >
                    Empty
                  </button>
                </div>
              </div>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder={'{\n  "key": "value"\n}'}
                rows={4}
                spellCheck={false}
                className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-xs font-mono text-text-base placeholder:text-text-muted/40 focus:outline-none focus:border-accent resize-none transition-all"
              />
            </div>
          )}

          {/* Tab View 5: Settings */}
          {activeParamTab === 'settings' && (
            <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
              {/* Timeout Setting */}
              <div className="space-y-1.5">
                <span className="font-bold text-text-base block">Request Timeout</span>
                <p className="text-[11px] text-text-muted">Maximum duration before closing connection.</p>
                <div className="flex items-center gap-1 pt-1">
                  {[5000, 10000, 30000, 60000].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRequestTimeout(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                        requestTimeout === t
                          ? 'bg-accent text-background font-bold shadow-sm'
                          : 'bg-surface text-text-muted hover:text-text-base border border-border'
                      }`}
                    >
                      {t / 1000}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Cache Bypass Setting */}
              <div className="space-y-1.5">
                <span className="font-bold text-text-base block">Bypass Cache</span>
                <p className="text-[11px] text-text-muted">Send Cache-Control: no-cache to force fresh upstream data.</p>
                <button
                  type="button"
                  onClick={() => setBypassCache(!bypassCache)}
                  className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-xl font-mono text-xs font-semibold border transition-all cursor-pointer ${
                    bypassCache
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-surface text-text-muted border-border hover:text-text-base'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${bypassCache ? 'bg-amber-400 animate-pulse' : 'bg-text-muted/40'}`} />
                  <span>{bypassCache ? 'Bypass Active' : 'Default Cache'}</span>
                </button>
              </div>

              {/* Follow Redirects Setting */}
              <div className="space-y-1.5">
                <span className="font-bold text-text-base block">Follow Redirects</span>
                <p className="text-[11px] text-text-muted">Automatically follow HTTP 301 and 302 responses.</p>
                <button
                  type="button"
                  onClick={() => setFollowRedirects(!followRedirects)}
                  className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-xl font-mono text-xs font-semibold border transition-all cursor-pointer ${
                    followRedirects
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-surface text-text-muted border-border hover:text-text-base'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${followRedirects ? 'bg-emerald-400' : 'bg-text-muted/40'}`} />
                  <span>{followRedirects ? 'Follow (Enabled)' : 'Do Not Follow'}</span>
                </button>
              </div>

              {/* CORS Proxy Status */}
              <div className="space-y-1.5">
                <span className="font-bold text-text-base block">Proxy CORS Relay</span>
                <p className="text-[11px] text-text-muted">Bypasses browser CORS restrictions via server relay.</p>
                <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Active & Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab View 6: Response Payload (when in tabs mode) */}
          {workbenchLayout === 'tabs' && activeParamTab === 'response' && (
            <div className="pt-1">
              {renderResponseInspector(true)}
            </div>
          )}

          {/* Tab View 7: Integration Client Code (when in tabs mode) */}
          {workbenchLayout === 'tabs' && activeParamTab === 'snippets' && (
            <div className="pt-1">
              {renderSnippetsPanel(true)}
            </div>
          )}
        </div>
      </div>

      {/* Main Response & Snippets Area (Split Mode Only) */}
      {workbenchLayout === 'split' && (
        <div
          className={`grid gap-4 transition-all duration-300 ${
            viewLayout === 'focus'
              ? 'grid-cols-1'
              : viewLayout === 'stacked'
                ? 'grid-cols-1'
                : 'grid-cols-1 lg:grid-cols-2'
          }`}
        >
          {renderResponseInspector(false)}
          {viewLayout !== 'focus' && renderSnippetsPanel(false)}
        </div>
      )}
    </div>
  );
};
