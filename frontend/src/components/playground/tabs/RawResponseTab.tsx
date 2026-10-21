import React, { useState, useMemo } from 'react';
import { ProxyResponse } from '../../../types/api';
import { CodeSnippetViewer } from '../../viewers/CodeSnippetViewer';
import { Copy, Check, Clock, Download, Zap, WrapText } from 'lucide-react';

export interface RawResponseTabProps {
  response: ProxyResponse | null;
  isLoading: boolean;
  onRunTest: () => void;
  isUnified?: boolean;
}

export const RawResponseTab: React.FC<RawResponseTabProps> = ({
  response,
  isLoading,
  onRunTest,
  isUnified = true
}) => {
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);

  const rawText = useMemo(() => {
    if (!response?.data) return '';
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data, null, 2);
  }, [response?.data]);

  const lineCount = useMemo(() => {
    if (!rawText) return 0;
    return rawText.split('\n').length;
  }, [rawText]);

  const handleCopyRaw = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handleDownload = () => {
    if (!rawText) return;
    const isJson = rawText.trim().startsWith('{') || rawText.trim().startsWith('[');
    const blob = new Blob([rawText], {
      type: isJson ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response_${Date.now()}.${isJson ? 'json' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`${
        isUnified
          ? 'flex-1 flex flex-col h-full overflow-hidden'
          : 'bg-surface rounded-2xl flex flex-col min-h-[480px] h-[540px] overflow-hidden shadow-sm transition-colors'
      }`}
    >
      {/* Sleek Action Toolbar (No duplicate title) */}
      <div className="px-3 sm:px-4 py-2 border-b border-border bg-surface-elevated/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {rawText && (
            <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded bg-surface-elevated/70">
              {rawText.length.toLocaleString()} chars • {lineCount} lines
            </span>
          )}

          {response && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                  response.status_code >= 200 && response.status_code < 300
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                <span>{response.status_code}</span>
              </span>

              <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {response.latency_ms} ms
              </span>
            </div>
          )}
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Boolean(rawText) && (
            <>
              <button
                type="button"
                onClick={() => setWrapLines(!wrapLines)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  wrapLines
                    ? 'bg-accent text-background font-bold shadow-sm'
                    : 'bg-surface-elevated/80 hover:bg-surface-elevated text-text-muted hover:text-text-base'
                }`}
                title="Toggle line wrapping"
              >
                <WrapText className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCopyRaw}
                className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Copy raw response"
              >
                {copiedRaw ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline font-mono text-[11px]">
                  {copiedRaw ? 'Copied' : 'Copy'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Download raw file"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline font-mono text-[11px]">Export</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Raw Code View - Full Bleed Canvas */}
      <div className="flex-1 overflow-auto font-mono text-xs bg-[#16181D] text-text-base transition-colors">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            <p className="text-xs font-medium font-sans">Receiving raw byte stream...</p>
          </div>
        ) : rawText ? (
          <div className={`h-full ${wrapLines ? 'whitespace-pre-wrap break-all' : ''}`}>
            <CodeSnippetViewer
              code={rawText}
              language={rawText.trim().startsWith('{') || rawText.trim().startsWith('[') ? 'json' : 'text'}
              showLineNumbers={true}
              showCopyButton={false}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4 font-sans py-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Zap className="h-6 w-6" />
            </div>

            <div className="space-y-1 max-w-sm">
              <p className="font-bold text-text-base text-sm">No Raw Response Yet</p>
              <p className="text-xs text-text-muted">
                Send a test request to inspect the exact unparsed text returned by the server.
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
