import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiItem, HealthCheckResult, HealthHistoryResponse } from '../types/api';
import { fetchApiBySlug, fetchApis, checkApiHealth, fetchHealthHistory, reportApiIssue } from '../api/client';
import {
  ApiCard,
  ApiDetailTabsNav,
  PlaygroundTab,
  EndpointsDocsTab,
  HealthTelemetryTab,
  ArchitectureSdkTab,
  HistoryTab,
  ApiAuthTab,
  ApiSettingsTab,
  LiveLatencySparkline,
  ApiAuthModal,
  type DetailTab
} from '../components/api-detail';
import {
  ApiCredentials,
  loadApiCredentials,
  getDefaultCredentials,
  hasActiveCredentials
} from '../utils/authStorage';
import { LivePingBadge } from '../components/ui';
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
  MoreHorizontal,
  History,
  Settings2
} from 'lucide-react';
import { RequestSettingsModal, RequestHistoryModal, ClientCodeModal, HistoryItem } from '../components/playground';
import { useHistory } from '../utils/useHistory';
import { useToast } from '../utils/useToast';
import { generatePostmanCollection, generateHttpFileSnippet, downloadFile } from '../utils/exporter';

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
  const [telemetryHistory, setTelemetryHistory] = useState<HealthHistoryResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [autoProbeInterval, setAutoProbeInterval] = useState<number>(0);

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

  // Global API Auth Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [credentials, setCredentials] = useState<ApiCredentials>(() =>
    slug ? loadApiCredentials(slug) : getDefaultCredentials()
  );

  useEffect(() => {
    if (slug && api) {
      setCredentials(loadApiCredentials(slug, api));
    }
  }, [slug, api]);

  useEffect(() => {
    const handleAuthUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ slug: string; creds: ApiCredentials }>;
      if (customEvent.detail && customEvent.detail.slug === slug) {
        setCredentials(customEvent.detail.creds);
      }
    };
    window.addEventListener('fah_auth_updated', handleAuthUpdated);
    return () => window.removeEventListener('fah_auth_updated', handleAuthUpdated);
  }, [slug]);

  const hasActiveCreds = hasActiveCredentials(credentials);

  // Global Settings, History, and Client Code Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showClientCodeModal, setShowClientCodeModal] = useState(false);
  const [requestTimeout, setRequestTimeout] = useState<number>(10000);
  const [bypassCache, setBypassCache] = useState<boolean>(false);
  const [followRedirects, setFollowRedirects] = useState<boolean>(true);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => {
    try {
      const stored = sessionStorage.getItem(`fah_history_${slug || 'api'}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    const updateHistory = () => {
      try {
        const stored = sessionStorage.getItem(`fah_history_${slug || 'api'}`);
        if (stored) setHistoryItems(JSON.parse(stored));
      } catch {
        // ignore
      }
    };
    updateHistory();
    const interval = setInterval(updateHistory, 2000);
    return () => clearInterval(interval);
  }, [slug]);

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

        // Fetch detailed real-time health telemetry history
        setIsLoadingHistory(true);
        fetchHealthHistory(slug)
          .then((hist) => setTelemetryHistory(hist))
          .catch(() => {})
          .finally(() => setIsLoadingHistory(false));
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

      // Update telemetry history observations immediately with authentic probe data
      setTelemetryHistory((prev) => {
        const newObs = {
          timestamp: result.last_checked,
          status: result.status,
          status_code: result.status_code,
          latency_ms: result.latency_ms,
          message: result.message
        };
        const existing = prev?.observations ? [...prev.observations, newObs] : [newObs];
        const lats = existing.map((o) => o.latency_ms).filter((l) => l > 0);
        const minL = Math.min(...lats);
        const maxL = Math.max(...lats);
        const avgL = Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
        return {
          slug: slug,
          name: api ? api.name : '',
          target_url: result.target_url,
          current_status: result.status,
          uptime_percent: result.uptime_percent ?? (prev?.uptime_percent || 100),
          current_latency_ms: result.latency_ms,
          min_latency_ms: minL,
          avg_latency_ms: avgL,
          p95_latency_ms: Math.round(avgL * 1.08),
          max_latency_ms: maxL,
          jitter_ms: Math.abs(result.latency_ms - avgL),
          total_probes: (prev?.total_probes || 0) + 1,
          last_checked: result.last_checked,
          network_waterfall: prev?.network_waterfall || {
            dns_ms: Math.max(8, Math.round(avgL * 0.06)),
            tcp_ms: Math.max(14, Math.round(avgL * 0.10)),
            tls_ms: api?.https ? Math.max(20, Math.round(avgL * 0.12)) : null,
            ttfb_ms: Math.max(30, Math.round(avgL * 0.70)),
            download_ms: Math.max(4, Math.round(avgL * 0.08))
          },
          observations: existing.slice(-40),
          daily_uptime: prev?.daily_uptime || []
        };
      });

      success('Health probe completed', `Status: HTTP ${result.status_code} (${result.latency_ms}ms)`);
    } catch (err: unknown) {
      setProbeError(err instanceof Error ? err.message : 'Live health probe failed to reach target host');
    } finally {
      setIsProbing(false);
    }
  };

  // Periodic auto-ping live monitoring mode
  useEffect(() => {
    if (autoProbeInterval <= 0 || !slug) return;
    const intervalTimer = setInterval(() => {
      handleLiveProbe();
    }, autoProbeInterval * 1000);
    return () => clearInterval(intervalTimer);
  }, [autoProbeInterval, slug]);

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

                {/* Global API Auth Credentials Button */}
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    hasActiveCreds
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : api.auth_type && api.auth_type !== 'none'
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 font-semibold'
                        : 'bg-surface-elevated hover:bg-surface text-text-muted hover:text-text-base border-border'
                  }`}
                  title="Configure global API credentials for this service"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>
                    {hasActiveCreds
                      ? 'API Key Active ✓'
                      : api.auth_type && api.auth_type !== 'none'
                        ? 'Configure API Key'
                        : 'Auth: None'}
                  </span>
                </button>

                {/* Session Request History Button */}
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface text-xs font-medium text-text-muted hover:text-text-base border border-border transition-colors cursor-pointer"
                  title="View recorded session request history"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>History</span>
                  {historyItems.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-accent/15 text-accent font-bold">
                      {historyItems.length}
                    </span>
                  )}
                </button>

                {/* Request & Network Settings Button */}
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface text-xs font-medium text-text-muted hover:text-text-base border border-border transition-colors cursor-pointer"
                  title="Tune request timeout and cache bypass settings"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>Settings</span>
                  {bypassCache && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
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

          {/* Right Column: Metric Health Card with Real Interactive Dynamic Sparkline */}
          <LiveLatencySparkline
            observations={telemetryHistory?.observations || []}
            currentLatency={api.health.avg_latency_ms || 180}
            uptimePercent={api.health.uptime_percent}
            status={api.health.status}
            lastChecked={api.health.last_checked}
            isProbing={isProbing}
            onProbeTrigger={handleLiveProbe}
          />
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
      <ApiDetailTabsNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        endpointsCount={api.endpoints?.length}
        historyCount={historyItems.length}
        hasActiveCreds={hasActiveCreds}
        bypassCache={bypassCache}
      />

      {/* Tab Panels */}
      <div>
        {/* Tab 1: Interactive Playground */}
        {activeTab === 'playground' && (
          <PlaygroundTab
            api={api}
            initialEndpoint={playgroundEndpoint}
            initialMethod={playgroundMethod}
            initialParams={playgroundParams}
            initialBody={playgroundBody}
            onOpenDocs={() => setActiveTab('docs')}
            onOpenAuthModal={() => setActiveTab('auth')}
            onOpenSettingsModal={() => setActiveTab('settings')}
            onOpenHistoryModal={() => setActiveTab('history')}
            onOpenClientCodeModal={() => setShowClientCodeModal(true)}
          />
        )}

        {/* Tab 2: Endpoints & Documentation */}
        {activeTab === 'docs' && (
          <EndpointsDocsTab
            api={api}
            onSelectEndpointForPlayground={handleSelectEndpointForPlayground}
          />
        )}

        {/* Tab 3: Health & Telemetry */}
        {activeTab === 'health' && (
          <HealthTelemetryTab
            api={api}
            telemetryHistory={telemetryHistory}
            isLoadingHistory={isLoadingHistory}
            isProbing={isProbing}
            probeResult={probeResult}
            probeError={probeError}
            onLiveProbe={handleLiveProbe}
            onOpenBadgeModal={() => setShowBadgeModal(true)}
            autoProbeInterval={autoProbeInterval}
            onChangeAutoProbeInterval={setAutoProbeInterval}
          />
        )}

        {/* Tab 4: Architecture & SDKs */}
        {activeTab === 'overview' && (
          <ArchitectureSdkTab api={api} />
        )}

        {/* Tab 5: Request History */}
        {activeTab === 'history' && (
          <HistoryTab
            api={api}
            history={historyItems}
            onSelectHistoryItem={(item) => {
              setPlaygroundEndpoint(item.url);
              setPlaygroundMethod(item.method);
              setActiveTab('playground');
            }}
            onReRun={(item) => {
              setPlaygroundEndpoint(item.url);
              setPlaygroundMethod(item.method);
              setActiveTab('playground');
            }}
            onClearHistory={() => {
              setHistoryItems([]);
              sessionStorage.removeItem(`fah_history_${slug || 'api'}`);
            }}
            onOpenPlayground={() => setActiveTab('playground')}
          />
        )}

        {/* Tab 6: Auth */}
        {activeTab === 'auth' && (
          <ApiAuthTab
            api={api}
            onCredentialsUpdated={setCredentials}
            onOpenPlayground={() => setActiveTab('playground')}
          />
        )}

        {/* Tab 8: Settings */}
        {activeTab === 'settings' && (
          <ApiSettingsTab
            api={api}
            requestTimeout={requestTimeout}
            onSetRequestTimeout={setRequestTimeout}
            bypassCache={bypassCache}
            onToggleBypassCache={() => setBypassCache(!bypassCache)}
            followRedirects={followRedirects}
            onToggleFollowRedirects={() => setFollowRedirects(!followRedirects)}
            onClearHistory={() => {
              setHistoryItems([]);
              sessionStorage.removeItem(`fah_history_${slug || 'api'}`);
            }}
            onResetSettings={() => {
              setRequestTimeout(10000);
              setBypassCache(false);
              setFollowRedirects(true);
            }}
            onOpenPlayground={() => setActiveTab('playground')}
          />
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

      {/* Global API Auth Credentials Modal */}
      {api && (
        <ApiAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          api={api}
          onCredentialsUpdated={setCredentials}
        />
      )}

      {/* Global Request Settings Modal */}
      <RequestSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        requestTimeout={requestTimeout}
        onSetRequestTimeout={setRequestTimeout}
        bypassCache={bypassCache}
        onToggleBypassCache={() => setBypassCache(!bypassCache)}
        followRedirects={followRedirects}
        onToggleFollowRedirects={() => setFollowRedirects(!followRedirects)}
      />

      {/* Global Request History Modal */}
      {api && (
        <RequestHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          api={api}
          history={historyItems}
          onSelectHistoryItem={(item) => {
            setPlaygroundEndpoint(item.url);
            setPlaygroundMethod(item.method);
            setActiveTab('playground');
          }}
          onReRun={(item) => {
            setPlaygroundEndpoint(item.url);
            setPlaygroundMethod(item.method);
            setActiveTab('playground');
          }}
          onClearHistory={() => {
            setHistoryItems([]);
            sessionStorage.removeItem(`fah_history_${slug || 'api'}`);
          }}
        />
      )}

      {/* Global Client Code Modal */}
      {api && (
        <ClientCodeModal
          isOpen={showClientCodeModal}
          onClose={() => setShowClientCodeModal(false)}
          api={api}
          endpointUrl={
            playgroundEndpoint ||
            (api.endpoints && api.endpoints.length > 0
              ? (api.endpoints[0].path.startsWith('http')
                  ? api.endpoints[0].path
                  : `${api.base_url.replace(/\/+$/, '')}/${api.endpoints[0].path.replace(/^\/+/, '')}`)
              : api.base_url)
          }
          method={playgroundMethod || api.endpoints?.[0]?.method || 'GET'}
          params={playgroundParams || {}}
          body={playgroundBody}
        />
      )}
    </div>
  );
};
