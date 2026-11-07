import { delay, isAbortError } from './text';
import { assertCatalogFetchUrl, CatalogUrlError } from './url-policy';

export const CATALOG_USER_AGENT = 'MusaixProArtistResearch/0.1 (public catalog lookup; +https://github.com/sterl27/Musaix-Pro-2026)';

export class CatalogRequestError extends Error {
  readonly provider: string;
  readonly statusCode?: number;

  constructor(message: string, provider: string, statusCode?: number) {
    super(message);
    this.name = 'CatalogRequestError';
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export class CatalogNotFoundError extends Error {
  readonly provider: string;

  constructor(provider: string) {
    super('not found');
    this.name = 'CatalogNotFoundError';
    this.provider = provider;
  }
}

export class HostPacer {
  private nextAt = new Map<string, number>();

  constructor(
    private readonly gapMs: number,
    private readonly sleep: (ms: number, signal: AbortSignal) => Promise<void> = delay,
    private readonly now: () => number = Date.now,
  ) {}

  async wait(host: string, signal: AbortSignal): Promise<void> {
    if (this.gapMs <= 0 || (host !== 'musicbrainz.org' && host !== 'www.musicbrainz.org')) return;
    const start = this.now();
    const slot = Math.max(start, this.nextAt.get(host) ?? 0);
    this.nextAt.set(host, slot + this.gapMs);
    const waitMs = slot - start;
    if (waitMs > 0) await this.sleep(waitMs, signal);
  }
}

export type CatalogFetchOptions = {
  fetchImpl: typeof fetch;
  signal: AbortSignal;
  provider: string;
  userAgent: string;
  timeoutMs: number;
  maxBytes: number;
  pacer?: HostPacer;
};

export async function fetchCatalogJson(url: string, options: CatalogFetchOptions): Promise<unknown> {
  let allowed: URL;
  try {
    allowed = assertCatalogFetchUrl(url);
  } catch (error) {
    if (error instanceof CatalogUrlError) throw new CatalogRequestError(error.message, options.provider);
    throw error;
  }
  await options.pacer?.wait(allowed.hostname, options.signal);
  const signal = combineSignals([options.signal, timeoutSignal(options.timeoutMs)]);
  let response: Response;
  try {
    response = await options.fetchImpl(allowed.href, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      signal,
      headers: { accept: 'application/json', 'user-agent': options.userAgent },
    });
  } catch (error) {
    if (options.signal.aborted) throw error;
    if (isAbortError(error)) throw new CatalogRequestError('The catalog timed out.', options.provider);
    throw new CatalogRequestError('The catalog request failed.', options.provider);
  }
  if (response.type === 'opaqueredirect' || response.status === 0 || (response.status >= 300 && response.status < 400)) {
    throw new CatalogRequestError('The catalog redirected. Redirects are not followed.', options.provider, response.status);
  }
  if (response.status === 404) throw new CatalogNotFoundError(options.provider);
  if (!response.ok) throw new CatalogRequestError(`The catalog returned ${response.status}.`, options.provider, response.status);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('json')) {
    throw new CatalogRequestError('The catalog returned a non-JSON response.', options.provider, response.status);
  }
  const bytes = await readLimited(response, options.maxBytes, options.provider);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new CatalogRequestError('The catalog returned malformed JSON.', options.provider);
  }
}

export async function fetchCatalogJsonWithRetry(url: string, options: CatalogFetchOptions): Promise<unknown> {
  try {
    return await fetchCatalogJson(url, options);
  } catch (error) {
    if (!(error instanceof CatalogRequestError) || (error.statusCode !== 429 && error.statusCode !== 503)) throw error;
    await delay(1000, options.signal);
    return fetchCatalogJson(url, options);
  }
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(Object.assign(new Error('The catalog timed out.'), { name: 'TimeoutError' })), ms);
  return controller.signal;
}

function combineSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

async function readLimited(response: Response, maxBytes: number, provider: string): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new CatalogRequestError('The catalog returned an empty response.', provider);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new CatalogRequestError('The catalog response was too large.', provider);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
