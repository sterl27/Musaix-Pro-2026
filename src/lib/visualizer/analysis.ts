/** FFT size shared by the analyser and the log-bin mapper. */
export const FFT_SIZE = 2048;

export const DEFAULT_SENSITIVITY = 0.55;
export const SENSITIVITY_KEY = 'musaix.visualizer.sensitivity';

export type BinRange = { start: number; end: number };

export type EnvelopeOptions = {
  attack: number;
  release: number;
  peakHold: number;
  peakFall: number;
};

/** Fast rise, slow fall, then a short hold before peak caps drop. */
export const ENVELOPE: EnvelopeOptions = {
  attack: 0.04,
  release: 0.45,
  peakHold: 0.55,
  peakFall: 0.55,
};

export type EnvelopeBuffers = {
  levels: Float32Array;
  peaks: Float32Array;
  holds: Float32Array;
};

export type BeatState = { average: number; pulse: number };

export const BEAT_THRESHOLD = 0.16;

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function clamp01(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/**
 * Log-spaced bin ranges from minHz to maxHz.
 * Each range is inclusive of `start` and exclusive of `end`.
 * Low bars cover fewer FFT bins than high bars.
 */
export function logBinRanges(
  barCount: number,
  frequencyBinCount: number,
  sampleRate: number,
  minHz = 20,
  maxHz = 16000,
): BinRange[] {
  if (barCount < 1 || frequencyBinCount < 1 || sampleRate <= 0) return [];
  const nyquist = sampleRate / 2;
  const hi = Math.min(Math.max(maxHz, 2), nyquist);
  const lo = Math.min(Math.max(minHz, 1), hi / 2);
  const logLo = Math.log(lo);
  const logHi = Math.log(hi);
  const binHz = sampleRate / (frequencyBinCount * 2);
  const ranges: BinRange[] = new Array(barCount);
  for (let i = 0; i < barCount; i++) {
    const f0 = Math.exp(logLo + ((logHi - logLo) * i) / barCount);
    const f1 = Math.exp(logLo + ((logHi - logLo) * (i + 1)) / barCount);
    const start = clampInt(Math.floor(f0 / binHz), 0, frequencyBinCount - 1);
    const end = clampInt(Math.ceil(f1 / binHz), start + 1, frequencyBinCount);
    ranges[i] = { start, end };
  }
  return ranges;
}

/** Average each range into `out` as 0..1. Writes in place. */
export function sampleLogBars(frequency: ArrayLike<number>, ranges: readonly BinRange[], out: Float32Array): void {
  const n = Math.min(ranges.length, out.length);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, ranges[i].start);
    const end = Math.min(frequency.length, ranges[i].end);
    if (end <= start) {
      out[i] = 0;
      continue;
    }
    let sum = 0;
    for (let bin = start; bin < end; bin++) sum += frequency[bin] || 0;
    out[i] = sum / (end - start) / 255;
  }
}

/** Multiply levels by a sensitivity gain and clamp to 0..1. */
export function applyGain(values: Float32Array, gain: number): void {
  const scaled = gain > 0 && Number.isFinite(gain) ? gain : 0;
  for (let i = 0; i < values.length; i++) values[i] = Math.min(1, values[i] * scaled);
}

/**
 * Sensitivity drives analyser gain and smoothing together.
 * Higher values boost quiet signals and reduce analyser smoothing.
 * The heard file volume is a separate control.
 */
export function sensitivitySettings(value: number): { gain: number; smoothing: number } {
  const t = clamp01(value);
  return {
    gain: 0.45 + t * 2.75,
    smoothing: 0.88 - t * 0.6,
  };
}

export function readSensitivity(storage: Pick<StorageLike, 'getItem'> | null): number {
  if (!storage) return DEFAULT_SENSITIVITY;
  try {
    const raw = storage.getItem(SENSITIVITY_KEY);
    if (raw == null) return DEFAULT_SENSITIVITY;
    const value = Number(raw);
    return Number.isFinite(value) ? clamp01(value) : DEFAULT_SENSITIVITY;
  } catch {
    return DEFAULT_SENSITIVITY;
  }
}

