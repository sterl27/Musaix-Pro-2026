import { MODE_FADE_MS, THEME_FADE_MS, type ModeId } from '@/lib/visualizer/modes';
import { writePaint, type Paint, type ThemeId } from '@/lib/visualizer/themes';
import { RENDERERS } from './renderers';
import type { RenderFrame } from './renderers/types';

export type Scene = {
  mode: ModeId;
  previousMode: ModeId;
  modeStarted: number;
  theme: ThemeId;
  previousTheme: ThemeId;
  themeStarted: number;
  reduceMotion: boolean;
  levels: Float32Array;
  peaks: Float32Array;
  wave: Float32Array;
  paint: Paint;
  beat: number;
  stamp: number;
  backdropKey: string;
  backdrop: CanvasGradient | null;
};

export function paintFrame(ctx: CanvasRenderingContext2D, width: number, height: number, scene: Scene, now: number): void {
  const modeMix = scene.reduceMotion ? 1 : Math.min(1, (now - scene.modeStarted) / MODE_FADE_MS);
  const themeMix = scene.reduceMotion ? 1 : Math.min(1, (now - scene.themeStarted) / THEME_FADE_MS);
  writePaint(scene.previousTheme, scene.theme, themeMix, scene.paint);

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = scene.paint.background;
  ctx.fillRect(0, 0, width, height);
  drawGlow(ctx, width, height, scene);

  const frame: RenderFrame = {
    ctx,
    width,
    height,
    levels: scene.levels,
    peaks: scene.peaks,
    wave: scene.wave,
    paint: scene.paint,
    beat: scene.beat,
    time: now / 1000,
    stamp: scene.stamp,
  };
  const current = RENDERERS[scene.mode];
  if (modeMix < 1 && scene.previousMode !== scene.mode) {
    ctx.save();
    ctx.globalAlpha = 1 - modeMix;
    RENDERERS[scene.previousMode](frame);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = modeMix;
    current(frame);
    ctx.restore();
  } else {
    current(frame);
  }
  ctx.globalAlpha = 1;
}

function drawGlow(ctx: CanvasRenderingContext2D, width: number, height: number, scene: Scene): void {
  const key = `${scene.stamp}|${width}|${height}|${scene.paint.glow}`;
  if (scene.backdropKey !== key || !scene.backdrop) {
    const glow = ctx.createRadialGradient(width / 2, height * 0.62, 0, width / 2, height * 0.62, Math.max(width, height) * 0.62);
    glow.addColorStop(0, scene.paint.glow);
    glow.addColorStop(1, 'transparent');
    scene.backdrop = glow;
    scene.backdropKey = key;
  }
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = scene.backdrop;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
