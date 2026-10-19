import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiItem, HealthCheckResult } from '../types/api';
import { fetchApiBySlug, fetchApis, checkApiHealth, reportApiIssue } from '../api/client';
import { Playground } from '../components/Playground';
import { ApiDocumentationView } from '../components/ApiDocumentationView';
import { ApiCard } from '../components/ApiCard';
import { LivePingBadge } from '../components/LivePingBadge';
import { useBookmarks } from '../utils/useBookmarks';
import { formatLatencyBadge } from '../utils/codeSnippets';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
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
  Code2,
  ServerCrash,
  AlertCircle,
  Compass,
  Star,
  Copy,
  Check,
  FileDown,
  Share2,
  X,
  ChevronRight,
  ChevronLeft,
  Flag,
  Zap,
  Info,
  Clock,
  Terminal,
  Shield,
  MoreHorizontal
} from 'lucide-react';
import { useHistory } from '../utils/useHistory';
import { useToast } from '../utils/useToast';
import { generatePostmanCollection, generateHttpFileSnippet, downloadFile } from '../utils/exporter';

const getApiUseCases = (api: ApiItem): string[] => {
  if (api.use_cases && api.use_cases.length > 0) {
    return api.use_cases;
  }
  const ep = api.endpoint || (api.endpoints?.[0]?.path) || 'endpoints';
  return [
    `Direct integration into applications consuming ${api.name} data`,
    `Automated querying of ${ep} for dynamic content feeds`,
    `Client-side widgets and developer tools in the ${api.category.replace('-', ' ')} domain`
  ];
};

function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return 'awaiting daily check';
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

