import React from 'react';
import { HealthStatus } from '../types/api';

interface LivePingBadgeProps {
  status: HealthStatus;
  uptimePercent?: number;
  showText?: boolean;
  pulse?: boolean;
  label?: string;
}

export const LivePingBadge: React.FC<LivePingBadgeProps> = ({
  status,
  uptimePercent,
  showText = true,
  pulse = true,
  label: customLabel
}) => {
  let ringColor = 'bg-emerald-400';
  let dotColor = 'bg-emerald-500';
  let textColor = 'text-emerald-400';
  let label = customLabel || 'Operational';

  if (status === 'degraded') {
    ringColor = 'bg-amber-400';
    dotColor = 'bg-amber-500';
    textColor = 'text-amber-400';
    label = customLabel || 'Degraded';
  } else if (status === 'offline') {
    ringColor = 'bg-rose-400';
    dotColor = 'bg-rose-500';
    textColor = 'text-rose-400';
    label = customLabel || 'Offline';
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span className={`inline-block rounded-full h-2 w-2 ${dotColor}`} />
      </span>
      {showText && (
        <span className={`text-xs font-medium font-mono ${textColor}`}>
          {uptimePercent !== undefined ? `${uptimePercent}% Uptime` : label}
        </span>
      )}
    </div>
  );
};
