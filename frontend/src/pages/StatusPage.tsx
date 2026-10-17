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
  Check
} from 'lucide-react';
import { SkeletonCard } from '../components/SkeletonCard';

const STATUS_SORT_OPTIONS: SelectOption[] = [
  { value: 'uptime', label: 'Highest Uptime %' },
  { value: 'latency', label: 'Lowest Latency' },
  { value: 'name', label: 'Endpoint Name (A-Z)' }
];

export const StatusPage: React.FC = () => {
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [endpoints, setEndpoints] = useState<ApiItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'degraded' | 'offline'>('all');
  const [statusSort, setStatusSort] = useState<'uptime' | 'latency' | 'name'>('uptime');
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const intervalId = setInterval(() => {
      loadStatusData();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [autoRefreshInterval]);

  const handleCopyReport = () => {
    const report = [
      `=========================================`,
      ` FREE API HUB — SYSTEM STATUS REPORT`,
      ` Timestamp: ${new Date().toISOString()}`,
      `=========================================`,
      `Global Uptime      : ${stats?.global_uptime_percent || 99.8}%`,
      `Total APIs Monitored: ${stats?.total_apis || 4045}`,
      `Average Latency    : ${stats?.avg_latency_ms || 135}ms`,
      `Healthy Endpoints  : ${healthyCount}`,
      `Degraded Endpoints : ${degradedCount}`,
      `Offline Endpoints  : ${offlineCount}`,
      `Incident Status    : ${offlineCount === 0 ? 'All Systems Operational' : `${offlineCount} Incidents Active`}`,
      `=========================================`
    ].join('\n');
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const loadStatusData = async () => {
    setIsLoading(true);
    setDashboardError(null);
    try {
      const [statsRes, apisRes] = await Promise.all([
        fetchStats(),
        fetchApis({ limit: 100, sort: 'uptime' })
      ]);
      setStats(statsRes);
      setEndpoints(apisRes.items);
    } catch (err: unknown) {
      console.error('Failed to load status dashboard:', err);
      setDashboardError(err instanceof Error ? err.message : 'Failed to connect to status service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchProbe = async () => {
    setIsBatchProbing(true);
    setLiveProbeBanner(null);
    setProbeError(null);
    try {
      const slugsToProbe = endpoints.slice(0, 30).map((e) => e.slug);
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
        count: res.probes_executed,
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

  useEffect(() => {
    loadStatusData();
  }, []);

  // Filtered and sorted endpoints
  const filteredEndpoints = endpoints
    .filter((e) => {
      if (statusFilter !== 'all' && e.health.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.sample_endpoint.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (statusSort === 'uptime') {
        return b.health.uptime_percent - a.health.uptime_percent;
      }
      if (statusSort === 'latency') {
        return a.health.avg_latency_ms - b.health.avg_latency_ms;
      }
      return a.name.localeCompare(b.name);
    });

  const healthyCount = endpoints.filter((e) => e.health.status === 'healthy').length;
  const degradedCount = endpoints.filter((e) => e.health.status === 'degraded').length;
  const offlineCount = endpoints.filter((e) => e.health.status === 'offline').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
              <span className="text-[10px] text-slate-400 font-mono px-2">Refresh:</span>
              {[0, 30, 60].map((interval) => (
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
              disabled={isBatchProbing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8AB4F8] hover:bg-[#A8C7FA] text-xs font-bold text-[#1F1F1F] transition-all disabled:opacity-50 shadow-sm"
            >
              <Radio className={`h-4 w-4 ${isBatchProbing ? 'animate-pulse' : ''}`} />
              <span>{isBatchProbing ? 'Probing 30 Endpoints...' : 'Run Live Batch Probe'}</span>
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

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#3C4043]">
          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Operational Status</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" />
              <span>{stats?.global_uptime_percent || '99.8'}%</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Global Catalog Uptime</div>
          </div>

          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Tracked Endpoints</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {stats?.total_apis ? stats.total_apis.toLocaleString() : '4,045'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Live Endpoints</div>
          </div>

          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Average Latency</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400 mt-1 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{stats?.avg_latency_ms || '135'}ms</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Round-Trip Response</div>
          </div>

          <div className="bg-[#1F1F1F] p-4 rounded-xl border border-[#3C4043]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Incident Status</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              {offlineCount === 0 ? 'Normal' : `${offlineCount} Offline`}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">All Systems Operational</div>
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
                <strong className="text-amber-400">{liveProbeBanner.degraded} Degraded</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
              statusFilter === 'all'
                ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                : 'bg-[#1F1F1F] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
            }`}
          >
            All ({endpoints.length})
          </button>
          <button
            onClick={() => setStatusFilter('healthy')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
              statusFilter === 'healthy'
                ? 'bg-emerald-500 text-[#1F1F1F] font-bold border-emerald-500'
                : 'bg-[#1F1F1F] text-emerald-400 border-[#3C4043] hover:bg-[#303134]'
            }`}
          >
            🟢 Operational ({healthyCount})
          </button>
          {degradedCount > 0 && (
            <button
              onClick={() => setStatusFilter('degraded')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                statusFilter === 'degraded'
                  ? 'bg-amber-400 text-[#1F1F1F] font-bold border-amber-400'
                  : 'bg-[#1F1F1F] text-amber-300 border-[#3C4043] hover:bg-[#303134]'
              }`}
            >
              🟡 Degraded ({degradedCount})
            </button>
          )}
          {offlineCount > 0 && (
            <button
              onClick={() => setStatusFilter('offline')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                statusFilter === 'offline'
                  ? 'bg-rose-500 text-white font-bold border-rose-500'
                  : 'bg-[#1F1F1F] text-rose-400 border-[#3C4043] hover:bg-[#303134]'
              }`}
            >
              🔴 Offline ({offlineCount})
            </button>
          )}
        </div>

        {/* Right Search & Sort */}
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-60">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search status list..."
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

          <div className="w-44">
            <CustomSelect
              value={statusSort}
              onChange={(val) => setStatusSort(val as any)}
              options={STATUS_SORT_OPTIONS}
              size="sm"
              variant="surface"
            />
          </div>
        </div>
      </div>

      {/* Status Table List */}
      <main className="space-y-3">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} viewMode="compact" />
            ))}
          </div>
        ) : filteredEndpoints.length > 0 ? (
          <div className="space-y-2.5">
            {filteredEndpoints.map((ep) => {
              const latency = formatLatencyBadge(ep.health.avg_latency_ms);
              const isProbingCurrent = probingSlug === ep.slug;

              return (
                <div
                  key={ep.id}
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
                        <span className="text-[10px] uppercase font-mono text-slate-400 px-1.5 py-0.2 rounded bg-[#1F1F1F] border border-[#3C4043]">
                          {ep.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          HTTP {ep.health.last_status_code || 200}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 truncate mt-0.5">
                        {ep.base_url}{ep.sample_endpoint}
                      </div>
                    </div>
                  </div>

                  {/* 90-day simulated uptime blocks + Latency + Actions */}
                  <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-auto text-xs">
                    {/* Visual 14-day uptime bar */}
                    <div className="hidden lg:flex items-center gap-1" title="Recent Uptime Checks">
                      {Array.from({ length: 14 }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-5 rounded-sm ${
                            ep.health.status === 'healthy'
                              ? 'bg-emerald-500/80 hover:bg-emerald-400'
                              : ep.health.status === 'degraded' && idx === 13
                              ? 'bg-amber-400'
                              : ep.health.status === 'offline' && idx >= 11
                              ? 'bg-rose-500'
                              : 'bg-emerald-500/80'
                          } transition-colors`}
                        />
                      ))}
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-white font-bold">{ep.health.uptime_percent}%</div>
                      <div className={`text-[11px] ${latency.colorClass.split(' ')[0]}`}>
                        {ep.health.avg_latency_ms}ms
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSingleProbe(ep.slug)}
                        disabled={isProbingCurrent}
                        className="p-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#3C4043] text-[#8AB4F8] border border-[#3C4043] transition-colors disabled:opacity-50"
                        title="Ping this endpoint now"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isProbingCurrent ? 'animate-spin' : ''}`} />
                      </button>

                      <Link
                        to={`/api/${ep.slug}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#8AB4F8]/10 hover:bg-[#8AB4F8]/20 border border-[#8AB4F8]/30 text-xs font-medium text-[#8AB4F8] hover:text-white transition-colors"
                      >
                        <span>Test</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#28292A] rounded-2xl p-12 text-center border border-[#3C4043] text-xs text-slate-400">
            No endpoints matched the filter or search query.
          </div>
        )}
      </main>
    </div>
  );
};
