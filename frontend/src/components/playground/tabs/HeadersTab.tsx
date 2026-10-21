import React from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';

export interface HeadersTabProps {
  headers: Array<{ key: string; value: string }>;
  onSetHeaders: React.Dispatch<React.SetStateAction<Array<{ key: string; value: string }>>>;
  isUnified?: boolean;
}

export const HeadersTab: React.FC<HeadersTabProps> = ({
  headers,
  onSetHeaders,
  isUnified = true
}) => {
  const handleAddHeader = (key = '', value = '') => {
    onSetHeaders((prev) => [...prev, { key, value }]);
  };

  const handleClearAll = () => {
    onSetHeaders([]);
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
        {/* Left: Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono uppercase text-text-muted/60 font-semibold mr-1">
            Presets:
          </span>
          <button
            type="button"
            onClick={() => handleAddHeader('Accept', 'application/json')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base transition-colors cursor-pointer"
          >
            + Accept: json
          </button>
          <button
            type="button"
            onClick={() => handleAddHeader('User-Agent', 'FreeApiHub/1.0')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base transition-colors cursor-pointer"
          >
            + User-Agent
          </button>
          <button
            type="button"
            onClick={() => handleAddHeader('Cache-Control', 'no-cache')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base transition-colors cursor-pointer"
          >
            + No-Cache
          </button>
        </div>

        {/* Right Tools: Add & Clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleAddHeader()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent hover:bg-accent-hover text-background font-bold text-xs shadow-sm shadow-accent/20 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Header</span>
          </button>

          {headers.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-text-muted hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Clear all custom headers"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Headers Table List - Clean, Seamless Table */}
      <div className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-xs bg-surface dark:bg-[#131416] text-text-base transition-colors">
        {headers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3.5 text-center px-4 font-sans py-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <FileText className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="font-bold text-text-base text-sm">No Custom Request Headers</p>
              <p className="text-xs text-text-muted leading-relaxed">
                Add custom HTTP headers to pass authorization tokens, user agents, or content negotiation.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => handleAddHeader('Content-Type', 'application/json')}
                className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface text-xs font-mono text-text-base transition-colors cursor-pointer"
              >
                + Content-Type: json
              </button>
              <button
                type="button"
                onClick={() => handleAddHeader('Cache-Control', 'no-cache')}
                className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface text-xs font-mono text-text-base transition-colors cursor-pointer"
              >
                + Cache-Control: no-cache
              </button>
              <button
                type="button"
                onClick={() => handleAddHeader()}
                className="px-3 py-1.5 rounded-lg bg-accent text-background font-bold text-xs font-mono shadow-sm shadow-accent/20 transition-all cursor-pointer"
              >
                + Custom Header
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-text-muted text-[10px] uppercase font-mono tracking-wider">
                    <th className="py-2 px-3 font-semibold w-1/3 min-w-[160px]">HEADER NAME</th>
                    <th className="py-2 px-3 font-semibold">VALUE</th>
                    <th className="py-2 px-3 text-right font-semibold w-14"></th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {headers.map((h, index) => (
                    <tr
                      key={index}
                      className="group hover:bg-surface-elevated/40 transition-colors border-b border-white/[0.03] last:border-b-0"
                    >
                      {/* Header Name */}
                      <td className="py-1 px-1 align-top">
                        <input
                          type="text"
                          placeholder="Header-Name"
                          value={h.key}
                          spellCheck={false}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[index].key = e.target.value;
                            onSetHeaders(updated);
                          }}
                          className="w-full bg-transparent hover:bg-surface-elevated/50 focus:bg-surface-elevated/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-400 font-semibold outline-none placeholder:text-text-muted/40 transition-colors"
                        />
                      </td>

                      {/* Header Value */}
                      <td className="py-1 px-1 align-top">
                        <input
                          type="text"
                          placeholder="Header-Value"
                          value={h.value}
                          spellCheck={false}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[index].value = e.target.value;
                            onSetHeaders(updated);
                          }}
                          className="w-full bg-transparent hover:bg-surface-elevated/50 focus:bg-surface-elevated/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-base outline-none placeholder:text-text-muted/40 transition-colors"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="py-1 px-2 text-right align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSetHeaders((prev) => prev.filter((_, i) => i !== index))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Remove header"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick append row button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleAddHeader()}
                className="text-[11px] text-text-muted hover:text-accent font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-elevated/60 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add new row</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
