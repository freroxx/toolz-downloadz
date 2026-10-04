import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INVIDIOUS_INSTANCES,
  fetchInvidiousFrom,
  mapInvidiousToPlayer,
  parseHeight,
} from '../src/lib/youtube/invidious.js';
import { buildLadder } from '../src/lib/youtube/innertube.js';
import { extractYouTube } from '../src/lib/youtube/extract.js';

const INV_FIXTURE = {
  title: 'Never Gonna Give You Up',
  author: 'Rick Astley',
  authorId: 'UCuAXFkgNdKlGJOUxk4s',
  lengthSeconds: 213,
  formatStreams: [
    { url: 'https://r1/itag=18', itag: 18, type: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"', quality: 'medium', resolution: '360p', size: '640x360' },
    { url: 'https://r1/itag=22', itag: 22, type: 'video/mp4; codecs="avc1.64001F, mp4a.40.2"', quality: 'hd720', resolution: '720p', size: '1280x720' },
    { url: null, itag: 999, type: 'video/mp4', quality: 'medium', resolution: '360p' },
  ],
  adaptiveFormats: [
    { url: 'https://r1/itag=137', itag: 137, type: 'video/mp4; codecs="avc1.640028"', quality: 'hd1080', resolution: '1080p', size: '1920x1080' },
    { url: 'https://r1/itag=140', itag: 140, type: 'audio/mp4; codecs="mp4a.40.2"', bitrate: 128000 },
    { url: 'https://r1/itag=251', itag: 251, type: 'audio/webm; codecs="opus"', bitrate: 160000 },
  ],
  videoThumbnails: [
    { quality: 'medium', url: 'https://inv/vi/x/mqdefault.jpg', width: 320, height: 180 },
    { quality: 'high', url: 'https://inv/vi/x/hqdefault.jpg', width: 480, height: 360 },
  ],
  captions: [
    { label: 'English', languageCode: 'en', url: 'https://inv/api/v1/captions/x?label=English' },
  ],
};

describe('parseHeight', () => {
  it('reads every Invidious label shape', () => {
    assert.equal(parseHeight('720p'), 720);
    assert.equal(parseHeight('hd720'), 720);
    assert.equal(parseHeight('1280x720'), 720);
    assert.equal(parseHeight('1080'), 1080);
    assert.equal(parseHeight(null, undefined, '480p'), 480);
    assert.equal(parseHeight('medium'), 0);
    assert.equal(parseHeight(null), 0);
  });
});

describe('mapInvidiousToPlayer', () => {
  it('produces ladder-ready players (muxed + adaptive + audio + caps)', () => {
    const player = mapInvidiousToPlayer(INV_FIXTURE, 'dQw4w9WgXcQ');
    assert.equal(player.playabilityStatus.status, 'OK');
    assert.equal(player.streamingData.formats.length, 2); // url-less row dropped
    const lad = buildLadder(player, 'dQw4w9WgXcQ', 'compat');
    assert.deepEqual(lad.heights, [360, 720, 1080]);
    const byH = Object.fromEntries(lad.merged.map((r) => [r.height, r]));
    assert.equal(byH[360].needsMerge, false);
    assert.equal(byH[720].needsMerge, false);
    assert.equal(byH[1080].needsMerge, true);
    assert.equal(byH[1080].video.itag, 137);
    assert.equal(byH[1080].audio.itag, 140); // merge pair prefers m4a/AAC
    assert.equal(lad.audios[0].itag, 251); // picker lists top bitrate first
    assert.equal(lad.audios.length, 2);
    assert.equal(lad.title, 'Never Gonna Give You Up');
    assert.equal(lad.author, 'Rick Astley');
    assert.equal(lad.thumbnail, 'https://inv/vi/x/hqdefault.jpg');
    assert.equal(lad.captions.length, 1);
    assert.equal(lad.captions[0].lang, 'en');
  });
  it('empty payload maps to an honest empty ladder', () => {
    const lad = buildLadder(mapInvidiousToPlayer({}, 'x'), 'x', 'compat');
    assert.deepEqual(lad.merged, []);
    assert.deepEqual(lad.audios, []);
  });
});

describe('fetchInvidiousFrom', () => {
  it('GETs the documented endpoint and maps the payload', async () => {
    let seenUrl;
    const mock = async (url) => {
      seenUrl = url;
      return { ok: true, json: async () => INV_FIXTURE };
    };
    const player = await fetchInvidiousFrom('https://yt.chocolatemoo53.com/', 'dQw4w9WgXcQ', mock);
    assert.ok(seenUrl.includes('/api/v1/videos/dQw4w9WgXcQ'));
    assert.ok(!seenUrl.endsWith('/'));
    assert.equal(player.videoDetails.title, 'Never Gonna Give You Up');
  });
  it('rejects non-2xx instances', async () => {
    const mock = async () => ({ ok: false, status: 403 });
    await assert.rejects(() => fetchInvidiousFrom('https://x', 'y', mock), /403/);
  });
});

describe('extractYouTube chain', () => {
  const directPlayer = {
    playabilityStatus: { status: 'OK' },
    videoDetails: { title: 'Direct', lengthSeconds: '10' },
    streamingData: {
      formats: [{ url: 'https://r1/x', mimeType: 'video/mp4', height: 360 }],
      adaptiveFormats: [],
    },
  };
  it('prefers direct Innertube and never touches Invidious when it works', async () => {
    let invidiousHit = false;
    const mock = async (url) => {
      if (String(url).includes('youtube.com')) {
        return { ok: true, json: async () => directPlayer };
      }
      invidiousHit = true;
      return { ok: false, status: 500 };
    };
    const { player, source } = await extractYouTube('dQw4w9WgXcQ', { fetchImpl: mock });
    assert.equal(source, 'device:ANDROID');
    assert.equal(player, directPlayer);
    assert.equal(invidiousHit, false);
  });
  it('falls across Invidious instances when direct fails', async () => {
    const calls = [];
    const mock = async (url) => {
      calls.push(String(url));
      if (String(url).includes('youtube.com')) return { ok: false, status: 403 };
      if (String(url).includes('chocolatemoo')) return { ok: false, status: 403 };
      return { ok: true, json: async () => INV_FIXTURE };
    };
    const { player, source } = await extractYouTube('dQw4w9WgXcQ', { fetchImpl: mock });
    assert.ok(source.startsWith('invidious:'));
    assert.equal(player.videoDetails.title, 'Never Gonna Give You Up');
    assert.ok(calls.some((c) => c.includes('chocolatemoo')));
  });
  it('throws when every source fails', async () => {
    const mock = async () => ({ ok: false, status: 403 });
    await assert.rejects(() => extractYouTube('x', { fetchImpl: mock }), /streams/i);
  });
  it('ships at least one instance (never an empty chain)', () => {
    assert.ok(INVIDIOUS_INSTANCES.length >= 1);
    assert.ok(INVIDIOUS_INSTANCES.every((u) => u.startsWith('https://')));
  });
});
