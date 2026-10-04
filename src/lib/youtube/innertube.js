/**
 * Browser Innertube client — JS port of InnerTubeClient.kt (toolz Android).
 *
 * Runs on the USER's IP (residential, clean), so YouTube answers OK where
 * datacenter servers get 403 / LOGIN_REQUIRED. No PO-token server, no
 * cookies, no proxy: plain fetch() from the browser, which YouTube's
 * youtubei endpoint allows via CORS (Access-Control-Allow-Origin: *).
 *
 * Client rotation ANDROID -> IOS -> WEB with fresh versions (aligned with
 * NewPipeExtractor 0.26.5 / Android InnerTubeClient.kt). First player with
 * playability OK + >=1 direct-url video stream wins; cipher-only players
 * (signatureCipher, no url) are skipped, never returned as usable.
 */

export const INNER_TUBE_KEY =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.NEXT_PUBLIC_INNERTUBE_API_KEY) ||
  'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w'; // public web key, same class as NewPipe/yt-dlp

const WEB_BASE = 'https://www.youtube.com/youtubei/v1';

export const PLAYER_CLIENTS = [
  {
    name: 'ANDROID',
    clientVersion: '21.03.36',
    ua: 'com.google.android.youtube/21.03.36 (Linux; U; Android 15; en_US) gzip',
    extra: {
      androidSdkVersion: 35,
      osName: 'Android',
      osVersion: '15',
      hl: 'en',
      gl: 'US',
    },
  },
  {
    name: 'IOS',
    clientVersion: '21.03.2',
    ua: 'com.google.ios.youtube/21.03.2(iPhone16,2; U; CPU iOS 18_7_2 like Mac OS X; en_US)',
    extra: {
      deviceMake: 'Apple',
      deviceModel: 'iPhone16,2',
      osName: 'iOS',
      osVersion: '18.7.2.22H124',
      hl: 'en',
      gl: 'US',
    },
  },
  {
    name: 'WEB',
    clientVersion: '2.20260120.01.00',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    extra: { hl: 'en', gl: 'US', utcOffsetMinutes: 0 },
  },
];

export function isDirectUrl(fmt) {
  return !!(fmt && typeof fmt.url === 'string' && fmt.url.startsWith('http'));
}

export function isVideo(fmt) {
  return !!(fmt && typeof fmt.mimeType === 'string' && fmt.mimeType.includes('video/'));
}

export function isAudio(fmt) {
  return !!(fmt && typeof fmt.mimeType === 'string' && fmt.mimeType.includes('audio/'));
}

function heightOf(fmt) {
  return Number(fmt && fmt.height) || 0;
}

function bitrateOf(fmt) {
  return Number(fmt && fmt.bitrate) || 0;
}

/** Score for mp4/avc1 preference (plays everywhere, muxes cleanly). */
function compatScore(fmt) {
  const mime = String((fmt && fmt.mimeType) || '');
  if (mime.includes('video/mp4')) return 2;
  if (mime.includes('avc1')) return 1;
  return 0;
}

export function buildPlayerBody(videoId, client) {
  return {
    context: {
      client: {
        clientName: client.name,
        clientVersion: client.clientVersion,
        ...client.extra,
      },
    },
    videoId,
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: 20000,
        contentCheckOk: true,
        racyCheckOk: true,
      },
    },
  };
}

