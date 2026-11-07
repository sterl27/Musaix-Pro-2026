import type { ArtistCandidate, ArtistCatalog, CatalogLookup, CatalogSearch, PublicIdentity, PublicSource } from './types';
import { CATALOG_USER_AGENT, CatalogNotFoundError, CatalogRequestError, fetchCatalogJsonWithRetry, HostPacer, type CatalogFetchOptions } from './http';
import { capExcerpt, plain } from './text';
import { catalogIdFor, isCitationUrl, parseArtistLink, parseCatalogId } from './url-policy';

const CANDIDATE_LIMIT = 8;

export type MbHit = {
  mbid: string;
  name: string;
  disambiguation: string;
  type: string;
  area: string;
  country: string;
  tags: string[];
  wikidata: string;
};

export type WikiHit = { title: string; description: string; url: string };

export function mergeCandidates(mb: MbHit[], wiki: WikiHit[], limit = CANDIDATE_LIMIT): CatalogSearch {
  const candidates: ArtistCandidate[] = [];
  for (const hit of mb) {
    if (!hit.name) continue;
    const urls = [{ label: 'MusicBrainz', href: `https://musicbrainz.org/artist/${hit.mbid}` }];
    if (hit.wikidata) urls.push({ label: 'Wikidata', href: `https://www.wikidata.org/wiki/${hit.wikidata}` });
    candidates.push({
      id: `mb:${hit.mbid}`,
      name: hit.name,
      disambiguation: hit.disambiguation,
      kind: hit.type || 'artist',
      area: hit.area || countryName(hit.country),
      blurb: hit.disambiguation || 'MusicBrainz artist record. No disambiguation text was provided.',
      urls,
    });
  }
  for (const page of wiki) {
    const match = candidates.find((candidate) => namesMatch(candidate.name, page.title));
    if (match) {
      if (!match.disambiguation && page.description) match.disambiguation = page.description;
      if (match.blurb.startsWith('MusicBrainz artist record') && page.description) match.blurb = page.description;
      if (!match.urls.some((link) => link.href === page.url)) match.urls.push({ label: 'Wikipedia', href: page.url });
      continue;
    }
    candidates.push({
      id: `wiki:${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      name: page.title,
      disambiguation: page.description,
      kind: 'wikipedia page',
      area: '',
      blurb: page.description || 'English Wikipedia page. No short description was provided.',
      urls: [{ label: 'Wikipedia', href: page.url }],
    });
  }
  return { candidates: candidates.slice(0, limit).map(presentCandidate), truncated: candidates.length > limit };
}

export function parseMbSearch(payload: unknown): MbHit[] | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const artists = (payload as { artists?: unknown }).artists;
  if (!Array.isArray(artists)) return null;
  const hits: MbHit[] = [];
  for (const artist of artists.slice(0, 8)) {
    const hit = parseMbArtist(artist);
    if (hit) hits.push(hit);
  }
  return hits;
}

export function parseWikiSearch(payload: unknown): WikiHit[] | null {
  if (!Array.isArray(payload) || payload.length < 4) return null;
  const titles = payload[1];
  const descriptions = payload[2];
  const urls = payload[3];
  if (!Array.isArray(titles) || !Array.isArray(descriptions) || !Array.isArray(urls)) return null;
  const hits: WikiHit[] = [];
  for (let index = 0; index < Math.min(titles.length, descriptions.length, urls.length, 8); index += 1) {
    const title = plain(titles[index], 180);
    const description = plain(descriptions[index], 240);
    const href = typeof urls[index] === 'string' ? urls[index] : '';
    const parsed = parseArtistLink(href);
    if (!title || !('kind' in parsed) || parsed.kind !== 'wiki') continue;
    hits.push({ title: parsed.title, description, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(parsed.title.replace(/ /g, '_'))}` });
  }
  return hits;
}

export function musicBrainzExcerpt(hit: MbHit): string {
  const parts = [`${hit.name} is a MusicBrainz ${hit.type || 'artist'} record`];
  if (hit.disambiguation) parts.push(`described as ${hit.disambiguation}`);
  if (hit.area) parts.push(`associated with ${hit.area}`);
  if (hit.country) parts.push(`country code ${hit.country}`);
  if (hit.tags.length) parts.push(`catalog tags: ${hit.tags.join(', ')}`);
  return capExcerpt(`${parts.join('. ')}.`);
}

type LiveOptions = {
  fetchImpl?: typeof fetch;
  pacer?: HostPacer;
  timeoutMs?: number;
  maxBytes?: number;
  now?: () => Date;
};

