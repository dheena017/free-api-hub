import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiItem } from '../types/api';
import { LivePingBadge } from './LivePingBadge';
import { useBookmarks } from '../utils/useBookmarks';
import {
  ArrowRight,
  Star,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Globe,
  Lock
} from 'lucide-react';

interface ApiCardProps {
  api: ApiItem;
  viewMode?: 'grid' | 'compact';
}

export const ApiCard: React.FC<ApiCardProps> = ({ api, viewMode = 'grid' }) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(api.slug);
  const [copied, setCopied] = useState(false);

  const handleCopyEndpoint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const endpointUrl = `${api.base_url}${api.sample_endpoint}`;
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(api.slug);
  };

  const getAuthBadge = () => {
    if (api.auth_type === 'none') {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <Zap className="h-2.5 w-2.5" />
          <span>No Key</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1F1F1F] text-slate-300 border border-[#3C4043]">
        Free Key
      </span>
    );
  };

  if (viewMode === 'compact') {
    return (
      <div className="bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] hover:border-[#4D5156] rounded-xl px-4 py-3 flex items-center justify-between gap-4 transition-all group">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <button
            onClick={handleToggleBookmark}
            title={bookmarked ? 'Remove from Saved' : 'Save API'}
            className="p-1 rounded-lg hover:bg-[#3C4043] transition-colors text-slate-400 hover:text-amber-400"
          >
            <Star
              className={`h-4 w-4 ${
                bookmarked ? 'text-amber-400 fill-amber-400' : ''
              }`}
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/api/${api.slug}`}
                className="font-bold text-sm text-white group-hover:text-accent transition-colors truncate"
              >
                {api.name}
              </Link>
              <span className="text-[10px] uppercase font-mono text-slate-400 px-1.5 py-0.2 rounded bg-[#1F1F1F] border border-[#3C4043]">
                {api.category}
              </span>
              {getAuthBadge()}
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {api.short_description || api.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 text-xs">
          <div className="hidden sm:flex items-center gap-2 font-mono text-slate-400">
            <LivePingBadge
              status={api.health.status}
              uptimePercent={api.health.uptime_percent}
              pulse={api.health.status === 'healthy'}
            />
            <span className="text-slate-500">•</span>
            <span>{api.health.avg_latency_ms}ms</span>
          </div>

          <button
            onClick={handleCopyEndpoint}
            title="Copy sample endpoint URL"
            className="p-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#3C4043] text-slate-300 hover:text-white border border-[#3C4043] transition-colors"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          <Link
            to={`/api/${api.slug}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8AB4F8]/10 hover:bg-[#8AB4F8]/20 border border-[#8AB4F8]/30 text-[#8AB4F8] hover:text-white font-medium text-xs transition-colors"
          >
            <span>Test</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#28292A] hover:bg-[#303134] border border-[#3C4043] hover:border-[#5F6368] rounded-2xl p-5 flex flex-col justify-between transition-all group relative shadow-sm hover:shadow-md">
      <div>
        {/* Top meta tags */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-mono px-2 py-0.5 rounded-md bg-[#1F1F1F] border border-[#3C4043]">
              {api.category}
            </span>
            {getAuthBadge()}
            {api.cors_supported && (
              <span className="text-[10px] text-sky-400 font-mono px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20" title="CORS Enabled - callable directly from browser">
                CORS
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleBookmark}
              title={bookmarked ? 'Saved to bookmarks' : 'Add to bookmarks'}
              className="p-1.5 rounded-lg hover:bg-[#3C4043] text-slate-400 hover:text-amber-400 transition-colors"
            >
              <Star
                className={`h-4 w-4 ${
                  bookmarked ? 'text-amber-400 fill-amber-400' : ''
                }`}
              />
            </button>
            <button
              onClick={handleCopyEndpoint}
              title="Copy endpoint URL"
              className="p-1.5 rounded-lg hover:bg-[#3C4043] text-slate-400 hover:text-white transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Title */}
        <Link to={`/api/${api.slug}`} className="block">
          <h3 className="text-base font-bold text-white group-hover:text-accent transition-colors flex items-center justify-between">
            <span>{api.name}</span>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
          </h3>
        </Link>

        {/* Short Description */}
        <p
          className="mt-2 text-xs text-slate-300 line-clamp-2 leading-relaxed"
          title={api.short_description || api.description}
        >
          {api.short_description || api.description}
        </p>

        {/* Tags */}
        {api.tags && api.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {api.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono text-slate-400 bg-[#1F1F1F] px-1.5 py-0.5 rounded border border-[#3C4043]/60"
              >
                #{tag}
              </span>
            ))}
            {api.tags.length > 3 && (
              <span className="text-[10px] font-mono text-slate-500 self-center">
                +{api.tags.length - 3}
              </span>
            )}
          </div>
        )}
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
          <span className="text-slate-300">{api.health.avg_latency_ms}ms</span>
        </div>

        <div className="flex items-center gap-2">
          {api.documentation_url && (
            <a
              href={api.documentation_url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#3C4043] transition-colors"
              title="Official Documentation"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Link
            to={`/api/${api.slug}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8AB4F8]/10 hover:bg-[#8AB4F8]/20 border border-[#8AB4F8]/30 text-xs font-semibold text-accent hover:text-white transition-colors"
          >
            <span>Playground</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
