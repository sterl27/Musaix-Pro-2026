import { verticalGradient, type ModeRenderer } from './types';

export const renderBars: ModeRenderer = (frame) => {
  const { ctx, width, height, levels, peaks, paint, beat } = frame;
  const n = levels.length;
  if (n === 0 || width < 2 || height < 2) return;
  const gap = Math.max(1, width * 0.0035);
  const barWidth = Math.max(1, (width - gap * (n + 1)) / n);
  const floor = height * 0.06;
  const span = height * 0.86;
  ctx.save();
  ctx.fillStyle = verticalGradient(frame);
  ctx.shadowColor = paint.glow;
  ctx.shadowBlur = 16;
  for (let i = 0; i < n; i++) {
    const kick = i < 8 ? 1 + beat * 0.12 : 1;
    const barHeight = Math.max(2, levels[i] * span * kick);
    const x = gap + i * (barWidth + gap);
    ctx.fillRect(x, height - floor - barHeight, barWidth, barHeight);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = paint.peak;
  for (let i = 0; i < n; i++) {
    const cap = Math.max(2, peaks[i] * span);
    const x = gap + i * (barWidth + gap);
    ctx.fillRect(x, height - floor - cap - 5, barWidth, 3);
  }
  ctx.restore();
};
