import type { ModeId } from '@/lib/visualizer/modes';
import { renderBars } from './bars';
import { renderCircular } from './circular';
import { renderLoop } from './loop';
import type { ModeRenderer } from './types';
import { renderWaveform } from './waveform';

export const RENDERERS: Record<ModeId, ModeRenderer> = {
  bars: renderBars,
  circular: renderCircular,
  loop: renderLoop,
  waveform: renderWaveform,
};

export type { ModeRenderer, RenderFrame } from './types';
