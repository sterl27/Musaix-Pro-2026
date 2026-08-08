# Musaix Song Intelligence Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one complete dual-input Musaix workflow: audio + lyrics → synchronized analysis → Alic3X reasoning → validated action → reanalysis with visible verification delta.

**Architecture:** Extend the existing Next.js App Router project rather than replacing it. Introduce a typed song-session domain model, a client-side workspace shell with shared playback/selection/layout state, a thin analysis adapter over the existing audio-analysis stack, a bounded Alic3X context contract, and a typed command/action layer. Keep measured evidence separate from model interpretation and preserve the existing Canvas/Hermes work outside this slice.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Lucide, Supabase, Vercel AI SDK, existing Python/FastAPI audio-analysis service, Vitest + React Testing Library, Playwright.

## Global Constraints

- One `SongSession` is the primary unit of work.
- Audio and lyrics are required together for the first vertical slice.
- Audio and lyric surfaces share one transport, playhead, selection model, and timeline context.
- Raw metrics and AI interpretation remain separate layers.
- Alic3X receives bounded context packets, not unbounded whole-session prompts.
- Free-form model output never executes privileged actions directly.
- Layout must be responsive, retractable, dynamic, and state-preserving.
- `SEND_TO_ABLETON` is contract-only in this slice; do not build the full Ableton/M4L executor.
- Do not redesign unrelated Canvas, architecture, or Hermes Observatory surfaces.
- Preserve the black/charcoal production-instrument visual language with semantic magenta, cyan, violet, amber, and green accents.

---

## File Structure

### Create
- `src/lib/song-intelligence/types.ts` — domain contracts for session, evidence, findings, commands, action records.
- `src/lib/song-intelligence/session-reducer.ts` — deterministic session/selection/playback state transitions.
- `src/lib/song-intelligence/context.ts` — bounded Alic3X context-packet builder.
- `src/lib/song-intelligence/commands.ts` — command schemas and validation.
- `src/lib/song-intelligence/findings.ts` — evidence-to-finding generation helpers.
- `src/components/song-intelligence/studio-shell.tsx` — adaptive workspace shell.
- `src/components/song-intelligence/session-transport.tsx` — persistent transport/header.
- `src/components/song-intelligence/audio-intelligence.tsx` — audio evidence surface.
- `src/components/song-intelligence/lyric-intelligence.tsx` — lyric/bar evidence surface.
- `src/components/song-intelligence/alic3x-rail.tsx` — contextual reasoning rail.
- `src/components/song-intelligence/action-dock.tsx` — structured action cards and verification state.
- `src/components/song-intelligence/ingest-panel.tsx` — dual-input gate.
- `src/app/api/alic3x/route.ts` — AI SDK streaming endpoint accepting only bounded context packets.
- `src/app/api/song-intelligence/reanalyze/route.ts` — range reanalysis adapter.
- `src/app/studio/song-intelligence/page.tsx` — vertical-slice route.
- `tests/song-intelligence/session-reducer.test.ts`
- `tests/song-intelligence/context.test.ts`
- `tests/song-intelligence/commands.test.ts`
- `tests/song-intelligence/findings.test.ts`
- `tests/song-intelligence/workspace.test.tsx`
- `e2e/song-intelligence.spec.ts`
- `vitest.config.ts`
- `playwright.config.ts`

### Modify
- `package.json` — add test scripts and test dependencies.
- `src/app/studio/page.tsx` — add a clear entry point to Song Intelligence without rewriting the current Audioweaver surface.
- `src/app/globals.css` — add only reusable workspace tokens/utilities needed by the new surface.

---

### Task 1: Test Harness + Song Intelligence Domain Contracts

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/song-intelligence/types.ts`
- Test: `tests/song-intelligence/session-reducer.test.ts`

**Interfaces:**
- Produces: `SongSession`, `SessionSelection`, `PlaybackState`, `MetricEvidence`, `Finding`, `MusaixCommand`, `ActionRecord`, `VerificationDelta`.

- [ ] **Step 1: Add Vitest and React Testing Library dependencies/scripts**

Add scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

Add dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`.

- [ ] **Step 2: Create the failing contract test**

```ts
import { describe, expect, it } from 'vitest'
import type { SongSession } from '../../src/lib/song-intelligence/types'

describe('SongSession contract', () => {
  it('requires audio, lyrics, alignment, analysis, findings, selection and actions', () => {
    const session = {
      id: 'session-1',
      audio: { id: 'audio-1', name: 'demo.wav', durationSec: 180, url: '/demo.wav' },
      lyrics: { id: 'lyrics-1', raw: 'line one', lines: [] },
      alignment: { status: 'pending', confidence: 0, bars: [], sections: [] },
      analysis: { status: 'pending', metrics: [] },
      findings: [],
      selection: { kind: 'none' },
      actions: [],
    } satisfies SongSession

    expect(session.id).toBe('session-1')
  })
})
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npm test -- tests/song-intelligence/session-reducer.test.ts`
Expected: FAIL because `src/lib/song-intelligence/types.ts` does not exist.

