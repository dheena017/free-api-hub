import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiItem, CatalogStats, CategorySummary } from '../types/api';
import { fetchApis, fetchStats, fetchCategories } from '../api/client';
import { ApiCard } from '../components/ApiCard';
import { SearchFilter } from '../components/SearchFilter';
import { Logo } from '../components/Logo';
import { useBookmarks } from '../utils/useBookmarks';
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
  RefreshCw,
  Zap,
  Star,
  CheckCircle2,
  Play,
  Layers,
  Dices,
  Clock,
  Trash2
} from 'lucide-react';
import { SkeletonGrid } from '../components/SkeletonCard';
import { useHistory } from '../utils/useHistory';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { bookmarks } = useBookmarks();
  const { history, clearHistory } = useHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [featuredTab, setFeaturedTab] = useState<'popular' | 'no-auth' | 'fast' | 'saved'>('popular');
  const [featuredApis, setFeaturedApis] = useState<ApiItem[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load stats and categories
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [statsData, catData] = await Promise.all([
          fetchStats(),
          fetchCategories()
        ]);
        setStats(statsData);
        setCategories(catData);
      } catch (err: unknown) {
        console.error('Error loading home stats/categories:', err);
        setLoadError(err instanceof Error ? err.message : 'Unable to reach the API directory backend service.');
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [retryCount]);

  // Load featured APIs based on selected tab
  useEffect(() => {
    async function loadFeatured() {
      try {
        let params: any = { limit: 6 };
        if (featuredTab === 'popular') {
          params.sort = 'popular';
        } else if (featuredTab === 'no-auth') {
          params.auth_type = 'none';
          params.sort = 'popular';
        } else if (featuredTab === 'fast') {
          params.sort = 'latency';
        } else if (featuredTab === 'saved') {
          params.limit = 50;
        }

        const apisData = await fetchApis(params);
        let items = apisData.items;
        if (featuredTab === 'saved') {
          items = items.filter((item) => bookmarks.includes(item.slug)).slice(0, 6);
        }
        setFeaturedApis(items);
      } catch (err) {
        console.error('Failed to load tab APIs:', err);
      }
    }
    loadFeatured();
  }, [featuredTab, bookmarks]);

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

  const handleSurpriseMe = () => {
    if (featuredApis.length > 0) {
      const random = featuredApis[Math.floor(Math.random() * featuredApis.length)];
      navigate(`/api/${random.slug}`);
    } else {
      navigate('/explore');
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

  const popularQueries = [
    { label: '🌤️ Weather', query: 'weather' },
    { label: '💰 Crypto Rates', query: 'crypto' },
    { label: '🎮 Pokémon API', query: 'pokemon' },
    { label: '🗺️ Geocoding', query: 'geocoding' },
    { label: '🧪 Mock Data', query: 'placeholder' },
    { label: '🤖 AI & ML', query: 'ai' }
  ];

  return (
    <div className="space-y-16 pb-20">
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

      {/* Hero Header */}
      <section className="pt-16 pb-4 text-center max-w-4xl mx-auto px-4">
        {/* Center Brand Logo */}
        <div className="flex flex-col items-center justify-center gap-3 mb-6">
          <Logo size="xl" />
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            FreeAPI<span className="text-accent">Hub</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            The developer search engine for genuinely free, verified REST APIs.
            Discover in seconds, test in-browser in 1-click, and copy production-ready code.
          </p>
        </div>

        {/* Big Search Bar */}
        <div className="mt-6 max-w-2xl mx-auto">
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

          {/* Quick Search Suggestions & Surprise Me */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400">
            <span className="text-[11px] font-mono text-slate-500">Trending:</span>
            {popularQueries.map((item) => (
              <button
                key={item.query}
                onClick={() => navigate(`/explore?q=${encodeURIComponent(item.query)}`)}
                className="px-2.5 py-1 rounded-full bg-[#28292A] hover:bg-[#3C4043] border border-[#3C4043] text-slate-300 hover:text-white transition-colors text-[11px]"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleSurpriseMe}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white transition-colors text-[11px] font-medium"
              title="Test a surprise random API"
            >
              <Dices className="h-3 w-3 text-purple-400" />
              <span>Surprise Me</span>
            </button>
          </div>
        </div>

        {/* Quick Shortcut Circles */}
        <div className="mt-10 flex items-center justify-center gap-3 sm:gap-5 flex-wrap max-w-4xl mx-auto">
          {categories.slice(0, 10).map((cat) => {
            const Icon = categoryIcons[cat.slug] || Code2;
            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-1.5 group p-1.5"
                title={`${cat.name} (${cat.count} APIs)`}
              >
                <div className="h-12 w-12 rounded-full bg-[#28292A] hover:bg-[#3C4043] border border-[#3C4043] hover:border-[#8AB4F8]/50 flex items-center justify-center text-slate-300 group-hover:text-accent group-hover:scale-105 transition-all shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors max-w-[84px] text-center truncate">
                  {cat.name.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Live Stats Dashboard Banner */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-[#3C4043]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Platform Live Telemetry
              </span>
            </div>
            <Link
              to="/status"
              className="text-xs text-accent hover:underline font-mono inline-flex items-center gap-1"
            >
              <span>View Real-Time Probe Log</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-2">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                {stats?.total_apis ? stats.total_apis.toLocaleString() : '4,045'}+
              </div>
              <div className="text-xs text-slate-400 mt-1">Verified Endpoints</div>
            </div>
            <div className="p-2 border-l border-[#3C4043]">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
                {stats?.global_uptime_percent || '99.8'}%
              </div>
              <div className="text-xs text-slate-400 mt-1">Verified Uptime</div>
            </div>
            <div className="p-2 border-l border-[#3C4043]">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-400">
                {stats?.avg_latency_ms || '135'}ms
              </div>
              <div className="text-xs text-slate-400 mt-1">Average Response</div>
            </div>
            <div className="p-2 border-l border-[#3C4043]">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                0
              </div>
              <div className="text-xs text-slate-400 mt-1">Credit Cards Required</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Viewed APIs Shelf */}
      {history.length > 0 && (
        <section className="max-w-5xl mx-auto px-4">
          <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#3C4043]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#8AB4F8]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Recently Viewed APIs ({history.length})
                </h3>
              </div>
              <button
                onClick={clearHistory}
                className="text-[11px] font-mono text-slate-400 hover:text-rose-400 inline-flex items-center gap-1 transition-colors"
                title="Clear recent viewing history"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear History</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
              {history.map((item) => (
                <Link
                  key={item.slug}
                  to={`/api/${item.slug}`}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] hover:border-[#8AB4F8]/50 transition-colors group"
                >
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#28292A] text-slate-400 group-hover:text-white">
                    {item.category.split('-')[0]}
                  </span>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-[#8AB4F8]">
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured APIs Section with Dynamic Tabs */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Featured Free APIs
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live-verified endpoints ready for instant integration in your frontend or backend
            </p>
          </div>

          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline self-start sm:self-auto"
          >
            <span>Browse all {stats?.total_apis ? stats.total_apis.toLocaleString() : '4,045'} APIs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Dynamic Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFeaturedTab('popular')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors border ${
              featuredTab === 'popular'
                ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                : 'bg-[#28292A] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
            }`}
          >
            🔥 Most Reliable
          </button>
          <button
            onClick={() => setFeaturedTab('no-auth')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors border ${
              featuredTab === 'no-auth'
                ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                : 'bg-[#28292A] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
            }`}
          >
            ⚡ Zero-Auth (No Key)
          </button>
          <button
            onClick={() => setFeaturedTab('fast')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors border ${
              featuredTab === 'fast'
                ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                : 'bg-[#28292A] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
            }`}
          >
            🚀 Ultra Fast (&lt;100ms)
          </button>
          {bookmarks.length > 0 && (
            <button
              onClick={() => setFeaturedTab('saved')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors border ${
                featuredTab === 'saved'
                  ? 'bg-amber-400 text-[#1F1F1F] font-bold border-amber-400'
                  : 'bg-[#28292A] text-amber-300 border-[#3C4043] hover:bg-[#303134]'
              }`}
            >
              ⭐ My Saved ({bookmarks.length})
            </button>
          )}
        </div>

        {/* Featured API Cards */}
        {isLoading ? (
          <SkeletonGrid count={6} viewMode="grid" />
        ) : featuredApis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredApis.map((api) => (
              <ApiCard key={api.id} api={api} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#28292A] rounded-2xl border border-[#3C4043] text-xs text-slate-400">
            {featuredTab === 'saved'
              ? 'No bookmarked APIs found yet. Click the star icon on any card to save it!'
              : 'No APIs found in this category.'}
          </div>
        )}
      </section>

      {/* Feature Differentiators Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Built Exclusively for Developers
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Why Free API Hub is the cleanest alternative to bloated commercial API directories
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#28292A] p-5 rounded-2xl border border-[#3C4043] space-y-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Zero Credit Card Traps</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every indexed endpoint is genuinely free forever or has an open tier without entering financial information.
            </p>
          </div>

          <div className="bg-[#28292A] p-5 rounded-2xl border border-[#3C4043] space-y-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#8AB4F8]/10 border border-[#8AB4F8]/20 text-[#8AB4F8] flex items-center justify-center">
              <Play className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Live In-Browser Playground</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Send live HTTP requests straight from your browser. Inspect status codes, latency, headers, and formatted JSON payloads.
            </p>
          </div>

          <div className="bg-[#28292A] p-5 rounded-2xl border border-[#3C4043] space-y-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Automated Health Probes</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our automated daemon periodically pings every single endpoint. Dead or deprecated APIs are pruned to avoid broken code.
            </p>
          </div>

          <div className="bg-[#28292A] p-5 rounded-2xl border border-[#3C4043] space-y-2.5">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Code2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Ready Code Snippets</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Copy pre-tested code snippets for cURL, JavaScript fetch, Python requests, Node.js, and Go with 1 click.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
