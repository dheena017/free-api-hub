import React, { useState } from 'react';
import { MediaItem } from '../../utils/mediaExtractor';
import {
  Image as ImageIcon,
  Video,
  Music,
  ExternalLink,
  Copy,
  Check,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Maximize2,
  Sparkles,
  Film
} from 'lucide-react';

interface MediaPreviewViewerProps {
  mediaItems: MediaItem[];
  onLoadSampleEndpoint?: (url: string, method?: string) => void;
}

const SAMPLE_MEDIA_APIS = [
  {
    name: 'Dog CEO API',
    description: 'Returns random dog photo URLs',
    type: 'Image',
    url: 'https://dog.ceo/api/breeds/image/random',
    method: 'GET'
  },
  {
    name: 'The Cat API',
    description: 'High-res feline images and metadata',
    type: 'Image',
    url: 'https://api.thecatapi.com/v1/images/search',
    method: 'GET'
  },
  {
    name: 'PokeAPI (Sprites)',
    description: 'Pikachu official artwork and sprite GIFs',
    type: 'Image',
    url: 'https://pokeapi.co/api/v2/pokemon/pikachu',
    method: 'GET'
  },
  {
    name: 'Random Fox API',
    description: 'Floof photos and image links',
    type: 'Image',
    url: 'https://randomfox.ca/floof/',
    method: 'GET'
  },
  {
    name: 'Rick & Morty',
    description: 'Character avatars and episode art',
    type: 'Image',
    url: 'https://rickandmortyapi.com/api/character/1',
    method: 'GET'
  },
  {
    name: 'Sample MP4 Stream',
    description: 'Big Buck Bunny open video source',
    type: 'Video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    method: 'GET'
  }
];