- [ ] **Step 4: Implement the domain types**

Define exact discriminated unions for selection and action status. Minimum contracts:

```ts
export type SessionSelection =
  | { kind: 'none' }
  | { kind: 'time-range'; startSec: number; endSec: number }
  | { kind: 'bar'; barId: string; startSec: number; endSec: number }
  | { kind: 'lyric-line'; lineId: string; startSec?: number; endSec?: number }
  | { kind: 'section'; sectionId: string; startSec: number; endSec: number }
  | { kind: 'finding'; findingId: string }

export type MusaixCommandType =
  | 'OPEN_FLOW_LAB'
  | 'COMPARE_SECTIONS'
  | 'GENERATE_ALT_FLOW'
  | 'REANALYZE_RANGE'
  | 'SEND_TO_ABLETON'
```

Include confidence as `number` in the `0..1` range at runtime validation boundaries.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/song-intelligence/session-reducer.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts src/lib/song-intelligence/types.ts tests/song-intelligence/session-reducer.test.ts
git commit -m "feat: add song intelligence domain contracts"
```

---

### Task 2: Shared Session, Playback, Selection, and Layout State

**Files:**
- Create: `src/lib/song-intelligence/session-reducer.ts`
- Expand test: `tests/song-intelligence/session-reducer.test.ts`

**Interfaces:**
- Consumes: `SongSession`, `SessionSelection`, `PlaybackState`.
- Produces: `WorkspaceState`, `WorkspaceAction`, `workspaceReducer(state, action)`.

- [ ] **Step 1: Write reducer tests for synchronized state**

Cover these exact transitions:
- `SET_PLAYBACK_TIME` changes only current time.
- `SELECT_BAR` updates selection and seeks playback to bar start.
- `SELECT_TIME_RANGE` updates selection without clearing analysis.
- `TOGGLE_ALIC3X` does not change selection/playback.
- `SET_SPLIT_RATIO` clamps ratio to `0.25..0.75`.
- `ENTER_FOCUS_MODE` preserves previous split ratio.
- `EXIT_FOCUS_MODE` restores previous layout state.

- [ ] **Step 2: Run failing reducer tests**

Run: `npm test -- tests/song-intelligence/session-reducer.test.ts`
Expected: FAIL because reducer exports do not exist.

- [ ] **Step 3: Implement deterministic reducer**

Use a reducer rather than multiple unrelated `useState` calls so Audio, Lyrics, Alic3X, and Actions share one source of truth. Do not persist `isPlaying`; persist only layout preferences to local storage later in the shell.

- [ ] **Step 4: Run reducer tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/song-intelligence/session-reducer.ts tests/song-intelligence/session-reducer.test.ts
git commit -m "feat: add synchronized song workspace state"
```

---

### Task 3: Evidence, Findings, Alic3X Context, and Command Validation

**Files:**
- Create: `src/lib/song-intelligence/findings.ts`
- Create: `src/lib/song-intelligence/context.ts`
- Create: `src/lib/song-intelligence/commands.ts`
- Test: `tests/song-intelligence/findings.test.ts`
- Test: `tests/song-intelligence/context.test.ts`
- Test: `tests/song-intelligence/commands.test.ts`

**Interfaces:**
- Produces: `generateFindings(metrics)`, `buildAlic3XContext(session, intent)`, `validateMusaixCommand(input)`.

- [ ] **Step 1: Write finding-boundary tests**

Test that measured evidence remains attached to a finding and generated prose cannot overwrite metric values.

Example fixture:

```ts
const metrics = [
  { id: 'm1', type: 'syllable-density', value: 6.8, unit: 'syllables/sec', scope: { startSec: 32, endSec: 36 } },
  { id: 'm2', type: 'energy-delta', value: -0.23, unit: 'ratio', scope: { startSec: 32, endSec: 36 } },
]
```

Expected finding references `m1` and `m2` by id.

- [ ] **Step 2: Write Alic3X context tests**

Verify a selected bar includes only:
- session id
- selected bar scope
- metrics intersecting that bar
- nearby aligned lyric lines
- findings intersecting that bar
- current user intent

Verify unrelated full-song metrics are excluded.

- [ ] **Step 3: Write command validation tests**

Accept:

```ts
{ type: 'REANALYZE_RANGE', payload: { startSec: 32, endSec: 36 }, sourceFindingId: 'f1' }
```

Reject:
- unknown command type
- missing payload
- `startSec >= endSec` for `REANALYZE_RANGE`
- malformed `SEND_TO_ABLETON` payload
- commands containing arbitrary executable code fields

