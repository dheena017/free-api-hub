export function generateCurlSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {}
): string {
  const fullUrl = buildFullUrl(url, params);
  let cmd = `curl -X ${method.toUpperCase()} "${fullUrl}"`;

  for (const [key, val] of Object.entries(headers)) {
    cmd += ` \\\n  -H "${key}: ${val}"`;
  }

  return cmd;
}

export function generateJsSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {}
): string {
  const fullUrl = buildFullUrl(url, params);
  const options: Record<string, unknown> = {
    method: method.toUpperCase()
  };

  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }

  return `// Free API Hub — In-Browser JavaScript Example
const response = await fetch("${fullUrl}", ${JSON.stringify(options, null, 2)});
const data = await response.json();
console.log(data);`;
}

export function generatePythonSnippet(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  params: Record<string, string> = {}
): string {
  const cleanUrl = url.split('?')[0];
  const urlParams = parseQueryParams(url);
  const mergedParams = { ...urlParams, ...params };

  const hasParams = Object.keys(mergedParams).length > 0;
  const hasHeaders = Object.keys(headers).length > 0;

  let code = `import requests\n\n`;
  code += `url = "${cleanUrl}"\n`;

  if (hasParams) {
    code += `params = ${JSON.stringify(mergedParams, null, 4)}\n`;
  }
  if (hasHeaders) {
    code += `headers = ${JSON.stringify(headers, null, 4)}\n`;
  }

  const args = ['url'];
  if (hasParams) args.push('params=params');
  if (hasHeaders) args.push('headers=headers');

  code += `\nresponse = requests.${method.toLowerCase()}(${args.join(', ')})\n`;
  code += `data = response.json()\n`;
  code += `print(data)\n`;

  return code;
}

export function generateGoSnippet(
  url: string,
  method: string = 'GET',
  params: Record<string, string> = {}
): string {
  const fullUrl = buildFullUrl(url, params);

  return `package main

import (
    "fmt"
    "io"
    "net/http"
)

func main() {
    resp, err := http.Get("${fullUrl}")
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        panic(err)
    }

    fmt.Println(string(body))
}`;
}

export function buildFullUrl(url: string, params: Record<string, string> = {}): string {
  try {
    const parsed = new URL(url);
    for (const [k, v] of Object.entries(params)) {
      if (k.trim()) parsed.searchParams.set(k, v);
    }
    return parsed.toString();
  } catch {
    const queryString = Object.entries(params)
      .filter(([k]) => k.trim())
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (!queryString) return url;
    return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
  }
}

function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((val, key) => {
      params[key] = val;
    });
  } catch {
    const qIndex = url.indexOf('?');
    if (qIndex !== -1) {
      const q = url.slice(qIndex + 1);
      q.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
  }
  return params;
}

export function formatLatencyBadge(latencyMs: number): { label: string; colorClass: string } {
  if (latencyMs < 150) {
    return { label: `${latencyMs}ms (Blazing)`, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  } else if (latencyMs < 400) {
    return { label: `${latencyMs}ms (Good)`, colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
  } else {
    return { label: `${latencyMs}ms (Slow)`, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  }
}
