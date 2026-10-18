import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiItem, HealthCheckResult } from '../types/api';
import { fetchApiBySlug, fetchApis, checkApiHealth, reportApiIssue } from '../api/client';
import { Playground } from '../components/Playground';
import { ApiCard } from '../components/ApiCard';
import { LivePingBadge } from '../components/LivePingBadge';
import { useBookmarks } from '../utils/useBookmarks';
import {
  SUPPORTED_LANGUAGES,
  SnippetLanguage,
  generateSnippetForLanguage,
  formatLatencyBadge
} from '../utils/codeSnippets';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  KeyRound,
  Lock,
  Layers,
  Sparkles,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BookOpen,
  Code2,
  ServerCrash,
  AlertCircle,
  HelpCircle,
  Compass,
  Star,
  Copy,
  Check,
  Terminal,
  Play,
  FileDown,
  Share2,
  Download,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  Shield,
  Gauge,
  Sliders,
  CheckSquare,
  Hash,
  Flag
} from 'lucide-react';
import { useHistory } from '../utils/useHistory';
import { useToast } from '../utils/useToast';
import { generatePostmanCollection, generateHttpFileSnippet, downloadFile } from '../utils/exporter';

const getApiSpecificUseCases = (api: ApiItem): string[] => {
  const nameLower = api.name.toLowerCase();
  const tags = api.tags || [];

  if (nameLower.includes('icon') || tags.includes('iconfinder') || tags.includes('icons')) {
    return [
      'Search and download SVG and vector icons inside graphic design tools',
      'Dynamic icon pickers and symbol search in website builders and CMS editors',
      'Custom user avatar generation and UI symbology rendering'
    ];
  }

  if (nameLower.includes('pokemon') || nameLower.includes('pokeapi') || tags.includes('pokemon')) {
    return [
      'Pokédex companion web apps and team building battle simulators',
      'Character stat calculators, evolution chain visualizers, and damage formulas',
      'Interactive trivia games, drafting simulators, and Pokémon game wikis'
    ];
  }

  if (nameLower.includes('weather') || api.category === 'weather') {
    return [
      'Real-time localized meteorological forecasts and weather alert widgets',
      'Long-term climate data analysis and solar/wind energy generation modeling',
      'Outdoor travel itinerary planning and agricultural irrigation scheduling'
    ];
  }

  if (nameLower.includes('book') || api.category === 'education-books' || tags.includes('books')) {
    return [
      'Digital library catalogues, ISBN lookups, and reading progress trackers',
      'Automated academic citation generation and bibliographic referencing',
      'Personalized literature recommendations and author bibliography databases'
    ];
  }

  if (api.category === 'art-design' || nameLower.includes('museum') || nameLower.includes('art')) {
    return [
      'High-resolution artwork galleries and digital museum curation platforms',
      'Color palette extraction, historical artifact lookups, and art education',
      'Design asset management and creative canvas vector graphics integration'
    ];
  }

  if (api.category === 'finance') {
    return [
      'Live foreign exchange rate converters and multi-currency checkout feeds',
      'Portfolio valuation dashboards and automated stock market tracking',
      'Financial risk modeling and historical economic indicator analysis'
    ];
  }

  if (api.category === 'crypto-web3') {
    return [
      'Decentralized token price tickers and cryptocurrency market analytics',
      'Crypto wallet balance tracking and blockchain transaction monitors',
      'Web3 DeFi protocol yield dashboards and gas price estimators'
    ];
  }

  if (api.category === 'geography') {
    return [
      'Address autocomplete, postal geocoding, and reverse coordinate lookups',
      'Interactive geospatial mapping, boundary polygons, and travel routing',
      'Location-aware proximity search for local events and amenities'
    ];
  }

  if (api.category === 'health-medical') {
    return [
      'Clinical reference lookups, dosage calculators, and drug interaction checks',
      'Personal health informatics dashboards and medical directory search',
      'Fitness telemetry tracking and nutrition ingredient analysis'
    ];
  }

  if (api.category === 'developer-tools') {
    return [
      'Mock API endpoint responses for rapid frontend staging and prototyping',
      'Automated CI/CD integration testing and regression validation suites',
      'Developer sandboxes, offline test suites, and schema verification'
    ];
  }

  return [
    `Direct integration into applications consuming ${api.name} data`,
    `Automated querying of ${api.sample_endpoint} for dynamic content feeds`,
    `Client-side widgets and developer tools in the ${api.category} domain`
  ];
};

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'recently';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'recently';
  }
}

