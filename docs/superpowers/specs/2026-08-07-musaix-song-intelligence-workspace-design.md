# Musaix Song Intelligence Workspace — Design Spec

**Date:** 2026-08-07

## Product Goal

Build the first complete Musaix Pro vertical slice as a balanced, dual-input song intelligence workflow:

`audio + lyrics → synchronized analysis → evidence-backed findings → Alic3X reasoning → executable action cards → re-analysis / verification`

The product should behave like a music intelligence instrument, not a collection of disconnected dashboards.

## Product Principles

1. One song session is the primary unit of work.
2. Audio and lyric intelligence share one transport, one selection model, and one timeline context.
3. Raw measurements and model interpretation are separate layers.
4. Alic3X reasons from scoped evidence packets, not unbounded whole-session prompts.
5. Recommendations become structured actions, not chat-only prose.
6. Layout is fully responsive, retractable, dynamic, and state-preserving.
7. Verification is part of the interaction loop: after a change, Musaix re-measures affected evidence and exposes the delta.

## Core Interaction Loop

`LISTEN → UNDERSTAND → EXPLAIN → MODIFY → HEAR → VERIFY`

Detailed flow:

1. **Ingest** — user supplies both audio and lyrics.
2. **Map** — Musaix creates waveform, timing, section, bar, lyric-alignment, and MIR structures.
3. **Understand** — analyzers compute flow, rhyme, energy, structure, complexity, and other evidence.
4. **Explore** — selecting any waveform region, lyric line, bar, section, metric, or finding updates shared session context.
5. **Reason** — Alic3X receives only the relevant context packet and explains what is happening musically and lyrically.
6. **Act** — recommendations become validated action cards such as inspect, compare, open Flow Lab, generate alternate flow, reanalyze range, and eventually send to Ableton.
7. **Verify** — changed regions are reanalyzed and before/after deltas are surfaced.

## Primary Workspace

The workspace is an adaptive shell around four major surfaces:

`Audio Intelligence ↔ Lyric Intelligence ↔ Alic3X ↔ Actions`

### Top Bar — Session + Transport

Persistent across layouts:

- current song / project
- play / pause / seek
- current timecode
- active section marker
- analysis status
- global command palette
- layout controls: split, focus, collapse, reset

### Audio Intelligence Surface

Primary responsibilities:

- large waveform
- shared playhead
- section boundaries
- energy envelope
- beat / onset markers
- tempo and confidence
- key and confidence
- spectral / MIR overlays
- click-drag time-range selection

### Lyric Intelligence Surface

Primary responsibilities:

- synchronized lyric lines
- bar grouping
- section labels
- rhyme links / scheme visualization
- syllable and stress markers
- flow-density indicators
- complexity / energy annotations
- lyric-line and bar selection

### Alic3X Rail

Retractable right-side reasoning surface with three operating modes:

- **Explain** — interpret the selected evidence.
- **Compare** — compare sections, bars, or versions.
- **Direct** — issue a validated action from current context.

Alic3X responses should be compact, evidence-linked, and operational. Any cited bar, lyric line, section, or time range should be selectable and jump the workspace to that evidence.

### Action Dock

Retractable bottom dock containing structured actions generated from findings.

Each action card exposes:

- finding
- evidence scope
- confidence
- recommendation
- allowed commands
- verification state

Initial command set:

- `OPEN_FLOW_LAB`
- `COMPARE_SECTIONS`
- `GENERATE_ALT_FLOW`
- `REANALYZE_RANGE`
- `SEND_TO_ABLETON` (contract only in this slice; no deep DAW implementation required)

## Responsive and Dynamic Layout

### Wide desktop

Default dual intelligence canvas with Alic3X right rail and Action Dock below. Audio and Lyric panes may resize dynamically (for example 50/50, 70/30, or 30/70) and either may enter full focus mode.

### Narrow desktop / tablet landscape

Primary pane remains dominant. Secondary pane or Alic3X collapses into a rail. Transport stays persistent.

### Tablet portrait / mobile

Surfaces stack behind quick-switch navigation for:

- Audio
- Lyrics
- Alic3X
- Actions

Transport remains permanently accessible.

### State preservation

Layout changes must not destroy:

- playback position
- selected time range
- selected section / bar / lyric line
- scroll position where feasible
- active analysis result
- action state

Interaction model:

`select → focus → analyze → act → collapse → continue`

## Visual System

The visual target is a high-end production instrument rather than a generic AI SaaS dashboard.

