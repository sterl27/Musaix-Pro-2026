import { CRAFT_SOURCE_KINDS, EVIDENCE_LAYERS, SECTION_IDS, type ArtistReport, type EvidenceLayer, type PublicIdentity, type PublicSource, type ReportGraphic, type SectionId } from './types';
import { codePointLength, containsControlChars, hasBarCount, hasInventedMeasurement, instructsImitation } from './text';

export const COVERAGE_NOTE = 'Audio was not measured. Graphics are schematics or annotations of printed text, not cadence, BPM, or timing measurements.';

const FORBIDDEN_KEY = /^(bpm|tempo|radar|score|cadence|cadencems|accuracy|confidence|loudness|pitch|timing|milliseconds)$/i;
const SOUND_FAMILY = /^[\p{L}\p{N} /-]{2,40}$/u;
const ROLES = new Set(['end_rhyme', 'internal_echo', 'repetition', 'other']);
const EVIDENCE = new Set(['documented', 'disputed', 'not_established']);
const CRAFT = new Set<string>(CRAFT_SOURCE_KINDS);

export function validateModelReport(
  raw: unknown,
  context: { sources: PublicSource[]; label: 'fixture' | 'live'; artist: PublicIdentity },
): { ok: true; report: ArtistReport } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  walkKeys(raw, 'report', errors);
  const root = record(raw);
  if (!root) return { ok: false, errors: ['The draft report was not an object.'] };
  exactKeys(root, ['sections', 'graphics', 'notEstablished', 'takeaways'], errors, 'report');
  const sections = parseSections(root.sections, context.sources, errors);
  const graphics = parseGraphics(root.graphics, context.sources, errors);
  const notEstablished = stringList(root.notEstablished, 'notEstablished', 1, 6, 220, errors);
  const takeaways = parseTakeaways(root.takeaways, errors);
  if (notEstablished && !notEstablished.some((item) => /not measured/i.test(item) && /audio|timing|delivery/i.test(item))) {
    errors.push('The report must state that audio timing was not measured.');
  }
  if (sections && !sections.some((section) => section.id === 'delivery' && section.claims.some((claim) => /not measured|no audio|not listened/i.test(claim.text)))) {
    errors.push('The delivery section must say that audio was not measured.');
  }
  if (errors.length || !sections || !graphics || !notEstablished || !takeaways) {
    return { ok: false, errors: errors.slice(0, 12) };
  }
  return {
    ok: true,
    report: {
      version: 1,
      label: context.label,
      audioMeasured: false,
      coverageNote: COVERAGE_NOTE,
      artist: context.artist,
      sources: context.sources,
      sections,
      graphics,
      notEstablished,
      takeaways,
    },
  };
}

function parseSections(value: unknown, sources: PublicSource[], errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push('sections must be a list.');
    return null;
  }
  const seen = new Set<string>();
  const sections: ArtistReport['sections'] = [];
  for (const item of value) {
    const section = record(item);
    if (!section) {
      errors.push('A section was not an object.');
      continue;
    }
    exactKeys(section, ['id', 'claims'], errors, 'section');
    const id = section.id;
    if (typeof id !== 'string' || !SECTION_IDS.includes(id as SectionId)) {
      errors.push('A section id is not one of the craft sections.');
      continue;
    }
    if (seen.has(id)) errors.push(`The ${id} section is repeated.`);
    seen.add(id);
    if (!Array.isArray(section.claims) || section.claims.length < 1 || section.claims.length > 3) {
      errors.push(`The ${id} section needs 1 to 3 claims.`);
      continue;
    }
    const claims = section.claims.map((claim, index) => parseClaim(claim, `${id} claim ${index + 1}`, sources, errors)).filter((claim): claim is ArtistReport['sections'][number]['claims'][number] => claim !== null);
    if (claims.length === section.claims.length) sections.push({ id: id as SectionId, claims });
  }
  for (const id of SECTION_IDS) {
    if (!seen.has(id)) errors.push(`The ${id} section is missing.`);
  }
  return sections.length === SECTION_IDS.length ? sections : null;
}