type SnippetCategory = 'All' | 'CLI' | 'JavaScript' | 'Python' | 'Backend' | 'Mobile / Systems';

export const ApiDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { addHistoryItem } = useHistory();
  const { success, info, error: errorToast } = useToast();

  const [api, setApi] = useState<ApiItem | null>(null);
  const [relatedApis, setRelatedApis] = useState<ApiItem[]>([]);
  const [prevApi, setPrevApi] = useState<ApiItem | null>(null);
  const [nextApi, setNextApi] = useState<ApiItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<HealthCheckResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'playground' | 'snippets' | 'architecture'>('playground');
  const [snippetCategory, setSnippetCategory] = useState<SnippetCategory>('All');
  const [snippetLang, setSnippetLang] = useState<SnippetLanguage>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeStyle, setBadgeStyle] = useState<'flat' | 'flat-square' | 'for-the-badge'>('flat-square');
  const [copiedBadgeMd, setCopiedBadgeMd] = useState(false);
  const [copiedBadgeHtml, setCopiedBadgeHtml] = useState(false);

  // Community Broken API Reporting
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('offline');
  const [reportDetails, setReportDetails] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const tabsRef = useRef<HTMLDivElement>(null);
  const bookmarked = slug ? isBookmarked(slug) : false;

  useEffect(() => {
    if (api) {
      document.title = `${api.name} - Free API Discovery & Playground | Free API Hub`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', api.short_description || api.description);
      }
    }
  }, [api]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !reportDetails.trim()) return;
    setIsSubmittingReport(true);
    try {
      const res = await reportApiIssue(slug, {
        issue_type: reportType,
        details: reportDetails.trim(),
        contact_email: reportEmail.trim() || undefined
      });
      success('Report Submitted', res.message);
      setShowReportModal(false);
      setReportDetails('');
    } catch (err: unknown) {
      errorToast('Failed to submit report', err instanceof Error ? err.message : 'Please try again later.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleLiveProbe = async () => {
    if (!slug) return;
    setIsProbing(true);
    setProbeError(null);
    try {
      const result = await checkApiHealth(slug);
      setProbeResult(result);
      if (api) {
        setApi({
          ...api,
          health: {
            ...api.health,
            status: result.status,
            last_status_code: result.status_code,
            avg_latency_ms: result.latency_ms,
            uptime_percent: result.uptime_percent,
            last_checked: result.last_checked,
            message: result.message
          }
        });
      }
      success('Health probe completed', `Status: HTTP ${result.status_code} (${result.latency_ms}ms)`);
    } catch (err: unknown) {
      setProbeError(err instanceof Error ? err.message : 'Live health probe failed to reach backend/target');
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    async function loadApi() {
      if (!slug) return;
      setIsLoading(true);
      setError(null);
      setProbeResult(null);
      try {
        const item = await fetchApiBySlug(slug);
        setApi(item);
        addHistoryItem(item);

        // Fetch sibling APIs in category for Prev/Next and recommendations
        const categoryRes = await fetchApis({ category: item.category, limit: 30 });
        const items = categoryRes.items;
        const currentIndex = items.findIndex((i) => i.slug === item.slug);

        setPrevApi(currentIndex > 0 ? items[currentIndex - 1] : null);
        setNextApi(currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null);
        setRelatedApis(items.filter((r) => r.slug !== item.slug).slice(0, 3));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'API details could not be loaded');
      } finally {
        setIsLoading(false);
      }
    }
    loadApi();
  }, [slug, addHistoryItem]);

  const targetUrl = api ? `${api.base_url}${api.sample_endpoint}` : '';

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    success('Code snippet copied to clipboard');
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleDownloadSnippet = () => {
    if (!api) return;
    const currentLang = SUPPORTED_LANGUAGES.find((l) => l.id === snippetLang);
    const ext = currentLang?.fileExt || 'txt';
    const activeSnippetCode = generateSnippetForLanguage(
      snippetLang,
      targetUrl,
      api.method || 'GET',
      api.default_headers || {},
      api.default_params || {}
    );
    downloadFile(
      activeSnippetCode,
      `${api.slug}-client.${ext}`,
      'text/plain'
    );
    success('Client snippet downloaded', `${api.slug}-client.${ext}`);
  };

  const handleCopyEndpoint = () => {
    if (!api) return;
    navigator.clipboard.writeText(targetUrl);
    setCopiedUrl(true);
    success('Endpoint URL copied to clipboard');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCurl = () => {
    if (!api) return;
    const curlCode = generateSnippetForLanguage(
      'curl',
      targetUrl,
      api.method || 'GET',
      api.default_headers || {},
      api.default_params || {}
    );
    navigator.clipboard.writeText(curlCode);
    setCopiedCurl(true);
    success('cURL command copied to clipboard');
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleExportPostman = () => {
    if (!api) return;
    const collection = generatePostmanCollection(api);
    downloadFile(
      collection,
      `${api.slug}-postman-collection.json`,
      'application/json'
    );
    success('Postman collection exported', `${api.name} schema downloaded`);
  };

  const handleCopyHttpFile = () => {
    if (!api) return;
    const content = generateHttpFileSnippet(api);
    navigator.clipboard.writeText(content);
    success('REST Client (.http) copied', 'Ready to paste into VS Code or IntelliJ');
  };

  const handleShare = () => {
    if (navigator.share && api) {
      navigator.share({
        title: `${api.name} - Free API Hub`,
        text: api.short_description || api.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      info('API link copied to clipboard');
    }
  };

  const handleJumpToPlayground = () => {
    setActiveTab('playground');
    if (tabsRef.current) {
      tabsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredLanguages = useMemo(() => {
    if (snippetCategory === 'All') return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter((lang) => lang.category === snippetCategory);
  }, [snippetCategory]);

  const activeSnippetCode = useMemo(() => {
    if (!api) return '';
    return generateSnippetForLanguage(
      snippetLang,
      targetUrl,
      api.method || 'GET',
      api.default_headers || {},
      api.default_params || {}
    );
  }, [api, snippetLang, targetUrl]);

  const snippetLines = useMemo(() => activeSnippetCode.split('\n'), [activeSnippetCode]);

  // Shields.io status badge urls
  const badgeStatusColor = api?.health.status === 'healthy' ? '2ea44f' : api?.health.status === 'degraded' ? 'e3b341' : 'f85149';
  const badgeStatusText = api?.health.status === 'healthy' ? 'operational' : api?.health.status === 'degraded' ? 'degraded' : 'offline';
  const badgeImageUrl = api ? `https://img.shields.io/badge/${encodeURIComponent(api.name)}-${badgeStatusText}-${badgeStatusColor}?style=${badgeStyle}&logo=googlechrome&logoColor=white` : '';
  const badgeMarkdown = api ? `[![${api.name} Status](${badgeImageUrl})](https://freeapihub.dev/api/${api.slug})` : '';
  const badgeHtml = api ? `<a href="https://freeapihub.dev/api/${api.slug}"><img src="${badgeImageUrl}" alt="${api.name} Status" /></a>` : '';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-[#28292A] rounded" />
          <div className="h-4 w-4 bg-[#28292A] rounded" />
          <div className="h-4 w-24 bg-[#28292A] rounded" />
          <div className="h-4 w-4 bg-[#28292A] rounded" />
          <div className="h-4 w-32 bg-[#28292A] rounded" />
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-24 bg-[#1F1F1F] rounded-lg" />
                <div className="h-6 w-28 bg-[#1F1F1F] rounded-lg" />
                <div className="h-6 w-20 bg-[#1F1F1F] rounded-lg" />
              </div>
              <div className="h-9 w-72 bg-[#1F1F1F] rounded-xl" />
              <div className="h-14 w-full max-w-2xl bg-[#1F1F1F] rounded-xl" />
              <div className="h-10 w-full max-w-2xl bg-[#1F1F1F] rounded-xl" />
            </div>
            <div className="h-48 w-full lg:w-72 bg-[#1F1F1F] rounded-xl" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex items-center gap-2 border-b border-[#3C4043] pb-2">
          <div className="h-10 w-44 bg-[#28292A] rounded-xl" />
          <div className="h-10 w-36 bg-[#28292A] rounded-xl" />
          <div className="h-10 w-36 bg-[#28292A] rounded-xl" />
        </div>

        {/* Content Box Skeleton */}
        <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-8 h-96" />
      </div>
    );
  }

  if (error || !api) {
    return (
      <div className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Verified Directory</span>
        </Link>

        <div className="bg-[#28292A] rounded-2xl p-6 sm:p-8 border border-rose-500/30 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex-shrink-0">
                <ServerCrash className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-mono font-medium">
                  <AlertCircle className="h-3 w-3" />
                  <span>Catalog Resolution Error • HTTP 404</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  API Service Not Found
                </h1>
                <p className="text-xs font-mono text-slate-400">
                  Target identifier: <span className="text-[#8AB4F8] bg-[#1F1F1F] px-1.5 py-0.5 rounded border border-[#3C4043]">{slug}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3C4043] border border-[#3C4043] text-xs font-medium text-slate-200 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
              <Link
                to="/explore"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-xs font-semibold text-[#1F1F1F] transition-colors"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Browse Directory</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const latencyBadge = formatLatencyBadge(api.health.avg_latency_ms);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar: Breadcrumb & Sibling API Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <nav className="flex items-center gap-2 text-slate-400 flex-wrap">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <Link to="/explore" className="hover:text-white transition-colors">Directory</Link>
          <span>/</span>
          <Link to={`/category/${api.category}`} className="capitalize hover:text-white transition-colors">
            {api.category.replace('-', ' ')}
          </Link>
          <span>/</span>
          <span className="text-white font-medium">{api.name}</span>
        </nav>

        {/* Prev / Next Category Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {prevApi && (
            <Link
              to={`/api/${prevApi.slug}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 hover:text-white transition-colors"
              title={`Previous API in ${api.category}: ${prevApi.name}`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="truncate max-w-[120px]">{prevApi.name}</span>
            </Link>
          )}
          {nextApi && (
            <Link
              to={`/api/${nextApi.slug}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 hover:text-white transition-colors"
              title={`Next API in ${api.category}: ${nextApi.name}`}
            >
              <span className="truncate max-w-[120px]">{nextApi.name}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#8AB4F8]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
          <div className="space-y-4 flex-1">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/category/${api.category}`}
                className="text-xs font-mono font-medium uppercase tracking-wider text-slate-300 px-2.5 py-1 rounded bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] transition-colors"
              >
                {api.category}
              </Link>
              <span className="text-xs font-medium text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                {api.pricing_tier === 'open' ? '100% Free / Open' : api.pricing_tier.replace('_', ' ').toUpperCase()}
              </span>
              {api.cors_supported && (
                <span className="text-xs font-medium text-[#8AB4F8] px-2.5 py-1 rounded bg-[#8AB4F8]/10 border border-[#8AB4F8]/20 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  CORS Ready
                </span>
              )}
              {api.https && (
                <span className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded bg-[#1F1F1F] border border-[#3C4043] flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  HTTPS Verified
                </span>
              )}
              <span className="text-xs font-medium text-amber-300/90 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
                <KeyRound className="h-3 w-3" />
                {api.auth_type === 'none' ? 'No Key Required' : api.auth_type.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Title & Bookmark Button */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {api.name}
              </h1>
              <button
                onClick={() => slug && toggleBookmark(slug)}
                className={`p-2.5 rounded-xl border transition-all ${
                  bookmarked
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-sm'
                    : 'bg-[#1F1F1F] border-[#3C4043] text-slate-400 hover:text-white hover:bg-[#303134]'
                }`}
                title={bookmarked ? 'Saved in bookmarks' : 'Add to bookmarks'}
              >
                <Star className={`h-4 w-4 ${bookmarked ? 'fill-amber-400' : ''}`} />
              </button>
            </div>

            {/* Short Description */}
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              {api.short_description || api.description}
            </p>

            {/* Quick URL & Copy / cURL Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-3xl bg-[#1F1F1F] p-2 rounded-xl border border-[#3C4043]">
              <div className="flex items-center gap-2 flex-1 min-w-0 px-1">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                  {api.method || 'GET'}
                </span>
                <code className="text-xs font-mono text-slate-300 truncate select-all">
                  {targetUrl}
                </code>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#3C4043]/60">
                <button
                  onClick={handleCopyEndpoint}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#28292A] hover:bg-[#3C4043] text-xs font-medium text-slate-300 hover:text-white border border-[#3C4043] transition-colors"
                  title="Copy direct URL endpoint"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[11px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Copy URL</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyCurl}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#28292A] hover:bg-[#3C4043] text-xs font-medium text-slate-300 hover:text-white border border-[#3C4043] transition-colors"
                  title="Copy ready-to-run terminal cURL snippet"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[11px]">cURL Copied</span>
                    </>
                  ) : (
                    <>
                      <Terminal className="h-3.5 w-3.5 text-[#8AB4F8]" />
                      <span className="text-[11px]">cURL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Developer Action Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleJumpToPlayground}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#1F1F1F] text-xs font-semibold shadow-sm transition-colors"
                title="Open interactive API playground"
              >
                <Play className="h-3.5 w-3.5 fill-[#1F1F1F]" />
                <span>Test in Playground</span>
              </button>

              <button
                onClick={handleExportPostman}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-xs font-medium text-slate-200 border border-[#3C4043] transition-colors"
                title="Download standard Postman Collection v2.1 format"
              >
                <FileDown className="h-3.5 w-3.5 text-amber-400" />
                <span>Export Postman</span>
              </button>

              <button
                onClick={handleCopyHttpFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-xs font-medium text-slate-200 border border-[#3C4043] transition-colors"
                title="Copy REST Client .http format for VS Code and IntelliJ"
              >
                <Code2 className="h-3.5 w-3.5 text-[#8AB4F8]" />
                <span>Copy .http (VS Code)</span>
              </button>

              <button
                onClick={() => setShowBadgeModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-xs font-medium text-slate-200 border border-[#3C4043] transition-colors"
                title="Generate status badge for GitHub README"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Embed & Badges</span>
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-xs font-medium text-slate-200 border border-[#3C4043] transition-colors cursor-pointer"
                title="Share this API"
              >
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Share</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-xs font-medium text-rose-300 hover:text-rose-200 border border-[#3C4043] hover:border-rose-500/40 transition-colors cursor-pointer"
                title="Report broken endpoint, outdated docs, or paywall"
              >
                <Flag className="h-3.5 w-3.5 text-rose-400" />
                <span>Report Issue</span>
              </button>
            </div>

            {/* Tag Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {api.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-slate-400 font-mono bg-[#1F1F1F] px-2.5 py-0.5 rounded-md border border-[#3C4043] hover:text-slate-200 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right Widget: Real-Time Live Health Widget */}
          <div className="bg-[#1F1F1F] p-5 rounded-xl border border-[#3C4043] space-y-3.5 sm:min-w-[280px] flex-shrink-0 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-400 uppercase font-mono font-medium flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span>Health Telemetry</span>
              </div>
              <button
                onClick={handleLiveProbe}
                disabled={isProbing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono text-[#8AB4F8] hover:text-white bg-[#8AB4F8]/10 hover:bg-[#8AB4F8]/20 border border-[#8AB4F8]/30 transition-colors disabled:opacity-50"
                title="Send live HTTP probe right now"
              >
                <RefreshCw className={`h-3 w-3 ${isProbing ? 'animate-spin' : ''}`} />
                <span>{isProbing ? 'Probing...' : 'Live Probe'}</span>
              </button>
            </div>

            <div className="pt-0.5">
              <LivePingBadge
                status={api.health.status}
                uptimePercent={api.health.uptime_percent}
                pulse={api.health.status === 'healthy'}
              />
            </div>

            {/* Uptime SLA Meter */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>30-Day SLA:</span>
                <span className="text-white font-semibold">{api.health.uptime_percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#28292A] rounded-full overflow-hidden border border-[#3C4043]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    api.health.uptime_percent >= 99
                      ? 'bg-emerald-400'
                      : api.health.uptime_percent >= 95
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, api.health.uptime_percent))}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-[#3C4043] space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Latency:</span>
                <span className={`px-1.5 py-0.5 rounded border ${latencyBadge.colorClass}`}>
                  {latencyBadge.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status Code:</span>
                <span
                  className={`px-1.5 py-0.5 rounded border font-semibold ${
                    api.health.last_status_code >= 200 && api.health.last_status_code < 400
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {api.health.last_status_code ? `HTTP ${api.health.last_status_code}` : '0 (Failed)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[10px]">
                <span>Last Verified:</span>
                <span>{formatTimeAgo(api.health.last_checked)}</span>
              </div>
              {api.health.observations_count !== undefined && (
                <div className="flex items-center justify-between text-slate-500 text-[10px]">
                  <span>Observations:</span>
                  <span>{api.health.observations_count} checks ({api.health.freshness || 'recent'})</span>
                </div>
              )}
            </div>

            {api.documentation_url && (
              <a
                href={api.documentation_url}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#28292A] hover:bg-[#303134] text-xs font-medium text-slate-200 border border-[#3C4043] transition-colors mt-2"
              >
                <span>Official Documentation</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            )}
          </div>
        </div>

        {/* Live Probe Banner (if probed) */}
        {probeResult && (
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              probeResult.status === 'healthy'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {probeResult.status === 'healthy' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
              )}
              <div>
                <div className="font-semibold text-xs text-white">
                  Live HTTP Probe: {probeResult.status === 'healthy' ? 'Endpoint Operational (200 OK)' : 'Endpoint Unreachable'}
                </div>
                <div className="text-[11px] font-mono text-slate-300">
                  Latency: {probeResult.latency_ms}ms • Status: HTTP {probeResult.status_code} • {probeResult.message}
                </div>
              </div>
            </div>
            <button
              onClick={() => setProbeResult(null)}
              className="text-slate-400 hover:text-white p-1 self-end sm:self-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {probeError && (
          <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>Probe failed: {probeError}</span>
            </div>
            <button onClick={() => setProbeError(null)} className="text-slate-400 hover:text-white p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs (Playground, Code Snippets, Architecture Specs) */}
      <div ref={tabsRef} className="flex items-center gap-2 border-b border-[#3C4043] pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('playground')}
          className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors border whitespace-nowrap ${
            activeTab === 'playground'
              ? 'bg-[#8AB4F8] text-[#1F1F1F] border-[#8AB4F8] shadow-sm'
              : 'bg-[#28292A] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
          }`}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Interactive Playground</span>
        </button>

        <button
          onClick={() => setActiveTab('snippets')}
          className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors border whitespace-nowrap ${
            activeTab === 'snippets'
              ? 'bg-[#8AB4F8] text-[#1F1F1F] border-[#8AB4F8] shadow-sm'
              : 'bg-[#28292A] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>Integration Code ({SUPPORTED_LANGUAGES.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors border whitespace-nowrap ${
            activeTab === 'architecture'
              ? 'bg-[#8AB4F8] text-[#1F1F1F] border-[#8AB4F8] shadow-sm'
              : 'bg-[#28292A] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Specs, Parameters & Architecture</span>
        </button>
      </div>

      {/* Tab 1: Interactive Playground */}
      {activeTab === 'playground' && (
        <section id="playground-section" className="space-y-3">
          <Playground api={api} />
        </section>
      )}

      {/* Tab 2: Code Snippets Generator */}
      {activeTab === 'snippets' && (
        <section className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3C4043]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#8AB4F8]" />
                <h3 className="text-sm font-bold text-white">Production-Ready Client Snippets</h3>
              </div>
              <p className="text-xs text-slate-400">
                Copy, download, or execute client implementations across major programming languages.
              </p>
            </div>

            {/* Language Category Filter */}
            <div className="flex items-center gap-1 bg-[#1F1F1F] p-1 rounded-xl border border-[#3C4043] overflow-x-auto">
              {(['All', 'CLI', 'JavaScript', 'Python', 'Backend', 'Mobile / Systems'] as SnippetCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSnippetCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    snippetCategory === cat
                      ? 'bg-[#303134] text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Language selector chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {filteredLanguages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setSnippetLang(lang.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-colors border ${
                  snippetLang === lang.id
                    ? 'bg-[#8AB4F8] text-[#1F1F1F] border-[#8AB4F8] font-bold shadow-sm'
                    : 'bg-[#1F1F1F] border-[#3C4043] text-slate-400 hover:text-white hover:bg-[#303134]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Snippet Code Viewer with Line Numbers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Format: {SUPPORTED_LANGUAGES.find((l) => l.id === snippetLang)?.label}</span>
                <span className="text-[#3C4043]">•</span>
                <span>{snippetLines.length} lines</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSnippet}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-xs font-medium text-slate-300 hover:text-white border border-[#3C4043] transition-colors"
                  title="Download snippet file"
                >
                  <Download className="h-3.5 w-3.5 text-amber-400" />
                  <span>Download File</span>
                </button>

                <button
                  onClick={() => handleCopySnippet(activeSnippetCode)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-xs font-medium text-slate-300 hover:text-white border border-[#3C4043] transition-colors"
                  title="Copy snippet to clipboard"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#81C995]" />
                      <span className="text-[#81C995]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleJumpToPlayground}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8AB4F8]/10 hover:bg-[#8AB4F8]/20 text-[#8AB4F8] hover:text-white text-xs font-medium border border-[#8AB4F8]/30 transition-colors"
                  title="Execute live in playground"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Test in Playground</span>
                </button>
              </div>
            </div>

            <div className="flex bg-[#1F1F1F] rounded-xl border border-[#3C4043] overflow-hidden text-xs font-mono shadow-inner">
              {/* Line numbers column */}
              <div className="select-none py-4 px-3 bg-[#18191A] text-slate-500 text-right border-r border-[#3C4043]/60 leading-relaxed font-mono">
                {snippetLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Code viewer */}
              <pre className="p-4 text-slate-200 overflow-x-auto leading-relaxed flex-1 font-mono">
                {activeSnippetCode}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* Tab 3: Architecture & Specifications */}
      {activeTab === 'architecture' && (
        <section className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#8AB4F8]" />
              <span>Technical Architecture & Capability Overview</span>
            </h2>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              {(api.detailed_description || api.description).split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          {/* Query Parameters Table */}
          <div className="space-y-3 pt-4 border-t border-[#3C4043]">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-[#8AB4F8]" />
              <span>Endpoint Query Parameters</span>
            </h3>

            {api.default_params && Object.keys(api.default_params).length > 0 ? (
              <div className="bg-[#1F1F1F] rounded-xl border border-[#3C4043] overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#18191A] text-slate-400 border-b border-[#3C4043]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Parameter</th>
                      <th className="py-2.5 px-4 font-semibold">Default / Sample Value</th>
                      <th className="py-2.5 px-4 font-semibold">Type</th>
                      <th className="py-2.5 px-4 font-semibold">Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3C4043]/60 text-slate-300">
                    {Object.entries(api.default_params).map(([paramKey, paramVal]) => (
                      <tr key={paramKey} className="hover:bg-[#28292A]/50 transition-colors">
                        <td className="py-2.5 px-4 text-[#8AB4F8] font-bold select-all">{paramKey}</td>
                        <td className="py-2.5 px-4 select-all text-emerald-400">{paramVal || '—'}</td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {Number.isFinite(Number(paramVal)) && paramVal !== '' ? 'number' : 'string'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            Pre-configured
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-[#1F1F1F] rounded-xl border border-[#3C4043] p-4 text-xs text-slate-400 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                <span>Zero mandatory query parameters. This endpoint responds with default collection payload out of the box.</span>
              </div>
            )}
          </div>

          {/* Request Headers & Security Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#3C4043]">
            {/* Headers card */}
            <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-2.5">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-[#8AB4F8]" />
                <span>Default Request Headers</span>
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400 py-1 border-b border-[#3C4043]/40">
                  <span>Accept:</span>
                  <span className="text-slate-200 select-all bg-[#28292A] px-2 py-0.5 rounded border border-[#3C4043]">
                    {api.default_headers?.['Accept'] || 'application/json'}
                  </span>
                </div>
                {api.default_headers &&
                  Object.entries(api.default_headers)
                    .filter(([k]) => k !== 'Accept')
                    .map(([hKey, hVal]) => (
                      <div key={hKey} className="flex items-center justify-between text-slate-400 py-1 border-b border-[#3C4043]/40">
                        <span>{hKey}:</span>
                        <span className="text-slate-200 select-all bg-[#28292A] px-2 py-0.5 rounded border border-[#3C4043]">
                          {hVal}
                        </span>
                      </div>
                    ))}
                <div className="flex items-center justify-between text-slate-400 py-1">
                  <span>User-Agent:</span>
                  <span className="text-slate-400 italic">FreeApiHub/1.0 (or standard browser)</span>
                </div>
              </div>
            </div>

            {/* Authentication & Access Profile */}
            <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-2.5">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Authentication & Access Profile</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono">Auth Protocol:</span>
                  <span className="font-semibold text-white capitalize">{api.auth_type.replace('_', ' ')}</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  {api.auth_type === 'none'
                    ? 'No API key, signature, or token needed. Anyone can query this endpoint immediately without account registration.'
                    : api.auth_type === 'api_key'
                    ? 'Requires a free developer API key. Register on the official documentation site and attach the key in your requests.'
                    : 'Requires OAuth 2.0 authentication credentials.'}
                </p>
                <div className="pt-2 border-t border-[#3C4043]/60 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">CORS Support:</span>
                  <span className={api.cors_supported ? 'text-emerald-400' : 'text-amber-400'}>
                    {api.cors_supported ? 'Direct Browser Calls Allowed' : 'Proxy Required'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Transport:</span>
                  <span className={api.https ? 'text-emerald-400' : 'text-slate-400'}>
                    {api.https ? 'TLS / HTTPS 1.3' : 'HTTP'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Production Use Cases */}
          <div className="bg-[#1F1F1F] p-5 rounded-xl border border-[#3C4043] space-y-3 pt-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-accent" />
              <span>Recommended Production Use Cases</span>
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              {getApiSpecificUseCases(api).map((useCase, idx) => (
                <li key={idx} className="bg-[#28292A] p-3 rounded-lg border border-[#3C4043] flex items-start gap-2.5">
                  <span className="text-[#8AB4F8] font-bold mt-0.5">•</span>
                  <span className="leading-relaxed">{useCase}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Alternative APIs in Same Category */}
      {relatedApis.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-[#3C4043]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#8AB4F8]" />
              <h2 className="text-base font-bold text-white">Alternative APIs in {api.category}</h2>
            </div>
            <Link
              to={`/category/${api.category}`}
              className="text-xs text-accent hover:underline font-medium"
            >
              View all in {api.category} →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedApis.map((item) => (
              <ApiCard key={item.id} api={item} />
            ))}
          </div>
        </section>
      )}

      {/* Embed Badge Generator Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#3C4043]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Embed Status Badge</h3>
              </div>
              <button
                onClick={() => setShowBadgeModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#303134] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Add a live health status badge to your GitHub repository README or project documentation website.
            </p>

            {/* Live Badge Preview */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">Live Preview:</span>
              <div className="p-4 bg-[#1F1F1F] rounded-xl border border-[#3C4043] flex items-center justify-center min-h-[60px]">
                <img src={badgeImageUrl} alt={`${api.name} status badge`} className="h-5 object-contain" />
              </div>
            </div>

            {/* Badge Style Choice */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">Badge Style:</span>
              <div className="grid grid-cols-3 gap-2">
                {(['flat', 'flat-square', 'for-the-badge'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setBadgeStyle(style)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-mono transition-colors border ${
                      badgeStyle === style
                        ? 'bg-[#8AB4F8] text-[#1F1F1F] border-[#8AB4F8] font-bold'
                        : 'bg-[#1F1F1F] border-[#3C4043] text-slate-300 hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Markdown Code */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">Markdown Format (GitHub README):</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(badgeMarkdown);
                    setCopiedBadgeMd(true);
                    success('Markdown badge code copied');
                    setTimeout(() => setCopiedBadgeMd(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-[#8AB4F8] hover:underline"
                >
                  {copiedBadgeMd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedBadgeMd ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-[#1F1F1F] p-2.5 rounded-lg border border-[#3C4043] text-[11px] font-mono text-slate-300 select-all overflow-x-auto">
                {badgeMarkdown}
              </pre>
            </div>

            {/* HTML Code */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">HTML Format:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(badgeHtml);
                    setCopiedBadgeHtml(true);
                    success('HTML badge code copied');
                    setTimeout(() => setCopiedBadgeHtml(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-[#8AB4F8] hover:underline"
                >
                  {copiedBadgeHtml ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedBadgeHtml ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-[#1F1F1F] p-2.5 rounded-lg border border-[#3C4043] text-[11px] font-mono text-slate-300 select-all overflow-x-auto">
                {badgeHtml}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowBadgeModal(false)}
                className="px-4 py-2 rounded-xl bg-[#303134] hover:bg-[#3C4043] text-xs font-medium text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Broken API Reporting Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#3C4043]">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Report an Issue with {api.name}</h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#303134] transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Issue Classification
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#3C4043] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8AB4F8]"
                >
                  <option value="offline">Service Down / Connection Refused / 5xx</option>
                  <option value="broken_sample">Broken Sample Endpoint / HTTP 404</option>
                  <option value="payment_wall">Hidden Paywall / Requires Paid Credit Card</option>
                  <option value="outdated_docs">Outdated Documentation / Invalid Base URL</option>
                  <option value="cors_failure">CORS Headers Missing in Browser</option>
                  <option value="other">Other Catalog Defect</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Incident Details & Reproduction Steps <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  required
                  rows={4}
                  placeholder="Describe the failure, error code, or mismatch observed..."
                  className="w-full bg-[#1F1F1F] border border-[#3C4043] rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#8AB4F8] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Your Contact Email <span className="text-slate-500 text-[11px]">(optional, for verification updates)</span>
                </label>
                <input
                  type="email"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full bg-[#1F1F1F] border border-[#3C4043] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#8AB4F8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#3C4043]">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1F1F1F] hover:bg-[#303134] text-xs font-medium text-slate-300 transition-colors border border-[#3C4043]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || !reportDetails.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-semibold text-white shadow transition-colors"
                >
                  {isSubmittingReport ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Flag className="h-3.5 w-3.5" />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
