import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiItem, CategorySummary } from '../types/api';
import { fetchApis, fetchCategories } from '../api/client';
import { ApiCard } from '../components/ApiCard';
import { CustomSelect } from '../components/CustomSelect';
import { Search, X, FilterX, ArrowUpDown, AlertCircle, RefreshCw } from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const authParam = searchParams.get('auth') || 'all';
  const sortParam = searchParams.get('sort') || 'popular';

  const [apis, setApis] = useState<ApiItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const updateQuery = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || (key === 'sort' && value === 'popular')) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [apisRes, catRes] = await Promise.all([
          fetchApis({
            q: qParam || undefined,
            category: categoryParam !== 'all' ? categoryParam : undefined,
            auth_type: authParam !== 'all' ? authParam : undefined,
            sort: sortParam
          }),
          fetchCategories()
        ]);
        setApis(apisRes.items);
        setTotalCount(apisRes.total);
        setCategories(catRes);
      } catch (err: unknown) {
        console.error('Failed to load explore data:', err);
        setLoadError(err instanceof Error ? err.message : 'Unable to connect to the catalog API server.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [qParam, categoryParam, authParam, sortParam, retryCount]);

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={qParam}
          onChange={(e) => updateQuery('q', e.target.value)}
          placeholder="Search verified free APIs..."
          className="w-full pl-12 pr-10 py-3.5 rounded-full bg-[#28292A] hover:bg-[#303134] focus:bg-[#303134] border border-[#3C4043] focus:border-[#5F6368] text-white placeholder-slate-400 text-sm transition-all outline-none"
        />
        {qParam && (
          <button
            onClick={() => updateQuery('q', '')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Horizontal Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <button
          onClick={() => updateQuery('category', 'all')}
          className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors border ${
            categoryParam === 'all'
              ? 'bg-accent/20 border-accent text-accent font-semibold'
              : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#3C4043] hover:text-white'
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => updateQuery('category', cat.slug)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors border ${
              categoryParam === cat.slug
                ? 'bg-accent/20 border-accent text-accent font-semibold'
                : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#3C4043] hover:text-white'
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Control Bar: Filters & Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-[#3C4043]">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-white">{totalCount}</strong> verified endpoints
          </span>
          {(qParam || categoryParam !== 'all' || authParam !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="text-accent hover:underline font-medium"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Category filter */}
          {categories.length > 0 && (
            <div className="w-48">
              <CustomSelect
                value={categoryParam}
                onChange={(val) => updateQuery('category', val)}
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...categories.map((c) => ({
                    value: c.slug,
                    label: c.name,
                    badge: String(c.count)
                  }))
                ]}
                searchable
                size="sm"
                variant="surface"
              />
            </div>
          )}

          {/* Auth filter */}
          <div className="w-44">
            <CustomSelect
              value={authParam}
              onChange={(val) => updateQuery('auth', val)}
              options={[
                { value: 'all', label: 'All Authentication' },
                { value: 'none', label: '⚡ No Key (Open)' },
                { value: 'api_key', label: '🔑 Free API Key' }
              ]}
              size="sm"
              variant="surface"
            />
          </div>

          {/* Sort */}
          <div className="w-44">
            <CustomSelect
              value={sortParam}
              onChange={(val) => updateQuery('sort', val)}
              options={[
                { value: 'popular', label: 'Most Reliable', badge: 'Default' },
                { value: 'latency', label: 'Fastest Response' },
                { value: 'uptime', label: 'Highest Uptime %' },
                { value: 'alphabetical', label: 'A to Z' }
              ]}
              size="sm"
              variant="surface"
            />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <main>
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            <p className="text-xs">Loading APIs...</p>
          </div>
        ) : loadError ? (
          <div className="bg-[#28292A] rounded-2xl p-10 text-center border border-rose-500/30 space-y-3">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
            <h3 className="text-base font-semibold text-white">Connection Error</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto leading-relaxed">{loadError}</p>
            <div className="pt-2">
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#303134] hover:bg-[#3C4043] text-xs text-[#8AB4F8] font-medium border border-[#3C4043] transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        ) : apis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apis.map((api) => (
              <ApiCard key={api.id} api={api} />
            ))}
          </div>
        ) : (
          <div className="bg-[#28292A] rounded-2xl p-12 text-center border border-[#3C4043] space-y-3">
            <FilterX className="h-10 w-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No matching APIs found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try typing a different keyword or resetting your filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 rounded-full bg-[#3C4043] hover:bg-[#4D5156] text-xs text-white font-medium transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
