import data from "./musaix-presets.json";
import { DrumId, Pattern, STEPS, emptyPattern } from "./drums";

export interface StylePreset {
  preset_id: string;
  display_name: string;
  tagline: string;
  default_family: string;
  tempo: number;
  drums: string;
  canonical_prompt: string;
}

/** MUSAIX style presets (from musaix presets export v0.2.0). */
export const PRESETS: StylePreset[] = (data as { presets: StylePreset[] }).presets;

const P = (hits: Partial<Record<DrumId, number[]>>): Pattern => {
  const p = emptyPattern();
  for (const [id, steps] of Object.entries(hits) as [DrumId, number[]][]) for (const s of steps) if (s < STEPS) p[id][s] = true;
  return p;
};
const all = Array.from({ length: STEPS }, (_, i) => i);
const eighths = all.filter((i) => i % 2 === 0);

/** A starter 16-step groove + swing per style family. Trap-family grooves are half-time (snare on step 8). */
export const FAMILY_GROOVES: Record<string, { pattern: Pattern; swing: number }> = {
  boom_bap: { pattern: P({ kick: [0, 7, 10], snare: [4, 12], chh: eighths, ohh: [14] }), swing: 0.18 },
  conscious_rap: { pattern: P({ kick: [0, 8, 10], snare: [4, 12], chh: [...eighths, 7, 15] }), swing: 0.22 },
  trap: { pattern: P({ kick: [0, 3, 10], snare: [8], clap: [8], chh: all, ohh: [14] }), swing: 0 },
  dark_rap: { pattern: P({ kick: [0, 3, 7, 10], snare: [8], chh: [...eighths, 13, 15] }), swing: 0.05 },
  drill: { pattern: P({ kick: [0, 11], snare: [6, 14], chh: [0, 3, 6, 8, 10, 12, 15] }), swing: 0 },
};

export function grooveFor(preset: StylePreset) {
  return FAMILY_GROOVES[preset.default_family] ?? FAMILY_GROOVES.boom_bap;
}
