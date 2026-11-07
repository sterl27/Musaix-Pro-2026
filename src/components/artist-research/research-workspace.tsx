'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { reportIsSafeToRender } from '@/lib/artist-research/report-schema';
import type { ArtistCandidate, ProviderReport, PublicIdentity, PublicSource, ResearchResult, SourceKind } from '@/lib/artist-research/types';
import { ReportView } from './report-view';
import './research.css';

type View = ResearchResult | { status: 'idle' } | { status: 'loading'; message: string };

const KIND_LABEL: Record<SourceKind, string> = {
  catalog_record: 'Catalog record',
  encyclopedia_summary: 'Encyclopedia summary',
  interview: 'Interview',
  review: 'Review',
  criticism: 'Criticism',
  artist_statement: 'Artist statement',
};

export function ResearchWorkspace({ providerReport }: { providerReport: ProviderReport }) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  function reset() {
    abortRef.current?.abort();
    setView({ status: 'idle' });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run({ action: 'resolve', query: query.trim() }, 'Looking up public catalog records.');
  }

  async function choose(id: string) {
    await run({ action: 'inspect', id }, 'Opening the selected catalog record.');
  }

  async function run(body: { action: 'resolve'; query: string } | { action: 'inspect'; id: string }, message: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setView({ status: 'loading', message });
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
        setView({ ok: false, status: 'provider_unavailable', provider: 'app', message: 'The research service returned an unreadable response. No report was created.' });
        return;
      }
      setView(acceptResult(payload));
    } catch {
      if (!controller.signal.aborted) {
        setView({ ok: false, status: 'provider_unavailable', provider: 'app', message: 'The research service could not be reached. No report was created.' });
      }
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
      <h1>Look up an artist. Do not invent the craft.</h1>
      <p className="research-lead">
        Enter a name or a MusicBrainz, English Wikipedia, or Wikidata link. Ambiguous names stay unresolved until you choose a record. Lyric-site pages are not fetched.
      </p>
      <ProviderPanel report={providerReport} />
      <form className="research-form" onSubmit={onSubmit}>
        <label htmlFor="artist-query">Artist name or catalog link</label>
        <input
          id="artist-query"
          name="artist"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          required
          maxLength={160}
          placeholder="Artist name or https://musicbrainz.org/artist/…"
        />
        <div className="research-actions">
          <button className="research-primary" type="submit" disabled={view.status === 'loading'}>
            Look up artist
          </button>
          {view.status !== 'idle' ? (
            <button className="research-secondary" type="button" onClick={reset}>
              Clear
            </button>
          ) : null}
        </div>
        <p className="research-note">Lookup reads public catalog records. It does not call a model and it does not turn a biography into a lyric analysis.</p>
      </form>
      <section aria-live="polite" aria-busy={view.status === 'loading'}>
        {view.status === 'loading' ? <p className="research-result">{view.message}</p> : null}
        {view.status === 'invalid_input' || view.status === 'unknown' || view.status === 'ambiguous_page' || view.status === 'rate_limited' ? (
          <p className="research-result research-alert" role="alert" data-state={view.status}>
            {view.message}
          </p>
        ) : null}
        {view.status === 'provider_unavailable' ? (
          <p className="research-result research-alert" role="alert" data-state="provider_unavailable">
            {view.message}
          </p>
        ) : null}
        {view.status === 'cancelled' ? <p className="research-result">{view.message}</p> : null}
        {view.status === 'disambiguation' ? <Disambiguation view={view} onChoose={choose} /> : null}
        {view.status === 'insufficient_sources' || view.status === 'synthesis_unavailable' || view.status === 'billing_confirmation_required' ? (
          <IdentityResult view={view} />
        ) : null}
        {view.status === 'report_rejected' ? (
          <div className="research-result research-alert" role="alert" data-state="report_rejected">
            <h2>Draft discarded</h2>
            <p>{view.message}</p>
            {view.errors?.length ? (
              <ul>
                {view.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {view.status === 'report' ? <ReportView report={view.report} /> : null}
      </section>
    </main>
  );
}

function ProviderPanel({ report }: { report: ProviderReport }) {
  return (
    <section className="research-panel" aria-labelledby="provider-status">
      <h2 id="provider-status">Provider status</h2>
      <p className="research-status" data-synthesis={report.synthesis.enabled ? 'on' : 'off'}>
        {report.synthesis.summary}
      </p>
      <details className="research-details">
        <summary>Why model generation stays off</summary>
        <p>{report.catalog.note}</p>
        <p>{report.privateArchives.note}</p>
        {report.synthesis.alternatives.map((item) => (
          <article key={item.id} className="research-alternative">
            <h3>{item.id}</h3>
            <p>{item.decision}</p>
            <p className="research-meta">{item.repoEvidence}</p>
            <p className="research-meta">Billing if called: {item.billing === 'would_bill_if_called' ? 'possible provider charge' : 'not a model account'}. Selectable here: no.</p>
          </article>
        ))}
      </details>
    </section>
  );
}

function Disambiguation({ view, onChoose }: { view: Extract<ResearchResult, { status: 'disambiguation' }>; onChoose: (id: string) => void }) {
  return (
    <div className="research-result" data-state="disambiguation">
      <h2>Which artist did you mean?</h2>
      <p>{view.message}</p>
      {view.truncated ? <p>Additional catalog matches were left off this page.</p> : null}
      <ul className="research-candidates">
        {view.candidates.map((candidate) => (
          <CandidateCard key={candidate.id} candidate={candidate} onChoose={onChoose} />
        ))}
      </ul>
    </div>
  );
}

function CandidateCard({ candidate, onChoose }: { candidate: ArtistCandidate; onChoose: (id: string) => void }) {
  const label = candidate.disambiguation ? `${candidate.name}, ${candidate.disambiguation}` : candidate.name;
  return (
    <li className="research-candidate">
      <h3>{candidate.name}</h3>
      <p>{candidate.disambiguation || 'No catalog disambiguation was returned.'}</p>
      <p className="research-meta">{[candidate.kind, candidate.area].filter(Boolean).join(' · ') || 'Catalog record'}</p>
      <p>{candidate.blurb}</p>
      <ul className="research-links">
        {candidate.urls.map((url) => (
          <li key={url.href}>
            <a href={url.href} target="_blank" rel="noreferrer">
              {url.label}
            </a>
          </li>
        ))}
      </ul>
      <button className="research-secondary" type="button" onClick={() => onChoose(candidate.id)}>
        Use {label}
      </button>
    </li>
  );
}

function IdentityResult({ view }: { view: Extract<ResearchResult, { status: 'insufficient_sources' | 'synthesis_unavailable' | 'billing_confirmation_required' }> }) {
  return (
    <div className="research-result" data-state={view.status}>
      <h2>{view.identity.name}</h2>
      <p className="research-banner">Craft report not generated. No model was called.</p>
      <p>{view.message}</p>
      <IdentityFacts identity={view.identity} />
      <SourceCards sources={view.sources} />
    </div>
  );
}

function IdentityFacts({ identity }: { identity: PublicIdentity }) {
  return (
    <>
      <p>{identity.disambiguation || 'No catalog disambiguation was returned.'}</p>
      <p className="research-meta">{[identity.kind, identity.area].filter(Boolean).join(' · ')}</p>
      <ul className="research-links">
        {identity.urls.map((url) => (
          <li key={url.href}>
            <a href={url.href} target="_blank" rel="noreferrer">
              {url.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

function SourceCards({ sources }: { sources: PublicSource[] }) {
  if (!sources.length) return <p>No source text was returned.</p>;
  return (
    <ul className="research-sources">
      {sources.map((source) => (
        <li key={source.id} className="research-source">
          <h3>{source.title}</h3>
          <p className="research-meta">
            {KIND_LABEL[source.kind]} · {source.publisher}
          </p>
          <p className="research-untrusted">The text below is untrusted source material. It is not a measurement and not a craft conclusion.</p>
          <blockquote cite={source.url}>
            <p>{source.excerpt}</p>
          </blockquote>
          <a href={source.url} target="_blank" rel="noreferrer">
            Open source
          </a>
        </li>
      ))}
    </ul>
  );
}

function acceptResult(result: ResearchResult): ResearchResult {
  if (result.status === 'report' && !reportIsSafeToRender(result.report)) {
    return {
      ok: false,
      status: 'report_rejected',
      message: 'The response failed the display check and was not shown.',
      errors: ['The report was missing its labels or included a forbidden measurement field.'],
    };
  }
  return result;
}
