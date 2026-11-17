import type { ModeRenderer } from './types';

export const renderLoop: ModeRenderer = (frame) => {
  const { ctx, width, height, wave, paint, beat, time } = frame;
  const n = wave.length;
  if (n < 2) return;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * (0.28 + beat * 0.035 + Math.sin(time * 0.8) * 0.008);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = paint.glow;
  ctx.shadowBlur = 28;
  ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.006);
  const trace = (scale: number, color: string, widthScale: number) => {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const index = i % n;
      const angle = (index / n) * Math.PI * 2 - Math.PI / 2;
      const r = radius + wave[index] * radius * scale;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, Math.min(width, height) * widthScale);
    ctx.stroke();
  };
  trace(0.55, paint.glow, 0.012);
  ctx.shadowBlur = 12;
  trace(0.42, paint.stops[2], 0.0045);
  ctx.restore();
};
