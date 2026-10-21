import React from 'react';
import { Settings2, X, ShieldCheck, RotateCcw } from 'lucide-react';

export interface RequestSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestTimeout: number;
  onSetRequestTimeout: (val: number) => void;
  bypassCache: boolean;
  onToggleBypassCache: () => void;
  followRedirects: boolean;
  onToggleFollowRedirects: () => void;
  onResetSettings?: () => void;
}

export const RequestSettingsModal: React.FC<RequestSettingsModalProps> = ({
  isOpen,
  onClose,
  requestTimeout,
  onSetRequestTimeout,
  bypassCache,
  onToggleBypassCache,
  followRedirects,
  onToggleFollowRedirects,
  onResetSettings
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-bold text-text-base">
                Request & Network Settings
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Tune client execution timeout, cache directives, and proxy relay routing.
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

        {/* Settings Body */}
        <div className="space-y-4">
          {/* Timeout */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text-base block">Request Timeout</span>
                <p className="text-[11px] text-text-muted">Maximum duration before connection is terminated.</p>
              </div>
              <span className="text-xs font-mono font-bold text-accent">{requestTimeout / 1000}s</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[5000, 10000, 30000, 60000].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSetRequestTimeout(t)}
                  className={`py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer text-center ${
                    requestTimeout === t
                      ? 'bg-accent text-background font-bold shadow-sm'
                      : 'bg-surface text-text-muted hover:text-text-base border border-border'
                  }`}
                >
                  {t / 1000}s
                </button>
              ))}
            </div>
          </div>

          {/* Cache Bypass */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-text-base block">Bypass Cache (Force Refresh)</span>
              <p className="text-[11px] text-text-muted">
                Injects <code>Cache-Control: no-cache</code> headers to guarantee fresh data from upstream.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleBypassCache}
              className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold border transition-all cursor-pointer ${
                bypassCache
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-surface text-text-muted border-border hover:text-text-base'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  bypassCache ? 'bg-amber-400 animate-pulse' : 'bg-text-muted/40'
                }`}
              />
              <span>{bypassCache ? 'Active' : 'Disabled'}</span>
            </button>
          </div>

          {/* Follow Redirects */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-text-base block">Follow Redirects</span>
              <p className="text-[11px] text-text-muted">
                Automatically follow HTTP 301, 302, 307, and 308 redirection hops.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleFollowRedirects}
              className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold border transition-all cursor-pointer ${
                followRedirects
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-surface text-text-muted border-border hover:text-text-base'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  followRedirects ? 'bg-emerald-400' : 'bg-text-muted/40'
                }`}
              />
              <span>{followRedirects ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>

          {/* CORS Proxy Status */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-text-base block">Secure Proxy Relay</span>
              <p className="text-[11px] text-text-muted">
                Bypasses browser CORS restrictions via server relay.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium shrink-0">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Operational</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 flex items-center justify-between gap-3 border-t border-border">
          {onResetSettings ? (
            <button
              type="button"
              onClick={onResetSettings}
              className="text-xs text-text-muted hover:text-text-base flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
