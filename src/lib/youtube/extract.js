/**
 * YouTube extraction chain (all on-device, $0 server cost):
 *   1. Direct Innertube (freshest, no third party) across 5 player clients.
 *   2. Invidious community instances (CORS-enabled API for third parties).
 *
 * Every source yields the same Innertube-shaped player, so ladder building,
 * downloading and merging downstream are source-agnostic. Returns
 * { player, source } where source names the winner for diagnostics.
 */
import { fetchPlayerWithFallback } from './innertube.js';
import { INVIDIOUS_INSTANCES, fetchInvidiousFrom } from './invidious.js';

export async function extractYouTube(videoId, { fetchImpl, instances } = {}) {
  let lastErr = null;
  try {
    const { player, clientName } = await fetchPlayerWithFallback(videoId, fetchImpl);
    return { player, source: `device:${clientName}` };
  } catch (e) {
    lastErr = e;
  }
  const pool = Array.isArray(instances) && instances.length ? instances : INVIDIOUS_INSTANCES;
  for (const inst of pool) {
    try {
      const player = await fetchInvidiousFrom(inst, videoId, fetchImpl);
      const usable =
        (player.streamingData.formats.length || 0) +
        (player.streamingData.adaptiveFormats.length || 0);
      if (!usable) continue;
      return { player, source: `invidious:${new URL(inst).hostname}` };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    'YouTube extraction failed on this network: neither on-device ' +
      'players nor community instances returned streams. ' +
      `Last error: ${(lastErr && lastErr.message) || 'unknown'}`,
  );
}
