import React, { useState, useMemo, useEffect } from 'react';
import { ApiItem, ProxyResponse } from '../../types/api';
import { executeProxy } from '../../api/client';
import {
  SUPPORTED_LANGUAGES,
  SnippetLanguage,
  generateSnippetForLanguage,
  buildFullUrl
} from '../../utils/codeSnippets';
import { extractMediaItems } from '../../utils/mediaExtractor';
import {
  MediaPreviewViewer,
  HtmlPreviewViewer,
  JsonTreeViewer,
  CodeSnippetViewer
} from '../viewers';
import { CurlImportModal } from '../ui';
import { RequestHistoryView, HistoryItem } from './RequestHistoryBar';
import { getEndpointPresets, EndpointPreset } from '../../utils/endpointPresets';
import { generateTypeScriptTypes, generateJsonSchema } from '../../utils/typeGenerator';
import { ParsedCurl } from '../../utils/curlParser';
import {
  ParamsTab,
  HeadersTab,
  BodyTab,
  AuthTab,
  SettingsTab,
  CodeSnippetsTab,
  ResponseInspector,
  PlaygroundTabsNav,
  RequestTab,
  WorkbenchLayout,
  RequestAuthMode
} from './tabs';
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
import { logger } from '../../utils/logger';

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

export interface PlaygroundProps {
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
          <PlaygroundTabsNav
            activeTab={activeParamTab}
            onSelectTab={setActiveParamTab}
            workbenchLayout={workbenchLayout}
            onSetWorkbenchLayout={handleSetWorkbenchLayout}
            paramsCount={params.length}
            headersCount={headers.length}
            hasBody={Boolean(requestBody.trim())}
            authType={authType}
            bypassCache={bypassCache}
            isLoading={isLoading}
            response={response}
            activeSnippetLang={activeSnippetLang}
            onAddParam={() => handleUpdateParams((prev) => [...prev, { key: '', value: '' }])}
            onAddHeader={() => setHeaders((prev) => [...prev, { key: '', value: '' }])}
            onFormatBody={handleFormatRequestBody}
            onClearBody={() => setRequestBody('')}
            onClearAuth={() => {
              setAuthType('none');
              setApiKeyValue('');
              setBearerToken('');
              setBasicUsername('');
              setBasicPassword('');
            }}
            onResetSettings={() => {
              setRequestTimeout(10000);
              setFollowRedirects(true);
              setBypassCache(false);
            }}
            onCopyJson={handleCopyJson}
            copiedJson={copiedJson}
            onDownloadJson={handleDownloadJson}
            onCopySnippet={handleCopySnippet}
            copiedSnippet={copiedSnippet}
          />

          {/* Tab 1: Query Params */}
          {activeParamTab === 'params' && (
            <ParamsTab params={params} onUpdateParams={handleUpdateParams} />
          )}

          {/* Tab 2: Headers */}
          {activeParamTab === 'headers' && (
            <HeadersTab headers={headers} onSetHeaders={setHeaders} />
          )}

          {/* Tab 3: Body */}
          {activeParamTab === 'body' && (
            <BodyTab requestBody={requestBody} onSetRequestBody={setRequestBody} />
          )}

          {/* Tab 4: Auth */}
          {activeParamTab === 'auth' && (
            <AuthTab
              apiAuthType={api?.auth_type}
              authType={authType}
              onSetAuthType={setAuthType}
              apiKeyName={apiKeyName}
              onSetApiKeyName={setApiKeyName}
              apiKeyValue={apiKeyValue}
              onSetApiKeyValue={setApiKeyValue}
              apiKeyLocation={apiKeyLocation}
              onSetApiKeyLocation={setApiKeyLocation}
              bearerToken={bearerToken}
              onSetBearerToken={setBearerToken}
              basicUsername={basicUsername}
              onSetBasicUsername={setBasicUsername}
              basicPassword={basicPassword}
              onSetBasicPassword={setBasicPassword}
              showSecret={showSecret}
              onToggleShowSecret={() => setShowSecret(!showSecret)}
            />
          )}

          {/* Tab 5: Settings */}
          {activeParamTab === 'settings' && (
            <SettingsTab
              requestTimeout={requestTimeout}
              onSetRequestTimeout={setRequestTimeout}
              bypassCache={bypassCache}
              onToggleBypassCache={() => setBypassCache(!bypassCache)}
              followRedirects={followRedirects}
              onToggleFollowRedirects={() => setFollowRedirects(!followRedirects)}
            />
          )}

          {/* Tab 6: Response Payload (when in tabs mode) */}
          {workbenchLayout === 'tabs' && activeParamTab === 'response' && (
            <div className="pt-1">
              <ResponseInspector
                response={response}
                isLoading={isLoading}
                endpointUrl={endpointUrl}
                api={api}
                presets={presets}
                onSelectPreset={handleSelectPreset}
                history={history}
                onSelectHistoryItem={handleSelectHistoryItem}
                onRunTest={handleRunTest}
                onClearHistory={() => {
                  setHistory([]);
                  sessionStorage.removeItem(`fah_history_${api?.slug || 'api'}`);
                }}
                currentHistoryId={currentHistoryId}
                isUnified={true}
                setEndpointUrl={setEndpointUrl}
              />
            </div>
          )}

          {/* Tab 7: Integration Client Code (when in tabs mode) */}
          {workbenchLayout === 'tabs' && activeParamTab === 'snippets' && (
            <div className="pt-1">
              <CodeSnippetsTab
                activeSnippetLang={activeSnippetLang}
                onSetActiveSnippetLang={setActiveSnippetLang}
                snippetCode={getActiveSnippet()}
                copiedSnippet={copiedSnippet}
                onCopySnippet={handleCopySnippet}
                isUnified={true}
              />
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
          <ResponseInspector
            response={response}
            isLoading={isLoading}
            endpointUrl={endpointUrl}
            api={api}
            presets={presets}
            onSelectPreset={handleSelectPreset}
            history={history}
            onSelectHistoryItem={handleSelectHistoryItem}
            onRunTest={handleRunTest}
            onClearHistory={() => {
              setHistory([]);
              sessionStorage.removeItem(`fah_history_${api?.slug || 'api'}`);
            }}
            currentHistoryId={currentHistoryId}
            isUnified={false}
            viewLayout={viewLayout}
            onSetViewLayout={setViewLayout}
            setEndpointUrl={setEndpointUrl}
          />
          {viewLayout !== 'focus' && (
            <CodeSnippetsTab
              activeSnippetLang={activeSnippetLang}
              onSetActiveSnippetLang={setActiveSnippetLang}
              snippetCode={getActiveSnippet()}
              copiedSnippet={copiedSnippet}
              onCopySnippet={handleCopySnippet}
              isUnified={false}
            />
          )}
        </div>
      )}
    </div>
  );
};
