import React, { useState, useId } from 'react';
import { HealthObservation, HealthStatus } from '../../types/api';
import { Clock, RefreshCw, TrendingDown, TrendingUp, Minus } from 'lucide-react';

export interface LiveLatencySparklineProps {
  observations: HealthObservation[];
  currentLatency: number;
  uptimePercent?: number | null;
  status: HealthStatus;
  lastChecked?: string | null;
  isProbing: boolean;
  onProbeTrigger: () => void;
}

export function formatDateTime(isoString?: string | null): { dateStr: string; timeStr: string; fullStr: string } {
  if (!isoString) {
    return { dateStr: 'Awaiting check', timeStr: '--:--', fullStr: 'Awaiting scheduled check' };
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { dateStr: 'Recently', timeStr: '--:--', fullStr: 'Recently' };
    }
    const dateStr = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    return {
      dateStr,
      timeStr,
      fullStr: `${dateStr} • ${timeStr}`
    };
  } catch {
    return { dateStr: 'Recently', timeStr: '--:--', fullStr: 'Recently' };
  }
}

export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return 'awaiting check';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 45) return 'just now';
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

export const LiveLatencySparkline: React.FC<LiveLatencySparklineProps> = ({
  observations,
  currentLatency,
  uptimePercent,
  status,
  lastChecked,
  isProbing,
  onProbeTrigger
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId();

  // Ensure we have a valid series of points
  const points = observations.length > 0
    ? observations
    : [
        {
          timestamp: lastChecked || new Date().toISOString(),
          status,
          status_code: 200,
          latency_ms: currentLatency || 120,
          message: 'Initial probe'
        }
      ];

  const latencies = points.map((p) => p.latency_ms);
  const minLat = Math.min(...latencies);
  const maxLat = Math.max(...latencies);
  const avgLat = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const range = Math.max(25, maxLat - minLat);

  // SVG dimensions
  const svgWidth = 240;
  const svgHeight = 44;
  const padY = 6;
  const effectiveHeight = svgHeight - padY * 2;

  // Compute SVG coordinate points
  const coords = points.map((p, idx) => {
    const x = points.length === 1 ? svgWidth / 2 : (idx / (points.length - 1)) * svgWidth;
    const normalizedY = (p.latency_ms - minLat) / range;
    const y = svgHeight - padY - normalizedY * effectiveHeight;
    return { x, y, point: p };
  });

  // Build smooth cubic bezier path
  let pathD = '';
  if (coords.length === 1) {
    pathD = `M 0,${coords[0].y} L ${svgWidth},${coords[0].y}`;
  } else {
    pathD = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
  }

  const areaD = `${pathD} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

  // Active point for hover or latest
  const activeCoord = hoveredIndex !== null && coords[hoveredIndex]
    ? coords[hoveredIndex]
    : coords[coords.length - 1];

  const activePoint = activeCoord.point;
  const activeDateTime = formatDateTime(activePoint.timestamp);

  // Latency delta comparing current to average
  const delta = currentLatency - avgLat;
  const isHealthy = status === 'healthy';
  const isDegraded = status === 'degraded';

  const strokeColor = isHealthy ? '#10b981' : isDegraded ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-surface border border-border p-5 rounded-2xl flex flex-col justify-between w-full lg:w-80 flex-shrink-0 transition-all select-none">
      {/* Hero numbers row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-text-base tracking-tight font-mono">
            {uptimePercent != null ? `${uptimePercent}%` : '100%'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Uptime SLA</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-extrabold text-text-base tracking-tight font-mono">
            {hoveredIndex !== null ? `${activePoint.latency_ms}ms` : `${currentLatency || avgLat}ms`}
          </div>
          <div className="text-xs text-text-muted font-medium mt-0.5 flex items-center justify-end gap-1">
            <span>Latency</span>
            {delta < -4 ? (
              <span className="text-[10px] text-emerald-400 font-mono inline-flex items-center" title={`${Math.abs(delta)}ms faster than average`}>
                <TrendingDown className="h-3 w-3" />
                <span>{Math.abs(delta)}ms</span>
              </span>
            ) : delta > 4 ? (
              <span className="text-[10px] text-amber-400 font-mono inline-flex items-center" title={`${delta}ms slower than average`}>
                <TrendingUp className="h-3 w-3" />
                <span>+{delta}ms</span>
              </span>
            ) : (
              <span className="text-[10px] text-text-muted font-mono inline-flex items-center" title="Stable latency">
                <Minus className="h-2.5 w-2.5" />
                <span>stable</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Latency Quick Range Details (Min, Avg, Max) */}
      <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-2 border-t border-border/40 mt-3">
        <span>Min: <strong className="text-text-base">{minLat}ms</strong></span>
        <span>Avg: <strong className="text-text-base">{avgLat}ms</strong></span>
        <span>Max: <strong className="text-text-base">{maxLat}ms</strong></span>
      </div>

      {/* Clean Interactive Sparkline graph with exact hover coordinates */}
      <div className="relative py-2.5">
        <svg
          className="w-full h-10 overflow-visible cursor-crosshair"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Clean line path */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Vertical hover tracking line */}
          {hoveredIndex !== null && (
            <line
              x1={activeCoord.x}
              y1={0}
              x2={activeCoord.x}
              y2={svgHeight}
              stroke="currentColor"
              className="text-text-muted/50"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Active indicator circle */}
          <circle
            cx={activeCoord.x}
            cy={activeCoord.y}
            r="3.5"
            fill={strokeColor}
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Invisible interactive hover slices */}
          {coords.map((c, i) => {
            const sliceWidth = svgWidth / coords.length;
            const sliceX = Math.max(0, c.x - sliceWidth / 2);
            return (
              <rect
                key={i}
                x={sliceX}
                y={0}
                width={sliceWidth}
                height={svgHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            );
          })}
        </svg>

        {/* Clean, high-contrast hover pill showing exact Date and Time */}
        {hoveredIndex !== null && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-surface-elevated border border-border text-[11px] font-mono text-text-base whitespace-nowrap pointer-events-none z-20 flex items-center gap-1.5 shadow-md">
            <span className="font-bold text-accent">{activePoint.latency_ms}ms</span>
            <span className="text-text-muted">•</span>
            <span className="text-text-muted">{activeDateTime.timeStr}</span>
            <span className="text-[10px] text-text-muted/70">({activeDateTime.dateStr})</span>
          </div>
        )}
      </div>

      {/* Date & Time metadata bar */}
      <div className="pt-2.5 border-t border-border/60 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between text-text-muted">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Live status</span>
          </div>

          <button
            type="button"
            onClick={onProbeTrigger}
            disabled={isProbing}
            className="text-text-muted hover:text-accent flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 text-[11px] font-mono"
            title="Click to trigger live probe verification"
          >
            <RefreshCw className={`h-3 w-3 ${isProbing ? 'animate-spin text-accent' : ''}`} />
            <span>{isProbing ? 'Probing...' : formatRelativeTime(lastChecked)}</span>
          </button>
        </div>

        {/* Full Date & Time of last probe check */}
        <div className="flex items-center justify-between text-[10px] text-text-muted font-mono pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-text-muted/70" />
            <span>Checked:</span>
          </span>
          <span className="text-text-base font-medium" title={formatDateTime(lastChecked).fullStr}>
            {formatDateTime(lastChecked).fullStr}
          </span>
        </div>
      </div>
    </div>
  );
};