function parseClaim(value: unknown, path: string, sources: PublicSource[], errors: string[]) {
  const claim = record(value);
  if (!claim) {
    errors.push(`${path} was not an object.`);
    return null;
  }
  const layer = claim.layer;
  if (layer === 'measured_audio') {
    errors.push(`${path} claims measured audio. Text research cannot do that.`);
    return null;
  }
  if (typeof layer !== 'string' || !EVIDENCE_LAYERS.includes(layer as EvidenceLayer)) {
    errors.push(`${path} has an unknown evidence layer.`);
    return null;
  }
  const evidence = layer as EvidenceLayer;
  const allowed = evidence === 'source_quotation' || evidence === 'critic_observation' ? ['layer', 'text', 'citationIds', 'quotation'] : ['layer', 'text', 'citationIds'];
  exactKeys(claim, allowed, errors, path);
  const text = boundedString(claim.text, `${path} text`, 400, errors);
  const citationIds = citations(claim.citationIds, path, sources, errors);
  if (!text || !citationIds) return null;
  if (!citationIds.some((id) => CRAFT.has(sources.find((source) => source.id === id)?.kind ?? ''))) {
    errors.push(`${path} must cite an interview, review, criticism, or artist statement.`);
  }
  checkProse(text, path, evidence, errors);
  if (evidence === 'source_quotation' && typeof claim.quotation !== 'string') {
    errors.push(`${path} is missing its short quotation.`);
    return null;
  }
  if (typeof claim.quotation === 'string') {
    const quotation = quote(claim.quotation, path, citationIds, sources, errors);
    if (!quotation) return null;
    return { layer: evidence, text, citationIds, quotation };
  }
  return { layer: evidence, text, citationIds };
}

function parseGraphics(value: unknown, sources: PublicSource[], errors: string[]) {
  if (!Array.isArray(value) || value.length !== 3) {
    errors.push('graphics must contain one rhyme diagram, one setup diagram, and one comparison.');
    return null;
  }
  const graphics: ReportGraphic[] = [];
  for (const item of value) {
    const graphic = record(item);
    if (!graphic || typeof graphic.type !== 'string') {
      errors.push('A graphic was not an object.');
      continue;
    }
    if (graphic.type === 'rhyme_placement') graphics.push(...one(parseRhyme(graphic, sources, errors)));
    else if (graphic.type === 'setup_turn_payoff') graphics.push(...one(parsePunch(graphic, sources, errors)));
    else if (graphic.type === 'qualitative_comparison') graphics.push(...one(parseComparison(graphic, errors)));
    else errors.push(`Unsupported graphic ${graphic.type}.`);
  }
  const types = graphics.map((graphic) => graphic.type);
  for (const type of ['rhyme_placement', 'setup_turn_payoff', 'qualitative_comparison']) {
    if (types.filter((item) => item === type).length !== 1) errors.push(`The report needs exactly one ${type} graphic.`);
  }
  return graphics.length === 3 && errors.length === 0 ? graphics : graphics;
}

function parseRhyme(graphic: Record<string, unknown>, sources: PublicSource[], errors: string[]): ReportGraphic | null {
  exactKeys(graphic, ['type', 'basis', 'caption', 'lines'], errors, 'rhyme graphic');
  const basis = graphic.basis;
  const caption = boundedString(graphic.caption, 'rhyme caption', 220, errors);
  if (basis !== 'schematic' && basis !== 'printed_excerpt') errors.push('The rhyme graphic basis must be schematic or printed_excerpt.');
  if (!caption || !Array.isArray(graphic.lines) || graphic.lines.length < 2 || graphic.lines.length > 6) {
    errors.push('The rhyme graphic needs 2 to 6 lines.');
    return null;
  }
  checkProse(caption, 'rhyme caption', 'schematic', errors);
  const lines = [];
  for (const [index, item] of graphic.lines.entries()) {
    const line = record(item);
    if (!line) {
      errors.push(`Rhyme line ${index + 1} was not an object.`);
      continue;
    }
    exactKeys(line, ['text', 'role', 'original', 'soundFamily', 'highlight', 'citationIds'], errors, `rhyme line ${index + 1}`);
    const text = boundedString(line.text, `rhyme line ${index + 1}`, 90, errors);
    if (!text || typeof line.role !== 'string' || !ROLES.has(line.role) || typeof line.original !== 'boolean') {
      errors.push(`Rhyme line ${index + 1} is incomplete.`);
      continue;
    }
    if (line.soundFamily !== undefined && (typeof line.soundFamily !== 'string' || !SOUND_FAMILY.test(line.soundFamily))) {
      errors.push(`Rhyme line ${index + 1} has an invalid sound family.`);
    }
    if (line.highlight !== undefined && (typeof line.highlight !== 'string' || !text.includes(line.highlight) || codePointLength(line.highlight) > 40)) {
      errors.push(`Rhyme line ${index + 1} highlight is not in the line.`);
    }
    checkProse(text, `rhyme line ${index + 1}`, basis === 'schematic' ? 'schematic' : 'source_quotation', errors);
    if (basis === 'schematic') {
      if (!line.original || line.citationIds !== undefined) errors.push(`Schematic rhyme line ${index + 1} must be original and unlabeled as a quotation.`);
      if (codePointLength(text) < 12 || sources.some((source) => source.excerpt.includes(text))) errors.push(`Schematic rhyme line ${index + 1} copies a source or is too short.`);
    } else {
      const ids = citations(line.citationIds, `rhyme line ${index + 1}`, sources, errors);
      if (line.original || !ids || !ids.some((id) => sourceById(sources, id)?.excerpt.includes(text))) {
        errors.push(`Printed rhyme line ${index + 1} must be a short fragment of a cited source.`);
      }
    }
    lines.push({
      text,
      role: line.role as 'end_rhyme' | 'internal_echo' | 'repetition' | 'other',
      original: line.original,
      ...(typeof line.soundFamily === 'string' ? { soundFamily: line.soundFamily } : {}),
      ...(typeof line.highlight === 'string' ? { highlight: line.highlight } : {}),
      ...(basis === 'printed_excerpt' && Array.isArray(line.citationIds) ? { citationIds: line.citationIds.filter((id): id is string => typeof id === 'string') } : {}),
    });
  }
  if (basis !== 'schematic' && basis !== 'printed_excerpt') return null;
  if (lines.length !== graphic.lines.length) return null;
  return { type: 'rhyme_placement', basis, caption, lines };
}

