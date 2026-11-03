import { BEAT_MIME } from './repository';

/** Extension (as stored in the private bucket) for a beat file, or null when the bucket can't take it. */
export function audioExt(file: { name: string; type: string }): string | null {
  const e = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (e in BEAT_MIME) return e;
  if (e === 'mp4') return 'm4a';
  const t = file.type;
  if (/mpeg|mp3/.test(t)) return 'mp3';
  if (/wav/.test(t)) return 'wav';
  if (/mp4|m4a/.test(t)) return 'm4a';
  if (/ogg/.test(t)) return 'ogg';
  if (/aac/.test(t)) return 'aac';
  return null;
}

/** Min/max pairs for drawing a waveform overview at `cols` columns. */
export function peaksOf(buf: AudioBuffer, cols = 1200) {
  const d = buf.getChannelData(0);
  const d2 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : d;
  const per = Math.max(1, Math.floor(d.length / cols));
  const out = new Float32Array(cols * 2);
  for (let x = 0; x < cols; x++) {
    let mn = 0, mx = 0;
    for (let i = x * per; i < Math.min(d.length, (x + 1) * per); i += 2) {
      const v = (d[i] + d2[i]) * 0.5; if (v < mn) mn = v; if (v > mx) mx = v;
    }
    out[x * 2] = mn; out[x * 2 + 1] = mx;
  }
  return out;
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
export const safeTag = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || 'beat';
