export const THEME_IDS = ['neon', 'sunset', 'mono', 'ocean', 'fire'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type Theme = {
  id: ThemeId;
  label: string;
  background: string;
  /** Gradient stops from low energy to high energy. */
  stops: readonly [string, string, string];
  glow: string;
  peak: string;
};

export const THEMES: Record<ThemeId, Theme> = {
  neon: {
    id: 'neon',
    label: 'Neon',
    background: '#070014',
    stops: ['#6d28d9', '#e879f9', '#22d3ee'],
    glow: '#e879f9',
    peak: '#f5f3ff',
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    background: '#1a0b08',
    stops: ['#fb7185', '#fb923c', '#fde68a'],
    glow: '#fdba74',
    peak: '#fff7ed',
  },
  mono: {
    id: 'mono',
    label: 'Mono',
    background: '#0a0a0a',
    stops: ['#3f3f46', '#d4d4d8', '#fafafa'],
    glow: '#e4e4e7',
    peak: '#ffffff',
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    background: '#021018',
    stops: ['#0e7490', '#22d3ee', '#a5f3fc'],
    glow: '#67e8f9',
    peak: '#ecfeff',
  },
  fire: {
    id: 'fire',
    label: 'Fire',
    background: '#140404',
    stops: ['#7f1d1d', '#ef4444', '#fbbf24'],
    glow: '#f97316',
    peak: '#fffbeb',
  },
};

export type Rgb = { r: number; g: number; b: number };

export type Paint = {
  background: string;
  stops: [string, string, string];
  glow: string;
  peak: string;
};

export function nextTheme(id: ThemeId): ThemeId {
  const index = THEME_IDS.indexOf(id);
  return THEME_IDS[(index + 1) % THEME_IDS.length];
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

export function createPaint(id: ThemeId = 'neon'): Paint {
  const theme = THEMES[id];
  return {
    background: theme.background,
    stops: [theme.stops[0], theme.stops[1], theme.stops[2]],
    glow: theme.glow,
    peak: theme.peak,
  };
}

/** Write a theme, or a blend between two themes, into a reused paint object. */
export function writePaint(from: ThemeId, to: ThemeId, t: number, out: Paint): void {
  const end = THEMES[to];
  const amount = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 1;
  if (amount >= 1 || from === to) {
    out.background = end.background;
    out.stops[0] = end.stops[0];
    out.stops[1] = end.stops[1];
    out.stops[2] = end.stops[2];
    out.glow = end.glow;
    out.peak = end.peak;
    return;
  }
  const start = THEMES[from];
  out.background = mixHex(start.background, end.background, amount);
  out.stops[0] = mixHex(start.stops[0], end.stops[0], amount);
  out.stops[1] = mixHex(start.stops[1], end.stops[1], amount);
  out.stops[2] = mixHex(start.stops[2], end.stops[2], amount);
  out.glow = mixHex(start.glow, end.glow, amount);
  out.peak = mixHex(start.peak, end.peak, amount);
}

function mixHex(a: string, b: string, t: number): string {
  const start = hexToRgb(a);
  const end = hexToRgb(b);
  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const bl = Math.round(start.b + (end.b - start.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
