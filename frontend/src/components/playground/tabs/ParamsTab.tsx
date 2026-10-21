import React from 'react';
import { Plus, Trash2, Copy, Check, SlidersHorizontal } from 'lucide-react';

export interface ParamsTabProps {
  params: Array<{ key: string; value: string }>;
  onUpdateParams: (
    updater: (prev: Array<{ key: string; value: string }>) => Array<{ key: string; value: string }>
  ) => void;
  isUnified?: boolean;
}

export const ParamsTab: React.FC<ParamsTabProps> = ({
  params,
  onUpdateParams,
  isUnified = true
}) => {
  const [copiedQuery, setCopiedQuery] = React.useState(false);

  const queryString = React.useMemo(() => {
    const valid = params.filter((p) => p.key.trim().length > 0);
    if (valid.length === 0) return '';
    const sp = new URLSearchParams();
    valid.forEach((p) => sp.set(p.key.trim(), p.value));
    return `?${sp.toString()}`;
  }, [params]);

  const handleCopyQuery = () => {
    if (!queryString) return;
    navigator.clipboard.writeText(queryString);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  const handleAddParam = (key = '', value = '') => {
    onUpdateParams((prev) => [...prev, { key, value }]);
  };

  const handleClearAll = () => {
    onUpdateParams(() => []);
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
            onClick={() => handleAddParam('limit', '10')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base transition-colors cursor-pointer"
          >
            + limit
          </button>
          <button
            type="button"
            onClick={() => handleAddParam('format', 'json')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base transition-colors cursor-pointer"
          >
            + format
          </button>
          <button
            type="button"
            onClick={() => handleAddParam('page', '1')}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base transition-colors cursor-pointer"
          >
            + page
          </button>
        </div>

        {/* Right Tools: Add & Clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleAddParam()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent hover:bg-accent-hover text-background font-bold text-xs shadow-sm shadow-accent/20 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Param</span>
          </button>

          {params.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-text-muted hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Clear all query parameters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Parameters Table List - Clean, Seamless Table */}
      <div className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-xs bg-surface dark:bg-[#131416] text-text-base transition-colors">
        {params.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3.5 text-center px-4 font-sans py-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="font-bold text-text-base text-sm">No Query Parameters</p>
              <p className="text-xs text-text-muted leading-relaxed">
                Add query parameters to filter, paginate, or customize the API response.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => handleAddParam('format', 'json')}
                className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface text-xs font-mono text-text-base transition-colors cursor-pointer"
              >
                + format=json
              </button>
              <button
                type="button"
                onClick={() => handleAddParam('sort', 'desc')}
                className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface text-xs font-mono text-text-base transition-colors cursor-pointer"
              >
                + sort=desc
              </button>
              <button
                type="button"
                onClick={() => handleAddParam()}
                className="px-3 py-1.5 rounded-lg bg-accent text-background font-bold text-xs font-mono shadow-sm shadow-accent/20 transition-all cursor-pointer"
              >
                + Custom Key/Value
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-text-muted text-[10px] uppercase font-mono tracking-wider">
                    <th className="py-2 px-3 font-semibold w-1/3 min-w-[160px]">PARAMETER KEY</th>
                    <th className="py-2 px-3 font-semibold">VALUE</th>
                    <th className="py-2 px-3 text-right font-semibold w-14"></th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {params.map((p, index) => (
                    <tr
                      key={index}
                      className="group hover:bg-surface-elevated/40 transition-colors border-b border-white/[0.03] last:border-b-0"
                    >
                      {/* Parameter Key */}
                      <td className="py-1 px-1 align-top">
                        <input
                          type="text"
                          placeholder="parameter_key"
                          value={p.key}
                          spellCheck={false}
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdateParams((prev) => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], key: val };
                              return copy;
                            });
                          }}
                          className="w-full bg-transparent hover:bg-surface-elevated/50 focus:bg-surface-elevated/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-accent font-semibold outline-none placeholder:text-text-muted/40 transition-colors"
                        />
                      </td>

                      {/* Parameter Value */}
                      <td className="py-1 px-1 align-top">
                        <input
                          type="text"
                          placeholder="parameter_value"
                          value={p.value}
                          spellCheck={false}
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdateParams((prev) => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], value: val };
                              return copy;
                            });
                          }}
                          className="w-full bg-transparent hover:bg-surface-elevated/50 focus:bg-surface-elevated/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-base outline-none placeholder:text-text-muted/40 transition-colors"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="py-1 px-2 text-right align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onUpdateParams((prev) => prev.filter((_, i) => i !== index))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Remove parameter"
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
                onClick={() => handleAddParam()}
                className="text-[11px] text-text-muted hover:text-accent font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-elevated/60 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add new row</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Query Preview Bar */}
      <div className="px-4 py-2 border-t border-border bg-surface-elevated/30 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
          <span className="text-text-muted text-[11px] font-sans">Live Query:</span>
          {queryString ? (
            <span className="text-accent font-semibold truncate select-all">{queryString}</span>
          ) : (
            <span className="text-text-muted/60 italic text-[11px] font-sans">No query appended</span>
          )}
        </div>

        {queryString && (
          <button
            type="button"
            onClick={handleCopyQuery}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface text-text-muted hover:text-text-base transition-colors cursor-pointer shrink-0"
            title="Copy query string"
          >
            {copiedQuery ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span className="text-[11px]">{copiedQuery ? 'Copied' : 'Copy Query'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
