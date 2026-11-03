import type { SupabaseClient } from '@supabase/supabase-js';
import type { MusaixTrack } from '@/types/musaix-supabase';
import type { AudioSource, AudioTrack } from './playback-types';

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const BUCKET = 'musaix-audio';
const fail = (error: { message: string } | null, fallback: string) => new Error(error?.message || fallback);
/** Header validation is a format sanity check, not a claim of complete decode validity. */
export async function validateAudioFile(file: File): Promise<'wav' | 'mp3'> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'wav' && extension !== 'mp3') throw new Error('Choose a WAV or MP3 file.');
  if (!file.size) throw new Error('The audio file is empty.');
  if (file.size > MAX_AUDIO_BYTES) throw new Error('Audio must be 100 MB or smaller.');
  const allowed = extension === 'wav' ? ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'] : ['audio/mpeg', 'audio/mp3'];
  if (file.type && file.type !== 'application/octet-stream' && !allowed.includes(file.type)) throw new Error('File type does not match WAV or MP3.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  const valid = extension === 'wav' ? text.startsWith('RIFF') && text.slice(8, 12) === 'WAVE' : text.startsWith('ID3') || (bytes.length >= 2 && bytes[0] === 255 && (bytes[1] & 224) === 224);
  if (!valid) throw new Error('The file does not have a valid audio header.');
  return extension;
}
export class TrackRepository {
  constructor(private client: SupabaseClient) {}
  private async user() {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new Error('Sign in to use your private library.');
    return data.user;
  }
  async listTracks(): Promise<MusaixTrack[]> {
    const user = await this.user();
    const { data, error } = await this.client.from('musaix_tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    if (error) throw fail(error, 'Unable to load tracks.');
    return (data ?? []) as MusaixTrack[];
  }
  async uploadTrack(file: File, assertedUserId?: string): Promise<MusaixTrack> {
    const user = await this.user();
    if (assertedUserId && assertedUserId !== user.id) throw new Error('Track owner does not match the signed-in account.');
    const extension = await validateAudioFile(file);
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}.${extension}`;
    const bucket = this.client.storage.from(BUCKET);
    const { error: uploadError } = await bucket.upload(path, file, { contentType: extension === 'wav' ? 'audio/wav' : 'audio/mpeg', upsert: false });
    if (uploadError) throw fail(uploadError, 'Upload failed.');
    try {
      const { data, error } = await this.client.from('musaix_tracks').insert({ id, user_id: user.id, title: file.name.replace(/\.(wav|mp3)$/i, ''), audio_path: path, source_type: 'upload', status: 'uploaded', metadata: { original_filename: file.name, size_bytes: file.size } }).select('*').single();
      if (error || !data) throw fail(error, 'Catalog insert failed.');
      return data as MusaixTrack;
    } catch (error) {
      // Storage and Postgres are separate transactions: compensate, and expose a failed compensation.
      let cleanupFailed = false;
      try { const cleanup = await bucket.remove([path]); cleanupFailed = Boolean(cleanup.error); } catch { cleanupFailed = true; }
      if (cleanupFailed) throw new Error(`Saving failed; cleanup could not finish. Orphan object: ${path}. Retry cleanup before uploading again.`);
      throw error instanceof Error ? error : new Error('Saving the catalog record failed; uploaded file removed.');
    }
  }
  async resolveTrackUrl(id: string): Promise<AudioSource> {
    const user = await this.user();
    // Re-read the authoritative row: never sign a caller-provided storage path.
    const { data, error } = await this.client.from('musaix_tracks').select('*').eq('id', id).eq('user_id', user.id).single();
    if (error || !data || data.user_id !== user.id) throw new Error('You do not have access to this track.');
    const path = data.audio_path as string | null;
    if (!path || !path.startsWith(`${user.id}/`) || path.split('/').some(part => part === '..' || part === '.')) throw new Error('Track path is outside your private library.');
    const { data: signed, error: signError } = await this.client.storage.from(BUCKET).createSignedUrl(path, 900);
    if (signError || !signed) throw fail(signError, 'Unable to authorize playback.');
    return { src: signed.signedUrl, expiresAt: Date.now() + 900000 };
  }
  toAudioTrack(track: MusaixTrack): AudioTrack { return { id: track.id, title: track.title, artist: track.artist ?? undefined, src: '', private: true, resolveSource: () => this.resolveTrackUrl(track.id) }; }
}
