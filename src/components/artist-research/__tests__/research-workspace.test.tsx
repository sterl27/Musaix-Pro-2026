import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getResearchProviderReport } from '@/lib/artist-research/providers';
import { buildFixtureReport } from '@/lib/artist-research/__tests__/fixture-report';
import { ResearchWorkspace } from '../research-workspace';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('artist research workspace', () => {
  it('shows the blocked provider state and no canned report', () => {
    render(<ResearchWorkspace providerReport={getResearchProviderReport({})} />);
    expect(screen.getByRole('heading', { name: 'Look up an artist. Do not invent the craft.' })).toBeInTheDocument();
    expect(screen.getByText(/Craft synthesis is off/)).toBeInTheDocument();
    expect(screen.getByText(/does not call a model/i)).toBeInTheDocument();
    expect(screen.queryByText(/Fixture report/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Young Dolph/)).not.toBeInTheDocument();
  });

  it('asks which artist was meant and does not collapse similar names', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({
      ok: false,
      status: 'disambiguation',
      query: 'young solo',
      truncated: false,
      message: 'More than one catalog record could fit that name. Similar names stay separate until you choose one.',
      candidates: [
        { id: 'mb:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Young Solo', disambiguation: 'Separate listing', kind: 'person', area: '', blurb: 'Separate listing', urls: [] },
        { id: 'mb:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Young Dolph', disambiguation: 'Memphis rapper', kind: 'person', area: 'Memphis', blurb: 'Memphis rapper', urls: [] },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ResearchWorkspace providerReport={getResearchProviderReport({})} />);
    await user.type(screen.getByLabelText('Artist name or catalog link'), 'young solo');
    await user.click(screen.getByRole('button', { name: 'Look up artist' }));
    expect(await screen.findByRole('heading', { name: 'Which artist did you mean?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use Young Solo, Separate listing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use Young Dolph, Memphis rapper' })).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(json({
      ok: false,
      status: 'insufficient_sources',
      message: 'These catalog records identify a public artist page. They do not document lyric vocabulary.',
      identity: { id: 'mb:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Young Solo', disambiguation: 'Separate listing', kind: 'person', area: '', urls: [] },
      sources: [],
      synthesis: getResearchProviderReport({}),
    }));
    await user.click(screen.getByRole('button', { name: 'Use Young Solo, Separate listing' }));
    expect(await screen.findByText(/Craft report not generated/)).toBeInTheDocument();
    const inspect = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(inspect).toEqual({ action: 'inspect', id: 'mb:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
  });

  it('renders a fixture report with diagrams and hides an unsafe payload', async () => {
    const report = buildFixtureReport();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ ok: true, status: 'report', report }))
      .mockResolvedValueOnce(json({ ok: true, status: 'report', report: { ...report, bpm: 140, sections: report.sections.map((section) => ({ ...section, claims: section.claims.map((claim) => ({ ...claim, text: 'THIS SHOULD NOT RENDER' })) })) } }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const view = render(<ResearchWorkspace providerReport={getResearchProviderReport({ ARTIST_RESEARCH_SYNTHESIS_PROVIDER: 'openai' })} />);
    await user.type(screen.getByLabelText('Artist name or catalog link'), 'Fixture MC');
    await user.click(screen.getByRole('button', { name: 'Look up artist' }));
    expect(await screen.findByText('Fixture report. This was not produced by a live lookup.')).toBeInTheDocument();
    expect(screen.getByText('End rhyme')).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getAllByText('Source quotation').length).toBeGreaterThan(0);
    expect(screen.getByText('Model interpretation')).toBeInTheDocument();
    expect(screen.getByText(/not a bar, BPM, or waveform measurement/i)).toBeInTheDocument();
    expect(screen.queryByText(/radar/i)).not.toBeInTheDocument();
    view.unmount();
    render(<ResearchWorkspace providerReport={getResearchProviderReport({})} />);
    await user.type(screen.getByLabelText('Artist name or catalog link'), 'Fixture MC');
    await user.click(screen.getByRole('button', { name: 'Look up artist' }));
    expect(await screen.findByText(/display check/)).toBeInTheDocument();
    expect(screen.queryByText('THIS SHOULD NOT RENDER')).not.toBeInTheDocument();
  });

  it('shows unknown and unavailable states from the service', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ ok: false, status: 'unknown', message: 'No MusicBrainz or English Wikipedia record matched that name. Nothing was invented in its place.' }))
      .mockResolvedValueOnce(json({ ok: false, status: 'provider_unavailable', provider: 'musicbrainz', message: 'The catalog timed out. No substitute artist or analysis was added.' }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const view = render(<ResearchWorkspace providerReport={getResearchProviderReport({})} />);
    await user.type(screen.getByLabelText('Artist name or catalog link'), 'missing person');
    await user.click(screen.getByRole('button', { name: 'Look up artist' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing was invented');
    view.unmount();
    render(<ResearchWorkspace providerReport={getResearchProviderReport({})} />);
    await user.clear(screen.getByLabelText('Artist name or catalog link'));
    await user.type(screen.getByLabelText('Artist name or catalog link'), 'offline artist');
    await user.click(screen.getByRole('button', { name: 'Look up artist' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No substitute artist');
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}
