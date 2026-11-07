import { plain } from './text';

const FETCH_HOSTS = new Set(['musicbrainz.org', 'www.musicbrainz.org', 'en.wikipedia.org', 'www.wikidata.org', 'wikidata.org']);

const BLOCKED_HOSTS = new Set([
  'ai-gateway.vercel.sh',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'localhost',
  'metadata.google.internal',
]);

const LYRIC_HOSTS = new Set([
  'genius.com',
  'www.genius.com',
  'azlyrics.com',
  'www.azlyrics.com',
  'lyrics.com',
  'www.lyrics.com',
  'musixmatch.com',
  'www.musixmatch.com',
  'metrolyrics.com',
  'www.metrolyrics.com',
  'songlyrics.com',
  'www.songlyrics.com',
  'lyricsfreak.com',
  'www.lyricsfreak.com',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QID = /^Q[1-9][0-9]{0,12}$/;

export type ParsedQuery =
  | { kind: 'name'; text: string }
  | { kind: 'mb'; mbid: string }
  | { kind: 'wiki'; title: string }
  | { kind: 'wikidata'; qid: string };

export class CatalogUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogUrlError';
  }
}

export function parseQuery(input: unknown): ParsedQuery | { error: string } {
  if (typeof input !== 'string') return { error: 'Enter an artist name or a MusicBrainz, English Wikipedia, or Wikidata link.' };
  const query = input.trim().normalize('NFKC');
  if (!query) return { error: 'Enter an artist name or a MusicBrainz, English Wikipedia, or Wikidata link.' };
  if ([...query].length > 160) return { error: 'That query is too long.' };
  if (/[\u0000-\u001F\u007F]/.test(query)) return { error: 'The query contains unsupported control characters.' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(query) || query.startsWith('//')) return parseArtistLink(query);
  if (/[<>]/.test(query)) return { error: 'The query contains unsupported characters.' };
  if (!/[\p{L}\p{N}]/u.test(query)) return { error: 'Enter an artist name.' };
  return { kind: 'name', text: query };
}

export function parseArtistLink(input: string): ParsedQuery | { error: string } {
  const rejected = { error: 'Only public MusicBrainz, English Wikipedia, and Wikidata artist links are accepted.' };
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return rejected;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return rejected;
  const host = url.hostname.toLowerCase();
  if (LYRIC_HOSTS.has(host) || BLOCKED_HOSTS.has(host) || isIpHost(host) || !FETCH_HOSTS.has(host)) return rejected;
  if (host === 'musicbrainz.org' || host === 'www.musicbrainz.org') {
    const match = url.pathname.match(/^\/artist\/([0-9a-f-]{36})\/?$/i);
    if (!match || !UUID.test(match[1])) return rejected;
    return { kind: 'mb', mbid: match[1].toLowerCase() };
  }
  if (host === 'en.wikipedia.org') {
    const title = wikiTitle(url.pathname);
    if (!title) return rejected;
    return { kind: 'wiki', title };
  }
  const qid = url.pathname.match(/^\/wiki\/(Q[1-9][0-9]{0,12})\/?$/);
  if (!qid || !QID.test(qid[1])) return rejected;
  return { kind: 'wikidata', qid: qid[1] };
}

export function parseCatalogId(id: unknown): ParsedQuery | { error: string } {
  if (typeof id !== 'string' || id.length > 240) return { error: 'Choose an artist from the catalog results.' };
  const mb = id.match(/^mb:([0-9a-f-]{36})$/i);
  if (mb && UUID.test(mb[1])) return { kind: 'mb', mbid: mb[1].toLowerCase() };
  const wd = id.match(/^wd:(Q[1-9][0-9]{0,12})$/);
  if (wd && QID.test(wd[1])) return { kind: 'wikidata', qid: wd[1] };
  const wiki = id.match(/^wiki:([A-Za-z0-9%._()'-]{1,180})$/);
  if (!wiki) return { error: 'Choose an artist from the catalog results.' };
  try {
    const title = decodeURIComponent(wiki[1]).replace(/_/g, ' ');
    if (!wikiTitle(`/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`)) return { error: 'Choose an artist from the catalog results.' };
    return { kind: 'wiki', title };
  } catch {
    return { error: 'Choose an artist from the catalog results.' };
  }
}

export function catalogIdFor(parsed: ParsedQuery): string | null {
  if (parsed.kind === 'mb') return `mb:${parsed.mbid}`;
  if (parsed.kind === 'wikidata') return `wd:${parsed.qid}`;
  if (parsed.kind === 'wiki') return `wiki:${encodeURIComponent(parsed.title.replace(/ /g, '_'))}`;
  return null;
}

export function assertCatalogFetchUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new CatalogUrlError('The catalog URL is not valid.');
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || isIpHost(host) || BLOCKED_HOSTS.has(host) || LYRIC_HOSTS.has(host) || !FETCH_HOSTS.has(host)) {
    throw new CatalogUrlError('That host is not an allowed catalog.');
  }
  return url;
}

export function isCitationUrl(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port || isIpHost(host)) return false;
  if (LYRIC_HOSTS.has(host) || BLOCKED_HOSTS.has(host) || host === 'localhost' || host.endsWith('.local')) return false;
  return host.includes('.');
}

function wikiTitle(pathname: string): string | null {
  const match = pathname.match(/^\/wiki\/([^/]+)\/?$/);
  if (!match) return null;
  let title: string;
  try {
    title = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  title = title.replace(/_/g, ' ').trim();
  if (!title || title.length > 180 || title.includes(':') || title.includes('/') || /^special\b/i.test(title)) return null;
  const cleaned = plain(title, 180);
  if (cleaned !== title.replace(/\s+/g, ' ')) return null;
  return cleaned;
}

function isIpHost(host: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(':') || host.startsWith('[');
}
