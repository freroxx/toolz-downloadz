'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { extractVideoId, sanitizeYouTubeUrl } from '@/lib/youtube/url';
import {
  buildLadder,
  fetchPlayerWithFallback,
} from '@/lib/youtube/innertube';
import {
  downloadToBytes,
  formatBytes,
  sanitizeFilename,
  triggerBlobDownload,
  triggerDirectDownload,
} from '@/lib/youtube/fetch';
import { convertAudio, muxToMp4 } from '@/lib/youtube/merge';

const fmtDur = (s) =>
  !s ? null : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function rowLabel(row) {
  if (row.kind === 'muxed') return `${row.height}p · ready file`;
  if (row.kind === 'adaptive') return `${row.height}p · merges on device`;
  return `${row.height}p · no sound`;
}

export default function YouTubePanel({ url }) {
  const [phase, setPhase] = useState('extracting');
  const [ladder, setLadder] = useState(null);
  const [error, setError] = useState('');
  const [height, setHeight] = useState(720);
  const [mode, setMode] = useState('merged'); // merged | video | audio
  const [audioFormat, setAudioFormat] = useState('m4a'); // m4a | mp3 | ogg | wav | flac
  const [codecPref, setCodecPref] = useState('compat');
  const [progress, setProgress] = useState(null); // {label, ratio}
  const abortRef = useRef(null);
  const urlsRef = useRef([]);

  const videoId = useMemo(() => {
    try {
      return extractVideoId(sanitizeYouTubeUrl(url));
    } catch {
      return null;
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase('extracting');
    setError('');
    setLadder(null);
    setProgress(null);

    (async () => {
      try {
        const clean = sanitizeYouTubeUrl(url);
        const id = extractVideoId(clean);
        if (!id) throw new Error('Could not find a video id in that link.');
        const { player } = await fetchPlayerWithFallback(id);
        if (cancelled || ctrl.signal.aborted) return;
        const lad = buildLadder(player, id, codecPref);
        if (!lad.merged.length && !lad.videoOnly.length && !lad.audios.length) {
          throw new Error('YouTube returned no downloadable streams for this video.');
        }
        setLadder(lad);
        const mergedHeights = lad.merged.map((r) => r.height);
        const def = mergedHeights.filter((h) => h <= 720).pop()
          ?? mergedHeights[mergedHeights.length - 1]
          ?? lad.maxHeight;
        setHeight(def);
        setMode(lad.merged.length ? 'merged' : lad.videoOnly.length ? 'video' : 'audio');
        setPhase('ready');
      } catch (e) {
        if (cancelled || ctrl.signal.aborted) return;
        setError(e.message || 'Extraction failed.');
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, codecPref]);

  useEffect(() => () => {
    urlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
    abortRef.current?.abort();
  }, []);

  const selectedMerged = ladder?.merged.find((r) => r.height === height) || null;
  const selectedVideoOnly = ladder?.videoOnly.find((r) => r.height === height) || null;
  const effectiveRow = mode === 'video' ? selectedVideoOnly : selectedMerged;

  const startDownload = async () => {
    if (!ladder || phase === 'working') return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase('working');
    setError('');
    const base = sanitizeFilename(ladder.title);
    try {
      if (mode === 'audio') {
        const track = ladder.audios[0];
        if (!track) throw new Error('No audio stream available.');
        if (audioFormat === 'm4a') {
          setProgress({ label: 'Starting audio download…', ratio: 0.1 });
          triggerDirectDownload(track.url, `${base} (audio).m4a`);
          setProgress({ label: 'Audio started.', ratio: 1 });
        } else {
          setProgress({ label: 'Fetching audio…', ratio: 0.1 });
          const { bytes } = await downloadToBytes(track.url, {
            signal: ctrl.signal,
            onProgress: (p) => setProgress({ label: `Fetching audio… ${Math.round(p * 100)}%`, ratio: 0.1 + p * 0.5 }),
          });
          setProgress({ label: `Converting to ${audioFormat.toUpperCase()}…`, ratio: 0.65 });
          const out = await convertAudio(bytes, audioFormat, audioFormat === 'mp3' ? '160k' : '160k', {
            onProgress: (p) => setProgress({ label: `Converting… ${Math.round(p * 100)}%`, ratio: 0.65 + p * 0.34 }),
          });
          const blob = new Blob([out], { type: 'audio/mpeg' });
          const u = triggerBlobDownload(blob, `${base} (audio).${audioFormat}`);
          urlsRef.current.push(u);
          setProgress({ label: 'Audio ready.', ratio: 1 });
        }
        setPhase('ready');
        return;
      }

      if (mode === 'video') {
        const row = selectedVideoOnly;
        if (!row) throw new Error('That quality is not available as video-only.');
        setProgress({ label: 'Starting video download…', ratio: 0.1 });
        triggerDirectDownload(row.video.url, `${base} (${row.height}p, no sound).mp4`);
        setProgress({ label: 'Video started.', ratio: 1 });
        setPhase('ready');
        return;
      }

      // merged mode
      const row = selectedMerged;
      if (!row) throw new Error('That quality is not available merged. Try video-only.');
      if (!row.needsMerge) {
        setProgress({ label: 'Starting download…', ratio: 0.2 });
        triggerDirectDownload(row.video.url, `${base} (${row.height}p).mp4`);
        setProgress({ label: 'Download started.', ratio: 1 });
        setPhase('ready');
        return;
      }
      setProgress({ label: `Fetching video…`, ratio: 0.02 });
      const { bytes: vBytes } = await downloadToBytes(row.video.url, {
        signal: ctrl.signal,
        onProgress: (p) => setProgress({ label: `Fetching video… ${Math.round(p * 100)}%`, ratio: 0.02 + p * 0.55 }),
      });
      if (ctrl.signal.aborted) throw Object.assign(new Error('Cancelled'), { code: 'CANCELLED' });
      setProgress({ label: 'Fetching audio…', ratio: 0.57 });
      const { bytes: aBytes } = await downloadToBytes(row.audio.url, {
        signal: ctrl.signal,
        onProgress: (p) => setProgress({ label: `Fetching audio… ${Math.round(p * 100)}%`, ratio: 0.57 + p * 0.25 }),
      });
      if (ctrl.signal.aborted) throw Object.assign(new Error('Cancelled'), { code: 'CANCELLED' });
      setProgress({ label: 'Merging on your device…', ratio: 0.84 });
      const out = await muxToMp4(vBytes, aBytes, {
        signal: ctrl.signal,
        onProgress: (p) => setProgress({ label: `Merging… ${Math.round(p * 100)}%`, ratio: 0.84 + p * 0.16 }),
      });
      const blob = new Blob([out], { type: 'video/mp4' });
      const u = triggerBlobDownload(blob, `${base} (${row.height}p).mp4`);
      urlsRef.current.push(u);
      setProgress({ label: 'Done — merged on your device.', ratio: 1 });
      setPhase('ready');
    } catch (e) {
      if (e.code === 'CANCELLED' || e.name === 'AbortError') {
        setProgress(null);
        setPhase('ready');
        return;
      }
      setError(e.message || 'Download failed.');
      setPhase('ready');
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setProgress(null);
    setPhase(ladder ? 'ready' : 'extracting');
  };

  const downloadSubtitle = async (track) => {
    try {
      const res = await fetch(`${track.baseUrl}&fmt=vtt`);
      if (!res.ok) throw new Error(`Subtitle fetch failed (${res.status})`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/vtt' });
      const u = triggerBlobDownload(blob, `${sanitizeFilename(ladder.title)} (${track.lang}).vtt`);
      urlsRef.current.push(u);
    } catch (e) {
      setError(e.message);
    }
  };

  if (phase === 'extracting') {
    return (
      <div className="w-full space-y-4 animate-[fadein_.3s_ease]">
        <div className="aspect-video rounded-[2rem] bg-surface-container-high animate-pulse grid place-items-center text-sm font-bold text-surface-on-variant/60">
          Extracting on your device…
        </div>
        <div className="h-10 w-3/4 rounded-2xl bg-surface-container-high animate-pulse" />
        <button onClick={cancel} className="px-6 py-2.5 rounded-full bg-surface-container-highest text-sm font-bold border border-outline-variant/20">Cancel</button>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="w-full p-8 rounded-[2rem] bg-error-container text-error-onContainer text-center space-y-4 animate-[fadein_.3s_ease]">
        <div className="text-4xl">⚠</div>
        <h3 className="font-black text-xl">Couldn&apos;t extract that YouTube link</h3>
        <p className="text-sm opacity-80 break-words">{error}</p>
        <p className="text-xs opacity-60">Extraction runs on your own connection — home Wi-Fi works best. Age-restricted, private, or region-blocked videos cannot be downloaded anonymously.</p>
      </div>
    );
  }

  if (!ladder) return null;

  return (
    <div className="w-full rounded-[2rem] overflow-hidden bg-surface-container border border-outline-variant/10 shadow-xl animate-[fadein_.35s_ease]">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-1/2 aspect-video relative bg-surface-container-high">
          {ladder.thumbnail ? <img src={ladder.thumbnail} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-5xl">🎬</div>}
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow bg-red-600 text-white">YouTube · on-device</span>
          {fmtDur(ladder.duration) && (
            <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur text-white text-xs font-black">{fmtDur(ladder.duration)}</span>
          )}
        </div>
        <div className="sm:w-1/2 p-6 flex flex-col gap-3 justify-center bg-surface-container-high/40">
          <h2 className="font-black text-lg leading-snug line-clamp-3">{ladder.title}</h2>
          {ladder.author && <p className="text-primary font-bold text-sm">{ladder.author}</p>}
          <p className="text-xs font-bold text-surface-on-variant/60">Max source: {ladder.maxHeight ? `${ladder.maxHeight}p` : 'unknown'} · merges cap at 1080p (no re-encode)</p>
        </div>
      </div>

      <div className="px-4 pt-3 flex gap-2 flex-wrap" role="group" aria-label="Download type">
        {[{ v: 'merged', label: 'Video' }, { v: 'video', label: 'Video-only' }, { v: 'audio', label: 'Audio' }].map((m) => (
          <button key={m.v} onClick={() => setMode(m.v)}
            className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition ${mode === m.v ? 'bg-primary text-primary-on shadow' : 'bg-surface-container-highest border border-outline-variant/20 hover:bg-primary/10'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {mode !== 'audio' && ladder.merged.length > 0 && (
        <div className="px-4 pt-3 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-surface-on-variant/50">
            {mode === 'merged' ? 'Quality · merged with sound' : 'Quality'}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
            {(mode === 'merged' ? ladder.merged : [...ladder.merged, ...ladder.videoOnly]).map((r) => (
              <button key={`${r.kind}-${r.height}`} onClick={() => setHeight(r.height)}
                title={rowLabel(r)}
                className={`px-3 py-2.5 rounded-xl border-2 text-center transition ${height === r.height ? 'bg-primary text-primary-on border-primary shadow' : 'bg-surface-bright border-outline-variant/15 hover:border-primary/40'}`}>
                <div className="font-black text-sm truncate">{r.height}p</div>
                <div className="text-[9px] font-bold opacity-60 truncate">{r.needsMerge ? 'merges on device' : r.kind === 'video-only' ? 'no sound' : 'ready file'}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'video' && ladder.videoOnly.length > 0 && (
        <div className="px-4 pt-3 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-surface-on-variant/50">High quality · video-only (no sound)</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
            {ladder.videoOnly.map((r) => (
              <button key={`vo-${r.height}`} onClick={() => setHeight(r.height)}
                className={`px-3 py-2.5 rounded-xl border-2 text-center transition ${height === r.height ? 'bg-primary text-primary-on border-primary shadow' : 'bg-surface-bright border-outline-variant/15 hover:border-primary/40'}`}>
                <div className="font-black text-sm truncate">{r.height}p</div>
                <div className="text-[9px] font-bold opacity-60 truncate">no sound</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'audio' && (
        <div className="px-4 pt-3 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-surface-on-variant/50">Audio format</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {['m4a', 'mp3', 'ogg', 'wav', 'flac'].map((f) => (
              <button key={f} onClick={() => setAudioFormat(f)}
                title={f === 'm4a' ? 'Direct, no conversion' : 'Converted on your device'}
                className={`px-3 py-2.5 rounded-xl border-2 text-center transition ${audioFormat === f ? 'bg-primary text-primary-on border-primary shadow' : 'bg-surface-bright border-outline-variant/15 hover:border-primary/40'}`}>
                <div className="font-black text-sm uppercase">{f}</div>
                <div className="text-[9px] font-bold opacity-60 truncate">{f === 'm4a' ? 'direct' : 'converted'}</div>
              </button>
            ))}
          </div>
          {ladder.audios[0] && (
            <p className="text-[10px] font-bold text-surface-on-variant/50">
              Source: {ladder.audios[0].mimeType?.split(';')[0]} · {(ladder.audios[0].bitrate / 1000).toFixed(0)} kbps{ladder.audios[0].contentLength ? ` · ${formatBytes(Number(ladder.audios[0].contentLength))}` : ''}
            </p>
          )}
        </div>
      )}

      <div className="px-4 pt-3 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-surface-on-variant/50">Options</p>
        <div className="flex gap-2 flex-wrap">
          <label className="text-xs font-bold flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-bright border border-outline-variant/15">
            Codec
            <select value={codecPref} onChange={(e) => setCodecPref(e.target.value)} className="bg-transparent font-black text-xs outline-none">
              <option value="compat">H.264 · plays everywhere</option>
              <option value="efficient">Smallest file</option>
            </select>
          </label>
          {ladder.captions.length > 0 && (
            <label className="text-xs font-bold flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-bright border border-outline-variant/15">
              Subtitles
              <select defaultValue="" onChange={(e) => { const t = ladder.captions.find((c) => c.lang === e.target.value); if (t) downloadSubtitle(t); e.target.value = ''; }} className="bg-transparent font-black text-xs outline-none max-w-32">
                <option value="" disabled>Download…</option>
                {ladder.captions.map((c) => <option key={c.lang} value={c.lang}>{c.name}</option>)}
              </select>
            </label>
          )}
          <button onClick={() => triggerDirectDownload(`https://img.youtube.com/vi/${ladder.videoId}/maxresdefault.jpg`, `${sanitizeFilename(ladder.title)} (cover).jpg`)}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-surface-bright border border-outline-variant/15 hover:border-primary/40 transition">
            Cover JPG ↓
          </button>
        </div>
        <p className="text-[10px] font-bold text-surface-on-variant/50">H.264 plays everywhere · 1080p merges video+audio on your device (no server, no cost) · 1440p+ is video-only</p>
      </div>

      {progress && (
        <div className="px-4 pt-3 space-y-2">
          <div className="h-3 rounded-full bg-surface-container-high overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((progress.ratio || 0) * 100)}%` }} />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold text-surface-on-variant/70">{progress.label}</p>
            {phase === 'working' && <button onClick={cancel} className="text-xs font-black text-error">Cancel</button>}
          </div>
        </div>
      )}

      {error && <p className="px-4 pt-2 text-xs font-bold text-error break-words">{error}</p>}

      <div className="p-4">
        <button onClick={startDownload} disabled={phase === 'working'}
          className="w-full py-4 rounded-2xl bg-primary text-primary-on font-black text-lg shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all">
          {phase === 'working' ? 'WORKING…' : mode === 'audio' ? <>DOWNLOAD AUDIO ↓ <span className="opacity-70 text-sm font-bold">{audioFormat.toUpperCase()}</span></> : <>DOWNLOAD ↓ <span className="opacity-70 text-sm font-bold">{height}P MP4</span></>}
        </button>
        {effectiveRow && mode !== 'audio' && (
          <p className="pt-2 text-center text-xs font-bold text-surface-on-variant/60">
            {height}p · {effectiveRow.needsMerge ? 'video + audio merged on your device' : effectiveRow.kind === 'video-only' ? 'video-only, no sound' : 'single file with sound'}
          </p>
        )}
      </div>
    </div>
  );
}
