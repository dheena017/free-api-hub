import React from 'react';
import { History, Trash2, Zap, ArrowRight, Clock } from 'lucide-react';
import { ApiItem } from '../../types/api';
import { HistoryItem, RequestHistoryView } from '../playground/RequestHistoryBar';

export interface HistoryTabProps {
  api: ApiItem;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onReRun?: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onOpenPlayground: () => void;
  currentHistoryId?: string | null;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  api,
  history,
  onSelectHistoryItem,
  onReRun,
  onClearHistory,
  onOpenPlayground,
  currentHistoryId
}) => {
  return (
    <section
      role="tabpanel"
      id="tabpanel-history"
      aria-labelledby="tab-history"
      className="space-y-4 animate-in fade-in duration-200"
    >
      {/* Tab Header Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-xl bg-accent/10 text-accent border border-accent/20 shrink-0">
            <History className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-text-base">{api.name} Request History</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted border border-border">
                {history.length} {history.length === 1 ? 'call recorded' : 'calls recorded'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 max-w-2xl">
              Inspect session query telemetry, examine snapshot response payloads, and re-run past requests in the playground.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenPlayground}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-background bg-accent hover:bg-accent-hover transition-all shadow-sm cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Interactive Playground</span>
          </button>
        </div>
      </div>

      {/* History Content */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 min-h-[360px]">
        {history.length === 0 ? (
          <div className="text-center py-16 space-y-4 max-w-md mx-auto">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-text-muted/60">
              <Clock className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-text-base">No requests executed yet</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Test any endpoint in the Interactive Playground to start recording execution latency, HTTP headers, and response data.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPlayground}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-background bg-accent hover:bg-accent-hover transition-all cursor-pointer"
            >
              <span>Test an Endpoint in Playground</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <RequestHistoryView
            history={history}
            onSelect={onSelectHistoryItem}
            onReRun={onReRun}
            onClear={onClearHistory}
            currentHistoryId={currentHistoryId}
          />
        )}
      </div>
    </section>
  );
};
