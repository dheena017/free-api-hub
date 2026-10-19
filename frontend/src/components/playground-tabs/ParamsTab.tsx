import React from 'react';
import { Trash2 } from 'lucide-react';

export interface ParamsTabProps {
  params: Array<{ key: string; value: string }>;
  onUpdateParams: (
    updater: (prev: Array<{ key: string; value: string }>) => Array<{ key: string; value: string }>
  ) => void;
}

export const ParamsTab: React.FC<ParamsTabProps> = ({ params, onUpdateParams }) => {
  if (params.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border border-dashed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-text-muted">
        <div>
          <span className="font-semibold text-text-base">No query parameters attached.</span>
          <p className="text-[11px] text-text-muted mt-0.5">
            Parameters will automatically sync with the URL bar above.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onUpdateParams((prev) => [...prev, { key: 'limit', value: '10' }])}
            className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
          >
            + limit=10
          </button>
          <button
            type="button"
            onClick={() => onUpdateParams((prev) => [...prev, { key: 'format', value: 'json' }])}
            className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
          >
            + format=json
          </button>
          <button
            type="button"
            onClick={() => onUpdateParams((prev) => [...prev, { key: 'page', value: '1' }])}
            className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
          >
            + page=1
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {params.map((p, index) => (
        <div
          key={index}
          className="flex items-center gap-1.5 bg-surface-elevated px-3 py-2 rounded-xl border border-border hover:border-border-light transition-all"
        >
          <input
            type="text"
            placeholder="key"
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
            className="w-24 bg-transparent text-xs font-mono text-accent font-medium outline-none placeholder:text-text-muted/40"
          />
          <span className="text-text-muted/60 font-mono text-xs">=</span>
          <input
            type="text"
            placeholder="value"
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
            className="flex-1 bg-transparent text-xs font-mono text-text-base outline-none placeholder:text-text-muted/40"
          />
          <button
            type="button"
            onClick={() => onUpdateParams((prev) => prev.filter((_, i) => i !== index))}
            className="text-text-muted hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Remove parameter"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
