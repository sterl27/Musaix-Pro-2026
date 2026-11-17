export type SourceKind = 'idle' | 'mic' | 'file';

export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'flac'] as const;

export const UNSUPPORTED_FILE = 'That file type is not supported. Use mp3, wav, ogg, m4a, or flac.';
export const UNDECODABLE_FILE = 'This file could not be decoded.';
export const MIC_DENIED = 'Microphone access was denied.';
export const MIC_MISSING = 'No microphone was found.';
export const MIC_FAILED = 'The microphone could not be opened.';
export const MIC_UNSUPPORTED = 'This browser cannot open a microphone.';
export const AUDIO_UNSUPPORTED = 'This browser cannot open the Web Audio API.';

const EXTENSIONS = new Set<string>(AUDIO_EXTENSIONS);

/** File playback is heard. The microphone is analysed and kept off the speakers. */
export function connectsToSpeakers(kind: 'mic' | 'file'): boolean {
  return kind === 'file';
}

export function audioFileIssue(name: string): string | null {
  const base = name.replace(/^.*[/\\]/, '');
  const dot = base.lastIndexOf('.');
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
  if (!EXTENSIONS.has(ext)) return UNSUPPORTED_FILE;
  return null;
}

export function trackTitle(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, '');
  const dot = base.lastIndexOf('.');
  const name = dot > 0 ? base.slice(0, dot) : base;
  const trimmed = name.trim();
  return trimmed || 'Track';
}

export function micErrorMessage(error: unknown): string {
  const name =
    error instanceof DOMException
      ? error.name
      : error && typeof error === 'object' && 'name' in error
        ? String((error as { name: unknown }).name)
        : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return MIC_DENIED;
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return MIC_MISSING;
  return MIC_FAILED;
}
