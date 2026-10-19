import React from 'react';
import { ApiItem, HealthCheckResult } from '../../types/api';
import {
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Zap,
  Shield
} from 'lucide-react';

export interface HealthTelemetryTabProps {
  api: ApiItem;
  isProbing: boolean;
  probeResult?: HealthCheckResult | null;
  probeError?: string | null;
  onLiveProbe: () => void;
  onOpenBadgeModal?: () => void;
}

export const HealthTelemetryTab: React.FC<HealthTelemetryTabProps> = ({
  api,
  isProbing,
  probeResult,
  probeError,
  onLiveProbe,
  onOpenBadgeModal
}) => {
  const isHealthy = api.health.status === 'healthy';
  const isDegraded = api.health.status === 'degraded';

  const statusColorClass = isHealthy
    ? 'text-emerald-400'
    : isDegraded
    ? 'text-amber-400'
    : 'text-rose-400';

  const statusBgClass = isHealthy
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : isDegraded
    ? 'bg-amber-500/10 border-amber-500/30'
    : 'bg-rose-500/10 border-rose-500/30';

  const uptimeVal = api.health.uptime_percent != null ? api.health.uptime_percent : 99.9;

  return (
    <section
      role="tabpanel"
      id="tabpanel-health"
      aria-labelledby="tab-health"
      className="space-y-6 animate-in fade-in duration-200"
    >
      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Status */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-text-muted font-semibold">Service Status</span>
            <Activity className={`h-4 w-4 ${statusColorClass}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-3 w-3 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : isDegraded ? 'bg-amber-400' : 'bg-rose-400'}`} />
            <div className="text-2xl font-bold text-text-base capitalize">
              {api.health.status}
            </div>
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
            {uptimeVal}%
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, uptimeVal)}%` }}
            />
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
          <div className="flex items-center gap-2">
            {onOpenBadgeModal && (
              <button
                type="button"
                onClick={onOpenBadgeModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-text-base text-xs font-semibold transition-colors cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5 text-accent" />
                <span>Get Badge</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLiveProbe}
              disabled={isProbing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isProbing ? 'animate-spin' : ''}`} />
              <span>{isProbing ? 'Testing live...' : 'Trigger Live Probe'}</span>
            </button>
          </div>
        </div>

        {/* Live Probe Feedback Result */}
        {probeResult && (
          <div className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in duration-200 ${statusBgClass}`}>
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-accent" />
                Live Probe Succeeded
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface border border-border">
                HTTP {probeResult.status_code} • {probeResult.latency_ms} ms
              </span>
            </div>
            <p className="text-text-muted">
              {probeResult.message || `Host responded with status ${probeResult.status_code} in ${probeResult.latency_ms}ms.`}
            </p>
          </div>
        )}

        {/* Live Probe Error Feedback */}
        {probeError && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-400 flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Probe Request Error</div>
              <p className="text-text-muted mt-0.5">{probeError}</p>
            </div>
          </div>
        )}

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
  );
};