export function writeSensitivity(storage: Pick<StorageLike, 'setItem'> | null, value: number): void {
  if (!storage) return;
  try {
    storage.setItem(SENSITIVITY_KEY, String(clamp01(value)));
  } catch {
    /* Private mode and full disks should not break the visualizer. */
  }
}

/** One-pole envelope. Attack time is shorter than release time. */
export function easeToward(current: number, target: number, dt: number, attackSeconds: number, releaseSeconds: number): number {
  if (!Number.isFinite(current)) return Number.isFinite(target) ? target : 0;
  if (!Number.isFinite(target)) return current;
  const step = dt > 0 ? dt : 0;
  const tau = target > current ? attackSeconds : releaseSeconds;
  if (!(tau > 0) || step === 0) return tau > 0 ? current : target;
  const alpha = 1 - Math.exp(-step / tau);
  return current + (target - current) * alpha;
}

export function createEnvelopeBuffers(count: number): EnvelopeBuffers {
  return {
    levels: new Float32Array(count),
    peaks: new Float32Array(count),
    holds: new Float32Array(count),
  };
}

export function stepEnvelopes(state: EnvelopeBuffers, targets: ArrayLike<number>, dt: number, options: EnvelopeOptions): void {
  const n = Math.min(state.levels.length, state.peaks.length, state.holds.length, targets.length);
  const step = dt > 0 && Number.isFinite(dt) ? dt : 0;
  for (let i = 0; i < n; i++) {
    const target = Number.isFinite(targets[i]) ? targets[i] : 0;
    const level = easeToward(state.levels[i], target, step, options.attack, options.release);
    state.levels[i] = level;
    if (level >= state.peaks[i]) {
      state.peaks[i] = level;
      state.holds[i] = options.peakHold;
    } else if (state.holds[i] > 0) {
      state.holds[i] = Math.max(0, state.holds[i] - step);
    } else {
      state.peaks[i] = Math.max(level, state.peaks[i] - options.peakFall * step);
    }
  }
}

/** Mean energy of FFT bins at or below maxHz, normalized to 0..1. */
export function bassEnergy(frequency: ArrayLike<number>, sampleRate: number, fftSize: number, maxHz = 150): number {
  if (sampleRate <= 0 || fftSize <= 0 || frequency.length === 0) return 0;
  const last = Math.min(frequency.length, Math.max(1, Math.ceil((maxHz * fftSize) / sampleRate)));
  let sum = 0;
  for (let i = 0; i < last; i++) sum += frequency[i] || 0;
  return sum / last / 255;
}

export function createBeatState(): BeatState {
  return { average: 0, pulse: 0 };
}

/** Optional bass-energy pulse. A jump above the recent average retriggers it. */
export function stepBeatPulse(state: BeatState, bass: number, dt: number, threshold = BEAT_THRESHOLD): number {
  const energy = Number.isFinite(bass) ? bass : 0;
  const step = dt > 0 ? dt : 0;
  const delta = energy - state.average;
  const follow = 1 - Math.exp(-step / 0.25);
  state.average += (energy - state.average) * follow;
  if (delta > threshold) state.pulse = 1;
  else state.pulse = Math.max(0, state.pulse - step / 0.4);
  return state.pulse;
}

/** Gentle motion used before a mic or file is connected. */
export function fillAmbient(time: number, levels: Float32Array, peaks: Float32Array, wave: Float32Array, motion: boolean): void {
  const t = motion ? time : 0;
  const n = Math.min(levels.length, peaks.length);
  for (let i = 0; i < n; i++) {
    const value = 0.05 + 0.045 * Math.sin(t * 0.7 + i * 0.31) + 0.02 * Math.sin(t * 0.23 + i * 0.11);
    const level = Math.min(1, Math.max(0, value));
    levels[i] = level;
    peaks[i] = Math.min(1, level + 0.035);
  }
  for (let i = 0; i < wave.length; i++) {
    wave[i] = motion ? 0.16 * Math.sin(t * 1.2 + i * 0.045) : 0.08 * Math.sin(i * 0.045);
  }
}

function clampInt(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
