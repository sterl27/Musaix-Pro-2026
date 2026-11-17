import type { Paint } from '@/lib/visualizer/themes';

export type RenderFrame = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  levels: Float32Array;
  peaks: Float32Array;
  wave: Float32Array;
  paint: Paint;
  beat: number;
  time: number;
  /** Changes when the canvas bitmap is reallocated, so gradients are rebuilt. */
  stamp: number;
};

export type ModeRenderer = (frame: RenderFrame) => void;

const gradients = new WeakMap<CanvasRenderingContext2D, { key: string; gradient: CanvasGradient }>();

export function verticalGradient(frame: RenderFrame): CanvasGradient {
  const { ctx, height, paint, stamp } = frame;
  const key = `${stamp}|${height}|${paint.stops[0]}|${paint.stops[1]}|${paint.stops[2]}`;
  const cached = gradients.get(ctx);
  if (cached?.key === key) return cached.gradient;
  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, paint.stops[0]);
  gradient.addColorStop(0.55, paint.stops[1]);
  gradient.addColorStop(1, paint.stops[2]);
  gradients.set(ctx, { key, gradient });
  return gradient;
}