export const MediaPreviewViewer: React.FC<MediaPreviewViewerProps> = ({
  mediaItems,
  onLoadSampleEndpoint
}) => {
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [activeLightbox, setActiveLightbox] = useState<MediaItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const images = mediaItems.filter((m) => m.type === 'image');
  const videos = mediaItems.filter((m) => m.type === 'video');
  const audios = mediaItems.filter((m) => m.type === 'audio');

  const filteredItems = mediaItems.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const handleCopyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (item: MediaItem) => {
    try {
      const response = await fetch(item.url, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const filename = item.url.split('/').pop()?.split('?')[0] || `media-${Date.now()}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const openLightbox = (item: MediaItem) => {
    setActiveLightbox(item);
    setZoomLevel(1);
    setRotation(0);
  };

  const closeLightbox = () => {
    setActiveLightbox(null);
    setZoomLevel(1);
    setRotation(0);
  };

  if (mediaItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-2xl bg-surface border border-border text-accent">
          <Film className="h-8 w-8 stroke-[1.5]" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h4 className="text-sm font-semibold text-text-base">No Media URLs Detected</h4>
          <p className="text-xs text-text-muted leading-relaxed">
            This API response contains alphanumeric data or objects without image/video file links.
          </p>
        </div>

        {onLoadSampleEndpoint && (
          <div className="w-full max-w-md bg-surface p-4 rounded-xl border border-border space-y-3 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Test Live Media APIs in Playground:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_MEDIA_APIS.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => onLoadSampleEndpoint(sample.url, sample.method)}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border transition-colors text-left group"
                >
                  <div className="mt-0.5 p-1 rounded bg-surface text-text-muted group-hover:text-accent transition-colors">
                    {sample.type === 'Video' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-text-base group-hover:text-accent truncate">
                      {sample.name}
                    </div>
                    <div className="text-[10px] text-text-muted truncate">
                      {sample.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* Category Sub-tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              filter === 'all'
                ? 'bg-accent text-background font-bold shadow-sm'
                : 'text-text-muted hover:text-text-base hover:bg-surface-hover'
            }`}
          >
            All Media ({mediaItems.length})
          </button>
          {images.length > 0 && (
            <button
              onClick={() => setFilter('image')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === 'image'
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-base hover:bg-surface-hover'
              }`}
            >
              <ImageIcon className="h-3 w-3" />
              <span>Images ({images.length})</span>
            </button>
          )}
          {videos.length > 0 && (
            <button
              onClick={() => setFilter('video')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === 'video'
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-base hover:bg-surface-hover'
              }`}
            >
              <Video className="h-3 w-3" />
              <span>Videos ({videos.length})</span>
            </button>
          )}
          {audios.length > 0 && (
            <button
              onClick={() => setFilter('audio')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === 'audio'
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-base hover:bg-surface-hover'
              }`}
            >
              <Music className="h-3 w-3" />
              <span>Audio ({audios.length})</span>
            </button>
          )}
        </div>

        <span className="text-[10px] text-text-muted font-mono">
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-surface rounded-xl border border-border overflow-hidden flex flex-col group hover:border-border-light transition-colors"
            >
              {/* Media Visual Container */}
              <div className="relative aspect-video bg-surface-elevated border-b border-border flex items-center justify-center overflow-hidden">
                {item.type === 'image' && (
                  <>
                    <img
                      src={item.url}
                      alt={item.title}
                      className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105 cursor-pointer"
                      onClick={() => openLightbox(item)}
                      loading="lazy"
                    />
                    <button
                      onClick={() => openLightbox(item)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface/80 hover:bg-surface-hover text-text-base border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Enlarge preview"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}

                {item.type === 'video' && (
                  item.embedUrl ? (
                    <iframe
                      src={item.embedUrl}
                      title={item.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={item.url}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  )
                )}

                {item.type === 'audio' && (
                  <div className="w-full px-4 flex flex-col items-center gap-2">
                    <Music className="h-8 w-8 text-accent" />
                    <audio src={item.url} controls className="w-full h-8" />
                  </div>
                )}
              </div>

              {/* Card Meta and Actions */}
              <div className="p-2.5 bg-surface space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/30 truncate">
                    {item.keyPath}
                  </span>
                  {item.extension && (
                    <span className="text-[9px] font-mono text-text-muted uppercase bg-surface-elevated px-1.5 py-0.5 rounded border border-border">
                      {item.extension}
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-text-muted truncate" title={item.url}>
                  {item.url}
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyUrl(item)}
                      className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-base px-2 py-1 rounded bg-surface-elevated hover:bg-surface-hover border border-border transition-colors"
                      title="Copy media URL"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3 w-3 text-healthy" />
                          <span className="text-healthy">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDownload(item)}
                      className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-base px-2 py-1 rounded bg-surface-elevated hover:bg-surface-hover border border-border transition-colors"
                      title="Download file"
                    >
                      <Download className="h-3 w-3" />
                      <span>Save</span>
                    </button>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-accent hover:opacity-80 transition-colors"
                    title="Open original asset in new browser tab"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal for High-Res Inspection */}
      {activeLightbox && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-150">
          {/* Lightbox Toolbar */}
          <div className="flex items-center justify-between pb-3 border-b border-border text-text-base">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-text-base">
                {activeLightbox.title} ({activeLightbox.keyPath})
              </span>
              <span className="text-[10px] font-mono text-accent bg-surface border border-border px-2 py-0.5 rounded">
                Zoom: {Math.round(zoomLevel * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 4))}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-base border border-border transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-base border border-border transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-base border border-border transition-colors"
                title="Rotate 90 degrees"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleCopyUrl(activeLightbox)}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-base border border-border transition-colors"
                title="Copy URL"
              >
                {copiedId === activeLightbox.id ? <Check className="h-4 w-4 text-healthy" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleDownload(activeLightbox)}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-base border border-border transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={closeLightbox}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text-base border border-border transition-colors ml-2"
                title="Close lightbox"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lightbox Center Area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-6 select-none bg-background">
            {activeLightbox.type === 'image' && (
              <img
                src={activeLightbox.url}
                alt={activeLightbox.title}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out'
                }}
                className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg border border-border"
              />
            )}

            {activeLightbox.type === 'video' && (
              activeLightbox.embedUrl ? (
                <iframe
                  src={activeLightbox.embedUrl}
                  title={activeLightbox.title}
                  className="w-full max-w-4xl aspect-video rounded-xl border border-border"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeLightbox.url}
                  controls
                  autoPlay
                  className="max-h-[85vh] max-w-[85vw] rounded-xl border border-border"
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
