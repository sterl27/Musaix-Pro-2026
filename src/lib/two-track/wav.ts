/** Encode an AudioBuffer (any channel count) as 16-bit PCM WAV. */
export function encodeWav(buf: AudioBuffer): Blob {
  return encodeWavChannels(
    Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)),
    buf.sampleRate,
  );
}

export function encodeWavChannels(chans: Float32Array[], sampleRate: number): Blob {
  const nch = chans.length;
  const len = chans[0]?.length ?? 0;
  const bytes = 44 + len * nch * 2;
  const ab = new ArrayBuffer(bytes);
  const v = new DataView(ab);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, bytes - 8, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nch, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * nch * 2, true);
  v.setUint16(32, nch * 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, len * nch * 2, true);
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nch; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
