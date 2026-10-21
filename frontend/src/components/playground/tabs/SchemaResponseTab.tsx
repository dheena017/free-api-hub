import React, { useState, useMemo } from 'react';
import { ProxyResponse } from '../../../types/api';
import { Search, Copy, Check, Zap, FileSpreadsheet, Download } from 'lucide-react';

export interface SchemaResponseTabProps {
  response: ProxyResponse | null;
  isLoading: boolean;
  onRunTest: () => void;
  isUnified?: boolean;
}

export const SchemaResponseTab: React.FC<SchemaResponseTabProps> = ({
  response,
  isLoading,
  onRunTest,
  isUnified = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const flattenedTableData = useMemo(() => {
    if (!response?.data || typeof response.data !== 'object') return [];
    const res: Array<{ key: string; type: string; value: string }> = [];
    const traverse = (obj: Record<string, unknown>, prefix = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? prefix + '.' + k : k;
        if (v === null) {
          res.push({ key: fullKey, type: 'null', value: 'null' });
        } else if (Array.isArray(v)) {
          res.push({
            key: fullKey,
            type: 'array[' + v.length + ']',
            value: JSON.stringify(v.slice(0, 3)) + (v.length > 3 ? '...' : '')
          });
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
    return res;
  }, [response?.data]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return flattenedTableData;
    const q = searchQuery.toLowerCase();
    return flattenedTableData.filter(
      (item) =>
        item.key.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
    );
  }, [flattenedTableData, searchQuery]);

  const handleCopyAll = () => {
    if (flattenedTableData.length === 0) return;
    const text = JSON.stringify(flattenedTableData, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownload = () => {
    if (flattenedTableData.length === 0) return;
    const text = JSON.stringify(flattenedTableData, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedKey(path);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const renderTypeBadge = (type: string) => {
    if (type.startsWith('array')) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 font-semibold">
          {type}
        </span>
      );
    }
    if (type === 'string') {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold">
          string
        </span>
      );
    }
    if (type === 'number') {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-semibold">
          number
        </span>
      );
    }
    if (type === 'boolean') {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 font-semibold">
          boolean
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted font-medium">
        {type}
      </span>
    );
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
              placeholder="Filter properties (path, type, value)..."
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

        {/* Right Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded bg-surface-elevated/70">
            {filteredData.length} of {flattenedTableData.length} properties
          </span>

          {flattenedTableData.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyAll}
                className="text-xs text-text-muted hover:text-text-base flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Copy schema JSON"
              >
                {copiedAll ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="font-mono text-[11px]">{copiedAll ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Export schema JSON"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="font-mono text-[11px] hidden sm:inline">Export</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Schema Table Area */}
      <div className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-xs bg-surface dark:bg-[#131416] text-text-base transition-colors">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            <p className="text-xs font-medium font-sans">Analyzing payload schema structure...</p>
          </div>
        ) : flattenedTableData.length > 0 ? (
          <div className="space-y-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-text-muted text-[10px] uppercase font-mono tracking-wider">
                    <th className="py-2.5 px-3 font-semibold w-1/4 min-w-[160px]">PROPERTY PATH</th>
                    <th className="py-2.5 px-3 font-semibold w-28">TYPE</th>
                    <th className="py-2.5 px-3 font-semibold">SAMPLE VALUE</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-16"></th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {filteredData.map((row, idx) => (
                    <tr
                      key={idx}
                      className="group hover:bg-surface-elevated/40 transition-colors rounded-lg border-b border-white/[0.03] last:border-b-0"
                    >
                      <td className="py-2.5 px-3 text-sky-400 dark:text-sky-300 font-medium whitespace-nowrap align-top select-all">
                        {row.key || '(root)'}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        {renderTypeBadge(row.type)}
                      </td>
                      <td className="py-2.5 px-3 text-text-base break-all align-top max-w-md select-all leading-relaxed">
                        {row.value}
                      </td>
                      <td className="py-2.5 px-3 text-right align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopyPath(row.key)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] p-1.5 rounded-md bg-surface-elevated hover:bg-surface text-text-muted hover:text-text-base inline-flex items-center gap-1 cursor-pointer"
                          title="Copy property path"
                        >
                          {copiedKey === row.key ? (
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

            {filteredData.length === 0 && (
              <p className="text-center py-10 text-xs text-text-muted font-sans">
                No properties match &quot;{searchQuery}&quot;
              </p>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4 font-sans py-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <FileSpreadsheet className="h-6 w-6" />
            </div>

            <div className="space-y-1 max-w-sm">
              <p className="font-bold text-text-base text-sm">No Schema Data Available</p>
              <p className="text-xs text-text-muted">
                Run an API request to extract and view the flattened property hierarchy, data types, and values.
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