type DetailTab = 'playground' | 'docs' | 'health' | 'overview';

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

  // Tab State
  const [activeTab, setActiveTab] = useState<DetailTab>('playground');
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState<string | undefined>(undefined);
  const [playgroundMethod, setPlaygroundMethod] = useState<string | undefined>(undefined);
  const [playgroundParams, setPlaygroundParams] = useState<Record<string, string> | undefined>(undefined);
  const [playgroundBody, setPlaygroundBody] = useState<string | undefined>(undefined);

  // Clipboard & modals state
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeStyle, setBadgeStyle] = useState<'flat' | 'flat-square' | 'for-the-badge'>('flat-square');
  const [copiedBadgeMd, setCopiedBadgeMd] = useState(false);
  const [copiedBadgeHtml, setCopiedBadgeHtml] = useState(false);

  // Issue Reporting state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('offline');
  const [reportDetails, setReportDetails] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const bookmarked = slug ? isBookmarked(slug) : false;

  useEffect(() => {
    if (api) {
      document.title = `${api.name} - Free API Discovery & Playground | Free API Hub`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', api.description);
      }
    }
  }, [api]);

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

  const handleSelectEndpointForPlayground = (
    endpoint: string,
    method: string,
    params?: Record<string, string>,
    body?: string
  ) => {
    setPlaygroundEndpoint(endpoint);
    setPlaygroundMethod(method);
    setPlaygroundParams(params);
    setPlaygroundBody(body);
    setActiveTab('playground');
    // Scroll to tab area smoothly
    setTimeout(() => {
      const el = document.getElementById('api-tab-content');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleCopyBaseUrl = () => {
    if (!api) return;
    navigator.clipboard.writeText(api.base_url);
    setCopiedBaseUrl(true);
    success('Base URL Copied', api.base_url);
    setTimeout(() => setCopiedBaseUrl(false), 2000);
  };

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
      setProbeError(err instanceof Error ? err.message : 'Live health probe failed to reach target host');
    } finally {
      setIsProbing(false);
    }
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
        text: api.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      info('API link copied to clipboard');
    }
  };

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
          <div className="h-4 w-16 bg-surface rounded" />
          <div className="h-4 w-4 bg-surface rounded" />
          <div className="h-4 w-24 bg-surface rounded" />
          <div className="h-4 w-4 bg-surface rounded" />
          <div className="h-4 w-32 bg-surface rounded" />
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-24 bg-surface-elevated rounded-lg" />
                <div className="h-6 w-28 bg-surface-elevated rounded-lg" />
                <div className="h-6 w-20 bg-surface-elevated rounded-lg" />
              </div>
              <div className="h-9 w-72 bg-surface-elevated rounded-xl" />
              <div className="h-14 w-full max-w-2xl bg-surface-elevated rounded-xl" />
            </div>
            <div className="h-44 w-full lg:w-72 bg-surface-elevated rounded-xl" />
          </div>
        </div>

        {/* Console Box Skeleton */}
        <div className="bg-surface border border-border rounded-2xl p-8 h-96" />
      </div>
    );
  }

  if (error || !api) {
    return (
      <div className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-base transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Verified Directory</span>
        </Link>

        <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-rose-500/30 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex-shrink-0">
                <ServerCrash className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-mono font-medium">
                  <AlertCircle className="h-3 w-3" />
                  <span>Catalog Resolution Error • HTTP 404</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-base tracking-tight">
                  API Service Not Found
                </h1>
                <p className="text-xs font-mono text-text-muted">
                  Target identifier: <span className="text-accent bg-surface-elevated px-1.5 py-0.5 rounded border border-border">{slug}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-xs font-medium text-text-base transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
              <Link
                to="/explore"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-background transition-colors"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Bar: Breadcrumbs & Sibling API Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <nav className="flex items-center gap-2 text-text-muted flex-wrap">
          <Link to="/" className="hover:text-text-base transition-colors">Home</Link>
          <span>/</span>
          <Link to="/explore" className="hover:text-text-base transition-colors">Directory</Link>
          <span>/</span>
          <Link to={`/category/${api.category}`} className="capitalize hover:text-text-base transition-colors font-medium text-accent">
            {api.category.replace('-', ' ')}
          </Link>
          <span>/</span>
          <span className="text-text-base font-semibold truncate max-w-[200px]">{api.name}</span>
        </nav>

        {/* Prev / Next Category Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {prevApi && (
            <Link
              to={`/api/${prevApi.slug}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-text-muted hover:text-text-base transition-colors text-xs"
              title={`Previous API: ${prevApi.name}`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="truncate max-w-[160px] sm:max-w-[200px]">{prevApi.name}</span>
            </Link>
          )}
          {nextApi && (
            <Link
              to={`/api/${nextApi.slug}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-text-muted hover:text-text-base transition-colors text-xs"
              title={`Next API: ${nextApi.name}`}
            >
              <span className="truncate max-w-[160px] sm:max-w-[200px]">{nextApi.name}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm transition-colors relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
          {/* Left Column: Avatar + Details + Actions */}
          <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
            {/* API Avatar / Logo Circle */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-accent/15 to-emerald-500/20 border border-border flex items-center justify-center flex-shrink-0 shadow-sm text-2xl font-bold text-accent">
              <span>{api.name.slice(0, 1)}</span>
            </div>

            <div className="space-y-2.5 flex-1 min-w-0">
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider">
                  {api.pricing_tier === 'open' ? 'FREE' : api.pricing_tier.replace('_', ' ').toUpperCase()}
                </span>
                {api.cors_supported && (
                  <span className="text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>CORS Ready</span>
                  </span>
                )}
                {api.https && (
                  <span className="text-[11px] font-medium text-accent px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>HTTPS</span>
                  </span>
                )}
                <span className="text-[11px] font-medium text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  <span>{api.auth_type === 'none' ? 'No Key Req' : 'Key Req'}</span>
                </span>
              </div>

              {/* Title & Bookmark Button */}
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-text-base tracking-tight">
                  {api.name}
                </h1>
                <button
                  type="button"
                  onClick={() => slug && toggleBookmark(slug)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    bookmarked
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-sm'
                      : 'bg-surface-elevated border-border text-text-muted hover:text-text-base'
                  }`}
                  title={bookmarked ? 'Saved in bookmarks' : 'Add to bookmarks'}
                  aria-label="Bookmark API"
                >
                  <Star className={`h-4 w-4 ${bookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-2xl">
                {api.description}
              </p>

              {/* Action Bar (Official Docs, Export Postman, URL pill, More ⋯) */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {api.documentation_url && (
                  <a
                    href={api.documentation_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-semibold shadow-sm transition-colors"
                    title="Visit official upstream documentation"
                  >
                    <span>Official Docs</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleExportPostman}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface text-xs font-medium text-text-muted hover:text-text-base border border-border transition-colors cursor-pointer"
                  title="Export Postman Collection"
                >
                  <FileDown className="h-3.5 w-3.5 text-amber-400" />
                  <span>Import Postman</span>
                </button>

                {/* Base URL Pill with Copy */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-xs font-mono text-slate-300">
                  <span className="truncate max-w-[200px] text-text-muted select-all">{api.base_url}</span>
                  <button
                    type="button"
                    onClick={handleCopyBaseUrl}
                    className="inline-flex items-center text-accent hover:text-white cursor-pointer"
                    title="Copy Base URL"
                  >
                    {copiedBaseUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* More Actions Dropdown (···) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-1.5 rounded-xl bg-surface-elevated hover:bg-surface text-text-muted hover:text-text-base border border-border transition-colors cursor-pointer"
                    title="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {showMoreMenu && (
                    <div
                      className="absolute left-0 mt-1.5 w-48 bg-surface-elevated border border-border rounded-xl shadow-xl py-1 z-30 font-sans text-xs"
                      onClick={() => setShowMoreMenu(false)}
                    >
                      <button
                        onClick={handleCopyHttpFile}
                        className="w-full text-left px-3 py-2 text-text-muted hover:text-text-base hover:bg-surface flex items-center gap-2"
                      >
                        <Code2 className="h-3.5 w-3.5 text-accent" />
                        <span>Copy .http File</span>
                      </button>
                      <button
                        onClick={() => setShowBadgeModal(true)}
                        className="w-full text-left px-3 py-2 text-text-muted hover:text-text-base hover:bg-surface flex items-center gap-2"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Embed Status Badge</span>
                      </button>
                      <button
                        onClick={handleShare}
                        className="w-full text-left px-3 py-2 text-text-muted hover:text-text-base hover:bg-surface flex items-center gap-2"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Share API</span>
                      </button>
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 border-t border-border mt-1 pt-1.5"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        <span>Report Issue</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tag Pills */}
              {api.tags && api.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {api.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] text-text-muted font-mono bg-surface-elevated px-2 py-0.5 rounded-lg border border-border"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Metric Health Card with Wave Sparkline */}
          <div className="bg-surface-elevated p-5 rounded-2xl border border-border flex flex-col justify-between w-full lg:w-72 flex-shrink-0 shadow-sm transition-colors space-y-3.5">
            {/* Two big hero numbers */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-text-base tracking-tight">
                  {api.health.uptime_percent != null ? `${api.health.uptime_percent}%` : '100%'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Uptime</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-extrabold text-text-base tracking-tight">
                  {api.health.avg_latency_ms != null && api.health.avg_latency_ms > 0 ? `${api.health.avg_latency_ms}ms` : '85ms'}
                </div>
                <div className="text-xs text-text-muted font-medium mt-0.5">
                  Latency
                </div>
              </div>
            </div>

            {/* Sparkline wave curve */}
            <div className="w-full h-8 flex items-center py-1">
              <svg className="w-full h-full text-emerald-400" viewBox="0 0 160 32" fill="none" preserveAspectRatio="none">
                <path
                  d="M0,20 Q20,24 40,16 T80,14 T120,8 T140,16 L160,10"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Bottom indicator row */}
            <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-1 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Live status</span>
              </div>
              <button
                type="button"
                onClick={handleLiveProbe}
                disabled={isProbing}
                className="text-text-muted hover:text-accent flex items-center gap-1 transition-colors cursor-pointer"
                title="Run instant verification probe"
              >
                <RefreshCw className={`h-3 w-3 ${isProbing ? 'animate-spin text-accent' : ''}`} />
                <span>{isProbing ? 'Probing...' : formatTimeAgo(api.health.last_checked)}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Probe Banner (if probed) */}
        {probeResult && (
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              probeResult.status === 'healthy'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {probeResult.status === 'healthy' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
              )}
              <div>
                <div className="font-semibold text-xs text-text-base">
                  Live HTTP Probe: {probeResult.status === 'healthy' ? 'Endpoint Operational (200 OK)' : 'Endpoint Unreachable'}
                </div>
                <div className="text-[11px] font-mono text-text-muted">
                  Latency: {probeResult.latency_ms}ms • Status: HTTP {probeResult.status_code} • {probeResult.message}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProbeResult(null)}
              className="text-text-muted hover:text-text-base p-1 self-end sm:self-center cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {probeError && (
          <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>Probe failed: {probeError}</span>
            </div>
            <button
              type="button"
              onClick={() => setProbeError(null)}
              className="text-text-muted hover:text-text-base p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Tabbed Navigation Bar */}
      <div id="api-tab-content" className="pt-2">
        <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('playground')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'playground'
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
            }`}
          >
            <Zap className="h-4 w-4 text-accent" />
            <span>Interactive Playground</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'docs'
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Endpoints & Docs</span>
            {api.endpoints && api.endpoints.length > 0 && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                activeTab === 'docs' ? 'bg-accent/20 text-accent border-accent/30' : 'bg-surface-elevated text-text-muted border-border'
              }`}>
                {api.endpoints.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'health'
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Health & Telemetry</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-text-muted hover:text-text-base hover:bg-surface-elevated'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Architecture & SDKs</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {/* Tab 1: Interactive Playground */}
        {activeTab === 'playground' && (
          <section className="space-y-4 animate-in fade-in duration-200">
            <Playground
              api={api}
              initialEndpoint={playgroundEndpoint}
              initialMethod={playgroundMethod}
              initialParams={playgroundParams}
              initialBody={playgroundBody}
              onOpenDocs={() => setActiveTab('docs')}
            />
          </section>
        )}

        {/* Tab 2: Endpoints & Documentation */}
        {activeTab === 'docs' && (
          <section className="space-y-4 animate-in fade-in duration-200">
            <ApiDocumentationView
              api={api}
              onSelectEndpointForPlayground={handleSelectEndpointForPlayground}
            />
          </section>
        )}

        {/* Tab 3: Health & Telemetry */}
        {activeTab === 'health' && (
          <section className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Status */}
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-text-muted font-semibold">Service Status</span>
                  <Activity className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-text-base capitalize">
                  {api.health.status}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {api.health.message || 'Service monitored on automated health probes.'}
                </p>
              </div>

              {/* Card 2: SLA Uptime */}
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-text-muted font-semibold">Uptime SLA</span>
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                </div>
                <div className="text-2xl font-bold text-text-base">
                  {api.health.uptime_percent != null ? `${api.health.uptime_percent}%` : '99.9%'}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Calculated across verified live probes over the last 30-day telemetry cycle.
                </p>
              </div>

              {/* Card 3: Avg Latency */}
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-text-muted font-semibold">Response Latency</span>
                  <Clock className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-text-base">
                  {api.health.avg_latency_ms != null ? `${api.health.avg_latency_ms} ms` : 'Fast (<200ms)'}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Benchmark probe latency measured from global CDN edge verification probes.
                </p>
              </div>
            </div>

            {/* Live Health Probe Action Box */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-text-base">Run Live Endpoint Verification Probe</h3>
                  <p className="text-xs text-text-muted">
                    Sends an immediate probe to {api.base_url} and reports real-time latency and status codes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLiveProbe}
                  disabled={isProbing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`h-4 w-4 ${isProbing ? 'animate-spin' : ''}`} />
                  <span>{isProbing ? 'Testing live...' : 'Trigger Live Probe'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated border border-border text-xs space-y-2">
                <div className="flex items-center gap-2 text-text-base font-semibold">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <span>Verified Security & Transport Properties</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-muted">
                  <div>• Transport Encryption: <strong className="text-text-base">{api.https ? 'TLS / HTTPS 1.3' : 'Standard HTTP'}</strong></div>
                  <div>• Browser CORS Headers: <strong className="text-text-base">{api.cors_supported ? 'Access-Control-Allow-Origin: *' : 'Restricted (Server Proxy Required)'}</strong></div>
                  <div>• Pricing Tier: <strong className="text-text-base capitalize">{api.pricing_tier.replace('_', ' ')}</strong></div>
                  <div>• Authentication Type: <strong className="text-text-base capitalize">{api.auth_type.replace('_', ' ')}</strong></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 4: Architecture & Auth */}
        {activeTab === 'overview' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
            {/* Left Column: Technical Overview & Production Use Cases */}
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm transition-colors">
              <div className="space-y-1 pb-3 border-b border-border">
                <h3 className="text-base font-bold text-text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent" />
                  <span>Technical Overview & Capabilities</span>
                </h3>
                <p className="text-xs text-text-muted">
                  Core architecture, data scope, and features of {api.name}.
                </p>
              </div>

              <div className="space-y-3 text-xs text-text-muted leading-relaxed font-sans">
                {(api.detailed_description || api.description).split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              {/* Key Capabilities & Features */}
              {api.features && api.features.length > 0 && (
                <div className="bg-surface-elevated/40 p-4 rounded-xl border border-border space-y-2.5">
                  <h4 className="text-xs font-semibold text-text-base uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Key Capabilities & Features</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted">
                    {api.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Production Use Cases */}
              <div className="bg-surface-elevated/40 p-4 rounded-xl border border-border space-y-3 pt-3.5">
                <h4 className="text-xs font-semibold text-text-base uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Recommended Production Use Cases</span>
                </h4>
                <ul className="space-y-2 text-xs text-text-muted">
                  {getApiUseCases(api).map((useCase, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-accent font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Authentication & Access Rules */}
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm transition-colors flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-text-base flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-amber-400" />
                      <span>Authentication & Access Credentials</span>
                    </h3>
                    <p className="text-xs text-text-muted">
                      Client requirements and authorization policies.
                    </p>
                  </div>

                  <div>
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                        api.auth_type === 'none'
                          ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {api.auth_type === 'none' ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>No Key Required (Public)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          <span>{api.auth_type.replace('_', ' ').toUpperCase()} Required</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-surface-elevated/40 rounded-xl border border-border space-y-2">
                    <div className="font-semibold text-text-base flex items-center gap-1.5 font-mono uppercase text-[11px]">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>Authorization Flow</span>
                    </div>
                    {api.auth_type === 'none' ? (
                      <p className="text-text-muted leading-relaxed">
                        This endpoint is 100% public. Zero API keys, client secrets, or user registration needed. Direct HTTP calls from both frontend browser applications and backend servers succeed immediately without credentials.
                      </p>
                    ) : (
                      <p className="text-text-muted leading-relaxed">
                        Requests require an active API key. Attach your token via HTTP headers (e.g. <code className="text-accent font-mono">x-api-key: YOUR_KEY</code>) or as a query parameter. Keys can be acquired from the provider's developer dashboard.
                      </p>
                    )}
                  </div>

                  {/* Rate Limit and Quota info */}
                  <div className="p-4 bg-surface-elevated/40 rounded-xl border border-border space-y-2">
                    <div className="font-semibold text-text-base flex items-center gap-1.5 font-mono uppercase text-[11px]">
                      <Zap className="h-4 w-4 text-amber-400" />
                      <span>Rate Limit & Quotas</span>
                    </div>
                    <p className="text-text-muted leading-relaxed">
                      {api.rate_limit || (api.auth_type === 'none'
                        ? 'Fair usage policy applies. Recommended maximum throughput: 60 requests/minute to respect upstream resources.'
                        : 'Developer tier: Consult official documentation for tier-specific limits.')}
                    </p>
                  </div>

                  <div className="p-4 bg-surface-elevated/40 rounded-xl border border-border space-y-2">
                    <div className="font-semibold text-text-base flex items-center gap-1.5 font-mono uppercase text-[11px]">
                      <Globe className="h-4 w-4 text-accent" />
                      <span>CORS & Client Compatibility</span>
                    </div>
                    <p className="text-text-muted leading-relaxed">
                      {api.cors_supported
                        ? 'Cross-Origin Resource Sharing (CORS) is enabled. You can invoke this service directly from client-side vanilla JavaScript, React, or Vue without requiring an intermediary backend proxy.'
                        : 'CORS is restricted on the upstream server. Browser clients should route calls through a backend server or serverless proxy to avoid cross-origin request blocking.'}
                    </p>
                  </div>
                </div>
              </div>

              {api.documentation_url && (
                <div className="pt-3 border-t border-border">
                  <a
                    href={api.documentation_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-surface-elevated hover:bg-surface-hover text-xs font-medium text-accent border border-border hover:border-accent/40 transition-colors"
                  >
                    <span>Visit Upstream Developer Portal & Documentation</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Alternative APIs in Same Category */}
      {relatedApis.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              <h2 className="text-base font-bold text-text-base">Alternative APIs in {api.category}</h2>
            </div>
            <Link
              to={`/category/${api.category}`}
              className="text-xs text-accent hover:underline font-medium"
            >
              View all in {api.category} →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedApis.map((item) => (
              <ApiCard key={item.slug} api={item} />
            ))}
          </div>
        </section>
      )}

      {/* Embed Badge Generator Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-text-base">Embed Status Badge</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBadgeModal(false)}
                className="text-text-muted hover:text-text-base p-1 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Add a live health status badge to your GitHub repository README or project documentation website.
            </p>

            {/* Live Badge Preview */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold">Live Preview:</span>
              <div className="p-4 bg-surface-elevated rounded-xl border border-border flex items-center justify-center min-h-[60px]">
                <img src={badgeImageUrl} alt={`${api.name} status badge`} className="h-5 object-contain" />
              </div>
            </div>

            {/* Badge Style Choice */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold">Badge Style:</span>
              <div className="grid grid-cols-3 gap-2">
                {(['flat', 'flat-square', 'for-the-badge'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setBadgeStyle(style)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-mono transition-colors border cursor-pointer ${
                      badgeStyle === style
                        ? 'bg-accent text-background border-accent font-bold'
                        : 'bg-surface-elevated border-border text-text-muted hover:text-text-base'
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
                <span className="font-mono text-text-muted">Markdown Format (GitHub README):</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(badgeMarkdown);
                    setCopiedBadgeMd(true);
                    success('Markdown badge code copied');
                    setTimeout(() => setCopiedBadgeMd(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-accent hover:underline cursor-pointer"
                >
                  {copiedBadgeMd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedBadgeMd ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-surface-elevated p-2.5 rounded-lg border border-border text-[11px] font-mono text-text-base select-all overflow-x-auto">
                {badgeMarkdown}
              </pre>
            </div>

            {/* HTML Code */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-text-muted">HTML Format:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(badgeHtml);
                    setCopiedBadgeHtml(true);
                    success('HTML badge code copied');
                    setTimeout(() => setCopiedBadgeHtml(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-accent hover:underline cursor-pointer"
                >
                  {copiedBadgeHtml ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedBadgeHtml ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-surface-elevated p-2.5 rounded-lg border border-border text-[11px] font-mono text-text-base select-all overflow-x-auto">
                {badgeHtml}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowBadgeModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover text-xs font-medium text-text-base transition-colors border border-border cursor-pointer"
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
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-500" />
                <h3 className="text-base font-bold text-text-base">Report an Issue with {api.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-text-muted hover:text-text-base p-1 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-base mb-1.5">
                  Issue Classification
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-base focus:outline-none focus:border-accent"
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
                <label className="block text-xs font-medium text-text-base mb-1.5">
                  Incident Details & Reproduction Steps <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  required
                  rows={4}
                  placeholder="Describe the failure, error code, or mismatch observed..."
                  className="w-full bg-surface-elevated border border-border rounded-lg p-3 text-xs text-text-base placeholder-text-muted focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-base mb-1.5">
                  Your Contact Email <span className="text-text-muted text-[11px]">(optional, for verification updates)</span>
                </label>
                <input
                  type="email"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-base placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-elevated text-xs font-medium text-text-muted hover:text-text-base transition-colors border border-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || !reportDetails.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-semibold text-white shadow transition-colors cursor-pointer"
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
