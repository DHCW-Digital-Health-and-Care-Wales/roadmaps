# STY-017: Failures stay on screen, and staff are warned before their session ends

- **Status**: Done — delivered in its PR, which awaits merge
- **Type**: Feature + Copy
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: STY-015 (hard), STY-016 (preferred order)
- **Binding ADRs**: ADR-003, ADR-010, ADR-008
- **Suggested model**: Opus — it changes the auth state machine and the GIS adapter,
  where a misstep blocks the popup or loses the session
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/19

## Summary

When connecting fails, the reason stays on screen where the user can act on it, rather
than in a toast that vanishes. Shortly before a session ends, a DHCW-style warning
counts down and offers to stay connected in one click, without leaving the page or
reloading the roadmaps. Dismissing it leads to today's expired-session flow. This
matters before the editor arrives, where a silent expiry would interrupt work. A spike
with the real Google sign-in comes first. If one-click renewal proves impossible, the
story comes back to the owner rather than shipping a weaker warning unasked.

## Scope

- `domain/auth` and `infrastructure/google-identity`: renewing a session that is still
  connected.
- `features/auth`: the notification policy, plus the warning hook and dialog (shadcn
  `alert-dialog`, Base UI).
- The catalogues, the GIS fakes in `tests/e2e/fixtures` and `createFakeAuthClient`.
- The toast rule in the `copywriter` skill's `references/patterns.md`.
- ADR-003, amended for renewal; ADR-005, amended if Sonner is removed (its Decision
  names `sonner` for toasts).

## Acceptance criteria

### S1: Connection failures stay on screen ✅

**Given** a connect attempt that is denied, lacks the scope, fails unexpectedly or has
its popup blocked, started from the start page and from the header
**When** it fails
**Then** the reason is shown inline as a persistent callout on the page in view, until
the next attempt or a dismissal
**And** no failure is announced only by a toast

### S2: Confirmations follow one rule ✅

**Given** a successful connect and a disconnect
**When** each completes
**Then** its confirmation follows the single rule recorded in the copywriter's patterns,
which future "saved" or "published" confirmations will also follow
**And** if no toast remains, Sonner, its `Toaster` and the test helpers for it are
removed

### S3: A warning before the session ends ✅

**Given** a connected session
**When** it is two minutes from the app's expiry point
**Then** a dialog says the session is about to end, with a countdown in minutes and
seconds, "Stay connected" and "Disconnect"
**And** focus moves into the dialog, and the remaining time is announced at intervals
(each minute, then at 30 seconds), not every second

### S4: Staying connected keeps the page ✅

**Given** the warning is shown over the main page with roadmaps loaded
**When** the user chooses "Stay connected" and the renewal succeeds
**Then** the dialog closes, focus returns to where it was, the session's expiry moves
on, and the roadmaps stay on screen without a reload or a "connecting" flash

### S5: A renewal that fails keeps today's behaviour ✅

**Given** the warning is shown
**When** the renewal popup is closed or blocked, or the renewal is refused
**Then** the dialog closes and the current session continues until it expires
**And** the reason is shown as a callout at the top of the page in view until the next
attempt or expiry, and the expired-session flow with Reconnect takes over at expiry

### S6: Dismissing or returning late ✅

**Given** the warning is shown, or a background tab returns after the warning time
**When** the user dismisses it with Escape or Close, or returns after expiry
**Then** a dismissal leaves the session until it expires, then shows the expired state;
returning after expiry shows the expired state directly
**And** returning in time shows the warning with the right time remaining

### S7: In Welsh ✅

**Given** the user has chosen Cymraeg
**When** the warning and the failure callouts are shown
**Then** every string, and the countdown with its plurals, is Welsh

## Tests

- **Unit:** S4–S6's state machine with fake timers: renewal from connected, and failure
  and cancellation keeping the session.
- **Component:** S3's announcement cadence, focus handling and plurals; S1 and S2.
- **Playwright:** S1 and S4, because they need the fake GIS's gesture check: "Stay
  connected" must call the token request inside the click. Use `page.clock` to reach the
  warning. axe runs with the dialog open, in both themes.

## Decisions

- **D1** (owner, 2026-11-10, analysis decision 7): stop announcing failures by toast,
  and warn before the session ends, as recommended.
- **D2** (agent, 2026-11-10): renewal is `connect()` accepted from `connected`, as a
  `connected → connected` transition with a new `expiresAt`.
  - This avoids a new state that every consumer of `AuthState` would have to handle.
  - It amends ADR-003's state machine; the current client accepts `connect()` only from
    `ready`, `expired` or `error`.
  - A failed renewal is carried as an optional `lastError` on `connected`, typed
    `AuthErrorCode` because a renewal can also be refused, so S5's callout has a source
    without a new state.
  - Today only `ready` and `expired` have a `lastError`, typed `AuthCancellationCode`.
  - A successful renewal is silent: any "connected" confirmation must fire only on the
    transition into `connected`, never on a renewed `connected → connected` snapshot.
    `AuthNotifications` toasts on every new `connected` snapshot today.
