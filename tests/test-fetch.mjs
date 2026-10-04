import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  downloadToBytes,
  formatBytes,
  sanitizeFilename,
} from '../src/lib/youtube/fetch.js';

function headers(map) {
  return { get: (k) => (k in map ? map[k] : null) };
}

describe('downloadToBytes', () => {
  it('streams chunks with progress and concatenates', async () => {
    const seen = [];
    const mock = async () => ({
      ok: true,
      headers: headers({ 'Content-Length': '6', 'Content-Type': 'video/mp4' }),
      body: {
        getReader: () => {
          const parts = [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5, 6])];
          let i = 0;
          return {
            read: async () =>
              i < parts.length ? { done: false, value: parts[i++] } : { done: true, value: undefined },
          };
        },
      },
    });
    const { bytes, contentType } = await downloadToBytes('https://x', {
      fetchImpl: mock,
      onProgress: (p) => seen.push(p),
    });
    assert.deepEqual([...bytes], [1, 2, 3, 4, 5, 6]);
    assert.equal(contentType, 'video/mp4');
    assert.ok(seen.length > 0 && seen[seen.length - 1] === 1);
  });
  it('resolves small mocked bodies via arrayBuffer fast path', async () => {
    const mock = async () => ({
      ok: true,
      headers: headers({}),
      arrayBuffer: async () => new Uint8Array([9, 9]).buffer,
    });
    const { bytes } = await downloadToBytes('https://x', { fetchImpl: mock });
    assert.deepEqual([...bytes], [9, 9]);
  });
  it('rejects non-2xx with HTTP code', async () => {
    const mock = async () => ({ ok: false, status: 403 });
    await assert.rejects(() => downloadToBytes('https://x', { fetchImpl: mock }), /HTTP 403/);
  });
  it('propagates abort', async () => {
    const mock = async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    };
    await assert.rejects(
      downloadToBytes('https://x', { fetchImpl: mock, signal: AbortSignal.abort() }),
      /abort/i,
    );
  });
});

describe('formatBytes / sanitizeFilename', () => {
  it('formats sizes', () => {
    assert.equal(formatBytes(null), 'size unknown');
    assert.equal(formatBytes(500), '500 B');
    assert.equal(formatBytes(2048), '2 KB');
    assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  });
  it('sanitizes filenames like Android/Web parity', () => {
    assert.equal(sanitizeFilename('a/b:c*d?e"f<g>h|i'), 'a b c d e f g h i');
    assert.equal(sanitizeFilename(''), 'media');
    assert.ok(sanitizeFilename('x'.repeat(200)).length <= 100);
  });
});
