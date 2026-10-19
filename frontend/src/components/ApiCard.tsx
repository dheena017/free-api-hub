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
  Zap
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
    const base = (api.base_url || '').replace(/\/+$/, '');
    const ep = api.endpoint || (api.endpoints?.[0]?.path) || '';
    const formattedEp = ep ? (ep.startsWith('/') ? ep : `/${ep}`) : '';
    const endpointUrl = `${base}${formattedEp}`;
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
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
        Free Key
      </span>
    );
  };

  const getLatencyColor = (ms?: number | null) => {
    if (!ms) return 'text-text-muted';
    if (ms <= 150) return 'text-emerald-400';
    if (ms <= 300) return 'text-accent';
    return 'text-amber-400';
  };

  if (viewMode === 'compact') {
    return (
      <div className="bg-surface hover:bg-surface-elevated border border-border hover:border-border-light rounded-2xl px-4 py-3 flex items-center justify-between gap-4 transition-all group shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <button
            onClick={handleToggleBookmark}
            title={bookmarked ? 'Remove from Saved' : 'Save API'}
            className="p-1 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-amber-400 cursor-pointer"
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
                className="font-bold text-sm text-text-base group-hover:text-accent transition-colors truncate"
              >
                {api.name}
              </Link>
              <span className="text-[10px] uppercase font-mono text-text-muted px-1.5 py-0.5 rounded-md bg-surface-elevated border border-border">
                {api.category}
              </span>
              {getAuthBadge()}
            </div>
            <p className="text-xs text-text-muted truncate mt-0.5">
              {api.description}
            </p>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-text-muted">
            <LivePingBadge
              status={api.health.status}
              uptimePercent={api.health.uptime_percent ?? undefined}
              pulse={false}
            />
            {api.health.avg_latency_ms != null && (
              <>
                <span>•</span>
                <span className={`font-semibold ${getLatencyColor(api.health.avg_latency_ms)}`}>
                  {api.health.avg_latency_ms}ms
                </span>
              </>
            )}
          </div>

          <button
            onClick={handleCopyEndpoint}
            title="Copy sample endpoint URL"
            className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text-base border border-border transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          <Link
            to={`/api/${api.slug}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border hover:border-accent text-text-base hover:text-accent font-medium text-xs transition-colors cursor-pointer"
          >
            <span>Test</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface hover:bg-surface-elevated border border-border hover:border-border-light rounded-2xl p-5 flex flex-col justify-between transition-all duration-150 group relative h-full shadow-sm hover:shadow-md">
      <div>
        {/* Top meta tags */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-mono px-2 py-0.5 rounded-md bg-surface-elevated border border-border">
              {api.category}
            </span>
            {getAuthBadge()}
            {api.cors_supported && (
              <span className="text-[10px] text-text-muted font-mono px-2 py-0.5 rounded-md bg-surface-elevated border border-border" title="CORS Enabled - callable directly from browser">
                CORS
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleBookmark}
              title={bookmarked ? 'Saved to bookmarks' : 'Add to bookmarks'}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-amber-400 transition-colors cursor-pointer"
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
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-base transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Name / Title */}
        <Link to={`/api/${api.slug}`} className="block">
          <h3 className="font-bold text-base text-text-base group-hover:text-accent transition-colors flex items-center justify-between">
            <span className="line-clamp-1">{api.name}</span>
            <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent transition-transform group-hover:translate-x-1 flex-shrink-0 ml-2" />
          </h3>
        </Link>

        {/* Description */}
        <p
          className="mt-2 text-xs text-text-muted group-hover:text-text-base line-clamp-2 leading-relaxed min-h-[2.5rem]"
          title={api.description}
        >
          {api.description}
        </p>

        {/* Tags */}
        {api.tags && api.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {api.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono text-text-muted bg-surface-elevated px-2 py-0.5 rounded-md border border-border"
              >
                #{tag}
              </span>
            ))}
            {api.tags.length > 3 && (
              <span className="text-[10px] font-mono text-text-muted self-center">
                +{api.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-text-muted font-mono flex-wrap">
          <LivePingBadge
            status={api.health.status}
            uptimePercent={api.health.uptime_percent ?? undefined}
            pulse={false}
          />
          {api.health.avg_latency_ms != null && (
            <>
              <span className="text-border">•</span>
              <span className={`font-semibold ${getLatencyColor(api.health.avg_latency_ms)}`}>
                {api.health.avg_latency_ms}ms
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {api.documentation_url && (
            <a
              href={api.documentation_url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-surface-hover transition-colors cursor-pointer"
              title="Official Documentation"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Link
            to={`/api/${api.slug}`}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border hover:border-accent text-xs font-semibold text-text-base hover:text-accent transition-colors cursor-pointer"
          >
            <span>Playground</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
