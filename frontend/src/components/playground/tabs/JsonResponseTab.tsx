import React, { useState, useMemo } from 'react';
import { ProxyResponse } from '../../../types/api';
import { JsonTreeViewer } from '../../viewers/JsonTreeViewer';
import { CodeSnippetViewer } from '../../viewers/CodeSnippetViewer';
import {
  Search,
  Copy,
  Check,
  Download,
  Clock,
  FileCode,
  ArrowRight,
  Zap,
  AlertCircle,
  HelpCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';

function getErrorDiagnostics(statusCode: number, errorMessage?: string | null) {
  if (statusCode === 404) {
    return {
      title: 'Resource Not Found (404)',
      badge: 'Client Error',
      badgeColor: 'text-amber-400 bg-amber-500/10',
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
      badgeColor: 'text-rose-400 bg-rose-500/10',
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
      badgeColor: 'text-orange-400 bg-orange-500/10',
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
      badgeColor: 'text-rose-400 bg-rose-500/10',
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
    badgeColor: 'text-rose-400 bg-rose-500/10',
    description: errorMessage || 'An unexpected response was returned by the upstream service.',
    tips: [
      'Verify request URL and method (GET, POST, etc.).',
      'Check if the remote host supports CORS or needs proxy relay.'
    ]
  };
}

export interface JsonResponseTabProps {
  response: ProxyResponse | null;
  isLoading: boolean;
  onRunTest: () => void;
  onSwitchToPreview?: () => void;
  isUnified?: boolean;
}

export const JsonResponseTab: React.FC<JsonResponseTabProps> = ({
  response,
  isLoading,
  onRunTest,
  onSwitchToPreview,
  isUnified = true
}) => {
  const [jsonDisplayMode, setJsonDisplayMode] = useState<'tree' | 'raw'>('tree');
  const [jsonSearchQuery, setJsonSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedError, setCopiedError] = useState(false);
  const [expandAllTrigger, setExpandAllTrigger] = useState(0);
  const [collapseAllTrigger, setCollapseAllTrigger] = useState(0);

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
    if (typeof ct === 'string' && (ct.toLowerCase().includes('text/html') || ct.toLowerCase().includes('application/xhtml+xml'))) {
      return true;
    }
    if (typeof response.data === 'string') {
      const trimmed = response.data.trim().toLowerCase();
      if (/<(!doctype|html|head|body)[^>]*>/i.test(trimmed)) return true;
      if (/^<(div|p|span|table|ul|ol|h[1-6]|section|article|header|footer|form)[\s>]/i.test(trimmed) && trimmed.includes('</')) {
        return true;
      }
    }
    return false;
  }, [response]);

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
    a.download = `response_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredJsonContent = useMemo(() => {
    if (!response?.data) return '';
    const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    if (!jsonSearchQuery.trim()) return raw;
    try {
      const lines = raw.split('\n');
      const filtered = lines.filter((line) =>
        line.toLowerCase().includes(jsonSearchQuery.toLowerCase())
      );
      return filtered.length > 0 ? filtered.join('\n') : `// No lines matched: "${jsonSearchQuery}"\n${raw}`;
    } catch {
      return raw;
    }
  }, [response?.data, jsonSearchQuery]);

  const rootMetaText = useMemo(() => {
    if (!response?.data) return null;
    if (Array.isArray(response.data)) {
      return `Array (${response.data.length} items)`;
    }
    if (typeof response.data === 'object' && response.data !== null) {
      return `Object (${Object.keys(response.data as object).length} root keys)`;
    }
    return typeof response.data;
  }, [response?.data]);

  return (
    <div
      className={`${
        isUnified
          ? 'flex-1 flex flex-col h-full overflow-hidden'
          : 'bg-surface rounded-2xl flex flex-col min-h-[480px] h-[540px] overflow-hidden shadow-sm transition-colors'
      }`}
    >
      {/* Sleek Unified Toolbar */}
      <div className="px-3 sm:px-4 py-2 border-b border-border bg-surface-elevated/30 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Summary & Live Telemetry Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {rootMetaText && (
            <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded bg-surface-elevated/70">
              {rootMetaText}
            </span>
          )}

          {response && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                  response.status_code >= 200 && response.status_code < 300
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : response.status_code >= 400
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                <span>{response.status_code} {response.status_code === 200 ? 'OK' : ''}</span>
              </span>

              <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {response.latency_ms} ms
              </span>

              {Boolean(response.data) && (
                <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface-elevated/70">
                  {getPayloadSize(response.data)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Tools: Segmented View, Tree Controls, Search, Copy, Export */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tree vs Plain Segmented Switcher */}
          {Boolean(response?.data) && (
            <div className="flex items-center bg-surface-elevated/80 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setJsonDisplayMode('tree')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                  jsonDisplayMode === 'tree'
                    ? 'bg-accent text-background font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                Tree
              </button>
              <button
                type="button"
                onClick={() => setJsonDisplayMode('raw')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                  jsonDisplayMode === 'raw'
                    ? 'bg-accent text-background font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                Plain
              </button>
            </div>
          )}

          {/* Quick Expand / Collapse for Tree Mode */}
          {jsonDisplayMode === 'tree' && Boolean(response?.data) && (
            <div className="flex items-center bg-surface-elevated/80 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setExpandAllTrigger((prev) => prev + 1)}
                className="px-2 py-1 rounded-md text-[10px] font-mono text-text-muted hover:text-text-base transition-colors flex items-center gap-1 cursor-pointer"
                title="Expand all tree nodes"
              >
                <Maximize2 className="h-3 w-3 text-accent" />
                <span className="hidden md:inline">Expand</span>
              </button>
              <button
                type="button"
                onClick={() => setCollapseAllTrigger((prev) => prev + 1)}
                className="px-2 py-1 rounded-md text-[10px] font-mono text-text-muted hover:text-text-base transition-colors flex items-center gap-1 cursor-pointer"
                title="Collapse all tree nodes"
              >
                <Minimize2 className="h-3 w-3 text-text-muted" />
                <span className="hidden md:inline">Collapse</span>
              </button>
            </div>
          )}

          {/* Search Toggle */}
          {Boolean(response?.data) && (
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                isSearchOpen
                  ? 'bg-accent text-background font-bold'
                  : 'bg-surface-elevated/80 hover:bg-surface-elevated text-text-muted hover:text-text-base'
              }`}
              title="Filter JSON by keyword"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Copy Button */}
          {Boolean(response?.data) && (
            <button
              type="button"
              onClick={handleCopyJson}
              className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface-elevated transition-colors cursor-pointer"
              title="Copy JSON to clipboard"
            >
              {copiedJson ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline font-mono text-[11px]">
                {copiedJson ? 'Copied' : 'Copy'}
              </span>
            </button>
          )}

          {/* Export Button */}
          {Boolean(response?.data) && (
            <button
              type="button"
              onClick={handleDownloadJson}
              className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface-elevated transition-colors cursor-pointer"
              title="Download response file"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-mono text-[11px]">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Slide-down Search Filter Bar */}
      {isSearchOpen && (
        <div className="px-3.5 py-2 bg-surface-elevated/50 border-b border-border flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-accent" />
          <input
            type="text"
            placeholder="Filter properties, keys, or values..."
            value={jsonSearchQuery}
            onChange={(e) => setJsonSearchQuery(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-transparent text-xs font-mono text-text-base outline-none placeholder:text-text-muted/50"
            autoFocus
          />
          {jsonSearchQuery && (
            <button
              type="button"
              onClick={() => setJsonSearchQuery('')}
              className="text-xs text-text-muted hover:text-text-base cursor-pointer px-1.5 py-0.5 rounded bg-surface"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Main Body Area */}
      <div className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-xs bg-surface dark:bg-[#131416] text-text-base transition-colors">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            <p className="text-xs font-medium font-sans">Executing request through proxy...</p>
          </div>
        ) : response?.error || (response?.status_code && response.status_code >= 400) ? (
          (() => {
            const diag = getErrorDiagnostics(response.status_code, response.error);
            return (
              <div className="space-y-4 font-sans max-w-2xl mx-auto py-4">
                <div className="p-4 rounded-xl bg-surface-elevated/40 text-rose-400 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2 font-semibold text-rose-400 text-xs">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>{diag.title}</span>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${diag.badgeColor}`}>
                      {diag.badge}
                    </span>
                  </div>

                  <p className="text-xs text-text-base leading-relaxed">
                    {response.error || diag.description}
                  </p>

                  <div className="bg-surface-elevated p-3 rounded-xl space-y-1.5">
                    <div className="text-[11px] font-semibold text-text-base flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-accent" />
                      <span>Troubleshooting Tips:</span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-text-muted space-y-1">
                      {diag.tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {Boolean(response.data) && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-text-muted font-mono">Server Payload:</div>
                    <CodeSnippetViewer
                      code={typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
                      language="json"
                      showLineNumbers={true}
                    />
                  </div>
                )}
              </div>
            );
          })()
        ) : response?.data ? (
          <div className="h-full flex flex-col space-y-2">
            {isHtmlResponse && onSwitchToPreview && (
              <div className="p-2.5 rounded-xl bg-accent/10 flex flex-wrap items-center justify-between gap-2 font-sans mb-1">
                <div className="flex items-center gap-2 text-text-base text-xs">
                  <FileCode className="h-4 w-4 text-accent shrink-0" />
                  <span>
                    <strong>HTML Detected:</strong> This endpoint returned rendered HTML markup.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToPreview}
                  className="px-2.5 py-1 rounded-lg bg-accent text-background font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <span>Open HTML Preview</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {jsonDisplayMode === 'tree' ? (
              <JsonTreeViewer
                data={response.data}
                searchQuery={jsonSearchQuery}
                hideHeader={true}
                expandAllTrigger={expandAllTrigger}
                collapseAllTrigger={collapseAllTrigger}
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
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4 font-sans py-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Zap className="h-6 w-6" />
            </div>

            <div className="space-y-1 max-w-sm">
              <p className="font-bold text-text-base text-sm">No Response Data Yet</p>
              <p className="text-xs text-text-muted">
                Execute a request to inspect the live response hierarchy, keys, and values.
              </p>
            </div>

            <button
              type="button"
              onClick={onRunTest}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-xs transition-all shadow-md shadow-accent/20 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Send Request</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