function parsePunch(graphic: Record<string, unknown>, sources: PublicSource[], errors: string[]): ReportGraphic | null {
  exactKeys(graphic, ['type', 'basis', 'caption', 'original', 'steps'], errors, 'setup graphic');
  const caption = boundedString(graphic.caption, 'setup caption', 220, errors);
  if (graphic.basis !== 'schematic' || graphic.original !== true) errors.push('The setup diagram must be an original schematic.');
  if (!caption || !Array.isArray(graphic.steps) || graphic.steps.length !== 3) {
    errors.push('The setup diagram needs setup, turn, and payoff.');
    return null;
  }
  checkProse(caption, 'setup caption', 'schematic', errors);
  const ids = ['setup', 'turn', 'payoff'] as const;
  const texts = new Map<(typeof ids)[number], string>();
  ids.forEach((id, index) => {
    const step = record(Array.isArray(graphic.steps) ? graphic.steps[index] : null);
    const text = step ? boundedString(step.text, id, 120, errors) : null;
    if (!step || step.id !== id || !text) {
      errors.push(`The ${id} step is missing or out of order.`);
      return;
    }
    exactKeys(step, ['id', 'text'], errors, id);
    checkProse(text, id, 'schematic', errors);
    if (codePointLength(text) < 12 || sources.some((source) => source.excerpt.includes(text))) errors.push(`The ${id} step copies a source or is too short.`);
    texts.set(id, text);
  });
  const setup = texts.get('setup');
  const turn = texts.get('turn');
  const payoff = texts.get('payoff');
  if (!caption || !setup || !turn || !payoff) return null;
  return { type: 'setup_turn_payoff', basis: 'schematic', caption, original: true, steps: [{ id: 'setup', text: setup }, { id: 'turn', text: turn }, { id: 'payoff', text: payoff }] };
}

function parseComparison(graphic: Record<string, unknown>, errors: string[]): ReportGraphic | null {
  exactKeys(graphic, ['type', 'caption', 'leftHeading', 'rightHeading', 'rows'], errors, 'comparison');
  const caption = boundedString(graphic.caption, 'comparison caption', 220, errors);
  const leftHeading = boundedString(graphic.leftHeading, 'comparison left heading', 40, errors);
  const rightHeading = boundedString(graphic.rightHeading, 'comparison right heading', 40, errors);
  if (!caption || !leftHeading || !rightHeading || !Array.isArray(graphic.rows) || graphic.rows.length < 2 || graphic.rows.length > 4) {
    errors.push('The comparison needs a caption, headings, and 2 to 4 rows.');
    return null;
  }
  checkProse(`${caption} ${leftHeading} ${rightHeading}`, 'comparison', 'schematic', errors);
  const rows = [];
  for (const [index, item] of graphic.rows.entries()) {
    const row = record(item);
    if (!row) {
      errors.push(`Comparison row ${index + 1} was not an object.`);
      continue;
    }
    exactKeys(row, ['aspect', 'left', 'right', 'evidence'], errors, `comparison row ${index + 1}`);
    const aspect = boundedString(row.aspect, `comparison aspect ${index + 1}`, 80, errors);
    const left = boundedString(row.left, `comparison left ${index + 1}`, 120, errors);
    const right = boundedString(row.right, `comparison right ${index + 1}`, 120, errors);
    if (!aspect || !left || !right || typeof row.evidence !== 'string' || !EVIDENCE.has(row.evidence)) {
      errors.push(`Comparison row ${index + 1} is incomplete.`);
      continue;
    }
    checkProse(`${aspect} ${left} ${right}`, `comparison row ${index + 1}`, 'schematic', errors);
    rows.push({ aspect, left, right, evidence: row.evidence as 'documented' | 'disputed' | 'not_established' });
  }
  if (rows.length !== graphic.rows.length) return null;
  return { type: 'qualitative_comparison', caption, leftHeading, rightHeading, rows };
}

