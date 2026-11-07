import type { ArtistCandidate, CatalogSearch, NameMatch } from './types';
import { normalizeName } from './text';

export function filterCandidates(query: string, search: CatalogSearch, limit = 8): CatalogSearch {
  const ranked: ArtistCandidate[] = [];
  for (const candidate of search.candidates) {
    const match = classifyCandidate(query, candidate);
    if (!match) continue;
    ranked.push({ ...candidate, match, blurb: blurbFor(match, candidate) });
  }
  ranked.sort((left, right) => rank(left.match) - rank(right.match));
  return { candidates: ranked.slice(0, limit), truncated: ranked.length > limit };
}

export function classifyCandidate(query: string, candidate: Pick<ArtistCandidate, 'name' | 'disambiguation' | 'aliases'>): NameMatch | null {
  const wanted = normalizeName(query);
  if (!wanted) return null;
  if (normalizeName(candidate.name) === wanted) return 'exact';
  if ((candidate.aliases ?? []).some((alias) => normalizeName(alias) === wanted)) return 'alias';
  if (wanted.split(' ').length < 2) return null;
  if (hasTokenPhrase(candidate.name, wanted)) return 'phrase';
  if ((candidate.aliases ?? []).some((alias) => hasTokenPhrase(alias, wanted))) return 'alias';
  if (hasTokenPhrase(candidate.disambiguation, wanted)) return 'mention';
  return null;
}

function blurbFor(match: NameMatch | undefined, candidate: ArtistCandidate): string {
  if (match === 'phrase') return 'The catalog name contains those words in order. It is not an exact name match.';
  if (match === 'alias') return 'Those words match a catalog alias, not the record’s main name.';
  if (match === 'mention') return `Mentioned in a catalog note, under a different name. ${candidate.disambiguation}`.trim();
  return candidate.blurb;
}

function rank(match: NameMatch | undefined): number {
  if (match === 'exact') return 0;
  if (match === 'alias') return 1;
  if (match === 'phrase') return 2;
  return 3;
}

function hasTokenPhrase(value: string, wanted: string): boolean {
  const query = wanted.split(' ').filter(Boolean);
  const haystack = normalizeName(value).split(' ').filter(Boolean);
  if (!query.length || query.length > haystack.length) return false;
  return haystack.some((_, index) => query.every((token, offset) => haystack[index + offset] === token));
}
