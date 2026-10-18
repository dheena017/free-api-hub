/**
 * cURL command parser for Free API Hub playground
 */
export interface ParsedCurl {
  url: string;
  method: string;
  headers: Array<{ key: string; value: string }>;
  params: Array<{ key: string; value: string }>;
  body?: string;
  error?: string;
}

export function parseCurlCommand(rawInput: string): ParsedCurl {
  let input = rawInput.trim();
  if (!input) {
    return { url: '', method: 'GET', headers: [], params: [], error: 'Input is empty' };
  }

  // Remove trailing slashes from line continuations (\ at line ends)
  input = input.replace(/\\\r?\n/g, ' ');

  // If command starts with 'curl', trim it
  if (input.startsWith('curl')) {
    input = input.substring(4).trim();
  }

  // Tokenize preserving quoted strings
  const tokens: string[] = [];
  const regex = /[^\s"']+|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    if (match[1] !== undefined) {
      // Double quoted
      tokens.push(match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    } else if (match[2] !== undefined) {
      // Single quoted
      tokens.push(match[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
    } else {
      tokens.push(match[0]);
    }
  }

  let method = 'GET';
  let url = '';
  const headers: Array<{ key: string; value: string }> = [];
  let body: string | undefined = undefined;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        method = tokens[++i].toUpperCase();
      }
    } else if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerStr = tokens[++i];
        const colonIdx = headerStr.indexOf(':');
        if (colonIdx > -1) {
          const key = headerStr.slice(0, colonIdx).trim();
          const value = headerStr.slice(colonIdx + 1).trim();
          if (key) {
            headers.push({ key, value });
          }
        }
      }
    } else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-urlencode'
    ) {
      if (i + 1 < tokens.length) {
        body = tokens[++i];
        if (method === 'GET') {
          method = 'POST';
        }
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      url = token;
    } else if (!url && !token.startsWith('-') && token.includes('.')) {
      // Could be url without protocol or relative
      url = token.startsWith('http') ? token : `https://${token}`;
    }
  }

  // Parse query parameters from URL if present
  const params: Array<{ key: string; value: string }> = [];
  let cleanUrl = url;

  if (url.includes('?')) {
    try {
      const parsedUrl = new URL(url);
      cleanUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
      parsedUrl.searchParams.forEach((value, key) => {
        params.push({ key, value });
      });
    } catch {
      // fallback manual parse
      const [base, query] = url.split('?');
      cleanUrl = base;
      if (query) {
        const pairs = query.split('&');
        for (const pair of pairs) {
          const [k, v] = pair.split('=');
          if (k) {
            params.push({ key: decodeURIComponent(k), value: decodeURIComponent(v || '') });
          }
        }
      }
    }
  }

  return {
    url: cleanUrl || url,
    method,
    headers,
    params,
    body,
    error: !url ? 'Could not find a valid target URL in the cURL command' : undefined
  };
}