export class LiveArtistCatalog implements ArtistCatalog {
  private readonly fetchImpl: typeof fetch;
  private readonly pacer: HostPacer;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly now: () => Date;

  constructor(options: LiveOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.pacer = options.pacer ?? new HostPacer(1100);
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.maxBytes = options.maxBytes ?? 400_000;
    this.now = options.now ?? (() => new Date());
  }

  async search(name: string, signal: AbortSignal): Promise<CatalogSearch> {
    const mbUrl = new URL('https://musicbrainz.org/ws/2/artist/');
    mbUrl.searchParams.set('fmt', 'json');
    mbUrl.searchParams.set('limit', '5');
    mbUrl.searchParams.set('query', `"${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
    const wikiUrl = new URL('https://en.wikipedia.org/w/api.php');
    wikiUrl.searchParams.set('action', 'opensearch');
    wikiUrl.searchParams.set('format', 'json');
    wikiUrl.searchParams.set('limit', '5');
    wikiUrl.searchParams.set('namespace', '0');
    wikiUrl.searchParams.set('search', name);
    const [mbPayload, wikiPayload] = await Promise.all([
      this.read(mbUrl.href, 'musicbrainz', signal),
      this.read(wikiUrl.href, 'english-wikipedia', signal),
    ]);
    const mb = parseMbSearch(mbPayload);
    const wiki = parseWikiSearch(wikiPayload);
    if (!mb || !wiki) throw new CatalogRequestError('A catalog returned a response that could not be read.', !mb ? 'musicbrainz' : 'english-wikipedia');
    return mergeCandidates(mb, wiki);
  }

  async lookup(id: string, signal: AbortSignal): Promise<CatalogLookup> {
    const parsed = parseCatalogId(id);
    if ('error' in parsed || parsed.kind === 'name') return { status: 'missing' };
    try {
      if (parsed.kind === 'mb') return await this.lookupMusicBrainz(parsed.mbid, signal);
      if (parsed.kind === 'wiki') return await this.lookupWikipedia(parsed.title, signal);
      return await this.lookupWikidata(parsed.qid, signal);
    } catch (error) {
      if (error instanceof CatalogNotFoundError) return { status: 'missing' };
      if (error instanceof CatalogRequestError) return { status: 'unavailable', provider: error.provider, message: error.message };
      throw error;
    }
  }

  private async lookupMusicBrainz(mbid: string, signal: AbortSignal): Promise<CatalogLookup> {
    const url = new URL(`https://musicbrainz.org/ws/2/artist/${mbid}`);
    url.searchParams.set('fmt', 'json');
    url.searchParams.set('inc', 'url-rels tags');
    const payload = await this.read(url.href, 'musicbrainz', signal);
    const hit = parseMbArtist(payload);
    if (!hit) throw new CatalogRequestError('MusicBrainz returned a response that could not be read.', 'musicbrainz');
    const retrievedAt = this.now().toISOString();
    const sources: PublicSource[] = [
      {
        id: `mb:${hit.mbid}`,
        title: `${hit.name} on MusicBrainz`,
        publisher: 'MusicBrainz',
        url: `https://musicbrainz.org/artist/${hit.mbid}`,
        retrievedAt,
        kind: 'catalog_record',
        excerpt: musicBrainzExcerpt(hit),
      },
    ];
    const wiki = wikipediaRelation(payload);
    const urls = [{ label: 'MusicBrainz', href: `https://musicbrainz.org/artist/${hit.mbid}` }];
    if (hit.wikidata) urls.push({ label: 'Wikidata', href: `https://www.wikidata.org/wiki/${hit.wikidata}` });
    if (wiki) {
      const summary = await this.wikipediaSummary(wiki, signal);
      if (summary.status === 'disambiguation') {
        return { status: 'ambiguous_page', message: 'The linked Wikipedia page lists more than one subject. Search the name and choose a specific record.' };
      }
      if (summary.status === 'page') {
        urls.push({ label: 'Wikipedia', href: summary.url });
        sources.push(summary.source);
      }
    }
    return { status: 'found', identity: identityFrom(hit, urls), sources };
  }

  private async lookupWikipedia(title: string, signal: AbortSignal): Promise<CatalogLookup> {
    const summary = await this.wikipediaSummary(title, signal);
    if (summary.status === 'missing') return { status: 'missing' };
    if (summary.status === 'disambiguation') {
      return { status: 'ambiguous_page', message: 'This Wikipedia page lists more than one subject. Search the name and choose a specific artist instead of opening the disambiguation page.' };
    }
    return {
      status: 'found',
      identity: {
        id: `wiki:${encodeURIComponent(title.replace(/ /g, '_'))}`,
        name: summary.name,
        disambiguation: summary.description,
        kind: 'wikipedia page',
        area: '',
        urls: [{ label: 'Wikipedia', href: summary.url }],
      },
      sources: [summary.source],
    };
  }

  private async lookupWikidata(qid: string, signal: AbortSignal): Promise<CatalogLookup> {
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.searchParams.set('action', 'wbgetentities');
    url.searchParams.set('ids', qid);
    url.searchParams.set('props', 'sitelinks|descriptions|labels');
    url.searchParams.set('languages', 'en');
    url.searchParams.set('sitefilter', 'enwiki');
    url.searchParams.set('format', 'json');
    const payload = await this.read(url.href, 'wikidata', signal);
    const entity = wikidataEntity(payload, qid);
    if (!entity) return { status: 'missing' };
    const retrievedAt = this.now().toISOString();
    const page = `https://www.wikidata.org/wiki/${qid}`;
    const sources: PublicSource[] = [
      {
        id: `wd:${qid}`,
        title: `${entity.label} on Wikidata`,
        publisher: 'Wikidata',
        url: page,
        retrievedAt,
        kind: 'catalog_record',
        excerpt: capExcerpt(`${entity.label} is a Wikidata item${entity.description ? ` described as ${entity.description}` : ''}.`),
      },
    ];
    const urls = [{ label: 'Wikidata', href: page }];
    if (!entity.wikiTitle) {
      return { status: 'found', identity: { id: `wd:${qid}`, name: entity.label, disambiguation: entity.description, kind: 'wikidata item', area: '', urls }, sources };
    }
    const summary = await this.wikipediaSummary(entity.wikiTitle, signal);
    if (summary.status === 'page') {
      urls.push({ label: 'Wikipedia', href: summary.url });
      sources.push(summary.source);
    }
    const description = entity.description || (summary.status === 'page' ? summary.description : '');
    return { status: 'found', identity: { id: `wd:${qid}`, name: entity.label, disambiguation: description, kind: 'wikidata item', area: '', urls }, sources };
  }

  private async wikipediaSummary(title: string, signal: AbortSignal): Promise<WikiSummary> {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    try {
      const payload = await this.read(url, 'english-wikipedia', signal);
      return parseWikiSummary(payload, this.now().toISOString());
    } catch (error) {
      if (error instanceof CatalogNotFoundError) return { status: 'missing' };
      throw error;
    }
  }

  private read(url: string, provider: string, signal: AbortSignal): Promise<unknown> {
    const options: CatalogFetchOptions = {
      fetchImpl: this.fetchImpl,
      signal,
      provider,
      userAgent: CATALOG_USER_AGENT,
      timeoutMs: this.timeoutMs,
      maxBytes: this.maxBytes,
      pacer: this.pacer,
    };
    return fetchCatalogJsonWithRetry(url, options);
  }
}

type WikiSummary =
  | { status: 'missing' }
  | { status: 'disambiguation' }
  | { status: 'page'; name: string; description: string; url: string; source: PublicSource };

function parseWikiSummary(payload: unknown, retrievedAt: string): WikiSummary {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new CatalogRequestError('English Wikipedia returned a response that could not be read.', 'english-wikipedia');
  }
  const record = payload as { type?: unknown; title?: unknown; description?: unknown; extract?: unknown; content_urls?: { desktop?: { page?: unknown } } };
  const title = plain(record.title, 180);
  if (!title) throw new CatalogRequestError('English Wikipedia returned a response that could not be read.', 'english-wikipedia');
  if (record.type === 'disambiguation') return { status: 'disambiguation' };
  if (record.type !== 'standard') throw new CatalogRequestError('English Wikipedia did not return an artist summary.', 'english-wikipedia');
  const remote = typeof record.content_urls?.desktop?.page === 'string' ? record.content_urls.desktop.page : '';
  const parsedRemote = remote ? parseArtistLink(remote) : { error: 'skip' };
  const url = 'kind' in parsedRemote && parsedRemote.kind === 'wiki'
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(parsedRemote.title.replace(/ /g, '_'))}`
    : `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const description = plain(record.description, 240);
  const excerpt = capExcerpt(plain(record.extract, 4000) || `${title} has an English Wikipedia page${description ? ` described as ${description}` : ''}.`);
  return {
    status: 'page',
    name: title,
    description,
    url,
    source: {
      id: `wiki:${encodeURIComponent(title.replace(/ /g, '_'))}`,
      title: `Wikipedia: ${title}`,
      publisher: 'Wikimedia Foundation',
      url,
      retrievedAt,
      kind: 'encyclopedia_summary',
      excerpt,
    },
  };
}

