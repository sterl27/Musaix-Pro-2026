import type { PublicIdentity, PublicSource } from './types';
import { codePointLength, containsControlChars, normalizeName } from './text';
import { isCitationUrl } from './url-policy';

export const PASSAGE_LIMIT = 500;
export const NOTE_LIMIT = 280;
export const NOTE_CAP = 8;

export const NOTE_TOPICS = ['general', 'vocabulary', 'rhyme', 'punchlines', 'narrative', 'hooks', 'delivery'] as const;

export type NoteTopic = (typeof NOTE_TOPICS)[number];

export type ResearchNote = {
  id: string;
  topic: NoteTopic;
  text: string;
  url: string;
};

export type RepeatedWord = { word: string; count: number };

export type PassageStats = {
  characters: number;
  words: number;
  lines: number;
  uniqueWords: number;
  repeatedWords: RepeatedWord[];
  repeatedLineEndings: RepeatedWord[];
};

const STOP = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'were', 'with']);

export type SearchLink = { href: string; label: string; detail: string };

const SEARCH_HOSTS = new Set(['en.wikipedia.org', 'musicbrainz.org', 'www.wikidata.org', 'duckduckgo.com']);

export function externalSearchLinks(name: string): SearchLink[] {
  const query = name.trim().slice(0, 160);
  if (!query) return [];
  const links = [
    link('https://en.wikipedia.org/w/index.php', { search: query }, 'English Wikipedia search', 'Opens a search. This page does not read the results.'),
    link('https://musicbrainz.org/search', { query, type: 'artist' }, 'MusicBrainz search', 'Opens the catalog search. This is not an extra page we fetched.'),
    link('https://www.wikidata.org/w/index.php', { search: query }, 'Wikidata search', 'Opens a search. This page does not read the results.'),
    link('https://duckduckgo.com/', { q: `"${query}" interview` }, 'Web search for interviews', 'Opens a public web search. Those pages are not fetched or cited.'),
  ];
  return links.filter((item): item is SearchLink => Boolean(item));
}

export function readPassage(value: string): { ok: true; text: string } | { ok: false; message: string } {
  const text = value.replace(/\r\n/g, '\n');
  if (codePointLength(text.trim()) > PASSAGE_LIMIT) return { ok: false, message: `Keep the passage to ${PASSAGE_LIMIT} characters.` };
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) return { ok: false, message: 'The passage contains unsupported control characters.' };
  return { ok: true, text: text.trim() };
}

