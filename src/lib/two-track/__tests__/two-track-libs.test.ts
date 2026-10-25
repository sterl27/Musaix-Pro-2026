import { describe, it, expect } from 'vitest';
import { TapTempo, estimateTempo } from '@/lib/two-track/analyze';
import { DRUMS, STEPS, defaultPattern, emptyPattern, sanitizePattern } from '@/lib/two-track/drums';
import { GM_NOTE, bridgePayload, patternNotes, patternToMidi } from '@/lib/two-track/midi';
import { PRESETS, grooveFor } from '@/lib/two-track/presets';
import { audioExt, peaksOf, safeTag, fmtTime } from '@/lib/two-track/audio-file';

/** Minimal AudioBuffer stand-in: a click track at `bpm` whose first (accented) beat is at `offset` seconds. */
function clickTrack(bpm: number, offset: number, seconds = 16, sampleRate = 22050) {
  const length = seconds * sampleRate; const data = new Float32Array(length);
  const beat = 60 / bpm;
  for (let k = 0, t = offset; t < seconds; t += beat, k++) {
    const start = Math.round(t * sampleRate); const amp = k % 4 === 0 ? 1 : 0.5;
    for (let i = 0; i < 400 && start + i < length; i++) data[start + i] = amp * Math.exp(-i / 80) * Math.sin(i * 0.3);
  }
  return { sampleRate, length, duration: seconds, numberOfChannels: 1, getChannelData: () => data } as unknown as AudioBuffer;
}

describe('two-track analysis', () => {
  it('detects tempo and the downbeat of a click track', () => {
    const est = estimateTempo(clickTrack(100, 0.5));
    expect(est).not.toBeNull();
    expect(est!.bpm).toBeCloseTo(100, 0);
    expect(Math.abs(est!.offset - 0.5)).toBeLessThan(0.03);
  });
  it('returns null for silence', () => {
    const silent = { sampleRate: 22050, length: 22050 * 8, duration: 8, numberOfChannels: 1, getChannelData: () => new Float32Array(22050 * 8) } as unknown as AudioBuffer;
    expect(estimateTempo(silent)).toBeNull();
  });
  it('tap tempo averages steady taps', () => {
    const tap = new TapTempo(); let v: number | null = null;
    for (let i = 0; i < 6; i++) v = tap.tap(1000 + i * 500);
    expect(v).toBe(120);
  });
});

describe('two-track patterns, MIDI and presets', () => {
  it('sanitizes untrusted patterns to 5 drums x 16 booleans', () => {
    const p = sanitizePattern({ kick: [1, 0, 'x'], bogus: [true] });
    expect(Object.keys(p).sort()).toEqual(DRUMS.map(d => d.id).sort());
    for (const d of DRUMS) expect(p[d.id]).toHaveLength(STEPS);
    expect(p.kick[0]).toBe(true); expect(p.kick[1]).toBe(false);
    expect(sanitizePattern(null)).toEqual(emptyPattern());
  });
  it('maps steps to GM drum notes for the bridge payload', () => {
    const pattern = emptyPattern(); pattern.kick[0] = true; pattern.snare[4] = true;
    const notes = patternNotes(pattern, 2);
    expect(notes).toHaveLength(4);
    expect(notes.map(n => n.pitch).sort()).toEqual([GM_NOTE.kick, GM_NOTE.kick, GM_NOTE.snare, GM_NOTE.snare].sort());
    expect(notes.every(n => n.channel === 9)).toBe(true);
    const payload = bridgePayload(pattern, 96, 2);
    expect(payload.tempo).toBe(96);
    expect(payload.notes).toHaveLength(4);
  });
  it('writes a standard MIDI file blob', () => {
    const blob = patternToMidi(defaultPattern(), 92, 2);
    expect(blob.type).toBe('audio/midi');
    expect(blob.size).toBeGreaterThan(40);
  });
  it('ships MUSAIX presets with a groove for every family', () => {
    expect(PRESETS.length).toBeGreaterThan(5);
    for (const p of PRESETS) {
      const g = grooveFor(p);
      expect(g.pattern.kick.some(Boolean)).toBe(true);
      expect(p.tempo).toBeGreaterThan(40);
    }
  });
});

describe('two-track file helpers', () => {
  it('maps beat files to the private bucket formats only', () => {
    expect(audioExt({ name: 'beat.MP3', type: '' })).toBe('mp3');
    expect(audioExt({ name: 'beat.mp4', type: '' })).toBe('m4a');
    expect(audioExt({ name: 'blob', type: 'audio/wav' })).toBe('wav');
    expect(audioExt({ name: 'clip.webm', type: 'audio/webm' })).toBeNull();
    expect(audioExt({ name: 'notes.txt', type: 'text/plain' })).toBeNull();
  });
  it('computes waveform peaks and safe names', () => {
    const peaks = peaksOf(clickTrack(120, 0, 2), 100);
    expect(peaks).toHaveLength(200);
    expect(Math.max(...peaks)).toBeGreaterThan(0.3);
    expect(safeTag('My Beat (final).mp3')).toBe('My_Beat_final_');
    expect(fmtTime(65.25)).toBe('1:05.3');
  });
});