- [ ] **Step 4: Run tests and verify failure**

Run: `npm test -- tests/song-intelligence/findings.test.ts tests/song-intelligence/context.test.ts tests/song-intelligence/commands.test.ts`
Expected: FAIL because implementations do not exist.

- [ ] **Step 5: Implement minimal pure functions**

Use explicit switch-based validation; do not add a schema dependency unless implementation shows clear benefit. `SEND_TO_ABLETON` must validate to a no-op contract object in this slice.

- [ ] **Step 6: Run tests**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/song-intelligence tests/song-intelligence
git commit -m "feat: add evidence context and command validation"
```

---

### Task 4: Dual-Input Ingestion + Adaptive Workspace Shell

**Files:**
- Create: `src/components/song-intelligence/ingest-panel.tsx`
- Create: `src/components/song-intelligence/studio-shell.tsx`
- Create: `src/components/song-intelligence/session-transport.tsx`
- Create: `src/app/studio/song-intelligence/page.tsx`
- Modify: `src/app/studio/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/song-intelligence/workspace.test.tsx`

**Interfaces:**
- Consumes: `WorkspaceState`, `workspaceReducer`.
- Produces: visible workspace route and dual-input gate.

- [ ] **Step 1: Write UI tests for ingestion and panel persistence**

Test:
- Continue button disabled until both audio and lyrics are supplied.
- Once initialized, transport is visible.
- Toggling Alic3X/action panels does not clear selected bar/time.
- Focus mode keeps transport visible.
- Mobile quick-switch shows Audio / Lyrics / Alic3X / Actions controls.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/song-intelligence/workspace.test.tsx`
Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement the adaptive shell**

Desktop structure:

```text
Top transport
┌───────────────┬───────────────┬───────────┐
│ Audio         │ Lyrics        │ Alic3X    │
└───────────────┴───────────────┴───────────┘
Action dock
```

Use CSS grid and client state for split ratio. Do not add a heavyweight docking library in this slice.

- [ ] **Step 4: Add responsive behavior**

Breakpoints:
- `>= 1280px`: dual canvas + optional Alic3X rail.
- `768..1279px`: dominant pane + collapsible secondary rail.
- `< 768px`: one active surface at a time, persistent transport.

Persist only `splitRatio`, `alic3xOpen`, `actionDockOpen`, and preferred mobile surface to `localStorage`.

- [ ] **Step 5: Add Studio entry point**

Add a clearly labeled `Song Intelligence` link/button from the existing `/studio` surface; do not replace the existing Audioweaver page.

- [ ] **Step 6: Run component tests**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/song-intelligence src/app/studio src/app/globals.css tests/song-intelligence/workspace.test.tsx
git commit -m "feat: add adaptive song intelligence workspace"
```

---

### Task 5: Synchronized Audio + Lyric Intelligence Surfaces

**Files:**
- Create: `src/components/song-intelligence/audio-intelligence.tsx`
- Create: `src/components/song-intelligence/lyric-intelligence.tsx`
- Modify: `src/components/song-intelligence/studio-shell.tsx`
- Expand: `tests/song-intelligence/workspace.test.tsx`

**Interfaces:**
- Consumes: shared playback time, selection, alignment bars/sections, analysis metrics.
- Produces: synchronized visual selection events.

- [ ] **Step 1: Add synchronization tests**

Verify:
- selecting a lyric bar dispatches `SELECT_BAR` and audio surface receives matching selected interval.
- selecting an audio range marks overlapping lyric lines.
- changing playback time moves the active lyric state.
- low-confidence alignment displays amber uncertainty state rather than blocking the session.

- [ ] **Step 2: Run failing tests**

Expected: FAIL.

- [ ] **Step 3: Implement Audio Intelligence surface**

For this slice use a lightweight waveform representation driven by normalized peak arrays from analysis data. Include:
- playhead
- selected region
- section markers
- beat/onset markers
- energy envelope toggle
- tempo/key/confidence readouts

Avoid adding a large waveform dependency until existing audio-analysis output is verified insufficient.

- [ ] **Step 4: Implement Lyric Intelligence surface**

Render aligned lines/bars with:
- section labels
- active playback line
- selected bar
- rhyme labels
- syllable density
- flow/energy annotations
- click-to-select behavior

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/song-intelligence tests/song-intelligence/workspace.test.tsx
git commit -m "feat: synchronize audio and lyric intelligence surfaces"
```

---

### Task 6: Alic3X Streaming Rail + Structured Action Dock

**Files:**
- Create: `src/app/api/alic3x/route.ts`
- Create: `src/components/song-intelligence/alic3x-rail.tsx`
- Create: `src/components/song-intelligence/action-dock.tsx`
- Modify: `src/components/song-intelligence/studio-shell.tsx`
- Expand: `tests/song-intelligence/workspace.test.tsx`

