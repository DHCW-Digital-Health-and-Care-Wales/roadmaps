# ADR-0003: Browser OAuth with Google Identity Services token model

- Status: Accepted
- Date: 2026-11-10

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
- `features/auth/` owns the app-level abstraction:
  - `AuthClient` interface: `getSnapshot()`, `subscribe()`, `connect()`, `disconnect()`,
    `getAccessToken()`, `reportUnauthenticated()` (called when an API returns 401).
  - `AuthState` discriminated union: `initializing` | `ready` (not connected) |
    `connecting` | `connected` (with `expiresAt`) | `expired` | `error` (with a typed error
    **code**, e.g. `script-load-failed`, `access-denied`, `scope-not-granted`,
    `popup-closed`, `popup-blocked`, `unknown`; never English prose — copy is chosen by the
    UI via i18n, see ADR-0008).
    The token itself is **not** part of the snapshot exposed to React.
  - `AuthProvider` + `useAuth()` bridge it to React via `useSyncExternalStore`.
- `connect()` is only ever invoked from a user gesture (button click), so the popup is not
  blocked. `prompt: ''` on reconnect is fine; first connect uses default consent.
- Token held in a closure/private field in memory. Never persisted, never logged.
- Expiry: schedule a transition to `expired` at `expiresAt` (minus a small skew); also
  transition on API 401 via `reportUnauthenticated()`. The UI offers "Reconnect". No
  refresh tokens, no silent background re-auth loops.
- Popup closed / failed to open (`error_callback`) -> back to previous non-connected state
  with a `lastError` code; OAuth `error` responses -> `error` state with friendly copy.
  Also verify the granted scope with `google.accounts.oauth2.hasGrantedAllScopes`.
- `disconnect()` revokes the token (`google.accounts.oauth2.revoke`), clears memory, and the
  app removes all auth-scoped query data (`queryClient.removeQueries`).
- We never claim to know who the user is: the token proves authorisation, not identity.
  The header shows "Google connected", not a name or email.

## Consequences

- Users re-consent roughly hourly when the token expires; acceptable for this phase.
- The full spreadsheets scope is sensitive and may require Google OAuth verification for
  external, published apps (documented in README).