function parseMbArtist(artist: unknown): MbHit | null {
  if (!artist || typeof artist !== 'object' || Array.isArray(artist)) return null;
  const record = artist as { id?: unknown; name?: unknown; disambiguation?: unknown; type?: unknown; country?: unknown; area?: { name?: unknown }; tags?: unknown; relations?: unknown };
  const mbid = typeof record.id === 'string' ? record.id.toLowerCase() : '';
  const name = plain(record.name, 180);
  if (!/^[0-9a-f-]{36}$/.test(mbid) || !name) return null;
  const country = typeof record.country === 'string' && /^[A-Z]{2}$/.test(record.country) ? record.country : '';
  return {
    mbid,
    name,
    disambiguation: plain(record.disambiguation, 240),
    type: plain(record.type, 40) || 'artist',
    area: plain(record.area?.name, 80),
    country,
    tags: tagsFrom(record.tags),
    wikidata: wikidataRelation(record.relations),
  };
}

function tagsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const tag of value) {
    const name = plain(tag && typeof tag === 'object' ? (tag as { name?: unknown }).name : '', 40);
    if (name && /^[\p{L}\p{N} .+-]{2,40}$/u.test(name)) tags.push(name);
    if (tags.length === 8) break;
  }
  return tags;
}

function wikidataRelation(value: unknown): string {
  if (!Array.isArray(value)) return '';
  for (const relation of value) {
    if (!relation || typeof relation !== 'object') continue;
    const resource = (relation as { type?: unknown; url?: { resource?: unknown } }).url?.resource;
    const type = (relation as { type?: unknown }).type;
    if (type !== 'wikidata' || typeof resource !== 'string') continue;
    const parsed = parseArtistLink(resource);
    if ('kind' in parsed && parsed.kind === 'wikidata') return parsed.qid;
  }
  return '';
}

