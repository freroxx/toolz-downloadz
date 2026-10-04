import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptiveVideoAtOrBelow,
  bestAudio,
  buildLadder,
  buildPlayerBody,
  countDirectVideo,
  fetchPlayerWithFallback,
  friendlyPlayabilityError,
  listAudioChoices,
  muxedAtOrBelow,
  probeHeights,
} from '../src/lib/youtube/innertube.js';

// Realistic player: muxed 360+720, adaptive 1080 avc1 + 720 vp9,
// audio m4a + opus, one cipher-only 2160 (must be ignored everywhere).
const player = {
  playabilityStatus: { status: 'OK' },
  videoDetails: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Test Video',
    author: 'Tester',
    lengthSeconds: '213',
    thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/x/hq.jpg', width: 480, height: 360 }] },
  },
  streamingData: {
    formats: [
      { itag: 18, url: 'https://r1/videoplayback?itag=18', mimeType: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"', height: 360, width: 640, bitrate: 500000 },
      { itag: 22, url: 'https://r1/videoplayback?itag=22', mimeType: 'video/mp4; codecs="avc1.64001F, mp4a.40.2"', height: 720, width: 1280, bitrate: 2000000 },
    ],
    adaptiveFormats: [
      { itag: 137, url: 'https://r1/videoplayback?itag=137', mimeType: 'video/mp4; codecs="avc1.640028"', height: 1080, width: 1920, bitrate: 4500000 },
      { itag: 136, url: 'https://r1/videoplayback?itag=136', mimeType: 'video/mp4; codecs="avc1.4d401f"', height: 720, width: 1280, bitrate: 2500000 },
      { itag: 247, url: 'https://r1/videoplayback?itag=247', mimeType: 'video/webm; codecs="vp9"', height: 720, width: 1280, bitrate: 3000000 },
      { itag: 140, url: 'https://r1/videoplayback?itag=140', mimeType: 'audio/mp4; codecs="mp4a.40.2"', bitrate: 128000 },
      { itag: 251, url: 'https://r1/videoplayback?itag=251', mimeType: 'audio/webm; codecs="opus"', bitrate: 160000 },
      { itag: 313, signatureCipher: 's=abc&url=https://r1/x', mimeType: 'video/mp4; codecs="avc1.640033"', height: 2160, bitrate: 15000000 },
    ],
  },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=en', languageCode: 'en', name: { runs: [{ text: 'English' }] } },
      ],
    },
  },
};

describe('probeHeights', () => {
  it('lists real heights only, cipher-only 2160 excluded', () => {
    assert.deepEqual(probeHeights(player), [360, 720, 1080]);
  });
  it('empty player yields no fake heights', () => {
    assert.deepEqual(probeHeights({}), []);
    assert.deepEqual(probeHeights({ streamingData: {} }), []);
  });
});

describe('muxedAtOrBelow', () => {
  it('picks exact muxed rung', () => {
    assert.equal(muxedAtOrBelow(player, 720).itag, 22);
    assert.equal(muxedAtOrBelow(player, 360).itag, 18);
  });
  it('falls back to lower muxed when ceiling is between rungs', () => {
    assert.equal(muxedAtOrBelow(player, 480).itag, 18);
  });
  it('returns null above everything instead of upscaling', () => {
    // 240p requested on 360p-min video: null would strand SD, but our
    // fixture min is 360 > 240 so null (caller tries DASH/yt-dlp).
    assert.equal(muxedAtOrBelow(player, 240), null);
  });
});

describe('adaptiveVideoAtOrBelow', () => {
  it('compat prefers avc1 over vp9 at same height', () => {
    const v = adaptiveVideoAtOrBelow(player, 720, 'compat');
    assert.equal(v.itag, 136); // avc1 beats vp9 247
  });
  it('efficient takes highest bitrate regardless of codec', () => {
    const v = adaptiveVideoAtOrBelow(player, 720, 'efficient');
    assert.equal(v.itag, 247); // vp9 3Mbps
  });
  it('reaches 1080 and ignores cipher-only 2160', () => {
    assert.equal(adaptiveVideoAtOrBelow(player, 1080).itag, 137);
    assert.equal(adaptiveVideoAtOrBelow(player, 2160).itag, 137); // 2160 has no direct url
  });
});

describe('audio selection', () => {
  it('bestAudio prefers m4a for clean mp4 merges', () => {
    assert.equal(bestAudio(player, true).itag, 140);
  });
  it('bestAudio without pref takes top bitrate', () => {
    assert.equal(bestAudio(player, false).itag, 251);
  });
  it('listAudioChoices caps rows', () => {
    assert.equal(listAudioChoices(player, 1).length, 1);
    assert.equal(listAudioChoices(player, 10).length, 2);
  });
});

