import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalVideoUrl,
  cleanPastedUrl,
  extractVideoId,
  isYouTubeHost,
  isYouTubeUrl,
  sanitizeYouTubeUrl,
} from '../src/lib/youtube/url.js';

describe('isYouTubeHost', () => {
  it('accepts youtube variants', () => {
    for (const h of ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtube-nocookie.com']) {
      assert.equal(isYouTubeHost(h), true, h);
    }
  });
  it('rejects lookalikes and other sites', () => {
    for (const h of ['youtubee.com', 'notyoutube.com', 'youtube.com.evil.com', 'tiktok.com', '', null]) {
      assert.equal(isYouTubeHost(h), false, String(h));
    }
  });
});

describe('isYouTubeUrl', () => {
  it('accepts https watch/shorts/share links', () => {
    assert.equal(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
    assert.equal(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'), true);
    assert.equal(isYouTubeUrl('http://m.youtube.com/shorts/abc123XYZ_-'), true);
  });
  it('rejects non-youtube and non-url input', () => {
    assert.equal(isYouTubeUrl('https://vimeo.com/123'), false);
    assert.equal(isYouTubeUrl('not a url'), false);
    assert.equal(isYouTubeUrl(''), false);
    assert.equal(isYouTubeUrl(null), false);
    assert.equal(isYouTubeUrl('ftp://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
  });
});

describe('extractVideoId', () => {
  const cases = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc123', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/v/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ];
  for (const [url, id] of cases) {
    it(`parses ${url}`, () => assert.equal(extractVideoId(url), id));
  }
  it('returns null for non-video pages and garbage', () => {
    assert.equal(extractVideoId('https://www.youtube.com/playlist?list=PL123'), null);
    assert.equal(extractVideoId('https://vimeo.com/123'), null);
    assert.equal(extractVideoId('garbage'), null);
    assert.equal(extractVideoId(''), null);
  });
});

describe('sanitizeYouTubeUrl', () => {
  it('upgrades http and passes https through', () => {
    assert.equal(
      sanitizeYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
  });
  it('rejects non-youtube, non-https, private hosts', () => {
    assert.throws(() => sanitizeYouTubeUrl('https://vimeo.com/1'), /not a YouTube URL/);
    assert.throws(() => sanitizeYouTubeUrl('notaurl'), /https:\/\//);
    assert.throws(() => sanitizeYouTubeUrl(''), /Paste a YouTube/);
    // localhost is rejected (never a YouTube host)
    assert.throws(() => sanitizeYouTubeUrl('https://localhost/x'), /not a YouTube URL/);
  });
});

describe('canonicalVideoUrl / cleanPastedUrl', () => {
  it('canonicalizes to watch?v= with tracking stripped', () => {
    assert.equal(
      canonicalVideoUrl('https://youtu.be/dQw4w9WgXcQ?si=xyz&t=10'),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    assert.equal(canonicalVideoUrl('https://vimeo.com/1'), null);
  });
  it('strips trailing paste punctuation', () => {
    assert.equal(cleanPastedUrl('see https://youtu.be/dQw4w9WgXcQ).'), 'https://youtu.be/dQw4w9WgXcQ');
  });
});
