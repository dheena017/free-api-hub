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
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#3C4043]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#8AB4F8]/10 text-[#8AB4F8]">
            <History className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Session Request History</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#28292A] text-slate-300 border border-[#3C4043]">
                {history.length} {history.length === 1 ? 'request' : 'requests'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Recorded probe requests and responses captured in your current playground session
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-[#3C4043] transition-colors"
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
          <div className="p-3.5 rounded-2xl bg-[#28292A] border border-[#3C4043] text-slate-500">
            <History className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="font-semibold text-slate-200 text-xs">No Request History Yet</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
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
                    ? 'bg-[#28292A] border-[#8AB4F8] shadow-sm'
                    : 'bg-[#232425] border-[#3C4043] hover:border-slate-500 hover:bg-[#28292A]/80'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* HTTP Method Badge */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        item.method === 'GET'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : item.method === 'POST'
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                          : item.method === 'PUT'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {item.method}
                    </span>

                    {/* Status Code Badge */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                        isOk
                          ? 'bg-[#81C995]/15 text-[#81C995] border-[#81C995]/30'
                          : isError
                          ? 'bg-[#F28B82]/15 text-[#F28B82] border-[#F28B82]/30'
                          : 'bg-[#FDD663]/15 text-[#FDD663] border-[#FDD663]/30'
                      }`}
                    >
                      {isOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      <span>{item.statusCode || 'ERR'}</span>
                    </span>

                    {/* Latency */}
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      {item.latencyMs} ms
                    </span>

                    {/* Timestamp */}
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatTime(item.timestamp)}
                    </span>

                    {isSelected && (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#8AB4F8]/20 text-[#8AB4F8] border border-[#8AB4F8]/40">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelect(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1F1F1F] hover:bg-[#303134] text-slate-200 hover:text-white border border-[#3C4043] transition-colors"
                      title="Load request and inspect cached response"
                    >
                      <FileCode className="h-3 w-3 text-[#8AB4F8]" />
                      <span>Inspect</span>
                    </button>

                    {onReRun && (
                      <button
                        onClick={() => onReRun(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#1F1F1F] transition-colors shadow-sm"
                        title="Re-run this request live"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        <span>Re-run</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Target URL / Path */}
                <div className="font-mono text-xs text-slate-200 bg-[#1F1F1F] px-2.5 py-1.5 rounded-lg border border-[#3C4043] break-all selection:bg-[#8AB4F8] selection:text-[#1F1F1F]">
                  {item.url}
                </div>

                {/* Parameters & Headers Footnote */}
                {(item.params?.length > 0 || item.headers?.length > 0 || item.body) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    {item.params?.length > 0 && (
                      <span className="bg-[#28292A] px-2 py-0.5 rounded border border-[#3C4043]">
                        {item.params.length} {item.params.length === 1 ? 'param' : 'params'}
                      </span>
                    )}
                    {item.headers?.length > 0 && (
                      <span className="bg-[#28292A] px-2 py-0.5 rounded border border-[#3C4043]">
                        {item.headers.length} {item.headers.length === 1 ? 'header' : 'headers'}
                      </span>
                    )}
                    {item.body && (
                      <span className="bg-[#28292A] px-2 py-0.5 rounded border border-[#3C4043] text-amber-300">
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
