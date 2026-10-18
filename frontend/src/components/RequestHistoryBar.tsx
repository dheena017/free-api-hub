import React from 'react';
import { History, Clock, ArrowRight, Trash2 } from 'lucide-react';

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

interface RequestHistoryBarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  currentHistoryId?: string | null;
}

export const RequestHistoryBar: React.FC<RequestHistoryBarProps> = ({
  history,
  onSelect,
  onClear,
  currentHistoryId
}) => {
  if (history.length === 0) return null;

  return (
    <div className="bg-[#1F1F1F] rounded-xl border border-[#3C4043] p-2.5 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <History className="h-3.5 w-3.5 text-[#8AB4F8]" />
          <span>Session Request History</span>
          <span className="text-[10px] font-mono text-slate-500 bg-[#28292A] px-1.5 py-0.2 rounded border border-[#3C4043]">
            {history.length}
          </span>
        </div>

        <button
          onClick={onClear}
          className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
          title="Clear request history"
        >
          <Trash2 className="h-3 w-3" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {history.map((item) => {
          const isSelected = item.id === currentHistoryId;
          const isOk = item.statusCode >= 200 && item.statusCode < 300;
          const isError = item.statusCode >= 400;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all text-left ${
                isSelected
                  ? 'bg-[#28292A] border-[#8AB4F8] shadow-sm text-white'
                  : 'bg-[#28292A]/60 border-[#3C4043] hover:border-slate-500 text-slate-300 hover:text-white'
              }`}
            >
              {/* Method */}
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  item.method === 'GET'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : item.method === 'POST'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {item.method}
              </span>

              {/* Endpoint Display */}
              <span className="truncate max-w-[150px] font-mono text-[11px]">
                {item.endpointDisplay}
              </span>

              {/* Status Code */}
              <span
                className={`text-[9px] font-bold px-1 py-0.2 rounded border ${
                  isOk
                    ? 'bg-[#81C995]/10 text-[#81C995] border-[#81C995]/20'
                    : isError
                    ? 'bg-[#F28B82]/10 text-[#F28B82] border-[#F28B82]/20'
                    : 'bg-[#FDD663]/10 text-[#FDD663] border-[#FDD663]/20'
                }`}
              >
                {item.statusCode || 'ERR'}
              </span>

              {/* Latency */}
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {item.latencyMs}ms
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
