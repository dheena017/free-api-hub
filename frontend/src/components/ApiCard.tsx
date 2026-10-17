import React from 'react';
import { Link } from 'react-router-dom';
import { ApiItem } from '../types/api';
import { LivePingBadge } from './LivePingBadge';
import { ArrowRight } from 'lucide-react';

interface ApiCardProps {
  api: ApiItem;
}

export const ApiCard: React.FC<ApiCardProps> = ({ api }) => {
  const getAuthBadge = () => {
    if (api.auth_type === 'none') {
      return (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          No Key Required
        </span>
      );
    }
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-[#3C4043]">
        Free API Key
      </span>
    );
  };

  return (
    <div className="bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] rounded-2xl p-5 flex flex-col justify-between transition-colors group">
      <div>
        {/* Top meta tags */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono px-2 py-0.5 rounded-md bg-[#1F1F1F] border border-[#3C4043]">
            {api.category}
          </span>
          {getAuthBadge()}
        </div>

        {/* Title */}
        <Link to={`/api/${api.slug}`} className="block">
          <h3 className="text-base font-bold text-white group-hover:text-accent transition-colors">
            {api.name}
          </h3>
        </Link>

        {/* Short Description */}
        <p
          className="mt-2 text-xs text-slate-300 line-clamp-2 leading-relaxed"
          title={api.short_description || api.description}
        >
          {api.short_description || api.description}
        </p>
      </div>

      {/* Footer bar */}
      <div className="mt-5 pt-3 border-t border-[#3C4043] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-mono flex-wrap">
          <LivePingBadge
            status={api.health.status}
            uptimePercent={api.health.uptime_percent}
            pulse={api.health.status === 'healthy'}
          />
          <span className="text-slate-500">•</span>
          <span>{api.health.avg_latency_ms}ms</span>
          {api.health.status !== 'healthy' && (
            <span
              className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                api.health.status === 'offline'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {api.health.status}
            </span>
          )}
        </div>

        <Link
          to={`/api/${api.slug}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-white transition-colors"
        >
          <span>Test</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};
