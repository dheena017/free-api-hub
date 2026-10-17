import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiItem } from '../types/api';
import { fetchApis } from '../api/client';
import { ApiCard } from '../components/ApiCard';
import { CustomSelect, SelectOption } from '../components/CustomSelect';
import { FolderTree, Zap, Globe, Database, ShieldCheck, ArrowLeft, AlertCircle, AlertTriangle, RefreshCw, HelpCircle, Compass } from 'lucide-react';

const SORT_OPTIONS: SelectOption[] = [
  { value: 'popular', label: 'Most Reliable', badge: 'Default' },
  { value: 'latency', label: 'Fastest Response' },
  { value: 'uptime', label: 'Highest Uptime %' },
  { value: 'alphabetical', label: 'A to Z' }
];

export const CollectionPage: React.FC = () => {
  const { filter } = useParams<{ filter: string }>();
  const [apis, setApis] = useState<ApiItem[]>([]);
  const [selectedSort, setSelectedSort] = useState('popular');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        sort: selectedSort,
        limit: 50
      });
      setApis(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to load collection '${currentCollection.name}'`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCollection();
  }, [currentCollection.id, selectedSort]);

  const Icon = currentCollection.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to All APIs</span>
      </Link>

      {/* Collection Navigation Tabs */}
      {/* Collection Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {collections.map((col) => {
          const TabIcon = col.icon;
          const isSelected = col.id === currentCollection.id;
          return (
            <Link
              key={col.id}
              to={`/collections/${col.id}`}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                isSelected
                  ? 'bg-[#8AB4F8]/20 border-[#8AB4F8] text-[#8AB4F8] font-semibold'
                  : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:text-white hover:bg-[#303134]'
              }`}
            >
              <TabIcon className="h-3.5 w-3.5" />
              <span>{col.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Editorial Header */}
      <div className="bg-[#28292A] rounded-2xl p-6 sm:p-8 border border-[#3C4043] space-y-3">
        <div className="flex items-center gap-2 text-[#8AB4F8] text-xs font-mono font-medium">
          <Icon className="h-4 w-4" />
          <span>Curated Collection</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {currentCollection.name}
        </h1>

        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          {currentCollection.description}
        </p>

        <div className="text-xs font-mono text-slate-400 pt-1">
          Showing <strong className="text-white">{apis.length}</strong> verified endpoints
        </div>
      </div>

      {/* Sort Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-slate-400 font-medium">
          Sort {currentCollection.name}
        </span>
        <div className="w-48">
          <CustomSelect
            value={selectedSort}
            onChange={setSelectedSort}
            options={SORT_OPTIONS}
            size="sm"
            variant="surface"
          />
        </div>
      </div>

      {/* Results Grid & Error Diagnostics */}
      <main className="space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8AB4F8]" />
            <p className="text-xs">Filtering collection endpoints...</p>
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
                    Collection Query Error
                  </h2>
                  <p className="text-xs font-mono text-rose-300">
                    {error}
                  </p>
                </div>
              </div>

              <button
                onClick={loadCollection}
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
                <li>Confirm the backend is online at port 8000 (<code className="text-slate-200 bg-[#28292A] px-1 rounded">http://localhost:8000/api/v1/health</code>).</li>
                <li>Switch the sort order to "Most Reliable" or "Fastest Response".</li>
                <li>Explore all verified APIs directly in the directory.</li>
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
            <h3 className="text-base font-semibold text-white">No APIs Found in this Curated Collection</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              We only list verified, authentic REST APIs that meet this collection's criteria. Every endpoint is pre-tested and active.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                to="/explore"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-xs font-semibold text-[#1F1F1F] transition-colors"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Explore All Categories</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