export async function fetchPlayer(videoId, client, fetchImpl) {
  const impl = fetchImpl || fetch;
  const res = await impl(`${WEB_BASE}/player?key=${INNER_TUBE_KEY}&prettyPrint=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPlayerBody(videoId, client)),
  });
  if (!res.ok) {
    const err = new Error(`Player request failed (${res.status})`);
    err.code = res.status;
    throw err;
  }
  return res.json();
}

export function countDirectVideo(player) {
  const sd = (player && player.streamingData) || {};
  return [...(sd.formats || []), ...(sd.adaptiveFormats || [])].filter(
    (f) => isVideo(f) && isDirectUrl(f),
  ).length;
}

export function cipherStats(player) {
  const sd = (player && player.streamingData) || {};
  const muxed = sd.formats || [];
  const adaptive = (sd.adaptiveFormats || []).filter(isVideo);
  return {
    muxedPlayable: muxed.filter(isDirectUrl).length,
    muxedTotal: muxed.length,
    dashPlayable: adaptive.filter(isDirectUrl).length,
    ciphered: adaptive.filter((f) => !isDirectUrl(f) && f.signatureCipher).length,
    total: adaptive.length,
  };
}

/**
 * First usable player across ANDROID -> IOS -> WEB. A player is usable when
 * playabilityStatus.status === 'OK' and it carries >=1 direct-url video.
 * Returns { player, clientName } or throws a user-facing Error.
 */
export async function fetchPlayerWithFallback(videoId, fetchImpl) {
  let lastStatus = null;
  let lastReason = '';
  for (const client of PLAYER_CLIENTS) {
    let player = null;
    try {
      player = await fetchPlayer(videoId, client, fetchImpl);
    } catch {
      continue; // transport error -> next client
    }
    const status = player && player.playabilityStatus && player.playabilityStatus.status;
    lastStatus = status || 'UNKNOWN';
    lastReason =
      (player && player.playabilityStatus && player.playabilityStatus.reason) || '';
    if (status !== 'OK') continue;
    if (countDirectVideo(player) > 0) return { player, clientName: client.name };
  }
  throw friendlyPlayabilityError(lastStatus, lastReason);
}

export function friendlyPlayabilityError(status, reason) {
  const r = String(reason || '').slice(0, 160);
  switch (status) {
    case 'LOGIN_REQUIRED':
      return new Error(
        'YouTube asked for sign-in on this network. Try again on a different connection (your home Wi-Fi works best).' +
          (r ? ` (${r})` : ''),
      );
    case 'AGE_CHECK_REQUIRED':
    case 'AGE_VERIFICATION_REQUIRED':
      return new Error('This video is age-restricted and needs a signed-in session. It cannot be downloaded anonymously.');
    case 'PRIVATE':
      return new Error('This video is private.');
    case 'UNPLAYABLE':
      return new Error(`This video cannot be played anonymously. ${r}`.trim());
    case 'LIVE_STREAM_OFFLINE':
      return new Error('This livestream is offline or has ended.');
    default:
      return new Error(
        r
          ? `YouTube refused this video (${r}).`
          : 'YouTube returned no playable streams for this video. It may be restricted or region-blocked.',
      );
  }
}

/** Distinct sorted playable video heights (muxed + adaptive). Never faked. */
export function probeHeights(player) {
  const sd = (player && player.streamingData) || {};
  const heights = [...(sd.formats || []), ...(sd.adaptiveFormats || [])]
    .filter((f) => isVideo(f) && isDirectUrl(f))
    .map(heightOf)
    .filter((h) => h > 0);
  return [...new Set(heights)].sort((a, b) => a - b);
}

/** Best muxed (progressive A+V) at or below maxHeight. Null when absent. */
export function muxedAtOrBelow(player, maxHeight) {
  const formats = ((player && player.streamingData && player.streamingData.formats) || []).filter(
    (f) => isVideo(f) && isDirectUrl(f),
  );
  if (!formats.length) return null;
  const atOrBelow = formats
    .filter((f) => heightOf(f) <= maxHeight)
    .sort(
      (a, b) =>
        compatScore(b) - compatScore(a) ||
        heightOf(b) - heightOf(a) ||
        bitrateOf(b) - bitrateOf(a),
    );
  if (atOrBelow.length) return atOrBelow[0];
  // Nothing at/below ceiling: do NOT silently upscale. Only allow the
  // smallest playable when the ceiling sits below everything (e.g. 240p
  // requested on a 360p-only video) so SD still works.
  const min = [...formats].sort((a, b) => heightOf(a) - heightOf(b))[0];
  if (heightOf(min) > maxHeight) return null;
  return min;
}

/**
 * Best DASH video at or below ceiling. codecPref 'compat' prefers
 * mp4/avc1 (plays everywhere, muxes cleanly); 'efficient' takes highest
 * bitrate regardless of codec (may yield VP9/webm video-only).
 */
export function adaptiveVideoAtOrBelow(player, ceiling, codecPref = 'compat') {
  const adaptive =
    (player && player.streamingData && player.streamingData.adaptiveFormats) || [];
  const cands = adaptive.filter(
    (f) => isVideo(f) && isDirectUrl(f) && heightOf(f) > 0 && heightOf(f) <= ceiling,
  );
  if (!cands.length) return null;
  const sorted = [...cands].sort((a, b) => {
    if (codecPref === 'compat' && compatScore(b) !== compatScore(a)) {
      return compatScore(b) - compatScore(a);
    }
    return (
      heightOf(b) - heightOf(a) ||
      bitrateOf(b) - bitrateOf(a)
    );
  });
  return sorted[0];
}

/** Highest-bitrate direct audio; prefers m4a/AAC for clean mp4 merges. */
export function bestAudio(player, preferM4a = true) {
  const adaptive =
    (player && player.streamingData && player.streamingData.adaptiveFormats) || [];
  const audios = adaptive.filter((f) => isAudio(f) && isDirectUrl(f));
  if (!audios.length) return null;
  if (!preferM4a) {
    return [...audios].sort((a, b) => bitrateOf(b) - bitrateOf(a))[0];
  }
  const m4a = audios.filter((f) => String(f.mimeType).includes('audio/mp4'));
  const pool = m4a.length ? m4a : audios;
  return [...pool].sort((a, b) => bitrateOf(b) - bitrateOf(a))[0];
}

/** Top-N audio rows for the picker (direct URLs only). */
export function listAudioChoices(player, limit = 3) {
  const adaptive =
    (player && player.streamingData && player.streamingData.adaptiveFormats) || [];
  return adaptive
    .filter((f) => isAudio(f) && isDirectUrl(f))
    .sort((a, b) => bitrateOf(b) - bitrateOf(a))
    .slice(0, limit);
}

function pickThumb(videoDetails, videoId) {
  const thumbs =
    (videoDetails && videoDetails.thumbnail && videoDetails.thumbnail.thumbnails) || [];
  const best = [...thumbs].sort(
    (a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0),
  )[0];
  return (
    (best && best.url) || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  );
}

export function listCaptions(player) {
  try {
    const tracks =
      (player &&
        player.captions &&
        player.captions.playerCaptionsTracklistRenderer &&
        player.captions.playerCaptionsTracklistRenderer.captionTracks) ||
      [];
    return tracks
      .filter((t) => t && t.baseUrl)
      .map((t) => ({
        lang: t.languageCode || 'und',
        name: (t.name && t.name.runs && t.name.runs[0] && t.name.runs[0].text) || t.languageCode || 'subtitle',
        baseUrl: t.baseUrl,
      }));
  } catch {
    return [];
  }
}

/**
 * Build the honest quality ladder. Merged rows cap at 1080p H264 (no
 * re-encode in browser). Higher source heights surface as video-only.
 */
export function buildLadder(player, videoId, codecPref = 'compat') {
  const heights = probeHeights(player);
  const maxH = heights.length ? heights[heights.length - 1] : 0;
  const MERGE_CAPS = [240, 360, 480, 720, 1080].filter((h) => h <= Math.max(maxH, 1080));
  const merged = [];
  for (const h of MERGE_CAPS) {
    const muxed = muxedAtOrBelow(player, h);
    if (muxed && heightOf(muxed) === h) {
      merged.push({ height: h, kind: 'muxed', video: muxed, audio: null, needsMerge: false });
      continue;
    }
    const video = adaptiveVideoAtOrBelow(player, h, codecPref);
    const audio = bestAudio(player, true);
    if (video && audio && heightOf(video) === h) {
      merged.push({ height: h, kind: 'adaptive', video, audio, needsMerge: true });
    } else if (video && audio && heightOf(video) < h) {
      // No exact rung at h: the lower rung already covers it, skip to
      // avoid duplicate rows for the same file.
      continue;
    }
  }
  const videoOnly = heights
    .filter((h) => h > 1080)
    .map((h) => ({
      height: h,
      kind: 'video-only',
      video: adaptiveVideoAtOrBelow(player, h, codecPref),
      audio: null,
      needsMerge: false,
    }))
    .filter((r) => r.video && heightOf(r.video) === r.height);

  const vd = (player && player.videoDetails) || {};
  return {
    videoId,
    title: vd.title || `YouTube video ${videoId}`,
    author: vd.author || null,
    duration: Number(vd.lengthSeconds) || null,
    thumbnail: pickThumb(vd, videoId),
    heights,
    maxHeight: maxH,
    merged,
    videoOnly,
    audios: listAudioChoices(player, 3),
    captions: listCaptions(player),
  };
}
