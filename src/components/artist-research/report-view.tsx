import type { ArtistReport, EvidenceLayer, PublicSource, SectionId } from '@/lib/artist-research/types';
import { ComparisonTable, PunchDiagram, RhymeDiagram } from './graphics';

const SECTION_LABEL: Record<SectionId, string> = {
  vocabulary: 'Lyric vocabulary',
  rhyme: 'Rhyme construction',
  punchlines: 'Punchline strategies',
  narrative: 'Narrative and persona',
  hooks: 'Hooks',
  delivery: 'Documented flow and delivery',
};

const LAYER_LABEL: Record<EvidenceLayer, string> = {
  source_quotation: 'Source quotation',
  critic_observation: 'Critic observation',
  model_interpretation: 'Model interpretation',
  schematic: 'Schematic',
};

export function ReportView({ report }: { report: ArtistReport }) {
  return (
    <article className="research-result" data-state="report" data-report-label={report.label} aria-labelledby="research-report-title">
      <p className="research-banner">
        {report.label === 'fixture' ? 'Fixture report. This was not produced by a live lookup.' : 'Live synthesis report.'}
        <span>No audio measured</span>
      </p>
      <h2 id="research-report-title">{report.artist.name}</h2>
      <p>{report.artist.disambiguation || 'No catalog disambiguation was stored on this report.'}</p>
      <p>{report.coverageNote}</p>
      {report.sections.map((section) => (
        <section key={section.id} aria-labelledby={`section-${section.id}`}>
          <h3 id={`section-${section.id}`}>{SECTION_LABEL[section.id]}</h3>
          <ul className="research-claims">
            {section.claims.map((claim) => (
              <li key={`${section.id}-${claim.layer}-${claim.text}`} className="research-claim">
                <span className="research-layer">{LAYER_LABEL[claim.layer]}</span>
                <p>{claim.text}</p>
                {claim.quotation ? (
                  <blockquote>
                    <p>“{claim.quotation}”</p>
                  </blockquote>
                ) : null}
                <SourceList ids={claim.citationIds} sources={report.sources} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section aria-labelledby="research-graphics">
        <h3 id="research-graphics">Diagrams</h3>
        {report.graphics.map((graphic) => {
          if (graphic.type === 'rhyme_placement') return <RhymeDiagram key={graphic.type} graphic={graphic} />;
          if (graphic.type === 'setup_turn_payoff') return <PunchDiagram key={graphic.type} graphic={graphic} />;
          return <ComparisonTable key={graphic.type} graphic={graphic} />;
        })}
      </section>
      <section aria-labelledby="research-limits">
        <h3 id="research-limits">Not established</h3>
        <ul>
          {report.notEstablished.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="research-practice">
        <h3 id="research-practice">Original practice, not an imitation</h3>
        <ul>
          {report.takeaways.map((item) => (
            <li key={item.text}>{item.text}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function SourceList({ ids, sources }: { ids: string[]; sources: PublicSource[] }) {
  const cited = ids.map((id) => sources.find((source) => source.id === id)).filter((source): source is PublicSource => Boolean(source));
  if (!cited.length) return null;
  return (
    <p className="research-meta">
      Sources:{' '}
      {cited.map((source, index) => (
        <span key={source.id}>
          {index > 0 ? ', ' : ''}
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.publisher}: {source.title}
          </a>
        </span>
      ))}
    </p>
  );
}
