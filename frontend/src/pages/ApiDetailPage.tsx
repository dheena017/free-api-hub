import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiItem, HealthCheckResult } from '../types/api';
import { fetchApiBySlug, fetchApis, checkApiHealth } from '../api/client';
import { Playground } from '../components/Playground';
import { ApiCard } from '../components/ApiCard';
import { LivePingBadge } from '../components/LivePingBadge';
import { useBookmarks } from '../utils/useBookmarks';
import {
  generateCurlSnippet,
  generateJsSnippet,
  generatePythonSnippet,
  generateGoSnippet,
  formatLatencyBadge
} from '../utils/codeSnippets';
import {
  ArrowLeft,
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
  Share2
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

export const ApiDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { addHistoryItem } = useHistory();
  const { success, info } = useToast();

  const [api, setApi] = useState<ApiItem | null>(null);
  const [relatedApis, setRelatedApis] = useState<ApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<HealthCheckResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'playground' | 'snippets' | 'architecture'>('playground');
  const [snippetLang, setSnippetLang] = useState<'curl' | 'js' | 'python' | 'go'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const bookmarked = slug ? isBookmarked(slug) : false;

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

        // Fetch related APIs in the same category
        const relatedRes = await fetchApis({ category: item.category, limit: 4 });
        setRelatedApis(relatedRes.items.filter((r) => r.slug !== item.slug).slice(0, 3));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'API details could not be loaded');
      } finally {
        setIsLoading(false);
      }
    }
    loadApi();
  }, [slug, addHistoryItem]);

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    success('Code snippet copied to clipboard');
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyEndpoint = () => {
    if (!api) return;
    navigator.clipboard.writeText(`${api.base_url}${api.sample_endpoint}`);
    setCopiedUrl(true);
    success('Endpoint URL copied to clipboard');
    setTimeout(() => setCopiedUrl(false), 2000);
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

  if (isLoading) {
    return (
      <div className="py-24 max-w-7xl mx-auto px-4 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mx-auto mb-4" />
        <p className="text-sm font-mono text-slate-400">Loading API specifications and playground...</p>
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
  const targetUrl = `${api.base_url}${api.sample_endpoint}`;

  // Generated code snippets
  const snippets = {
    curl: generateCurlSnippet(targetUrl, api.method || 'GET'),
    js: generateJsSnippet(targetUrl, api.method || 'GET'),
    python: generatePythonSnippet(targetUrl, api.method || 'GET'),
    go: generateGoSnippet(targetUrl, api.method || 'GET')
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
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

      {/* Header Profile Card */}
      <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
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
                  HTTPS
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {api.name}
              </h1>
              <button
                onClick={() => slug && toggleBookmark(slug)}
                className={`p-2 rounded-xl border transition-colors ${
                  bookmarked
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-[#1F1F1F] border-[#3C4043] text-slate-400 hover:text-white hover:bg-[#303134]'
                }`}
                title={bookmarked ? 'Saved in bookmarks' : 'Add to bookmarks'}
              >
                <Star className={`h-4 w-4 ${bookmarked ? 'fill-amber-400' : ''}`} />
              </button>
            </div>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              {api.short_description || api.description}
            </p>

            {/* Quick URL & Copy Bar */}
            <div className="flex items-center gap-2 max-w-2xl bg-[#1F1F1F] p-2 rounded-xl border border-[#3C4043]">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                {api.method || 'GET'}
              </span>
              <code className="text-xs font-mono text-slate-300 truncate flex-1 select-all">
                {targetUrl}
              </code>
              <button
                onClick={handleCopyEndpoint}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#28292A] hover:bg-[#3C4043] text-xs font-medium text-slate-300 hover:text-white border border-[#3C4043] transition-colors"
                title="Copy endpoint"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Developer Tool Action Bar */}
            <div className="flex flex-wrap items-center gap-2">
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
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-xs font-medium text-slate-200 border border-[#3C4043] transition-colors"
                title="Share this API page"
              >
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Share</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {api.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-slate-400 font-mono bg-[#1F1F1F] px-2 py-0.5 rounded border border-[#3C4043]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right Widget: Real-Time Live Health Widget */}
          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-3 sm:min-w-[260px] flex-shrink-0">
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
            </div>

            {api.documentation_url && (
              <a
                href={api.documentation_url}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#28292A] hover:bg-[#303134] text-xs font-medium text-slate-200 border border-[#3C4043] transition-colors mt-2"
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
          </div>
        )}
      </div>

      {/* Navigation Tabs (Playground, Code Snippets, Architecture Specs) */}
      <div className="flex items-center gap-2 border-b border-[#3C4043] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('playground')}
          className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors border ${
            activeTab === 'playground'
              ? 'bg-[#8AB4F8] text-[#1F1F1F] border-[#8AB4F8]'
              : 'bg-[#28292A] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
          }`}
        >
          <Play className="h-3.5 w-3.5" />
          <span>Interactive Playground</span>
        </button>

        <button
          onClick={() => setActiveTab('snippets')}
          className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors border ${
            activeTab === 'snippets'
              ? 'bg-[#8AB4F8] text-[#1F1F1F] border-[#8AB4F8]'
              : 'bg-[#28292A] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>Integration Code</span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors border ${
            activeTab === 'architecture'
              ? 'bg-[#8AB4F8] text-[#1F1F1F] border-[#8AB4F8]'
              : 'bg-[#28292A] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Specs & Use Cases</span>
        </button>
      </div>

      {/* Tab 1: Interactive Playground */}
      {activeTab === 'playground' && (
        <section className="space-y-3">
          <Playground api={api} />
        </section>
      )}

      {/* Tab 2: Code Snippets Generator */}
      {activeTab === 'snippets' && (
        <section className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3C4043]">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#8AB4F8]" />
              <h3 className="text-sm font-bold text-white">Ready-Made Client Code</h3>
            </div>

            {/* Language tabs */}
            <div className="flex items-center gap-1.5 bg-[#1F1F1F] p-1 rounded-xl border border-[#3C4043]">
              {(['curl', 'js', 'python', 'go'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSnippetLang(lang)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                    snippetLang === lang
                      ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'js' ? 'JavaScript' : lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <pre className="bg-[#1F1F1F] rounded-xl p-4 text-xs font-mono text-slate-200 overflow-x-auto border border-[#3C4043] leading-relaxed">
              {snippets[snippetLang]}
            </pre>
            <button
              onClick={() => handleCopySnippet(snippets[snippetLang])}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#28292A] hover:bg-[#3C4043] text-xs font-medium text-slate-200 border border-[#3C4043] transition-colors"
            >
              {copiedSnippet ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Tab 3: Architecture & Specifications */}
      {activeTab === 'architecture' && (
        <section className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white">Technical Architecture & Capability Overview</h2>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              {(api.detailed_description || api.description).split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#3C4043]">
            <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-2.5">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-[#8AB4F8]" />
                <span>Endpoint Technical Specs</span>
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Base URL:</span>
                  <span className="text-slate-200 select-all truncate max-w-[220px] bg-[#28292A] px-2 py-0.5 rounded border border-[#3C4043]">{api.base_url}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Sample Endpoint:</span>
                  <span className="text-slate-200 select-all truncate max-w-[220px] bg-[#28292A] px-2 py-0.5 rounded border border-[#3C4043]">{api.sample_endpoint}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>HTTP Method:</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{api.method || 'GET'}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-2.5">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-accent" />
                <span>Recommended Production Use Cases</span>
              </h3>
              <ul className="text-xs text-slate-300 space-y-2">
                {getApiSpecificUseCases(api).map((useCase, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#8AB4F8] mt-0.5">•</span>
                    <span>{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>
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
              View all in {api.category}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedApis.map((item) => (
              <ApiCard key={item.id} api={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
