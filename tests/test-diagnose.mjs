import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { probeYouTubeReachability } from '../src/lib/youtube/diagnose.js';
import { extractYouTube } from '../src/lib/youtube/extract.js';

const OEMBED = {
  title: 'Never Gonna Give You Up',
  author_name: 'Rick Astley',
  author_url: 'https://www.youtube.com/@RickAstleyYT',
  thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
};

describe('probeYouTubeReachability', () => {
  it('maps public metadata on success', async () => {
    const mock = async (url) => {
      assert.ok(String(url).includes('oembed'));
      return { ok: true, json: async () => OEMBED };
    };
    const r = await probeYouTubeReachability('dQw4w9WgXcQ', mock);
    assert.equal(r.reachable, true);
    assert.equal(r.meta.title, 'Never Gonna Give You Up');
    assert.equal(r.meta.author, 'Rick Astley');
    assert.ok(r.meta.thumbnail.includes('hqdefault'));
  });
  it('reports unreachable on non-2xx', async () => {
    const mock = async () => ({ ok: false, status: 404 });
    const r = await probeYouTubeReachability('nope1234567', mock);
    assert.deepEqual(r, { reachable: false, meta: null });
  });
  it('reports unreachable on transport failure', async () => {
    const mock = async () => { throw new TypeError('Failed to fetch'); };
    const r = await probeYouTubeReachability('dQw4w9WgXcQ', mock);
    assert.deepEqual(r, { reachable: false, meta: null });
  });
});

describe('extractYouTube diagnosis', () => {
  const deadStreams = async () => ({ ok: false, status: 403 });
  it('STREAMS_REFUSED + metadata when oEmbed answers', async () => {
    const mock = async (url) =>
      String(url).includes('oembed')
        ? { ok: true, json: async () => OEMBED }
        : deadStreams();
    await assert.rejects(
      extractYouTube('dQw4w9WgXcQ', { fetchImpl: mock }),
      (e) => {
        assert.equal(e.code, 'STREAMS_REFUSED');
        assert.equal(e.meta.title, 'Never Gonna Give You Up');
        return true;
      },
    );
  });
  it('NETWORK_BLOCKED when oEmbed fails too', async () => {
    const mock = async () => ({ ok: false, status: 403 });
    await assert.rejects(
      extractYouTube('dQw4w9WgXcQ', { fetchImpl: mock }),
      (e) => {
        assert.equal(e.code, 'NETWORK_BLOCKED');
        assert.equal(e.meta, null);
        return true;
      },
    );
  });
});
