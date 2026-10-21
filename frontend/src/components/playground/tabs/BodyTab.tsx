import React, { useMemo, useState, useRef } from 'react';
import { Sparkles, Trash2, Check, AlertCircle, FileCode, Copy } from 'lucide-react';

export interface BodyTabProps {
  requestBody: string;
  onSetRequestBody: (val: string) => void;
  isUnified?: boolean;
}

export const BodyTab: React.FC<BodyTabProps> = ({
  requestBody,
  onSetRequestBody,
  isUnified = true
}) => {
  const [copiedFormat, setCopiedFormat] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Line count calculation
  const lines = useMemo(() => {
    const count = requestBody.split('\n').length;
    return Array.from({ length: Math.max(count, 1) }, (_, i) => i + 1);
  }, [requestBody]);

  // Validation
  const validation = useMemo(() => {
    if (!requestBody.trim()) {
      return { isValid: true, isEmpty: true, error: null };
    }
    try {
      JSON.parse(requestBody);
      return { isValid: true, isEmpty: false, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
      return { isValid: false, isEmpty: false, error: msg };
    }
  }, [requestBody]);

  // Payload byte size
  const byteSize = useMemo(() => {
    if (!requestBody.trim()) return '0 B';
    const bytes = new TextEncoder().encode(requestBody).length;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [requestBody]);

  const handleFormatJson = () => {
    if (!requestBody.trim()) return;
    try {
      const parsed = JSON.parse(requestBody);
      onSetRequestBody(JSON.stringify(parsed, null, 2));
      setCopiedFormat(true);
      setTimeout(() => setCopiedFormat(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyBody = () => {
    if (!requestBody) return;
    navigator.clipboard.writeText(requestBody);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onSetRequestBody(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleApplyTemplate = (type: 'query' | 'object' | 'batch' | 'empty') => {
    switch (type) {
      case 'query':
        onSetRequestBody(
          JSON.stringify(
            {
              query: 'weather data',
              limit: 10,
              filter: { active: true }
            },
            null,
            2
          )
        );
        break;
      case 'object':
        onSetRequestBody(
          JSON.stringify(
            {
              name: 'Sample Entity',
              status: 'active',
              tags: ['api', 'demo'],
              metadata: { timestamp: new Date().toISOString() }
            },
            null,
            2
          )
        );
        break;
      case 'batch':
        onSetRequestBody(
          JSON.stringify(
            [
              { id: 1, action: 'create' },
              { id: 2, action: 'update' }
            ],
            null,
            2
          )
        );
        break;
      case 'empty':
        onSetRequestBody('{\n  \n}');
        break;
    }
  };

  return (
    <div
      className={`${
        isUnified
          ? 'flex-1 flex flex-col h-full overflow-hidden'
          : 'bg-surface rounded-2xl flex flex-col min-h-[480px] h-[540px] overflow-hidden shadow-sm transition-colors'
      }`}
    >
      {/* Sleek Action Toolbar (No redundant title banner) */}
      <div className="px-3 sm:px-4 py-2 border-b border-border bg-surface-elevated/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: Status & Quick Templates */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* JSON Syntax Status Indicator */}
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-medium flex items-center gap-1.5 ${
              validation.isEmpty
                ? 'bg-surface-elevated/60 text-text-muted border-border'
                : validation.isValid
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                validation.isEmpty
                  ? 'bg-text-muted/40'
                  : validation.isValid
                    ? 'bg-emerald-400'
                    : 'bg-rose-400'
              }`}
            />
            <span>
              {validation.isEmpty
                ? 'Empty Body'
                : validation.isValid
                  ? 'Valid JSON'
                  : 'Invalid JSON'}
            </span>
          </span>

          <span className="text-border hidden sm:inline">|</span>

          <span className="text-[10px] font-mono uppercase text-text-muted/60 font-semibold hidden sm:inline">
            Templates:
          </span>
          <button
            type="button"
            onClick={() => handleApplyTemplate('query')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base border border-border/50 hover:border-border transition-colors cursor-pointer"
          >
            + Query
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('object')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base border border-border/50 hover:border-border transition-colors cursor-pointer"
          >
            + Object
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('batch')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base border border-border/50 hover:border-border transition-colors cursor-pointer"
          >
            + Batch
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('empty')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base border border-border/50 hover:border-border transition-colors cursor-pointer"
          >
            + Empty ({'{}'})
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Format JSON */}
          <button
            type="button"
            onClick={handleFormatJson}
            disabled={!requestBody.trim()}
            className="text-[11px] font-mono text-text-muted hover:text-text-base disabled:opacity-40 flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface hover:bg-surface-elevated border border-border transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Prettify JSON indentation"
          >
            {copiedFormat ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Sparkles className="h-3 w-3 text-accent" />
            )}
            <span>{copiedFormat ? 'Formatted' : 'Format'}</span>
          </button>

          {/* Copy Payload */}
          {Boolean(requestBody.trim()) && (
            <button
              type="button"
              onClick={handleCopyBody}
              className="text-[11px] font-mono text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface hover:bg-surface-elevated border border-border transition-colors cursor-pointer"
              title="Copy body to clipboard"
            >
              {copiedBody ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 text-text-muted" />
              )}
              <span>{copiedBody ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {/* Clear Body */}
          {Boolean(requestBody.trim()) && (
            <button
              type="button"
              onClick={() => onSetRequestBody('')}
              className="text-[11px] font-mono text-text-muted hover:text-rose-400 px-2 py-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1"
              title="Clear request body"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body Editor Area with Line Numbers */}
      <div className="flex-1 flex overflow-hidden relative bg-surface/50">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="w-11 py-3 pr-2.5 select-none overflow-hidden text-right font-mono text-xs text-text-muted/40 border-r border-border/50 bg-surface-elevated/20 leading-6 shrink-0"
          aria-hidden="true"
        >
          {lines.map((num) => (
            <div key={num} className="h-6 leading-6">
              {num}
            </div>
          ))}
        </div>

        {/* Textarea Editor */}
        <textarea
          ref={textareaRef}
          value={requestBody}
          onChange={(e) => onSetRequestBody(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          placeholder="// Enter JSON request body or pick a template above&#10;{&#10;  &#10;}"
          spellCheck={false}
          className="flex-1 h-full w-full bg-transparent p-3 text-xs font-mono text-text-base placeholder:text-text-muted/30 focus:outline-none resize-none leading-6 whitespace-pre overflow-auto"
        />
      </div>

      {/* Footer Info Bar */}
      <div className="px-4 py-2 border-t border-border bg-surface-elevated/40 flex items-center justify-between text-xs font-mono text-text-muted shrink-0">
        <div className="flex items-center gap-2 text-[11px] min-w-0">
          <FileCode className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <span className="shrink-0">application/json</span>
          {validation.error && (
            <span className="text-rose-400 flex items-center gap-1 ml-2 truncate">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">{validation.error}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-[11px] shrink-0">
          <span>{lines.length} {lines.length === 1 ? 'line' : 'lines'}</span>
          <span>•</span>
          <span>{requestBody.length} chars</span>
          <span>•</span>
          <span>{byteSize}</span>
        </div>
      </div>
    </div>
  );
};
