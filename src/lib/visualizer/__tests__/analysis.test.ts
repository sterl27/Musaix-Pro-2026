import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SENSITIVITY,
  SENSITIVITY_KEY,
  applyGain,
  bassEnergy,
  createBeatState,
  createEnvelopeBuffers,
  easeToward,
  fillAmbient,
  logBinRanges,
  readSensitivity,
  sampleLogBars,
  sensitivitySettings,
  stepBeatPulse,
  stepEnvelopes,
  writeSensitivity,
} from '@/lib/visualizer/analysis';
import { hexToRgb, nextTheme, writePaint, createPaint } from '@/lib/visualizer/themes';
import { audioFileIssue, connectsToSpeakers, micErrorMessage, trackTitle, MIC_DENIED, UNSUPPORTED_FILE } from '@/lib/visualizer/sources';

describe('log bin mapping', () => {
  it('orders ranges from bass to treble and gives treble more bins', () => {
    const ranges = logBinRanges(32, 1024, 48000);
    expect(ranges).toHaveLength(32);
    expect(ranges[0]?.start).toBe(0);
    let previousCenter = -1;
    for (const range of ranges) {
      expect(range.end).toBeGreaterThan(range.start);
      expect(range.end).toBeLessThanOrEqual(1024);
      const center = (range.start + range.end - 1) / 2;
      expect(center).toBeGreaterThanOrEqual(previousCenter);
      previousCenter = center;
    }
    const low = ranges[0]!.end - ranges[0]!.start;
    const high = ranges[31]!.end - ranges[31]!.start;
    expect(high).toBeGreaterThan(low);
    expect(ranges[31]!.start).toBeGreaterThan(ranges[0]!.end);
  });

  it('returns no ranges for an empty spectrum', () => {
    expect(logBinRanges(0, 1024, 48000)).toEqual([]);
    expect(logBinRanges(8, 0, 48000)).toEqual([]);
    expect(logBinRanges(8, 1024, 0)).toEqual([]);
  });

  it('averages each range into the supplied buffer', () => {
    const frequency = new Uint8Array([0, 255, 255, 0, 0, 128]);
    const out = new Float32Array(2);
    out[0] = 9;
    sampleLogBars(frequency, [
      { start: 1, end: 3 },
      { start: 3, end: 5 },
    ], out);
    expect(out[0]).toBeCloseTo(1);
    expect(out[1]).toBeCloseTo(0);
    const gained = new Float32Array([0.5, 0.2]);
    applyGain(gained, 3);
    expect(gained[0]).toBe(1);
    expect(gained[1]).toBeCloseTo(0.6);
  });
});

describe('easing and peak hold', () => {
  it('rises quickly and falls slowly', () => {
    const rise = easeToward(0, 1, 0.05, 0.03, 0.4);
    const held = easeToward(1, 0, 0.05, 0.03, 0.4);
    expect(rise).toBeCloseTo(0.8111, 3);
    expect(held).toBeCloseTo(0.8825, 3);
    expect(rise).toBeGreaterThan(1 - held);
  });

  it('holds a peak, then lets it fall back toward the level', () => {
    const state = createEnvelopeBuffers(1);
    const options = { attack: 0.02, release: 0.5, peakHold: 0.4, peakFall: 1 };
    stepEnvelopes(state, new Float32Array([1]), 0.3, options);
    expect(state.levels[0]).toBeGreaterThan(0.95);
    expect(state.peaks[0]).toBeGreaterThan(0.95);
    const held = state.peaks[0]!;
    stepEnvelopes(state, new Float32Array([0]), 0.2, options);
    expect(state.peaks[0]).toBeCloseTo(held, 5);
    expect(state.levels[0]).toBeLessThan(0.8);
    stepEnvelopes(state, new Float32Array([0]), 0.5, options);
    expect(state.peaks[0]).toBeCloseTo(held, 5);
    stepEnvelopes(state, new Float32Array([0]), 0.5, options);
    expect(state.peaks[0]).toBeLessThan(held);
    expect(state.peaks[0]).toBeGreaterThanOrEqual(state.levels[0]! - 1e-6);
  });

  it('pulses when bass energy jumps, then releases', () => {
    const quiet = new Uint8Array(32);
    const loud = new Uint8Array(32);
    loud.fill(255, 0, 4);
    expect(bassEnergy(quiet, 48000, 2048)).toBe(0);
    expect(bassEnergy(loud, 48000, 2048)).toBeGreaterThan(0.5);
    const state = createBeatState();
    expect(stepBeatPulse(state, 0.9, 0.016, 0.16)).toBe(1);
    const later = stepBeatPulse(state, state.average, 0.2, 0.16);
    expect(later).toBeLessThan(1);
    expect(later).toBeGreaterThan(0);
  });
});

describe('sensitivity and source policy', () => {
  it('maps sensitivity to more gain and less smoothing', () => {
    const low = sensitivitySettings(0);
    const high = sensitivitySettings(1);
    expect(high.gain).toBeGreaterThan(low.gain);
    expect(high.smoothing).toBeLessThan(low.smoothing);
    expect(sensitivitySettings(2).gain).toBe(sensitivitySettings(1).gain);
  });

  it('persists a clamped sensitivity value', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    expect(readSensitivity(null)).toBe(DEFAULT_SENSITIVITY);
    expect(readSensitivity(storage)).toBe(DEFAULT_SENSITIVITY);
    writeSensitivity(storage, 1.4);
    expect(storage.getItem(SENSITIVITY_KEY)).toBe('1');
    expect(readSensitivity(storage)).toBe(1);
    memory.set(SENSITIVITY_KEY, 'nope');
    expect(readSensitivity(storage)).toBe(DEFAULT_SENSITIVITY);
  });

  it('keeps the microphone off the speakers and names files', () => {
    expect(connectsToSpeakers('mic')).toBe(false);
    expect(connectsToSpeakers('file')).toBe(true);
    expect(audioFileIssue('song.MP3')).toBeNull();
    expect(audioFileIssue('take.flac')).toBeNull();
    expect(audioFileIssue('notes.txt')).toBe(UNSUPPORTED_FILE);
    expect(trackTitle('folder/Night Drive.wav')).toBe('Night Drive');
    expect(micErrorMessage({ name: 'NotAllowedError' })).toBe(MIC_DENIED);
    expect(micErrorMessage({ name: 'NotFoundError' })).toMatch(/microphone/i);
  });

  it('blends theme colors and keeps ambient levels in range', () => {
    expect(nextTheme('fire')).toBe('neon');
    const paint = createPaint('neon');
    writePaint('neon', 'sunset', 0, paint);
    expect(channels(paint.background)).toEqual(hexToRgb('#070014'));
    writePaint('neon', 'sunset', 1, paint);
    expect(channels(paint.background)).toEqual(hexToRgb('#1a0b08'));
    const levels = new Float32Array(8);
    const peaks = new Float32Array(8);
    const wave = new Float32Array(8);
    fillAmbient(1.2, levels, peaks, wave, true);
    for (const value of levels) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(wave.some((value) => value !== 0)).toBe(true);
  });
});

function channels(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('#')) return hexToRgb(color);
  const parts = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0 };
}
