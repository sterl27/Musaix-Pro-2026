import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TwoTrackRepository, BEAT_KIND, TAKE_KIND, beatMeta, takeMeta } from '@/lib/two-track/repository';
import { defaultPattern } from '@/lib/two-track/drums';
import type { MusaixTrack } from '@/types/musaix-supabase';

function client(userId: string | null = 'owner') {
  const row = { id: 'take', user_id: 'owner', audio_path: 'owner/take.wav', title: 'Take', metadata: { kind: TAKE_KIND } };
  type StorageResult = Promise<{ error: { message: string } | null }>;
  const upload = vi.fn<(path: string, body: Blob, opts: { contentType: string; upsert: boolean }) => StorageResult>(async () => ({ error: null }));
  const remove = vi.fn<(paths: string[]) => StorageResult>(async () => ({ error: null }));
  const sign = vi.fn(async () => ({ data: { signedUrl: 'https://audio.test/private' }, error: null }));
  const single = vi.fn(async () => ({ data: row, error: null }));
  const limit = vi.fn(async () => ({ data: [row, { ...row, id: 'beat', metadata: { kind: BEAT_KIND } }], error: null }));
  const builder = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit, single };
  const insert = vi.fn<(record: Record<string, unknown>) => typeof builder>(() => builder);
  const storage = { upload, remove, createSignedUrl: sign };
  const from = vi.fn<(table: string) => typeof builder & { insert: typeof insert }>(() => ({ ...builder, insert }));
  const storageFrom = vi.fn<(bucket: string) => typeof storage>(() => storage);
  const sb = { auth: { getUser: vi.fn(async () => ({ data: { user: userId ? { id: userId } : null }, error: null })) }, storage: { from: storageFrom }, from };
  return { repo: new TwoTrackRepository(sb as unknown as SupabaseClient), upload, remove, sign, single, insert, builder, from, storageFrom };
}
const wav = () => new Blob([new Uint8Array(64)], { type: 'audio/wav' });
const takeInfo = { title: 'Verse', bpm: 92, bars: 2, duration: 5.2, pattern: defaultPattern(), swing: 0.1, beatMode: 'seq' as const, beatTrackId: null, presetId: 'cold_case' };

describe('two-track private repository', () => {
  it('requires a signed-in user before touching storage', async () => {
    const { repo, upload } = client(null);
    await expect(repo.saveTake(wav(), takeInfo)).rejects.toThrow(/sign in/i);
    await expect(repo.list()).rejects.toThrow(/sign in/i);
    expect(upload).not.toHaveBeenCalled();
  });
  it('stores takes in the owner folder of the existing private bucket and catalog', async () => {
    const { repo, upload, insert, from, storageFrom } = client();
    await repo.saveTake(wav(), takeInfo);
    expect(storageFrom).toHaveBeenCalledWith('musaix-audio');
    expect(from).toHaveBeenCalledWith('musaix_tracks');
    const [path, , opts] = upload.mock.calls[0];
    expect(path).toMatch(/^owner\/[0-9a-f-]{36}\.wav$/);
    expect(opts).toEqual({ contentType: 'audio/wav', upsert: false });
    const record = insert.mock.calls[0][0];
    expect(record).toMatchObject({ user_id: 'owner', audio_path: path, source_type: 'generated', status: 'uploaded', tempo_bpm: 92 });
    expect(record.metadata).toMatchObject({ kind: TAKE_KIND, bars: 2, swing: 0.1, preset_id: 'cold_case', beat_mode: 'seq' });
  });
  it('stores beats as uploads with tempo and downbeat metadata', async () => {
    const { repo, upload, insert } = client();
    await repo.saveBeat(new Blob([new Uint8Array(32)], { type: 'audio/mpeg' }), 'mp3', { title: 'Beat', bpm: 100, duration: 20, offset: 0.5, loopBars: 4, filename: 'beat.mp3' });
    expect(upload.mock.calls[0][2].contentType).toBe('audio/mpeg');
    expect(insert.mock.calls[0][0]).toMatchObject({ source_type: 'upload', tempo_bpm: 100, metadata: { kind: BEAT_KIND, offset_sec: 0.5, loop_bars: 4 } });
  });
  it('rejects formats the bucket does not accept and empty audio', async () => {
    const { repo, upload } = client();
    await expect(repo.saveBeat(new Blob([new Uint8Array(4)]), 'webm', { title: 'x', bpm: 90, duration: 1, offset: 0, loopBars: null, filename: 'x.webm' })).rejects.toThrow(/MP3|WAV/);
    await expect(repo.saveTake(new Blob([]), takeInfo)).rejects.toThrow(/empty/);
    expect(upload).not.toHaveBeenCalled();
  });
  it('removes the uploaded object when the catalog insert fails', async () => {
    const { repo, single, remove } = client();
    single.mockResolvedValueOnce({ data: null as never, error: { message: 'insert failed' } as never });
    await expect(repo.saveTake(wav(), takeInfo)).rejects.toThrow(/insert failed/);
    expect(remove).toHaveBeenCalledOnce();
  });
  it('reports the orphan path when cleanup fails', async () => {
    const { repo, single, remove } = client();
    single.mockResolvedValueOnce({ data: null as never, error: { message: 'insert failed' } as never });
    remove.mockResolvedValueOnce({ error: { message: 'nope' } as never });
    await expect(repo.saveTake(wav(), takeInfo)).rejects.toThrow(/orphan/i);
  });
  it('lists only the signed-in owner two-track rows and tags their kind', async () => {
    const { repo, builder } = client();
    const rows = await repo.list();
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(builder.in).toHaveBeenCalledWith('metadata->>kind', [TAKE_KIND, BEAT_KIND]);
    expect(rows.map(r => r.kind)).toEqual([TAKE_KIND, BEAT_KIND]);
  });
  it('downloads through owner-checked signed URLs', async () => {
    const { repo, sign, single } = client();
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal('fetch', fetchMock);
    const data = await repo.download('take');
    expect(sign).toHaveBeenCalledWith('owner/take.wav', 900);
    expect(fetchMock).toHaveBeenCalledWith('https://audio.test/private');
    expect(data.byteLength).toBe(3);
    single.mockResolvedValueOnce({ data: { id: 'take', user_id: 'other', audio_path: 'other/take.wav', title: 'x', metadata: {} } as never, error: null });
    await expect(repo.download('take')).rejects.toThrow();
    vi.unstubAllGlobals();
  });
  it('parses stored metadata defensively', () => {
    const t = takeMeta({ metadata: { kind: TAKE_KIND, bars: 9999, pattern: 'junk', beat_track_id: 7 } } as unknown as MusaixTrack);
    expect(t.bars).toBe(512); expect(t.pattern.kick).toHaveLength(16); expect(t.beatTrackId).toBeNull();
    expect(beatMeta({ metadata: null } as unknown as MusaixTrack)).toEqual({ offset: 0, loopBars: null });
  });
});
