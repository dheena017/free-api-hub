import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ApiItem, CategorySummary } from '../types/api';
import { fetchApis, fetchCategories } from '../api/client';
import { ApiCard } from '../components/ApiCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { CustomSelect } from '../components/CustomSelect';
import { useBookmarks } from '../utils/useBookmarks';
import {
  Search,
  X,
  FilterX,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Star,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Zap,
  Globe,
  SlidersHorizontal,
  Dices
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [
  { value: '24', label: '24 per page' },
  { value: '48', label: '48 per page' },
  { value: '96', label: '96 per page' }
];

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bookmarks } = useBookmarks();

  const handleSurpriseMe = () => {
    if (apis.length > 0) {
      const random = apis[Math.floor(Math.random() * apis.length)];
      navigate(`/api/${random.slug}`);
    }
  };

  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const authParam = searchParams.get('auth') || 'all';
  const sortParam = searchParams.get('sort') || 'popular';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limitParam = parseInt(searchParams.get('limit') || '24', 10);
  const favoritesOnly = searchParams.get('fav') === '1';

  const [apis, setApis] = useState<ApiItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [searchInput, setSearchInput] = useState(qParam);

  // Sync search input if URL changes
  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  // Debounced search input handler
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== qParam) {
        updateQuery({ q: searchInput, page: '1' });
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const updateQuery = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === '' || val === 'all' || (key === 'sort' && val === 'popular') || (key === 'page' && val === '1') || (key === 'limit' && val === '24') || (key === 'fav' && val === '0')) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    setSearchParams(next);
  };

  const currentPage = Math.max(1, pageParam);
  const pageSize = limitParam;
  const offset = (currentPage - 1) * pageSize;

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
            sort: sortParam,
            limit: pageSize,
            offset: offset
          }),
          fetchCategories()
        ]);

        let items = apisRes.items;
        let total = apisRes.total;

        // If client-side favorite filtering is requested
        if (favoritesOnly) {
          items = items.filter((item) => bookmarks.includes(item.slug));
          total = items.length;
        }

        setApis(items);
        setTotalCount(total);
        setCategories(catRes);
      } catch (err: unknown) {
        console.error('Failed to load explore data:', err);
        setLoadError(err instanceof Error ? err.message : 'Unable to connect to the catalog API server.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [qParam, categoryParam, authParam, sortParam, currentPage, pageSize, retryCount, favoritesOnly, bookmarks]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateQuery({ page: newPage.toString() });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  // Build active filter tags
  const hasActiveFilters = Boolean(
    qParam || categoryParam !== 'all' || authParam !== 'all' || favoritesOnly || sortParam !== 'popular'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner / Hero Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#3C4043]/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              API Catalog Explorer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#8AB4F8]/10 text-[#8AB4F8] border border-[#8AB4F8]/20">
              {totalCount.toLocaleString()} Verified APIs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, and instantly test genuine REST APIs without authentication roadblocks or credit card gates.
          </p>
        </div>

        {/* View Mode Toggle & Favorites Quick Switch */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={handleSurpriseMe}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-[#28292A] border-[#3C4043] text-purple-300 hover:text-white hover:bg-purple-500/15 hover:border-purple-500/30 transition-colors"
            title="Jump to a random API to test in playground"
          >
            <Dices className="h-3.5 w-3.5 text-purple-400" />
            <span>Surprise Me</span>
          </button>

          <button
            onClick={() => updateQuery({ fav: favoritesOnly ? '0' : '1', page: '1' })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              favoritesOnly
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 font-semibold'
                : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:text-white hover:bg-[#303134]'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${favoritesOnly ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
            <span>Saved ({bookmarks.length})</span>
          </button>

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
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-3xl mx-auto">
        <div className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by API name, category, feature, or keyword (e.g. weather, crypto, pokemon, geocoding)..."
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-[#28292A] hover:bg-[#303134] focus:bg-[#303134] border border-[#3C4043] focus:border-[#8AB4F8] text-white placeholder-slate-400 text-sm transition-all outline-none shadow-sm"
        />
        {searchInput && (
          <button
            onClick={() => {
              setSearchInput('');
              updateQuery({ q: null, page: '1' });
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-[#3C4043]"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Horizontal Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <button
          onClick={() => updateQuery({ category: 'all', page: '1' })}
          className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors border ${
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
            onClick={() => updateQuery({ category: cat.slug, page: '1' })}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors border ${
              categoryParam === cat.slug
                ? 'bg-accent/20 border-accent text-accent font-semibold'
                : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#3C4043] hover:text-white'
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Active Filter Chips & Controls Bar */}
      <div className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Active count and chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-medium">
            Showing <strong className="text-white">{Math.min(offset + 1, totalCount)}</strong> -{' '}
            <strong className="text-white">{Math.min(offset + pageSize, totalCount)}</strong> of{' '}
            <strong className="text-accent">{totalCount.toLocaleString()}</strong> APIs
          </span>

          {/* Chips */}
          {qParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-[#3C4043] text-slate-200 text-xs">
              <span>Query: <strong>"{qParam}"</strong></span>
              <button onClick={() => { setSearchInput(''); updateQuery({ q: null, page: '1' }); }} className="text-slate-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {categoryParam !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-[#3C4043] text-slate-200 text-xs">
              <span>Category: <strong>{categoryParam}</strong></span>
              <button onClick={() => updateQuery({ category: 'all', page: '1' })} className="text-slate-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {authParam !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-[#3C4043] text-slate-200 text-xs">
              <span>Auth: <strong>{authParam === 'none' ? 'No Key' : 'Free Key'}</strong></span>
              <button onClick={() => updateQuery({ auth: 'all', page: '1' })} className="text-slate-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#8AB4F8] hover:underline font-semibold ml-1"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Right: Dropdowns (Auth, Sort, Page Size) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auth filter */}
          <div className="w-40">
            <CustomSelect
              value={authParam}
              onChange={(val) => updateQuery({ auth: val, page: '1' })}
              options={[
                { value: 'all', label: 'All Auth Types' },
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
              onChange={(val) => updateQuery({ sort: val, page: '1' })}
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

          {/* Page Size */}
          <div className="w-36">
            <CustomSelect
              value={pageSize.toString()}
              onChange={(val) => updateQuery({ limit: val, page: '1' })}
              options={PAGE_SIZE_OPTIONS}
              size="sm"
              variant="surface"
            />
          </div>
        </div>
      </div>

      {/* Main Grid or Compact List */}
      <main>
        {isLoading ? (
          <SkeletonGrid count={pageSize > 24 ? 12 : pageSize} viewMode={viewMode} />
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

            {/* Pagination Component */}
            {totalPages > 1 && (
              <div className="pt-8 pb-4 border-t border-[#3C4043] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 font-mono">
                  Page <strong className="text-white">{currentPage}</strong> of{' '}
                  <strong className="text-white">{totalPages}</strong> ({totalCount.toLocaleString()} total entries)
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber = currentPage;
                      if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      if (pageNumber < 1 || pageNumber > totalPages) return null;

                      const isActive = pageNumber === currentPage;
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`min-w-[34px] h-[34px] rounded-lg text-xs font-mono font-medium transition-colors border ${
                            isActive
                              ? 'bg-[#8AB4F8] border-[#8AB4F8] text-[#1F1F1F] font-bold shadow-sm'
                              : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#303134] hover:text-white'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#28292A] rounded-2xl p-12 text-center border border-[#3C4043] space-y-4">
            <FilterX className="h-10 w-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No matching APIs found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {favoritesOnly
                ? "You haven't bookmarked any APIs yet. Click the star icon on any card to save it here for fast access!"
                : "Try typing a different keyword, clearing specific filters, or choosing 'All Categories'."}
            </p>
            <div className="pt-1">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-[#8AB4F8] hover:bg-[#A8C7FA] text-xs text-[#1F1F1F] font-semibold transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
