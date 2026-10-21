import React, { useState, useMemo } from 'react';
import {
  FileCode,
  RotateCw,
  ExternalLink,
  Copy,
  Check,
  Download,
  Code2,
  Eye,
  Sun,
  Moon,
  Sparkles,
  Info
} from 'lucide-react';

interface HtmlPreviewViewerProps {
  html: string;
  url: string;
  statusCode?: number;
  latencyMs?: number;
}

export const HtmlPreviewViewer: React.FC<HtmlPreviewViewerProps> = ({
  html,
  url,
  statusCode = 200,
  latencyMs
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark'>('dark');
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Check if payload is a full HTML document or snippet
  const isSnippet = useMemo(() => {
    if (!html) return false;
    const lower = html.trim().toLowerCase();
    return !lower.startsWith('<!doctype') && !lower.startsWith('<html');
  }, [html]);

  // Extract metadata if available
  const metadata = useMemo(() => {
    if (!html) return null;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const charCount = html.length;
    const kbSize = (charCount / 1024).toFixed(1);

    return {
      title: titleMatch ? titleMatch[1].trim() : isSnippet ? 'HTML Snippet / Markup' : 'Rendered HTML Output',
      sizeKb: kbSize,
      charCount
    };
  }, [html, isSnippet]);

  // Inject base href and minimal snippet styling if needed
  const processedHtml = useMemo(() => {
    if (!html) return '';
    let enriched = html;

    // Inject base href so relative assets resolve
    if (!enriched.includes('<base') && url) {
      const baseTag = `<base href="${url}" target="_blank">`;
      if (/<head[^>]*>/i.test(enriched)) {
        enriched = enriched.replace(/<head[^>]*>/i, `$&${baseTag}`);
      } else if (!isSnippet) {
        enriched = `${baseTag}${enriched}`;
      }
    }

    // If it's a snippet, wrap with baseline readable styling for the selected canvas theme
    if (isSnippet) {
      const bgStyle = canvasTheme === 'dark' ? 'background-color: #0d1117; color: #c9d1d9;' : 'background-color: #ffffff; color: #1f2937;';
      const wrapperStyle = `
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            margin: 0;
            line-height: 1.5;
            ${bgStyle}
          }
          img, svg, video { max-width: 100%; height: auto; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid rgba(128,128,128,0.25); padding: 8px; }
          a { color: #3b82f6; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      `;
      enriched = `<!DOCTYPE html><html><head><meta charset="utf-8">${url ? `<base href="${url}" target="_blank">` : ''}${wrapperStyle}</head><body>${enriched}</body></html>`;
    }

    return enriched;
  }, [html, url, isSnippet, canvasTheme]);

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleDownloadHtml = () => {
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `api-html-output-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // fallback
    }
  };

  const handleOpenExternal = () => {
    try {
      const blob = new Blob([processedHtml], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (!html || html.trim() === '') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 font-sans">
        <div className="p-3.5 rounded-2xl bg-surface border border-border text-accent">
          <FileCode className="h-8 w-8 stroke-[1.5]" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h4 className="text-sm font-semibold text-text-base">No HTML Output Detected</h4>
          <p className="text-xs text-text-muted leading-relaxed">
            This API endpoint returned alphanumeric data or JSON without HTML markup. When an endpoint returns HTML (such as rendered templates, widgets, or formatted reports), it will be visualized here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2.5 font-sans">
      {/* Top API Output Header Bar */}
      <div className="bg-surface p-2.5 rounded-xl border border-border flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
        {/* Left: API HTML Output Details & Badges */}
        <div className="flex items-center gap-2 flex-wrap min-w-[200px]">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
            <FileCode className="h-3.5 w-3.5" />
            <span>API HTML Output</span>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated border border-border text-text-muted">
            {isSnippet ? 'HTML Snippet' : 'Full Document'}
          </span>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-healthy/10 border border-healthy/25 text-healthy font-semibold">
            HTTP {statusCode}
          </span>

          {latencyMs !== undefined && (
            <span className="text-[10px] font-mono text-text-muted">
              {latencyMs}ms
            </span>
          )}

          {metadata?.sizeKb && (
            <span className="text-[10px] font-mono text-text-muted hidden sm:inline">
              {metadata.sizeKb} KB
            </span>
          )}
        </div>

        {/* Center: View Switcher & Canvas Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-base'
              }`}
              title="Rendered HTML Output"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Rendered</span>
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'source'
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-base'
              }`}
              title="Raw HTML Source Markup"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Source</span>
            </button>
          </div>

          {/* Canvas Background Toggle (Active in preview mode) */}
          {viewMode === 'preview' && (
            <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-border">
              <button
                onClick={() => setCanvasTheme('light')}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  canvasTheme === 'light'
                    ? 'bg-accent text-background font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-base'
                }`}
                title="Light Background Canvas"
              >
                <Sun className="h-3 w-3" />
                <span className="hidden md:inline text-[10px]">Light</span>
              </button>
              <button
                onClick={() => setCanvasTheme('dark')}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  canvasTheme === 'dark'
                    ? 'bg-accent text-background font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-base'
                }`}
                title="Dark Background Canvas"
              >
                <Moon className="h-3 w-3" />
                <span className="hidden md:inline text-[10px]">Dark</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-muted hover:text-accent border border-border transition-colors cursor-pointer"
            title="Reload Render Frame"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyHtml}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-muted hover:text-text-base text-xs font-medium border border-border transition-colors cursor-pointer"
            title="Copy raw HTML response markup"
          >
            {copiedHtml ? <Check className="h-3.5 w-3.5 text-healthy" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedHtml ? 'Copied' : 'Copy HTML'}</span>
          </button>

          <button
            onClick={handleDownloadHtml}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-muted hover:text-text-base text-xs font-medium border border-border transition-colors cursor-pointer"
            title="Download HTML file"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={handleOpenExternal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent font-medium text-xs border border-accent/30 transition-colors cursor-pointer"
            title="Open HTML in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Tab</span>
          </button>
        </div>
      </div>

      {/* Main Content Viewer Area */}
      <div className="flex-1 min-h-[460px] bg-surface rounded-xl border border-border overflow-hidden flex flex-col relative">
        {viewMode === 'preview' ? (
          <div
            className={`w-full h-full flex-1 flex flex-col transition-colors duration-200 ${
              canvasTheme === 'dark' ? 'bg-[#0d1117]' : 'bg-white'
            }`}
          >
            <iframe
              key={refreshKey}
              title={metadata?.title || 'API HTML Response'}
              srcDoc={processedHtml}
              sandbox="allow-scripts allow-forms allow-popups allow-modals"
              className="w-full h-full flex-1 border-none min-h-[460px]"
            />
          </div>
        ) : (
          /* HTML Source View */
          <div className="w-full h-full p-4 overflow-auto font-mono text-xs bg-surface-elevated">
            <pre className="text-text-base whitespace-pre-wrap leading-relaxed selection:bg-accent selection:text-background font-mono">
              {html}
            </pre>
          </div>
        )}
      </div>

      {/* Bottom Diagnostics / Info */}
      <div className="flex items-center justify-between text-[11px] text-text-muted px-1 pt-0.5">
        <span className="flex items-center gap-1.5 truncate">
          <Info className="h-3 w-3 text-text-muted flex-shrink-0" />
          <span>Rendered directly from API response payload inside a sandboxed frame.</span>
        </span>
        {metadata?.title && (
          <span className="hidden md:inline font-mono text-[10px] truncate max-w-[280px]">
            {metadata.title}
          </span>
        )}
      </div>
    </div>
  );
};
