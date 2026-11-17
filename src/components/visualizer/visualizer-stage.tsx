'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useAudio } from '@/components/audio/audio-provider';
import { readSensitivity, writeSensitivity, DEFAULT_SENSITIVITY } from '@/lib/visualizer/analysis';
import { modeByKey, modeLabel, type ModeId } from '@/lib/visualizer/modes';
import { nextTheme, THEMES, type ThemeId } from '@/lib/visualizer/themes';
import { AUDIO_EXTENSIONS, type SourceKind } from '@/lib/visualizer/sources';
import { cn } from '@/lib/utils';
import { VisualizerEngine } from './audio-engine';
import { VisualizerControls } from './controls';
import { chooseMode, chooseTheme, createView, runVisualizerLoop, type TransportSample, type VisualizerView } from './frame-loop';

const IDLE_MS = 2500;
const ACCEPT = AUDIO_EXTENSIONS.map((ext) => `.${ext}`).join(',');

type Notice = { tone: 'error' | 'info'; text: string };

type Actions = {
  mode: (next: ModeId) => void;
  theme: () => void;
  fullscreen: () => void;
  play: () => void;
  sensitivity: (value: number) => void;
};

export function VisualizerStage() {
  const library = useAudio();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<VisualizerEngine | null>(null);
  const viewRef = useRef<VisualizerView | null>(null);
  const job = useRef(0);
  const dragDepth = useRef(0);
  const holding = useRef(false);
  const hideTimer = useRef(0);
  const revealRef = useRef<() => void>(() => {});
  const [source, setSource] = useState<SourceKind>('idle');
  const [trackName, setTrackName] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [mode, setMode] = useState<ModeId>('bars');
  const [theme, setTheme] = useState<ThemeId>('neon');
  const [sensitivity, setSensitivity] = useState(DEFAULT_SENSITIVITY);
  const [volume, setVolume] = useState(0.8);
  const [transport, setTransport] = useState<TransportSample>({ time: 0, duration: 0, playing: false });
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsOn, setControlsOn] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    library.pause();
    // The provider object is new every render. Pause the shared player once on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const engine = new VisualizerEngine();
    const view = createView();
    engineRef.current = engine;
    viewRef.current = view;
    const stored = readSensitivity(window.localStorage);
    view.sensitivity = stored;
    setSensitivity(stored);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    view.reduceMotion = motion.matches;
    const onMotion = () => {
      view.reduceMotion = motion.matches;
    };
    motion.addEventListener('change', onMotion);
    let alive = true;
    const stop = runVisualizerLoop(canvas, engine, view, (sample) => {
      if (!alive) return;
      setTransport((current) => {
        if (current.playing === sample.playing && current.duration === sample.duration && Math.abs(current.time - sample.time) < 0.04) return current;
        return sample;
      });
    });
    const resume = () => {
      void engine.resume().catch(() => undefined);
    };
    root.addEventListener('pointerdown', resume);
    return () => {
      alive = false;
      job.current += 1;
      root.removeEventListener('pointerdown', resume);
      motion.removeEventListener('change', onMotion);
      stop();
      engine.destroy();
      engineRef.current = null;
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const visible = { current: true };
    const arm = () => {
      window.clearTimeout(hideTimer.current);
      if (!visible.current) {
        visible.current = true;
        setControlsOn(true);
      }
      const active = document.activeElement;
      const focused = active instanceof HTMLElement && active !== root && root.contains(active);
      if (holding.current || focused) return;
      hideTimer.current = window.setTimeout(() => {
        visible.current = false;
        setControlsOn(false);
      }, IDLE_MS);
    };
    revealRef.current = arm;
    const down = (event: PointerEvent) => {
      if (root.querySelector('[data-viz-controls]')?.contains(event.target as Node)) holding.current = true;
      arm();
    };
    const up = () => {
      holding.current = false;
      arm();
    };
    arm();
    root.addEventListener('pointermove', arm);
    root.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    root.addEventListener('focusin', arm);
    root.addEventListener('focusout', arm);
    return () => {
      window.clearTimeout(hideTimer.current);
      root.removeEventListener('pointermove', arm);
      root.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      root.removeEventListener('focusin', arm);
      root.removeEventListener('focusout', arm);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const actions = useRef<Actions>({
    mode: () => {},
    theme: () => {},
    fullscreen: () => {},
    play: () => {},
    sensitivity: () => {},
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const modeKey = modeByKey(event.key);
      if (modeKey) {
        event.preventDefault();
        actions.current.mode(modeKey);
        revealRef.current();
        return;
      }
      if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        actions.current.theme();
        revealRef.current();
        return;
      }
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        actions.current.fullscreen();
        revealRef.current();
        return;
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const current = viewRef.current?.sensitivity ?? DEFAULT_SENSITIVITY;
        actions.current.sensitivity(current + (event.key === 'ArrowUp' ? 0.05 : -0.05));
        revealRef.current();
        return;
      }
      if (event.code === 'Space' && tag !== 'BUTTON' && tag !== 'A') {
        event.preventDefault();
        actions.current.play();
        revealRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function applyMode(next: ModeId) {
    const view = viewRef.current;
    if (!view || !chooseMode(view, next)) return;
    setMode(next);
  }

  function applyTheme(next: ThemeId) {
    const view = viewRef.current;
    if (!view || !chooseTheme(view, next)) return;
    setTheme(next);
  }

  function cycleTheme() {
    const view = viewRef.current;
    if (view) applyTheme(nextTheme(view.theme));
  }

  function changeSensitivity(value: number) {
    const next = Math.min(1, Math.max(0, value));
    if (viewRef.current) viewRef.current.sensitivity = next;
    setSensitivity(next);
    writeSensitivity(window.localStorage, next);
  }

  function togglePlay() {
    const engine = engineRef.current;
    const view = viewRef.current;
    if (!engine || !view || engine.kind === 'idle') return;
    void engine.resume();
    if (engine.kind === 'file') {
      const next = !engine.playing;
      if (next) void engine.play();
      else engine.pause();
      setTransport((current) => ({ ...current, playing: next }));
      return;
    }
    view.paused = !view.paused;
    setTransport((current) => ({ ...current, playing: !view.paused }));
  }

  async function toggleFullscreen() {
    const root = rootRef.current;
    if (!root || !document.fullscreenEnabled) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch {
      /* The browser refused fullscreen. The button remains available. */
    }
  }

  async function openMic() {
    const engine = engineRef.current;
    const view = viewRef.current;
    if (!engine || !view) return;
    const token = ++job.current;
    setNotice(null);
    try {
      await engine.useMicrophone();
      if (token !== job.current) return;
      view.paused = false;
      setSource('mic');
      setTrackName(engine.trackName);
      setTransport((current) => ({ ...current, time: 0, duration: 0, playing: true }));
    } catch (error) {
      if (token !== job.current) return;
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The microphone could not be opened.' });
    }
  }

  async function openFile(file: File) {
    const engine = engineRef.current;
    const view = viewRef.current;
    if (!engine || !view) return;
    const token = ++job.current;
    setNotice(null);
    try {
      const started = await engine.useFile(file);
      if (token !== job.current) return;
      view.paused = false;
      setSource(engine.kind);
      setTrackName(engine.trackName);
      setTransport({ time: engine.currentTime, duration: engine.duration, playing: engine.playing });
      setNotice(started || engine.kind !== 'file' ? null : { tone: 'info', text: 'Press play to start the track.' });
    } catch (error) {
      if (token !== job.current) return;
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'This file could not be decoded.' });
    }
  }

  useEffect(() => {
    actions.current = {
      mode: applyMode,
      theme: cycleTheme,
      fullscreen: () => void toggleFullscreen(),
      play: togglePlay,
      sensitivity: changeSensitivity,
    };
  });

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      setNotice({ tone: 'error', text: 'Drop an audio file to play it.' });
      return;
    }
    void openFile(file);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'fixed inset-0 z-[60] overflow-hidden bg-[#07070a] text-foreground',
        dragOver && 'ring-2 ring-inset ring-primary',
        fullscreen && !controlsOn && 'cursor-none',
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setDragOver(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragOver(false);
      }}
      onDrop={onDrop}
    >
      <h1 className="sr-only">Visualizer</h1>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={`${modeLabel(mode)} visualizer`} />
      {source === 'idle' ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 pb-28">
          <div className="text-center">
            <p className="text-xl font-semibold tracking-tight text-white drop-shadow-md sm:text-2xl">Use mic / Drop a track</p>
            {dragOver ? <p className="mt-2 text-sm text-white/80">Drop to play</p> : null}
          </div>
        </div>
      ) : null}
      {notice ? (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className="pointer-events-none absolute inset-x-0 bottom-32 z-20 px-4 text-center">
          <span className="inline-block max-w-md rounded-full border border-white/15 bg-black/55 px-4 py-2 text-sm text-white backdrop-blur">{notice.text}</span>
        </p>
      ) : null}
      <VisualizerControls
        visible={controlsOn}
        source={source}
        trackName={trackName}
        playing={transport.playing}
        time={transport.time}
        duration={transport.duration}
        volume={volume}
        sensitivity={sensitivity}
        mode={mode}
        theme={theme}
        fullscreen={fullscreen}
        onTogglePlay={togglePlay}
        onSeek={(seconds) => {
          engineRef.current?.seek(seconds);
          setTransport((current) => ({ ...current, time: seconds }));
        }}
        onVolume={(value) => {
          setVolume(value);
          engineRef.current?.setVolume(value);
        }}
        onSensitivity={changeSensitivity}
        onMic={() => void openMic()}
        onChooseFile={() => fileRef.current?.click()}
        onMode={applyMode}
        onTheme={applyTheme}
        onFullscreen={() => void toggleFullscreen()}
        fileInput={
          <input
            ref={fileRef}
            type="file"
            accept={`${ACCEPT},audio/*`}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void openFile(file);
            }}
          />
        }
      />
      <p className="sr-only">{THEMES[theme].label} theme</p>
    </div>
  );
}
