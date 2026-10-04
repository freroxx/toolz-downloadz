/**
 * Connectivity self-diagnosis — ends the guessing loop.
 *
 * When every extraction source fails, one question decides everything:
 * does this browser/network reach YouTube's API surface AT ALL? The oEmbed
 * endpoint is perfect for this: same host as the failing calls, public, and
 * proven CORS-friendly (200 + Access-Control-Allow-Origin on success).
 *
 * - oEmbed reachable  -> the network is fine; YouTube refused anonymous
 *   STREAMS specifically (STREAMS_REFUSED). Retrying here is pointless;
 *   another connection may work.
 * - oEmbed blocked too -> something on this connection (VPN, ad-blocker,
 *   antivirus MITM, restricted/DNS-filtered Wi-Fi) kills YouTube API calls
 *   before they complete (NETWORK_BLOCKED). Fix the connection, then retry.
 */
export async function probeYouTubeReachability(videoId, fetchImpl) {
  const impl = fetchImpl || fetch;
  try {
    const res = await impl(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
    );
    if (!res.ok) return { reachable: false, meta: null };
    const j = await res.json();
    return {
      reachable: true,
      meta: {
        title: j.title || null,
        author: j.author_name || null,
        authorUrl: j.author_url || null,
        thumbnail: j.thumbnail_url || null,
      },
    };
  } catch {
    return { reachable: false, meta: null };
  }
}
