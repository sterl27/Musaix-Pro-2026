import { describe, expect, it } from 'vitest';
import { filterCandidates } from '../match';
import { buildResearchBrief, externalSearchLinks, passageStats, prepareNote, readPassage } from '../desk';
import type { ArtistCandidate, PublicIdentity, PublicSource } from '../types';

const identity: PublicIdentity = {
  id: 'mb:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Young Solo',
  disambiguation: 'Separate listing',
  kind: 'person',
  area: '',
  urls: [{ label: 'MusicBrainz', href: 'https://musicbrainz.org/artist/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
};

function candidate(partial: Partial<ArtistCandidate> & Pick<ArtistCandidate, 'id' | 'name'>): ArtistCandidate {
  return { disambiguation: '', kind: 'person', area: '', blurb: '', urls: [], ...partial };
}

describe('artist name precision', () => {
  it('keeps an exact name, a nearby mention, and drops loose titles', () => {
    const filtered = filterCandidates('young solo', {
      truncated: false,
      candidates: [
        candidate({ id: 'mb:1', name: 'Young Solo', disambiguation: 'Separate listing' }),
        candidate({ id: 'mb:2', name: 'Wormsign', disambiguation: 'Greg Young solo electronic' }),
        candidate({ id: 'mb:3', name: 'LGT Young Soloists' }),
        candidate({ id: 'wiki:1', name: 'Young Dolph', disambiguation: 'Memphis rapper' }),
        candidate({ id: 'mb:4', name: 'Young Solo', aliases: ['Solomon Green'] }),
      ],
    });
    expect(filtered.candidates.map((item) => `${item.match}:${item.name}`)).toEqual(['exact:Young Solo', 'exact:Young Solo', 'mention:Wormsign']);
    expect(filtered.candidates.some((item) => item.name === 'Young Dolph' || item.name.includes('Soloists'))).toBe(false);
  });

  it('matches a catalog alias without treating every shared word as a name', () => {
    const alias = filterCandidates('solomon green', {
      truncated: false,
      candidates: [candidate({ id: 'mb:1', name: 'Young Solo', aliases: ['Solomon Green'] }), candidate({ id: 'mb:2', name: 'Young Dolph' })],
    });
    expect(alias.candidates.map((item) => item.match)).toEqual(['alias']);
    const oneWord = filterCandidates('young', {
      truncated: false,
      candidates: [candidate({ id: 'mb:2', name: 'Young Dolph' }), candidate({ id: 'mb:3', name: 'Young' })],
    });
    expect(oneWord.candidates.map((item) => item.name)).toEqual(['Young']);
  });
});

describe('research desk brief', () => {
  it('counts a supplied passage and refuses lyric-site links', () => {
    const stats = passageStats('hold the lane\nhold the lane');
    expect(stats?.repeatedWords).toEqual([{ word: 'hold', count: 2 }, { word: 'lane', count: 2 }]);
    expect(stats?.repeatedLineEndings.map((item) => item.word)).toEqual(['lane']);
    expect(JSON.stringify(stats)).not.toMatch(/bpm|radar|flow/i);
    expect(readPassage('x'.repeat(501)).ok).toBe(false);
    expect(prepareNote({ topic: 'rhyme', text: 'A note about the page.', url: 'https://genius.com/a' }).ok).toBe(false);
    const note = prepareNote({ topic: 'vocabulary', text: 'Ordinary objects do the work.', url: '' });
    expect(note.ok).toBe(true);
  });

  it('exports a source-backed brief that is not an analysis', () => {
    const source: PublicSource = {
      id: 'mb:1',
      title: 'Young Solo on MusicBrainz',
      publisher: 'MusicBrainz',
      url: 'https://musicbrainz.org/artist/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      retrievedAt: '2026-11-07T18:00:00.000Z',
      kind: 'catalog_record',
      excerpt: 'Young Solo is a MusicBrainz person record.',
    };
    const brief = buildResearchBrief({
      identity,
      sources: [source],
      notes: [{ id: 'n1', topic: 'vocabulary', text: 'Keep the concrete noun.', url: '' }],
      passage: 'hold the lane and hold the lane',
    });
    expect(brief).toContain('not an AI analysis');
    expect(brief).toContain('No model was called');
    expect(brief).toContain(source.excerpt);
    expect(brief).toContain('Keep the concrete noun.');
    expect(brief).toContain('lane (2)');
    expect(brief).toContain('Web search for interviews');
    expect(brief).not.toContain('genius.com');
    const links = externalSearchLinks('Young Solo');
    expect(links.every((item) => item.href.startsWith('https://'))).toBe(true);
    expect(links.map((item) => new URL(item.href).hostname)).toEqual(['en.wikipedia.org', 'musicbrainz.org', 'www.wikidata.org', 'duckduckgo.com']);
  });
});
