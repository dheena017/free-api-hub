import test from 'node:test';
import assert from 'node:assert/strict';

// Test parseApiResponse logic matching client.ts loggedFetch behavior
function parseResponseBody(status, text) {
  if (!text || text.trim() === '' || status === 204) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Test safe localStorage bookmark/history retrieval logic
function safeLoadStoredArray(storedRaw) {
  if (!storedRaw) return [];
  try {
    const parsed = JSON.parse(storedRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

test('parseResponseBody: handles 204 No Content safely', () => {
  const result = parseResponseBody(204, '');
  assert.equal(result, null);
});

test('parseResponseBody: handles empty string safely without throwing', () => {
  const result = parseResponseBody(200, '   ');
  assert.equal(result, null);
});

test('parseResponseBody: parses valid JSON payload', () => {
  const result = parseResponseBody(200, '{"success":true,"items":[1,2,3]}');
  assert.deepEqual(result, { success: true, items: [1, 2, 3] });
});

test('parseResponseBody: falls back gracefully to raw text on non-JSON response', () => {
  const result = parseResponseBody(502, 'Bad Gateway: Backend server timeout');
  assert.equal(result, 'Bad Gateway: Backend server timeout');
});

test('safeLoadStoredArray: returns parsed array when localStorage is valid', () => {
  const stored = JSON.stringify(['cat-facts', 'pokeapi']);
  assert.deepEqual(safeLoadStoredArray(stored), ['cat-facts', 'pokeapi']);
});

test('safeLoadStoredArray: returns empty array when corrupted non-JSON is stored', () => {
  const corrupted = '{invalid_json...';
  assert.deepEqual(safeLoadStoredArray(corrupted), []);
});

test('safeLoadStoredArray: returns empty array when stored data is an object instead of array', () => {
  const corrupted = '{"key":"value"}';
  assert.deepEqual(safeLoadStoredArray(corrupted), []);
});

test('safeLoadStoredArray: returns empty array when null or empty string', () => {
  assert.deepEqual(safeLoadStoredArray(null), []);
  assert.deepEqual(safeLoadStoredArray(''), []);
});
