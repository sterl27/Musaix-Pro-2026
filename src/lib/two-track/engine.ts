import { DRUMS, Pattern, STEPS, VoiceState, defaultPattern, playClick, playDrum } from "./drums";
import { encodeWav } from "./wav";

export type RecState = "idle" | "armed" | "recording" | "finishing";
export interface Take {
  buffer: AudioBuffer; // mono, exactly `bars` bars long at `bpm`
  bpm: number;
  bars: number;
}
/** A decoded audio beat (MP3/WAV/...) that plays on the transport instead of the step sequencer. */
export interface AudioBeat {
  buffer: AudioBuffer;
  name: string;
  bpm: number;        // tempo of the file (the transport runs at this tempo in audio mode)
  offset: number;     // seconds: position of the first downbeat (trim start)
  loopStartBar: number; // loop region start, in bars after the downbeat
  loop: boolean;      // true: loop `loopBars` bars; false: play the full song from the downbeat
}
export type BeatMode = "seq" | "audio";

export interface EngineCallbacks {
  onStep?: (step: number, bar: number) => void;
  onTransport?: (playing: boolean) => void;
  onRecState?: (s: RecState, info?: string) => void;
  onTake?: (t: Take | null) => void;
  onMicLevel?: (peak: number) => void;
  onError?: (msg: string) => void;
}

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12; // seconds

// AudioWorklet that captures mono input with absolute frame stamps.
const WORKLET_SRC = `
class CaptureProc extends AudioWorkletProcessor {
  constructor() {
    super();
    this.on = false; this.size = 4096; this.buf = new Float32Array(this.size); this.n = 0; this.f0 = 0;
    this.peak = 0; this.blocks = 0;
    this.port.onmessage = (e) => {
      if (e.data === 'start') { this.on = true; this.n = 0; }
      else if (e.data === 'stop') { this.flush(); this.on = false; this.port.postMessage({ type: 'stopped' }); }
    };
  }
  flush() {
    if (this.n > 0) {
      const d = this.buf.slice(0, this.n);
      this.port.postMessage({ type: 'chunk', frame: this.f0, data: d }, [d.buffer]);
      this.n = 0;
    }
  }
  process(inputs) {
    const inp = inputs[0];
    const len = (inp && inp[0]) ? inp[0].length : 128;
    if (this.on && this.n === 0) this.f0 = currentFrame;
    for (let i = 0; i < len; i++) {
      let s = 0;
      if (inp && inp.length) { for (let c = 0; c < inp.length; c++) s += inp[c][i]; s /= inp.length; }
      const a = s < 0 ? -s : s; if (a > this.peak) this.peak = a;
      if (this.on) { this.buf[this.n++] = s; if (this.n >= this.size) this.flush2(); }
    }
    if (++this.blocks >= 8) { this.port.postMessage({ type: 'level', peak: this.peak }); this.peak = 0; this.blocks = 0; }
    return true;
  }
  flush2() {
    const d = this.buf; this.port.postMessage({ type: 'chunk', frame: this.f0, data: d }, [d.buffer]);
    this.buf = new Float32Array(this.size); this.n = 0;
  }
}
registerProcessor('capture-proc', CaptureProc);
`;

// Timer in a Worker so scheduling keeps running in background tabs.
const TIMER_SRC = `let id=null;onmessage=e=>{if(e.data==='start'){clearInterval(id);id=setInterval(()=>postMessage('tick'),${LOOKAHEAD_MS});}else{clearInterval(id);id=null;}};`;

