import { EMPTY_PLAYBACK, type AudioTrack, type AudioSource, type PlaybackState } from './playback-types';

/** Owns exactly one media element. Views only subscribe; route changes never own playback. */
export class AudioRuntime {
  private state: PlaybackState = { ...EMPTY_PLAYBACK, queue: [] };
  private listeners = new Set<() => void>();
  private generation = 0;
  private intent = 0;
  private ready = false;
  private source: AudioSource | null = null;
  private renewed = false;
  private restoreTime: number | null = null;
  private disposed = false;
  constructor(private audio: HTMLAudioElement) {
    for (const name of ['loadedmetadata', 'durationchange', 'timeupdate', 'playing', 'pause', 'waiting', 'ended', 'error', 'volumechange']) audio.addEventListener(name, this.onMedia);
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private update(patch: Partial<PlaybackState>) { if (this.disposed) return; this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  private currentSource() { return this.ready && (!this.audio.currentSrc || this.audio.currentSrc === this.audio.src); }
  private onMedia = (event: Event) => {
    if (!this.state.track || !this.currentSource()) return;
    switch (event.type) {
      case 'loadedmetadata':
      case 'durationchange': {
        const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
        this.update({ duration });
        if (event.type === 'loadedmetadata') this.renewed = false;
        if (this.restoreTime !== null && duration > 0) { this.seek(this.restoreTime); this.restoreTime = null; }
        break;
      }
      case 'timeupdate': this.update({ currentTime: this.audio.currentTime }); break;
      case 'playing':
        if (!this.state.wantsPlayback) { this.audio.pause(); return; }
        this.update({ status: 'playing', error: null }); break;
      case 'pause': if (this.state.status !== 'loading') this.update({ status: 'paused' }); break;
      case 'waiting': if (!this.audio.paused) this.update({ status: 'loading' }); break;
      case 'volumechange': this.update({ volume: this.audio.volume, muted: this.audio.muted }); break;
      case 'ended': {
        const index = this.state.queue.findIndex(t => t.id === this.state.track?.id);
        if (index >= 0 && index < this.state.queue.length - 1) void this.next();
        else this.update({ status: 'paused', wantsPlayback: false, currentTime: this.state.duration });
        break;
      }
      case 'error':
        if (this.state.track.resolveSource && this.source?.expiresAt && this.source.expiresAt <= Date.now() + 5000 && !this.renewed) {
          this.renewed = true;
          const time = this.audio.currentTime;
          const resume = this.state.wantsPlayback;
          void this.assign(this.state.track, resume, time, true);
        } else this.update({ status: 'error', wantsPlayback: false, error: 'Audio could not be played. Try reopening the track.' });
        break;
    }
  };
  enqueue = (track: AudioTrack) => { if (!this.state.queue.some(t => t.id === track.id)) this.update({ queue: [...this.state.queue, track] }); };
  load = (track: AudioTrack) => this.assign(track, false);
  select = (track: AudioTrack) => this.assign(track, true);
  private async assign(track: AudioTrack, autoplay: boolean, position = 0, renewal = false) {
    const generation = ++this.generation;
    const intent = ++this.intent;
    this.ready = false;
    this.audio.pause();
    this.enqueue(track);
    this.update({ track, status: 'loading', wantsPlayback: autoplay, error: null, currentTime: position, duration: 0 });
    this.source = null;
    this.renewed = renewal;
    this.restoreTime = position > 0 ? position : null;
    try {
      const source = track.resolveSource ? await track.resolveSource() : { src: track.src };
      if (generation !== this.generation || this.disposed) return;
      this.source = source;
      this.audio.src = source.src;
      this.ready = true;
      this.audio.load();
      this.update({ status: 'paused' });
      if (autoplay && intent === this.intent) await this.play();
    } catch (error) {
      if (generation === this.generation) this.update({ status: 'error', wantsPlayback: false, error: error instanceof Error ? error.message : 'Unable to load audio.' });
    }
  }
  play = async () => {
    if (!this.state.track || !this.ready) return;
    const generation = this.generation;
    this.update({ wantsPlayback: true });
    const intent = ++this.intent;
    try {
      await this.audio.play();
      // Only the actual media event marks playback as running.
    } catch (error) {
      if (generation !== this.generation || intent !== this.intent) return;
      const blocked = error instanceof DOMException && error.name === 'NotAllowedError';
      this.update({ status: blocked ? 'play-required' : 'error', wantsPlayback: false, error: blocked ? 'Press Play to start audio.' : 'Playback failed. Try reopening the track.' });
    }
  };
  pause = () => { ++this.intent; this.audio.pause(); if (this.state.track) this.update({ status: 'paused', wantsPlayback: false }); };
  seek = (seconds: number) => {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    if (!this.ready || !Number.isFinite(seconds) || duration <= 0) return;
    const time = Math.min(duration, Math.max(0, seconds));
    this.audio.currentTime = time; this.update({ currentTime: time });
  };
  setVolume = (volume: number) => { if (!Number.isFinite(volume)) return; this.audio.volume = Math.min(1, Math.max(0, volume)); this.update({ volume: this.audio.volume }); };
  setMuted = (muted: boolean) => { this.audio.muted = muted; this.update({ muted }); };
  next = async () => { const i = this.state.queue.findIndex(t => t.id === this.state.track?.id); const next = this.state.queue[i + 1]; if (next) await this.select(next); };
  previous = async () => { if (this.audio.currentTime > 3) { this.seek(0); return; } const i = this.state.queue.findIndex(t => t.id === this.state.track?.id); const prev = this.state.queue[i - 1]; if (prev) await this.select(prev); };
  remove = (id: string) => {
    const target = this.state.queue.find(t => t.id === id);
    if (this.state.track?.id === id) this.stop();
    this.update({ queue: this.state.queue.filter(t => t.id !== id) }); target?.release?.();
  };
  clearPrivate = () => { this.state.queue.filter(t => t.private).forEach(t => this.remove(t.id)); };
  private stop() { ++this.generation; ++this.intent; this.ready = false; this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.source = null; this.update({ track: null, status: 'idle', wantsPlayback: false, error: null, currentTime: 0, duration: 0 }); }
  clear = () => { this.stop(); this.state.queue.forEach(t => t.release?.()); this.update({ queue: [] }); };
  dispose = () => { this.clear(); for (const name of ['loadedmetadata', 'durationchange', 'timeupdate', 'playing', 'pause', 'waiting', 'ended', 'error', 'volumechange']) this.audio.removeEventListener(name, this.onMedia); this.disposed = true; this.listeners.clear(); };
}
