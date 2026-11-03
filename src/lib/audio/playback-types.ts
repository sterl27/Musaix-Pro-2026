export type AudioSource = { src: string; expiresAt?: number };
export type AudioTrack = {
  id: string; title: string; artist?: string; src: string; coverUrl?: string;
  private?: boolean; resolveSource?: () => Promise<AudioSource>; release?: () => void;
};
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'play-required' | 'error';
export type PlaybackState = {
  track: AudioTrack | null; status: PlaybackStatus; error: string | null;
  wantsPlayback: boolean; currentTime: number; duration: number; volume: number; muted: boolean; queue: AudioTrack[];
};
export const EMPTY_PLAYBACK: PlaybackState = { track: null, status: 'idle', error: null, wantsPlayback: false, currentTime: 0, duration: 0, volume: 1, muted: false, queue: [] };
