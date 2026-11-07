import { ResearchGate } from './gate';
import { inspectArtist, resolveQuery, type ResearchDeps } from './pipeline';
import { isAbortError } from './text';
import type { ArtistCatalog, ProviderReport, ResearchResult } from './types';

export type ResearchHandlerDeps = {
  catalog: ArtistCatalog;
  gate: ResearchGate;
  providerReport: () => ProviderReport;
};

class PayloadLimitError extends Error {}

export async function handleArtistResearch(request: Request, deps: ResearchHandlerDeps): Promise<Response> {
  const entry = deps.gate.tryEnter(clientKey(request));
  if (!entry.ok) {
    return Response.json(
      { ok: false, status: 'rate_limited', message: 'Too many research requests. Wait and try again. No report was generated.', retryAfterMs: entry.retryAfterMs },
      { status: 429, headers: { 'retry-after': String(Math.ceil(entry.retryAfterMs / 1000)) } },
    );
  }
  try {
    const body = await readJson(request, 4_000);
    const research: ResearchDeps = {
      catalog: deps.catalog,
      signal: request.signal,
      providerReport: deps.providerReport,
      synthesis: null,
      allowSynthesis: false,
      permitLiveSynthesis: false,
    };
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ ok: false, status: 'invalid_input', message: 'The request could not be read.' }, 400);
    }
    const record = body as { action?: unknown; query?: unknown; id?: unknown };
    if (record.action === 'resolve') return json(await resolveQuery(record.query, research), statusFor);
    if (record.action === 'inspect') return json(await inspectArtist(typeof record.id === 'string' ? record.id : '', research), statusFor);
    return json({ ok: false, status: 'invalid_input', message: 'Unsupported research action.' }, 400);
  } catch (error) {
    if (error instanceof PayloadLimitError) return json({ ok: false, status: 'invalid_input', message: 'The request is too large.' }, 400);
    if (error instanceof SyntaxError) return json({ ok: false, status: 'invalid_input', message: 'The request was not valid JSON.' }, 400);
    if (request.signal.aborted || isAbortError(error)) return json({ ok: false, status: 'cancelled', message: 'The lookup was cancelled.' }, 499);
    return json({ ok: false, status: 'provider_unavailable', provider: 'catalog', message: 'The lookup failed before a report could be made. No substitute artist or analysis was added.' }, 503);
  } finally {
    entry.leave();
  }
}

function json(result: ResearchResult, status: number | ((result: ResearchResult) => number)): Response {
  return Response.json(result, { status: typeof status === 'function' ? status(result) : status });
}

function statusFor(result: ResearchResult): number {
  if (result.status === 'invalid_input') return 400;
  if (result.status === 'provider_unavailable') return 503;
  if (result.status === 'report_rejected') return 422;
  if (result.status === 'rate_limited') return 429;
  if (result.status === 'cancelled') return 499;
  return 200;
}

async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadLimitError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('empty');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new PayloadLimitError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new SyntaxError('invalid utf-8');
  }
  return JSON.parse(text);
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (/^[0-9a-f:.]{3,64}$/i.test(forwarded)) return forwarded;
  return 'local';
}