- **D3** (agent, 2026-11-10): the spike opens delivery.
  - What to check: with the real GIS in `pnpm dev` (`localhost:5173` is an authorised
    origin), does `requestAccessToken({ prompt: "" })` while a token is valid renew in
    one click, with no consent screen for a user who has already consented?
  - Record the outcome in Delivery.
  - If renewal needs a full consent screen, deliver S1, S2 and S7's callout strings,
    and return the story to `Needs grilling` with S3–S6 as an owner question. Options
    to put: a warning without renewal, or renewal through consent.
- **D4** (agent, 2026-11-10): warn two minutes before the app's expiry point, which
  falls 60 s before Google's. That is long enough to read and act, and short enough not
  to interrupt routine work.
- **D5** (owner, 2026-11-10 ~21:14Z, the D3 spike): one-click renewal works. With the
  real GIS on `localhost:5173`, `requestAccessToken({ prompt: "" })` with a valid token
  renewed in 711 ms (`expires_in` 3599 s, scope granted, a new token); `prompt: "none"`
  behaved the same. A popup flashed for under a second and closed itself, with nothing
  to click and no consent screen. So S1–S7 are delivered with "Stay connected".
- **D6** (agent, 2026-11-10): the S2 rule is "one page notice": every outcome of the
  user's own connect, disconnect or renewal, failure or confirmation, is a callout at the
  top of the page in view (DHCW's notification banner), so Sonner, its `Toaster` and its
  test helpers are removed. A failure lasts as long as the state that carries it (until
  the next attempt or expiry) or a dismissal; a confirmation until the next change of
  state or page, or a dismissal. Recorded in the copywriter's `references/patterns.md`
  ("Page notice") and ADR-005. _Amended by D9: a confirmation also clears itself after a
  dwell._
- **D7** (agent, 2026-11-10): a failure callout is `role="alert"`, now that no toast
  announces the reason; a closed popup (the user's own doing) and a confirmation (the
  connection status announces it) are `role="note"`. This replaces STY-015's `note` for
  the start page's failures.
- **D8** (agent, 2026-11-10): "Stay connected" closes the warning at once, inside the same
  click that starts the renewal; the popup takes over, and the outcome is either a later
  `expiresAt` (silent) or S5's callout. Closing it any way (Stay connected, Disconnect,
  Escape, Close) ends the warning for that session; a renewed session warns again.