export function passageStats(passage: string): PassageStats | null {
  const parsed = readPassage(passage);
  if (!parsed.ok || !parsed.text) return null;
  const lines = parsed.text.split('\n').map((line) => line.trim()).filter(Boolean);
  const tokens = parsed.text.match(/[\p{L}\p{N}']+/gu) ?? [];
  const contentWords = tokens.map((token) => token.toLowerCase()).filter((token) => token.length > 2 && !STOP.has(token));
  const endings = lines
    .map((line) => (line.match(/[\p{L}\p{N}']+/gu) ?? []).at(-1)?.toLowerCase() ?? '')
    .filter((token) => token.length > 2 && !STOP.has(token));
  return {
    characters: codePointLength(parsed.text),
    words: tokens.length,
    lines: lines.length,
    uniqueWords: new Set(contentWords).size,
    repeatedWords: repeats(contentWords),
    repeatedLineEndings: repeats(endings),
  };
}

export function prepareNote(input: { topic: string; text: string; url: string }): { ok: true; note: Omit<ResearchNote, 'id'> } | { ok: false; message: string } {
  if (!NOTE_TOPICS.includes(input.topic as NoteTopic)) return { ok: false, message: 'Choose a note topic.' };
  const text = input.text.replace(/\r\n/g, '\n').trim();
  if (!text || codePointLength(text) > NOTE_LIMIT || containsControlChars(text.replace(/\n/g, ''))) {
    return { ok: false, message: `A note must be one to ${NOTE_LIMIT} characters.` };
  }
  const url = input.url.trim();
  if (url && !isCitationUrl(url)) return { ok: false, message: 'That link is not kept. Use a public https page, not a lyric site or a private address.' };
  return { ok: true, note: { topic: input.topic as NoteTopic, text, url } };
}

export function buildResearchBrief(input: {
  identity: PublicIdentity;
  sources: PublicSource[];
  notes: ResearchNote[];
  passage: string;
}): string {
  const passage = readPassage(input.passage);
  const text = passage.ok ? passage.text : '';
  const stats = text ? passageStats(text) : null;
  const lines = [
    `# Research brief: ${input.identity.name}`,
    '',
    'This brief was assembled in the browser from catalog text, links, and what you typed. It is not an AI analysis. No model was called. No audio was measured.',
    '',
    '## Catalog record',
    '',
    `- Name: ${input.identity.name}`,
    `- Description: ${input.identity.disambiguation || 'No short catalog description was returned.'}`,
    `- Kind: ${[input.identity.kind, input.identity.area].filter(Boolean).join(', ') || 'Not stated'}`,
  ];
  if (input.identity.aliases?.length) lines.push(`- Also listed as: ${input.identity.aliases.join(', ')}`);
  lines.push('', '### Pages requested', '');
  if (!input.identity.urls.length) lines.push('No catalog page URL was returned.');
  for (const url of input.identity.urls) lines.push(`- ${url.label}: ${url.href}`);
  lines.push('', '## Text fetched for this record', '');
  if (!input.sources.length) lines.push('No catalog excerpt was stored.');
  for (const source of input.sources) {
    lines.push(`### ${source.title}`, '', `${source.publisher}. ${source.kind.replace(/_/g, ' ')}. Retrieved ${source.retrievedAt}.`, source.url, '', source.excerpt, '');
  }
  lines.push('## Search links that were not read', '');
  for (const item of externalSearchLinks(input.identity.name)) lines.push(`- ${item.label}: ${item.href}`, `  ${item.detail}`);
  lines.push('', '## Your notes', '');
  if (!input.notes.length) lines.push('No notes were added.');
  for (const note of input.notes) {
    lines.push(`### ${note.topic}`, '', note.text, note.url ? `Link you attached: ${note.url}` : 'No link attached.', '');
  }
  lines.push('## Passage you supplied', '');
  if (!text || !stats) {
    lines.push('No passage was supplied. No text counts were calculated.');
  } else {
    lines.push('You supplied this passage. It is not a catalog quotation and it is not a claim about a recording.', '', text, '', '### Counts of that passage', '', 'These numbers count the pasted characters. They are not rhyme quality, timing, or a recording measurement.', '', `- Characters: ${stats.characters}`, `- Words: ${stats.words}`, `- Lines: ${stats.lines}`, `- Unique content words: ${stats.uniqueWords}`);
    lines.push(stats.repeatedWords.length ? `- Repeated words: ${stats.repeatedWords.map((item) => `${item.word} (${item.count})`).join(', ')}` : '- Repeated words: none');
    lines.push(stats.repeatedLineEndings.length ? `- Repeated line-ending words: ${stats.repeatedLineEndings.map((item) => `${item.word} (${item.count})`).join(', ')}` : '- Repeated line-ending words: none');
  }
  lines.push('', '## Limits', '', 'Generated artist analysis is not available. Catalog biographies are not lyric evidence. Search links were not fetched. Do not treat this file as a phonetic, flow, or audio measurement.');
  return lines.join('\n');
}

export function briefFilename(name: string): string {
  const slug = normalizeName(name).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'artist';
  return `research-brief-${slug}.md`;
}

function repeats(words: string[]): RepeatedWord[] {
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));
}

function link(base: string, params: Record<string, string>, label: string, detail: string): SearchLink | null {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if (url.protocol !== 'https:' || !SEARCH_HOSTS.has(url.hostname)) return null;
  return { href: url.href, label, detail };
}
