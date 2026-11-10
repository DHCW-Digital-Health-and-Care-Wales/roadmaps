# STY-003 — Google Identity Services auth abstraction

## Goal

A small, well-tested, framework-agnostic auth client on top of GIS, exposed to React via an
`AuthProvider`/`useAuth` — see ADR-003 for the full design.

## Scope

- `src/domain/auth/auth-client.ts` — `AuthClient` interface + `AuthState` union. (Moved
  from `features/auth/` during delivery: infrastructure implements the port and may not
  import `features/`; see the ADR-002/003 amendments.)
- `src/infrastructure/google-identity/load-gis-script.ts` — memoised loader
  (`https://accounts.google.com/gsi/client`, `async`, `defer`), resolves when
  `window.google?.accounts?.oauth2` exists, rejects on error/timeout, resets memo on failure.
- `src/infrastructure/google-identity/google-auth-client.ts` —
  `createGoogleAuthClient({ clientId, scopes, loadScript?, onDisconnect? })` (delivered as a
  non-empty `scopes` tuple rather than a space-delimited `scope`; no `now`, as Vitest fake
  timers also fake `Date`)
  implementing `AuthClient`:
  - lazily loads GIS on init (state `initializing` -> `ready` or `error`).
  - `connect()` requires `ready|expired|error` and an initialised token client;
    calls `requestAccessToken()` synchronously within the user gesture (so the token
    client must be created before the click — on init).
  - success: verify scope via `hasGrantedAllScopes`; store token + `expiresAt` in private
    memory; schedule expiry timer; state `connected`.
  - `error_callback` (`popup_closed`, `popup_failed_to_open`, `unknown`) and OAuth `error`
    responses (`access_denied`, etc.) -> typed error **codes** (no English prose in state —
    copy is localised in the UI per ADR-008); cancellation returns to the
    previous non-connected state with a `lastError` note instead of a hard error.
  - `getAccessToken()` returns the token only while connected and unexpired.
  - `reportUnauthenticated()` -> `expired`.
  - `disconnect()` -> revoke, clear timer and token, state `ready`.
  - `dispose()` for tests/HMR clears timers and listeners.
  - Never logs tokens.
- `src/features/auth/auth-provider.tsx` + `use-auth.ts` — context with the client,
  `useSyncExternalStore` snapshot, stable action callbacks. Accepts an `AuthClient`
  instance as a prop (DI) so tests pass a fake.
- `src/features/auth/testing/fake-auth-client.ts` — controllable fake for component tests
  (exported for test use only).
- `@types/google.accounts` dev dependency (or minimal local typings if it proves outdated).

## Tests

- Loader: success, script error, timeout, memoisation, retry after failure (jsdom).
- Google auth client with a fake `google.accounts.oauth2` global: initial states, connect
  success, scope not granted, popup closed, OAuth error, expiry timer (fake timers),
  reportUnauthenticated, disconnect revokes and clears, getAccessToken lifecycle, no token
  in snapshot, subscribers notified.
- `AuthProvider`/`useAuth` renders state and invokes actions.

## Out of scope

Header/landing UI (STY-004), query cache clearing wiring (STY-004/STY-005 composition).

## Acceptance criteria

- [x] `features/auth` has no `google` global references; only infrastructure touches GIS.
      (ESLint `no-restricted-globals` with `checkGlobalObject` enforces it outside
      `src/infrastructure/google-identity/`.)
- [x] Tokens never persisted or logged (grep check in review).
- [x] Tests above pass; all checks green.

## Delivery notes

- `AuthClient`/`AuthState` live in `src/domain/auth/auth-client.ts`, not `features/auth/`:
  infrastructure implements the port and may not import `features/` (ADR-002). ADR-002 and
  ADR-003 are amended.
- The token client is created **per attempt**, synchronously inside `connect()`, not once on
  init (see review finding 1). GIS is still loaded on init, so the popup opens within the
  click.
- `SHEETS_SCOPE` (`https://www.googleapis.com/auth/spreadsheets`) is exported from
  `@/infrastructure/google-sheets`; it is not part of `app/config.ts` because it does not
  vary by environment.

## Review notes

Sol review (Codex `gpt-6.1-sol`, high). It confirmed that the synchronous popup call, prompt
values, error categories, scope check and revoke API match the current GIS reference, and
found no issues in token handling, loader cleanup or `useSyncExternalStore` use. All three
findings were fixed:

1. **Major — stale callbacks could complete a newer attempt.** With one shared token
   client, a token from attempt A (abandoned by `disconnect()`) was accepted while attempt B
   was `connecting`, and a late A error could cancel B. Fixed: `connect()` creates a token
   client per attempt (`initTokenClient` is synchronous, so the popup still opens inside the
   click), whose callbacks are bound to that attempt; each attempt settles once and
   disconnect/dispose invalidate it. Stale tokens are dropped, not revoked: revocation ends
   the user's whole grant, including a newer token for the same account. Tests: callbacks
   from an abandoned attempt during a newer one; a second callback for a settled attempt.
2. **Minor — a grant shorter than the 60 s expiry skew published an already-expired
   `connected` state.** Fixed: such a grant fails as `unknown` without publishing
   `connected`. Tests: lifetime equal to the skew, and one second longer.
3. **Minor — the lint guard missed `window.google` / `globalThis.google`.** Fixed:
   `no-restricted-globals` uses `checkGlobalObject: true` (verified with a probe file).
