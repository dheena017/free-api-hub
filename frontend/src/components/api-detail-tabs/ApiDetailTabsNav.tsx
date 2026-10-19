import React from 'react';
import { Zap, Globe, Activity, Layers } from 'lucide-react';

export type DetailTab = 'playground' | 'docs' | 'health' | 'overview';

export interface ApiDetailTabsNavProps {
  activeTab: DetailTab;
  onSelectTab: (tab: DetailTab) => void;
  endpointsCount?: number;
}

export const ApiDetailTabsNav: React.FC<ApiDetailTabsNavProps> = ({
  activeTab,
  onSelectTab,
  endpointsCount
}) => {
  return (
    <div id="api-tab-content" className="pt-2">
      <div
        role="tablist"
        aria-label="API detail tabs"
        className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto scrollbar-none"
      >
        {/* Tab 1: Interactive Playground */}
        <button
          type="button"
          role="tab"
          id="tab-playground"
          aria-selected={activeTab === 'playground'}
          aria-controls="tabpanel-playground"
          onClick={() => onSelectTab('playground')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-accent text-accent bg-accent/5'
              : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Architecture & SDKs</span>
        </button>
      </div>
    </div>
  );
};
