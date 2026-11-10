# ADR-003: Browser OAuth with Google Identity Services token model

- Status: Accepted
- Date: 2026-11-10 (amended in STY-003: port in `domain/auth/`, codes split, prompt policy)

## Context

The app is static (no backend), so it cannot hold a client secret or refresh tokens. It
needs an OAuth access token with scope `https://www.googleapis.com/auth/spreadsheets`
(full scope chosen deliberately for future editing/duplication).

## Decision

- Use the GIS **token model** (`google.accounts.oauth2.initTokenClient`) loaded from
  `https://accounts.google.com/gsi/client`. Types from `@types/google.accounts`.
- `infrastructure/google-identity/`:
  - `load-gis-script.ts` — idempotent, promise-memoised script loader with timeout and
    clean failure (retry possible after failure).
  - `google-auth-client.ts` — implements the app-level `AuthClient` interface on top of GIS.
    It loads GIS on creation. Each `connect()` then creates a token client for that
    attempt and calls `requestAccessToken()` on it, both synchronously inside the click
    (`initTokenClient` is synchronous). A client per attempt binds Google's callbacks to
    that attempt, so a late response from an abandoned attempt cannot complete a newer one.
  - Only this folder may use the `google` global (ESLint `no-restricted-globals`).
- `domain/auth/auth-client.ts` owns the app-level port, like `RoadmapRepository`
  (STY-003 amendment: infrastructure implements it and must not import `features/`, ADR-002):
  - `AuthClient` interface: `getSnapshot()`, `subscribe()`, `connect()`, `disconnect()`,
    `getAccessToken()`, `reportUnauthenticated()` (called when an API returns 401). Members
    are standalone functions, safe to pass detached.
  - `AuthState` discriminated union: `initializing` | `ready` (not connected) |
    `connecting` | `connected` (with `expiresAt`) | `expired` | `error`. Errors are typed
    **codes**, never English prose — copy is chosen by the UI via i18n (ADR-008):
    - `error` carries a failure code: `script-load-failed`, `access-denied`,
      `scope-not-granted` or `unknown`.
    - `ready` and `expired` may carry a `lastError` cancellation code (`popup-closed`,
      `popup-blocked`) from an abandoned attempt.
      The token itself is **not** part of the snapshot exposed to React.
- `features/auth/` bridges it to React: `AuthProvider` + `useAuth()` via
  `useSyncExternalStore`, plus a fake client for component tests.
- `connect()` is only ever invoked from a user gesture (button click), so the popup is not
  blocked. Prompt policy: `prompt: ''` when reconnecting from `expired`; `prompt: 'consent'`
  after `scope-not-granted` (re-asking for an unticked scope needs it); otherwise GIS's
  default (`select_account`). If GIS failed to load, `connect()` retries the load instead
  and the user clicks again once `ready` (an async load would lose the user gesture).
- Token held in a closure/private field in memory. Never persisted, never logged.
- Expiry: schedule a transition to `expired` 60 s before Google's expiry (`expiresAt`
  already includes this skew; a grant no longer than the skew fails as `unknown`);
  `getAccessToken()` also checks the clock, because timers are throttled in background tabs. Also transition on API 401 via `reportUnauthenticated()`. The UI offers "Reconnect". No
  refresh tokens, no silent background re-auth loops.
- Popup closed / failed to open (`error_callback`) -> back to `expired` (when reconnecting)
  or `ready`, with a `lastError` code; other `error_callback` types and OAuth `error`
  responses -> `error` state (`access_denied` -> `access-denied`, others -> `unknown`).
  Token responses are untrusted and parsed with Zod (`expires_in` is a number at runtime but
  a string in the typings). Also verify the granted scope with
  `google.accounts.oauth2.hasGrantedAllScopes`. Each attempt settles once; callbacks for any
  other attempt (after a cancel, disconnect or dispose) are ignored, and a stale token is not
  revoked, because revocation would also end a newer grant for the same account.
- `disconnect()` revokes the token (`google.accounts.oauth2.revoke`) if one is still held,
  clears memory, and the app removes all auth-scoped query data
  (`queryClient.removeQueries`, wired through the client's `onDisconnect` option).
- We never claim to know who the user is: the token proves authorisation, not identity.
  The header shows "Google connected", not a name or email.

## Consequences

- Users re-consent roughly hourly when the token expires; acceptable for this phase.
- The full spreadsheets scope is sensitive and may require Google OAuth verification for
  external, published apps (documented in README).
