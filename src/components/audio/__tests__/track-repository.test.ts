import { describe, it, expect, vi } from 'vitest';
import { TrackRepository, validateAudioFile, MAX_AUDIO_BYTES } from '@/lib/audio/track-repository';
import type { SupabaseClient } from '@supabase/supabase-js';
const wav=()=>new File([new Uint8Array([82,73,70,70,36,0,0,0,87,65,86,69,102,109,116,32])],'song.wav',{type:'audio/wav'});
// jsdom lacks Blob.arrayBuffer; this implements actual bytes for the fixture.
function file(){const f=wav();Object.defineProperty(f,'slice',{configurable:true,value:()=>({arrayBuffer:async()=>new Uint8Array([82,73,70,70,36,0,0,0,87,65,86,69]).buffer})});return f;}
function client(userId:string|null='owner'){
 const row={id:'track',user_id:'owner',audio_path:'owner/track.wav',title:'song'};
 const remove=vi.fn(async()=>({error:null}));const upload=vi.fn(async()=>({error:null}));const sign=vi.fn(async()=>({data:{signedUrl:'https://audio.test/private'},error:null}));
 const single=vi.fn(async()=>({data:row,error:null}));const builder={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single,order:vi.fn().mockReturnThis(),limit:vi.fn().mockResolvedValue({data:[row],error:null})};
 const insert=vi.fn(()=>builder);const storage={upload,remove,createSignedUrl:sign};
 const sb={auth:{getUser:vi.fn(async()=>({data:{user:userId?{id:userId}:null},error:null}))},storage:{from:()=>storage},from:()=>({...builder,insert})};
 return {repo:new TrackRepository(sb as unknown as SupabaseClient),single,upload,remove,sign,row};
}
describe('private audio repository',()=>{
 it('accepts WAV and MP3 headers',async()=>{await expect(validateAudioFile(file())).resolves.toBe('wav');const f=new File(['ID3more audio'],'song.mp3',{type:'audio/mpeg'});Object.defineProperty(f,'slice',{configurable:true,value:()=>({arrayBuffer:async()=>new TextEncoder().encode('ID3more audio').buffer})});await expect(validateAudioFile(f)).resolves.toBe('mp3');});
 it('rejects unsupported, empty, oversized and disguised files',async()=>{await expect(validateAudioFile(new File(['x'],'x.txt'))).rejects.toThrow(/WAV|MP3/);await expect(validateAudioFile(new File([],'x.wav',{type:'audio/wav'}))).rejects.toThrow(/empty/);const large=file();Object.defineProperty(large,'size',{value:MAX_AUDIO_BYTES+1});await expect(validateAudioFile(large)).rejects.toThrow(/100/);const fake=file();Object.defineProperty(fake,'slice',{value:()=>({arrayBuffer:async()=>new Uint8Array(12).buffer})});await expect(validateAudioFile(fake)).rejects.toThrow(/header|valid/i);});
 it('requires authentication before upload',async()=>{const {repo,upload}=client(null);await expect(repo.uploadTrack(file())).rejects.toThrow(/sign in/i);expect(upload).not.toHaveBeenCalled();});
 it('rejects caller supplied ownership mismatch',async()=>{const {repo,upload}=client();await expect(repo.uploadTrack(file(),'other')).rejects.toThrow(/owner|account/i);expect(upload).not.toHaveBeenCalled();});
 it('rolls back the object after a failed catalog insert',async()=>{const {repo,single,remove}=client();single.mockResolvedValueOnce({data:null as never,error:{message:'insert failed'} as never});await expect(repo.uploadTrack(file())).rejects.toThrow(/insert failed/);expect(remove).toHaveBeenCalledOnce();});
 it('does not insert a catalog record after storage failure',async()=>{const {repo,upload,single}=client();upload.mockResolvedValueOnce({error:{message:'storage failed'} as never});await expect(repo.uploadTrack(file())).rejects.toThrow(/storage failed/);expect(single).not.toHaveBeenCalled();});
 it('surfaces cleanup failure with the orphan path',async()=>{const {repo,single,remove}=client();single.mockResolvedValueOnce({data:null as never,error:{message:'insert failed'} as never});remove.mockResolvedValueOnce({error:{message:'cleanup failed'} as never});await expect(repo.uploadTrack(file())).rejects.toThrow(/cleanup|orphan/i);});
 it('refuses another user row before signing',async()=>{const {repo,sign,single,row}=client();single.mockResolvedValueOnce({data:{...row,user_id:'other'},error:null});await expect(repo.resolveTrackUrl('track')).rejects.toThrow(/owner|access/i);expect(sign).not.toHaveBeenCalled();});
 it('refuses a path outside the owner folder',async()=>{const {repo,sign,single,row}=client();single.mockResolvedValueOnce({data:{...row,audio_path:'other/track.wav'},error:null});await expect(repo.resolveTrackUrl('track')).rejects.toThrow(/path|access/i);expect(sign).not.toHaveBeenCalled();});
 it('signs authorized stored paths with a short expiry',async()=>{const {repo,sign}=client();const result=await repo.resolveTrackUrl('track');expect(result.src).toContain('private');expect(result.expiresAt).toBeGreaterThan(Date.now());expect(sign).toHaveBeenCalledWith('owner/track.wav',900);});
});