describe('buildLadder', () => {
  it('builds honest merged rows with metadata + captions', () => {
    const lad = buildLadder(player, 'dQw4w9WgXcQ', 'compat');
    assert.equal(lad.title, 'Test Video');
    assert.equal(lad.maxHeight, 1080);
    const byH = Object.fromEntries(lad.merged.map((r) => [r.height, r]));
    assert.equal(byH[360].needsMerge, false); // muxed fast path
    assert.equal(byH[720].needsMerge, false); // exact muxed wins over adaptive
    assert.equal(byH[1080].needsMerge, true); // DASH pair, merged on device
    assert.equal(byH[1080].video.itag, 137);
    assert.equal(lad.videoOnly.length, 0); // cipher 2160 is not listed
    assert.equal(lad.audios.length, 2);
    assert.equal(lad.captions.length, 1);
  });
  it('no fake rows on empty player', () => {
    const lad = buildLadder({}, 'x', 'compat');
    assert.deepEqual(lad.merged, []);
    assert.deepEqual(lad.heights, []);
  });
});

describe('buildPlayerBody', () => {
  it('carries client + playback context (Android parity)', () => {
    const body = buildPlayerBody('abc123XYZ_-', {
      name: 'ANDROID', clientVersion: '21.03.36', extra: { hl: 'en' },
    });
    assert.equal(body.videoId, 'abc123XYZ_-');
    assert.equal(body.context.client.clientName, 'ANDROID');
    assert.equal(body.playbackContext.contentPlaybackContext.contentCheckOk, true);
  });
});

describe('friendlyPlayabilityError', () => {
  it('maps known statuses to user-facing messages', () => {
    assert.match(friendlyPlayabilityError('LOGIN_REQUIRED', '').message, /sign-in/i);
    assert.match(friendlyPlayabilityError('PRIVATE', '').message, /private/i);
    assert.match(friendlyPlayabilityError('LIVE_STREAM_OFFLINE', '').message, /livestream/i);
  });
});

describe('fetchPlayerWithFallback', () => {
  const okMuxed = {
    playabilityStatus: { status: 'OK' },
    streamingData: { formats: [{ url: 'https://r1/x', mimeType: 'video/mp4', height: 360 }] },
  };
  it('stays CORS-simple: text/plain, no custom headers (else browsers preflight and YouTube 403s)', async () => {
    let seen;
    const mock = async (url, opts) => {
      seen = opts;
      return { ok: true, json: async () => okMuxed };
    };
    await fetchPlayerWithFallback('dQw4w9WgXcQ', mock);
    assert.equal(seen.method, 'POST');
    assert.deepEqual(Object.keys(seen.headers), ['Content-Type']);
    assert.match(seen.headers['Content-Type'], /^text\/plain/);
    assert.ok(seen.body.includes('"videoId":"dQw4w9WgXcQ"'));
  });
  it('takes the first usable client', async () => {
    const seen = [];
    const mock = async (url, opts) => {
      const body = JSON.parse(opts.body);
      seen.push(body.context.client.clientName);
      return { ok: true, json: async () => okMuxed };
    };
    const { clientName } = await fetchPlayerWithFallback('dQw4w9WgXcQ', mock);
    assert.equal(clientName, 'ANDROID');
    assert.deepEqual(seen, ['ANDROID']);
  });
  it('skips cipher-only players and falls through', async () => {
    const cipher = {
      playabilityStatus: { status: 'OK' },
      streamingData: { adaptiveFormats: [{ signatureCipher: 's=x', mimeType: 'video/mp4', height: 1080 }] },
    };
    const calls = [];
    const mock = async (url, opts) => {
      const name = JSON.parse(opts.body).context.client.clientName;
      calls.push(name);
      return { ok: true, json: async () => (name === 'ANDROID' ? cipher : okMuxed) };
    };
    const { clientName } = await fetchPlayerWithFallback('dQw4w9WgXcQ', mock);
    assert.equal(clientName, 'IOS');
    assert.deepEqual(calls, ['ANDROID', 'IOS']);
  });
  it('throws friendly error when all clients refuse', async () => {
    const login = { playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'confirm' } };
    const mock = async () => ({ ok: true, json: async () => login });
    await assert.rejects(() => fetchPlayerWithFallback('x', mock), /sign-in/i);
  });
  it('throws user-facing error when every client fails transport', async () => {
    const mock = async () => ({ ok: false, status: 403 });
    await assert.rejects(() => fetchPlayerWithFallback('x', mock), /no playable streams|refused|failed/i);
  });
  it('countDirectVideo ignores cipher entries', () => {
    assert.equal(countDirectVideo(okMuxed), 1);
    assert.equal(countDirectVideo({ streamingData: { adaptiveFormats: [{ signatureCipher: 's=x', mimeType: 'video/mp4' }] } }), 0);
  });
});