/** Fast, high-ratio compressor used as a safety limiter on the mix bus (live and export). */
function makeLimiter(ac: BaseAudioContext): DynamicsCompressorNode {
  const c = ac.createDynamicsCompressor();
  c.threshold.value = -3; c.knee.value = 0; c.ratio.value = 20;
  c.attack.value = 0.002; c.release.value = 0.1;
  return c;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private beatBus!: GainNode;
  private recBus!: GainNode;
  private clickBus!: GainNode;
  private monitorGain!: GainNode;
  analyser!: AnalyserNode;
  private timer: Worker | null = null;
  private vs: VoiceState = {};

  // settings
  pattern: Pattern = defaultPattern();
  bpm = 92;
  swing = 0;
  loopBars = 2;
  countIn = true;
  metronome = false;
  clickWhileRec = true;
  latencyMs = 40;
  vol = { beat: 0.9, rec: 1, master: 0.9 };
  mute = { beat: false, rec: false };
  monitor = false;

  // transport
  playing = false;
  private step = 0;
  private bar = 0;
  private nextTime = 0;
  private takeSources = new Set<AudioBufferSourceNode>();
  private beatSources = new Set<AudioBufferSourceNode>();
  beatMode: BeatMode = "seq";
  audioBeat: AudioBeat | null = null;
  private visQ: { step: number; bar: number; time: number }[] = [];

  // recording
  private stream: MediaStream | null = null;
  private micNode: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  recState: RecState = "idle";
  private recStartBar = 0;
  private recStartTime = 0;
  private recEndTime = 0;
  private recBpm = 0;
  private recBars = 0;
  private chunks: { frame: number; data: Float32Array }[] = [];
  private raw: { data: Float32Array; frame0: number; startFrame: number; bars: number; bpm: number } | null = null;
  take: Take | null = null;

  constructor(private cb: EngineCallbacks = {}) {}

  get spStep() { return 60 / this.bpm / 4; }
  get barDur() { return this.spStep * STEPS; }
  get micReady() { return !!this.worklet; }
  get audioMode() { return this.beatMode === "audio" && !!this.audioBeat; }
  /** Bars in the full song after the downbeat (audio mode). */
  get songBars() {
    const b = this.audioBeat; if (!b) return this.loopBars;
    return Math.max(1, Math.ceil((b.buffer.duration - b.offset) / this.barDur - 0.01));
  }
  /** Length of the beat cycle in bars: loop length, or the whole song in full mode. */
  get beatBars() { return this.audioMode && !this.audioBeat!.loop ? this.songBars : this.loopBars; }
  /** Where the beat cycle starts inside the audio file (seconds). */
  private get beatRegionStart() {
    const b = this.audioBeat!; return b.offset + (b.loop ? b.loopStartBar * this.barDur : 0);
  }

  async init() {
    if (this.ctx) { if (this.ctx.state !== "running") await this.ctx.resume(); return; }
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.beatBus = ctx.createGain();
    this.recBus = ctx.createGain();
    this.clickBus = ctx.createGain();
    this.monitorGain = ctx.createGain();
    this.beatBus.connect(this.master);
    this.recBus.connect(this.master);
    this.master.connect(makeLimiter(ctx)).connect(this.analyser).connect(ctx.destination);
    this.clickBus.connect(ctx.destination); // click + monitor are not part of the mix
    this.monitorGain.connect(ctx.destination);
    this.applyGains();
    const blob = new Blob([TIMER_SRC], { type: "text/javascript" });
    this.timer = new Worker(URL.createObjectURL(blob));
    this.timer.onmessage = () => this.tick();
    if (ctx.state !== "running") await ctx.resume();
  }

  applyGains() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.01);
    this.beatBus.gain.setTargetAtTime(this.mute.beat ? 0 : this.vol.beat, t, 0.01);
    this.recBus.gain.setTargetAtTime(this.mute.rec ? 0 : this.vol.rec, t, 0.01);
    this.monitorGain.gain.setTargetAtTime(this.monitor ? 1 : 0, t, 0.01);
  }

  async enableMic(): Promise<string> {
    await this.init();
    const ctx = this.ctx!;
    if (this.worklet) return this.stream?.getAudioTracks()[0]?.label ?? "mic";
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia unavailable (needs https or localhost)");
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "text/javascript" }));
    await ctx.audioWorklet.addModule(url);
    this.micNode = ctx.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(ctx, "capture-proc", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    const sink = ctx.createGain();
    sink.gain.value = 0;
    this.micNode.connect(this.worklet).connect(sink).connect(ctx.destination);
    this.micNode.connect(this.monitorGain);
    this.worklet.port.onmessage = (e) => this.onWorklet(e.data);
    const track = this.stream.getAudioTracks()[0];
    const s = track?.getSettings() as MediaTrackSettings & { latency?: number };
    const est = ((ctx.outputLatency || 0) + (ctx.baseLatency || 0) + (s?.latency ?? 0.01)) * 1000;
    this.latencyMs = Math.round(Math.min(400, Math.max(0, est)));
    return track?.label || "Microphone";
  }

  private onWorklet(m: { type: string; frame?: number; data?: Float32Array; peak?: number }) {
    if (m.type === "level") this.cb.onMicLevel?.(m.peak ?? 0);
    else if (m.type === "chunk" && m.data) this.chunks.push({ frame: m.frame!, data: m.data });
    else if (m.type === "stopped" && this.recState === "finishing") this.finalizeTake();
  }

  // ---------- transport ----------
  async play(countInBars = 0) {
    await this.init();
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.bar = -countInBars;
    this.nextTime = this.ctx!.currentTime + 0.08;
    this.vs = {};
    this.timer!.postMessage("start");
    this.tick();
    this.cb.onTransport?.(true);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    this.timer?.postMessage("stop");
    this.stopTakeSources();
    this.stopBeatSources();
    this.visQ = [];
    if (this.recState === "armed" || this.recState === "recording") this.cancelRecording("Recording cancelled (transport stopped)");
    this.cb.onTransport?.(false);
    this.cb.onStep?.(-1, 0);
  }

  private tick() {
    if (!this.playing || !this.ctx) return;
    const ctx = this.ctx;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      this.scheduleStep(this.step, this.bar, this.nextTime);
      this.nextTime += this.spStep;
      if (++this.step >= STEPS) { this.step = 0; this.bar++; }
    }
    // recording finished? wait for latency tail then stop capture
    if (this.recState === "recording" && ctx.currentTime > this.recEndTime + this.latencyMs / 1000 + 0.15) {
      this.recState = "finishing";
      this.worklet?.port.postMessage("stop");
    }
  }

  /** Called from rAF by the UI to animate the playhead. */
  pollVisual() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    let last: { step: number; bar: number } | null = null;
    while (this.visQ.length && this.visQ[0].time <= now) last = this.visQ.shift()!;
    if (last) this.cb.onStep?.(last.step, last.bar);
  }

  private scheduleStep(step: number, bar: number, time: number) {
    const ctx = this.ctx!;
    this.visQ.push({ step, bar, time });
    const quarter = step % 4 === 0;
    if (bar < 0) {
      if (quarter) playClick(ctx, this.clickBus, time, step === 0);
      return;
    }
    if (step === 0 && this.recState === "armed" && bar === this.recStartBar) {
      this.recState = "recording";
      this.recStartTime = time;
      this.recBpm = this.bpm;
      this.recBars = this.beatBars;
      this.recEndTime = time + this.recBars * this.barDur;
      this.cb.onRecState?.("recording");
    }
    const recording = this.recState === "recording" && time < this.recEndTime;
    if (quarter && (this.metronome || (recording && this.clickWhileRec))) playClick(ctx, this.clickBus, time, step === 0);

    if (this.audioMode) {
      if (step === 0 && bar % this.beatBars === 0) this.startBeatAt(time, 0);
    } else {
      const swingOff = step % 2 === 1 ? this.swing * this.spStep * 0.5 : 0;
      for (const d of DRUMS) if (this.pattern[d.id][step]) playDrum(ctx, this.beatBus, d.id, time + swingOff, this.vs);
    }

    if (step === 0 && this.take && this.recState === "idle" && bar % this.take.bars === 0) this.startTakeAt(time, 0);
  }

  private startTakeAt(time: number, offset: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.take!.buffer;
    src.playbackRate.value = this.bpm / this.take!.bpm; // varispeed keeps it in sync if BPM changed
    src.connect(this.recBus);
    src.start(time, offset);
    src.onended = () => this.takeSources.delete(src);
    this.takeSources.add(src);
  }

  /** Schedule one cycle of the audio beat. `into` = seconds already elapsed in the cycle (for mid-cycle joins). */
  private startBeatAt(time: number, into: number, ac: BaseAudioContext = this.ctx!, dest: AudioNode = this.beatBus, track = true) {
    const b = this.audioBeat!;
    const start = this.beatRegionStart + into;
    const cycle = this.beatBars * this.barDur - into;
    const len = Math.min(cycle, b.buffer.duration - start);
    if (len <= 0.005) return;
    const src = ac.createBufferSource();
    src.buffer = b.buffer;
    const g = ac.createGain();
    // 3 ms fades so loop seams don't click
    const f = Math.min(0.003, len / 4);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(1, time + f);
    g.gain.setValueAtTime(1, time + len - f);
    g.gain.linearRampToValueAtTime(0, time + len);
    src.connect(g).connect(dest);
    src.start(time, start, len);
    if (track) {
      src.onended = () => { this.beatSources.delete(src); g.disconnect(); };
      this.beatSources.add(src);
    }
  }

  private stopBeatSources(at = 0) {
    for (const s of this.beatSources) { try { s.stop(at); } catch { /* already stopped */ } }
    this.beatSources.clear();
  }

  /** Seconds since bar 0 of the transport at audio time `t` (negative during count-in). */
  private elapsedAt(t: number) {
    return t - (this.nextTime - (this.bar * STEPS + this.step) * this.spStep);
  }

  /** Swap the audio beat / its settings. Call after changing beatMode or audioBeat fields. If playing, re-joins in place. */
  beatChanged() {
    if (!this.ctx) return;
    this.stopBeatSources(this.ctx.currentTime + 0.01);
    if (!this.playing || !this.audioMode || this.bar < 0) return;
    const t = this.ctx.currentTime + 0.03;
    const el = this.elapsedAt(t);
    if (el < 0) return;
    const cyc = this.beatBars * this.barDur;
    const into = el % cyc;
    this.startBeatAt(t, into);
    const boundary = t + (cyc - into);
    if (boundary < this.nextTime) this.startBeatAt(boundary, 0);
  }

  /** Playhead inside the audio file (seconds), or -1. */
  beatPosition(): number {
    if (!this.ctx || !this.playing || !this.audioMode) return -1;
    const el = this.elapsedAt(this.ctx.currentTime);
    if (el < 0) return -1;
    return this.beatRegionStart + (el % (this.beatBars * this.barDur));
  }

  async decodeFile(ab: ArrayBuffer): Promise<AudioBuffer> {
    await this.init();
    return this.ctx!.decodeAudioData(ab);
  }

  private stopTakeSources(at = 0) {
    for (const s of this.takeSources) { try { s.stop(at); } catch { /* already stopped */ } }
    this.takeSources.clear();
  }

  /** When a take appears mid-playback, join it in at the right loop position. */
  private joinTakeNow() {
    if (!this.ctx || !this.playing || !this.take || this.bar < 0) return;
    const t = this.ctx.currentTime + 0.03;
    const rate = this.bpm / this.take.bpm;
    const loopDur = this.take.bars * this.barDur;
    const startOfBar0 = this.nextTime - (this.bar * STEPS + this.step) * this.spStep;
    const el = t - startOfBar0;
    if (el < 0) return;
    const inLoop = el % loopDur;
    const boundary = t + (loopDur - inLoop);
    this.startTakeAt(t, inLoop * rate);
    // if the next loop boundary was already scheduled (skipped), start it manually
    if (boundary < this.nextTime) this.startTakeAt(boundary, 0);
  }

  // ---------- recording ----------
  async record() {
    if (this.recState !== "idle") { this.cancelRecording("Recording cancelled"); return; }
    try { await this.enableMic(); } catch (e) { this.cb.onError?.(`Mic error: ${(e as Error).message}`); return; }
    this.chunks = [];
    this.worklet!.port.postMessage("start");
    // silence the old take; the new one replaces it
    this.stopTakeSources(this.ctx!.currentTime + 0.01);
    if (!this.playing) {
      this.recStartBar = 0;
      this.recState = "armed";
      this.cb.onRecState?.("armed", this.countIn ? "Count-in…" : "Starting on downbeat");
      await this.play(this.countIn ? 1 : 0);
    } else {
      let b = this.step === 0 ? this.bar : this.bar + 1;
      const L = this.beatBars;
      b = Math.ceil(b / L) * L;
      this.recStartBar = b;
      this.recState = "armed";
      this.cb.onRecState?.("armed", `Recording starts at bar ${b + 1}`);
    }
  }

  private cancelRecording(msg: string) {
    this.worklet?.port.postMessage("stop");
    this.recState = "idle";
    this.chunks = [];
    this.cb.onRecState?.("idle", msg);
  }

  private finalizeTake() {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    if (!this.chunks.length) { this.recState = "idle"; this.cb.onRecState?.("idle", "No audio captured"); return; }
    const first = this.chunks[0].frame;
    const lastC = this.chunks[this.chunks.length - 1];
    const end = lastC.frame + lastC.data.length;
    const data = new Float32Array(end - first);
    for (const c of this.chunks) data.set(c.data, c.frame - first);
    this.chunks = [];
    this.raw = { data, frame0: first, startFrame: Math.round(this.recStartTime * sr), bars: this.recBars, bpm: this.recBpm };
    this.recState = "idle";
    this.retrim();
    this.cb.onRecState?.("idle", "Take recorded");
  }

  /** Rebuild the take from the raw capture using the current latency compensation. */
  retrim() {
    if (!this.raw || !this.ctx) return;
    const sr = this.ctx.sampleRate;
    const { data, frame0, startFrame, bars, bpm } = this.raw;
    const len = Math.round(bars * (60 / bpm) * 4 * sr);
    const from = startFrame + Math.round((this.latencyMs / 1000) * sr) - frame0;
    const buf = this.ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    for (let i = 0; i < len; i++) { const j = from + i; out[i] = j >= 0 && j < data.length ? data[j] : 0; }
    const fade = Math.min(Math.round(0.004 * sr), len >> 2);
    for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[len - 1 - i] *= i / fade; }
    this.setTake({ buffer: buf, bpm, bars });
  }

  setTake(t: Take | null) {
    this.stopTakeSources(this.ctx ? this.ctx.currentTime + 0.01 : 0);
    this.take = t;
    if (t) this.joinTakeNow();
    this.cb.onTake?.(t);
  }

  clearTake() {
    this.raw = null;
    this.setTake(null);
  }

  async loadTakeFromArrayBuffer(ab: ArrayBuffer, bpm: number, bars: number) {
    await this.init();
    const decoded = await this.ctx!.decodeAudioData(ab);
    let buf = decoded;
    if (decoded.numberOfChannels > 1) {
      buf = this.ctx!.createBuffer(1, decoded.length, decoded.sampleRate);
      const o = buf.getChannelData(0);
      for (let c = 0; c < decoded.numberOfChannels; c++) {
        const d = decoded.getChannelData(c);
        for (let i = 0; i < d.length; i++) o[i] += d[i] / decoded.numberOfChannels;
      }
    }
    this.raw = null;
    this.setTake({ buffer: buf, bpm, bars });
  }

  takeWav(): Blob | null {
    return this.take ? encodeWav(this.take.buffer) : null;
  }

  // ---------- export ----------
  async renderMix(repeats: number): Promise<Blob> {
    const sr = this.ctx?.sampleRate ?? 44100;
    const cyc = this.audioMode ? this.beatBars : this.loopBars;
    const loop = Math.max(this.take ? this.take.bars : 0, cyc);
    const bars = loop * repeats;
    const spStep = this.spStep;
    const dur = bars * STEPS * spStep;
    const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
    const master = oc.createGain();
    master.gain.value = this.vol.master;
    const beat = oc.createGain();
    beat.gain.value = this.mute.beat ? 0 : this.vol.beat;
    const rec = oc.createGain();
    rec.gain.value = this.mute.rec ? 0 : this.vol.rec;
    beat.connect(master);
    rec.connect(master);
    master.connect(makeLimiter(oc)).connect(oc.destination);
    const vs: VoiceState = {};
    for (let b = 0; b < bars; b++) {
      if (this.audioMode) {
        if (b % cyc === 0) this.startBeatAt(b * STEPS * spStep, 0, oc, beat, false);
      } else for (let s = 0; s < STEPS; s++) {
        const t = (b * STEPS + s) * spStep;
        const sw = s % 2 === 1 ? this.swing * spStep * 0.5 : 0;
        for (const d of DRUMS) if (this.pattern[d.id][s]) playDrum(oc, beat, d.id, t + sw, vs);
      }
      if (this.take && b % this.take.bars === 0) {
        const src = oc.createBufferSource();
        src.buffer = this.take.buffer;
        src.playbackRate.value = this.bpm / this.take.bpm;
        src.connect(rec);
        src.start(b * STEPS * spStep);
      }
    }
    const out = await oc.startRendering();
    return encodeWav(out);
  }

  masterLevel(): number {
    if (!this.analyser) return 0;
    const a = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(a);
    let p = 0;
    for (const v of a) { const x = Math.abs(v); if (x > p) p = x; }
    return p;
  }

  /** Position of the take playhead in [0,1), or -1. */
  takePosition(): number {
    if (!this.ctx || !this.playing || !this.take) return -1;
    const loopDur = this.take.bars * this.barDur;
    const el = this.elapsedAt(this.ctx.currentTime);
    if (el < 0) return -1;
    return (el % loopDur) / loopDur;
  }

  dispose() {
    this.stop();
    this.timer?.terminate();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
  }
}
