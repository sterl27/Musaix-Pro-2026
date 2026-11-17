import { verticalGradient, type ModeRenderer } from './types';

export const renderWaveform: ModeRenderer = (frame) => {
  const { ctx, width, height, wave, paint, beat } = frame;
  const n = wave.length;
  if (n < 2) return;
  const mid = height / 2;
  const amp = mid * 0.78 * (1 + beat * 0.06);
  ctx.save();
  ctx.strokeStyle = paint.glow;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(width, mid);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = verticalGradient(frame);
  ctx.shadowColor = paint.glow;
  ctx.shadowBlur = 18;
  ctx.lineWidth = Math.max(2, height * 0.004);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * width;
    const y = mid + wave[i] * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
};
