import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiItem, CatalogStats, CategorySummary } from '../types/api';
import { fetchApis, fetchStats, fetchCategories } from '../api/client';
import { ApiCard } from '../components/api-detail';
import { SearchFilter } from '../components/ui';
import { Logo } from '../components/layout';
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
  Trash2,
  X,
  Activity,
  Trophy,
  PawPrint
} from 'lucide-react';
import { SkeletonGrid } from '../components/ui';
import { useHistory } from '../utils/useHistory';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { bookmarks } = useBookmarks();
  const { history, clearHistory, removeHistoryItem } = useHistory();
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
  }, [featuredTab, featuredTab === 'saved' ? bookmarks.join(',') : '']);

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
    sports: Trophy,
    animals: PawPrint,
    'social-news': Newspaper,
    'open-data': Building2,
    entertainment: Sparkles,
    reference: BookOpen,
    news: Newspaper
  };

  const popularQueries = categories.length > 0
    ? categories.slice(0, 6).map((c) => ({
        label: c.name,
        query: c.slug
      }))
    : [];

  const categoryThemes: Record<string, { iconColor: string; bg: string; border: string }> = {
    'developer-tools': { iconColor: 'text-sky-400', bg: 'bg-sky-500/10', border: 'hover:border-sky-500/50' },
    security: { iconColor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/50' },
    'cloud-storage': { iconColor: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'hover:border-cyan-500/50' },
    database: { iconColor: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'hover:border-indigo-500/50' },
    'devops-ci': { iconColor: 'text-violet-400', bg: 'bg-violet-500/10', border: 'hover:border-violet-500/50' },
    'ai-ml': { iconColor: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'hover:border-fuchsia-500/50' },
    finance: { iconColor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/50' },
    'crypto-web3': { iconColor: 'text-amber-400', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/50' },
    geography: { iconColor: 'text-teal-400', bg: 'bg-teal-500/10', border: 'hover:border-teal-500/50' },
    weather: { iconColor: 'text-sky-400', bg: 'bg-sky-500/10', border: 'hover:border-sky-500/50' },
    productivity: { iconColor: 'text-purple-400', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/50' },
    science: { iconColor: 'text-blue-400', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/50' },
    entertainment: { iconColor: 'text-pink-400', bg: 'bg-pink-500/10', border: 'hover:border-pink-500/50' },
    gaming: { iconColor: 'text-rose-400', bg: 'bg-rose-500/10', border: 'hover:border-rose-500/50' }
  };

  return (
    <div className="space-y-16 pb-24 relative overflow-hidden">
      {/* Backend Connection Error Banner (if offline) */}
      {loadError && (
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-500">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
              <div>
                <span className="font-semibold text-xs text-text-base block">Connection Alert</span>
                <p className="text-xs text-text-muted">{loadError}</p>
              </div>
            </div>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated text-xs text-accent font-medium border border-border transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <section className="pt-12 sm:pt-16 pb-4 text-center max-w-5xl mx-auto px-4">
        {/* Value Prop Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {stats ? `${stats.total_apis.toLocaleString()} Verified Free REST APIs` : 'Verified Free REST APIs'} • Zero Credit Card Traps
          </span>
        </div>

        {/* Center Brand Logo & Title */}
        <div className="flex flex-col items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-surface border border-border shadow-sm mb-1">
            <Logo size="xl" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-text-base tracking-tight">
            FreeAPI<span className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">Hub</span>
          </h1>
          <p className="text-sm sm:text-base text-text-muted max-w-xl mx-auto leading-relaxed">
            The developer search engine for genuinely free, verified REST APIs.
            Discover in seconds, test live in your browser, and export production-ready code.
          </p>
        </div>

        {/* Search Bar */}
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
          <div className="mt-3.5 flex items-center justify-center gap-2 flex-wrap text-xs text-text-muted">
            <span className="text-[11px] font-mono text-text-muted">Trending:</span>
            {popularQueries.map((item) => (
              <button
                key={item.query}
                onClick={() => navigate(`/explore?q=${encodeURIComponent(item.query)}`)}
                className="px-2.5 py-1 rounded-full bg-surface hover:bg-surface-elevated border border-border hover:border-border-light text-text-muted hover:text-text-base transition-all text-[11px] cursor-pointer"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleSurpriseMe}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface hover:bg-surface-elevated border border-border hover:border-border-light text-text-muted hover:text-text-base transition-all text-[11px] font-medium cursor-pointer"
              title="Test a surprise random API"
            >
              <Dices className="h-3 w-3 text-text-muted" />
              <span>Surprise Me</span>
            </button>
          </div>
        </div>

        {/* Quick Shortcut Category Capsules */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 max-w-5xl mx-auto">
          {categories.slice(0, 10).map((cat) => {
            const Icon = categoryIcons[cat.slug] || Code2;

            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-surface hover:bg-surface-elevated border border-border hover:border-border-light group transition-all duration-150 shadow-sm"
                title={`${cat.name} (${cat.count} APIs)`}
              >
                <div className="h-10 w-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-muted group-hover:text-text-base transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-text-muted group-hover:text-text-base transition-colors text-center truncate w-full">
                  {cat.name.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Live Stats Dashboard Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-surface border border-border p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 animate-pulse" />
              </span>
              <div>
                <span className="text-xs font-bold text-text-base uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>Platform Live Telemetry</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                    All Systems Operational
                  </span>
                </span>
                <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                  Autonomous health daemon pings every endpoint 24/7/365
                </p>
              </div>
            </div>

            <Link
              to="/status"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border hover:border-border-light text-xs font-mono text-text-muted hover:text-text-base transition-all self-start sm:self-auto group"
            >
              <span>View Real-Time Probe Log</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Stat 1 */}
            <div className="bg-surface-elevated border border-border hover:border-border-light rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-colors shadow-sm">
              <div className="text-xs text-text-muted font-medium mb-1 flex items-center justify-between">
                <span>Verified Endpoints</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Indexed</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-text-base tracking-tight">
                {stats?.total_apis ? stats.total_apis.toLocaleString() : '4,045'}+
              </div>
              <div className="text-[11px] text-text-muted mt-2 font-mono">
                Across 24 Developer Categories
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-surface-elevated border border-border hover:border-border-light rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-colors shadow-sm">
              <div className="text-xs text-text-muted font-medium mb-1 flex items-center justify-between">
                <span>Verified Uptime</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">24h SLA</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                {stats?.global_uptime_percent || '99.79'}%
              </div>
              {/* Mini visual uptime bars */}
              <div className="flex items-center gap-1 mt-2.5">
                {[...Array(14)].map((_, i) => (
                  <span
                    key={i}
                    className="h-2 flex-1 rounded-sm bg-emerald-500/60 hover:bg-emerald-500 transition-colors"
                    title="Probe Successful"
                  />
                ))}
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-surface-elevated border border-border hover:border-border-light rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-colors shadow-sm">
              <div className="text-xs text-text-muted font-medium mb-1 flex items-center justify-between">
                <span>Average Response</span>
                <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">Global</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-text-base tracking-tight">
                {stats?.avg_latency_ms || '127'}ms
              </div>
              <div className="text-[11px] text-text-muted mt-2 font-mono">
                ⚡ Sub-150ms Speed Tier
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-surface-elevated border border-border hover:border-border-light rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-colors shadow-sm">
              <div className="text-xs text-text-muted font-medium mb-1 flex items-center justify-between">
                <span>Credit Cards</span>
                <span className="text-[10px] font-mono text-text-muted bg-surface px-1.5 py-0.5 rounded">Guaranteed</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-text-base tracking-tight">
                $0
              </div>
              <div className="text-[11px] text-text-muted mt-2 font-mono">
                100% Free Tiers Forever
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Viewed APIs Shelf */}
      {history.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                <h3 className="text-xs font-bold text-text-base uppercase tracking-wider font-mono">
                  Recently Viewed APIs ({history.length})
                </h3>
              </div>
              <button
                onClick={clearHistory}
                className="text-[11px] font-mono text-text-muted hover:text-rose-500 inline-flex items-center gap-1.5 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                title="Clear recent viewing history"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear History</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {history.map((item) => (
                <div
                  key={item.slug}
                  className="flex-shrink-0 flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border hover:border-border-light transition-all group"
                >
                  <Link
                    to={`/api/${item.slug}`}
                    className="flex items-center gap-2"
                  >
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface text-text-muted group-hover:text-text-base border border-border">
                      {item.category.split('-')[0]}
                    </span>
                    <span className="text-xs font-semibold text-text-base transition-colors whitespace-nowrap">
                      {item.name}
                    </span>
                  </Link>
                  <button
                    onClick={() => removeHistoryItem(item.slug)}
                    className="p-1 rounded-md text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-1 cursor-pointer"
                    title={`Remove ${item.name} from history`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured APIs Section with Dynamic Tabs */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 uppercase tracking-wider mb-1">
              <Sparkles className="h-3 w-3" />
              <span>Curated Endpoints</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-base tracking-tight">
              Featured Free APIs
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Live-verified endpoints ready for instant integration in your frontend or backend
            </p>
          </div>

          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border hover:border-border-light text-xs font-semibold text-text-muted hover:text-text-base transition-all self-start sm:self-auto group shadow-sm"
          >
            <span>Browse all {stats?.total_apis ? stats.total_apis.toLocaleString() : '4,045'} APIs</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Dynamic Tabs - Segmented Pill Control */}
        <div className="inline-flex p-1.5 rounded-2xl bg-surface-elevated border border-border gap-1.5 overflow-x-auto no-scrollbar shadow-inner">
          <button
            onClick={() => setFeaturedTab('popular')}
            className={`px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
              featuredTab === 'popular'
                ? 'bg-accent text-background font-bold shadow-sm'
                : 'text-text-muted hover:text-text-base hover:bg-surface font-medium'
            }`}
          >
            🔥 Most Reliable
          </button>
          <button
            onClick={() => setFeaturedTab('no-auth')}
            className={`px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
              featuredTab === 'no-auth'
                ? 'bg-accent text-background font-bold shadow-sm'
                : 'text-text-muted hover:text-text-base hover:bg-surface font-medium'
            }`}
          >
            ⚡ Zero-Auth (No Key)
          </button>
          <button
            onClick={() => setFeaturedTab('fast')}
            className={`px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
              featuredTab === 'fast'
                ? 'bg-accent text-background font-bold shadow-sm'
                : 'text-text-muted hover:text-text-base hover:bg-surface font-medium'
            }`}
          >
            🚀 Ultra Fast (&lt;100ms)
          </button>
          {bookmarks.length > 0 && (
            <button
              onClick={() => setFeaturedTab('saved')}
              className={`px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                featuredTab === 'saved'
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-base hover:bg-surface font-medium'
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredApis.map((api) => (
              <ApiCard key={api.slug} api={api} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-surface rounded-2xl border border-border text-sm text-text-muted shadow-sm">
            {featuredTab === 'saved'
              ? 'No bookmarked APIs found yet. Click the star icon on any card to save it!'
              : 'No APIs found in this category.'}
          </div>
        )}
      </section>

      {/* Comprehensive Categories Directory Grid */}
      <section id="categories-directory" className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-accent uppercase tracking-wider mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span>Full Category Index</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-base tracking-tight">
              Explore by API Category
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Discover verified free APIs across {categories.length} organized developer domains
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline self-start sm:self-auto"
          >
            <span>View All in Directory</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.slug] || Code2;
            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="p-4 rounded-2xl bg-surface hover:bg-surface-elevated border border-border hover:border-border-light transition-all group flex flex-col justify-between space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-accent group-hover:scale-105 transition-transform flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-surface-elevated border border-border text-text-muted group-hover:text-text-base">
                    {cat.count} APIs
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-base group-hover:text-accent transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-text-muted line-clamp-2 mt-1 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Feature Differentiators Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
            <span>Why Developers Choose Us</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-base tracking-tight">
            Built Exclusively for Developers
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1.5">
            Why Free API Hub is the cleanest alternative to bloated commercial API directories
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-surface hover:bg-surface-elevated p-6 rounded-2xl border border-border hover:border-border-light space-y-3 transition-colors group shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-surface-elevated border border-border text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-text-base transition-colors">Zero Credit Card Traps</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Every indexed endpoint is genuinely free forever or has an open tier without entering financial information.
            </p>
          </div>

          <div className="bg-surface hover:bg-surface-elevated p-6 rounded-2xl border border-border hover:border-border-light space-y-3 transition-colors group shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-surface-elevated border border-border text-accent flex items-center justify-center">
              <Play className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-text-base transition-colors">Live In-Browser Playground</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Send live HTTP requests straight from your browser. Inspect status codes, latency, headers, and formatted JSON payloads.
            </p>
          </div>

          <div className="bg-surface hover:bg-surface-elevated p-6 rounded-2xl border border-border hover:border-border-light space-y-3 transition-colors group shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-surface-elevated border border-border text-amber-500 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-text-base transition-colors">Automated Health Probes</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Our automated daemon periodically pings every single endpoint. Dead or deprecated APIs are pruned to avoid broken code.
            </p>
          </div>

          <div className="bg-surface hover:bg-surface-elevated p-6 rounded-2xl border border-border hover:border-border-light space-y-3 transition-colors group shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-surface-elevated border border-border text-text-muted flex items-center justify-center">
              <Code2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-text-base transition-colors">Ready Code Snippets</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Copy pre-tested code snippets for cURL, JavaScript fetch, Python requests, Node.js, and Go with 1 click.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
