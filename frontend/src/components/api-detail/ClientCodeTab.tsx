import React, { useState, useMemo } from 'react';
import { Code2, Copy, Check, Download, Zap, Terminal, Layers } from 'lucide-react';
import { ApiItem } from '../../types/api';
import {
  generateSnippetForLanguage,
  SnippetLanguage,
  SUPPORTED_LANGUAGES,
  POPULAR_LANG_LIST
} from '../../utils/codeSnippets';
import { CodeSnippetViewer } from '../viewers/CodeSnippetViewer';

export interface ClientCodeTabProps {
  api: ApiItem;
  currentEndpoint?: string;
  currentMethod?: string;
  currentParams?: Record<string, string>;
  currentBody?: string;
  onOpenPlayground: (endpoint?: string, method?: string) => void;
}

export const ClientCodeTab: React.FC<ClientCodeTabProps> = ({
  api,
  currentEndpoint,
  currentMethod,
  currentParams = {},
  currentBody,
  onOpenPlayground
}) => {
  const [activeLang, setActiveLang] = useState<SnippetLanguage>('curl');
  const [copied, setCopied] = useState(false);

  // Endpoint Selection State
  const endpoints = api.endpoints && api.endpoints.length > 0 ? api.endpoints : [];
  const defaultEndpoint = endpoints[0]?.path || api.base_url;
  const [selectedEndpointPath, setSelectedEndpointPath] = useState<string>(
    currentEndpoint || defaultEndpoint
  );

  const matchedEndpoint = endpoints.find((e) => e.path === selectedEndpointPath);
  const activeMethod = currentMethod || matchedEndpoint?.method || 'GET';

  // Construct full target URL
  const targetUrl = useMemo(() => {
    if (selectedEndpointPath.startsWith('http://') || selectedEndpointPath.startsWith('https://')) {
      return selectedEndpointPath;
    }
    const base = api.base_url.replace(/\/+$/, '');
    const path = selectedEndpointPath.replace(/^\/+/, '');
    return path ? `${base}/${path}` : base;
  }, [api.base_url, selectedEndpointPath]);

  // Compute code snippet
  const snippetCode = useMemo(() => {
    return generateSnippetForLanguage(
      activeLang,
      targetUrl,
      activeMethod,
      currentParams,
      {},
      currentBody
    );
  }, [activeLang, targetUrl, activeMethod, currentParams, currentBody]);

  const handleCopy = () => {
    navigator.clipboard.writeText(snippetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      curl: 'sh',
      js: 'js',
      axios: 'js',
      ts: 'ts',
      python: 'py',
      'python-async': 'py',
      go: 'go',
      php: 'php',
      ruby: 'rb',
      java: 'java',
      csharp: 'cs',
      rust: 'rs',
      swift: 'swift',
      dart: 'dart'
    };
    const ext = extMap[activeLang] || 'txt';
    const blob = new Blob([snippetCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${api.slug || 'api'}-request.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPopular = POPULAR_LANG_LIST.some((l) => l.id === activeLang);
  const additionalLanguages = SUPPORTED_LANGUAGES.filter(
    (l) => !POPULAR_LANG_LIST.some((p) => p.id === l.id)
  );

  return (
    <section
      role="tabpanel"
      id="tabpanel-client-code"
      aria-labelledby="tab-client-code"
      className="space-y-4 animate-in fade-in duration-200"
    >
      {/* Tab Header Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-xl bg-accent/10 text-accent border border-accent/20 shrink-0">
            <Code2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-text-base">{api.name} Client Code & SDKs</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted border border-border uppercase">
                {activeMethod}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 max-w-2xl">
              Production-ready client snippets in 14+ languages and frameworks. Copy or export to kickstart your integration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-elevated hover:bg-surface text-text-base border border-border hover:border-accent/40 transition-all cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-text-muted" />
            )}
            <span>{copied ? 'Copied' : 'Copy Snippet'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-elevated hover:bg-surface text-text-base border border-border hover:border-accent/40 transition-all cursor-pointer"
            title="Download code file"
          >
            <Download className="h-3.5 w-3.5 text-text-muted" />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenPlayground(selectedEndpointPath, activeMethod)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-background bg-accent hover:bg-accent-hover transition-all shadow-sm cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Test in Playground</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Endpoint Selector if API has multiple endpoints */}
        {endpoints.length > 0 && (
          <div className="space-y-2 pb-4 border-b border-border">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Select Endpoint Target:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {endpoints.map((ep) => {
                const isSelected = selectedEndpointPath === ep.path;
                return (
                  <button
                    key={`${ep.method}-${ep.path}`}
                    type="button"
                    onClick={() => setSelectedEndpointPath(ep.path)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-accent/15 border-accent text-accent font-bold'
                        : 'bg-surface-elevated text-text-muted hover:text-text-base border-border hover:border-border-light'
                    }`}
                  >
                    <span className="uppercase text-[10px] font-bold opacity-80">{ep.method}</span>
                    <span>{ep.path}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Language Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {POPULAR_LANG_LIST.map((lang) => {
              const isActive = activeLang === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setActiveLang(lang.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                      : 'bg-surface-elevated text-text-muted hover:text-text-base hover:bg-surface border border-border'
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}

            {/* More Languages Dropdown */}
            <div className="relative inline-block">
              <select
                aria-label="More programming languages"
                value={isPopular ? '' : activeLang}
                onChange={(e) => {
                  if (e.target.value) {
                    setActiveLang(e.target.value as SnippetLanguage);
                  }
                }}
                className={`text-xs font-mono px-3 py-1.5 rounded-xl border transition-colors cursor-pointer appearance-none pr-7 bg-surface-elevated ${
                  !isPopular
                    ? 'border-accent bg-accent/15 text-accent font-semibold'
                    : 'border-border text-text-muted hover:text-text-base hover:border-border-light'
                }`}
              >
                <option value="" disabled>
                  {isPopular ? 'More SDKs (8)...' : SUPPORTED_LANGUAGES.find((l) => l.id === activeLang)?.label}
                </option>
                {additionalLanguages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="font-mono text-xs text-text-muted truncate max-w-md">
            <span>Target: </span>
            <span className="text-accent">{targetUrl}</span>
          </div>
        </div>

        {/* Code Snippet Viewer */}
        <div className="rounded-xl border border-border overflow-hidden bg-surface-elevated/40 min-h-[420px]">
          <CodeSnippetViewer
            code={snippetCode}
            language={
              activeLang === 'curl'
                ? 'curl'
                : ['js', 'axios', 'ts'].includes(activeLang)
                  ? 'javascript'
                  : activeLang.includes('python')
                    ? 'python'
                    : activeLang === 'go'
                      ? 'go'
                      : 'text'
            }
            showLineNumbers={true}
          />
        </div>
      </div>
    </section>
  );
};
