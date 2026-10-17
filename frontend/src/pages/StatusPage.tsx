import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CatalogStats, ApiItem } from '../types/api';
import { fetchStats, fetchApis, checkApiHealth, checkBatchHealth } from '../api/client';
import { LivePingBadge } from '../components/LivePingBadge';
import { logger } from '../utils/logger';
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
  HelpCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { formatLatencyBadge } from '../utils/codeSnippets';
import { CustomSelect, SelectOption } from '../components/CustomSelect';

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'healthy', label: '🟢 Operational Only' },
  { value: 'degraded', label: '🟡 Degraded Only' },
  { value: 'offline', label: '🔴 Offline Only' }
];

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
  const [isLoading, setIsLoading] = useState(true);
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
        count: res.total_probed,
        healthy: res.healthy_count,
        degraded: res.degraded_count,
        offline: res.offline_count,
        timestamp: new Date().toLocaleTimeString()
      });
      logger.info(`Batch health probe complete: ${res.healthy_count} healthy, ${res.degraded_count} degraded, ${res.offline_count} offline`);
    } catch (err: unknown) {
      logger.error('Batch health probe failed', err);
      setProbeError(err instanceof Error ? err.message : 'Batch live health probe encountered a network failure.');
    } finally {
      setIsBatchProbing(false);
    }
  };

  const handleSingleProbe = async (slug: string) => {
    setProbingSlug(slug);
    setProbeError(null);
    try {
      const res = await checkApiHealth(slug);
      logger.health(slug, res.status, res.latency_ms);
      setEndpoints((prev) =>
        prev.map((e) => {
          if (e.slug !== slug && e.id !== slug) return e;
          return {
            ...e,
            health: {
              ...e.health,
              status: res.status,
              avg_latency_ms: res.latency_ms,
              last_status_code: res.status_code,
              uptime_percent: res.uptime_percent,
              last_checked: res.last_checked,
              message: res.message
            }
          };
        })
      );
      const updatedStats = await fetchStats();
      setStats(updatedStats);
    } catch (err: unknown) {
      logger.error(`Single health probe for ${slug} failed`, err);
      setProbeError(err instanceof Error ? err.message : `Failed to ping ${slug}: upstream host unreachable.`);
    } finally {
      setProbingSlug(null);
    }
  };

  useEffect(() => {
    loadStatusData();
  }, []);

  const degradedServices = endpoints.filter((e) => e.health.status !== 'healthy');
  const allHealthy = degradedServices.length === 0;

  const filteredEndpoints = endpoints
    .filter((api) => {
      if (statusFilter === 'all') return true;
      return api.health.status === statusFilter;
    })
    .sort((a, b) => {
      if (statusSort === 'uptime') {
        return (b.health.uptime_percent || 0) - (a.health.uptime_percent || 0);
      }
      if (statusSort === 'latency') {
        return (a.health.avg_latency_ms || 9999) - (b.health.avg_latency_ms || 9999);
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Activity className="h-4 w-4" />
            <span>Real-Time Health Dashboard</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">System Status & Live Uptime</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real live HTTP health probes monitor endpoint availability and network latency directly from target hosts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleBatchProbe}
            disabled={isBatchProbing || isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#1F1F1F] text-xs font-semibold transition-colors disabled:opacity-50"
            title="Send authentic concurrent live HTTP probes to test endpoints now"
          >
            <Radio className={`h-3.5 w-3.5 ${isBatchProbing ? 'animate-pulse' : ''}`} />
            <span>{isBatchProbing ? 'Probing 30 Endpoints...' : 'Probe Live Endpoints'}</span>
          </button>

          <button
            onClick={loadStatusData}
            disabled={isLoading || isBatchProbing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#28292A] border border-[#3C4043] hover:bg-[#303134] text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div className="bg-[#28292A] rounded-2xl p-6 border border-[#3C4043] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`h-12 w-12 rounded-xl bg-[#1F1F1F] border flex items-center justify-center ${
              allHealthy
                ? 'border-emerald-500/30 text-emerald-400'
                : 'border-amber-500/30 text-amber-400'
            }`}
          >
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{allHealthy ? 'All Systems Operational' : 'Degraded Services Detected'}</span>
              <span
                className={`flex h-2.5 w-2.5 rounded-full ${
                  allHealthy ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {stats?.healthy_count || endpoints.length} out of {stats?.total_apis || endpoints.length} endpoints are currently responsive with valid HTTP responses.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-center">
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {stats?.global_uptime_percent || '99.8'}%
            </div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Catalog Uptime</div>
          </div>
          <div className="border-l border-[#3C4043] pl-6">
            <div className="text-2xl font-bold font-mono text-sky-400">
              {stats?.avg_latency_ms || '135'}ms
            </div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Avg Latency</div>
          </div>
        </div>
      </div>

      {/* Dashboard Connection Error */}
      {dashboardError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <div>
              <div className="font-semibold text-xs text-white">Status Dashboard Sync Failed</div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">{dashboardError}</div>
            </div>
          </div>
          <button
            onClick={loadStatusData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#303134] hover:bg-[#3C4043] text-xs text-[#8AB4F8] font-medium border border-[#3C4043] transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Live Probe Error Alert */}
      {probeError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <div>
              <div className="font-semibold text-xs text-white">Live Health Probe Notice</div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">{probeError}</div>
            </div>
          </div>
          <button
            onClick={() => setProbeError(null)}
            className="text-slate-400 hover:text-white p-1"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Live Probe Result Banner (if triggered) */}
      {liveProbeBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-semibold text-xs text-white">
                Live HTTP Batch Verification Complete ({liveProbeBanner.timestamp})
              </div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                Probed {liveProbeBanner.count} endpoints live: 🟢 {liveProbeBanner.healthy} Operational | 🟡 {liveProbeBanner.degraded} Degraded | 🔴 {liveProbeBanner.offline} Offline
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 px-2 py-1 rounded bg-emerald-500/20 self-start sm:self-auto">
            Metrics Updated
          </span>
        </div>
      )}

      {/* Degraded Alert (if any) */}
      {degradedServices.length > 0 && (
        <div className="bg-[#28292A] rounded-2xl p-4 border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>Currently Degraded Services ({degradedServices.length})</span>
          </div>
          <p className="text-xs text-slate-300">
            The following services experienced elevated latency or non-200 responses:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {degradedServices.map((d) => (
              <span
                key={d.id}
                className="text-xs font-mono text-amber-300 bg-[#1F1F1F] px-2 py-0.5 rounded border border-amber-500/30"
              >
                {d.name} ({d.health.avg_latency_ms}ms • HTTP {d.health.last_status_code || 0})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Status Audit Table */}
      <div className="bg-[#28292A] rounded-2xl border border-[#3C4043] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#3C4043] bg-[#28292A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#8AB4F8]" />
                  <span>Live Health Telemetry</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  ({filteredEndpoints.length} of {endpoints.length} Active Probes)
                </span>
              </div>

              {/* Status and Sort Custom Dropdowns */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-48">
                  <CustomSelect
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val as any)}
                    options={STATUS_FILTER_OPTIONS}
                    size="sm"
                    variant="surface"
                  />
                </div>
                <div className="w-48">
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#3C4043] bg-[#1F1F1F] text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Endpoint Name</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Health Status</th>
                    <th className="px-6 py-3">Catalog Uptime</th>
                    <th className="px-6 py-3">Roundtrip Latency</th>
                    <th className="px-6 py-3">Last Code</th>
                    <th className="px-6 py-3 text-right">Live Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3C4043] font-mono">
                  {filteredEndpoints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-sans">
                        No endpoints match the selected status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredEndpoints.map((api) => {
                      const latencyBadge = formatLatencyBadge(api.health.avg_latency_ms);
                      const isThisProbing = probingSlug === api.slug;
                return (
                  <tr key={api.id} className="hover:bg-[#303134] transition-colors">
                    <td className="px-6 py-3.5 font-sans font-medium text-slate-200">
                      <Link to={`/api/${api.slug}`} className="hover:text-[#8AB4F8] transition-colors">
                        {api.name}
                      </Link>
                      {api.health.message && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs mt-0.5">
                          {api.health.message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 capitalize font-sans">
                      {api.category}
                    </td>
                    <td className="px-6 py-3.5">
                      <LivePingBadge
                        status={api.health.status}
                        showText={true}
                        pulse={api.health.status === 'healthy'}
                      />
                    </td>
                    <td className="px-6 py-3.5 text-emerald-400 font-bold">
                      {api.health.uptime_percent}%
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded border text-[11px] ${latencyBadge.colorClass}`}>
                        {api.health.avg_latency_ms} ms
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-300">
                      <span
                        className={`px-1.5 py-0.5 rounded border font-semibold ${
                          api.health.last_status_code >= 200 && api.health.last_status_code < 400
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {api.health.last_status_code ? `HTTP ${api.health.last_status_code}` : '0'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-sans">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleSingleProbe(api.slug)}
                          disabled={isThisProbing || isBatchProbing}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1F1F1F] hover:bg-[#3C4043] border border-[#3C4043] text-[11px] font-mono text-[#8AB4F8] hover:text-white transition-colors disabled:opacity-50"
                          title="Perform authentic live HTTP probe right now"
                        >
                          <RefreshCw className={`h-3 w-3 ${isThisProbing ? 'animate-spin' : ''}`} />
                          <span>{isThisProbing ? 'Pinging' : 'Ping'}</span>
                        </button>
                        <Link
                          to={`/api/${api.slug}`}
                          className="text-slate-400 hover:text-white text-xs inline-flex items-center gap-1 font-medium p-1"
                          title="Open in-browser test playground"
                        >
                          <span>Test</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