function wikipediaRelation(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const relations = (payload as { relations?: unknown }).relations;
  if (!Array.isArray(relations)) return null;
  for (const relation of relations) {
    if (!relation || typeof relation !== 'object') continue;
    const type = (relation as { type?: unknown }).type;
    const resource = (relation as { url?: { resource?: unknown } }).url?.resource;
    if (type !== 'wikipedia' || typeof resource !== 'string') continue;
    const parsed = parseArtistLink(resource);
    if ('kind' in parsed && parsed.kind === 'wiki') return parsed.title;
  }
  return null;
}

function wikidataEntity(payload: unknown, qid: string): { label: string; description: string; wikiTitle: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const entity = (payload as { entities?: Record<string, unknown> }).entities?.[qid];
  if (!entity || typeof entity !== 'object' || (entity as { missing?: unknown }).missing) return null;
  const label = plain((entity as { labels?: { en?: { value?: unknown } } }).labels?.en?.value, 180);
  if (!label) return null;
  const description = plain((entity as { descriptions?: { en?: { value?: unknown } } }).descriptions?.en?.value, 240);
  const wikiTitle = plain((entity as { sitelinks?: { enwiki?: { title?: unknown } } }).sitelinks?.enwiki?.title, 180);
  return { label, description, wikiTitle };
}

function identityFrom(hit: MbHit, urls: PublicIdentity['urls']): PublicIdentity {
  return {
    id: `mb:${hit.mbid}`,
    name: hit.name,
    disambiguation: hit.disambiguation,
    kind: hit.type || 'artist',
    area: hit.area || countryName(hit.country),
    urls: urls.filter((link) => isCitationUrl(link.href)),
  };
}

function presentCandidate(candidate: ArtistCandidate): ArtistCandidate {
  return { ...candidate, blurb: plain(candidate.blurb, 240), urls: candidate.urls.filter((link) => isCitationUrl(link.href)) };
}

function namesMatch(left: string, right: string): boolean {
  return left.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() === right.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function countryName(code: string): string {
  return code ? `country ${code}` : '';
}

export function idForLookup(kind: 'mb' | 'wiki' | 'wikidata', value: string): string {
  return catalogIdFor(kind === 'mb' ? { kind: 'mb', mbid: value } : kind === 'wiki' ? { kind: 'wiki', title: value } : { kind: 'wikidata', qid: value }) ?? '';
}
