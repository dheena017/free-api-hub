import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiItem, CategorySummary } from '../types/api';
import { fetchApis, fetchCategories } from '../api/client';
import { ApiCard } from '../components/ApiCard';
import { CustomSelect, SelectOption } from '../components/CustomSelect';
import { Layers, ArrowLeft, ArrowRight, Sparkles, AlertCircle, AlertTriangle, RefreshCw, HelpCircle, PlusCircle } from 'lucide-react';

const SORT_OPTIONS: SelectOption[] = [
  { value: 'popular', label: 'Most Reliable', badge: 'Default' },
  { value: 'latency', label: 'Fastest Response' },
  { value: 'uptime', label: 'Highest Uptime %' },
  { value: 'alphabetical', label: 'A to Z' }
];

const AUTH_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Authentication' },
  { value: 'none', label: '⚡ No Key (Open)' },
  { value: 'api_key', label: '🔑 Free API Key' }
];

export const CategoryPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [apis, setApis] = useState<ApiItem[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedSort, setSelectedSort] = useState('popular');
  const [selectedAuth, setSelectedAuth] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategoryData = async () => {
    if (!category) return;
    setIsLoading(true);
    setError(null);
    try {
      const [apisRes, catRes] = await Promise.all([
        fetchApis({
          category,
          sort: selectedSort,
          auth_type: selectedAuth !== 'all' ? selectedAuth : undefined,
          limit: 50
        }),
        fetchCategories()
      ]);
      setApis(apisRes.items);
      setCategories(catRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to load APIs for category '${category}'`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryData();
  }, [category, selectedSort, selectedAuth]);

  const currentCat = categories.find((c) => c.slug.toLowerCase() === category?.toLowerCase());
  const categoryTitle = currentCat ? currentCat.name : category?.replace('-', ' ').toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back to Explore */}
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to All Categories</span>
      </Link>

      {/* Hero Header */}
      <div className="bg-[#28292A] rounded-2xl p-6 sm:p-8 border border-[#3C4043] space-y-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#8AB4F8]/10 border border-[#8AB4F8]/20 text-[#8AB4F8] text-xs font-mono font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Verified Directory</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Free {categoryTitle} APIs for Developers
        </h1>

        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          {currentCat?.description || `Explore our hand-curated directory of verified, genuinely free ${categoryTitle} APIs. Every endpoint is pre-tested and testable in 1 click.`}
        </p>

        <div className="text-xs font-mono text-slate-400 pt-1">
          Showing <strong className="text-white">{apis.length}</strong> verified endpoints
        </div>
      </div>

      {/* Toolbar with Custom Select Dropdowns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-slate-400 font-medium">
          Filter & Sort {categoryTitle}
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-44">
            <CustomSelect
              value={selectedAuth}
              onChange={setSelectedAuth}
              options={AUTH_OPTIONS}
              size="sm"
              variant="surface"
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={selectedSort}
              onChange={setSelectedSort}
              options={SORT_OPTIONS}
              size="sm"
              variant="surface"
            />
          </div>
        </div>
      </div>

      {/* API Grid & Error Diagnostics */}
      <main className="space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8AB4F8]" />
            <p className="text-xs">Loading {categoryTitle} endpoints...</p>
          </div>
        ) : error ? (
          <div className="bg-[#28292A] rounded-2xl p-6 sm:p-8 border border-rose-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex-shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-white">
                    Category Fetch Failure
                  </h2>
                  <p className="text-xs font-mono text-rose-300">
                    {error}
                  </p>
                </div>
              </div>

              <button
                onClick={loadCategoryData}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3C4043] border border-[#3C4043] text-xs font-medium text-slate-200 transition-colors flex-shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Query</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1F1F1F] border border-[#3C4043] text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-[#8AB4F8]" />
                <span>Troubleshooting Tips:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Verify that the FastAPI backend server is running and accessible on port 8000.</li>
                <li>Try selecting "All Authentication" in the filter dropdown above to broaden results.</li>
                <li>Check your internet connection if remote probes are actively syncing.</li>
              </ul>
            </div>
          </div>
        ) : apis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apis.map((api) => (
              <ApiCard key={api.id} api={api} />
            ))}
          </div>
        ) : (
          <div className="bg-[#28292A] rounded-2xl p-10 text-center border border-[#3C4043] space-y-3">
            <div className="inline-flex p-3 rounded-full bg-[#1F1F1F] border border-[#3C4043] text-slate-400">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-white">No APIs Found in {categoryTitle}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              No verified endpoints match your current filter settings. We only index 100% genuine REST APIs that have passed automated live probes.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              {selectedAuth !== 'all' && (
                <button
                  onClick={() => setSelectedAuth('all')}
                  className="px-3 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3C4043] text-xs text-white border border-[#3C4043] transition-colors"
                >
                  Reset Auth Filter
                </button>
              )}
              <Link
                to="/submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-xs font-semibold text-[#1F1F1F] transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Submit an API</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Other Categories Bar */}
      <section className="pt-8 border-t border-[#3C4043] space-y-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Explore Other Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories
            .filter((c) => c.slug !== category)
            .map((c) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="px-3.5 py-1.5 rounded-full bg-[#28292A] border border-[#3C4043] hover:bg-[#303134] text-xs text-slate-300 hover:text-white transition-colors"
              >
                {c.name} ({c.count})
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
};
