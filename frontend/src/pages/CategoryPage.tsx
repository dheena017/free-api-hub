import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiItem, CategorySummary } from '../types/api';
import { fetchApis, fetchCategories } from '../api/client';
import { ApiCard } from '../components/ApiCard';
import { CustomSelect, SelectOption } from '../components/CustomSelect';
import {
  Layers,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilterX
} from 'lucide-react';

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
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedSort, setSelectedSort] = useState('popular');
  const [selectedAuth, setSelectedAuth] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 24;

  const loadCategoryData = async () => {
    if (!category) return;
    setIsLoading(true);
    setError(null);
    try {
      const [apisRes, catRes] = await Promise.all([
        fetchApis({
          category,
          q: searchQuery || undefined,
          sort: selectedSort,
          auth_type: selectedAuth !== 'all' ? selectedAuth : undefined,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize
        }),
        fetchCategories()
      ]);
      setApis(apisRes.items);
      setTotalCount(apisRes.total);
      setCategories(catRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to load APIs for category '${category}'`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryData();
  }, [category, selectedSort, selectedAuth, currentPage, searchQuery]);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
  }, [category]);

  const currentCat = categories.find((c) => c.slug.toLowerCase() === category?.toLowerCase());
  const categoryTitle = currentCat ? currentCat.name : category?.replace('-', ' ').toUpperCase();
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Categories</span>
        </Link>

        {/* View mode toggle */}
        <div className="flex items-center rounded-lg bg-[#28292A] border border-[#3C4043] p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid View"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-[#3C4043] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            title="Compact List View"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'compact'
                ? 'bg-[#3C4043] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-[#28292A] rounded-2xl p-6 sm:p-8 border border-[#3C4043] space-y-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#8AB4F8]/10 border border-[#8AB4F8]/20 text-[#8AB4F8] text-xs font-mono font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Verified Directory</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Free {categoryTitle} APIs
        </h1>

        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          {currentCat?.description || `Explore our hand-curated directory of verified, genuinely free ${categoryTitle} APIs. Every endpoint is pre-tested and testable in 1 click.`}
        </p>

        <div className="text-xs font-mono text-slate-400 pt-1">
          Showing <strong className="text-white">{totalCount.toLocaleString()}</strong> verified endpoints in this category
        </div>
      </div>

      {/* Quick Category Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            to={`/category/${cat.slug}`}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors border ${
              category?.toLowerCase() === cat.slug.toLowerCase()
                ? 'bg-accent/20 border-accent text-accent font-semibold'
                : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#3C4043] hover:text-white'
            }`}
          >
            {cat.name} ({cat.count})
          </Link>
        ))}
      </div>

      {/* Toolbar with Search, Auth Filter, and Sort */}
      <div className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search inside category */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={`Filter ${categoryTitle} APIs...`}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#1F1F1F] border border-[#3C4043] text-xs text-white placeholder-slate-400 outline-none focus:border-[#8AB4F8]"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-44">
            <CustomSelect
              value={selectedAuth}
              onChange={(val) => {
                setSelectedAuth(val);
                setCurrentPage(1);
              }}
              options={AUTH_OPTIONS}
              size="sm"
              variant="surface"
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={selectedSort}
              onChange={(val) => {
                setSelectedSort(val);
                setCurrentPage(1);
              }}
              options={SORT_OPTIONS}
              size="sm"
              variant="surface"
            />
          </div>
        </div>
      </div>

      {/* API Grid & Error Diagnostics */}
      <main className="space-y-6">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            <p className="text-xs font-mono">Loading {categoryTitle} endpoints...</p>
          </div>
        ) : error ? (
          <div className="bg-[#28292A] rounded-2xl p-8 text-center border border-rose-500/30 space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
            <h3 className="text-base font-semibold text-white">Error Loading Category</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto">{error}</p>
            <button
              onClick={loadCategoryData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#303134] hover:bg-[#3C4043] text-xs text-[#8AB4F8] font-medium border border-[#3C4043] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : apis.length > 0 ? (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apis.map((api) => (
                  <ApiCard key={api.id} api={api} viewMode="grid" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {apis.map((api) => (
                  <ApiCard key={api.id} api={api} viewMode="compact" />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pt-6 pb-2 border-t border-[#3C4043] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 font-mono">
                  Page <strong className="text-white">{currentPage}</strong> of{' '}
                  <strong className="text-white">{totalPages}</strong> ({totalCount.toLocaleString()} endpoints)
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p = currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                      if (p < 1 || p > totalPages) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`min-w-[34px] h-[34px] rounded-lg text-xs font-mono font-medium transition-colors border ${
                            p === currentPage
                              ? 'bg-[#8AB4F8] border-[#8AB4F8] text-[#1F1F1F] font-bold'
                              : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#303134]'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#28292A] rounded-2xl p-12 text-center border border-[#3C4043] space-y-3">
            <FilterX className="h-9 w-9 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No endpoints match criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No APIs found in {categoryTitle} for the given filter. Try clearing the query or resetting auth requirements.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedAuth('all');
                setSelectedSort('popular');
              }}
              className="px-4 py-2 rounded-xl bg-[#8AB4F8] text-[#1F1F1F] font-semibold text-xs hover:bg-[#A8C7FA] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
