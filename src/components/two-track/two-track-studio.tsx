'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { CloudUpload, Download, FileAudio, Mic, Music2, Play, RefreshCw, Square, Upload } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAudio } from '@/components/audio/audio-provider';
import { AudioEngine, type BeatMode, type RecState, type Take } from '@/lib/two-track/engine';
import { TapTempo, estimateTempo } from '@/lib/two-track/analyze';
import { DRUMS, STEPS, defaultPattern, emptyPattern, sanitizePattern, type DrumId, type Pattern } from '@/lib/two-track/drums';
import { downloadBlob } from '@/lib/two-track/wav';
import { PRESETS, grooveFor } from '@/lib/two-track/presets';
import { bridgePayload, patternToMidi } from '@/lib/two-track/midi';
import { BEAT_KIND, BEAT_MIME, TAKE_KIND, TwoTrackRepository, beatMeta, takeMeta, type TwoTrackItem } from '@/lib/two-track/repository';
import { audioExt, fmtTime, peaksOf, safeTag } from '@/lib/two-track/audio-file';

const LS_KEY = 'musaix-studio:two-track:v1';

// Audioweaver palette (matches /studio) for <canvas> drawing.
const C = { bg: '#0b0b0a', grid: '#3c332b', fg: '#eee2cd', muted: '#8f7b67', amber: '#ffb26f', pad: '#b6ff83', ok: '#74ff67', warn: '#f0a765', danger: '#d94e4e' };

const btn = 'inline-flex items-center gap-1.5 rounded-md border border-[#5a4738] px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#ffb26f] transition hover:bg-[#ffb26f] hover:text-black disabled:pointer-events-none disabled:opacity-40';
const btnOn = 'border-[#ffb26f] bg-[#ffb26f] text-black';
const btnPrimary = 'border-[#ffb26f] bg-[#ffb26f] text-black hover:bg-[#ffd19d]';
const field = 'rounded-md border border-[#2d2927] bg-black/70 px-2 py-1 text-sm text-[#eee2cd] focus:border-[#ffb26f] focus:outline-none disabled:opacity-50';
const label = 'flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#cdb8a1]';
const range = 'accent-[#ffb26f]';
const panel = 'rounded-md border border-[#514334] bg-[#171514]/92 p-4';
const heading = 'text-sm font-black uppercase tracking-wide text-[#cdb8a1]';

interface LoadedBeat { buffer: AudioBuffer; name: string; blob: Blob; ext: string; savedId: string | null; peaks: Float32Array }
type CloudState = 'unconfigured' | 'signed-out' | 'signed-in';

function ctx2d(c: HTMLCanvasElement | null) {
  try { return c?.getContext('2d') ?? null; } catch { return null; }
}
function Check({ checked, onChange, children, title }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; title?: string }) {
  return <label className={label} title={title}><input type="checkbox" className={range} checked={checked} onChange={e => onChange(e.target.checked)} />{children}</label>;
}

