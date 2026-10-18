export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  embedUrl?: string;
  keyPath: string;
  title: string;
  extension?: string;
  metadata?: Record<string, string | number>;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif', '.tiff'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.m4v', '.m3u8'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

const IMAGE_KEY_REGEX = /(image|avatar|poster|thumbnail|photo|picture|banner|flag|icon|logo|sprite|img_url|pic|screenshot|art|cover)/i;
const VIDEO_KEY_REGEX = /(video|mp4|webm|stream|clip|trailer|movie|film|recording|screencast)/i;
const AUDIO_KEY_REGEX = /(audio|sound|song|track|podcast|voice|mp3|preview_url)/i;

function cleanUrl(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '');
}

function getUrlExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot !== -1) {
      return pathname.slice(lastDot);
    }
  } catch {
    const qIndex = url.indexOf('?');
    const path = qIndex !== -1 ? url.slice(0, qIndex).toLowerCase() : url.toLowerCase();
    const lastDot = path.lastIndexOf('.');
    if (lastDot !== -1) {
      return path.slice(lastDot);
    }
  }
  return '';
}

function parseYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    // ignore
  }
  return null;
}

function parseVimeoEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const id = parts[0];
      if (id && /^\d+$/.test(id)) {
        return `https://player.vimeo.com/video/${id}`;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function extractMediaItems(data: unknown): MediaItem[] {
  const items: MediaItem[] = [];
  const visitedUrls = new Set<string>();

  function inspectValue(val: unknown, keyPath: string, parentKey: string = '') {
    if (!val) return;

    if (typeof val === 'string') {
      const str = cleanUrl(val);

      // Check base64 image data URL
      if (str.startsWith('data:image/')) {
        if (!visitedUrls.has(str)) {
          visitedUrls.add(str);
          items.push({
            id: `media-${items.length}`,
            type: 'image',
            url: str,
            keyPath: keyPath || 'root',
            title: parentKey || 'Base64 Image',
            extension: str.slice(5, str.indexOf(';'))
          });
        }
        return;
      }

      // Check URL format
      if (!str.startsWith('http://') && !str.startsWith('https://')) {
        return;
      }

      if (visitedUrls.has(str)) return;

      const ext = getUrlExtension(str);
      const ytEmbed = parseYouTubeEmbed(str);
      const vimeoEmbed = parseVimeoEmbed(str);

      // 1. YouTube / Vimeo Video Embed
      if (ytEmbed) {
        visitedUrls.add(str);
        items.push({
          id: `media-${items.length}`,
          type: 'video',
          url: str,
          embedUrl: ytEmbed,
          keyPath: keyPath || 'root',
          title: parentKey || 'YouTube Video',
          extension: 'YouTube'
        });
        return;
      }

      if (vimeoEmbed) {
        visitedUrls.add(str);
        items.push({
          id: `media-${items.length}`,
          type: 'video',
          url: str,
          embedUrl: vimeoEmbed,
          keyPath: keyPath || 'root',
          title: parentKey || 'Vimeo Video',
          extension: 'Vimeo'
        });
        return;
      }

      // 2. Direct Video Extensions
      if (VIDEO_EXTENSIONS.includes(ext) || VIDEO_KEY_REGEX.test(parentKey)) {
        visitedUrls.add(str);
        items.push({
          id: `media-${items.length}`,
          type: 'video',
          url: str,
          keyPath: keyPath || 'root',
          title: parentKey || 'Video Stream',
          extension: ext ? ext.replace('.', '').toUpperCase() : 'MP4'
        });
        return;
      }

      // 3. Audio Extensions
      if (AUDIO_EXTENSIONS.includes(ext) || AUDIO_KEY_REGEX.test(parentKey)) {
        visitedUrls.add(str);
        items.push({
          id: `media-${items.length}`,
          type: 'audio',
          url: str,
          keyPath: keyPath || 'root',
          title: parentKey || 'Audio Track',
          extension: ext ? ext.replace('.', '').toUpperCase() : 'MP3'
        });
        return;
      }

      // 4. Image Extensions or key matches
      if (IMAGE_EXTENSIONS.includes(ext) || IMAGE_KEY_REGEX.test(parentKey)) {
        visitedUrls.add(str);
        items.push({
          id: `media-${items.length}`,
          type: 'image',
          url: str,
          keyPath: keyPath || 'root',
          title: parentKey || 'Image Asset',
          extension: ext ? ext.replace('.', '').toUpperCase() : 'IMAGE'
        });
        return;
      }

      // 5. Hostname heuristics (known image CDNs)
      const lower = str.toLowerCase();
      if (
        lower.includes('images.unsplash.com') ||
        lower.includes('images.dog.ceo') ||
        lower.includes('cdn.thecatapi.com') ||
        lower.includes('raw.githubusercontent.com/pokeapi') ||
        lower.includes('rickandmortyapi.com/api/character/avatar') ||
        lower.includes('randomfox.ca/images') ||
        lower.includes('i.imgur.com') ||
        lower.includes('avatars.githubusercontent.com')
      ) {
        visitedUrls.add(str);
        items.push({
          id: `media-${items.length}`,
          type: 'image',
          url: str,
          keyPath: keyPath || 'root',
          title: parentKey || 'Media Image',
          extension: ext ? ext.replace('.', '').toUpperCase() : 'JPG'
        });
      }
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => {
        const nextPath = keyPath ? `${keyPath}[${idx}]` : `[${idx}]`;
        inspectValue(item, nextPath, parentKey);
      });
    } else if (typeof val === 'object' && val !== null) {
      for (const [k, child] of Object.entries(val)) {
        const nextPath = keyPath ? `${keyPath}.${k}` : k;
        inspectValue(child, nextPath, k);
      }
    }
  }

  inspectValue(data, '', '');
  return items;
}
