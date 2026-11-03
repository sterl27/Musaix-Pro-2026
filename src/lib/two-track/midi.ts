import { DRUMS, DrumId, Pattern, STEPS } from "./drums";

/** General MIDI drum notes (matches the MUSAIX Ableton bridge sample payload: 36 kick, 38 snare, 42 hat). */
export const GM_NOTE: Record<DrumId, number> = { kick: 36, snare: 38, clap: 39, chh: 42, ohh: 46 };
const VEL: Record<DrumId, number> = { kick: 110, snare: 100, clap: 95, chh: 75, ohh: 85 };
const TPB = 480;

export interface BridgeNote { pitch: number; start: number; duration: number; velocity: number; channel: number }

/** Notes in beats (16 steps = 4 beats per bar), repeated for `bars`. Swing delays odd 16ths. */
export function patternNotes(pattern: Pattern, bars: number, swing = 0): BridgeNote[] {
  const notes: BridgeNote[] = [];
  for (let b = 0; b < bars; b++)
    for (let s = 0; s < STEPS; s++)
      for (const d of DRUMS)
        if (pattern[d.id][s])
          notes.push({
            pitch: GM_NOTE[d.id],
            start: +(b * 4 + s / 4 + (s % 2 ? swing * 0.25 : 0)).toFixed(6),
            duration: 0.125,
            velocity: VEL[d.id],
            channel: 9,
          });
  return notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}

/** Payload in the same shape as musaix-ableton-bridge `parse_midi()` output. */
export function bridgePayload(pattern: Pattern, bpm: number, bars: number, swing = 0) {
  const notes = patternNotes(pattern, bars, swing);
  return { tempo: bpm, ticks_per_beat: TPB, note_count: notes.length, notes, source: "musaix-2track", length_beats: bars * 4 };
}

const vlq = (n: number) => {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
};

/** Standard MIDI File (format 0) of the beat: feed it to `python -m bridge.send_to_ableton beat.mid`. */
export function patternToMidi(pattern: Pattern, bpm: number, bars: number, swing = 0): Blob {
  const ev: { t: number; d: number[] }[] = [];
  for (const n of patternNotes(pattern, bars, swing)) {
    const t0 = Math.round(n.start * TPB), t1 = t0 + Math.round(n.duration * TPB);
    ev.push({ t: t0, d: [0x90 | n.channel, n.pitch, n.velocity] }, { t: t1, d: [0x80 | n.channel, n.pitch, 0] });
  }
  ev.sort((a, b) => a.t - b.t || (a.d[0] & 0xf0) - (b.d[0] & 0xf0)); // note-offs before note-ons at same tick
  const us = Math.round(60_000_000 / bpm);
  const trk: number[] = [
    0, 0xff, 0x51, 3, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff,
    0, 0xff, 0x58, 4, 4, 2, 24, 8,
  ];
  let last = 0;
  for (const e of ev) { trk.push(...vlq(e.t - last), ...e.d); last = e.t; }
  const end = bars * 4 * TPB;
  trk.push(...vlq(Math.max(0, end - last)), 0xff, 0x2f, 0);
  const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  const bytes = [
    0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, (TPB >> 8) & 0xff, TPB & 0xff,
    0x4d, 0x54, 0x72, 0x6b, ...u32(trk.length), ...trk,
  ];
  return new Blob([new Uint8Array(bytes)], { type: "audio/midi" });
}
