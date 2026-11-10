# S03 — Google Identity Services auth abstraction

## Goal

A small, well-tested, framework-agnostic auth client on top of GIS, exposed to React via an
`AuthProvider`/`useAuth` — see ADR-0003 for the full design.

## Scope

- `src/features/auth/auth-client.ts` — `AuthClient` interface + `AuthState` union.
- `src/infrastructure/google-identity/load-gis-script.ts` — memoised loader
  (`https://accounts.google.com/gsi/client`, `async`, `defer`), resolves when
  `window.google?.accounts?.oauth2` exists, rejects on error/timeout, resets memo on failure.
- `src/infrastructure/google-identity/google-auth-client.ts` —
  `createGoogleAuthClient({ clientId, scope, loadScript? , now?, onDisconnect? })`
  implementing `AuthClient`:
  - lazily loads GIS on init (state `initializing` -> `ready` or `error`).
  - `connect()` requires `ready|expired|error` and an initialised token client;
    calls `requestAccessToken()` synchronously within the user gesture (so the token
    client must be created before the click — on init).
  - success: verify scope via `hasGrantedAllScopes`; store token + `expiresAt` in private
    memory; schedule expiry timer; state `connected`.
  - `error_callback` (`popup_closed`, `popup_failed_to_open`, `unknown`) and OAuth `error`
    responses (`access_denied`, etc.) -> typed error **codes** (no English prose in state —
    copy is localised in the UI per ADR-0008); cancellation returns to the
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

Header/landing UI (S04), query cache clearing wiring (S04/S05 composition).

## Acceptance criteria

- [ ] `features/auth` has no `google` global references; only infrastructure touches GIS.
- [ ] Tokens never persisted or logged (grep check in review).
- [ ] Tests above pass; all checks green.
