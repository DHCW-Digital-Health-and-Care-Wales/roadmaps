# STY-017: Failures stay on screen, and staff are warned before their session ends

- **Status**: Proposed — owner approved the recommended approach, 2026-11-10; a spike
  opens delivery (D3)
- **Type**: Feature + Copy
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: STY-015 (hard), STY-016 (preferred order)
- **Binding ADRs**: ADR-003, ADR-010, ADR-008
- **Suggested model**: Opus — it changes the auth state machine and the GIS adapter,
  where a misstep blocks the popup or loses the session

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
- ADR-003, amended for renewal.

## Acceptance criteria

### S1: Connection failures stay on screen

**Given** a connect attempt that is denied, lacks the scope, fails unexpectedly or has
its popup blocked, started from the start page and from the header
**When** it fails
**Then** the reason is shown inline as a persistent callout on the page in view, until
the next attempt or a dismissal
**And** no failure is announced only by a toast

### S2: Confirmations follow one rule

**Given** a successful connect and a disconnect
**When** each completes
**Then** its confirmation follows the single rule recorded in the copywriter's patterns,
which future "saved" or "published" confirmations will also follow
**And** if no toast remains, Sonner, its `Toaster` and the test helpers for it are
removed

### S3: A warning before the session ends

**Given** a connected session
**When** it is two minutes from the app's expiry point
**Then** a dialog says the session is about to end, with a countdown in minutes and
seconds, "Stay connected" and "Disconnect"
**And** focus moves into the dialog, and the remaining time is announced at intervals
(each minute, then at 30 seconds), not every second

### S4: Staying connected keeps the page

**Given** the warning is shown over the main page with roadmaps loaded
**When** the user chooses "Stay connected" and the renewal succeeds
**Then** the dialog closes, focus returns to where it was, the session's expiry moves
on, and the roadmaps stay on screen without a reload or a "connecting" flash

### S5: A renewal that fails keeps today's behaviour

**Given** the warning is shown
**When** the renewal popup is closed or blocked, or the renewal is refused
**Then** the current session continues until it expires, the reason is shown inline, and
the expired-session flow with Reconnect takes over at expiry

### S6: Dismissing or returning late

**Given** the warning is shown, or a background tab returns after the warning time
**When** the user dismisses it with Escape or Close, or returns after expiry
**Then** a dismissal leaves the session until it expires, then shows the expired state;
returning after expiry shows the expired state directly
**And** returning in time shows the warning with the right time remaining

### S7: In Welsh

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

## Starting point

Audited at `22c3336`.

- **Toasts.** `AuthNotifications` toasts: connected; disconnected; an `error` reached
  from `connecting`; and `popup-blocked`. `WelcomeHero` shows errors and `lastError`
  inline, but only on the start page.
- **E2E.** The `auth.spec.ts` failures table asserts toasts with a `toast` flag.
- **Popup gesture.** `connect()` must run synchronously in the click handler or the
  popup is blocked (STY-003). The fake GIS records a violation when it is called outside
  a gesture.
- **Prompts.** The prompt policy lives in the GIS adapter: `''` from `expired`,
  `consent` after `scope-not-granted`.
