'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Maximize, Mic, Minimize, Pause, Play, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/components/audio/global-player';
import { MODES, modeLabel, type ModeId } from '@/lib/visualizer/modes';
import { THEME_IDS, THEMES, type ThemeId } from '@/lib/visualizer/themes';
import type { SourceKind } from '@/lib/visualizer/sources';
import { cn } from '@/lib/utils';

export type VisualizerControlsProps = {
  visible: boolean;
  source: SourceKind;
  trackName: string;
  playing: boolean;
  time: number;
  duration: number;
  volume: number;
  sensitivity: number;
  mode: ModeId;
  theme: ThemeId;
  fullscreen: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolume: (value: number) => void;
  onSensitivity: (value: number) => void;
  onMic: () => void;
  onChooseFile: () => void;
  onMode: (mode: ModeId) => void;
  onTheme: (theme: ThemeId) => void;
  onFullscreen: () => void;
  fileInput: ReactNode;
};

export function VisualizerControls({
  visible,
  source,
  trackName,
  playing,
  time,
  duration,
  volume,
  sensitivity,
  mode,
  theme,
  fullscreen,
  onTogglePlay,
  onSeek,
  onVolume,
  onSensitivity,
  onMic,
  onChooseFile,
  onMode,
  onTheme,
  onFullscreen,
  fileInput,
}: VisualizerControlsProps) {
  const file = source === 'file';
  return (
    <section
      data-viz-controls
      aria-label="Visualizer controls"
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-300 motion-reduce:transition-none',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 rounded-2xl border border-border bg-background/60 px-3 py-2.5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <Hint text="Back to Musaix Pro">
            <Link href="/" className="shrink-0 rounded-md px-1 text-sm font-extrabold tracking-tight text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
              MUSAIX <span className="text-secondary">PRO</span>
            </Link>
          </Hint>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={trackName || undefined}>
            {trackName || 'No input'}
          </p>
          <Hint text={playing ? 'Pause (Space)' : 'Play (Space)'}>
            <Button type="button" size="icon" variant="secondary" aria-label={playing ? 'Pause' : 'Play'} aria-keyshortcuts="Space" disabled={source === 'idle'} onClick={onTogglePlay}>
              {playing ? <Pause /> : <Play />}
            </Button>
          </Hint>
          <label className="flex min-w-[12rem] flex-1 items-center gap-2">
            <time className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{formatTime(time)}</time>
            <input
              aria-label="Seek"
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={duration > 0 ? Math.min(time, duration) : 0}
              disabled={!file || duration <= 0}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="h-1 min-w-0 flex-1 accent-primary disabled:opacity-40"
            />
            <time className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">{formatTime(duration)}</time>
          </label>
          {file ? (
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Volume</span>
              <input
                aria-label="Volume"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => onVolume(Number(event.target.value))}
                className="h-1 w-24 accent-primary"
              />
            </label>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Hint text="Microphone. Nothing is sent to the speakers.">
            <Button type="button" size="sm" variant={source === 'mic' ? 'default' : 'outline'} aria-pressed={source === 'mic'} aria-label="Use microphone" onClick={onMic}>
              <Mic /> Mic
            </Button>
          </Hint>
          <Hint text="Choose an mp3, wav, ogg, m4a, or flac file.">
            <Button type="button" size="sm" variant={file ? 'default' : 'outline'} aria-pressed={file} aria-label="Choose audio file" onClick={onChooseFile}>
              <Upload /> File
            </Button>
          </Hint>
          {fileInput}
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>Sensitivity</span>
            <input
              aria-label="Sensitivity"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={sensitivity}
              onChange={(event) => onSensitivity(Number(event.target.value))}
              className="h-1 w-28 accent-primary"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span aria-hidden="true">Mode</span>
            <select
              aria-label="Mode"
              title="Mode (keys 1 to 4)"
              value={mode}
              onChange={(event) => onMode(event.target.value as ModeId)}
              className="h-9 rounded-md border border-input bg-background/80 px-2 text-sm text-foreground"
            >
              {MODES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span aria-hidden="true">Theme</span>
            <select
              aria-label="Theme"
              title="Theme (T)"
              value={theme}
              onChange={(event) => onTheme(event.target.value as ThemeId)}
              className="h-9 rounded-md border border-input bg-background/80 px-2 text-sm text-foreground"
            >
              {THEME_IDS.map((id) => (
                <option key={id} value={id}>
                  {THEMES[id].label}
                </option>
              ))}
            </select>
          </label>
          <Hint text={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}>
            <Button type="button" size="icon" variant="outline" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-keyshortcuts="F" onClick={onFullscreen}>
              {fullscreen ? <Minimize /> : <Maximize />}
            </Button>
          </Hint>
          <p className="sr-only">
            {modeLabel(mode)}. Keys 1 to 4 change the mode, T changes the theme, F toggles fullscreen, Space plays or pauses, and the up and down arrows change sensitivity.
          </p>
        </div>
      </div>
    </section>
  );
}

function Hint({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.45rem)] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
