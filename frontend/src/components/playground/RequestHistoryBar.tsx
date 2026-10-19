import React from 'react';
import { History, Clock, ArrowRight, Trash2, Play, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';

export interface HistoryItem {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  endpointDisplay: string;
  statusCode: number;
  latencyMs: number;
  params: Array<{ key: string; value: string }>;
  headers: Array<{ key: string; value: string }>;
  body?: string;
  dataSnapshot?: unknown;
}

interface RequestHistoryViewProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onReRun?: (item: HistoryItem) => void;
  onClear: () => void;
  currentHistoryId?: string | null;
}

export const RequestHistoryView: React.FC<RequestHistoryViewProps> = ({
  history,
  onSelect,
  onReRun,
  onClear,
  currentHistoryId
}) => {
  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4 font-sans max-w-4xl mx-auto">
      {/* History Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
            <History className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-base">Session Request History</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                {history.length} {history.length === 1 ? 'request' : 'requests'}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              Recorded probe requests and responses captured in your current playground session
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-text-muted hover:text-offline hover:bg-offline/10 border border-border transition-colors"
            title="Clear all recorded history"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* History Item List */}
      {history.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3.5 rounded-2xl bg-surface border border-border text-text-muted">
            <History className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="font-semibold text-text-base text-xs">No Request History Yet</p>
            <p className="text-[11px] text-text-muted leading-relaxed">
              When you test endpoints, submit parameters, or run sample presets, each request is logged here for quick reloading and response inspection.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {history.map((item) => {
            const isSelected = item.id === currentHistoryId;
            const isOk = item.statusCode >= 200 && item.statusCode < 300;
            const isError = item.statusCode >= 400 || item.statusCode === 0;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-surface border-accent shadow-sm'
                    : 'bg-surface-elevated border-border hover:border-border-light hover:bg-surface'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* HTTP Method Badge */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        item.method === 'GET'
                          ? 'bg-healthy/15 text-healthy border border-healthy/30'
                          : item.method === 'POST'
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                          : item.method === 'PUT'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-offline/15 text-offline border border-offline/30'
                      }`}
                    >
                      {item.method}
                    </span>

                    {/* Status Code Badge */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                        isOk
                          ? 'bg-healthy/15 text-healthy border-healthy/30'
                          : isError
                          ? 'bg-offline/15 text-offline border-offline/30'
                          : 'bg-degraded/15 text-degraded border-degraded/30'
                      }`}
                    >
                      {isOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      <span>{item.statusCode || 'ERR'}</span>
                    </span>

                    {/* Latency */}
                    <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                      <Clock className="h-3 w-3 text-text-muted" />
                      {item.latencyMs} ms
                    </span>

                    {/* Timestamp */}
                    <span className="text-[11px] text-text-muted font-mono">
                      {formatTime(item.timestamp)}
                    </span>

                    {isSelected && (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-accent/20 text-accent border border-accent/40">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelect(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-elevated hover:bg-surface-hover text-text-base border border-border transition-colors"
                      title="Load request and inspect cached response"
                    >
                      <FileCode className="h-3 w-3 text-accent" />
                      <span>Inspect</span>
                    </button>

                    {onReRun && (
                      <button
                        onClick={() => onReRun(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent hover:opacity-90 text-background transition-colors shadow-sm"
                        title="Re-run this request live"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        <span>Re-run</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Target URL / Path */}
                <div className="font-mono text-xs text-text-base bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border break-all selection:bg-accent selection:text-background">
                  {item.url}
                </div>

                {/* Parameters & Headers Footnote */}
                {(item.params?.length > 0 || item.headers?.length > 0 || item.body) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-text-muted">
                    {item.params?.length > 0 && (
                      <span className="bg-surface px-2 py-0.5 rounded border border-border">
                        {item.params.length} {item.params.length === 1 ? 'param' : 'params'}
                      </span>
                    )}
                    {item.headers?.length > 0 && (
                      <span className="bg-surface px-2 py-0.5 rounded border border-border">
                        {item.headers.length} {item.headers.length === 1 ? 'header' : 'headers'}
                      </span>
                    )}
                    {item.body && (
                      <span className="bg-surface px-2 py-0.5 rounded border border-border text-degraded">
                        Body payload
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Legacy horizontal bar export for backwards compatibility
export const RequestHistoryBar: React.FC<RequestHistoryViewProps> = (props) => {
  return <RequestHistoryView {...props} />;
};