**Interfaces:**
- API consumes: `Alic3XContextPacket` only.
- API produces: streamed reasoning text + optional validated command proposal envelope.
- Action Dock consumes: `Finding[]`, `ActionRecord[]`, validated `MusaixCommand`.

- [ ] **Step 1: Write UI tests for grounded reasoning and action lifecycle**

Test that:
- current selection scope is shown in Alic3X rail.
- evidence references are clickable.
- an unvalidated command proposal is rendered as non-executable.
- a valid `REANALYZE_RANGE` action can enter `queued → running → verified|failed` lifecycle.

- [ ] **Step 2: Implement AI route**

Use the installed `ai` package and Vercel AI SDK streaming. The route must reject requests that contain whole raw audio, arbitrary source code, or a context payload outside `Alic3XContextPacket` shape.

System behavior: distinguish measured evidence from interpretation, cite metric ids in the response payload, and emit command proposals separately from prose.

- [ ] **Step 3: Implement Alic3X rail**

Modes: `Explain`, `Compare`, `Direct`. Keep the initial UI operational and compact; no generalized provider playground.

- [ ] **Step 4: Implement Action Dock**

Each card shows finding, evidence scope, confidence, recommendation, allowed commands, and verification state. Color semantics: magenta lyric/user intent, cyan audio evidence, violet Alic3X, amber uncertainty, green verified.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/song-intelligence/workspace.test.tsx tests/song-intelligence/context.test.ts tests/song-intelligence/commands.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/alic3x src/components/song-intelligence tests/song-intelligence
git commit -m "feat: add Alic3X reasoning rail and action dock"
```

---

### Task 7: Reanalysis + Verification Delta

**Files:**
- Create: `src/app/api/song-intelligence/reanalyze/route.ts`
- Modify: `src/components/song-intelligence/action-dock.tsx`
- Modify: `src/lib/song-intelligence/types.ts`
- Test: `tests/song-intelligence/findings.test.ts`
- Test: `tests/song-intelligence/workspace.test.tsx`

**Interfaces:**
- Consumes: validated `REANALYZE_RANGE` command.
- Produces: `VerificationDelta` containing `before`, `after`, `changedMetricIds`, and `status`.

- [ ] **Step 1: Write verification tests**

Given before metrics and after metrics, verify the delta preserves both snapshots and reports only changed metric ids. A failed analysis must preserve the prior evidence and mark verification `failed` instead of deleting the action.

- [ ] **Step 2: Implement reanalysis adapter**

The API route forwards only the requested time range/session reference to the existing analysis service contract. Do not duplicate MIR algorithms in Next.js.

- [ ] **Step 3: Render before/after delta**

Action card should display a compact metric comparison and green verified state only after successful reanalysis.

- [ ] **Step 4: Run tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/song-intelligence src/components/song-intelligence src/lib/song-intelligence tests/song-intelligence
git commit -m "feat: add reanalysis verification loop"
```

---

### Task 8: End-to-End Vertical Slice + Failure States

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/song-intelligence.spec.ts`
- Modify components as required by failing E2E assertions only.

**Interfaces:**
- Validates the complete user workflow.

- [ ] **Step 1: Write the E2E happy-path test**

Scenario:
1. Open `/studio/song-intelligence`.
2. Attach a deterministic audio fixture and lyric fixture.
3. Start session.
4. Verify waveform and lyric bars render.
5. Select a bar.
6. Open Alic3X and submit `Why does this section lose momentum?`.
7. Verify response cites evidence in the selected scope.
8. Execute a valid `REANALYZE_RANGE` action.
9. Verify action transitions to `verified` and shows before/after values.

- [ ] **Step 2: Add failure-state coverage**

Cover:
- missing audio
- missing lyrics
- unsupported audio
- partial analysis
- alignment failure
- low-confidence alignment
- Alic3X unavailable
- command validation rejection
- reanalysis failure

- [ ] **Step 3: Run E2E**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 4: Run full verification suite**

Run:

```bash
npm test
npm run build
npm run test:e2e
```

Expected: all tests PASS; Next.js production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e src
 git commit -m "test: verify song intelligence vertical slice"
```

---

## Final Review Gate

Before opening a PR:

- Verify no raw metric values are generated by Alic3X prose.
- Verify every executable action passes `validateMusaixCommand`.
- Verify panel collapse/focus changes never reset playback or selection.
- Verify mobile transport remains accessible.
- Verify existing `/studio`, `/canvas`, `/architecture`, and Hermes-related functionality still build.
- Verify no full Ableton executor was accidentally introduced.
- Verify production build and E2E tests pass.

## Recommended Execution Order

`Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`

Tasks 1–3 establish contracts; Tasks 4–5 establish the instrument surface; Task 6 adds agent reasoning/actions; Task 7 closes the verification loop; Task 8 validates the entire product slice.
