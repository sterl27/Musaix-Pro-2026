export const MODES = [
  { id: 'bars', label: 'Bars', key: '1' },
  { id: 'circular', label: 'Circular', key: '2' },
  { id: 'loop', label: 'Loop', key: '3' },
  { id: 'waveform', label: 'Waveform', key: '4' },
] as const;

export type ModeId = (typeof MODES)[number]['id'];

export const BAR_COUNT = 64;
export const WAVE_COUNT = 480;
export const MODE_FADE_MS = 300;
export const THEME_FADE_MS = 300;

export function modeByKey(key: string): ModeId | null {
  const match = MODES.find((mode) => mode.key === key);
  return match ? match.id : null;
}

export function modeLabel(id: ModeId): string {
  return MODES.find((mode) => mode.id === id)?.label ?? id;
}
