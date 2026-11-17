import { afterEach, describe, expect, it, vi } from 'vitest';
import { VisualizerEngine } from '../audio-engine';

class FakeNode {
  connect() {}
  disconnect() {}
}

class FakeAudio extends EventTarget {
  preload = 'auto';
  volume = 1;
  paused = true;
  ended = false;
  currentTime = 0;
  duration = 8;
  error: MediaError | null = null;
  onerror: ((this: GlobalEventHandlers, event: Event) => void) | null = null;
  private url = '';

  set src(value: string) {
    this.url = value;
    this.dispatchEvent(new Event('loadedmetadata'));
  }

  get src() {
    return this.url;
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  load() {}

  removeAttribute(name: string) {
    if (name === 'src') this.url = '';
  }
}

function installAudioMocks() {
  const stop = vi.fn();
  let grant: (stream: MediaStream) => void = () => {};
  const getUserMedia = vi.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        grant = resolve;
      }),
  );
  class FakeContext {
    state: AudioContextState = 'running';
    sampleRate = 48000;
    destination = {};
    createAnalyser() {
      return { fftSize: 2048, frequencyBinCount: 1024, smoothingTimeConstant: 0.8, connect() {}, disconnect() {} };
    }
    createMediaStreamSource() {
      return new FakeNode();
    }
    createMediaElementSource() {
      return new FakeNode();
    }
    createGain() {
      return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('AudioContext', FakeContext);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:visualizer-test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  return {
    stop,
    grant: (stream?: MediaStream) => grant(stream ?? ({ getTracks: () => [{ stop }] } as unknown as MediaStream)),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('visualizer engine source switches', () => {
  it('drops a microphone grant that arrives after a newer file', async () => {
    const mocks = installAudioMocks();
    const engine = new VisualizerEngine();
    const pendingMic = engine.useMicrophone();
    const started = await engine.useFile(new File(['x'], 'Night Drive.mp3', { type: 'audio/mpeg' }));

    expect(started).toBe(true);
    expect(engine.kind).toBe('file');
    expect(engine.trackName).toBe('Night Drive');

    mocks.grant();
    await expect(pendingMic).resolves.toBe(false);
    expect(engine.kind).toBe('file');
    expect(engine.trackName).toBe('Night Drive');
    expect(mocks.stop).toHaveBeenCalledOnce();
    engine.destroy();
  });
});
