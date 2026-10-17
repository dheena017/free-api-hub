import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiItem } from '../types/api';
import { fetchApis } from '../api/client';
import { ApiCard } from '../components/ApiCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { CustomSelect, SelectOption } from '../components/CustomSelect';
import {
  FolderTree,
  Zap,
  Globe,
  Database,
  ShieldCheck,
  ArrowLeft,
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
  FilterX,
  Gauge,
  Building2
} from 'lucide-react';

const SORT_OPTIONS: SelectOption[] = [
  { value: 'popular', label: 'Most Reliable', badge: 'Default' },
  { value: 'latency', label: 'Fastest Response' },
  { value: 'uptime', label: 'Highest Uptime %' },
  { value: 'alphabetical', label: 'A to Z' }
];

export const CollectionPage: React.FC = () => {
  const { filter } = useParams<{ filter: string }>();
  const [apis, setApis] = useState<ApiItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSort, setSelectedSort] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 24;

  const collections = [
    {
      id: 'no-auth',
      name: 'No Registration / No Key',
      tagline: 'Instant Zero-Auth APIs',
      icon: Zap,
      description:
        'These endpoints require absolutely zero accounts, API tokens, or secrets. Perfect for hackathons, student projects, and rapid prototyping without setup friction.'
    },
    {
      id: 'cors-enabled',
      name: 'CORS-Ready Endpoints',
      tagline: 'Direct Browser Execution',
      icon: Globe,
      description:
        'These APIs return explicit Access-Control-Allow-Origin headers, meaning you can fetch them straight from client-side vanilla JavaScript or React without needing a proxy server.'
    },
    {
      id: 'fast-response',
      name: 'Ultra Fast (<120ms)',
      tagline: 'Lightning Latency',
      icon: Gauge,
      description:
        'Blazing fast response times verified under 120 milliseconds. Ideal for high-throughput mobile apps, autocompletes, and interactive micro-interactions.'
    },
    {
      id: 'open-data',
      name: 'Public & Open Datasets',
      tagline: 'Science, Civic & Geodata',
      icon: Building2,
      description:
        'Free governmental, scientific, astronomical, meteorological, and educational repositories with zero licensing restrictions.'
    },
    {
      id: 'mock-data',
      name: 'Mock & Prototype Data',
      tagline: 'Realistic Test Fixtures',
      icon: Database,
      description:
        'Ready-made fixtures for users, products, posts, and geographic locations. Ideal for wireframing UI components before backend development starts.'
    },
    {
      id: 'high-uptime',
      name: 'Ultra High Reliability (99.7%+)',
      tagline: 'Enterprise Uptime Standards',
      icon: ShieldCheck,
      description:
        'The most dependable free APIs in our entire directory. Each has passed hundreds of automated daily health checks with near-zero downtime.'
    }
  ];

  const currentCollection =
    collections.find((c) => c.id === filter) || collections[0];

  const loadCollection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApis({
        collection: currentCollection.id,
        q: searchQuery || undefined,
        sort: selectedSort,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      });
      setApis(res.items);
      setTotalCount(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to load collection '${currentCollection.name}'`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCollection();
  }, [currentCollection.id, selectedSort, currentPage, searchQuery]);

  // Reset page when collection changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
  }, [filter]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const Icon = currentCollection.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All APIs</span>
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

      {/* Collection Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {collections.map((col) => {
          const TabIcon = col.icon;
          const isSelected = col.id === currentCollection.id;
          return (
            <Link
              key={col.id}
              to={`/collections/${col.id}`}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap font-medium transition-colors border ${
                isSelected
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                  : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#303134] hover:text-white'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              <span>{col.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Hero Header */}
      <div className="bg-[#28292A] rounded-2xl p-6 sm:p-8 border border-[#3C4043] space-y-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#8AB4F8]/10 border border-[#8AB4F8]/20 text-[#8AB4F8] text-xs font-mono font-medium">
          <Icon className="h-3.5 w-3.5" />
          <span>{currentCollection.tagline}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {currentCollection.name}
        </h1>

        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          {currentCollection.description}
        </p>

        <div className="text-xs font-mono text-slate-400 pt-1">
          Showing <strong className="text-white">{totalCount.toLocaleString()}</strong> verified endpoints in this collection
        </div>
      </div>

      {/* Search & Sort Toolbar */}
      <div className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={`Search within ${currentCollection.name}...`}
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

        <div className="w-48">
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

      {/* Main Grid */}
      <main className="space-y-6">
        {isLoading ? (
          <SkeletonGrid count={pageSize} viewMode={viewMode} />
        ) : error ? (
          <div className="bg-[#28292A] rounded-2xl p-8 text-center border border-rose-500/30 space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
            <h3 className="text-base font-semibold text-white">Error Loading Collection</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto">{error}</p>
            <button
              onClick={loadCollection}
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
            <h3 className="text-base font-semibold text-white">No endpoints found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No APIs match your current search query in this collection.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSort('popular');
              }}
              className="px-4 py-2 rounded-xl bg-[#8AB4F8] text-[#1F1F1F] font-semibold text-xs hover:bg-[#A8C7FA] transition-colors"
            >
              Reset Search
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
