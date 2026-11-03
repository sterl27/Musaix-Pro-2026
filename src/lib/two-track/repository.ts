import type { SupabaseClient } from '@supabase/supabase-js';
import { MUSAIX_BUCKETS, type Json, type MusaixTrack } from '@/types/musaix-supabase';
import { MAX_AUDIO_BYTES, TrackRepository } from '@/lib/audio/track-repository';
import { sanitizePattern, type Pattern } from './drums';

/**
 * Two-track takes and beats live in the studio's existing private catalog:
 * `musaix_tracks` rows (owner-only RLS) + objects at `musaix-audio/<user id>/<id>.<ext>`.
 * The kind and the two-track details are kept in `metadata`, so no new tables are needed
 * and saved takes also show up in the /audio library and the global player.
 */
const BUCKET = MUSAIX_BUCKETS.audio;
export const TAKE_KIND = 'two_track_take';
export const BEAT_KIND = 'two_track_beat';

/** Formats the private bucket accepts (its allowed MIME list). */
export const BEAT_MIME: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg' };

export type BeatMeta = { kind: typeof BEAT_KIND; offset_sec: number; loop_bars: number | null; original_filename: string; size_bytes: number };
export type TakeMeta = {
  kind: typeof TAKE_KIND; bars: number; pattern: Pattern; swing: number; beat_mode: 'seq' | 'audio';
  beat_track_id: string | null; preset_id: string | null; size_bytes: number;
};
export type TwoTrackItem = MusaixTrack & { kind: typeof TAKE_KIND | typeof BEAT_KIND };

const fail = (error: { message: string } | null, fallback: string) => new Error(error?.message || fallback);
const meta = (row: MusaixTrack) => (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {}) as Record<string, Json | undefined>;

export function beatMeta(row: MusaixTrack) {
  const m = meta(row);
  return { offset: Number(m.offset_sec) || 0, loopBars: typeof m.loop_bars === 'number' ? m.loop_bars : null };
}
export function takeMeta(row: MusaixTrack) {
  const m = meta(row);
  return {
    bars: Math.max(1, Math.min(512, Number(m.bars) || 1)),
    pattern: sanitizePattern(m.pattern),
    swing: Number(m.swing) || 0,
    beatTrackId: typeof m.beat_track_id === 'string' ? m.beat_track_id : null,
    presetId: typeof m.preset_id === 'string' ? m.preset_id : null,
  };
}

export class TwoTrackRepository {
  private tracks: TrackRepository;
  constructor(private client: SupabaseClient) { this.tracks = new TrackRepository(client); }
  private async user() {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new Error('Sign in to save to your private studio library.');
    return data.user;
  }
  async list(): Promise<TwoTrackItem[]> {
    const user = await this.user();
    const { data, error } = await this.client.from('musaix_tracks').select('*').eq('user_id', user.id)
      .in('metadata->>kind', [TAKE_KIND, BEAT_KIND]).order('created_at', { ascending: false }).limit(100);
    if (error) throw fail(error, 'Unable to load the studio library.');
    return ((data ?? []) as MusaixTrack[]).map(row => ({ ...row, kind: meta(row).kind === BEAT_KIND ? BEAT_KIND : TAKE_KIND }));
  }
  private async insert(blob: Blob, ext: string, row: Omit<Partial<MusaixTrack>, 'metadata'> & { title: string; metadata: BeatMeta | TakeMeta }): Promise<MusaixTrack> {
    const user = await this.user();
    if (!blob.size) throw new Error('The audio is empty.');
    if (blob.size > MAX_AUDIO_BYTES) throw new Error('Audio must be 100 MB or smaller.');
    const contentType = BEAT_MIME[ext];
    if (!contentType) throw new Error('Save MP3, WAV, M4A, AAC or OGG audio.');
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}.${ext}`;
    const bucket = this.client.storage.from(BUCKET);
    const { error: uploadError } = await bucket.upload(path, blob, { contentType, upsert: false });
    if (uploadError) throw fail(uploadError, 'Upload failed.');
    try {
      const { data, error } = await this.client.from('musaix_tracks').insert({ ...row, id, user_id: user.id, audio_path: path, status: 'uploaded' }).select('*').single();
      if (error || !data) throw fail(error, 'Catalog insert failed.');
      return data as MusaixTrack;
    } catch (error) {
      // Storage and Postgres are separate transactions: remove the object, and expose a failed cleanup.
      let cleanupFailed = false;
      try { const cleanup = await bucket.remove([path]); cleanupFailed = Boolean(cleanup.error); } catch { cleanupFailed = true; }
      if (cleanupFailed) throw new Error(`Saving failed; cleanup could not finish. Orphan object: ${path}.`);
      throw error instanceof Error ? error : new Error('Saving failed; uploaded file removed.');
    }
  }
  saveBeat(blob: Blob, ext: string, info: { title: string; bpm: number; duration: number; offset: number; loopBars: number | null; filename: string }) {
    return this.insert(blob, ext, {
      title: info.title.slice(0, 120), source_type: 'upload', tempo_bpm: info.bpm, duration_sec: info.duration,
      metadata: { kind: BEAT_KIND, offset_sec: info.offset, loop_bars: info.loopBars, original_filename: info.filename.slice(0, 200), size_bytes: blob.size },
    });
  }
  saveTake(wav: Blob, info: { title: string; bpm: number; bars: number; duration: number; pattern: Pattern; swing: number; beatMode: 'seq' | 'audio'; beatTrackId: string | null; presetId: string | null }) {
    return this.insert(wav, 'wav', {
      title: info.title.slice(0, 120), artist: 'Musaix Studio · 2-Track', source_type: 'generated', tempo_bpm: info.bpm, duration_sec: info.duration,
      metadata: { kind: TAKE_KIND, bars: info.bars, pattern: info.pattern, swing: info.swing, beat_mode: info.beatMode, beat_track_id: info.beatTrackId, preset_id: info.presetId, size_bytes: wav.size },
    });
  }
  /** Ownership and path checks are TrackRepository's: it re-reads the row and signs a 15-minute URL. */
  async download(id: string): Promise<ArrayBuffer> {
    const { src } = await this.tracks.resolveTrackUrl(id);
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`);
    return res.arrayBuffer();
  }
  toAudioTrack(row: MusaixTrack) { return this.tracks.toAudioTrack(row); }
}
