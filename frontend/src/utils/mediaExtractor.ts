export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  embedUrl?: string;
  keyPath: string;
  title: string;
  extension?: string;
  isDirectResponse?: boolean;
  metadata?: Record<string, string | number>;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif', '.tiff'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.m4v', '.m3u8'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

const IMAGE_KEY_REGEX = /(image|avatar|poster|thumbnail|photo|picture|banner|flag|icon|logo|sprite|img_url|pic|screenshot|art|cover|download_url|floof|primaryimage|additionalimages)/i;
const VIDEO_KEY_REGEX = /(video|mp4|webm|stream|clip|trailer|movie|film|recording|screencast|embedpath|embed_path|embedurl|videourl)/i;
const AUDIO_KEY_REGEX = /(audio|sound|song|track|podcast|voice|mp3|preview_url|previewurl|stream_url|streamurl)/i;

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

function parsePeerTubeEmbed(url: string): string | null {
  try {
    if (url.includes('/videos/embed/')) return url;
    if (url.includes('/videos/watch/')) {
      return url.replace('/videos/watch/', '/videos/embed/');
    }
  } catch {
    // ignore
  }
  return null;
}

function resolveUrl(url: string, baseUrl?: string): string {
  const trimmed = cleanUrl(url);
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (!baseUrl) return trimmed;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

export function extractMediaItems(
  data: unknown,
  baseUrl?: string,
  headers?: Record<string, string>
): MediaItem[] {
  const items: MediaItem[] = [];
  const visitedUrls = new Set<string>();

  function registerMedia(
    rawUrl: string,
    type: 'image' | 'video' | 'audio',
    keyPath: string,
    title: string,
    extension?: string,
    embedUrl?: string,
    isDirectResponse?: boolean
  ) {
    const finalUrl = resolveUrl(rawUrl, baseUrl);
    if (!finalUrl || visitedUrls.has(finalUrl)) return;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('data:')) {
      return;
    }
    visitedUrls.add(finalUrl);
    items.push({
      id: `media-${items.length}`,
      type,
      url: finalUrl,
      embedUrl,
      keyPath: keyPath || 'root',
      title: title || 'Media Item',
      extension: extension || type.toUpperCase(),
      isDirectResponse: Boolean(isDirectResponse)
    });
  }

  // Check response headers for direct media content types
  if (headers) {
    const ct = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1]?.toLowerCase() || '';
    if (ct.startsWith('image/') || ct.startsWith('audio/') || ct.startsWith('video/')) {
      const mediaType: 'image' | 'audio' | 'video' = ct.startsWith('audio/')
        ? 'audio'
        : ct.startsWith('video/')
        ? 'video'
        : 'image';
      const rawExt = ct.split('/')[1]?.split(';')[0]?.toUpperCase() || mediaType.toUpperCase();
      const ext = rawExt.includes('SVG') ? 'SVG' : rawExt;
      if (typeof data === 'string' && (data.startsWith('data:') || data.startsWith('http'))) {
        registerMedia(data, mediaType, 'response.body', 'Direct API Media Response', ext, undefined, true);
      }
    }
  }

  function extractFromHtml(html: string) {
    // 1. Check <base href="..."> in HTML if baseUrl not explicitly passed
    let effectiveBase = baseUrl;
    const baseMatch = html.match(/<base\s+[^>]*href=["']([^"']+)["']/i);
    if (baseMatch && baseMatch[1]) {
      effectiveBase = baseMatch[1];
    }

    // 2. OpenGraph & Twitter Meta Images
    const metaRegex = /<meta\s+[^>]*(?:property|name)=["'](og:image|og:image:url|twitter:image|twitter:image:src|image)["'][^>]*content=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = metaRegex.exec(html)) !== null) {
      const prop = match[1];
      const content = match[2];
      registerMedia(content, 'image', `<meta ${prop}>`, `Social Card (${prop})`, 'IMAGE');
    }

    // Reversed attribute order: content="..." property="og:image"
    const revMetaRegex = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](og:image|og:image:url|twitter:image|twitter:image:src|image)["']/gi;
    while ((match = revMetaRegex.exec(html)) !== null) {
      const content = match[1];
      const prop = match[2];
      registerMedia(content, 'image', `<meta ${prop}>`, `Social Card (${prop})`, 'IMAGE');
    }

    // 3. Image Tags (<img src="...">)
    const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
      const title = altMatch && altMatch[1] ? altMatch[1] : 'HTML Image';
      registerMedia(src, 'image', '<img>', title, 'IMG');
    }

    // 4. Video Tags & Sources (<video src="..."> or <source src="...">)
    const videoRegex = /<(?:video|source)\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((match = videoRegex.exec(html)) !== null) {
      const src = match[1];
      const ext = getUrlExtension(src);
      if (VIDEO_EXTENSIONS.includes(ext) || ext === '.mp4' || ext === '.webm') {
        registerMedia(src, 'video', '<video>', 'HTML5 Video', 'VIDEO');
      } else if (AUDIO_EXTENSIONS.includes(ext) || ext === '.mp3' || ext === '.wav') {
        registerMedia(src, 'audio', '<audio>', 'HTML5 Audio', 'AUDIO');
      }
    }

    // 5. Favicon / Apple Touch Icon (<link rel="icon" href="...">)
    const iconRegex = /<link\s+[^>]*rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/gi;
    while ((match = iconRegex.exec(html)) !== null) {
      const href = match[1];
      registerMedia(href, 'image', '<link rel="icon">', 'Icon / Badge Asset', 'ICON');
    }

    // 6. Generic URLs embedded in HTML / text matching image extensions
    const directUrlRegex = /(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico|avif))(?:\?[^\s"'<>]*)?/gi;
    while ((match = directUrlRegex.exec(html)) !== null) {
      const url = match[1];
      registerMedia(url, 'image', 'embedded-url', 'Embedded Image URL', getUrlExtension(url).replace('.', '').toUpperCase());
    }
  }

  function inspectValue(val: unknown, keyPath: string, parentKey: string = '') {
    if (!val) return;

    if (typeof val === 'string') {
      const str = cleanUrl(val);

      // Direct SVG Vector markup detection
      if (/<svg[\s>]/i.test(str)) {
        const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
        registerMedia(
          svgDataUri,
          'image',
          keyPath || 'response.body',
          parentKey || 'Direct SVG Vector Output',
          'SVG',
          undefined,
          !keyPath || keyPath === 'root'
        );
        return;
      }

      // Check base64 data URLs for image, audio, or video
      if (str.startsWith('data:image/')) {
        const mime = str.slice(5, str.indexOf(';'));
        const ext = mime.includes('svg') ? 'SVG' : mime.split('/')[1]?.toUpperCase() || 'IMAGE';
        registerMedia(
          str,
          'image',
          keyPath || 'root',
          parentKey || 'Direct API Image Output',
          ext,
          undefined,
          !keyPath || keyPath === 'root'
        );
        return;
      }

      if (str.startsWith('data:audio/')) {
        const mime = str.slice(5, str.indexOf(';'));
        const ext = mime.split('/')[1]?.toUpperCase() || 'AUDIO';
        registerMedia(
          str,
          'audio',
          keyPath || 'root',
          parentKey || 'Direct API Audio Output',
          ext,
          undefined,
          !keyPath || keyPath === 'root'
        );
        return;
      }

      if (str.startsWith('data:video/')) {
        const mime = str.slice(5, str.indexOf(';'));
        const ext = mime.split('/')[1]?.toUpperCase() || 'VIDEO';
        registerMedia(
          str,
          'video',
          keyPath || 'root',
          parentKey || 'Direct API Video Output',
          ext,
          undefined,
          !keyPath || keyPath === 'root'
        );
        return;
      }

      // Check if string contains HTML markup
      const isHtml =
        str.includes('<html') ||
        str.includes('<!doctype') ||
        str.includes('<meta') ||
        str.includes('<img') ||
        str.includes('<video') ||
        str.includes('<audio');
      if (isHtml) {
        extractFromHtml(str);
      }

      // Check URL format
      if (!str.startsWith('http://') && !str.startsWith('https://')) {
        return;
      }

      if (visitedUrls.has(str)) return;

      const ext = getUrlExtension(str);
      const ytEmbed = parseYouTubeEmbed(str);
      const vimeoEmbed = parseVimeoEmbed(str);
      const peertubeEmbed = parsePeerTubeEmbed(str);

      // 1. YouTube / Vimeo / PeerTube Video Embed
      if (ytEmbed) {
        registerMedia(str, 'video', keyPath || 'root', parentKey || 'YouTube Video', 'YouTube', ytEmbed);
        return;
      }

      if (vimeoEmbed) {
        registerMedia(str, 'video', keyPath || 'root', parentKey || 'Vimeo Video', 'Vimeo', vimeoEmbed);
        return;
      }

      if (peertubeEmbed) {
        registerMedia(str, 'video', keyPath || 'root', parentKey || 'PeerTube Video', 'PeerTube', peertubeEmbed);
        return;
      }

      // 2. Direct Video Extensions
      if (VIDEO_EXTENSIONS.includes(ext) || VIDEO_KEY_REGEX.test(parentKey)) {
        registerMedia(str, 'video', keyPath || 'root', parentKey || 'Video Stream', ext ? ext.replace('.', '').toUpperCase() : 'MP4');
        return;
      }

      // 3. Audio Extensions
      if (AUDIO_EXTENSIONS.includes(ext) || AUDIO_KEY_REGEX.test(parentKey)) {
        registerMedia(str, 'audio', keyPath || 'root', parentKey || 'Audio Track', ext ? ext.replace('.', '').toUpperCase() : 'MP3');
        return;
      }

      // 4. Image Extensions or key matches
      if (IMAGE_EXTENSIONS.includes(ext) || IMAGE_KEY_REGEX.test(parentKey)) {
        registerMedia(str, 'image', keyPath || 'root', parentKey || 'Image Asset', ext ? ext.replace('.', '').toUpperCase() : 'IMAGE');
        return;
      }

      // 5. Hostname heuristics (known image & video CDNs)
      const lower = str.toLowerCase();
      if (
        lower.includes('images.unsplash.com') ||
        lower.includes('images.dog.ceo') ||
        lower.includes('cdn.thecatapi.com') ||
        lower.includes('thecatapi.com/img') ||
        lower.includes('cdn2.thedogapi.com') ||
        lower.includes('picsum.photos') ||
        lower.includes('images-assets.nasa.gov') ||
        lower.includes('staticflickr.com') ||
        lower.includes('images.metmuseum.org') ||
        lower.includes('randomfox.ca') ||
        lower.includes('random.dog') ||
        lower.includes('random-d.uk') ||
        lower.includes('upload.wikimedia.org') ||
        lower.includes('raw.githubusercontent.com/pokeapi') ||
        lower.includes('rickandmortyapi.com/api/character/avatar') ||
        lower.includes('i.imgur.com') ||
        lower.includes('avatars.githubusercontent.com') ||
        lower.includes('lh3.googleusercontent.com')
      ) {
        registerMedia(str, 'image', keyPath || 'root', parentKey || 'Media Image', ext ? ext.replace('.', '').toUpperCase() : 'JPG');
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

