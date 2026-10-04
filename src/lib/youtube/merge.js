/**
 * In-browser remux — JS port of YtVideoMerge.mux (toolz Android).
 *
 * Uses @ffmpeg/ffmpeg@0.11.6 (createFFmpeg API) with the SINGLE-THREADED
 * core-st 0.11.1 bundle from jsDelivr. ST needs no SharedArrayBuffer, so no
 * COOP/COEP headers that would break Next.js + third-party scripts.
 * Video is never re-encoded (-c:v copy, seconds); audio normalizes to AAC.
 */

export const CORE_ST_BASE =
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.1/dist/umd';
export const CORE_JS_URL = `${CORE_ST_BASE}/ffmpeg-core.js`;
export const CORE_WASM_URL = `${CORE_ST_BASE}/ffmpeg-core.wasm`;

// Practical in-browser merge caps (WASM 2GB hard ceiling; phones die sooner).
export const DESKTOP_MERGE_LIMIT = 800 * 1024 * 1024;
export const MOBILE_MERGE_LIMIT = 350 * 1024 * 1024;

export function isProbablyMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

export function mergeLimit() {
  return isProbablyMobile() ? MOBILE_MERGE_LIMIT : DESKTOP_MERGE_LIMIT;
}

/** Throws SIZE_TOO_LARGE when the pair cannot be merged in-browser. */
export function assertMergeable(videoBytes, audioBytes, limit) {
  const cap = limit || mergeLimit();
  if (videoBytes + audioBytes > cap) {
    const err = new Error(
      'This quality is too large to merge in the browser on this device. Download video-only instead.',
    );
    err.code = 'SIZE_TOO_LARGE';
    throw err;
  }
}

/** Parity with Android: -c:v copy -c:a aac -b:a 160k +faststart -shortest. */
export function buildMuxArgs(videoName = 'video.mp4', audioName = 'audio.m4a', outName = 'out.mp4') {
  return [
    '-i', videoName,
    '-i', audioName,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-movflags', '+faststart',
    '-shortest',
    '-y', outName,
  ];
}

/** Audio conversion (MP3/OGG/WAV/FLAC rows). Transcodes audio only. */
export function buildAudioConvertArgs(inName = 'audio.m4a', outName = 'out.mp3', format = 'mp3', bitrate = '160k') {
  if (format === 'mp3') return ['-i', inName, '-c:a', 'libmp3lame', '-b:a', bitrate, '-y', outName];
  if (format === 'ogg') return ['-i', inName, '-c:a', 'libvorbis', '-b:a', bitrate, '-y', outName];
  if (format === 'wav') return ['-i', inName, '-c:a', 'pcm_s16le', '-y', outName];
  if (format === 'flac') return ['-i', inName, '-c:a', 'flac', '-y', outName];
  // m4a: remux/normalize to AAC without fuss
  return ['-i', inName, '-c:a', 'aac', '-b:a', bitrate, '-y', outName];
}

let ffmpegInstance = null;
let ffmpegLoading = null;

async function loadFfmpeg() {
  if (ffmpegInstance && ffmpegInstance.isLoaded && ffmpegInstance.isLoaded()) {
    return ffmpegInstance;
  }
  if (ffmpegLoading) return ffmpegLoading;
  ffmpegLoading = (async () => {
    const { createFFmpeg } = await import('@ffmpeg/ffmpeg');
    const ffmpeg = createFFmpeg({
      mainName: 'main',
      corePath: CORE_JS_URL,
      logger: () => {},
    });
    await ffmpeg.load();
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();
  try {
    return await ffmpegLoading;
  } finally {
    ffmpegLoading = null;
  }
}

/**
 * Mux video-only + audio-only bytes into one MP4. onProgress(0..1) covers
 * the mux phase only (callers map it to 0.84..1.0 like Android).
 */
export async function muxToMp4(videoBytes, audioBytes, { onProgress, signal } = {}) {
  assertMergeable(videoBytes.length, audioBytes.length);
  const { fetchFile } = await import('@ffmpeg/ffmpeg');
  const ffmpeg = await loadFfmpeg();
  if (signal && signal.aborted) {
    const err = new Error('Cancelled');
    err.code = 'CANCELLED';
    throw err;
  }
  ffmpeg.setProgress(({ ratio }) => {
    if (onProgress && Number.isFinite(ratio)) onProgress(Math.min(1, Math.max(0, ratio)));
  });
  ffmpeg.FS('writeFile', 'video.mp4', await fetchFile(videoBytes));
  ffmpeg.FS('writeFile', 'audio.m4a', await fetchFile(audioBytes));
  try {
    await ffmpeg.run(...buildMuxArgs());
  } finally {
    try { ffmpeg.FS('unlink', 'video.mp4'); } catch { /* best-effort */ }
    try { ffmpeg.FS('unlink', 'audio.m4a'); } catch { /* best-effort */ }
  }
  const out = ffmpeg.FS('readFile', 'out.mp4');
  try { ffmpeg.FS('unlink', 'out.mp4'); } catch { /* best-effort */ }
  if (!out || out.length < 1024) throw new Error('Merging failed — the output file is empty.');
  if (onProgress) onProgress(1);
  return out;
}

/** Transcode audio bytes to mp3/ogg/wav/flac/m4a. Returns raw bytes. */
export async function convertAudio(audioBytes, format = 'mp3', bitrate = '160k', { onProgress } = {}) {
  const { fetchFile } = await import('@ffmpeg/ffmpeg');
  const ffmpeg = await loadFfmpeg();
  const ext = format === 'm4a' ? 'm4a' : format;
  const outName = `out.${ext}`;
  ffmpeg.setProgress(({ ratio }) => {
    if (onProgress && Number.isFinite(ratio)) onProgress(Math.min(1, Math.max(0, ratio)));
  });
  ffmpeg.FS('writeFile', 'audio_in', await fetchFile(audioBytes));
  await ffmpeg.run(...buildAudioConvertArgs('audio_in', outName, format, bitrate));
  const out = ffmpeg.FS('readFile', outName);
  try { ffmpeg.FS('unlink', 'audio_in'); } catch { /* best-effort */ }
  try { ffmpeg.FS('unlink', outName); } catch { /* best-effort */ }
  if (!out || out.length < 1024) throw new Error('Audio conversion failed.');
  if (onProgress) onProgress(1);
  return out;
}

export function terminateMerge() {
  try {
    if (ffmpegInstance && ffmpegInstance.exit) ffmpegInstance.exit();
  } catch { /* best-effort */ }
  ffmpegInstance = null;
}
