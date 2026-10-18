# Audio runtime implementation record
Plan: uploaded musaix-foundation-audio-runtime-plan.md.
The named in-chat player spec is unavailable; the repository Song Intelligence Workspace design is supporting context. The uploaded plan and user approval govern this foundation.

Preflight:
- Task 2 → 3/5: extend transport interface with setMuted, enqueue, remove, clear and select (atomic load + play); otherwise mute/queue consumers have no producer.
- Task 2 → 4: private tracks need a renewable source resolver and expiry, rather than persisting signed URLs.
- Tasks 1 → 5: install a real browser test runner; route component tests alone cannot prove persistent playback.
- Task 4 → 6: use live verified columns and owner-folder policies; no migration is necessary.
Ruling: isolated fresh clone on feature branch, no second worktree needed; cost if wrong: relocate checkout.
Ruling: accept WAV and MP3 up to existing 100 MiB bucket limit with header/type validation; cost if wrong: expand formats in later milestone.
Ruling: no private audio fixture or user credentials are committed; generated WAV proves browser transport, real named fixture/two-account checks remain separately reported if unavailable.

Baseline: the original unpinned Tailwind dependency resolved to v4 while the repository uses v3 directives/PostCSS configuration. Pinned compatible Tailwind v3.4.19 and all package versions with a lockfile. Original typecheck also included an unrelated standalone AI Studio demo needing uninstalled packages; scoped Next typechecking to src/config/e2e without deleting demo files.
Transport/repository/component verification: 22 tests pass, including existing Studio and Canvas render tests.
Production build: passes with /audio, /studio, /canvas and existing API route.
Browser route: local Browser js tool is not exposed; plan explicitly specifies Playwright regression tests, using that authorized CLI workflow. Latest Playwright browser archive was unavailable/truncated; using a pinned available stable browser/test pairing.

Independent review: two important issues fixed in one pass with failing regression tests first: second independent signed URL expiry now renews again after metadata success; playback intent is separate so Pause remains available during buffering/pending autoplay. Unit suite 25 tests.
Deferred minor: stale validation failure can replace a later selection's status text; selection/playback itself stays protected by generation checks.
Browser correction: full Chromium fails on process singleton sockets; installed headless shell runs successfully. First browser run: cross-route playback and desktop rendering passed; mobile had a strict locator collision with Next's own alert, narrowed to app message.
Final: fixed repeat expiry — regression RED (resolver count 2 instead of 3) → GREEN; fixed buffering Pause — regression RED (Pause absent) → GREEN. Suite 25/25.
Final: browser tests 3/3 pass (real PCM playback across routes, mobile invalid-file/queue controls, desktop render). Typecheck/build pass. No merge or production deployment performed.
