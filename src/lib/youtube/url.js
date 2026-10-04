/**
 * YouTube URL helpers — port of MediaDownloaderRepository.detectPlatform/sanitizeUrl
 * (toolz Android app). Pure functions, no browser APIs, fully unit-testable.
 */

const ID_RE = /[a-zA-Z0-9_-]{11}/;

const YT_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

function hostIs(host, domain) {
  return host === domain || host.endsWith('.' + domain);
}

export function isYouTubeHost(host) {
  const h = String(host || '').toLowerCase();
  return (
    hostIs(h, 'youtube.com') ||
    hostIs(h, 'youtu.be') ||
    hostIs(h, 'youtube-nocookie.com')
  );
}

export function isYouTubeUrl(raw) {
  if (typeof raw !== 'string') return false;
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  return isYouTubeHost(u.hostname);
}

/**
 * Extract the 11-char video id. Covers ?v=, youtu.be/, shorts/, embed/,
 * live/, /v/, nocookie embed. Returns null when none found.
 */
export function extractVideoId(raw) {
  if (typeof raw !== 'string') return null;
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!isYouTubeHost(u.hostname)) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'youtu.be') {
    const seg = u.pathname.split('/').filter(Boolean)[0] || '';
    return ID_RE.test(seg) && seg.length === 11 ? seg : null;
  }

  const path = u.pathname || '';
  const shorts = path.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts) return shorts[1];
  const embed = path.match(/^\/(?:embed|v|live)\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];

  const v = u.searchParams.get('v');
  if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

  // music.youtube.com watch URLs also carry ?v=
  const m = raw.match(/[a-zA-Z0-9_-]{11}/);
  // Only accept the bare-id fallback for watch-like paths to avoid
  // matching playlist/channel ids on non-video pages.
  if (m && /\/watch|\/shorts|\/embed|\/live|youtu\.be/.test(raw)) return m[0];
  return null;
}

/**
 * Mirror of Android sanitizeUrl + API clean_url: https only, length cap,
 * reject private/internal hosts. Returns the cleaned https URL or throws
 * an Error with a user-facing message.
 */
export function sanitizeYouTubeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) throw new Error('Paste a YouTube link first.');
  let upgraded = s;
  if (/^http:\/\//i.test(upgraded)) upgraded = 'https://' + upgraded.slice(7);
  if (!/^https:\/\//i.test(upgraded)) {
    throw new Error('URL must start with https://');
  }
  if (upgraded.length > 2048) throw new Error('URL too long.');
  let u;
  try {
    u = new URL(upgraded);
  } catch {
    throw new Error('That link is not a valid URL.');
  }
  if (!isYouTubeHost(u.hostname)) {
    throw new Error('That link is not a YouTube URL.');
  }
  if (u.username || u.password) throw new Error('Invalid source URL.');
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('Private/internal hosts are not allowed.');
  }
  return upgraded;
}

/** Strip tracking params so one video maps to one cache identity. */
export function canonicalVideoUrl(raw) {
  const id = extractVideoId(raw);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Remove trailing paste junk: `.,;:!?)]}\'"` (parity with Android helper). */
export function cleanPastedUrl(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/https?:\/\/\S+/);
  if (!m) return s;
  return m[0].replace(/[.,;:!?)\]}'"]+$/, '');
}
