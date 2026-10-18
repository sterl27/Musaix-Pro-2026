'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ListMusic, Music2, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { useAudio } from './audio-provider';
export function formatTime(value: number) { if (!Number.isFinite(value) || value < 0) return '0:00'; return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`; }
export function GlobalPlayer() {
  const audio = useAudio();
  const [queueOpen, setQueueOpen] = useState(false);
  const playing = audio.status === 'playing' || (audio.status === 'loading' && audio.wantsPlayback);
  return <section className="audio-dock" aria-label="Audio player">
    {queueOpen ? <div className="audio-queue"><div className="audio-row"><h2>Up next <span>{audio.queue.length}</span></h2><button className="audio-icon" aria-label="Close queue" onClick={() => setQueueOpen(false)}><X size={18}/></button></div>{audio.queue.length ? <ol>{audio.queue.map(track => <li key={track.id}><button className={track.id === audio.track?.id ? 'active' : ''} onClick={() => void audio.select(track)}>{track.title}</button><button className="audio-icon" aria-label={`Remove ${track.title}`} onClick={() => audio.remove(track.id)}><X size={15}/></button></li>)}</ol> : <p>Your queue is empty.</p>}</div> : null}
    <div className="audio-track-label"><span className="audio-art"><Music2 size={21}/></span><div><strong>{audio.track?.title ?? 'Open a song to begin'}</strong><span>{audio.track?.artist ?? (audio.track ? 'MUSAIX AUDIO' : 'Your sound. In motion.')}</span></div></div>
    <div className="audio-transport"><div className="audio-buttons"><button className="audio-icon" aria-label="Previous track" disabled={!audio.track} onClick={() => void audio.previous()}><SkipBack size={18}/></button><button className="audio-play" aria-label={playing ? 'Pause' : 'Play'} disabled={!audio.track || !audio.ready} onClick={() => playing ? audio.pause() : void audio.play()}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button><button className="audio-icon" aria-label="Next track" disabled={!audio.track || audio.queue.findIndex(t => t.id === audio.track?.id) >= audio.queue.length - 1} onClick={() => void audio.next()}><SkipForward size={18}/></button></div><div className="audio-progress"><time>{formatTime(audio.currentTime)}</time><input aria-label="Seek" type="range" min="0" max={audio.duration || 0} step="0.1" value={Math.min(audio.currentTime, audio.duration || 0)} disabled={!audio.duration} onChange={event => audio.seek(Number(event.target.value))}/><time>{formatTime(audio.duration)}</time></div></div>
    <div className="audio-extra"><button className="audio-icon" aria-label={audio.muted ? 'Unmute' : 'Mute'} onClick={() => audio.setMuted(!audio.muted)}>{audio.muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={audio.volume} onChange={event => audio.setVolume(Number(event.target.value))}/><button className="audio-icon" aria-label="Queue" aria-expanded={queueOpen} onClick={() => setQueueOpen(!queueOpen)}><ListMusic size={20}/></button><Link href="/audio" className="audio-library-link">Library</Link></div>
    <div className="audio-playback-message" role="status" aria-live="polite">{audio.error ?? (audio.status === 'loading' ? 'Loading audio…' : '')}</div>
  </section>;
}
