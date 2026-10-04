/**
 * Invidious extraction fallback — community API built for third-party
 * clients (CORS-enabled, no key, plain GET so no preflight).
 *
 * Used only when direct on-device Innertube fails (YouTube now rejects
 * non-YouTube-origin player calls even from residential IPs). Instances run
 * extraction on THEIR servers; stream bytes still download straight from
 * googlevideo to the user, so this costs us $0 and no proxy bandwidth.
 *
 * Response shape: https://docs.invidious.io/api/#get-apiv1videosvideoid
 * formatStreams[] are muxed A+V, adaptiveFormats[] are split tracks —
 * both carry direct googlevideo URLs, mapped below into the exact
 * Innertube-shaped player our ladder builders already consume.
 */

export const INVIDIOUS_INSTANCES = [
  'https://yt.chocolatemoo53.com',
  'https://invidious.tiekoetter.com',
];

/** Height from the many label shapes Invidious emits. */
export function parseHeight(...cands) {
  for (const cand of cands) {
    if (cand == null) continue;
    const s = String(cand);
    let m = s.match(/(\d{3,4})\s*x\s*(\d{3,4})/); // 1280x720
    if (m) return Number(m[2]);
    m = s.match(/(\d{3,4})\s*p/i); // 720p
    if (m) return Number(m[1]);
    m = s.match(/(\d{3,4})$/); // hd720, hd1080 (Invidious quality, no "p")
    if (m) return Number(m[1]);
    if (/^\d{3,4}$/.test(s.trim())) return Number(s.trim());
  }
  return 0;
}

/**
 * Map an Invidious /api/v1/videos/:id payload to our Innertube-shaped
 * player: { playabilityStatus, streamingData: {formats, adaptiveFormats},
 * videoDetails, captions }. Only direct-URL rows survive (same honesty
 * rule as the Innertube path).
 */
export function mapInvidiousToPlayer(inv, videoId) {
  const formats = (inv.formatStreams || [])
    .filter((f) => typeof f.url === 'string' && f.url.startsWith('http'))
    .map((f) => ({
      itag: f.itag,
      url: f.url,
      mimeType: f.type || '',
      height: parseHeight(f.resolution, f.qualityLabel, f.quality),
      width: null,
      bitrate: Number(f.bitrate) || 0,
      qualityLabel: f.qualityLabel || f.quality || null,
    }));
  const adaptiveFormats = (inv.adaptiveFormats || [])
    .filter((f) => typeof f.url === 'string' && f.url.startsWith('http'))
    .map((f) => ({
      itag: f.itag,
      url: f.url,
      mimeType: f.type || '',
      height: parseHeight(f.resolution, f.size, f.qualityLabel, f.quality),
      width: null,
      bitrate: Number(f.bitrate) || 0,
      qualityLabel: f.qualityLabel || f.quality || null,
    }));
  const thumbs = inv.videoThumbnails || [];
  return {
    playabilityStatus: { status: 'OK' },
    streamingData: { formats, adaptiveFormats },
    videoDetails: {
      videoId,
      title: inv.title || `YouTube video ${videoId}`,
      author: inv.author || null,
      lengthSeconds: Number(inv.lengthSeconds) || null,
      // videoThumbnails [{url,width,height}] — innertube pickThumb consumes
      // this shape directly (best-area first, maxres fallback).
      thumbnail: { thumbnails: (thumbs || []).filter((t) => t && (t.url || '').startsWith('http')) },
    },
    captions: {
      playerCaptionsTracklistRenderer: {
        captionTracks: (inv.captions || [])
          .filter((c) => c && c.url)
          .map((c) => ({
            baseUrl: c.url,
            languageCode: c.languageCode || 'und',
            name: { runs: [{ text: c.label || c.languageCode || 'subtitle' }] },
          })),
      },
    },
  };
}

export async function fetchInvidiousFrom(instance, videoId, fetchImpl) {
  const impl = fetchImpl || fetch;
  const res = await impl(
    `${String(instance).replace(/\/$/, '')}/api/v1/videos/${encodeURIComponent(videoId)}?fields=title,author,lengthSeconds,formatStreams,adaptiveFormats,videoThumbnails,captions`,
  );
  if (!res.ok) {
    const err = new Error(`Invidious ${instance} answered ${res.status}`);
    err.code = res.status;
    throw err;
  }
  return mapInvidiousToPlayer(await res.json(), videoId);
}
