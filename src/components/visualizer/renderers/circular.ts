import type { ModeRenderer } from './types';

export const renderCircular: ModeRenderer = (frame) => {
  const { ctx, width, height, levels, peaks, paint, beat, time } = frame;
  const n = levels.length;
  if (n === 0) return;
  const cx = width / 2;
  const cy = height / 2;
  let energy = 0;
  for (let i = 0; i < n; i++) energy += levels[i];
  energy /= n;
  const breathe = 1 + Math.sin(time * 1.4) * 0.03 + beat * 0.08 + energy * 0.05;
  const inner = Math.min(width, height) * 0.15 * breathe;
  const maxRadius = Math.min(width, height) * 0.46;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = paint.glow;
  ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.006);
  ctx.shadowColor = paint.glow;
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(0, 0, inner, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  for (let i = 0; i < n; i++) {
    const start = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.01;
    const end = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - 0.01;
    const outer = inner + 10 + levels[i] * (maxRadius - inner);
    ctx.fillStyle = paint.stops[i % 3];
    ctx.beginPath();
    ctx.arc(0, 0, outer, start, end);
    ctx.arc(0, 0, inner + 8, end, start, true);
    ctx.closePath();
    ctx.fill();
    const cap = inner + 10 + peaks[i] * (maxRadius - inner);
    ctx.strokeStyle = paint.peak;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, cap, start, end);
    ctx.stroke();
  }
  ctx.restore();
};
