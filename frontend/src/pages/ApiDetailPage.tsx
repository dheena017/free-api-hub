import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiItem, HealthCheckResult } from '../types/api';
import { fetchApiBySlug, fetchApis, checkApiHealth } from '../api/client';
import { Playground } from '../components/Playground';
import { ApiCard } from '../components/ApiCard';
import { LivePingBadge } from '../components/LivePingBadge';
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
  Compass
} from 'lucide-react';
import { formatLatencyBadge } from '../utils/codeSnippets';

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

  if (api.category === 'security') {
    return [
      'Automated vulnerability scanning and threat intelligence auditing',
      'DNS records verification, IP reputation checks, and SSL inspection',
      'Security incident response automation and compromised credential detection'
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
  const [api, setApi] = useState<ApiItem | null>(null);
  const [relatedApis, setRelatedApis] = useState<ApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<HealthCheckResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);

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
  }, [slug]);

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
        {/* Navigation Breadcrumb */}
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Verified Directory</span>
        </Link>

        {/* Primary Diagnostic Error Banner */}
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
                  API Service Not Available or Deprecated
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
                <span>Retry Request</span>
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

          {/* Diagnostic Error Details Box */}
          <div className="bg-[#1F1F1F] rounded-xl p-4 border border-[#3C4043] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 border-b border-[#3C4043] pb-2 text-[11px]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>Diagnostic Report</span>
              </span>
              <span>Timestamp: {new Date().toISOString()}</span>
            </div>
            <div className="text-rose-300 font-semibold">
              {error || `API endpoint '${slug}' was not found in the verified live database.`}
            </div>
            <p className="text-slate-400 font-sans text-xs leading-relaxed">
              Free API Hub actively cleans and filters its catalog. To ensure you only interact with 100% working REST APIs, any scraped documentation landing pages (such as entries with root '/' sample endpoints) or offline mock services have been permanently removed.
            </p>
          </div>

          {/* Diagnostic Troubleshooting Checklist */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-[#8AB4F8]" />
              <span>Troubleshooting & Guidance</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#1F1F1F] p-3.5 rounded-xl border border-[#3C4043] space-y-1.5">
                <span className="text-[11px] font-semibold text-[#8AB4F8] block">1. Check Backend Status</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Verify that the Python FastAPI server is active on <code className="text-slate-100 bg-[#28292A] px-1 rounded">http://localhost:8000</code>. If running, <Link to="/status" className="text-[#8AB4F8] underline">view platform health</Link>.
                </p>
              </div>
              <div className="bg-[#1F1F1F] p-3.5 rounded-xl border border-[#3C4043] space-y-1.5">
                <span className="text-[11px] font-semibold text-[#8AB4F8] block">2. Verify Endpoint Slug</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Double check the URL slug for typos. Slugs use lowercase letters and hyphens (e.g. <code className="text-slate-100 bg-[#28292A] px-1 rounded">open-meteo</code> or <code className="text-slate-100 bg-[#28292A] px-1 rounded">pokeapi</code>).
                </p>
              </div>
              <div className="bg-[#1F1F1F] p-3.5 rounded-xl border border-[#3C4043] space-y-1.5">
                <span className="text-[11px] font-semibold text-[#8AB4F8] block">3. Submit Real Service</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Know a real, working REST API for this service? <Link to="/submit" className="text-[#8AB4F8] underline">Submit the authentic endpoint</Link> to have it validated and indexed.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Alternatives */}
          <div className="pt-2 border-t border-[#3C4043] space-y-3">
            <div className="text-xs font-semibold text-slate-300">
              Popular Verified APIs You Can Test Right Now:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: 'PokéAPI', slug: 'pokeapi', category: 'Gaming' },
                { name: 'Open-Meteo', slug: 'open-meteo', category: 'Weather' },
                { name: 'CoinPaprika', slug: 'coinpaprika', category: 'Crypto' },
                { name: 'JSONPlaceholder', slug: 'jsonplaceholder', category: 'Dev Tools' }
              ].map((rec) => (
                <Link
                  key={rec.slug}
                  to={`/api/${rec.slug}`}
                  className="p-2.5 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] transition-colors flex flex-col gap-1"
                >
                  <span className="text-xs font-semibold text-white">{rec.name}</span>
                  <span className="text-[10px] font-mono text-[#8AB4F8]">{rec.category} • Tested 200 OK</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const latencyBadge = formatLatencyBadge(api.health.avg_latency_ms);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Directory</span>
      </Link>

      {/* Header Profile */}
      <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-slate-300 px-2.5 py-1 rounded bg-[#1F1F1F] border border-[#3C4043]">
                {api.category}
              </span>
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

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {api.name}
            </h1>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              {api.short_description || api.description}
            </p>

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

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 flex-shrink-0">
            <a
              href={api.documentation_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#303134] hover:bg-[#3C4043] text-slate-100 text-xs font-medium border border-[#3C4043] transition-colors"
            >
              <span>Official Documentation</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>

            {/* Real-time Live Health Widget */}
            <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-3 sm:min-w-[240px]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400 uppercase font-mono font-medium flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Real-Time Health</span>
                </div>
                <button
                  onClick={handleLiveProbe}
                  disabled={isProbing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono text-[#8AB4F8] hover:text-white bg-[#8AB4F8]/10 hover:bg-[#8AB4F8]/20 border border-[#8AB4F8]/30 transition-colors disabled:opacity-50"
                  title="Send authentic live HTTP request to check if working right now"
                >
                  <RefreshCw className={`h-3 w-3 ${isProbing ? 'animate-spin' : ''}`} />
                  <span>{isProbing ? 'Probing...' : 'Check Live'}</span>
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
                  <span>Last Code:</span>
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

              {api.health.message && (
                <div className="text-[11px] text-slate-300 pt-2 border-t border-[#3C4043] leading-relaxed">
                  <span className="text-slate-400 font-mono block text-[10px] uppercase">Probe Diagnostic:</span>
                  <span>{api.health.message}</span>
                </div>
              )}

              {probeError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-200">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
                    <span>Live Health Check Error</span>
                  </div>
                  <p className="font-mono text-[10px] text-rose-300/90 break-all">{probeError}</p>
                  <div className="text-[10px] text-slate-300 border-t border-rose-500/20 pt-1">
                    Suggestion: The remote endpoint may require custom headers/tokens or is temporarily blocking automated probe agents. Test directly using the Playground below.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Probe Success/Failure Banner */}
        {probeResult && (
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              probeResult.status === 'healthy'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : probeResult.status === 'degraded'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              {probeResult.status === 'healthy' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              ) : probeResult.status === 'degraded' ? (
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div>
                <div className="font-semibold text-xs text-white flex items-center gap-2">
                  <span>
                    {probeResult.status === 'healthy'
                      ? 'Live Check Verified: API is UP and Responding'
                      : probeResult.status === 'degraded'
                      ? 'Live Check Notice: API is Degraded'
                      : 'Live Check Alert: API is OFFLINE or Failing'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                    HTTP {probeResult.status_code || '0'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                  {probeResult.message} • Latency: {probeResult.latency_ms}ms • Target: {probeResult.target_url}
                </div>

                {probeResult.status !== 'healthy' && (
                  <div className="mt-2 text-[11px] bg-black/30 p-2.5 rounded-lg border border-white/10 text-slate-200">
                    <span className="font-semibold text-white block mb-0.5">Diagnostic Tip:</span>
                    {probeResult.status_code === 401 && (
                      <p>This endpoint requires an API key or auth token. In the Playground below, you can supply your credentials to test requests directly.</p>
                    )}
                    {probeResult.status_code === 403 && (
                      <p>Access forbidden (HTTP 403). The remote service may block automated bots or require IP whitelisting. Refer to official documentation for access requirements.</p>
                    )}
                    {probeResult.status_code === 404 && (
                      <p>Path not found (HTTP 404). The remote sample endpoint path may have changed or moved in a newer API version.</p>
                    )}
                    {probeResult.status_code === 429 && (
                      <p>Rate limited (HTTP 429). The shared free quota for this endpoint has been depleted. Retrying shortly may succeed.</p>
                    )}
                    {(probeResult.status_code >= 500 || probeResult.status_code === 0) && (
                      <p>The upstream server is experiencing downtime or failed to reply within 8 seconds. The remote service is temporarily unreachable.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400 self-end sm:self-auto">
              Checked live at {new Date(probeResult.last_checked).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Detailed Overview & Technical Architecture Section */}
      <section className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#3C4043]">
          <BookOpen className="h-5 w-5 text-[#8AB4F8]" />
          <div>
            <h2 className="text-lg font-bold text-white">About & Detailed Description</h2>
            <p className="text-xs text-slate-400">
              In-depth technical architecture, capabilities, and developer integration specs for {api.name}
            </p>
          </div>
        </div>

        {/* Detailed Description Paragraphs */}
        <div className="space-y-3 text-sm text-slate-200 leading-relaxed font-sans">
          {(api.detailed_description || api.description).split('\n\n').map((para, i) => (
            <p key={i} className="text-slate-300">
              {para}
            </p>
          ))}
        </div>

        {/* Key Architecture Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#3C4043]">
          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Authentication</span>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-[#8AB4F8]" />
              <span className="capitalize">{api.auth_type.replace('_', ' ')}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {api.auth_type === 'none'
                ? 'No API key required. Public open endpoint ready for immediate use.'
                : 'Requires a free developer key provided via request headers or query.'}
            </p>
          </div>

          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Pricing Policy</span>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="capitalize">{api.pricing_tier.replace('_', ' ')}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {api.pricing_tier === 'open'
                ? '100% free and open access without credit card or billing registration.'
                : 'Free tier available without credit card requirement.'}
            </p>
          </div>

          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">CORS Support</span>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[#8AB4F8]" />
              <span>{api.cors_supported ? 'CORS Enabled' : 'Backend / Proxy'}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {api.cors_supported
                ? 'Direct browser requests supported without encountering cross-origin blocks.'
                : 'Recommended for backend server calls or use the Free API Hub proxy.'}
            </p>
          </div>

          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Transport & Uptime</span>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>{api.https ? 'HTTPS Encrypted' : 'HTTP'}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Verified {api.health.uptime_percent}% uptime SLA • {api.health.avg_latency_ms}ms average response latency.
            </p>
          </div>
        </div>

        {/* Technical Endpoint Specs & Recommended Use Cases */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043] space-y-2.5">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-[#8AB4F8]" />
              <span>Endpoint Specifications</span>
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Base URL:</span>
                <span className="text-slate-200 select-all truncate max-w-[240px] bg-[#28292A] px-2 py-0.5 rounded border border-[#3C4043]">{api.base_url}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Sample Endpoint:</span>
                <span className="text-slate-200 select-all truncate max-w-[240px] bg-[#28292A] px-2 py-0.5 rounded border border-[#3C4043]">{api.sample_endpoint}</span>
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
              <span>Recommended Use Cases for {api.name}</span>
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

      {/* Interactive Testing Playground */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#8AB4F8]" />
          <h2 className="text-lg font-bold text-white">Live In-Browser Playground</h2>
        </div>
        <p className="text-xs text-slate-400">
          Click <strong className="text-white">"Run Test"</strong> below to send a live test request and inspect the response immediately.
        </p>

        <Playground api={api} />
      </section>

      {/* Related Alternatives */}
      {relatedApis.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-[#3C4043]">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#8AB4F8]" />
            <h2 className="text-lg font-bold text-white">Alternative APIs in {api.category}</h2>
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
