import React from 'react';
import { History, X } from 'lucide-react';
import { ApiItem } from '../../types/api';
import { HistoryItem, RequestHistoryView } from './RequestHistoryBar';

export interface RequestHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  api: ApiItem;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onReRun?: (item: HistoryItem) => void;
  onClearHistory: () => void;
  currentHistoryId?: string | null;
}

export const RequestHistoryModal: React.FC<RequestHistoryModalProps> = ({
  isOpen,
  onClose,
  api,
  history,
  onSelectHistoryItem,
  onReRun,
  onClearHistory,
  currentHistoryId
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="history-modal-title" className="text-base font-bold text-text-base">
                  {api.name} Request History
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted border border-border">
                  {history.length} {history.length === 1 ? 'call' : 'calls'}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Inspect past request telemetry, view snapshot responses, and re-run historical queries.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable History List */}
        <div className="flex-1 overflow-y-auto pr-1">
          <RequestHistoryView
            history={history}
            onSelect={(item) => {
              onSelectHistoryItem(item);
              onClose();
            }}
            onReRun={(item) => {
              if (onReRun) onReRun(item);
              onClose();
            }}
            onClear={onClearHistory}
            currentHistoryId={currentHistoryId}
          />
        </div>

        {/* Footer */}
        <div className="pt-3 flex items-center justify-end border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface text-text-base text-xs font-medium border border-border transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
