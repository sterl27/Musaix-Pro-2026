'use client';
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AudioRuntime } from '@/lib/audio/audio-runtime';
import { EMPTY_PLAYBACK, type AudioTrack } from '@/lib/audio/playback-types';
import { createClient } from '@/lib/supabase/client';
const RuntimeContext = createContext<AudioRuntime | null>(null);
const noSubscribe = () => () => {};
const emptySnapshot = () => EMPTY_PLAYBACK;
export function AudioProvider({ children }: { children: ReactNode }) {
  const element = useRef<HTMLAudioElement>(null);
  const [runtime, setRuntime] = useState<AudioRuntime | null>(null);
  useEffect(() => {
    if (!element.current) return;
    const next = new AudioRuntime(element.current);
    setRuntime(next);
    let unsubscribe: (() => void) | undefined;
    try {
      const client = createClient();
      let previousUser: string | undefined;
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const user = session?.user.id;
        if (event === 'SIGNED_OUT' || (previousUser && previousUser !== user)) next.clearPrivate();
        previousUser = user;
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch { /* Local playback works without configured cloud credentials. */ }
    return () => { unsubscribe?.(); next.dispose(); };
  }, []);
  return <RuntimeContext.Provider value={runtime}><audio ref={element} preload="metadata" data-testid="global-audio" hidden />{children}</RuntimeContext.Provider>;
}
export function useAudio() {
  const runtime = useContext(RuntimeContext);
  const state = useSyncExternalStore(runtime?.subscribe ?? noSubscribe, runtime?.getSnapshot ?? emptySnapshot, emptySnapshot);
  return {
    ...state, ready: Boolean(runtime),
    load: (track: AudioTrack) => runtime?.load(track) ?? Promise.resolve(),
    select: (track: AudioTrack) => runtime?.select(track) ?? Promise.resolve(),
    play: () => runtime?.play() ?? Promise.resolve(), pause: () => runtime?.pause(),
    seek: (seconds: number) => runtime?.seek(seconds), setVolume: (value: number) => runtime?.setVolume(value), setMuted: (muted: boolean) => runtime?.setMuted(muted),
    next: () => runtime?.next() ?? Promise.resolve(), previous: () => runtime?.previous() ?? Promise.resolve(),
    enqueue: (track: AudioTrack) => runtime?.enqueue(track), remove: (id: string) => runtime?.remove(id), clear: () => runtime?.clear(),
  };
}
