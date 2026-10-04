/**
 * Stream downloader — JS port of YtVideoMerge.downloadStream (toolz Android).
 *
 * Differences from Android: browsers forbid overriding User-Agent / Origin /
 * Referer in fetch(), so we send the browser's own headers. From a
 * residential IP that already passes — the Android-UA retry trick only
 * mattered for datacenter clients.
 */

export function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return 'size unknown';
  if (n >= 1 << 30) return (n / (1 << 30)).toFixed(2) + ' GB';
  if (n >= 1 << 20) return (n / (1 << 20)).toFixed(1) + ' MB';
  if (n >= 1 << 10) return (n / (1 << 10)).toFixed(0) + ' KB';
  return n + ' B';
}

/**
 * Fetch a URL fully into memory with progress reports (0..1).
 * Resolves to { bytes: Uint8Array, contentType }.
 * Rejects with HTTP_<code> on non-2xx, AbortError on cancel.
 */
export async function downloadToBytes(url, { onProgress, signal, fetchImpl } = {}) {
  const impl = fetchImpl || fetch;
  const res = await impl(url, { signal });
  if (!res.ok) {
    const err = new Error(`Download failed (HTTP ${res.status})`);
    err.code = `HTTP_${res.status}`;
    err.status = res.status;
    throw err;
  }
  const total = Number(res.headers && res.headers.get
    ? res.headers.get('Content-Length')
    : NaN);
  const hasTotal = Number.isFinite(total) && total > 0;

  // Fast path for mocked / non-streaming bodies (tests, small files).
  if (typeof res.arrayBuffer === 'function' && !res.body) {
    const buf = await res.arrayBuffer();
    if (onProgress) onProgress(1);
    return {
      bytes: new Uint8Array(buf),
      contentType: res.headers && res.headers.get
        ? res.headers.get('Content-Type')
        : null,
    };
  }
  if (typeof res.arrayBuffer === 'function' && res.body == null) {
    const buf = await res.arrayBuffer();
    if (onProgress) onProgress(1);
    return { bytes: new Uint8Array(buf), contentType: null };
  }

  const reader = res.body.getReader();
  const chunks = [];
  let done = 0;
  let lastEmit = 0;
  for (;;) {
    const { done: finished, value } = await reader.read();
    if (finished) break;
    chunks.push(value);
    done += value.length;
    const now = Date.now();
    if (onProgress && (now - lastEmit > 150 || !hasTotal)) {
      lastEmit = now;
      onProgress(hasTotal ? Math.min(1, done / total) : 0.5);
    }
  }
  const bytes = new Uint8Array(done);
  let off = 0;
  for (const c of chunks) {
    bytes.set(c, off);
    off += c.length;
  }
  if (onProgress) onProgress(1);
  return {
    bytes,
    contentType: res.headers && res.headers.get ? res.headers.get('Content-Type') : null,
  };
}

/** Plain navigation download (no CORS involved) for direct files. */
export function triggerDirectDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'media';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Blob download for merged/converted output. Returns the object URL. */
export function triggerBlobDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename || 'media';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return objectUrl;
}

export function sanitizeFilename(name) {
  const keep = String(name || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return keep || 'media';
}
