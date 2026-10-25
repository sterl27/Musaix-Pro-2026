// Synthesized drum voices. Each works on any BaseAudioContext (live or offline).
export type DrumId = "kick" | "snare" | "clap" | "chh" | "ohh";
export const DRUMS: { id: DrumId; name: string }[] = [
  { id: "kick", name: "Kick" },
  { id: "snare", name: "Snare" },
  { id: "clap", name: "Clap" },
  { id: "chh", name: "Closed Hat" },
  { id: "ohh", name: "Open Hat" },
];
export const STEPS = 16;
export type Pattern = Record<DrumId, boolean[]>;

export function defaultPattern(): Pattern {
  const on = (idx: number[]) => Array.from({ length: STEPS }, (_, i) => idx.includes(i));
  return {
    kick: on([0, 7, 8, 10]),
    snare: on([4, 12]),
    clap: on([12]),
    chh: on([0, 2, 4, 6, 8, 10, 12]),
    ohh: on([14]),
  };
}
export function emptyPattern(): Pattern {
  const e = () => Array(STEPS).fill(false) as boolean[];
  return { kick: e(), snare: e(), clap: e(), chh: e(), ohh: e() };
}
export function sanitizePattern(p: unknown): Pattern {
  const out = emptyPattern();
  if (p && typeof p === "object") {
    for (const d of DRUMS) {
      const row = (p as Record<string, unknown>)[d.id];
      if (Array.isArray(row)) for (let i = 0; i < STEPS; i++) out[d.id][i] = !!row[i];
    }
  }
  return out;
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ac: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(ac);
  if (!b) {
    b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ac, b);
  }
  return b;
}
function noiseSrc(ac: BaseAudioContext, t: number, dur: number) {
  const s = ac.createBufferSource();
  s.buffer = noise(ac);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur);
  return s;
}

/** Per-context voice state (open-hat choke). */
export interface VoiceState { ohh?: GainNode }

export function playDrum(ac: BaseAudioContext, dest: AudioNode, id: DrumId, t: number, vs: VoiceState) {
  switch (id) {
    case "kick": {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      g.gain.setValueAtTime(1.0, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g).connect(dest);
      o.start(t);
      o.stop(t + 0.52);
      // click transient
      const n = noiseSrc(ac, t, 0.01);
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0.25, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
      n.connect(ng).connect(dest);
      break;
    }
    case "snare": {
      const n = noiseSrc(ac, t, 0.25);
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1200;
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0.7, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      n.connect(hp).connect(ng).connect(dest);
      const o = ac.createOscillator();
      const og = ac.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
      og.gain.setValueAtTime(0.6, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(og).connect(dest);
      o.start(t);
      o.stop(t + 0.14);
      break;
    }
    case "clap": {
      const n = noiseSrc(ac, t, 0.3);
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1400;
      bp.Q.value = 0.9;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      for (let k = 0; k < 3; k++) {
        const tk = t + k * 0.011;
        g.gain.setValueAtTime(0.8, tk);
        g.gain.exponentialRampToValueAtTime(0.1, tk + 0.009);
      }
      g.gain.setValueAtTime(0.7, t + 0.034);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      n.connect(bp).connect(g).connect(dest);
      break;
    }
    case "chh":
    case "ohh": {
      const open = id === "ohh";
      const dur = open ? 0.38 : 0.06;
      if (vs.ohh) {
        // choke any ringing open hat
        const p = vs.ohh.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => void };
        if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t);
        else p.cancelScheduledValues(t);
        p.setTargetAtTime(0, t, 0.006);
        vs.ohh = undefined;
      }
      const n = noiseSrc(ac, t, dur + 0.05);
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const g = ac.createGain();
      g.gain.setValueAtTime(open ? 0.32 : 0.38, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      n.connect(hp).connect(g).connect(dest);
      if (open) vs.ohh = g;
      break;
    }
  }
}

export function playClick(ac: BaseAudioContext, dest: AudioNode, t: number, accent: boolean) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "square";
  o.frequency.value = accent ? 1760 : 1100;
  g.gain.setValueAtTime(accent ? 0.35 : 0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.04);
}
