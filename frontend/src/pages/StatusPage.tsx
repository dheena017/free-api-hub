import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CatalogStats, ApiItem } from '../types/api';
import { fetchStats, fetchApis, checkApiHealth, checkBatchHealth } from '../api/client';
import { LivePingBadge } from '../components/LivePingBadge';
import { formatLatencyBadge } from '../utils/codeSnippets';
import { CustomSelect, SelectOption } from '../components/CustomSelect';
import {
  Activity,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Radio,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Play,
  ArrowRight,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilterX
} from 'lucide-react';
import { SkeletonCard } from '../components/SkeletonCard';

const STATUS_SORT_OPTIONS: SelectOption[] = [
  { value: 'uptime', label: 'Highest Uptime %' },
  { value: 'latency', label: 'Lowest Latency' },
  { value: 'name', label: 'Endpoint Name (A-Z)' }
];

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '25', label: '25 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' }
];

function formatLastChecked(dateStr?: string | null): string {
  if (!dateStr) return 'Awaiting daily check';
  try {
    const d = new Date(dateStr);
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return 'Verified';
  }
}

export const StatusPage: React.FC = () => {
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [endpoints, setEndpoints] = useState<ApiItem[]>([]);
  const [totalEndpoints, setTotalEndpoints] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'degraded' | 'offline' | 'untested'>('all');
  const [statusSort, setStatusSort] = useState<'uptime' | 'latency' | 'name'>('uptime');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const [copiedReport, setCopiedReport] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [isBatchProbing, setIsBatchProbing] = useState(false);
  const [probingSlug, setProbingSlug] = useState<string | null>(null);
  const [liveProbeBanner, setLiveProbeBanner] = useState<{
    count: number;
    healthy: number;
    degraded: number;
    offline: number;
    timestamp: string;
  } | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load status telemetry and APIs dynamically from server
  const loadStatusData = async () => {
    setIsLoading(true);
    setDashboardError(null);
    try {
      const [statsRes, apisRes] = await Promise.all([
        fetchStats(),
        fetchApis({
          q: debouncedSearch.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          sort: statusSort,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize
        })
      ]);
      setStats(statsRes);
      setEndpoints(apisRes.items);
      setTotalEndpoints(apisRes.total);
    } catch (err: unknown) {
      console.error('Failed to load status dashboard:', err);
      setDashboardError(err instanceof Error ? err.message : 'Failed to connect to status service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatusData();
  }, [debouncedSearch, statusFilter, statusSort, currentPage, pageSize]);

  // Configurable auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const intervalId = setInterval(() => {
      loadStatusData();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, debouncedSearch, statusFilter, statusSort, currentPage, pageSize]);

  const totalPages = Math.ceil(totalEndpoints / pageSize) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  };

  const handleCopyReport = () => {
    const report = [
      `=========================================`,
      ` FREE API HUB — SYSTEM STATUS REPORT`,
      ` Generated: ${new Date().toISOString()}`,
      `=========================================`,
      `Global Uptime       : ${stats ? `${stats.global_uptime_percent}%` : 'N/A'}`,
      `Total APIs Monitored: ${stats ? stats.total_apis : totalEndpoints}`,
      `Average Latency     : ${stats ? `${stats.avg_latency_ms}ms` : 'N/A'}`,
      `Total Checks Today  : ${stats ? stats.total_checks_today : 'N/A'}`,
      `Operational APIs    : ${stats?.healthy_count ?? 0}`,
      `Degraded APIs       : ${stats?.degraded_count ?? 0}`,
      `Offline APIs        : ${stats?.offline_count ?? 0}`,
      `Current Incident State: ${(stats?.offline_count ?? 0) === 0 ? 'All Systems Operational' : `${stats?.offline_count} Endpoints Currently Unreachable`}`,
      `=========================================`
    ].join('\n');
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleBatchProbe = async () => {
    if (endpoints.length === 0) return;
    setIsBatchProbing(true);
    setLiveProbeBanner(null);
    setProbeError(null);
    try {
      const slugsToProbe = endpoints.map((e) => e.slug);
      const res = await checkBatchHealth({ slugs: slugsToProbe });

      const resultMap = new Map(res.results.map((r) => [r.slug, r]));
      setEndpoints((prev) =>
        prev.map((e) => {
          const r = resultMap.get(e.slug);
          if (!r) return e;
          return {
            ...e,
            health: {
              ...e.health,
              status: r.status,
              avg_latency_ms: r.latency_ms,
              last_status_code: r.status_code,
              uptime_percent: r.uptime_percent,
              last_checked: r.last_checked,
              message: r.message
            }
          };
        })
      );
      setStats(res.stats);
      setLiveProbeBanner({
        count: res.probes_executed ?? res.total_probed ?? 0,
        healthy: res.healthy_count,
        degraded: res.degraded_count,
        offline: res.offline_count,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: unknown) {
      setProbeError(err instanceof Error ? err.message : 'Batch live health probe encountered an error.');
    } finally {
      setIsBatchProbing(false);
    }
  };

  const handleSingleProbe = async (slug: string) => {
    setProbingSlug(slug);
    try {
      const result = await checkApiHealth(slug);
      setEndpoints((prev) =>
        prev.map((e) => {
          if (e.slug !== slug) return e;
          return {
            ...e,
            health: {
              ...e.health,
              status: result.status,
              avg_latency_ms: result.latency_ms,
              last_status_code: result.status_code,
              uptime_percent: result.uptime_percent,
              last_checked: result.last_checked,
              message: result.message
            }
          };
        })
      );
    } catch (err) {
      console.error(`Probe failed for ${slug}:`, err);
    } finally {
      setProbingSlug(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner / Error Banner */}
      {dashboardError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-300">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <div className="text-xs">
              <strong className="text-white block">Connection Alert</strong>
              <span>{dashboardError}</span>
            </div>
          </div>
          <button
            onClick={loadStatusData}
            className="px-3 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3C4043] text-xs font-mono text-[#8AB4F8] transition-colors border border-[#3C4043]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header and Live Status Bar */}
      <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Health Monitoring</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              API Ecosystem Status
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1 leading-relaxed">
              Automated health daemons continuously verify availability and latency for all catalog endpoints.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-Refresh Toggle */}
            <div className="flex items-center bg-[#1F1F1F] rounded-xl border border-[#3C4043] p-1 text-xs">
              <span className="text-[10px] text-slate-400 font-mono px-2">Auto-Ping:</span>
              {[0, 15, 30, 60].map((interval) => (
                <button
                  key={interval}
                  onClick={() => setAutoRefreshInterval(interval)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                    autoRefreshInterval === interval
                      ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {interval === 0 ? 'Off' : `${interval}s`}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#28292A] hover:bg-[#303134] text-slate-300 hover:text-white text-xs font-medium border border-[#3C4043] transition-colors"
              title="Copy markdown health report"
            >
              {copiedReport ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copiedReport ? 'Report Copied!' : 'Copy Report'}</span>
            </button>

            <button
              onClick={handleBatchProbe}
              disabled={isBatchProbing || endpoints.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8AB4F8] hover:bg-[#A8C7FA] text-xs font-bold text-[#1F1F1F] transition-all disabled:opacity-50 shadow-sm"
            >
              <Radio className={`h-4 w-4 ${isBatchProbing ? 'animate-pulse' : ''}`} />
              <span>{isBatchProbing ? `Probing ${endpoints.length} Endpoints...` : `Live Probe Page (${endpoints.length})`}</span>
            </button>

            <button
              onClick={loadStatusData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#303134] hover:bg-[#3C4043] text-slate-300 hover:text-white border border-[#3C4043] transition-colors"
              title="Refresh status data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Summary Cards (No hardcoding) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#3C4043]">
          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Operational Uptime</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" />
              <span>{stats ? `${stats.global_uptime_percent}%` : '--'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Catalog Global Average</div>
          </div>

          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Monitored Endpoints</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {stats ? stats.total_apis.toLocaleString() : '--'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Live Tracked APIs</div>
          </div>

          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Average Latency</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400 mt-1 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{stats ? `${stats.avg_latency_ms}ms` : '--'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Round-Trip Telemetry</div>
          </div>

          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Health Status</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              {stats ? (
                (stats.offline_count ?? 0) === 0 ? 'All Systems Go' : `${stats.offline_count} Incidents`
              ) : '--'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {stats ? `${stats.total_checks_today.toLocaleString()} Daily Checks` : 'Continuous Probing'}
            </div>
          </div>
        </div>

        {/* Live Batch Probe Banner */}
        {liveProbeBanner && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>
                Batch Probe Completed at {liveProbeBanner.timestamp}:{' '}
                <strong className="text-white">{liveProbeBanner.count}</strong> endpoints tested •{' '}
                <strong className="text-emerald-400">{liveProbeBanner.healthy} Operational</strong> •{' '}
                <strong className="text-amber-400">{liveProbeBanner.degraded} Degraded</strong> •{' '}
                <strong className="text-rose-400">{liveProbeBanner.offline} Offline</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs (Dynamic counts from stats) */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
              statusFilter === 'all'
                ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                : 'bg-[#1F1F1F] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
            }`}
          >
            All ({stats?.total_apis.toLocaleString() ?? totalEndpoints.toLocaleString()})
          </button>
          <button
            onClick={() => {
              setStatusFilter('healthy');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
              statusFilter === 'healthy'
                ? 'bg-emerald-500 text-[#1F1F1F] font-bold border-emerald-500'
                : 'bg-[#1F1F1F] text-emerald-400 border-[#3C4043] hover:bg-[#303134]'
            }`}
          >
            🟢 Operational ({stats?.healthy_count ?? 0})
          </button>
          {(stats?.degraded_count || 0) > 0 || statusFilter === 'degraded' ? (
            <button
              onClick={() => {
                setStatusFilter('degraded');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                statusFilter === 'degraded'
                  ? 'bg-amber-400 text-[#1F1F1F] font-bold border-amber-400'
                  : 'bg-[#1F1F1F] text-amber-300 border-[#3C4043] hover:bg-[#303134]'
              }`}
            >
              🟡 Degraded ({stats?.degraded_count ?? 0})
            </button>
          ) : null}
          {(stats?.offline_count || 0) > 0 || statusFilter === 'offline' ? (
            <button
              onClick={() => {
                setStatusFilter('offline');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                statusFilter === 'offline'
                  ? 'bg-rose-500 text-white font-bold border-rose-500'
                  : 'bg-[#1F1F1F] text-rose-400 border-[#3C4043] hover:bg-[#303134]'
              }`}
            >
              🔴 Offline ({stats?.offline_count ?? 0})
            </button>
          ) : null}
          {(stats?.untested_count || 0) > 0 || statusFilter === 'untested' ? (
            <button
              onClick={() => {
                setStatusFilter('untested');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                statusFilter === 'untested'
                  ? 'bg-slate-400 text-[#1F1F1F] font-bold border-slate-400'
                  : 'bg-[#1F1F1F] text-slate-400 border-[#3C4043] hover:bg-[#303134]'
              }`}
            >
              ⚪ Untested ({stats?.untested_count ?? 0})
            </button>
          ) : null}
        </div>

        {/* Right Search, Page Size & Sort */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative w-44 sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all endpoints..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[#1F1F1F] border border-[#3C4043] text-xs text-white placeholder-slate-400 outline-none focus:border-[#8AB4F8]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="w-36">
            <CustomSelect
              value={pageSize.toString()}
              onChange={(val) => {
                setPageSize(parseInt(val, 10));
                setCurrentPage(1);
              }}
              options={PAGE_SIZE_OPTIONS}
              size="sm"
              variant="surface"
            />
          </div>

          <div className="w-48 sm:w-52">
            <CustomSelect
              value={statusSort}
              onChange={(val) => {
                setStatusSort(val as any);
                setCurrentPage(1);
              }}
              options={STATUS_SORT_OPTIONS}
              size="sm"
              variant="surface"
            />
          </div>
        </div>
      </div>

      {/* Status Table List */}
      <main className="space-y-4">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} viewMode="compact" />
            ))}
          </div>
        ) : endpoints.length > 0 ? (
          <div className="space-y-2.5">
            {endpoints.map((ep) => {
              const latency = formatLatencyBadge(ep.health.avg_latency_ms);
              const isProbingCurrent = probingSlug === ep.slug;

              return (
                <div
                  key={ep.slug}
                  className="bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <LivePingBadge
                      status={ep.health.status}
                      uptimePercent={ep.health.uptime_percent}
                      pulse={ep.health.status === 'healthy'}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/api/${ep.slug}`}
                          className="font-bold text-sm text-white hover:text-accent transition-colors truncate"
                        >
                          {ep.name}
                        </Link>
                        <span className="text-[10px] uppercase font-mono text-slate-400 px-1.5 py-0.5 rounded bg-[#1F1F1F] border border-[#3C4043]">
                          {ep.category}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          {ep.endpoints?.[0]?.method || 'GET'}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            ep.health.last_status_code && ep.health.last_status_code >= 200 && ep.health.last_status_code < 400
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : ep.health.last_status_code
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {ep.health.last_status_code ? `HTTP ${ep.health.last_status_code}` : 'Pending Probe'}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 truncate mt-1">
                        {ep.base_url}{ep.endpoint}
                      </div>
                    </div>
                  </div>

                  {/* Telemetry info & Probe Actions */}
                  <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-auto text-xs">
                    {/* Visual uptime tick bars */}
                    <div
                      className="hidden lg:flex items-center gap-1"
                      title={`Uptime: ${ep.health.uptime_percent != null ? `${ep.health.uptime_percent}%` : 'Untested'} • Status: ${ep.health.status} • Checked ${formatLastChecked(ep.health.last_checked)}`}
                    >
                      {Array.from({ length: 12 }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-5 rounded-sm transition-colors ${
                            ep.health.status === 'untested'
                              ? 'bg-slate-700/50'
                              : ep.health.status === 'offline' && idx >= 9
                              ? 'bg-rose-500'
                              : ep.health.status === 'degraded' && idx >= 10
                              ? 'bg-amber-400'
                              : 'bg-emerald-500/80 hover:bg-emerald-400'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-white font-bold">
                        {ep.health.uptime_percent != null ? `${ep.health.uptime_percent}%` : '--'}
                      </div>
                      <div className={`text-[11px] ${latency.colorClass.split(' ')[0]}`}>
                        {ep.health.avg_latency_ms != null ? `${ep.health.avg_latency_ms}ms` : 'Untested'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatLastChecked(ep.health.last_checked)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSingleProbe(ep.slug)}
                        disabled={isProbingCurrent}
                        className="p-2 rounded-lg bg-[#1F1F1F] hover:bg-[#3C4043] text-[#8AB4F8] border border-[#3C4043] transition-colors disabled:opacity-50"
                        title="Ping this endpoint now"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isProbingCurrent ? 'animate-spin' : ''}`} />
                      </button>

                      <Link
                        to={`/api/${ep.slug}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8AB4F8]/10 hover:bg-[#8AB4F8]/20 border border-[#8AB4F8]/30 text-xs font-semibold text-[#8AB4F8] hover:text-white transition-colors"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Playground</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Comprehensive Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-6 pb-2 border-t border-[#3C4043] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 font-mono">
                  Showing <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> -{' '}
                  <strong className="text-white">{Math.min(currentPage * pageSize, totalEndpoints)}</strong> of{' '}
                  <strong className="text-accent">{totalEndpoints.toLocaleString()}</strong> monitored APIs
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber = currentPage;
                      if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      if (pageNumber < 1 || pageNumber > totalPages) return null;

                      const isActive = pageNumber === currentPage;
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`min-w-[34px] h-[34px] rounded-lg text-xs font-mono font-medium transition-colors border ${
                            isActive
                              ? 'bg-[#8AB4F8] border-[#8AB4F8] text-[#1F1F1F] font-bold shadow-sm'
                              : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#303134] hover:text-white'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#28292A] rounded-2xl p-12 text-center border border-[#3C4043] space-y-3">
            <FilterX className="h-10 w-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No endpoints match filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No API endpoints matched the criteria. Try clearing the search query or selecting "All" statuses.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setStatusSort('uptime');
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-xl bg-[#8AB4F8] text-[#1F1F1F] font-semibold text-xs hover:bg-[#A8C7FA] transition-colors"
            >
              Reset Status Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
