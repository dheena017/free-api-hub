import React, { useState, useMemo } from 'react';
import { ProxyResponse } from '../../../types/api';
import { HtmlPreviewViewer } from '../../viewers/HtmlPreviewViewer';
import { MediaPreviewViewer } from '../../viewers/MediaPreviewViewer';
import { extractMediaItems } from '../../../utils/mediaExtractor';
import { Image as ImageIcon, FileCode, Zap, Code2, ArrowRight } from 'lucide-react';

export interface PreviewResponseTabProps {
  response: ProxyResponse | null;
  endpointUrl: string;
  isLoading: boolean;
  onRunTest: (url?: string) => void;
  onSwitchToJson?: () => void;
  isUnified?: boolean;
}

export const PreviewResponseTab: React.FC<PreviewResponseTabProps> = ({
  response,
  endpointUrl,
  isLoading,
  onRunTest,
  onSwitchToJson,
  isUnified = true
}) => {
  const [subMode, setSubMode] = useState<'html' | 'media'>('html');
  const [forceRenderHtml, setForceRenderHtml] = useState(false);

  const mediaItems = useMemo(() => {
    if (!response) return [];
    return extractMediaItems(response.data, endpointUrl, response.headers);
  }, [response, endpointUrl]);

  const isHtmlDetected = useMemo(() => {
    if (!response) return false;
    const ct = response.headers?.['content-type'] || response.headers?.['Content-Type'] || '';
    if (typeof ct === 'string' && (ct.toLowerCase().includes('text/html') || ct.toLowerCase().includes('application/xhtml+xml'))) {
      return true;
    }
    if (typeof response.data === 'string') {
      const trimmed = response.data.trim().toLowerCase();
      if (/<(!doctype|html|head|body)[^>]*>/i.test(trimmed)) return true;
      if (/^<(div|p|span|table|ul|ol|h[1-6]|section|article|header|footer|form)[\s>]/i.test(trimmed) && trimmed.includes('</')) {
        return true;
      }
    }
    return false;
  }, [response]);

  const htmlContent = useMemo(() => {
    if (!response?.data) return '';
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data, null, 2);
  }, [response?.data]);

  // If media items exist and no HTML was detected, prefer media mode
  React.useEffect(() => {
    if (!isHtmlDetected && mediaItems.length > 0) {
      setSubMode('media');
    }
  }, [isHtmlDetected, mediaItems.length]);

  return (
    <div
      className={`${
        isUnified
          ? 'flex-1 flex flex-col h-full overflow-hidden'
          : 'bg-surface rounded-2xl flex flex-col min-h-[480px] h-[540px] overflow-hidden shadow-sm transition-colors'
      }`}
    >
      {/* Media / HTML Mode Switcher Bar (only when both media & HTML exist) */}
      {mediaItems.length > 0 && (
        <div className="px-3 sm:px-4 py-2 border-b border-border bg-surface-elevated/30 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center bg-surface-elevated/80 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setSubMode('html')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                subMode === 'html'
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-base'
              }`}
            >
              <FileCode className="h-3 w-3" />
              <span>HTML Sandbox</span>
            </button>

            <button
              type="button"
              onClick={() => setSubMode('media')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                subMode === 'media'
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-base'
              }`}
            >
              <ImageIcon className="h-3 w-3" />
              <span>Media Gallery</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  subMode === 'media'
                    ? 'bg-black/20 text-background'
                    : 'bg-accent/20 text-accent'
                }`}
              >
                {mediaItems.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto font-mono text-xs bg-surface dark:bg-[#131416] text-text-base transition-colors">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            <p className="text-xs font-medium font-sans">Rendering sandboxed view...</p>
          </div>
        ) : response?.data ? (
          subMode === 'media' ? (
            <div className="p-4 h-full">
              <MediaPreviewViewer
                mediaItems={mediaItems}
                onLoadSampleEndpoint={(url) => onRunTest(url)}
              />
            </div>
          ) : isHtmlDetected || forceRenderHtml ? (
            <HtmlPreviewViewer
              html={htmlContent}
              url={endpointUrl}
              statusCode={response.status_code}
              latencyMs={response.latency_ms}
            />
          ) : (
            /* Friendly, smart notification when API returns non-HTML data */
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4 font-sans py-8">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                <Code2 className="h-7 w-7" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <p className="font-bold text-text-base text-base">JSON Response Detected</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  This endpoint returned structured JSON payload data rather than rendered HTML markup.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {onSwitchToJson && (
                  <button
                    type="button"
                    onClick={onSwitchToJson}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-background font-bold text-xs shadow-md shadow-accent/20 cursor-pointer hover:scale-[1.02] transition-all"
                  >
                    <span>Inspect JSON Tree</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setForceRenderHtml(true)}
                  className="px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface text-text-muted hover:text-text-base text-xs font-mono transition-colors cursor-pointer"
                >
                  Render Raw in Sandbox Anyway
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4 font-sans py-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <FileCode className="h-6 w-6" />
            </div>

            <div className="space-y-1 max-w-sm">
              <p className="font-bold text-text-base text-sm">No Preview Available</p>
              <p className="text-xs text-text-muted">
                Run an API request to render HTML documents, preview web markup in a secure sandbox, and inspect extracted images.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onRunTest()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-xs transition-all shadow-md shadow-accent/20 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Send Request</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
