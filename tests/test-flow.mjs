import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractVideoId } from '../src/lib/youtube/url.js';
import { buildLadder } from '../src/lib/youtube/innertube.js';
import { sanitizeFilename } from '../src/lib/youtube/fetch.js';
import { buildAudioConvertArgs, buildMuxArgs } from '../src/lib/youtube/merge.js';

const player = {
  playabilityStatus: { status: 'OK' },
  videoDetails: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up: test/timing?',
    author: 'Rick',
    lengthSeconds: '213',
    thumbnail: { thumbnails: [] },
  },
  streamingData: {
    formats: [
      { itag: 18, url: 'https://r1/itag=18', mimeType: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"', height: 360, bitrate: 500000 },
      { itag: 22, url: 'https://r1/itag=22', mimeType: 'video/mp4; codecs="avc1.64001F, mp4a.40.2"', height: 720, bitrate: 2000000 },
    ],
    adaptiveFormats: [
      { itag: 137, url: 'https://r1/itag=137', mimeType: 'video/mp4; codecs="avc1.640028"', height: 1080, bitrate: 4500000 },
      { itag: 140, url: 'https://r1/itag=140', mimeType: 'audio/mp4; codecs="mp4a.40.2"', bitrate: 128000 },
    ],
  },
};

describe('paste -> ladder -> download decision', () => {
  it('1080p merges on device with copy-video args + clean filename', () => {
    assert.equal(extractVideoId('https://youtu.be/dQw4w9WgXcQ?si=1'), 'dQw4w9WgXcQ');
    const lad = buildLadder(player, 'dQw4w9WgXcQ', 'compat');
    const row = lad.merged.find((r) => r.height === 1080);
    assert.ok(row && row.needsMerge, '1080p must be a DASH pair');
    assert.ok(row.video.url && row.audio.url);
    const args = buildMuxArgs();
    assert.equal(args[args.indexOf('-c:v') + 1], 'copy');
    const name = `${sanitizeFilename(lad.title)} (1080p).mp4`;
    assert.equal(name, 'Never Gonna Give You Up test timing (1080p).mp4');
  });
  it('720p uses the ready muxed file (no merge, no wasm)', () => {
    const lad = buildLadder(player, 'dQw4w9WgXcQ', 'compat');
    const row = lad.merged.find((r) => r.height === 720);
    assert.ok(row && !row.needsMerge);
    assert.ok(row.video.url.startsWith('https://'));
  });
  it('audio mp3 converts on device, m4a downloads direct', () => {
    const lad = buildLadder(player, 'dQw4w9WgXcQ', 'compat');
    assert.ok(lad.audios[0].url.startsWith('https://')); // m4a direct
    assert.ok(buildAudioConvertArgs('a', 'o.mp3', 'mp3').includes('libmp3lame'));
  });
  it('default pick is highest merged <= 720p', () => {
    const lad = buildLadder(player, 'dQw4w9WgXcQ', 'compat');
    const def = lad.merged.filter((r) => r.height <= 720).pop();
    assert.equal(def.height, 720);
  });
});
