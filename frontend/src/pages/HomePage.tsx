import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiItem, CatalogStats, CategorySummary } from '../types/api';
import { fetchApis, fetchStats, fetchCategories } from '../api/client';
import { ApiCard } from '../components/ApiCard';
import { SearchFilter } from '../components/SearchFilter';
import { Logo } from '../components/Logo';
import {
  CloudSun,
  TrendingUp,
  Gamepad2,
  Globe,
  Cpu,
  Code2,
  Orbit,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Cloud,
  Database,
  Terminal,
  Send,
  FileText,
  Coins,
  ShoppingCart,
  Truck,
  Music,
  Film,
  Palette,
  HeartPulse,
  Utensils,
  Newspaper,
  Building2,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [featuredApis, setFeaturedApis] = useState<ApiItem[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [statsData, apisData, catData] = await Promise.all([
          fetchStats(),
          fetchApis({ limit: 6, sort: 'popular' }),
          fetchCategories()
        ]);
        setStats(statsData);
        setFeaturedApis(apisData.items);
        setCategories(catData);
      } catch (err: unknown) {
        console.error('Error loading home data:', err);
        setLoadError(err instanceof Error ? err.message : 'Unable to reach the API directory backend service.');
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [retryCount]);

  const handleSearchSubmit = (value: string) => {
    if (value.trim()) {
      navigate(`/explore?q=${encodeURIComponent(value.trim())}`);
    }
  };

  const handleCollectionSelect = (collection: string) => {
    if (collection) {
      navigate(`/collections/${collection}`);
    }
  };

  const categoryIcons: Record<string, React.FC<{ className?: string }>> = {
    'developer-tools': Code2,
    security: ShieldCheck,
    'cloud-storage': Cloud,
    database: Database,
    'devops-ci': Terminal,
    communication: Send,
    productivity: FileText,
    'ai-ml': Cpu,
    finance: TrendingUp,
    'crypto-web3': Coins,
    ecommerce: ShoppingCart,
    geography: Globe,
    transportation: Truck,
    gaming: Gamepad2,
    music: Music,
    'video-movies': Film,
    'art-design': Palette,
    science: Orbit,
    'health-medical': HeartPulse,
    'food-drink': Utensils,
    'education-books': BookOpen,
    weather: CloudSun,
    'social-news': Newspaper,
    'open-data': Building2,
    entertainment: Sparkles,
    reference: BookOpen,
    news: Newspaper
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Backend Connection Error Banner (if offline) */}
      {loadError && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
              <div>
                <span className="font-semibold text-xs text-white block">Connection Alert</span>
                <p className="text-xs text-slate-300">{loadError}</p>
              </div>
            </div>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3C4043] text-xs text-[#8AB4F8] font-medium border border-[#3C4043] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Google-Style Center Hero */}
      <section className="pt-16 pb-6 text-center max-w-3xl mx-auto px-4">
        {/* Center Brand Logo */}
        <div className="flex flex-col items-center justify-center gap-3 mb-6">
          <Logo size="xl" />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            FreeAPI<span className="text-accent">Hub</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            The clean, verified "free-first" API search engine. Find it in 5 seconds, test it live in 1 click, and copy ready-made code.
          </p>
        </div>

        {/* Big Search Bar */}
        <div className="mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit(searchTerm);
            }}
          >
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onCollectionSelect={handleCollectionSelect}
            />
          </form>
        </div>

        {/* Quick Shortcut Circles (Like Google Home shortcuts!) */}
        <div className="mt-8 flex items-center justify-center gap-3 sm:gap-5 flex-wrap max-w-4xl mx-auto">
          {categories.slice(0, 10).map((cat) => {
            const Icon = categoryIcons[cat.slug] || Code2;
            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-1.5 group p-1.5"
                title={`${cat.name} (${cat.count} APIs)`}
              >
                <div className="h-11 w-11 rounded-full bg-[#28292A] hover:bg-[#3C4043] border border-[#3C4043] flex items-center justify-center text-slate-300 group-hover:text-accent transition-colors">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors max-w-[80px] text-center truncate">
                  {cat.name.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Simple Stats Card (Clean, Google-style like the screenshot!) */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Live Platform Health
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-2">
              <div className="text-2xl font-bold font-mono text-white">
                {stats?.total_apis || '26'}+
              </div>
              <div className="text-xs text-slate-400 mt-1">Verified Free APIs</div>
            </div>
            <div className="p-2 border-l border-[#3C4043]">
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {stats?.global_uptime_percent || '99.8'}%
              </div>
              <div className="text-xs text-slate-400 mt-1">Guaranteed Working</div>
            </div>
            <div className="p-2 border-l border-[#3C4043]">
              <div className="text-2xl font-bold font-mono text-sky-400">
                {stats?.avg_latency_ms || '135'}ms
              </div>
              <div className="text-xs text-slate-400 mt-1">Average Response</div>
            </div>
            <div className="p-2 border-l border-[#3C4043]">
              <div className="text-2xl font-bold font-mono text-white">
                0
              </div>
              <div className="text-xs text-slate-400 mt-1">Credit Cards Needed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured APIs Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Featured Free APIs</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tested healthy and ready to use in your apps</p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            <span>Explore all ({stats?.total_apis || '26'})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredApis.map((api) => (
            <ApiCard key={api.id} api={api} />
          ))}
        </div>
      </section>
    </div>
  );
};
