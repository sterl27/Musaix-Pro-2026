import { FFT_SIZE } from '@/lib/visualizer/analysis';
import {
  AUDIO_UNSUPPORTED,
  MIC_UNSUPPORTED,
  UNDECODABLE_FILE,
  audioFileIssue,
  connectsToSpeakers,
  micErrorMessage,
  trackTitle,
  type SourceKind,
} from '@/lib/visualizer/sources';

export class VisualizerEngine {
  frequency: Uint8Array<ArrayBuffer>;
  timeDomain: Uint8Array<ArrayBuffer>;
  kind: SourceKind = 'idle';
  trackName = '';

  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioNode | null = null;
  private gain: GainNode | null = null;
  private stream: MediaStream | null = null;
  private element: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private volume = 0.8;
  private generation = 0;

  constructor() {
    this.frequency = new Uint8Array(FFT_SIZE / 2);
    this.timeDomain = new Uint8Array(FFT_SIZE);
  }

  get sampleRate(): number {
    return this.context?.sampleRate ?? 48000;
  }

  get fftSize(): number {
    return this.analyser?.fftSize ?? FFT_SIZE;
  }

  get playing(): boolean {
    return Boolean(this.element && !this.element.paused && !this.element.ended);
  }

  get currentTime(): number {
    return this.element?.currentTime ?? 0;
  }

  get duration(): number {
    const value = this.element?.duration ?? 0;
    return Number.isFinite(value) ? value : 0;
  }

  /** Construct the context during a user gesture. Resume if the browser suspended it. */
  async resume(): Promise<void> {
    const context = this.ensureContext();
    if (context.state === 'suspended') await context.resume();
  }

  setSmoothing(value: number): void {
    if (!this.analyser || !Number.isFinite(value)) return;
    this.analyser.smoothingTimeConstant = Math.min(0.95, Math.max(0, value));
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.gain) this.gain.gain.value = this.volume;
    if (this.element) this.element.volume = this.volume;
  }

  /** Returns false when a newer source request superseded this one. */
  async useMicrophone(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error(MIC_UNSUPPORTED);
    }
    const generation = this.claim();
    const context = this.ensureContext();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
    } catch (error) {
      throw new Error(micErrorMessage(error));
    }
    if (this.stale(generation)) {
      stopStream(stream);
      return false;
    }
    if (context.state === 'suspended') await context.resume();
    if (this.stale(generation)) {
      stopStream(stream);
      return false;
    }
    try {
      const source = context.createMediaStreamSource(stream);
      this.releaseSource();
      if (this.stale(generation)) {
        try {
          source.disconnect();
        } catch {
          /* Node was already disconnected. */
        }
        stopStream(stream);
        return false;
      }
      source.connect(this.analyser!);
      // The mic graph stops at the analyser. It is never connected to the speakers.
      this.routeAnalyser('mic');
      this.source = source;
      this.stream = stream;
      this.kind = 'mic';
      this.trackName = 'Microphone';
      return true;
    } catch (error) {
      stopStream(stream);
      throw error instanceof Error ? error : new Error(MIC_UNSUPPORTED);
    }
  }

  /** Returns true when playback started. A false return means the user still needs to press play. */
  async useFile(file: File): Promise<boolean> {
    const issue = audioFileIssue(file.name);
    if (issue) throw new Error(issue);
    const generation = this.claim();
    const context = this.ensureContext();
    const url = URL.createObjectURL(file);
    let element: HTMLAudioElement;
    try {
      element = await loadMedia(url);
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
    if (this.stale(generation)) {
      discardElement(element, url);
      return false;
    }
    if (context.state === 'suspended') await context.resume();
    if (this.stale(generation)) {
      discardElement(element, url);
      return false;
    }
    this.releaseSource();
    if (this.stale(generation)) {
      discardElement(element, url);
      return false;
    }
    const source = context.createMediaElementSource(element);
    const gain = context.createGain();
    element.volume = this.volume;
    gain.gain.value = this.volume;
    source.connect(gain);
    gain.connect(this.analyser!);
    this.routeAnalyser('file');
    this.source = source;
    this.gain = gain;
    this.element = element;
    this.objectUrl = url;
    this.kind = 'file';
    this.trackName = trackTitle(file.name);
    try {
      await element.play();
      return true;
    } catch {
      return false;
    }
  }

  play(): Promise<void> {
    if (!this.element) return Promise.resolve();
    return this.element.play().then(
      () => undefined,
      () => undefined,
    );
  }

  pause(): void {
    this.element?.pause();
  }

  seek(seconds: number): void {
    if (!this.element || !Number.isFinite(seconds)) return;
    const limit = this.duration;
    this.element.currentTime = limit > 0 ? Math.min(Math.max(0, seconds), limit) : Math.max(0, seconds);
  }

  pull(): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(this.frequency);
    this.analyser.getByteTimeDomainData(this.timeDomain);
    return true;
  }

  destroy(): void {
    this.generation += 1;
    this.releaseSource();
    const context = this.context;
    this.context = null;
    this.analyser = null;
    if (context && context.state !== 'closed') void context.close();
  }

  /** Newer mic or file choices invalidate a request that is still waiting. */
  private claim(): number {
    this.generation += 1;
    return this.generation;
  }

  private stale(generation: number): boolean {
    return generation !== this.generation;
  }

  private ensureContext(): AudioContext {
    if (this.context) return this.context;
    if (typeof AudioContext === 'undefined') throw new Error(AUDIO_UNSUPPORTED);
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.65;
    this.context = context;
    this.analyser = analyser;
    if (this.frequency.length !== analyser.frequencyBinCount) this.frequency = new Uint8Array(analyser.frequencyBinCount);
    if (this.timeDomain.length !== analyser.fftSize) this.timeDomain = new Uint8Array(analyser.fftSize);
    return context;
  }

  private routeAnalyser(kind: 'mic' | 'file'): void {
    if (!this.analyser || !this.context || !connectsToSpeakers(kind)) return;
    this.analyser.connect(this.context.destination);
  }

  private releaseSource(): void {
    try {
      this.source?.disconnect();
    } catch {
      /* Node was already disconnected. */
    }
    try {
      this.gain?.disconnect();
    } catch {
      /* Node was already disconnected. */
    }
    try {
      this.analyser?.disconnect();
    } catch {
      /* Analyser had no outputs. */
    }
    this.source = null;
    this.gain = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.element) {
      this.element.onerror = null;
      this.element.pause();
      this.element.removeAttribute('src');
      this.element.load();
      this.element = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.kind = 'idle';
    this.trackName = '';
  }
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

function discardElement(element: HTMLAudioElement, url: string): void {
  element.onerror = null;
  element.pause();
  element.removeAttribute('src');
  element.load();
  URL.revokeObjectURL(url);
}

function loadMedia(url: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const element = new Audio();
    element.preload = 'auto';
    let settled = false;
    const timer = window.setTimeout(() => fail(), 15000);
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (ok && !element.error && Number.isFinite(element.duration) && element.duration > 0) resolve(element);
      else {
        element.onerror = null;
        element.removeAttribute('src');
        element.load();
        reject(new Error(UNDECODABLE_FILE));
      }
    };
    const fail = () => finish(false);
    element.addEventListener('loadedmetadata', () => finish(true), { once: true });
    element.addEventListener('error', fail, { once: true });
    element.src = url;
  });
}