- **D9** (owner, 2026-11-10, at PR review; amends D6): confirmations clear themselves;
  failures and the session warning stay exactly as built. A confirmation ("Connected to
  Google", "Disconnected from Google"; a renewal stays silent, D2) clears after a fixed
  dwell of 8 s (`CONFIRMATION_DWELL_MS`), as well as on the next change of state or page
  and on dismissal, which goes beyond D6's "until the next change". The dwell waits while
  the pointer is over the notice or focus is inside it and starts again in full once both
  leave, so nothing is removed from under someone reading or using it (the intent of WCAG
  2.2.1 and 2.2.2). It stays a `note` (polite, not re-announced when it clears), and the
  header's connection status keeps the persistent state. A newer notice replaces it; a
  failure replacing it has no dwell; a confirmation replacing anything starts a full one.
  There is still no toast component.

## Starting point

Audited at `22c3336`.

- **Toasts.** `AuthNotifications` toasts: connected; disconnected; an `error` reached
  from `connecting`; and `popup-blocked`. `StartPage` shows errors and `lastError`
  inline, but only on the start page.
- **E2E.** The `auth.spec.ts` failures table asserts toasts with a `toast` flag.
- **Popup gesture.** `connect()` must run synchronously in the click handler or the
  popup is blocked (STY-003). The fake GIS records a violation when it is called outside
  a gesture.
- **Prompts.** The prompt policy lives in the GIS adapter: `''` from `expired`,
  `consent` after `scope-not-granted`.

## Delivery

### Departures

- **S1, where the callout lives** (agent): one `AuthNotice` (`features/auth`), composed in
  the root route above every page's content, replaces both the start page's own notice
  and the toasts, so a failure started from the header shows on whichever page is in
  view. On the start page it sits where STY-016 put the notice, above the heading.
- **S1, the callout's role** (agent, D7): `alert`, not STY-015's `note`; a closed popup
  stays a `note`.
- **S2** (agent, D6; owner, D9): confirmations are success callouts in the same place
  ("Connected to Google", "Disconnected from Google", the existing copy). A confirmation
  clears itself after its dwell (D9) and on navigation, so it is not carried onto a
  roadmap's page.
- **S3, the Close control** (agent): the dialog has an icon-only Close button (accessible
  name "Close") as well as Escape; DHCW's timeout dialog has neither, only its "stay"
  button.
- **S3, a short grant** (agent): a session that starts with two minutes or less to run (a
  grant of about 180 s or less) shows the warning as soon as it connects. Google grants
  3599 s, so only tests meet it; the one E2E test with a short grant now uses 300 s.
- **S4** (agent, D8): the dialog closes on the click, before the renewal completes.
- **S4, where focus returns** (agent): the warning gives focus back to exactly the element
  that had it when it opened, often `<main>`; Base UI's own return focus would move on to
  the first tabbable control inside it.
- **S6, the clock** (agent): returning to a background tab re-reads the clock in two
  places: the GIS client expires a session whose `expiresAt` has passed (ADR-003
  amendment), and the warning recomputes the time left.
- **S3, a moment reached late** (agent, from review): the live region announces the time
  left as each moment (a whole minute, then 30 s) is reached, so a throttled background
  tab that reaches one late announces the real time, not the moment's.
- **S1, a repeated failure** (agent, from review): each new auth state remounts the
  notice, so the same failure reported again (Google may report a blocked popup inside
  the click) is announced again.
- **S7, the Welsh countdown** (agent, from review): minutes and seconds are joined by a
  comma ("1 munud, 49 eiliad"), since "a"/"ac" depends on how the number is read aloud.
- **New token** (agent): `--overlay` (DHCW's timeout backdrop,
  `--nhsw-timeout-modal-backdrop`) dims the page behind the dialog; it is decorative, so
  it has no contrast pair.
- **TDD** (agent): the GIS adapter's renewal tests, the notice's tests and the warning's
  tests were written first and seen failing (13, 12 and 16 failures). `formatDuration` and
  its test were written together, so they are not TDD evidence.

### Contract for dependents

- `AuthState` `connected` may carry `lastError?: AuthErrorCode` (a failed renewal);
  `connect()` from `connected` renews (ADR-003, STY-017 amendments). The fake auth client's
  `connect` renews too (an hour from now); simulate a failed renewal with `setState`.
- `useAuthNotice()` / `<AuthNotice />` (`features/auth`): the page notice;
  `useNoticeDwell(active, onElapse)` and `CONFIRMATION_DWELL_MS` (`use-notice-dwell.ts`)
  clear a confirmation, paused on hover and focus. A future
  "saved" or "published" confirmation joins it (or a sibling in the same slot), not a
  toast.
- `useSessionWarning()` (`features/auth/use-session-warning.ts`, `SESSION_WARNING_MS` =
  2 min) and `<SessionWarning />`, mounted in `AppProviders`.
- `AlertDialog` (`components/ui/alert-dialog.tsx`), DHCW's timeout dialog; `AlertVariant`
  (`components/ui/alert.tsx`); `formatDuration(seconds, t)` (`@/i18n`).
- Copy: `common.close`, `common.duration.*`, `auth.notice.dismiss`, `auth.renewal.*`,
  `auth.sessionWarning.*`; `layout.notifications` removed. The Welsh is machine-assisted
  and needs a fluent review.
- E2E hooks (en): the notice is `main`'s first `alert` or `note`, with a "Dismiss message"
  button; the warning is the `alertdialog` "Your session is about to end" with "Stay
  connected", "Disconnect" and "Close"; the renewal failure's title is "Couldn't keep you
  connected".

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `src/features/auth/components/auth-notice.test.tsx` ("the page notice (S1…)"); `tests/e2e/auth.spec.ts` (`connecting from the start page/the header fails gracefully when …`, `a failed reconnect from the header shows why over the expired roadmaps`)                                                                                                                                                                                                 |
| S2       | `auth-notice.test.tsx` ("the page notice (S2: confirmations)", and "(S2: confirmations clear themselves)": the dwell, pause on hover and on focus, replacement, a failure never clearing); `tests/e2e/auth.spec.ts` (`a confirmation clears itself; a failure stays`); `src/app/app.test.tsx` (`replaces the previous notice instead of stacking them`); `tests/e2e/auth.spec.ts` (`disconnecting revokes the token…`); Sonner gone from `package.json` |
| S3       | `src/features/auth/components/session-warning.test.tsx` ("the session warning (S3)", the announcement cadence included); `tests/e2e/session-warning.spec.ts` (S3); `tests/e2e/accessibility.spec.ts` (`session warning, then a failed renewal`, both themes)                                                                                                                                                                                            |
| S4       | `src/infrastructure/google-identity/google-auth-client.test.ts` ("renewal"); `session-warning.test.tsx` ("staying connected (S4)"); `tests/e2e/session-warning.spec.ts` (S4: the fake GIS's gesture check, `prompt: ""`, no new reads, no "Connecting…")                                                                                                                                                                                                |
| S5       | `google-auth-client.test.ts` (`keeps the session when …`, `still expires on time after a failed renewal`); `session-warning.test.tsx` (S5); `auth-notice.test.tsx` (S5); `tests/e2e/session-warning.spec.ts` (S5)                                                                                                                                                                                                                                       |
| S6       | `google-auth-client.test.ts` ("returning to the tab"); `session-warning.test.tsx` ("dismissing, or returning late (S6)"); `tests/e2e/session-warning.spec.ts` (S6)                                                                                                                                                                                                                                                                                      |
| S7       | `session-warning.test.tsx` ("the session warning in Welsh (S7)"); `auth-notice.test.tsx` (`is in Welsh (S7)…`); `src/i18n/format-duration.test.ts`                                                                                                                                                                                                                                                                                                      |
| D3       | observed run: the owner's spike with the real GIS (D5)                                                                                                                                                                                                                                                                                                                                                                                                  |
