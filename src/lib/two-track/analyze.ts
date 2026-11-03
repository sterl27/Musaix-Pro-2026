// Lightweight tempo + downbeat estimation for decoded audio (runs on the main thread, ~100ms for 60s of audio).

export interface TempoEstimate { bpm: number; offset: number; confidence: number }

/** Onset-strength envelope at ~86 Hz (hop 512 @ 44.1k) from the first `maxSec` seconds. */
function onsetEnvelope(buf: AudioBuffer, maxSec = 60) {
  const sr = buf.sampleRate;
  const n = Math.min(buf.length, Math.floor(maxSec * sr));
  const hop = Math.round(sr / 86);
  const win = hop * 2;
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const frames = Math.max(0, Math.floor((n - win) / hop));
  const energy = new Float32Array(frames);
  // simple one-pole low-pass keeps kick/snare body dominant over hats
  let lp = 0; const a = Math.exp((-2 * Math.PI * 200) / sr);
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0; for (const ch of chans) s += ch[i]; s /= chans.length;
    lp = a * lp + (1 - a) * s;
    mono[i] = s * 0.5 + lp * 1.5;
  }
  for (let f = 0; f < frames; f++) {
    let e = 0; const o = f * hop;
    for (let i = 0; i < win; i++) { const v = mono[o + i]; e += v * v; }
    energy[f] = Math.log1p(1000 * e / win);
  }
  const env = new Float32Array(frames);
  for (let f = 1; f < frames; f++) env[f] = Math.max(0, energy[f] - energy[f - 1]);
  // remove local mean so sustained parts don't dominate
  const out = new Float32Array(frames); const W = 16;
  for (let f = 0; f < frames; f++) {
    let m = 0, c = 0; for (let k = Math.max(0, f - W); k < Math.min(frames, f + W); k++) { m += env[k]; c++; }
    out[f] = Math.max(0, env[f] - m / c);
  }
  return { env: out, fps: sr / hop };
}

export function estimateTempo(buf: AudioBuffer, minBpm = 70, maxBpm = 180): TempoEstimate | null {
  const { env, fps } = onsetEnvelope(buf);
  if (env.length < fps * 4) return null;
  // comb/phase search over candidate tempos at 0.25 BPM resolution
  let best = { bpm: 0, score: -1, phase: 0 };
  const scores: number[] = [];
  for (let bpm = minBpm; bpm <= maxBpm; bpm += 0.25) {
    const period = (60 / bpm) * fps;
    let bestPhase = 0, bestS = -1;
    for (let ph = 0; ph < period; ph += 1) {
      let s = 0, k = 0;
      for (let t = ph; t < env.length; t += period) { s += env[Math.round(t)] || 0; k++; }
      // reward the off-beat half-period too (8th-note grid), lightly
      for (let t = ph + period / 2; t < env.length; t += period) s += 0.5 * (env[Math.round(t)] || 0);
      s /= k || 1;
      if (s > bestS) { bestS = s; bestPhase = ph; }
    }
    scores.push(bestS);
    if (bestS > best.score) best = { bpm, score: bestS, phase: bestPhase };
  }
  if (best.score <= 0) return null;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  // phase of the beat grid -> first beat time; pick the strongest of the 4 beats in the first bar as downbeat
  const period = (60 / best.bpm) * fps;
  let down = best.phase, downS = -1;
  for (let b = 0; b < 4; b++) {
    let s = 0;
    for (let t = best.phase + b * period; t < env.length; t += period * 4) s += env[Math.round(t)] || 0;
    if (s > downS) { downS = s; down = best.phase + b * period; }
  }
  return { bpm: Math.round(best.bpm * 4) / 4, offset: refineAttack(buf, down / fps), confidence: Math.min(1, (best.score / (mean || 1) - 1) / 2) };
}

/** Tap tempo helper: keeps the last taps within 2 s gaps, returns BPM or null. */
export class TapTempo {
  private taps: number[] = [];
  tap(now = performance.now()): number | null {
    if (this.taps.length && now - this.taps[this.taps.length - 1] > 2000) this.taps = [];
    this.taps.push(now);
    if (this.taps.length > 8) this.taps.shift();
    if (this.taps.length < 2) return null;
    const span = this.taps[this.taps.length - 1] - this.taps[0];
    return Math.round((60000 / (span / (this.taps.length - 1))) * 10) / 10;
  }
}

/** Snap a coarse onset time to the actual attack: first sample in [t-40ms, t+60ms] reaching 25% of the local peak. */
export function refineAttack(buf: AudioBuffer, t: number): number {
  const sr = buf.sampleRate, d = buf.getChannelData(0);
  const d2 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : d;
  const a = Math.max(0, Math.floor((t - 0.04) * sr)), b = Math.min(d.length, Math.floor((t + 0.06) * sr));
  let peak = 0;
  for (let i = a; i < b; i++) peak = Math.max(peak, Math.abs(d[i] + d2[i]));
  if (peak < 1e-4) return t;
  for (let i = a; i < b; i++) if (Math.abs(d[i] + d2[i]) >= peak * 0.25) {
    // back off ~1 ms so the transient isn't clipped by the 3 ms fade-in
    return Math.max(0, Math.round((i / sr - 0.001) * 10000) / 10000);
  }
  return t;
}
