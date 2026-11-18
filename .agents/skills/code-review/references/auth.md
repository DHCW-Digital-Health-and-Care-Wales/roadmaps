# Code review lenses: Auth and tokens

Lenses for a diff touching sign-in, the session, the access token or anything that sends it. Apply them in `../SKILL.md`'s
working order, and grade and report findings as it sets.

- **Secrets and tokens (ADR-003).** The access token stays in memory: trace it
  from `getAccessToken()` to the request header and confirm it never reaches
  `localStorage`/`sessionStorage`/IndexedDB/cookies, a URL or hash, query keys
  or cached data, React state or context, an `AppError.message`/`cause`, a log
  or a page notice. `AuthState` carries codes and `expiresAt`, not the token. Only
  non-sensitive preferences (language, theme) are stored. Check new
  `console.*`, error serialisation and `JSON.stringify` of anything holding a
  request. New Sheets/GIS scopes widen the consent screen: they need an ADR
  note and README update.
- **Auth state machine and session end (ADR-003).** Follow every transition
  the change touches: `connect()` from `ready`/`expired`/`error`, abandoned and
  late attempts (each attempt settles once; callbacks of any other attempt are
  ignored), `disconnect()` during `connecting`, the expiry timer firing 60 s
  early versus `getAccessToken()` returning `null` past `expiresAt`,
  `reportUnauthenticated()`, `lastError` codes, prompt policy (`''` from
  `expired`, `consent` after `scope-not-granted`), the script-load retry that
  needs a second click. Check timers and subscriptions are cleaned up and
  `dispose()` is reached (including HMR). A stale token must not be revoked
  (revocation also ends a newer grant for the same account).
- **Popup and user gesture.** `connect()` (and so `requestAccessToken()`) must
  run synchronously inside the click or key handler: any `await`, timeout,
  effect, `setState`-then-effect hop or prior async call before it gets the
  popup blocked. Trace the handler from the event, through wrappers such as
  `useAuth().connect`, `useConnectAction` and `AccountMenu`, to the GIS call.
