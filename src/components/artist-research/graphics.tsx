import type { ComparisonGraphic, PunchGraphic, RhymeGraphic, RhymeLine } from '@/lib/artist-research/types';

const ROLE_LABEL: Record<RhymeLine['role'], string> = {
  end_rhyme: 'End rhyme',
  internal_echo: 'Internal echo',
  repetition: 'Repetition',
  other: 'Other sound',
};

const STEP_LABEL = { setup: 'Setup', turn: 'Turn', payoff: 'Payoff' } as const;

const EVIDENCE_LABEL = {
  documented: 'Documented',
  disputed: 'Disputed',
  not_established: 'Not established',
} as const;

export function RhymeDiagram({ graphic }: { graphic: RhymeGraphic }) {
  return (
    <figure>
      <figcaption>{graphic.caption}</figcaption>
      <p className="research-graphic-note">Printed-text diagram. Roles name where a sound sits in the phrase. This is not a bar, BPM, or waveform measurement. Basis: {graphic.basis === 'schematic' ? 'original schematic' : 'printed fragment'}.</p>
      <ol className="research-rhyme">
        {graphic.lines.map((line) => (
          <li key={`${line.role}-${line.text}`}>
            <span className="research-role">{ROLE_LABEL[line.role]}</span>
            <span className="research-origin">{line.original ? 'Original schematic' : 'Printed fragment'}</span>
            <p>{highlight(line.text, line.highlight)}</p>
            {line.soundFamily ? <p className="research-meta">Sound family: {line.soundFamily}</p> : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function PunchDiagram({ graphic }: { graphic: PunchGraphic }) {
  return (
    <figure>
      <figcaption>{graphic.caption}</figcaption>
      <p className="research-graphic-note">Setup, turn, and payoff are a writing diagram. The sentences are original schematics, not a transcription of the artist and not a timed performance.</p>
      <ol className="research-punch">
        {graphic.steps.map((step) => (
          <li key={step.id}>
            <span className="research-role">{STEP_LABEL[step.id]}</span>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function ComparisonTable({ graphic }: { graphic: ComparisonGraphic }) {
  return (
    <figure>
      <div className="research-table-wrap">
        <table>
          <caption>{graphic.caption}</caption>
          <thead>
            <tr>
              <th scope="col">Aspect</th>
              <th scope="col">{graphic.leftHeading}</th>
              <th scope="col">{graphic.rightHeading}</th>
              <th scope="col">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {graphic.rows.map((row) => (
              <tr key={row.aspect}>
                <th scope="row">{row.aspect}</th>
                <td>{row.left}</td>
                <td>{row.right}</td>
                <td><span className="research-evidence">{EVIDENCE_LABEL[row.evidence]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="research-graphic-note">Qualitative labels only. No score, rank, or measured timing is attached to this comparison.</p>
    </figure>
  );
}

function highlight(text: string, mark?: string) {
  if (!mark || !text.includes(mark)) return text;
  const index = text.indexOf(mark);
  return (
    <>
      {text.slice(0, index)}
      <mark>{mark}</mark>
      {text.slice(index + mark.length)}
    </>
  );
}
