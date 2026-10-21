import React, { useState, useMemo } from 'react';
import { ProxyResponse } from '../../../types/api';
import { Search, Copy, Check, Zap, FileText } from 'lucide-react';

export interface ResponseHeadersTabProps {
  response: ProxyResponse | null;
  isLoading: boolean;
  onRunTest: () => void;
  isUnified?: boolean;
}

export const ResponseHeadersTab: React.FC<ResponseHeadersTabProps> = ({
  response,
  isLoading,
  onRunTest,
  isUnified = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedHeaderKey, setCopiedHeaderKey] = useState<string | null>(null);

  const headersList = useMemo(() => {
    if (!response?.headers) return [];
    return Object.entries(response.headers);
  }, [response?.headers]);

  const filteredHeaders = useMemo(() => {
    if (!searchQuery.trim()) return headersList;
    const q = searchQuery.toLowerCase();
    return headersList.filter(([k, v]) =>
      k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
    );
  }, [headersList, searchQuery]);

  const handleCopyAll = () => {
    if (headersList.length === 0) return;
    const text = headersList.map(([k, v]) => `${k}: ${v}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (key: string, value: string) => {
    navigator.clipboard.writeText(`${key}: ${value}`);
    setCopiedHeaderKey(key);
    setTimeout(() => setCopiedHeaderKey(null), 1500);
  };

  const renderFormattedValue = (key: string, value: string) => {
    const valLower = value.toLowerCase();
    const keyLower = key.toLowerCase();

    // Cache status badges
    if (keyLower.includes('cache') && (valLower === 'hit' || valLower.includes('hit'))) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {value}
        </span>
      );
    }
    if (keyLower.includes('cache') && (valLower === 'miss' || valLower.includes('miss'))) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {value}
        </span>
      );
    }

    // Content-Type highlight
    if (keyLower === 'content-type') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">
          {value}
        </span>
      );
    }

    // JSON formatted string
    if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
      try {
        const parsed = JSON.parse(value);
        return (
          <span className="inline-block p-1.5 rounded-md bg-black/30 text-amber-300 font-mono text-[11px] max-w-xl break-all">
            {JSON.stringify(parsed, null, 1)}
          </span>
        );
      } catch {
        // fallback
      }
    }

    return <span className="text-slate-200 select-all break-all">{value}</span>;
  };

  return (
    <div
      className={`${
        isUnified
          ? 'flex-1 flex flex-col h-full overflow-hidden'
          : 'bg-surface rounded-2xl flex flex-col min-h-[480px] h-[540px] overflow-hidden shadow-sm transition-colors'
      }`}
    >
      {/* Sleek Action Toolbar */}
      <div className="px-3 sm:px-4 py-2 border-b border-border bg-surface-elevated/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: Search Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="flex items-center bg-surface-elevated/80 px-2.5 py-1 rounded-lg gap-1.5 w-full">
            <Search className="h-3 w-3 text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Filter headers (name or value)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs font-mono outline-none text-text-base placeholder:text-text-muted/50 w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-text-muted hover:text-text-base cursor-pointer px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Tools: Count Chip & Copy All */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded bg-surface-elevated/70">
            {filteredHeaders.length} of {headersList.length} headers
          </span>

          {headersList.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="text-xs text-text-muted hover:text-text-base flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface-elevated transition-colors cursor-pointer"
              title="Copy all response headers"
            >
              {copiedAll ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="font-mono text-[11px]">
                {copiedAll ? 'Copied' : 'Copy All'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Headers Table Area */}
      <div className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-xs bg-surface dark:bg-[#131416] text-text-base transition-colors">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            <p className="text-xs font-medium font-sans">Reading response headers...</p>
          </div>
        ) : headersList.length > 0 ? (
          <div className="space-y-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-text-muted text-[10px] uppercase font-mono tracking-wider">
                    <th className="py-2.5 px-3 font-semibold w-1/4 min-w-[160px]">HEADER</th>
                    <th className="py-2.5 px-3 font-semibold">VALUE</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-16">ACTION</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {filteredHeaders.map(([key, value]) => (
                    <tr
                      key={key}
                      className="group hover:bg-surface-elevated/40 transition-colors rounded-lg border-b border-white/[0.03] last:border-b-0"
                    >
                      <td className="py-2.5 px-3 text-sky-400 dark:text-sky-300 font-medium whitespace-nowrap align-top select-all">
                        {key}
                      </td>
                      <td className="py-2.5 px-3 text-text-base break-all align-top leading-relaxed">
                        {renderFormattedValue(key, String(value))}
                      </td>
                      <td className="py-2.5 px-3 text-right align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopySingle(key, String(value))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] p-1.5 rounded-md bg-surface-elevated hover:bg-surface text-text-muted hover:text-text-base inline-flex items-center gap-1 cursor-pointer"
                          title={`Copy ${key}: ${value}`}
                        >
                          {copiedHeaderKey === key ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredHeaders.length === 0 && (
              <p className="text-center py-10 text-xs text-text-muted font-sans">
                No headers match &quot;{searchQuery}&quot;
              </p>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4 font-sans py-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <FileText className="h-6 w-6" />
            </div>

            <div className="space-y-1 max-w-sm">
              <p className="font-bold text-text-base text-sm">No Response Headers</p>
              <p className="text-xs text-text-muted">
                Execute a request to view HTTP response headers returned by the upstream server.
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
