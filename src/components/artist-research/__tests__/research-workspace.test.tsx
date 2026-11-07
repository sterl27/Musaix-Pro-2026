import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getResearchProviderReport } from '@/lib/artist-research/providers';
import { ResearchWorkspace } from '../research-workspace';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const identity = {
  id: 'mb:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Young Solo',
  disambiguation: 'Separate listing',
  kind: 'person',
  area: '',
  urls: [{ label: 'MusicBrainz', href: 'https://musicbrainz.org/artist/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
};

describe('artist research workspace', () => {
  it('starts as a working brief instead of a generation dead end', () => {
    render(<ResearchWorkspace providerReport={getResearchProviderReport({})} />);
    expect(screen.getByRole('heading', { name: 'Research an artist.' })).toBeInTheDocument();
    expect(screen.getByText(/does not write an analysis/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Start a brief' })).toBeInTheDocument();
    expect(screen.queryByText(/Fixture report/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Young Dolph/)).not.toBeInTheDocument();
  });

  it('keeps similar names separate and opens a desk instead of a model report', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({
        ok: false,
        status: 'disambiguation',
        query: 'young solo',
        truncated: false,
        message: 'More than one catalog record could fit. Exact names stay separate from looser mentions until you choose.',
        candidates: [
          { id: identity.id, name: 'Young Solo', disambiguation: 'Separate listing', kind: 'person', area: '', blurb: 'Separate listing', match: 'exact', urls: [] },
          { id: 'mb:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Young Dolph', disambiguation: 'Memphis rapper', kind: 'person', area: 'Memphis', blurb: 'Memphis rapper', match: 'mention', urls: [] },
        ],
      }))
      .mockResolvedValueOnce(json({
        ok: false,
        status: 'insufficient_sources',
        message: 'Catalog only.',
        identity,
        sources: [{
          id: identity.id,
          title: 'Young Solo on MusicBrainz',
          publisher: 'MusicBrainz',
          url: identity.urls[0].href,
          retrievedAt: '2026-11-07T18:00:00.000Z',
          kind: 'catalog_record',
          excerpt: 'Young Solo is a MusicBrainz person record.',
        }],
        synthesis: getResearchProviderReport({}),
      }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ResearchWorkspace providerReport={getResearchProviderReport({})} />);
    await user.type(screen.getByLabelText('Artist name or catalog link'), 'young solo');
    await user.click(screen.getByRole('button', { name: 'Look up artist' }));
    expect(await screen.findByRole('heading', { name: 'Which record did you mean?' })).toBeInTheDocument();
    expect(screen.getByText('Exact name')).toBeInTheDocument();
    expect(screen.getByText('Mentioned under another name')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Choose Young Solo, Separate listing' }));
    expect(await screen.findByText('Working brief. Not an AI analysis. No model was called and no audio was measured.')).toBeInTheDocument();
    expect(screen.getByText('Young Solo is a MusicBrainz person record.')).toBeInTheDocument();
    expect(screen.queryByText(/Fixture report/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Paste at most/), 'hold the lane\nhold the lane');
    expect(screen.getByText('lane')).toBeInTheDocument();
    expect(screen.getAllByText('2 times').length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Note'), 'Ordinary objects do the work.');
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    expect(screen.getByText('Ordinary objects do the work.')).toBeInTheDocument();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:brief');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Download research brief' }));
    expect(click).toHaveBeenCalled();
  });

  it('offers search links when the name is unknown and hides a model payload', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ ok: false, status: 'unknown', message: 'No catalog record uses that name. Nothing was invented in its place.' }))
      .mockResolvedValueOnce(json({ ok: true, status: 'report', report: { label: 'fixture', audioMeasured: false } }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const view = render(<ResearchWorkspace providerReport={getResearchProviderReport({})} />);
    await user.type(screen.getByLabelText('Artist name or catalog link'), 'missing person');
    await user.click(screen.getByRole('button', { name: 'Look up artist' }));
    expect(await screen.findByRole('heading', { name: 'No exact catalog name' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'English Wikipedia search' })).toHaveAttribute('href', expect.stringContaining('https://en.wikipedia.org/'));
    view.unmount();
    render(<ResearchWorkspace providerReport={getResearchProviderReport({})} />);
    await user.type(screen.getByLabelText('Artist name or catalog link'), 'Fixture MC');
    await user.click(screen.getByRole('button', { name: 'Look up artist' }));
    expect(await screen.findByText(/was not shown/)).toBeInTheDocument();
    expect(screen.queryByText(/Fixture report/)).not.toBeInTheDocument();
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}
