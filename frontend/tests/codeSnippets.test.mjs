import test from 'node:test';
import assert from 'node:assert/strict';

// Helper tests for URL building, parameter formatting, and code snippet logic
function buildFullUrl(url, params = {}) {
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

function formatLatencyBadge(latencyMs) {
  if (latencyMs < 150) {
    return { label: `${latencyMs}ms (Blazing)`, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  } else if (latencyMs < 400) {
    return { label: `${latencyMs}ms (Good)`, colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
  } else {
    return { label: `${latencyMs}ms (Slow)`, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  }
}

function generateCurlSnippet(url, method = 'GET', headers = {}, params = {}, body) {
  const fullUrl = buildFullUrl(url, params);
  let cmd = `curl -X ${method.toUpperCase()} "${fullUrl}"`;

  for (const [key, val] of Object.entries(headers)) {
    cmd += ` \\\n  -H "${key}: ${val}"`;
  }

  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    if (!headers['Content-Type'] && !headers['content-type']) {
      cmd += ` \\\n  -H "Content-Type: application/json"`;
    }
    const escapedBody = body.replace(/"/g, '\\"');
    cmd += ` \\\n  -d "${escapedBody}"`;
  }

  return cmd;
}

test('buildFullUrl: accurately appends query params to clean URL', () => {
  const result = buildFullUrl('https://api.example.com/v1/data', { limit: '10', offset: '0' });
  assert.equal(result, 'https://api.example.com/v1/data?limit=10&offset=0');
});

test('buildFullUrl: merges with existing query params without duplicating question mark', () => {
  const result = buildFullUrl('https://api.example.com/search?q=test', { page: '2' });
  assert.equal(result, 'https://api.example.com/search?q=test&page=2');
});

test('buildFullUrl: ignores empty keys', () => {
  const result = buildFullUrl('https://api.example.com/data', { '': 'ignored', valid: 'true' });
  assert.equal(result, 'https://api.example.com/data?valid=true');
});

test('formatLatencyBadge: assigns Blazing badge for sub-150ms', () => {
  const badge = formatLatencyBadge(85);
  assert.match(badge.label, /Blazing/);
  assert.match(badge.colorClass, /emerald/);
});

test('formatLatencyBadge: assigns Good badge for 250ms', () => {
  const badge = formatLatencyBadge(250);
  assert.match(badge.label, /Good/);
  assert.match(badge.colorClass, /sky/);
});

test('formatLatencyBadge: assigns Slow badge for 600ms', () => {
  const badge = formatLatencyBadge(600);
  assert.match(badge.label, /Slow/);
  assert.match(badge.colorClass, /amber/);
});

test('generateCurlSnippet: generates valid GET request command', () => {
  const curl = generateCurlSnippet('https://api.example.com/weather', 'GET', { Accept: 'application/json' }, { city: 'London' });
  assert.ok(curl.startsWith('curl -X GET "https://api.example.com/weather?city=London"'));
  assert.ok(curl.includes('-H "Accept: application/json"'));
});

test('generateCurlSnippet: adds Content-Type and payload for POST request', () => {
  const curl = generateCurlSnippet('https://api.example.com/posts', 'POST', {}, {}, '{"title":"Hello"}');
  assert.ok(curl.startsWith('curl -X POST "https://api.example.com/posts"'));
  assert.ok(curl.includes('-H "Content-Type: application/json"'));
  assert.ok(curl.includes('-d "{\\"title\\":\\"Hello\\"}"'));
});
