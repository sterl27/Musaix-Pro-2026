'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import type { ArtistCandidate, NameMatch, ProviderReport, PublicIdentity, PublicSource, ResearchResult } from '@/lib/artist-research/types';
import { ResearchDesk, SearchLinks } from './research-desk';
import './research.css';

type Phase =
  | { status: 'idle' }
  | { status: 'loading'; message: string }
  | { status: 'invalid_input' | 'unknown' | 'ambiguous_page' | 'rate_limited' | 'provider_unavailable' | 'cancelled' | 'report_hidden'; message: string }
  | { status: 'disambiguation'; query: string; candidates: ArtistCandidate[]; truncated: boolean; message: string }
  | { status: 'workspace'; identity: PublicIdentity; sources: PublicSource[]; candidates: ArtistCandidate[]; query: string };

const TIER: Record<NameMatch, string> = {
  exact: 'Exact name',
  phrase: 'Name contains your words',
  alias: 'Alias',
  mention: 'Mentioned under another name',
};

export function ResearchWorkspace({ providerReport }: { providerReport: ProviderReport }) {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>({ status: 'idle' });
  const [pendingLookup, setPendingLookup] = useState('');
  const [deskDirty, setDeskDirty] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastRef = useRef<{ action: 'resolve'; query: string } | { action: 'inspect'; id: string } | null>(null);
  const choicesRef = useRef<ArtistCandidate[]>([]);

  function resetDesk() {
    setDeskDirty(false);
    setPendingLookup('');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = query.trim();
    if (deskDirty) {
      setPendingLookup(next);
      return;
    }
    await run({ action: 'resolve', query: next }, 'Checking MusicBrainz and English Wikipedia.');
  }

  async function choose(id: string) {
    resetDesk();
    await run({ action: 'inspect', id }, 'Opening the catalog record.');
  }

  async function retry() {
    if (lastRef.current) await run(lastRef.current, 'Checking the catalog again.');
  }

  async function run(body: { action: 'resolve'; query: string } | { action: 'inspect'; id: string }, message: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastRef.current = body;
    if (body.action === 'resolve') choicesRef.current = [];
    setPhase({ status: 'loading', message });
    try {
      const response = await fetch('/api/artist-research', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as ResearchResult | null;
      if (controller.signal.aborted) return;
      if (!payload || typeof payload !== 'object' || !('status' in payload)) {
        setPhase({ status: 'provider_unavailable', message: 'The research service returned an unreadable response. No brief was invented.' });
        return;
      }
      setPhase(toPhase(payload, choicesRef));
    } catch {
      if (!controller.signal.aborted) setPhase({ status: 'provider_unavailable', message: 'The research service could not be reached. No brief was invented.' });
    }
  }

  return (
    <main className="research-page">
      <header className="research-nav">
        <Link href="/" className="research-brand">
          MUSAIX <b>PRO</b>
        </Link>
        <nav aria-label="Workspace">
          <Link href="/audio">Audio</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/canvas">Canvas</Link>
          <Link href="/research" aria-current="page">
            Research
          </Link>
        </nav>
      </header>
      <p className="research-kicker">Public artist research</p>
      <h1>Research an artist.</h1>
      <p className="research-lead">Look up a public catalog record, keep your own notes, and count a short passage you are allowed to study. This page does not write an analysis.</p>
      <form className="research-form" onSubmit={onSubmit}>
        <label htmlFor="artist-query">Artist name or catalog link</label>
        <input id="artist-query" name="artist" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" required maxLength={160} placeholder="Artist name or https://musicbrainz.org/artist/…" />
        <div className="research-actions">
          <button className="research-primary" type="submit" disabled={phase.status === 'loading'}>
            {phase.status === 'loading' ? 'Looking up…' : 'Look up artist'}
          </button>
          {phase.status !== 'idle' ? (
            <button
              className="research-secondary"
              type="button"
              onClick={() => {
                abortRef.current?.abort();
                resetDesk();
                setPhase({ status: 'idle' });
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        {pendingLookup ? (
          <div className="research-alert" role="alert">
            <p>Start a new lookup? Notes and the pasted passage in this tab will be cleared.</p>
            <div className="research-actions">
              <button
                className="research-primary"
                type="button"
                onClick={() => {
                  resetDesk();
                  void run({ action: 'resolve', query: pendingLookup }, 'Checking MusicBrainz and English Wikipedia.');
                }}
              >
                Start lookup
              </button>
              <button className="research-secondary" type="button" onClick={() => setPendingLookup('')}>
                Keep this record
              </button>
            </div>
          </div>
        ) : null}
      </form>
      <section aria-live="polite" aria-busy={phase.status === 'loading'}>
        {phase.status === 'idle' ? (
          <div className="research-result" data-state="idle">
            <h2>Start a brief</h2>
            <ol className="research-steps">
              <li>Look up a name or a MusicBrainz, English Wikipedia, or Wikidata link.</li>
              <li>Choose the record when more than one name fits.</li>
              <li>Add notes or paste a short passage, then download the brief.</li>
            </ol>
          </div>
        ) : null}
        {phase.status === 'loading' ? (
          <p className="research-result" data-state="loading">
            {phase.message}
          </p>
        ) : null}
        {phase.status === 'invalid_input' || phase.status === 'ambiguous_page' || phase.status === 'rate_limited' || phase.status === 'cancelled' || phase.status === 'report_hidden' ? (
          <div className="research-result research-alert" role="alert" data-state={phase.status}>
            <p>{phase.message}</p>
            {phase.status !== 'report_hidden' && lastRef.current ? (
              <button className="research-secondary" type="button" onClick={() => void retry()}>
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
        {phase.status === 'provider_unavailable' ? (
          <div className="research-result research-alert" role="alert" data-state="provider_unavailable">
            <h2>The catalog did not respond</h2>
            <p>{phase.message}</p>
            <button className="research-secondary" type="button" onClick={() => void retry()}>
              Try the catalog again
            </button>
          </div>
        ) : null}
        {phase.status === 'unknown' ? (
          <div className="research-result" role="alert" data-state="unknown">
            <h2>No exact catalog name</h2>
            <p>{phase.message}</p>
            <SearchLinks name={query} />
          </div>
        ) : null}
        {phase.status === 'disambiguation' ? (
          <div className="research-result" data-state="disambiguation">
            <h2>Which record did you mean?</h2>
            <p>{phase.message}</p>
            {phase.truncated ? <p>Further catalog matches were left off this list.</p> : null}
            <ul className="research-candidates">
              {phase.candidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} onChoose={choose} />
              ))}
            </ul>
            <SearchLinks name={phase.query} />
          </div>
        ) : null}
        {phase.status === 'workspace' ? (
          <ResearchDesk
            identity={phase.identity}
            sources={phase.sources}
            onDirty={setDeskDirty}
            onLeave={() => {
              resetDesk();
              if (phase.candidates.length > 1) {
                setPhase({ status: 'disambiguation', query: phase.query, candidates: phase.candidates, truncated: false, message: 'Choose another catalog record. Notes from the previous record were cleared.' });
              } else setPhase({ status: 'idle' });
            }}
          />
        ) : null}
      </section>
      <details className="research-details">
        <summary>Why generated analysis is off</summary>
        <p>{providerReport.synthesis.summary}</p>
        <p>{providerReport.catalog.note}</p>
        <p>{providerReport.privateArchives.note}</p>
      </details>
    </main>
  );
}

function CandidateCard({ candidate, onChoose }: { candidate: ArtistCandidate; onChoose: (id: string) => void }) {
  const label = candidate.disambiguation ? `${candidate.name}, ${candidate.disambiguation}` : candidate.name;
  return (
    <li className="research-candidate">
      {candidate.match ? <span className="research-tier">{TIER[candidate.match]}</span> : null}
      <h3>{candidate.name}</h3>
      <p>{candidate.disambiguation || 'No short catalog description was returned.'}</p>
      <p className="research-meta">{[candidate.kind, candidate.area].filter(Boolean).join(' · ') || 'Catalog record'}</p>
      {candidate.match && candidate.match !== 'exact' ? <p>{candidate.blurb}</p> : null}
      <button className="research-secondary" type="button" onClick={() => onChoose(candidate.id)}>
        Choose {label}
      </button>
    </li>
  );
}

function toPhase(result: ResearchResult, choices: { current: ArtistCandidate[] }): Phase {
  if (result.status === 'disambiguation') {
    choices.current = result.candidates;
    return { status: 'disambiguation', query: result.query, candidates: result.candidates, truncated: result.truncated, message: result.message };
  }
  if (result.status === 'insufficient_sources' || result.status === 'synthesis_unavailable' || result.status === 'billing_confirmation_required') {
    return { status: 'workspace', identity: result.identity, sources: result.sources, candidates: choices.current, query: result.identity.name };
  }
  if (result.status === 'report' || result.status === 'report_rejected') {
    return { status: 'report_hidden', message: 'A generated analysis was not shown. This page keeps catalog text, your notes, and passage counts only.' };
  }
  return { status: result.status, message: result.message };
}
