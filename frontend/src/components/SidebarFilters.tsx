import React from 'react';
import { CategorySummary } from '../types/api';
import { Filter, RotateCcw, Shield, Tag, DollarSign, ArrowUpDown } from 'lucide-react';
import { CustomSelect, SelectOption } from './CustomSelect';

const SORT_OPTIONS: SelectOption[] = [
  { value: 'popular', label: 'Most Reliable (Default)', badge: 'Recommended' },
  { value: 'latency', label: 'Lowest Latency (Fastest)' },
  { value: 'uptime', label: 'Highest Uptime %' },
  { value: 'alphabetical', label: 'Alphabetical (A - Z)' }
];

interface SidebarFiltersProps {
  categories: CategorySummary[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedAuth: string;
  onSelectAuth: (auth: string) => void;
  selectedPricing: string;
  onSelectPricing: (pricing: string) => void;
  selectedSort: string;
  onSelectSort: (sort: string) => void;
  onReset: () => void;
}

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedAuth,
  onSelectAuth,
  selectedPricing,
  onSelectPricing,
  selectedSort,
  onSelectSort,
  onReset
}) => {
  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedAuth !== 'all' ||
    selectedPricing !== 'all' ||
    selectedSort !== 'popular';

  return (
    <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
      <div className="glass-panel rounded-xl p-5 border border-border space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Filter className="h-4 w-4 text-accent" />
            <span>Filters</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-[11px] text-slate-400 hover:text-accent flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-accent" />
            Sort By
          </label>
          <CustomSelect
            value={selectedSort}
            onChange={onSelectSort}
            options={SORT_OPTIONS}
            variant="surface"
            size="md"
          />
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-accent" />
            Category
          </label>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            <button
              onClick={() => onSelectCategory('all')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-accent/15 text-accent font-semibold'
                  : 'text-slate-300 hover:bg-surface'
              }`}
            >
              <span>All Categories</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => onSelectCategory(cat.slug)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  selectedCategory === cat.slug
                    ? 'bg-accent/15 text-accent font-semibold'
                    : 'text-slate-300 hover:bg-surface'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span className="text-[10px] font-mono text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-border/60">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Auth Requirement */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-accent" />
            Authentication
          </label>
          <div className="space-y-1">
            {[
              { id: 'all', label: 'Any Authentication' },
              { id: 'none', label: '⚡ No Key / No Sign-up' },
              { id: 'api_key', label: '🔑 Free API Key' }
            ].map((auth) => (
              <button
                key={auth.id}
                onClick={() => onSelectAuth(auth.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  selectedAuth === auth.id
                    ? 'bg-accent/15 text-accent font-semibold'
                    : 'text-slate-300 hover:bg-surface'
                }`}
              >
                {auth.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Tier */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-accent" />
            Pricing Tier
          </label>
          <div className="space-y-1">
            {[
              { id: 'all', label: 'All Free Tiers' },
              { id: 'open', label: '🟢 100% Completely Open' },
              { id: 'free_forever', label: '🔵 Free Forever (Rate Limited)' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectPricing(p.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  selectedPricing === p.id
                    ? 'bg-accent/15 text-accent font-semibold'
                    : 'text-slate-300 hover:bg-surface'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
