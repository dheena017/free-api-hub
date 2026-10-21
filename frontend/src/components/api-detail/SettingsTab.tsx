import React from 'react';
import { Settings2, RotateCcw, Zap, Clock, ShieldCheck, Check } from 'lucide-react';
import { ApiItem } from '../../types/api';

export interface SettingsTabProps {
  api: ApiItem;
  requestTimeout: number;
  onSetRequestTimeout: (val: number) => void;
  bypassCache: boolean;
  onToggleBypassCache: () => void;
  followRedirects: boolean;
  onToggleFollowRedirects: () => void;
  onClearHistory: () => void;
  onResetSettings?: () => void;
  onOpenPlayground: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  api,
  requestTimeout,
  onSetRequestTimeout,
  bypassCache,
  onToggleBypassCache,
  followRedirects,
  onToggleFollowRedirects,
  onClearHistory,
  onResetSettings,
  onOpenPlayground
}) => {
  return (
    <section
      role="tabpanel"
      id="tabpanel-settings"
      aria-labelledby="tab-settings"
      className="space-y-4 animate-in fade-in duration-200"
    >
      {/* Header Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-xl bg-accent/10 text-accent border border-accent/20 shrink-0">
            <Settings2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-text-base">{api.name} Playground Settings</h2>
              {bypassCache && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Cache Bypass Active
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1 max-w-2xl">
              Configure network execution timeouts, upstream proxy caching policies, and redirect behaviors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {onResetSettings && (
            <button
              type="button"
              onClick={onResetSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-text-base bg-surface-elevated hover:bg-surface border border-border transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenPlayground}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-background bg-accent hover:bg-accent-hover transition-all shadow-sm cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Open Playground</span>
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Timeout Configuration */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-text-base">Request Timeout</h3>
            </div>
            <span className="text-xs font-mono font-bold text-accent px-2 py-0.5 rounded-lg bg-accent/10 border border-accent/20">
              {requestTimeout / 1000} seconds
            </span>
          </div>
          <p className="text-xs text-text-muted">
            The maximum time allowed for the backend proxy relay before an HTTP 504 Gateway Timeout is thrown.
          </p>

          <div className="grid grid-cols-4 gap-2 pt-2">
            {[5000, 10000, 30000, 60000].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSetRequestTimeout(t)}
                className={`py-2 rounded-xl text-xs font-mono transition-all cursor-pointer text-center ${
                  requestTimeout === t
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                    : 'bg-surface-elevated text-text-muted hover:text-text-base hover:bg-surface border border-border'
                }`}
              >
                {t / 1000}s
              </button>
            ))}
          </div>
        </div>

        {/* Network & Caching Directives */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-bold text-text-base">Network & Caching</h3>
          </div>
          <p className="text-xs text-text-muted">
            Control caching and HTTP redirection during live query execution.
          </p>

          <div className="space-y-3 pt-1">
            {/* Cache Bypass */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/40 border border-border">
              <div className="space-y-0.5 pr-3">
                <span className="text-xs font-bold text-text-base block">Bypass Cache (Force Refresh)</span>
                <span className="text-[11px] text-text-muted block">
                  Injects <code>Cache-Control: no-cache</code> to ensure fresh data from upstream.
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleBypassCache}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  bypassCache ? 'bg-accent' : 'bg-surface-elevated border border-border'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    bypassCache ? 'left-6 bg-background' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Follow Redirects */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/40 border border-border">
              <div className="space-y-0.5 pr-3">
                <span className="text-xs font-bold text-text-base block">Follow HTTP Redirects</span>
                <span className="text-[11px] text-text-muted block">
                  Automatically resolve 301 and 302 redirects to destination URL.
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleFollowRedirects}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  followRedirects ? 'bg-accent' : 'bg-surface-elevated border border-border'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    followRedirects ? 'left-6 bg-background' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Local Storage & Session Data */}
        <div className="md:col-span-2 bg-surface border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-text-base uppercase tracking-wider">
              Session Telemetry & Storage Management
            </h4>
            <p className="text-xs text-text-muted">
              Clear in-memory request execution logs, headers, and cached responses for this API.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-all cursor-pointer shrink-0"
          >
            <span>Clear Recorded History</span>
          </button>
        </div>
      </div>
    </section>
  );
};