export function TwoTrackStudio() {
  const audio = useAudio();
  const engineRef = useRef<AudioEngine | null>(null);
  const micLevel = useRef(0);
  const [pattern, setPattern] = useState<Pattern>(defaultPattern);
  const [bpm, setBpm] = useState(92);
  const [swing, setSwing] = useState(0);
  const [loopBars, setLoopBars] = useState(2);
  const [countIn, setCountIn] = useState(true);
  const [metro, setMetro] = useState(false);
  const [metroRec, setMetroRec] = useState(true);
  const [vol, setVol] = useState({ beat: 0.9, rec: 1, master: 0.9 });
  const [mute, setMute] = useState({ beat: false, rec: false });
  const [monitor, setMonitor] = useState(false);
  const [latency, setLatency] = useState(40);
  const [playing, setPlaying] = useState(false);
  const [recState, setRecState] = useState<RecState>('idle');
  const [status, setStatus] = useState('Ready');
  const [take, setTake] = useState<Take | null>(null);
  const [pos, setPos] = useState<{ step: number; bar: number }>({ step: -1, bar: 0 });
  const [micName, setMicName] = useState('');
  const [exportReps, setExportReps] = useState(2);
  const [busy, setBusy] = useState('');
  const [presetId, setPresetId] = useState('');
  const preset = PRESETS.find(x => x.preset_id === presetId);
  const [beatMode, setBeatMode] = useState<BeatMode>('seq');
  const [beat, setBeat] = useState<LoadedBeat | null>(null);
  const [beatBpm, setBeatBpm] = useState(90);
  const [beatOffset, setBeatOffset] = useState(0);
  const [loopStartBar, setLoopStartBar] = useState(0);
  const [beatLoop, setBeatLoop] = useState(true);
  const [beatInfo, setBeatInfo] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const tapper = useRef(new TapTempo());
  const fileInput = useRef<HTMLInputElement>(null);
  const beatWaveRef = useRef<HTMLCanvasElement>(null);
  const beatWaveImg = useRef<ImageData | null>(null);
  const beatDur = useRef(0);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const waveImg = useRef<ImageData | null>(null);
  const masterRef = useRef<HTMLCanvasElement>(null);
  const micRef = useRef<HTMLCanvasElement>(null);
  const audioMode = beatMode === 'audio' && !!beat;
  const recLocked = recState !== 'idle';
  const effBpm = audioMode ? beatBpm : bpm;

  // ---- cloud (existing Supabase client + owner-only catalog) ----
  const clientRef = useRef<SupabaseClient | null>(null);
  const mounted = useRef(true);
  const accountEpoch = useRef(0);
  const [cloud, setCloud] = useState<CloudState>(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'signed-out' : 'unconfigured');
  const [items, setItems] = useState<TwoTrackItem[]>([]);
  const [cloudMsg, setCloudMsg] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [takeName, setTakeName] = useState('');
  const [beatName, setBeatName] = useState('');
  const beats = items.filter(i => i.kind === BEAT_KIND);
  const takes = items.filter(i => i.kind === TAKE_KIND);

  // ---- engine lifecycle (AudioContext is created lazily on first Play/Rec) ----
  useEffect(() => {
    const eng = new AudioEngine({
      onStep: (step, bar) => setPos({ step, bar }),
      onTransport: p => setPlaying(p),
      onRecState: (s, info) => { setRecState(s); if (info) setStatus(info); else if (s === 'recording') setStatus('● Recording…'); },
      onTake: t => setTake(t),
      onMicLevel: p => { micLevel.current = p; },
      onError: m => setStatus(m),
    });
    engineRef.current = eng;
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (saved.pattern) setPattern(sanitizePattern(saved.pattern));
        if (typeof saved.bpm === 'number') setBpm(Math.max(40, Math.min(240, saved.bpm)));
      }
    } catch { /* ignore bad local state */ }
    return () => eng.dispose();
  }, []);

  useEffect(() => {
    mounted.current = true;
    let off: (() => void) | undefined;
    try {
      const client = createClient(); clientRef.current = client;
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        const epoch = ++accountEpoch.current;
        setItems([]); setCloud(session?.user ? 'signed-in' : 'signed-out');
        // Defer auth-dependent requests outside the auth callback lock.
        if (session?.user) void Promise.resolve().then(() => new TwoTrackRepository(client).list())
          .then(rows => { if (mounted.current && epoch === accountEpoch.current) setItems(rows); })
          .catch(e => { if (mounted.current && epoch === accountEpoch.current) setCloudMsg(e instanceof Error ? e.message : 'Library failed to load.'); });
      });
      off = () => data.subscription.unsubscribe();
    } catch { /* Cloud stays off when NEXT_PUBLIC_SUPABASE_* is not configured; local recording still works. */ }
    // The epoch counter deliberately invalidates in-flight work; it is not a DOM ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { mounted.current = false; ++accountEpoch.current; off?.(); };
  }, []);

  // push settings into the engine
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    e.pattern = pattern; e.bpm = effBpm; e.swing = swing; e.loopBars = loopBars;
    e.countIn = countIn; e.metronome = metro; e.clickWhileRec = metroRec;
    e.vol = vol; e.mute = mute; e.monitor = monitor;
    e.applyGains();
    try { localStorage.setItem(LS_KEY, JSON.stringify({ pattern, bpm })); } catch { /* storage full or blocked */ }
  }, [pattern, bpm, effBpm, swing, loopBars, countIn, metro, metroRec, vol, mute, monitor]);

  // beat source / tempo changes stop the transport (the tempo grid changes)
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    if (e.playing && e.recState === 'idle') { e.stop(); setStatus('Stopped (beat changed)'); }
    e.beatMode = beatMode;
    e.audioBeat = beat ? { buffer: beat.buffer, name: beat.name, bpm: beatBpm, offset: beatOffset, loopStartBar, loop: beatLoop } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatMode, beat?.buffer, beatBpm]);

  // region changes re-join live
  useEffect(() => {
    const e = engineRef.current; if (!e || !e.audioBeat) return;
    e.audioBeat.offset = beatOffset; e.audioBeat.loopStartBar = loopStartBar; e.audioBeat.loop = beatLoop;
    if (e.recState === 'idle') e.beatChanged();
  }, [beatOffset, loopStartBar, beatLoop, loopBars]);

  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    if (e.latencyMs !== latency) { e.latencyMs = latency; e.retrim(); }
  }, [latency]);

  // ---- beat waveform cache ----
  useEffect(() => {
    const c = beatWaveRef.current; const g = ctx2d(c); if (!c || !g) return;
    const W = c.width, H = c.height;
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    if (!beat) { beatWaveImg.current = null; beatDur.current = 0; return; }
    const dur = beat.buffer.duration; beatDur.current = dur;
    const barDur = (60 / beatBpm) * 4;
    const x = (t: number) => (t / dur) * W;
    const rs = beatOffset + (beatLoop ? loopStartBar * barDur : 0);
    const re = beatLoop ? rs + loopBars * barDur : dur;
    g.fillStyle = C.amber; g.globalAlpha = 0.14; g.fillRect(x(rs), 0, x(Math.min(re, dur)) - x(rs), H); g.globalAlpha = 1;
    g.strokeStyle = C.grid;
    for (let t = beatOffset, i = 0; t < dur && i < 2000; t += barDur, i++) {
      const px = Math.round(x(t)) + 0.5; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, H); g.stroke();
    }
    for (let i = 0; i < W; i++) {
      const t = (i / W) * dur; const inside = t >= rs && t < re;
      g.fillStyle = inside ? C.amber : C.muted; g.globalAlpha = inside ? 1 : 0.45;
      const mn = beat.peaks[i * 2], mx = beat.peaks[i * 2 + 1];
      g.fillRect(i, H / 2 - mx * H * 0.48, 1, Math.max(1, (mx - mn) * H * 0.48));
    }
    g.globalAlpha = 1;
    g.fillStyle = C.pad; g.fillRect(Math.floor(x(beatOffset)), 0, 2, H);
    beatWaveImg.current = g.getImageData(0, 0, W, H);
  }, [beat, beatBpm, beatOffset, loopStartBar, beatLoop, loopBars, beatMode]);

  // ---- take waveform cache ----
  useEffect(() => {
    const c = waveRef.current; const g = ctx2d(c); if (!c || !g) return;
    const W = c.width, H = c.height;
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    if (take) {
      g.strokeStyle = C.grid;
      for (let b = 0; b <= take.bars * 4; b++) {
        const x = Math.round((b / (take.bars * 4)) * W) + 0.5;
        g.globalAlpha = b % 4 === 0 ? 1 : 0.4; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
      }
      g.globalAlpha = 1;
      const d = take.buffer.getChannelData(0);
      const per = Math.max(1, Math.floor(d.length / W));
      g.fillStyle = C.pad;
      for (let x = 0; x < W; x++) {
        let mn = 0, mx = 0;
        for (let i = x * per; i < Math.min(d.length, (x + 1) * per); i++) { const v = d[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
        g.fillRect(x, H / 2 - mx * H * 0.48, 1, Math.max(1, (mx - mn) * H * 0.48));
      }
    }
    waveImg.current = g.getImageData(0, 0, W, H);
  }, [take]);

  // ---- animation loop: playheads + meters ----
  useEffect(() => {
    let raf = 0;
    const meter = (c: HTMLCanvasElement | null, v: number) => {
      const g = ctx2d(c); if (!c || !g) return;
      g.fillStyle = C.bg; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = v > 0.98 ? C.danger : v > 0.7 ? C.warn : C.ok; g.fillRect(0, 0, Math.min(1, v) * c.width, c.height);
    };
    const head = (c: HTMLCanvasElement | null, img: ImageData | null, p: number) => {
      const g = ctx2d(c); if (!c || !g || !img) return;
      g.putImageData(img, 0, 0);
      if (p >= 0) { g.fillStyle = C.fg; g.fillRect(Math.floor(p * c.width), 0, 2, c.height); }
    };
    const loop = () => {
      const e = engineRef.current;
      if (e?.ctx) {
        e.pollVisual();
        meter(masterRef.current, e.masterLevel());
        meter(micRef.current, micLevel.current);
        head(waveRef.current, waveImg.current, e.takePosition());
        const bp = e.beatPosition();
        head(beatWaveRef.current, beatWaveImg.current, bp >= 0 && beatDur.current ? bp / beatDur.current : -1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- transport ----
  const quietGlobalPlayer = () => { if (audio.status === 'playing' || audio.wantsPlayback) audio.pause(); };
  const togglePlay = async () => {
    const e = engineRef.current!;
    if (e.playing) { e.stop(); setStatus('Stopped'); }
    else { quietGlobalPlayer(); await e.play(0); setStatus('Playing'); }
  };
  const doRecord = async () => {
    const e = engineRef.current!;
    const first = !e.micReady;
    quietGlobalPlayer();
    await e.record();
    if (first && e.micReady) { setLatency(e.latencyMs); setMicName(m => m || 'Mic ready'); }
  };
  const enableMic = async () => {
    try {
      const name = await engineRef.current!.enableMic();
      setMicName(name); setLatency(engineRef.current!.latencyMs); setStatus('Mic enabled');
    } catch (err) { setStatus(`Mic error: ${(err as Error).message}`); }
  };
  const keys = useRef({ togglePlay, doRecord });
  useEffect(() => { keys.current = { togglePlay, doRecord }; });
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement | null;
      if (ev.metaKey || ev.ctrlKey || ev.altKey || el?.isContentEditable) return;
      if (el && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(el.tagName)) return;
      if (ev.code === 'Space') { ev.preventDefault(); void keys.current.togglePlay(); }
      else if (ev.key === 'r' || ev.key === 'R') { ev.preventDefault(); void keys.current.doRecord(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleCell = (id: DrumId, i: number) => setPattern(p => ({ ...p, [id]: p[id].map((v, j) => (j === i ? !v : v)) }));

  // ---- export ----
  const exportMix = async () => {
    setBusy('Rendering…');
    try {
      const blob = await engineRef.current!.renderMix(exportReps);
      downloadBlob(blob, `musaix-studio-mix-${audioMode ? safeTag(beat!.name) : 'beat'}-${effBpm}bpm.wav`);
      setBusy(`Exported ${(blob.size / 1e6).toFixed(1)} MB`);
    } catch (err) { setBusy(`Export failed: ${(err as Error).message}`); }
  };
  const applyPreset = (id: string) => {
    setPresetId(id);
    const pr = PRESETS.find(x => x.preset_id === id); if (!pr) return;
    const g = grooveFor(pr);
    setPattern(g.pattern); setSwing(g.swing); setBpm(Math.max(40, Math.min(220, pr.tempo)));
    setStatus(`Preset: ${pr.display_name} (${pr.tempo} BPM)`);
  };
  const fileBase = () => `musaix-${preset?.preset_id ?? 'beat'}-${bpm}bpm-${loopBars}bars`;
  const dlMidi = () => downloadBlob(patternToMidi(pattern, bpm, loopBars, swing), `${fileBase()}.mid`);
  const dlPayload = () => downloadBlob(new Blob([JSON.stringify(bridgePayload(pattern, bpm, loopBars, swing), null, 2)], { type: 'application/json' }), `${fileBase()}.payload.json`);
  const dlTake = () => { const b = engineRef.current!.takeWav(); if (b) downloadBlob(b, `musaix-take-${take?.bpm ?? effBpm}bpm-${take?.bars ?? loopBars}bars.wav`); };

  // ---- audio beat ----
  const analyze = (buf: AudioBuffer) => {
    const t0 = performance.now();
    const est = estimateTempo(buf);
    if (!est) { setBeatInfo("Couldn't detect tempo. Set BPM or tap."); return; }
    setBeatBpm(est.bpm); setBeatOffset(Math.round(est.offset * 1000) / 1000); setLoopStartBar(0);
    setBeatInfo(`Detected ${est.bpm} BPM, downbeat ≈ ${est.offset.toFixed(3)}s (confidence ${(est.confidence * 100).toFixed(0)}%, ${Math.round(performance.now() - t0)} ms). Check by ear: ×2 / ÷2 if it's double/half.`);
  };
  const loadBeatBlob = async (blob: Blob, name: string, opts?: { savedId?: string; bpm?: number; offset?: number; loopBars?: number | null }) => {
    const ext = audioExt({ name, type: blob.type });
    if (!ext) { setBeatInfo(`Unsupported file: ${name}. Use MP3, WAV, M4A, OGG or AAC.`); return false; }
    setBeatInfo(`Decoding ${name}…`);
    try {
      const buffer = await engineRef.current!.decodeFile(await blob.arrayBuffer());
      setBeat({ buffer, name, blob, ext, savedId: opts?.savedId ?? null, peaks: peaksOf(buffer) });
      setBeatMode('audio');
      setBeatName(name.replace(/\.[^.]+$/, '').slice(0, 120));
      if (opts?.bpm) {
        setBeatBpm(opts.bpm); setBeatOffset(opts.offset ?? 0); setLoopStartBar(0);
        if (opts.loopBars) { setBeatLoop(true); setLoopBars(opts.loopBars); }
        setBeatInfo(`Loaded ${name}: ${opts.bpm} BPM, downbeat ${(opts.offset ?? 0).toFixed(3)}s`);
      } else setTimeout(() => analyze(buffer), 0);
      return true;
    } catch (err) { setBeatInfo(`Couldn't decode ${name}: ${(err as Error).message}`); return false; }
  };
  const onFiles = (files: FileList | null) => { const f = files?.[0]; if (f && !recLocked) void loadBeatBlob(f, f.name); };
  const tap = () => { const v = tapper.current.tap(); if (v && v >= 40 && v <= 240) { setBeatBpm(v); setBeatInfo(`Tap tempo: ${v} BPM`); } };
  const setOffsetFromWave = (ev: MouseEvent<HTMLCanvasElement>) => {
    if (!beat || recLocked) return;
    const r = ev.currentTarget.getBoundingClientRect();
    const t = ((ev.clientX - r.left) / r.width) * beat.buffer.duration;
    if (ev.shiftKey && beatLoop) setLoopStartBar(Math.max(0, Math.floor((t - beatOffset) / ((60 / beatBpm) * 4))));
    else setBeatOffset(Math.max(0, Math.round(t * 1000) / 1000));
  };
  const songBars = beat ? Math.max(1, Math.ceil((beat.buffer.duration - beatOffset) / ((60 / beatBpm) * 4) - 0.01)) : 0;
  const maxLoopStart = Math.max(0, songBars - loopBars);

  // ---- cloud actions ----
  const repo = () => { if (!clientRef.current) throw new Error('Cloud library is not configured.'); return new TwoTrackRepository(clientRef.current); };
  const runCloud = async (msg: string, work: (r: TwoTrackRepository) => Promise<string | void>) => {
    if (cloudBusy) return;
    const epoch = accountEpoch.current;
    setCloudBusy(true); setCloudMsg(msg);
    try { const done = await work(repo()); if (mounted.current && epoch === accountEpoch.current && done) setCloudMsg(done); }
    catch (e) { if (mounted.current && epoch === accountEpoch.current) setCloudMsg(e instanceof Error ? e.message : 'Cloud request failed.'); }
    finally { if (mounted.current) setCloudBusy(false); }
  };
  const refresh = () => runCloud('Refreshing…', async r => { const rows = await r.list(); setItems(rows); return `${rows.length} item${rows.length === 1 ? '' : 's'} in your studio library`; });
  const saveBeat = () => runCloud('Uploading beat…', async r => {
    if (!beat) return;
    const row = await r.saveBeat(beat.blob, beat.ext, { title: beatName.trim() || beat.name, bpm: beatBpm, duration: Math.round(beat.buffer.duration * 1000) / 1000, offset: beatOffset, loopBars: beatLoop ? loopBars : null, filename: beat.name });
    setBeat(b => (b && b.blob === beat.blob ? { ...b, savedId: row.id } : b));
    setItems(cur => [{ ...row, kind: BEAT_KIND }, ...cur]);
    return 'Beat saved privately';
  });
  const saveTake = () => runCloud('Saving take…', async r => {
    const wav = engineRef.current?.takeWav(); if (!wav || !take) throw new Error('Record a take first. Patterns stay on this device (and export as MIDI).');
    const title = takeName.trim() || `${audioMode ? beat!.name.replace(/\.[^.]+$/, '') : preset?.display_name ?? 'Beat'} take`;
    const row = await r.saveTake(wav, { title, bpm: take.bpm, bars: take.bars, duration: take.buffer.duration, pattern, swing, beatMode: audioMode ? 'audio' : 'seq', beatTrackId: audioMode ? beat!.savedId : null, presetId: presetId || null });
    setItems(cur => [{ ...row, kind: TAKE_KIND }, ...cur]); setTakeName('');
    return `Take saved privately${audioMode ? (beat!.savedId ? ' · linked to beat' : ' · beat not saved, so not linked') : ''}`;
  });
  const loadBeatRow = (row: TwoTrackItem) => runCloud(`Loading beat ${row.title}…`, async r => {
    const ext = row.audio_path?.split('.').pop() ?? 'mp3';
    const blob = new Blob([await r.download(row.id)], { type: BEAT_MIME[ext] ?? 'audio/mpeg' });
    const m = beatMeta(row);
    const ok = await loadBeatBlob(blob, `${row.title}.${ext}`, { savedId: row.id, bpm: Number(row.tempo_bpm) || undefined, offset: m.offset, loopBars: m.loopBars });
    return ok ? `Loaded beat ${row.title}` : 'Beat could not be decoded';
  });
  const loadTakeRow = (row: TwoTrackItem) => runCloud(`Loading ${row.title}…`, async r => {
    const m = takeMeta(row); const rowBpm = Number(row.tempo_bpm) || effBpm;
    setPattern(m.pattern); setSwing(m.swing);
    const linked = m.beatTrackId ? beats.find(b => b.id === m.beatTrackId) : undefined;
    if (linked && beat?.savedId !== linked.id) {
      const ext = linked.audio_path?.split('.').pop() ?? 'mp3';
      const blob = new Blob([await r.download(linked.id)], { type: BEAT_MIME[ext] ?? 'audio/mpeg' });
      const lm = beatMeta(linked);
      await loadBeatBlob(blob, `${linked.title}.${ext}`, { savedId: linked.id, bpm: rowBpm, offset: lm.offset, loopBars: lm.loopBars });
    }
    if (linked) { setBeatMode('audio'); setBeatBpm(rowBpm); } else { setBeatMode('seq'); setBpm(rowBpm); }
    if (m.bars <= 16) setLoopBars(m.bars);
    const e = engineRef.current!; e.bpm = rowBpm;
    await e.loadTakeFromArrayBuffer(await r.download(row.id), rowBpm, m.bars);
    return `Loaded ${row.title}`;
  });
  const playInPlayer = (row: TwoTrackItem) => {
    try { engineRef.current?.stop(); void audio.select(repo().toAudioTrack(row)); } catch (e) { setCloudMsg(e instanceof Error ? e.message : 'Playback failed.'); }
  };

  const posText = pos.step < 0 ? '--.-' : pos.bar < 0 ? `-${-pos.bar}.${Math.floor(pos.step / 4) + 1}` : `${pos.bar + 1}.${Math.floor(pos.step / 4) + 1}`;
  const recording = recState === 'recording' || recState === 'finishing';

  return (
    <section id="two-track" aria-labelledby="two-track-title" data-testid="two-track" className="scroll-mt-4 rounded-md border border-[#514334] bg-[#11100f]/88 p-5 shadow-[inset_0_0_45px_rgba(255,255,255,0.02)]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#4a3d31] pb-4">
        <div className="flex items-baseline gap-4">
          <h2 id="two-track-title" className="text-2xl font-black uppercase tracking-tight text-[#ffb26f]">2-Track Recorder</h2>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8f7b67]">Beat · Vocal take · Synced count-in</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void togglePlay()} title="Play / Stop (Space)" data-testid="play" aria-pressed={playing} className={cn(btn, 'px-4 py-2 text-xs', playing && btnOn)}>
            {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? 'Stop' : 'Play'}
          </button>
          <button type="button" onClick={() => void doRecord()} title="Record take (R)" data-testid="rec" aria-pressed={recState !== 'idle'}
            className={cn(btn, 'border-[#d94e4e] px-4 py-2 text-xs text-[#ff8a7a] hover:bg-[#d94e4e] hover:text-black', recState === 'armed' && 'animate-pulse bg-[#d94e4e]/40 text-[#ffe0d8]', recording && 'bg-[#d94e4e] text-black')}>
            <span aria-hidden>●</span>{recState === 'idle' ? 'Rec' : recState === 'armed' ? 'Armed' : 'Rec…'}
          </button>
          <span className="min-w-[4.5rem] rounded-md border border-[#2d2927] bg-black/70 px-3 py-1.5 text-center font-mono text-lg font-bold text-[#f3dfb9]" aria-label="Position (bar.beat)">{posText}</span>
          <span role="status" data-testid="status" className={cn('min-w-48 text-xs font-bold uppercase tracking-wider', recState === 'idle' ? 'text-[#9c8876]' : 'text-[#ff8a7a]')}>{status}</span>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className={label} title="MUSAIX style presets: sets BPM, swing and a starter groove">Style
          <select className={field} value={presetId} disabled={recLocked} onChange={e => applyPreset(e.target.value)} data-testid="preset">
            <option value="">(none)</option>
            {PRESETS.map(pr => <option key={pr.preset_id} value={pr.preset_id}>{pr.display_name} · {pr.tempo}</option>)}
          </select>
        </label>
        <label className={label} title={audioMode ? 'Tempo of the audio beat (the transport follows it)' : 'Sequencer tempo'}>BPM
          <input className={cn(field, 'w-20')} type="number" min={40} max={240} step={audioMode ? 0.01 : 1} value={effBpm} disabled={recLocked} data-testid="bpm"
            onChange={e => { const v = Math.max(40, Math.min(240, +e.target.value || 92)); if (audioMode) setBeatBpm(v); else setBpm(v); }} />
          <input className={range} aria-label="Tempo slider" type="range" min={40} max={240} value={effBpm} disabled={recLocked || audioMode} onChange={e => setBpm(+e.target.value)} />
        </label>
        <label className={label}>Swing <input className={range} type="range" min={0} max={0.6} step={0.01} value={swing} onChange={e => setSwing(+e.target.value)} /></label>
        <label className={label}>Loop
          <select className={field} value={loopBars} disabled={recLocked} onChange={e => setLoopBars(+e.target.value)}>
            {[1, 2, 4, 8, 16].map(n => <option key={n} value={n}>{n} bar{n > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <Check checked={countIn} onChange={setCountIn}>Count-in</Check>
        <Check checked={metro} onChange={setMetro}>Metronome</Check>
        <Check checked={metroRec} onChange={setMetroRec}>Click while recording</Check>
      </div>
      {preset && (
        <p className="mt-3 text-xs text-[#9c8876]" title={preset.canonical_prompt}>
          <b className="text-[#eee2cd]">{preset.display_name}</b> · {preset.tagline} · {preset.default_family.replace('_', ' ')} · {preset.drums}
        </p>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Track 1: beat */}
          <section aria-label="Track 1 beat" className={cn(panel, dragOver && 'border-[#ffb26f]')}
            onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className={heading}><span className="mr-2 rounded border border-[#ffb26f] px-1.5 text-[#ffb26f]">1</span>Beat</h3>
              <div className="flex" role="radiogroup" aria-label="Beat source">
                <button type="button" role="radio" aria-checked={beatMode === 'seq'} className={cn(btn, 'rounded-r-none', beatMode === 'seq' && btnOn)} disabled={recLocked} onClick={() => setBeatMode('seq')} data-testid="mode-seq">Step sequencer</button>
                <button type="button" role="radio" aria-checked={beatMode === 'audio'} className={cn(btn, '-ml-px rounded-l-none', beatMode === 'audio' && btnOn)} disabled={recLocked} onClick={() => setBeatMode('audio')} data-testid="mode-audio">Audio beat</button>
              </div>
              {beatMode === 'seq' ? (
                <>
                  <button type="button" className={btn} onClick={() => setPattern(emptyPattern())}>Clear</button>
                  <button type="button" className={btn} onClick={() => setPattern(defaultPattern())}>Reset</button>
                </>
              ) : (
                <>
                  <button type="button" className={btn} disabled={recLocked} onClick={() => fileInput.current?.click()}><Upload className="h-3.5 w-3.5" />{beat ? 'Replace file' : 'Choose file'}</button>
                  {beat && <span className="rounded-md border border-[#3d3128] px-2 py-1 text-xs text-[#cdb8a1]" data-testid="beat-name">{beat.name} · {fmtTime(beat.buffer.duration)}{beat.savedId ? ' · saved' : ''}</span>}
                </>
              )}
              <input ref={fileInput} type="file" hidden accept="audio/mpeg,audio/mp3,.mp3,audio/wav,.wav,audio/mp4,audio/x-m4a,.m4a,audio/ogg,.ogg,audio/aac,.aac"
                data-testid="beat-file" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
            </div>

            {beatMode === 'seq' ? (
              <div className="mt-4 overflow-x-auto" role="grid" aria-label="Step sequencer">
                <div className="grid min-w-[640px] grid-cols-[64px_repeat(16,minmax(0,1fr))] gap-1">
                  <span />
                  {Array.from({ length: STEPS }, (_, i) => <span key={i} className={cn('mx-auto h-1.5 w-1.5 rounded-full', pos.step === i && pos.bar >= 0 ? 'bg-[#74ff67] shadow-[0_0_8px_#74ff67]' : 'bg-[#3c332b]')} />)}
                  {DRUMS.map(d => (
                    <div key={d.id} role="row" className="contents">
                      <span className="self-center text-[10px] font-black uppercase tracking-widest text-[#cdb8a1]">{d.name}</span>
                      {pattern[d.id].map((on, i) => (
                        <button type="button" key={i} data-testid={`cell-${d.id}-${i}`} aria-label={`${d.name} step ${i + 1}`} aria-pressed={on} onClick={() => toggleCell(d.id, i)}
                          className={cn('h-8 rounded border transition', on ? 'border-[#ead28f] bg-[#b6ff83] shadow-[0_0_12px_rgba(223,255,135,0.35)]' : Math.floor(i / 4) % 2 ? 'border-[#3c332b] bg-[#24201b] hover:bg-[#2f2923]' : 'border-[#3c332b] bg-[#161412] hover:bg-[#241f1a]',
                            pos.step === i && pos.bar >= 0 && 'outline outline-1 outline-[#ffb26f]')} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : !beat ? (
              <button type="button" className={cn('mt-4 w-full rounded-md border border-dashed border-[#5a4738] p-8 text-center text-sm text-[#cdb8a1] hover:border-[#ffb26f]', dragOver && 'border-[#ffb26f] bg-[#ffb26f]/10')} onClick={() => fileInput.current?.click()} data-testid="drop">
                <FileAudio className="mx-auto mb-2 h-6 w-6 text-[#ffb26f]" />
                Drop an MP3 / WAV / M4A / OGG beat here, or click to choose a file.
                <span className="mt-1 block text-xs text-[#8f7b67]">Decoded in your browser. Nothing is uploaded unless you press “Save beat”.</span>
                {beatInfo && <span className="mt-1 block text-xs text-[#9c8876]">{beatInfo}</span>}
              </button>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" className={btn} disabled={recLocked} onClick={() => analyze(beat.buffer)} data-testid="beat-detect">Detect BPM</button>
                  <button type="button" className={btn} disabled={recLocked} onClick={() => setBeatBpm(b => Math.min(240, Math.round(b * 2 * 100) / 100))}>×2</button>
                  <button type="button" className={btn} disabled={recLocked} onClick={() => setBeatBpm(b => Math.max(40, Math.round((b / 2) * 100) / 100))}>÷2</button>
                  <button type="button" className={btn} disabled={recLocked} onClick={tap} data-testid="tap" title="Tap along with the beat (4+ taps)">Tap</button>
                  <label className={label} title="Position of the first downbeat (bar 1, beat 1). Click the waveform to set it.">Downbeat
                    <input className={cn(field, 'w-24')} type="number" min={0} step={0.001} value={beatOffset} disabled={recLocked} data-testid="beat-offset"
                      onChange={e => setBeatOffset(Math.max(0, Math.min(beat.buffer.duration - 0.1, +e.target.value || 0)))} />s</label>
                  <button type="button" className={btn} disabled={recLocked} onClick={() => setBeatOffset(o => Math.max(0, Math.round((o - 0.01) * 1000) / 1000))}>−10ms</button>
                  <button type="button" className={btn} disabled={recLocked} onClick={() => setBeatOffset(o => Math.round((o + 0.01) * 1000) / 1000)}>+10ms</button>
                  <label className={label}>Play
                    <select className={field} value={beatLoop ? 'loop' : 'full'} disabled={recLocked} data-testid="beat-loop" onChange={e => setBeatLoop(e.target.value === 'loop')}>
                      <option value="loop">Loop region ({loopBars} bars)</option>
                      <option value="full">Full song ({songBars} bars)</option>
                    </select></label>
                  {beatLoop && (
                    <label className={label} title="Loop starts this many bars after the downbeat. Shift-click the waveform to pick a bar.">Loop start bar
                      <input className={cn(field, 'w-16')} type="number" min={1} max={maxLoopStart + 1} value={loopStartBar + 1} disabled={recLocked} data-testid="beat-loopstart"
                        onChange={e => setLoopStartBar(Math.max(0, Math.min(maxLoopStart, (+e.target.value || 1) - 1)))} /></label>
                  )}
                </div>
                <canvas ref={beatWaveRef} width={1200} height={110} onClick={setOffsetFromWave} aria-label="Beat waveform: click sets downbeat, shift-click sets loop start"
                  title="Click: set downbeat · Shift-click: set loop start bar" className="mt-3 h-[110px] w-full cursor-crosshair rounded-md border border-[#3d3128]" />
                <p className="mt-2 text-xs text-[#9c8876]" data-testid="beat-info">{beatInfo}</p>
              </>
            )}
          </section>

          {/* Track 2: recording */}
          <section aria-label="Track 2 recording" className={panel}>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className={heading}><span className="mr-2 rounded border border-[#d94e4e] px-1.5 text-[#ff8a7a]">2</span>Rec</h3>
              <button type="button" className={btn} onClick={() => void enableMic()}><Mic className="h-3.5 w-3.5" />{micName ? 'Mic ✓' : 'Enable mic'}</button>
              <Check checked={monitor} onChange={setMonitor} title="Hear the mic live (use headphones!)">Monitor</Check>
              <label className={label} title="Shifts the take earlier to compensate for round-trip latency; re-trims the last take live">Latency
                <input className={range} type="range" min={0} max={400} step={1} value={latency} onChange={e => setLatency(+e.target.value)} /><span className="w-12 text-[#eee2cd]">{latency} ms</span></label>
              <button type="button" className={btn} onClick={() => engineRef.current?.clearTake()} disabled={!take}>Clear take</button>
              <button type="button" className={btn} onClick={dlTake} disabled={!take}><Download className="h-3.5 w-3.5" />Take</button>
            </div>
            <canvas ref={waveRef} width={1200} height={120} aria-label="Take waveform" className="mt-3 h-[120px] w-full rounded-md border border-[#3d3128]" />
            <p className="mt-2 text-xs text-[#9c8876]" data-testid="take-info">
              {take ? `Take: ${take.bars} bar${take.bars > 1 ? 's' : ''} @ ${take.bpm} BPM · ${take.buffer.duration.toFixed(2)}s${take.bpm !== effBpm ? ' (varispeed)' : ''}`
                : audioMode ? `No take. Press ● Rec to record ${beatLoop ? `${loopBars} bars over the loop` : `over the full song (${songBars} bars)`}, starting on the beat's downbeat.`
                  : 'No take. Press ● Rec. Recording starts on the downbeat (after a 1-bar count-in if stopped).'}
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          {/* Mixer */}
          <section aria-label="Mixer" className={panel}>
            <h3 className={heading}>Mixer</h3>
            <div className="mt-3 grid grid-cols-[56px_1fr_auto] items-center gap-x-3 gap-y-3 text-[10px] font-black uppercase tracking-widest text-[#cdb8a1]">
              <span>Beat</span><input className={range} aria-label="Beat volume" type="range" min={0} max={1.5} step={0.01} value={vol.beat} onChange={e => setVol({ ...vol, beat: +e.target.value })} />
              <button type="button" aria-label="Mute beat" aria-pressed={mute.beat} className={cn(btn, 'px-2', mute.beat && btnOn)} onClick={() => setMute({ ...mute, beat: !mute.beat })}>M</button>
              <span>Rec</span><input className={range} aria-label="Recording volume" type="range" min={0} max={1.5} step={0.01} value={vol.rec} onChange={e => setVol({ ...vol, rec: +e.target.value })} />
              <button type="button" aria-label="Mute recording" aria-pressed={mute.rec} className={cn(btn, 'px-2', mute.rec && btnOn)} onClick={() => setMute({ ...mute, rec: !mute.rec })}>M</button>
              <span>Master</span><input className={range} aria-label="Master volume" type="range" min={0} max={1.5} step={0.01} value={vol.master} onChange={e => setVol({ ...vol, master: +e.target.value })} /><span />
              <span>Out</span><canvas ref={masterRef} width={240} height={10} aria-label="Master level meter" className="h-2.5 w-full rounded-sm border border-[#3d3128]" /><span />
              <span>Mic</span><canvas ref={micRef} width={240} height={10} aria-label="Mic level meter" className="h-2.5 w-full rounded-sm border border-[#3d3128]" /><span />
            </div>
            {micName && <p className="mt-2 truncate text-[10px] text-[#8f7b67]">{micName}</p>}
          </section>

          {/* Export */}
          <section aria-label="Export" className={panel}>
            <h3 className={heading}>Export</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className={cn(btn, btnPrimary)} onClick={() => void exportMix()} data-testid="export"><Download className="h-3.5 w-3.5" />Mix WAV</button>
              <label className={label}>Repeats
                <select className={field} data-testid="repeats" value={exportReps} onChange={e => setExportReps(+e.target.value)}>{[1, 2, 4, 8].map(n => <option key={n}>{n}</option>)}</select></label>
              <button type="button" className={btn} onClick={dlMidi} disabled={audioMode} title="Standard MIDI file of the beat (GM drums, ch 10) for the MUSAIX Ableton bridge" data-testid="midi"><Music2 className="h-3.5 w-3.5" />MIDI</button>
              <button type="button" className={btn} onClick={dlPayload} disabled={audioMode} title="MUSAIX Ableton bridge payload JSON (tempo, ticks_per_beat, notes)" data-testid="bridge">Bridge JSON</button>
            </div>
            {busy && <p className="mt-2 text-xs text-[#9c8876]" role="status">{busy}</p>}
          </section>

          {/* Cloud library */}
          <section aria-label="Studio library" className={panel} data-testid="cloud">
            <div className="flex items-center justify-between">
              <h3 className={heading}>Studio library</h3>
              {cloud === 'signed-in' && <button type="button" className={btn} onClick={() => void refresh()} disabled={cloudBusy} aria-label="Refresh library"><RefreshCw className="h-3.5 w-3.5" /></button>}
            </div>
            {cloud === 'unconfigured' && <p className="mt-2 text-xs text-[#9c8876]" data-testid="cloud-msg">Cloud library isn&apos;t configured for this deployment. Recording, playback and exports work locally.</p>}
            {cloud === 'signed-out' && (
              <p className="mt-2 text-xs text-[#9c8876]" data-testid="cloud-msg">
                <Link href="/audio" className="font-black uppercase tracking-widest text-[#ffb26f] hover:underline">Sign in on Audio</Link> to save takes and beats to your private library.
              </p>
            )}
            {cloud === 'signed-in' && (
              <>
                <div className="mt-3 flex gap-2">
                  <input className={cn(field, 'min-w-0 flex-1')} data-testid="take-name" placeholder="Take name (optional)" value={takeName} maxLength={120} onChange={e => setTakeName(e.target.value)} />
                  <button type="button" className={cn(btn, btnPrimary)} onClick={() => void saveTake()} disabled={recLocked || !take || cloudBusy} data-testid="save-take"><CloudUpload className="h-3.5 w-3.5" />Save take</button>
                </div>
                <div className="mt-2 flex gap-2">
                  <input className={cn(field, 'min-w-0 flex-1')} data-testid="beat-name-input" placeholder="Beat name" value={beatName} maxLength={120} onChange={e => setBeatName(e.target.value)} disabled={!beat} />
                  <button type="button" className={btn} onClick={() => void saveBeat()} disabled={!beat || recLocked || !!beat?.savedId || cloudBusy} data-testid="save-beat"
                    title="Uploads the beat to your private library. Only upload beats you own or have licensed.">{beat?.savedId ? 'Beat saved' : 'Save beat'}</button>
                </div>
                {cloudMsg && <p className="mt-2 text-xs text-[#9c8876]" role="status" data-testid="cloud-msg">{cloudMsg}</p>}
                <h4 className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#8f7b67]">Beats</h4>
                <ul className="mt-1 divide-y divide-[#3c332b] border-y border-[#3c332b]" data-testid="beat-list">
                  {beats.length === 0 && <li className="py-2 text-xs text-[#8f7b67]">No saved beats yet.</li>}
                  {beats.map(b => {
                    const m = beatMeta(b);
                    return (
                      <li key={b.id} className="flex items-center gap-3 py-2">
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#eee2cd]">{b.title}</span>
                          <span className="text-[11px] text-[#9c8876]">{Number(b.tempo_bpm)} BPM · {fmtTime(Number(b.duration_sec) || 0)} · downbeat {m.offset.toFixed(3)}s{m.loopBars ? ` · loop ${m.loopBars}` : ''}</span></span>
                        <button type="button" className={btn} onClick={() => void loadBeatRow(b)} disabled={recLocked || cloudBusy}>Load</button>
                      </li>
                    );
                  })}
                </ul>
                <h4 className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#8f7b67]">Takes</h4>
                <ul className="mt-1 divide-y divide-[#3c332b] border-y border-[#3c332b]" data-testid="cloud-list">
                  {takes.length === 0 && <li className="py-2 text-xs text-[#8f7b67]">No saved takes yet.</li>}
                  {takes.map(t => {
                    const m = takeMeta(t); const linked = m.beatTrackId ? beats.find(b => b.id === m.beatTrackId) : undefined;
                    return (
                      <li key={t.id} className="flex items-center gap-2 py-2">
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#eee2cd]">{t.title}</span>
                          <span className="text-[11px] text-[#9c8876]">{Number(t.tempo_bpm)} BPM · {m.bars} bars{m.beatTrackId ? ` · beat: ${linked?.title ?? 'linked'}` : ''} · {new Date(t.created_at).toLocaleDateString()}</span></span>
                        <button type="button" className={btn} onClick={() => playInPlayer(t)} aria-label={`Play ${t.title} in the player`}><Play className="h-3.5 w-3.5" /></button>
                        <button type="button" className={btn} onClick={() => void loadTakeRow(t)} disabled={recLocked || cloudBusy}>Load</button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-widest text-[#6f5f51]">Space = play/stop · R = record · Mic needs https or localhost · Use headphones to keep the beat out of your take</p>
    </section>
  );
}
