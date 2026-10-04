import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CORE_JS_URL,
  CORE_WASM_URL,
  DESKTOP_MERGE_LIMIT,
  MOBILE_MERGE_LIMIT,
  assertMergeable,
  buildAudioConvertArgs,
  buildMuxArgs,
} from '../src/lib/youtube/merge.js';

describe('buildMuxArgs', () => {
  it('matches Android YtVideoMerge.mux (copy video, aac 160k, faststart)', () => {
    assert.deepEqual(buildMuxArgs(), [
      '-i', 'video.mp4',
      '-i', 'audio.m4a',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '160k',
      '-movflags', '+faststart',
      '-shortest',
      '-y', 'out.mp4',
    ]);
  });
  it('never re-encodes video', () => {
    const args = buildMuxArgs();
    assert.equal(args[args.indexOf('-c:v') + 1], 'copy');
    assert.ok(!args.includes('libx264'));
  });
});

describe('buildAudioConvertArgs', () => {
  it('uses libmp3lame for mp3, pcm for wav, flac natively', () => {
    assert.ok(buildAudioConvertArgs('a', 'o.mp3', 'mp3').includes('libmp3lame'));
    assert.ok(buildAudioConvertArgs('a', 'o.wav', 'wav').includes('pcm_s16le'));
    assert.ok(buildAudioConvertArgs('a', 'o.flac', 'flac').includes('flac'));
    assert.ok(buildAudioConvertArgs('a', 'o.ogg', 'ogg').includes('libvorbis'));
  });
});

describe('assertMergeable', () => {
  it('allows small pairs, rejects oversized with SIZE_TOO_LARGE', () => {
    assert.doesNotThrow(() => assertMergeable(100, 100));
    assert.throws(() => assertMergeable(DESKTOP_MERGE_LIMIT, 1), (e) => e.code === 'SIZE_TOO_LARGE');
    // explicit mobile cap is stricter
    assert.throws(
      () => assertMergeable(MOBILE_MERGE_LIMIT, 1, MOBILE_MERGE_LIMIT),
      (e) => e.code === 'SIZE_TOO_LARGE',
    );
    assert.ok(MOBILE_MERGE_LIMIT < DESKTOP_MERGE_LIMIT);
  });
});

describe('core bundle', () => {
  it('pins single-thread UMD (no SharedArrayBuffer / COOP-COEP needed)', () => {
    assert.match(CORE_JS_URL, /core-st@0\.11\.1\/dist\/umd\/ffmpeg-core\.js/);
    assert.match(CORE_WASM_URL, /core-st@0\.11\.1\/dist\/umd\/ffmpeg-core\.wasm/);
  });
});
