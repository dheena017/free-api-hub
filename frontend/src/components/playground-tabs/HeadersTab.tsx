import React from 'react';
import { Trash2 } from 'lucide-react';

export interface HeadersTabProps {
  headers: Array<{ key: string; value: string }>;
  onSetHeaders: React.Dispatch<React.SetStateAction<Array<{ key: string; value: string }>>>;
}

export const HeadersTab: React.FC<HeadersTabProps> = ({ headers, onSetHeaders }) => {
  if (headers.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border border-dashed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-text-muted">
        <div>
          <span className="font-semibold text-text-base">No custom headers specified.</span>
          <p className="text-[11px] text-text-muted mt-0.5">
            Standard HTTP headers (Accept, User-Agent) are automatically supplied by the proxy.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onSetHeaders((prev) => [...prev, { key: 'Accept', value: 'application/json' }])}
            className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
          >
            + Accept: application/json
          </button>
          <button
            type="button"
            onClick={() => onSetHeaders((prev) => [...prev, { key: 'User-Agent', value: 'FreeApiHub-Client/1.0' }])}
            className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface border border-border hover:border-accent text-text-base transition-colors cursor-pointer"
          >
            + User-Agent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {headers.map((h, index) => (
        <div
          key={index}
          className="flex items-center gap-1.5 bg-surface-elevated px-3 py-2 rounded-xl border border-border hover:border-border-light transition-all"
        >
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
            className="w-28 bg-transparent text-xs font-mono text-emerald-400 font-medium outline-none placeholder:text-text-muted/40"
          />
          <span className="text-text-muted/60 font-mono text-xs">:</span>
          <input
            type="text"
            placeholder="Value"
            value={h.value}
            spellCheck={false}
            onChange={(e) => {
              const updated = [...headers];
              updated[index].value = e.target.value;
              onSetHeaders(updated);
            }}
            className="flex-1 bg-transparent text-xs font-mono text-text-base outline-none placeholder:text-text-muted/40"
          />
          <button
            type="button"
            onClick={() => onSetHeaders((prev) => prev.filter((_, i) => i !== index))}
            className="text-text-muted hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Remove header"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
