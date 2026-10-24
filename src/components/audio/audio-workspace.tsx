'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ArrowUpRight, Upload, Play, Plus, Headphones, LogOut, CloudUpload } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { TrackRepository, validateAudioFile } from '@/lib/audio/track-repository';
import type { MusaixTrack } from '@/types/musaix-supabase';
import { useAudio } from './audio-provider';
import { formatTime } from './global-player';
export function AudioWorkspace() {
  const audio = useAudio();
  const clientRef = useRef<SupabaseClient | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const accountEpoch = useRef(0);
  const selection = useRef(0);
  const busyRef = useRef(false);
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [user,setUser]=useState<string|null>(null); const [tracks,setTracks]=useState<MusaixTrack[]>([]);
  const [file,setFile]=useState<File|null>(null); const [busy,setBusy]=useState(false); const [dragging,setDragging]=useState(false);
  const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [configured]=useState(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));
  useEffect(()=>{
    mounted.current=true;
    let off:(()=>void)|undefined;
    try {
      const client=createClient(); clientRef.current=client;
      const {data}=client.auth.onAuthStateChange((_event,session)=>{
        const epoch=++accountEpoch.current;
        setUser(session?.user.email??(session?.user?'Signed in':null));setTracks([]);
        // Defer auth-dependent requests outside the auth callback lock.
        if(session?.user) void Promise.resolve().then(()=>new TrackRepository(client).listTracks()).then(rows=>{if(mounted.current&&epoch===accountEpoch.current)setTracks(rows);}).catch(e=>{if(mounted.current&&epoch===accountEpoch.current)setError(e.message);});
      });
      off=()=>data.subscription.unsubscribe();
    } catch { /* Local audio remains available when cloud configuration is absent. */ }
    // The counters deliberately invalidate in-flight work; these are not DOM refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return ()=>{mounted.current=false;++accountEpoch.current;++selection.current;off?.();};
  },[]);
  const repository=()=>{if(!clientRef.current)throw new Error('Private library is not configured. Local playback is available.');return new TrackRepository(clientRef.current);};
  async function openFile(chosen?:File){
    if(!chosen || !audio.ready || busyRef.current)return;
    const token=++selection.current;
    setError('');setMessage('Checking audio…');
    try{
      await validateAudioFile(chosen);
      if(!mounted.current||token!==selection.current)return;
      const src=URL.createObjectURL(chosen);
      setFile(chosen);
      await audio.select({id:crypto.randomUUID(),title:chosen.name.replace(/\.(wav|mp3)$/i,''),src,release:()=>URL.revokeObjectURL(src)});
      if(mounted.current)setMessage('Opened locally. Your file stays on this device until you save it.');
    }catch(e){if(mounted.current){setError(e instanceof Error?e.message:'Unable to open audio.');setMessage('');}}
  }
  async function save(){
    if(!file||busyRef.current)return;
    busyRef.current=true;setBusy(true);setError('');setMessage('Saving to your private library…');
    const epoch=accountEpoch.current;
    try{const repo=repository();const row=await repo.uploadTrack(file);if(!mounted.current||epoch!==accountEpoch.current)return;setTracks(current=>[row,...current]);setFile(null);setMessage('Saved privately. Available in your library.');}
    catch(e){if(mounted.current&&epoch===accountEpoch.current){setError(e instanceof Error?e.message:'Save failed.');setMessage('');}}
    finally{busyRef.current=false;if(mounted.current)setBusy(false);}
  }
  async function signIn(event:React.FormEvent){event.preventDefault();if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');try{const client=clientRef.current;if(!client)throw new Error('Private library is not configured.');const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;setPassword('');setMessage('Signed in. Your library is ready.');}catch(e){setError(e instanceof Error?e.message:'Sign in failed.');}finally{busyRef.current=false;setBusy(false);}}
  async function signOut(){setError('');try{const {error}=await clientRef.current!.auth.signOut();if(error)throw error;setMessage('Signed out.');}catch(e){setError(e instanceof Error?e.message:'Sign out failed.');}}
  function drop(event:DragEvent){event.preventDefault();setDragging(false);if(event.dataTransfer.files.length!==1){setError('Open one song at a time.');return;}void openFile(event.dataTransfer.files[0]);}
  return <main className="audio-workspace">
    <nav className="audio-nav" aria-label="Workspace"><Link href="/" className="audio-brand">MUSAIX <b>PRO</b></Link><div className="audio-links"><Link href="/studio">Studio</Link><Link href="/canvas">Canvas</Link><Link href="/audio" aria-current="page">Audio</Link></div></nav>
    <header className="audio-hero"><span className="audio-eyebrow">Your sound. An entire universe.</span><h1>Everything starts<br/>with a song.</h1><p>Drop in a track. Keep listening as you move through your workspace. Save it when you’re ready.</p></header>
    <section className={`audio-drop ${dragging?'dragging':''}`} aria-label="Open audio" onDragOver={event=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={drop}>
      <Headphones size={30} strokeWidth={1.3}/><h2>{file?file.name:'Bring your sound.'}</h2><p>Drag a song here, or choose a file.<br/>WAV or MP3 · Up to 100 MB</p>
      <div className="audio-actions"><button className="audio-primary" disabled={!audio.ready||busy} onClick={()=>input.current?.click()}><Upload size={15}/>Open audio</button>{file?<button className="audio-secondary" disabled={!user||busy} onClick={()=>void save()}><CloudUpload size={15}/>{busy?'Saving…':'Save to library'}</button>:null}</div>
      <input ref={input} type="file" aria-label="Choose audio file" className="audio-sr-only" accept=".wav,.mp3,audio/wav,audio/mpeg" disabled={busy} onChange={event=>{void openFile(event.target.files?.[0]);event.target.value='';}}/>
    </section>
    <div className="audio-message" role={error?'alert':'status'}>{error||message}</div>
    <section className="audio-section" aria-label="Private library"><div className="audio-row"><h2>Your library</h2><span className="audio-section-note">{user?'Private · Only you':'Sign in to save your songs'}</span></div>
      {user?<div className="audio-row" style={{marginTop:16}}><span className="audio-section-note">{user}</span><button className="audio-secondary" disabled={busy} onClick={()=>void signOut()}><LogOut size={14}/>Sign out</button></div>:configured?<details className="audio-auth"><summary>Sign in to your private library</summary><form onSubmit={signIn}><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="audio-primary" disabled={busy}>Sign in<ArrowUpRight size={15}/></button></form></details>:<p className="audio-empty">Local playback is ready. Private library access needs cloud configuration.</p>}
      {tracks.length?<ol className="audio-tracklist">{tracks.map((track,i)=><li key={track.id}><span className="audio-index">{String(i+1).padStart(2,'0')}</span><div className="audio-title"><strong>{track.title}</strong><span>{track.artist||'Your upload'}{track.duration_sec?` · ${formatTime(track.duration_sec)}`:''}</span></div><span className="audio-badge">Private</span><button className="audio-icon" aria-label={`Play ${track.title}`} onClick={()=>void audio.select(repository().toAudioTrack(track))}><Play size={17}/></button><button className="audio-icon" aria-label={`Queue ${track.title}`} onClick={()=>{audio.enqueue(repository().toAudioTrack(track));setMessage('Added to your queue.');}}><Plus size={18}/></button></li>)}</ol>:<div className="audio-empty">{user?'Your library is ready for its first song.':'Listen locally now. Sign in whenever you want to keep a track in your private library.'}</div>}
    </section><p className="audio-footer">One song. One shared player. Studio, Canvas, and everything next.<br/>Audio analysis and metering are coming in a separate milestone.</p>
  </main>;
}
