import React, { useState, useMemo } from 'react';
import { Terminal, X, Copy, Check, Download, Code2, Globe } from 'lucide-react';
import { ApiItem } from '../../types/api';
import {
  generateSnippetForLanguage,
  SnippetLanguage,
  SUPPORTED_LANGUAGES,
  POPULAR_LANG_LIST
} from '../../utils/codeSnippets';
import { CodeSnippetViewer } from '../viewers/CodeSnippetViewer';

export interface ClientCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  api: ApiItem;
  endpointUrl: string;
  method: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
}

export const ClientCodeModal: React.FC<ClientCodeModalProps> = ({
  isOpen,
  onClose,
  api,
  endpointUrl,
  method,
  params = {},
  headers = {},
  body
}) => {
  const [activeLang, setActiveLang] = useState<SnippetLanguage>('curl');
  const [copied, setCopied] = useState(false);

  const snippetCode = useMemo(() => {
    return generateSnippetForLanguage(
      activeLang,
      endpointUrl,
      method,
      params,
      headers,
      body
    );
  }, [activeLang, endpointUrl, method, params, headers, body]);

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

  if (!isOpen) return null;

  const isPopular = POPULAR_LANG_LIST.some((l) => l.id === activeLang);
  const additionalLanguages = SUPPORTED_LANGUAGES.filter(
    (l) => !POPULAR_LANG_LIST.some((p) => p.id === l.id)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-code-modal-title"
    >
      <div
        className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="client-code-modal-title" className="text-base font-bold text-text-base">
                  {api.name} Client Code & SDKs
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted border border-border uppercase">
                  {method}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Ready-to-use production snippets in 12+ programming languages.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Language Tabs Row */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {POPULAR_LANG_LIST.map((lang) => {
              const isActive = activeLang === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setActiveLang(lang.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                      : 'bg-surface-elevated text-text-muted hover:text-text-base hover:bg-surface border border-border'
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}

            {/* Additional Languages Dropdown */}
            <div className="relative inline-block">
              <select
                aria-label="More programming languages"
                value={isPopular ? '' : activeLang}
                onChange={(e) => {
                  if (e.target.value) {
                    setActiveLang(e.target.value as SnippetLanguage);
                  }
                }}
                className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-colors cursor-pointer appearance-none pr-6 bg-surface-elevated ${
                  !isPopular
                    ? 'border-accent bg-accent/15 text-accent font-semibold'
                    : 'border-border text-text-muted hover:text-text-base hover:border-border-light'
                }`}
              >
                <option value="" disabled>
                  {isPopular ? 'More (6)...' : SUPPORTED_LANGUAGES.find((l) => l.id === activeLang)?.label}
                </option>
                {additionalLanguages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-elevated hover:bg-surface border border-border transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-text-muted" />
              )}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-elevated hover:bg-surface border border-border transition-colors cursor-pointer"
              title="Download code file"
            >
              <Download className="h-3.5 w-3.5 text-text-muted" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Code Snippet Viewer */}
        <div className="flex-1 min-h-[300px] max-h-[460px] overflow-hidden rounded-xl border border-border bg-surface-elevated/40">
          <CodeSnippetViewer
            code={snippetCode}
            language={
              activeLang === 'curl'
                ? 'curl'
                : ['js', 'axios', 'ts'].includes(activeLang)
                  ? 'javascript'
                  : activeLang.includes('python')
                    ? 'python'
                    : 'text'
            }
            showLineNumbers={true}
          />
        </div>

        {/* Footer */}
        <div className="pt-3 flex items-center justify-between border-t border-border shrink-0 text-xs text-text-muted">
          <div className="font-mono text-[11px] truncate max-w-md">
            <span>Target: </span>
            <span className="text-text-base">{endpointUrl}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold transition-all shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