Foundation:

- black / charcoal surfaces
- restrained glow
- dense but readable instrumentation
- studio-control-surface hierarchy
- motion used to communicate state transitions

Semantic accents:

- magenta / pink — user intent, lyric intelligence, active controls
- cyan — audio / MIR evidence
- violet — Alic3X reasoning
- amber — uncertainty, caution, low-confidence analysis
- green — verified improvement / successful action

Avoid decorative glow, oversized gradients, and glassmorphism without functional meaning.

## Core Domain Model

```ts
type SongSession = {
  id: string
  audio: AudioAsset
  lyrics: LyricDocument
  alignment: AlignmentMap
  analysis: AnalysisBundle
  findings: Finding[]
  selection: SessionSelection
  actions: ActionRecord[]
}
```

### State boundaries

- **Session state** — persistent song/project data.
- **Playback state** — time, playing, loop, region.
- **Selection state** — selected bar, lyric, section, finding, or time range.
- **UI layout state** — panel widths, collapsed rails, focus mode.

UI layout state remains client-local. Song analysis, findings, and action history are persistent.

## Analysis Pipeline

```text
audio + lyrics
      ↓
audio preprocessing
      ↓
MIR extraction
      ↓
lyric parsing
      ↓
time / section / bar alignment
      ↓
metric analyzers
      ↓
finding generator
      ↓
Alic3X reasoning
      ↓
action objects
```

Measured evidence and interpretation must remain separate.

Example:

```text
Measured:
syllable density = 6.8/sec
energy delta = -23%
rhyme confidence = 0.91

Interpreted:
"Verse 2 loses momentum before the hook."
```

The reasoning layer must never fabricate the raw measurements that underpin a finding.

## Alic3X Context Contract

Alic3X receives a bounded context packet:

```ts
type Alic3XContextPacket = {
  sessionId: string
  selection: SessionSelection
  relevantMetrics: MetricEvidence[]
  nearbyLyrics: LyricExcerpt[]
  relevantFindings: Finding[]
  userIntent: string
}
```

The goal is fast, grounded reasoning from the current musical context rather than repeatedly transmitting an entire song analysis.

## Command Contract

```ts
type MusaixCommand = {
  type:
    | "OPEN_FLOW_LAB"
    | "COMPARE_SECTIONS"
    | "GENERATE_ALT_FLOW"
    | "REANALYZE_RANGE"
    | "SEND_TO_ABLETON"
  payload: Record<string, unknown>
  sourceFindingId?: string
}
```

Alic3X may propose commands, but all executable operations pass through command validation before execution. Free-form chat output must never directly trigger privileged actions.

## Error Handling

The vertical slice should distinguish recoverable product states from hard failures.

Required states:

- missing audio
- missing lyrics
- unsupported / unreadable audio
- analysis pending
- partial analysis available
- alignment failure
- low-confidence alignment
- Alic3X reasoning unavailable
- command validation failure
- reanalysis failure

When analysis is partially available, usable evidence should remain interactive rather than blocking the entire session.

## Testing Strategy

The implementation plan must include automated coverage for:

1. `SongSession` and selection contracts.
2. Shared playback / selection synchronization between Audio and Lyric surfaces.
3. Responsive panel persistence and focus-mode state.
4. Evidence-to-finding generation boundaries.
5. Alic3X context-packet construction.
6. Command validation and rejection of malformed commands.
7. Action-card lifecycle and verification state.
8. Partial-analysis and failure-state rendering.
9. One end-to-end song workflow from dual-input ingestion through action creation and reanalysis.

## Scope of This Vertical Slice

### In scope

- dual-input song session
- synchronized Audio + Lyric workspace
- responsive, retractable, dynamic layout
- shared transport / selection model
- evidence-backed findings
- Alic3X contextual reasoning contract and UI rail
- structured action cards
- command validation layer
- reanalysis and before/after verification state
- Flow Lab entry point
- `SEND_TO_ABLETON` command contract

### Out of scope

- complete Ableton / Max for Live execution engine
- full autonomous multi-agent orchestration
- broad project-history or documentation work
- generalized AI playground
- arbitrary provider-management UI
- large redesign of unrelated repository areas

## Success Criteria

The slice is successful when a user can load one song with both audio and lyrics, inspect synchronized musical and lyrical evidence, select a region or bar, ask Alic3X about that exact context, receive an evidence-backed finding, execute a validated action, and see the affected region reanalyzed with a visible before/after verification delta.
