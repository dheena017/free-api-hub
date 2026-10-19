import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const amount = direction === 'left' ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const handleSurpriseMe = () => {
    if (apis.length > 0) {
      const random = apis[Math.floor(Math.random() * apis.length)];
      navigate(`/api/${random.slug}`);
    }
  };

  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const authParam = searchParams.get('auth') || 'all';
  const pricingParam = searchParams.get('pricing') || 'all';
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
  const bookmarksKey = favoritesOnly ? bookmarks.join(',') : '';

  // Load categories once on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const catRes = await fetchCategories();
        setCategories(catRes);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        if (favoritesOnly && bookmarks.length === 0) {
          setApis([]);
          setTotalCount(0);
          setIsLoading(false);
          return;
        }

        const apisRes = await fetchApis({
          q: qParam || undefined,
          category: categoryParam !== 'all' ? categoryParam : undefined,
          auth_type: authParam !== 'all' ? authParam : undefined,
          pricing_tier: pricingParam !== 'all' ? pricingParam : undefined,
          sort: sortParam,
          slugs: favoritesOnly ? bookmarks.join(',') : undefined,
          limit: pageSize,
          offset: offset
        });

        setApis(apisRes.items);
        setTotalCount(apisRes.total);
      } catch (err: unknown) {
        console.error('Failed to load explore data:', err);
        setLoadError(err instanceof Error ? err.message : 'Unable to connect to the catalog API server.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [qParam, categoryParam, authParam, pricingParam, sortParam, currentPage, pageSize, retryCount, favoritesOnly, bookmarksKey]);

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
    qParam || categoryParam !== 'all' || authParam !== 'all' || pricingParam !== 'all' || favoritesOnly || sortParam !== 'popular'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner / Hero Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3C4043]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              API Catalog Explorer
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#1F1F1F] text-slate-300 border border-[#3C4043]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {favoritesOnly ? `${totalCount.toLocaleString()} Saved APIs` : `${totalCount.toLocaleString()} Verified APIs`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            Search, filter, and test verified public REST APIs without authentication roadblocks or credit card gates.
          </p>
        </div>

        {/* View Mode Toggle & Quick Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={handleSurpriseMe}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border bg-[#28292A] hover:bg-[#303134] border-[#3C4043] hover:border-[#5F6368] text-slate-300 hover:text-white transition-all"
            title="Jump to a random API to test in playground"
          >
            <Dices className="h-4 w-4 text-slate-400" />
            <span>Surprise Me</span>
          </button>

          <button
            onClick={() => updateQuery({ fav: favoritesOnly ? '0' : '1', page: '1' })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
              favoritesOnly
                ? 'bg-[#303134] border-[#5F6368] text-[#FDD663] font-semibold'
                : 'bg-[#28292A] border-[#3C4043] hover:border-[#5F6368] text-slate-300 hover:text-white hover:bg-[#303134]'
            }`}
          >
            <Star className={`h-4 w-4 ${favoritesOnly ? 'text-[#FDD663] fill-[#FDD663]' : 'text-slate-400'}`} />
            <span>Saved ({bookmarks.length})</span>
          </button>

          <div className="flex items-center rounded-xl bg-[#28292A] border border-[#3C4043] p-1">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#3C4043] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              title="Compact List View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'compact'
                  ? 'bg-[#3C4043] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Bar with Quick Filters */}
      <div className="space-y-3">
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by API name, category, feature, or keyword (e.g. weather, crypto, pokemon, geocoding)..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-[#28292A] hover:bg-[#303134] focus:bg-[#303134] border border-[#3C4043] focus:border-[#5F6368] text-white placeholder-slate-400 text-sm transition-all outline-none"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                updateQuery({ q: null, page: '1' });
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-[#3C4043] transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick popular tags */}
        {!searchInput && (
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400 pt-0.5">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Popular:</span>
            <button
              onClick={() => setSearchInput('weather')}
              className="px-2.5 py-1 rounded-lg bg-[#28292A]/80 hover:bg-[#303134] text-slate-300 hover:text-white border border-[#3C4043]/60 transition-colors shadow-sm"
            >
              ☀️ Weather
            </button>
            <button
              onClick={() => setSearchInput('crypto')}
              className="px-2.5 py-1 rounded-lg bg-[#28292A]/80 hover:bg-[#303134] text-slate-300 hover:text-white border border-[#3C4043]/60 transition-colors shadow-sm"
            >
              🪙 Crypto
            </button>
            <button
              onClick={() => setSearchInput('geolocation')}
              className="px-2.5 py-1 rounded-lg bg-[#28292A]/80 hover:bg-[#303134] text-slate-300 hover:text-white border border-[#3C4043]/60 transition-colors shadow-sm"
            >
              📍 Geolocation
            </button>
            <button
              onClick={() => setSearchInput('ai')}
              className="px-2.5 py-1 rounded-lg bg-[#28292A]/80 hover:bg-[#303134] text-slate-300 hover:text-white border border-[#3C4043]/60 transition-colors shadow-sm"
            >
              ✨ AI & ML
            </button>
            <button
              onClick={() => setSearchInput('finance')}
              className="px-2.5 py-1 rounded-lg bg-[#28292A]/80 hover:bg-[#303134] text-slate-300 hover:text-white border border-[#3C4043]/60 transition-colors shadow-sm"
            >
              📈 Finance
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Category Carousel with Smooth Chevron Navigation */}
      <div className="relative flex items-center group">
        <button
          type="button"
          onClick={() => scrollCategories('left')}
          className="hidden sm:flex items-center justify-center flex-shrink-0 mr-2 w-8 h-8 rounded-full bg-[#28292A] border border-[#3C4043] text-slate-300 hover:text-white hover:bg-[#3C4043] shadow-md transition-all z-10"
          title="Scroll categories left"
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={categoryScrollRef}
          className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs flex-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            onClick={() => updateQuery({ category: 'all', page: '1' })}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors border shadow-sm ${
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
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors border shadow-sm ${
                categoryParam === cat.slug
                  ? 'bg-accent/20 border-accent text-accent font-semibold'
                  : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#3C4043] hover:text-white'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollCategories('right')}
          className="hidden sm:flex items-center justify-center flex-shrink-0 ml-2 w-8 h-8 rounded-full bg-[#28292A] border border-[#3C4043] text-slate-300 hover:text-white hover:bg-[#3C4043] shadow-md transition-all z-10"
          title="Scroll categories right"
          aria-label="Scroll categories right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Active Filter Chips & Controls Bar */}
      <div className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Left: Active count and chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-medium inline-flex items-center gap-1.5 mr-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Showing <strong className="text-white">{Math.min(offset + 1, totalCount)}</strong> -{' '}
            <strong className="text-white">{Math.min(offset + pageSize, totalCount)}</strong> of{' '}
            <strong className="text-accent">{totalCount.toLocaleString()}</strong> APIs
          </span>

          {/* Chips */}
          {qParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-[#3C4043] text-slate-200 text-xs shadow-sm">
              <span>Query: <strong>"{qParam}"</strong></span>
              <button onClick={() => { setSearchInput(''); updateQuery({ q: null, page: '1' }); }} className="text-slate-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {categoryParam !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-[#3C4043] text-slate-200 text-xs shadow-sm">
              <span>Category: <strong>{categoryParam}</strong></span>
              <button onClick={() => updateQuery({ category: 'all', page: '1' })} className="text-slate-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {authParam !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-[#3C4043] text-slate-200 text-xs shadow-sm">
              <span>Auth: <strong>{authParam === 'none' ? 'No Key' : 'Free Key'}</strong></span>
              <button onClick={() => updateQuery({ auth: 'all', page: '1' })} className="text-slate-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {pricingParam !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-[#3C4043] text-slate-200 text-xs shadow-sm">
              <span>Pricing: <strong>{pricingParam.replace('_', ' ')}</strong></span>
              <button onClick={() => updateQuery({ pricing: 'all', page: '1' })} className="text-slate-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {favoritesOnly && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-amber-500/30 text-amber-300 text-xs shadow-sm">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>Saved Bookmarks</span>
              <button onClick={() => updateQuery({ fav: '0', page: '1' })} className="text-slate-400 hover:text-white" title="Show all APIs">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#8AB4F8] hover:underline font-semibold ml-1 inline-flex items-center gap-1"
            >
              <FilterX className="h-3 w-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {/* Right: Dropdowns (Auth, Pricing, Sort, Page Size) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auth filter */}
          <div className="w-36 sm:w-40">
            <CustomSelect
              value={authParam}
              onChange={(val) => updateQuery({ auth: val, page: '1' })}
              options={[
                { value: 'all', label: 'All Auth' },
                { value: 'none', label: '⚡ No Key' },
                { value: 'api_key', label: '🔑 API Key' }
              ]}
              size="sm"
              variant="surface"
            />
          </div>

          {/* Pricing filter */}
          <div className="w-36 sm:w-42">
            <CustomSelect
              value={pricingParam}
              onChange={(val) => updateQuery({ pricing: val, page: '1' })}
              options={[
                { value: 'all', label: 'All Pricing' },
                { value: 'open', label: '100% Free / Open' },
                { value: 'free_forever', label: 'Free Forever' },
                { value: 'freemium_no_cc', label: 'Zero CC Required' }
              ]}
              size="sm"
              variant="surface"
            />
          </div>

          {/* Sort */}
          <div className="w-40 sm:w-48">
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
          <div className="w-32 sm:w-36">
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
                  <ApiCard key={api.slug} api={api} viewMode="grid" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {apis.map((api) => (
                  <ApiCard key={api.slug} api={api} viewMode="compact" />
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
            <h3 className="text-base font-semibold text-white">
              {favoritesOnly && bookmarks.length === 0 ? "No Saved APIs" : "No matching APIs found"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {favoritesOnly && bookmarks.length === 0
                ? "You haven't bookmarked any APIs yet. Click the star icon on any card to save it here for fast access!"
                : favoritesOnly
                ? "None of your saved APIs match the current query or category filter. Try clearing filters to see all your saved APIs."
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
