import React, { useState, useMemo } from 'react';
import { ApiItem, ProxyResponse } from '../../types/api';
import { EndpointPreset } from '../../utils/endpointPresets';
import { HistoryItem, RequestHistoryView } from '../RequestHistoryBar';
import { extractMediaItems } from '../../utils/mediaExtractor';
import { generateTypeScriptTypes, generateJsonSchema } from '../../utils/typeGenerator';
import { CodeSnippetViewer } from '../CodeSnippetViewer';
import { JsonTreeViewer } from '../JsonTreeViewer';
import { HtmlPreviewViewer } from '../HtmlPreviewViewer';
import { MediaPreviewViewer } from '../MediaPreviewViewer';
import {
  Database,
  Clock,
  Search,
  Copy,
  Check,
  Download,
  Columns,
  Maximize2,
  Rows,
  Code2,
  Globe,
  Image as ImageIcon,
  FileText,
  Table as TableIcon,
  FileCode,
  AlignLeft,
  History,
  AlertCircle,
  HelpCircle,
  Play,
  Zap,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';

function getErrorDiagnostics(statusCode: number, errorMessage?: string | null) {
  if (statusCode === 404) {
    return {
      title: 'Resource Not Found (404)',
      badge: 'Client Error',
      badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
      description: 'The requested API route does not exist on this endpoint.',
      tips: [
        'Check the endpoint path spelling and query parameters.',
        'Verify with the API documentation for valid dynamic IDs or subroutes.',
        'Ensure path variables (e.g. :id or {id}) are replaced with real values.'
      ]
    };
  }
  if (statusCode === 401 || statusCode === 403) {
    return {
      title: 'Authentication Required (' + statusCode + ')',
      badge: 'Security / Auth',
      badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
      description: 'This API requires authentication (API key, Bearer token, or OAuth) or has rate-limited access.',
      tips: [
        'Open the Auth tab to supply an API Key, Bearer Token, or Basic Auth.',
        'Check if an account or free API key is required on the official provider portal.',
        'Inspect custom headers to confirm Authorization or custom headers are supplied.'
      ]
    };
  }
  if (statusCode === 429) {
    return {
      title: 'Rate Limit Exceeded (429)',
      badge: 'Rate Limit',
      badgeColor: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
      description: 'Too many requests were sent to the upstream service in a short period of time.',
      tips: [
        'Wait a few seconds before firing another test request.',
        'Check provider documentation for tier quotas and rate limit headers.'
      ]
    };
  }
  if (statusCode >= 500) {
    return {
      title: 'Upstream Server Error (' + statusCode + ')',
      badge: 'Server Error',
      badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
      description: errorMessage || 'The external target server failed to handle the proxy request.',
      tips: [
        'The remote API might be undergoing maintenance or an outage.',
        'Try again in a few moments or test an alternative endpoint.',
        'Ensure the payload or query parameters match the upstream schema expectations.'
      ]
    };
  }
  return {
    title: 'Request Failed (' + statusCode + ')',
    badge: 'HTTP Error',
    badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
    description: errorMessage || 'An unexpected response was returned by the upstream service.',
    tips: [
      'Verify request URL and method (GET, POST, etc.).',
      'Check if the remote host supports CORS or needs proxy relay.'
    ]
  };
}

export interface ResponseInspectorProps {
  response: ProxyResponse | null;
  isLoading: boolean;
  endpointUrl: string;
  api: ApiItem;
  presets?: EndpointPreset[];
  onSelectPreset?: (preset: EndpointPreset) => void;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onRunTest: (url?: string, method?: string, body?: any) => void | Promise<void>;
  onClearHistory: () => void;
  currentHistoryId?: string | null;
  isUnified?: boolean;
  viewLayout?: 'split' | 'focus' | 'stacked';
  onSetViewLayout?: (layout: 'split' | 'focus' | 'stacked') => void;
  setEndpointUrl?: (url: string) => void;
}

export const ResponseInspector: React.FC<ResponseInspectorProps> = ({
  response,
  isLoading,
  endpointUrl,
  api,
  presets = [],
  onSelectPreset,
  history,
  onSelectHistoryItem,
  onRunTest,
  onClearHistory,
  currentHistoryId,
  isUnified = false,
  viewLayout = 'split',
  onSetViewLayout,
  setEndpointUrl,
}) => {
  const [activeResponseTab, setActiveResponseTab] = useState<
    'json' | 'preview' | 'media' | 'headers' | 'table' | 'types' | 'raw' | 'history'
  >('json');
  const [jsonDisplayMode, setJsonDisplayMode] = useState<'tree' | 'raw'>('tree');
  const [typesDisplayMode, setTypesDisplayMode] = useState<'typescript' | 'schema'>('typescript');
  const [jsonSearchQuery, setJsonSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedTypes, setCopiedTypes] = useState(false);
  const [copiedError, setCopiedError] = useState(false);

  const getPayloadSize = (data: unknown) => {
    try {
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      const bytes = new Blob([str]).size;
      if (bytes < 1024) return bytes + ' B';
      return (bytes / 1024).toFixed(1) + ' KB';
    } catch {
      return '';
    }
  };

  const isHtmlResponse = useMemo(() => {
    if (!response) return false;
    const ct = response.headers?.['content-type'] || response.headers?.['Content-Type'] || '';
    if (typeof ct === 'string' && ct.toLowerCase().includes('text/html')) return true;
    if (typeof response.data === 'string' && /<(!doctype|html|head|body)[^>]*>/i.test(response.data)) {
      return true;
    }
    return false;
  }, [response]);

  const mediaItems = useMemo(() => {
    if (!response) return [];
    return extractMediaItems(response.data, endpointUrl);
  }, [response, endpointUrl]);

  const handleCopyJson = () => {
    if (!response?.data) return;
    const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!response?.data) return;
    const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (api.slug || 'api-response') + '-result.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyTypes = () => {
    if (!response?.data) return;
    const code = typesDisplayMode === 'typescript'
      ? generateTypeScriptTypes(response.data, api.name || 'ApiResponse')
      : generateJsonSchema(response.data);
    navigator.clipboard.writeText(code);
    setCopiedTypes(true);
    setTimeout(() => setCopiedTypes(false), 2000);
  };

  const handleCopyErrorReport = () => {
    if (!response) return;
    const diag = getErrorDiagnostics(response.status_code, response.error);
    const report = [
      '--- FreeAPIHub Error Report ---',
      'API: ' + api.name + ' (' + (api.slug || '') + ')',
      'Endpoint: ' + endpointUrl,
      'Status: ' + response.status_code,
      'Error: ' + (response.error || 'N/A'),
      'Diagnosis: ' + diag.title,
      'Description: ' + diag.description,
      'Troubleshooting: ' + diag.tips.join('; '),
      'Latency: ' + response.latency_ms + 'ms',
      'Timestamp: ' + new Date().toISOString()
    ].join('\n');
    navigator.clipboard.writeText(report);
    setCopiedError(true);
    setTimeout(() => setCopiedError(false), 2000);
  };

  const generatedTypesCode = useMemo(() => {
    if (!response?.data) return '';
    return typesDisplayMode === 'typescript'
      ? generateTypeScriptTypes(response.data, api.name || 'ApiResponse')
      : generateJsonSchema(response.data);
  }, [response?.data, typesDisplayMode, api.name]);

  const filteredJsonContent = useMemo(() => {
    if (!response?.data) return '';
    const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    if (!jsonSearchQuery.trim()) return raw;
    try {
      const lines = raw.split('\n');
      const filtered = lines.filter((line) =>
        line.toLowerCase().includes(jsonSearchQuery.toLowerCase())
      );
      return filtered.length > 0 ? filtered.join('\n') : '// No lines matched: "' + jsonSearchQuery + '"\n' + raw;
    } catch {
      return raw;
    }
  }, [response?.data, jsonSearchQuery]);

  const flattenedTableData = useMemo(() => {
    if (!response?.data || typeof response.data !== 'object') return [];
    const res: Array<{ key: string; type: string; value: string }> = [];
    const traverse = (obj: Record<string, unknown>, prefix = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? prefix + '.' + k : k;
        if (v === null) {
          res.push({ key: fullKey, type: 'null', value: 'null' });
        } else if (Array.isArray(v)) {
          res.push({ key: fullKey, type: 'array[' + v.length + ']', value: JSON.stringify(v.slice(0, 3)) + (v.length > 3 ? '...' : '') });
        } else if (typeof v === 'object') {
          traverse(v as Record<string, unknown>, fullKey);
        } else {
          res.push({ key: fullKey, type: typeof v, value: String(v) });
        }
      }
    };
    try {
      traverse(response.data as Record<string, unknown>);
    } catch {
      return [];
    }
    return res.slice(0, 100);
  }, [response?.data]);

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

              {!isUnified && onSetViewLayout && (
                <div className="flex items-center bg-surface p-0.5 rounded-xl border border-border ml-1">
                <button
                  type="button"
                  onClick={() => onSetViewLayout('split')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'split' ? 'bg-accent text-background font-bold shadow-sm' : 'text-text-muted hover:text-text-base'
                  }`}
                  title="Side-by-side Split View"
                >
                  <Columns className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onSetViewLayout('focus')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'focus' ? 'bg-accent text-background font-bold shadow-sm' : 'text-text-muted hover:text-text-base'
                  }`}
                  title="Full Width Focus View"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onSetViewLayout('stacked')}
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
                  onSelectHistoryItem(item);
                  setActiveResponseTab('json');
                }}
                onReRun={(item) => {
                  onSelectHistoryItem(item);
                  onRunTest(item.url, item.method, item.body);
                }}
                onClear={() => {
                  onClearHistory();
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
                          type="button"
                          onClick={() => onRunTest()}
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
                    setEndpointUrl?.(url);
                    onRunTest(url);
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
                    type="button"
                    onClick={() => onRunTest()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-xs transition-all shadow-md shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>Run Sample Request</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15 font-normal ml-0.5">
                      ⌘↵
                    </span>
                  </button>

                  {presets[0] && onSelectPreset && (
                    <button
                      type="button"
                      onClick={() => onSelectPreset(presets[0])}
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
