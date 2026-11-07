export function normalizeName(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function plain(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...cleaned].slice(0, max).join('');
}

export function capExcerpt(value: string, max = 700): string {
  const clean = plain(value, 20_000);
  if ([...clean].length <= max) return clean;
  const slice = [...clean].slice(0, max - 1).join('');
  const boundary = slice.lastIndexOf(' ');
  const cut = boundary > Math.floor(max * 0.6) ? slice.slice(0, boundary) : slice;
  return `${cut}…`;
}

export function codePointLength(value: string): number {
  return [...value].length;
}

export function containsControlChars(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value);
}

const IMITATION = /\b(?:imitat\w*|write like|rap like|sound like|flow like|in the style of|copy (?:his|her|their) (?:flow|voice|cadence|style))\b/i;

export function instructsImitation(value: string): boolean {
  return IMITATION.test(value);
}

const NUMBERED_BPM = /\b(?:bpm|beats per minute)\b[^.]{0,16}\d|\d[^.]{0,16}\b(?:bpm|beats per minute)\b/i;
const RADAR = /\bradar\b/i;
const MILLISECONDS = /\b\d+(?:\.\d+)?\s*ms\b/i;
const PERCENT = /\b\d+(?:\.\d+)?\s*%/;
const SCORE = /\bscore\s*(?:of|:)\s*\d+/i;
const BAR_COUNT = /\b\d+\s*-?\s*bars?\b/i;

export function hasInventedMeasurement(value: string): boolean {
  return NUMBERED_BPM.test(value) || RADAR.test(value) || MILLISECONDS.test(value) || PERCENT.test(value) || SCORE.test(value);
}

export function hasBarCount(value: string): boolean {
  return BAR_COUNT.test(value);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortReason(signal));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason instanceof Error ? signal.reason : Object.assign(new Error('The lookup was cancelled.'), { name: 'AbortError' });
}