function parseTakeaways(value: unknown, errors: string[]) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 4) {
    errors.push('takeaways needs 2 to 4 original practices.');
    return null;
  }
  const takeaways: ArtistReport['takeaways'] = [];
  for (const [index, item] of value.entries()) {
    const takeaway = record(item);
    if (!takeaway) {
      errors.push(`Takeaway ${index + 1} was not an object.`);
      continue;
    }
    exactKeys(takeaway, ['text', 'imitatesArtist'], errors, `takeaway ${index + 1}`);
    const text = boundedString(takeaway.text, `takeaway ${index + 1}`, 280, errors);
    if (takeaway.imitatesArtist !== false) errors.push(`Takeaway ${index + 1} must set imitatesArtist to false.`);
    if (!text) continue;
    checkProse(text, `takeaway ${index + 1}`, 'schematic', errors);
    if (instructsImitation(text)) errors.push(`Takeaway ${index + 1} reads as imitation instruction.`);
    takeaways.push({ text, imitatesArtist: false });
  }
  return takeaways.length === value.length ? takeaways : null;
}

function quote(value: string, path: string, citationIds: string[], sources: PublicSource[], errors: string[]): string | null {
  const quotation = value.trim();
  if (containsControlChars(quotation) || codePointLength(quotation) < 1 || codePointLength(quotation) > 90) {
    errors.push(`${path} quotation must be one line of 1 to 90 characters.`);
    return null;
  }
  if (hasInventedMeasurement(quotation)) {
    errors.push(`${path} quotation contains a measurement or score.`);
    return null;
  }
  const cited = citationIds.map((id) => sourceById(sources, id)).filter((source): source is PublicSource => Boolean(source));
  if (!cited.some((source) => source.excerpt.includes(quotation) && quotation.length < source.excerpt.length)) {
    errors.push(`${path} quotation is not a short fragment of a cited source.`);
    return null;
  }
  return quotation;
}

function citations(value: unknown, path: string, sources: PublicSource[], errors: string[]): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4 || value.some((id) => typeof id !== 'string' || !sources.some((source) => source.id === id))) {
    errors.push(`${path} cites a missing or invalid source.`);
    return null;
  }
  return [...new Set(value as string[])];
}

function checkProse(value: string, path: string, layer: EvidenceLayer | 'schematic' | 'source_quotation', errors: string[]) {
  if (hasInventedMeasurement(value)) errors.push(`${path} contains an invented measurement, score, or radar claim.`);
  if ((layer === 'schematic' || layer === 'model_interpretation') && hasBarCount(value)) errors.push(`${path} uses a bar count as if it were measured.`);
  if (instructsImitation(value)) errors.push(`${path} instructs imitation.`);
}

function stringList(value: unknown, path: string, min: number, max: number, length: number, errors: string[]): string[] | null {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    errors.push(`${path} has the wrong number of entries.`);
    return null;
  }
  const items: string[] = [];
  for (const [index, item] of value.entries()) {
    const text = boundedString(item, `${path} ${index + 1}`, length, errors);
    if (!text) continue;
    if (hasInventedMeasurement(text)) errors.push(`${path} ${index + 1} contains an invented measurement.`);
    items.push(text);
  }
  return items.length === value.length ? items : null;
}

function boundedString(value: unknown, path: string, max: number, errors: string[]): string | null {
  if (typeof value !== 'string' || containsControlChars(value)) {
    errors.push(`${path} must be a single line of text.`);
    return null;
  }
  const text = value.trim();
  if (codePointLength(text) < 1 || codePointLength(text) > max) {
    errors.push(`${path} must be 1 to ${max} characters.`);
    return null;
  }
  return text;
}

function sourceById(sources: PublicSource[], id: string): PublicSource | undefined {
  return sources.find((source) => source.id === id);
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function exactKeys(obj: Record<string, unknown>, allowed: string[], errors: string[], path: string) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) errors.push(`${path} has unsupported field ${key}.`);
  }
}

function walkKeys(value: unknown, path: string, errors: string[]) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkKeys(item, `${path}[${index}]`, errors));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) errors.push(`${path}.${key} is not allowed.`);
    walkKeys(child, `${path}.${key}`, errors);
  }
}

function one<T>(value: T | null): T[] {
  return value ? [value] : [];
}

export function reportIsSafeToRender(value: unknown): value is ArtistReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const errors: string[] = [];
  walkKeys(value, 'report', errors);
  if (errors.length) return false;
  const report = value as Partial<ArtistReport>;
  return report.version === 1 && report.audioMeasured === false && report.coverageNote === COVERAGE_NOTE && (report.label === 'fixture' || report.label === 'live') && Array.isArray(report.sections) && Array.isArray(report.graphics) && Array.isArray(report.sources);
}
