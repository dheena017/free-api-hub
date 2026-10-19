import React, { useState, useMemo } from 'react';
import {
  Globe,
  RotateCw,
  ExternalLink,
  Copy,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  Code2,
  Eye,
  Lock,
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
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Extract metadata from HTML
  const metadata = useMemo(() => {
    if (!html) return null;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const generatorMatch = html.match(/<meta\s+[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i);
    const ogImageMatch =
      html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);

    const charCount = html.length;
    const kbSize = (charCount / 1024).toFixed(1);

    return {
      title: titleMatch ? titleMatch[1].trim() : 'Web Document',
      description: descMatch ? descMatch[1].trim() : null,
      generator: generatorMatch ? generatorMatch[1].trim() : null,
      ogImage: ogImageMatch ? ogImageMatch[1].trim() : null,
      sizeKb: kbSize
    };
  }, [html]);

  // Inject base href and target="_blank" so relative stylesheets/assets resolve and links open externally
  const processedHtml = useMemo(() => {
    if (!html) return '';
    let enriched = html;

    // Ensure links open in new tab so they don't break the sandbox iframe
    if (!enriched.includes('<base')) {
      const baseTag = `<base href="${url}" target="_blank">`;
      if (/<head[^>]*>/i.test(enriched)) {
        enriched = enriched.replace(/<head[^>]*>/i, `$&${baseTag}`);
      } else {
        enriched = `${baseTag}${enriched}`;
      }
    }

    return enriched;
  }, [html, url]);

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleOpenExternal = () => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      try {
        const blob = new Blob([processedHtml], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      } catch {
        // fallback
      }
    }
  };

  const getContainerWidth = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'w-[375px] max-w-full';
      case 'tablet':
        return 'w-[768px] max-w-full';
      default:
        return 'w-full';
    }
  };

  if (!html || html.trim() === '') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 font-sans">
        <div className="p-3 rounded-2xl bg-[#28292A] border border-[#3C4043] text-[#8AB4F8]">
          <Globe className="h-8 w-8 stroke-[1.5]" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">No HTML Payload to Preview</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          Execute a request against a web or documentation endpoint that returns HTML content to see the live rendered preview.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2.5 font-sans">
      {/* Top Browser Chrome Bar */}
      <div className="bg-[#28292A] p-2.5 rounded-xl border border-[#3C4043] flex flex-wrap items-center justify-between gap-2.5 shadow-md">
        {/* Left: Simulated Address Bar */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[240px] bg-[#1F1F1F] px-2.5 py-1.5 rounded-lg border border-[#3C4043]">
          <Lock className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[11px] font-mono text-slate-300 truncate select-all flex-1" title={url}>
            {url}
          </span>
          <button
            onClick={handleCopyUrl}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            title="Copy Endpoint URL"
          >
            {copiedUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-slate-400 hover:text-[#8AB4F8] p-0.5 rounded transition-colors"
            title="Reload Preview Frame"
          >
            <RotateCw className="h-3 w-3" />
          </button>
        </div>

        {/* Center: Device Viewport Switcher (Active only in preview mode) */}
        {viewMode === 'preview' && (
          <div className="flex items-center bg-[#1F1F1F] p-0.5 rounded-lg border border-[#3C4043]">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                deviceMode === 'desktop'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop Viewport (100%)"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">Desktop</span>
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                deviceMode === 'tablet'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet Viewport (768px)"
            >
              <Tablet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">768px</span>
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                deviceMode === 'mobile'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile Viewport (375px)"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">375px</span>
            </button>
          </div>
        )}

        {/* Right: View Mode & Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#1F1F1F] p-0.5 rounded-lg border border-[#3C4043]">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'preview'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Rendered Web Page"
            >
              <Eye className="h-3 w-3" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'source'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Raw HTML Source"
            >
              <Code2 className="h-3 w-3" />
              <span>Source</span>
            </button>
          </div>

          <button
            onClick={handleCopyHtml}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-slate-300 hover:text-white text-[11px] font-medium border border-[#3C4043] transition-colors"
            title="Copy Raw HTML markup"
          >
            {copiedHtml ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span className="hidden sm:inline">{copiedHtml ? 'Copied' : 'HTML'}</span>
          </button>

          <button
            onClick={handleOpenExternal}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8AB4F8]/10 hover:bg-[#8AB4F8]/20 text-[#8AB4F8] hover:text-white text-[11px] font-medium border border-[#8AB4F8]/30 transition-colors"
            title="Open in external browser window"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">Open Tab</span>
          </button>
        </div>
      </div>

      {/* Metadata Pill Banner */}
      {metadata && (
        <div className="bg-[#1F1F1F] px-3 py-1.5 rounded-lg border border-[#3C4043] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#8AB4F8] flex-shrink-0" />
              {metadata.title}
            </span>
            {metadata.generator && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#28292A] border border-[#3C4043] text-slate-400">
                {metadata.generator}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-[10px] font-mono">
            <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
              HTTP {statusCode}
            </span>
            {latencyMs !== undefined && (
              <span className="text-slate-400">{latencyMs} ms</span>
            )}
            <span className="text-slate-400">{metadata.sizeKb} KB</span>
            <span className="text-slate-500 hidden md:inline">Sandboxed IFrame</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-[460px] bg-[#141414] rounded-xl border border-[#3C4043] overflow-hidden flex flex-col items-center justify-center relative">
        {viewMode === 'preview' ? (
          <div
            className={`h-full transition-all duration-300 flex flex-col ${getContainerWidth()} ${
              deviceMode !== 'desktop'
                ? 'my-3 shadow-2xl rounded-2xl border-2 border-[#3C4043] overflow-hidden bg-white'
                : 'w-full'
            }`}
          >
            {/* Simulated Device Header Notch for Tablet / Mobile */}
            {deviceMode !== 'desktop' && (
              <div className="bg-[#28292A] px-3 py-1 border-b border-[#3C4043] flex items-center justify-between text-[10px] text-slate-400 font-mono select-none">
                <span className="capitalize">{deviceMode} Preview</span>
                <span>{deviceMode === 'mobile' ? '375 × 667' : '768 × 1024'}</span>
              </div>
            )}

            <iframe
              key={refreshKey}
              title={metadata?.title || 'Web Page Preview'}
              srcDoc={processedHtml}
              sandbox="allow-scripts allow-forms allow-popups"
              className="w-full flex-1 border-none bg-white min-h-[440px]"
            />
          </div>
        ) : (
          /* HTML Source View */
          <div className="w-full h-full p-4 overflow-auto font-mono text-xs bg-[#1F1F1F]">
            <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed selection:bg-[#8AB4F8] selection:text-[#1F1F1F]">
              {html}
            </pre>
          </div>
        )}
      </div>

      {/* Bottom Tip */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-0.5">
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          <span>Rendered inside a secure sandbox with injected base URI for accurate style resolution.</span>
        </span>
        <button
          onClick={handleOpenExternal}
          className="text-[#8AB4F8] hover:underline flex items-center gap-0.5"
        >
          <span>Open raw page</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
};
