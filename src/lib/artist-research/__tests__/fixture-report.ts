import { validateModelReport } from '../report-schema';
import type { ArtistReport, PublicIdentity, PublicSource } from '../types';

export const FIXTURE_MBID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

export function fixtureIdentity(): PublicIdentity {
  return {
    id: `mb:${FIXTURE_MBID}`,
    name: 'Fixture MC',
    disambiguation: 'Test-only artist',
    kind: 'person',
    area: 'Nowhere',
    urls: [{ label: 'MusicBrainz', href: `https://musicbrainz.org/artist/${FIXTURE_MBID}` }],
  };
}

export function fixtureSources(): PublicSource[] {
  return [
    {
      id: 'fx-interview',
      title: 'Fixture interview',
      publisher: 'Fixture Quarterly',
      url: 'https://fixture.invalid/interview',
      retrievedAt: '2026-11-07T18:00:00.000Z',
      kind: 'interview',
      excerpt: 'The artist describes the hook as a return to the plain phrase hold the lane after each scene, using ordinary objects rather than a technical vocabulary.',
    },
    {
      id: 'fx-critic',
      title: 'Fixture review',
      publisher: 'Fixture Review',
      url: 'https://fixture.invalid/review',
      retrievedAt: '2026-11-07T18:00:00.000Z',
      kind: 'review',
      excerpt: 'The reviewer hears a colder verse against a brighter hook and says the delivery change is audible, without timing the performance.',
    },
  ];
}

export function fixtureModelPayload() {
  return {
    sections: [
      { id: 'vocabulary', claims: [{ layer: 'source_quotation', text: 'The interview keeps the hook on ordinary objects.', citationIds: ['fx-interview'], quotation: 'hold the lane' }] },
      { id: 'rhyme', claims: [{ layer: 'schematic', text: 'A short repeated phrase can land without a longer chain.', citationIds: ['fx-interview'] }] },
      { id: 'punchlines', claims: [{ layer: 'model_interpretation', text: 'The scene object does the turn. The interview does not spell out a joke.', citationIds: ['fx-interview'] }] },
      { id: 'narrative', claims: [{ layer: 'critic_observation', text: 'The review separates a colder verse from a brighter hook.', citationIds: ['fx-critic'], quotation: 'colder verse' }] },
      { id: 'hooks', claims: [{ layer: 'source_quotation', text: 'The hook is described as a return to one plain phrase.', citationIds: ['fx-interview'], quotation: 'hold the lane' }] },
      { id: 'delivery', claims: [{ layer: 'critic_observation', text: 'The review describes an audible change. Audio timing was not measured.', citationIds: ['fx-critic'], quotation: 'delivery change' }] },
    ],
    graphics: [
      {
        type: 'rhyme_placement',
        basis: 'schematic',
        caption: 'Original schematic of an internal echo beside an end rhyme. Not this artist.',
        lines: [
          { text: 'night shift under quiet glass', role: 'internal_echo', original: true, soundFamily: 'long i', highlight: 'night' },
          { text: 'tight grip on the same glass', role: 'end_rhyme', original: true, soundFamily: 'long i', highlight: 'tight' },
        ],
      },
      {
        type: 'setup_turn_payoff',
        basis: 'schematic',
        caption: 'Original schematic of setup, turn, and payoff. Not a transcription.',
        original: true,
        steps: [
          { id: 'setup', text: 'He said the door was sealed shut.' },
          { id: 'turn', text: 'The hinge still knew the old key.' },
          { id: 'payoff', text: 'Silence was the lock that failed.' },
        ],
      },
      {
        type: 'qualitative_comparison',
        caption: 'What these two fixture sources support, with no rank attached.',
        leftHeading: 'Supported',
        rightHeading: 'Not established',
        rows: [
          { aspect: 'Vocabulary', left: 'Ordinary objects in the interview', right: 'No full lexicon was collected', evidence: 'documented' },
          { aspect: 'Delivery', left: 'Review describes a colder verse', right: 'Audio timing was not measured', evidence: 'not_established' },
        ],
      },
    ],
    notEstablished: ['Audio timing was not measured from these texts.', 'No complete lyric was reproduced.'],
    takeaways: [
      { text: 'Keep one concrete object through the turn, then stop.', imitatesArtist: false },
      { text: 'Let a repeated plain phrase be the hook instead of explaining it.', imitatesArtist: false },
    ],
  };
}

export function buildFixtureReport(): ArtistReport {
  const validated = validateModelReport(fixtureModelPayload(), { sources: fixtureSources(), label: 'fixture', artist: fixtureIdentity() });
  if (!validated.ok) throw new Error(validated.errors.join('\n'));
  return validated.report;
}
