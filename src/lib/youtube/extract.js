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
import { probeYouTubeReachability } from './diagnose.js';

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
  throw await diagnosedFailure(videoId, lastErr, fetchImpl);
}

/**
 * Total failure -> run the reachability probe so the UI can tell
 * "your connection blocks YouTube" apart from "YouTube refused streams".
 * The probe result (and any public metadata) rides on the thrown error.
 */
async function diagnosedFailure(videoId, lastErr, fetchImpl) {
  let probe = { reachable: false, meta: null };
  try {
    probe = await probeYouTubeReachability(videoId, fetchImpl);
  } catch {
    probe = { reachable: false, meta: null };
  }
  if (probe.reachable) {
    const err = new Error(
      'YouTube answered about this video but refused every anonymous stream ' +
        'request from this connection. Try mobile data or another network — ' +
        'some connections are treated as bots no matter the client. ' +
        `Last error: ${(lastErr && lastErr.message) || 'unknown'}`,
    );
    err.code = 'STREAMS_REFUSED';
    err.meta = probe.meta;
    return err;
  }
  const err = new Error(
    'This connection blocked the request before YouTube even answered ' +
      '(VPN, ad-blocker, antivirus, or restricted/DNS-filtered Wi-Fi usually ' +
      'do this). Turn those off or switch to mobile data, then retry. ' +
      `Last error: ${(lastErr && lastErr.message) || 'unknown'}`,
  );
  err.code = 'NETWORK_BLOCKED';
  err.meta = null;
  return err;
}
