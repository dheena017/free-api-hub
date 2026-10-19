import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface SettingsTabProps {
  requestTimeout: number;
  onSetRequestTimeout: (val: number) => void;
  bypassCache: boolean;
  onToggleBypassCache: () => void;
  followRedirects: boolean;
  onToggleFollowRedirects: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  requestTimeout,
  onSetRequestTimeout,
  bypassCache,
  onToggleBypassCache,
  followRedirects,
  onToggleFollowRedirects,
}) => {
  return (
    <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
      {/* Timeout Setting */}
      <div className="space-y-1.5">
        <span className="font-bold text-text-base block">Request Timeout</span>
        <p className="text-[11px] text-text-muted">Maximum duration before closing connection.</p>
        <div className="flex items-center gap-1 pt-1">
          {[5000, 10000, 30000, 60000].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onSetRequestTimeout(t)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
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

      {/* Cache Bypass Setting */}
      <div className="space-y-1.5">
        <span className="font-bold text-text-base block">Bypass Cache</span>
        <p className="text-[11px] text-text-muted">
          Send Cache-Control: no-cache to force fresh upstream data.
        </p>
        <button
          type="button"
          onClick={onToggleBypassCache}
          className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-xl font-mono text-xs font-semibold border transition-all cursor-pointer ${
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
          <span>{bypassCache ? 'Bypass Active' : 'Default Cache'}</span>
        </button>
      </div>

      {/* Follow Redirects Setting */}
      <div className="space-y-1.5">
        <span className="font-bold text-text-base block">Follow Redirects</span>
        <p className="text-[11px] text-text-muted">Automatically follow HTTP 301 and 302 responses.</p>
        <button
          type="button"
          onClick={onToggleFollowRedirects}
          className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-xl font-mono text-xs font-semibold border transition-all cursor-pointer ${
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
          <span>{followRedirects ? 'Follow (Enabled)' : 'Do Not Follow'}</span>
        </button>
      </div>

      {/* CORS Proxy Status */}
      <div className="space-y-1.5">
        <span className="font-bold text-text-base block">Proxy CORS Relay</span>
        <p className="text-[11px] text-text-muted">
          Bypasses browser CORS restrictions via server relay.
        </p>
        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Active & Verified</span>
        </div>
      </div>
    </div>
  );
};
