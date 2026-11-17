import {
  ENVELOPE,
  applyGain,
  bassEnergy,
  createBeatState,
  createEnvelopeBuffers,
  fillAmbient,
  logBinRanges,
  sampleLogBars,
  sensitivitySettings,
  stepBeatPulse,
  stepEnvelopes,
  type BeatState,
  type BinRange,
} from '@/lib/visualizer/analysis';
import { BAR_COUNT, WAVE_COUNT, type ModeId } from '@/lib/visualizer/modes';
import { createPaint, type ThemeId } from '@/lib/visualizer/themes';
import type { VisualizerEngine } from './audio-engine';
import { paintFrame, type Scene } from './paint-frame';

export type TransportSample = { time: number; duration: number; playing: boolean };

export type VisualizerView = Scene & {
  sensitivity: number;
  paused: boolean;
  beatState: BeatState;
  holds: Float32Array;
  targets: Float32Array;
  ranges: BinRange[];
  rangeKey: string;
};

export function createView(): VisualizerView {
  const envelope = createEnvelopeBuffers(BAR_COUNT);
  return {
    mode: 'bars',
    previousMode: 'bars',
    modeStarted: 0,
    theme: 'neon',
    previousTheme: 'neon',
    themeStarted: 0,
    reduceMotion: false,
    levels: envelope.levels,
    peaks: envelope.peaks,
    wave: new Float32Array(WAVE_COUNT),
    paint: createPaint('neon'),
    beat: 0,
    stamp: 0,
    backdropKey: '',
    backdrop: null,
    sensitivity: 0.55,
    paused: false,
    beatState: createBeatState(),
    holds: envelope.holds,
    targets: new Float32Array(BAR_COUNT),
    ranges: [],
    rangeKey: '',
  };
}

export function runVisualizerLoop(
  canvas: HTMLCanvasElement,
  engine: VisualizerEngine,
  view: VisualizerView,
  publish: (sample: TransportSample) => void,
): () => void {
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  let resizeTimer = 0;

  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      view.stamp += 1;
      view.backdrop = null;
      view.backdropKey = '';
    }
  };

  const scheduleFit = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(fit, 100);
  };

  fit();
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => scheduleFit());
  observer?.observe(canvas);
  if (!observer) window.addEventListener('resize', scheduleFit);

  const draw = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const settings = sensitivitySettings(view.sensitivity);
    engine.setSmoothing(settings.smoothing);
    const live = engine.kind === 'file' ? engine.playing : engine.kind === 'mic' && !view.paused;
    if (live && engine.pull()) {
      const key = `${engine.sampleRate}:${engine.frequency.length}:${view.levels.length}`;
      if (view.rangeKey !== key) {
        view.ranges = logBinRanges(view.levels.length, engine.frequency.length, engine.sampleRate);
        view.rangeKey = key;
      }
      sampleLogBars(engine.frequency, view.ranges, view.targets);
      applyGain(view.targets, settings.gain);
      stepEnvelopes({ levels: view.levels, peaks: view.peaks, holds: view.holds }, view.targets, dt, ENVELOPE);
      const bass = bassEnergy(engine.frequency, engine.sampleRate, engine.fftSize);
      view.beat = stepBeatPulse(view.beatState, bass, dt);
      copyWave(engine.timeDomain, view.wave);
    } else if (engine.kind === 'idle') {
      fillAmbient(now / 1000, view.levels, view.peaks, view.wave, !view.reduceMotion);
      view.beat = view.reduceMotion ? 0.2 : 0.35 + 0.15 * Math.sin(now / 900);
    } else {
      view.targets.fill(0);
      stepEnvelopes({ levels: view.levels, peaks: view.peaks, holds: view.holds }, view.targets, dt, ENVELOPE);
      view.beat = Math.max(0, view.beat - dt / 0.4);
      decayWave(view.wave, dt);
    }

    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 1 && canvas.height > 1) paintFrame(ctx, canvas.width, canvas.height, view, now);

    if (now >= clock) {
      clock = now + 250;
      publish({
        time: engine.currentTime,
        duration: engine.duration,
        playing: engine.kind === 'mic' ? !view.paused : engine.playing,
      });
    }
  };

  const tick = (now: number) => {
    raf = window.requestAnimationFrame(tick);
    if (!document.hidden) draw(now);
  };

  const onVisibility = () => {
    if (document.hidden) {
      window.cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    if (raf === 0) {
      last = performance.now();
      raf = window.requestAnimationFrame(tick);
    }
  };

  const onFullscreen = () => fit();
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('fullscreenchange', onFullscreen);
  raf = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(raf);
    observer?.disconnect();
    window.clearTimeout(resizeTimer);
    if (!observer) window.removeEventListener('resize', scheduleFit);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('fullscreenchange', onFullscreen);
  };
}

export function chooseMode(view: VisualizerView, next: ModeId): boolean {
  if (view.mode === next) return false;
  view.previousMode = view.mode;
  view.mode = next;
  view.modeStarted = performance.now();
  return true;
}

export function chooseTheme(view: VisualizerView, next: ThemeId): boolean {
  if (view.theme === next) return false;
  view.previousTheme = view.theme;
  view.theme = next;
  view.themeStarted = performance.now();
  return true;
}

function copyWave(time: Uint8Array, wave: Float32Array): void {
  const step = time.length / wave.length;
  for (let i = 0; i < wave.length; i++) {
    const sample = time[(i * step) | 0] ?? 128;
    wave[i] = (sample - 128) / 128;
  }
}

function decayWave(wave: Float32Array, dt: number): void {
  const keep = Math.exp(-dt / 0.18);
  for (let i = 0; i < wave.length; i++) wave[i] *= keep;
}
