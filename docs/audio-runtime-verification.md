# Audio runtime verification

Implementation branch: `feat/musaix-persistent-audio-runtime`.

## Architecture

One hidden media element mounts in the root layout's client provider. `AudioRuntime` owns transport and queue; dock and workspace subscribe to immutable snapshots. URL resolution uses generation tokens and playback-intent cancellation. Local object URLs are revoked on queue removal/clear/provider disposal. Signed sources are never stored in the database. Buffering keeps an accessible Pause action. A successfully loaded renewed source permits renewal after its next independent expiry, while immediately failing renewals stop rather than loop.

Private uploads derive owner from `auth.getUser`, reject caller ownership mismatch, verify WAV/MP3 headers and the 100 MiB bound, upload under `user_id/random_uuid.ext`, and insert the existing track record. A failed insert compensates by removing the object; failed compensation reports its path for cleanup. Format/header checks are not full decoder validation. No fake meters were added.

## Live read-only inspection

Inspected project `xexzplnyzblflucfvbwt`: `musaix_tracks` has RLS with owner-only SELECT/INSERT/UPDATE/DELETE. UPDATE includes USING and WITH CHECK. `musaix-audio` is private, limit 104857600 bytes, and storage policies restrict each CRUD operation to the authenticated user's first folder segment. No schema/policy changes were made.

Supabase changelog checked; TLS deprecation affects legacy clients, not this modern browser runtime. Private-storage and createSignedUrl reference docs consulted before implementing.

## Automated checks

- Vitest: 25 transport, authorization/repository, provider/dock, and original-route tests.
- Typecheck/build: run against Next source and test/config files; unrelated root demo remains preserved.
- Browser: generated actual PCM WAV; verify advancing playback and identical media element across `/audio` → `/studio` → `/canvas`, seek, pause/resume, mute/unmute; mobile validation errors and queue previous/next/removal; desktop framework-overlay check. Browser uses installed headless Chromium; full Chromium process singleton sockets are restricted in this environment.
- Static bundle check for service-role credential usage; browser module imports contain public client only.

## Required live follow-up before production

No signed-in account credentials were available for an actual private upload/download or two-account isolation exercise. Mocked client tests cover denial and cleanup paths; SQL policy inspection is not an end-to-end authorization test. Test user A upload/play, user B deny read/sign, sign-out clearing, and native expired-link recovery in a configured preview. `Bluebird in There 26.wav` was not provided; generated PCM WAV proves browser transport instead. Test Safari/iOS media and volume behavior separately.

## Review

Independent review found two important issues (repeat expiry, Pause during buffering), reproduced by failing tests and fixed. Deferred minor: an older file-validation rejection can overwrite a later file's status text; it cannot replace the active track. The next selection clears this message.

## Final results

- `npm run test:run`: 25 passed, 0 failed.
- `npm run test:e2e`: 3 passed in headless Chromium, desktop 1280×720 and mobile 390×844.
- `npm run typecheck`: passed.
- `npm run build`: passed, all existing routes retained and `/audio` added.
- `npm run lint`: 0 errors; existing Studio unused `index` warning may be emitted by the current rule set.
- `git diff --check`: passed.
- Reviewed desktop and mobile screenshots for layout/overlap; no horizontal overflow on the new mobile workspace. The existing wide Studio design was preserved.
