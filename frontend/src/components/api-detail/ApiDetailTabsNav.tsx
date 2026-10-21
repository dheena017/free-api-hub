import React from 'react';
import { Zap, Globe, Activity, Layers, History, KeyRound, Settings2 } from 'lucide-react';

export type DetailTab =
  | 'playground'
  | 'docs'
  | 'health'
  | 'overview'
  | 'history'
  | 'auth'
  | 'settings';

export interface ApiDetailTabsNavProps {
  activeTab: DetailTab;
  onSelectTab: (tab: DetailTab) => void;
  endpointsCount?: number;
  historyCount?: number;
  hasActiveCreds?: boolean;
  authType?: string;
  bypassCache?: boolean;
}

export const ApiDetailTabsNav: React.FC<ApiDetailTabsNavProps> = ({
  activeTab,
  onSelectTab,
  endpointsCount,
  historyCount = 0,
  hasActiveCreds = false,
  bypassCache = false
}) => {
  return (
    <div id="api-tab-content" className="pt-2">
      <div
        role="tablist"
        aria-label="API detail tabs"
        className="flex items-center gap-1 sm:gap-2 border-b border-border pb-px overflow-x-auto scrollbar-none"
      >
        {/* Tab 1: Interactive Playground */}
        <button
          type="button"
          role="tab"
          id="tab-playground"
          aria-selected={activeTab === 'playground'}
          aria-controls="tabpanel-playground"
          onClick={() => onSelectTab('playground')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'playground'
              ? 'border-accent text-accent bg-accent/5'
              : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
          }`}
        >
          <Zap className="h-4 w-4 text-accent" />
          <span>Interactive Playground</span>
        </button>

        {/* Tab 2: Endpoints & Docs */}
        <button
          type="button"
          role="tab"
          id="tab-docs"
          aria-selected={activeTab === 'docs'}
          aria-controls="tabpanel-docs"
          onClick={() => onSelectTab('docs')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'docs'
              ? 'border-accent text-accent bg-accent/5'
              : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Endpoints & Docs</span>
          {typeof endpointsCount === 'number' && endpointsCount > 0 && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                activeTab === 'docs'
                  ? 'bg-accent/20 text-accent border-accent/30'
                  : 'bg-surface-elevated text-text-muted border-border'
              }`}
            >
              {endpointsCount}
            </span>
          )}
        </button>

        {/* Tab 3: Health & Telemetry */}
        <button
          type="button"
          role="tab"
          id="tab-health"
          aria-selected={activeTab === 'health'}
          aria-controls="tabpanel-health"
          onClick={() => onSelectTab('health')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'health'
              ? 'border-accent text-accent bg-accent/5'
              : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Health & Telemetry</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* Tab 4: Architecture & SDKs */}
        <button
          type="button"
          role="tab"
          id="tab-overview"
          aria-selected={activeTab === 'overview'}
          aria-controls="tabpanel-overview"
          onClick={() => onSelectTab('overview')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'overview'
              ? 'border-accent text-accent bg-accent/5'
              : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Architecture & SDKs</span>
        </button>

        {/* Tab 5: Request History */}
        <button
          type="button"
          role="tab"
          id="tab-history"
          aria-selected={activeTab === 'history'}
          aria-controls="tabpanel-history"
          onClick={() => onSelectTab('history')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'history'
              ? 'border-accent text-accent bg-accent/5'
              : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
          }`}
        >
          <History className="h-4 w-4" />
          <span>History</span>
          {historyCount > 0 && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                activeTab === 'history'
                  ? 'bg-accent/20 text-accent border-accent/30'
                  : 'bg-surface-elevated text-text-muted border-border'
              }`}
            >
              {historyCount}
            </span>
          )}
        </button>

        {/* Tab 6: Auth */}
        <button
          type="button"
          role="tab"
          id="tab-auth"
          aria-selected={activeTab === 'auth'}
          aria-controls="tabpanel-auth"
          onClick={() => onSelectTab('auth')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'auth'
              ? 'border-accent text-accent bg-accent/5'
              : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Auth</span>
          {hasActiveCreds && (
            <span className="h-2 w-2 rounded-full bg-emerald-400" title="Active Credentials Configured" />
          )}
        </button>

        {/* Tab 7: Settings */}
        <button
          type="button"
          role="tab"
          id="tab-settings"
          aria-selected={activeTab === 'settings'}
          aria-controls="tabpanel-settings"
          onClick={() => onSelectTab('settings')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'settings'
              ? 'border-accent text-accent bg-accent/5'
              : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          <span>Settings</span>
          {bypassCache && (
            <span className="h-2 w-2 rounded-full bg-amber-400" title="Cache Bypass Active" />
          )}
        </button>
      </div>
    </div>
  );
};
