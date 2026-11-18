# STY-056: A quieter header that keeps a Product Lead's room for roadmaps

- **Status**: Done — the header keeps the language one click away and holds the theme
  and the session's action in an account menu; the connection chip and the "Connected
  to Google" notice are gone (D1–D3)
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-012-app-shell-and-navigation
- **Depends on**: STY-054 (preferred order: its top bar is the header this reshapes)
- **Binding ADRs**: ADR-010, ADR-003, ADR-008
- **Suggested model**: Sonnet — rearranges existing controls; ADR-003's synchronous
  connect is the one trap
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/147

## Summary

About 130px of every desktop screen goes to the header and phase banner, which hold
"Google connected", the language switcher, the theme toggle and Disconnect; after
connecting, a "Connected to Google" notice adds about 50px more. The persona says
sign-in is plumbing. This story keeps the language one click away, folds theme and
Disconnect into one menu, and shows the connection only when it needs action, so more
of each screen is roadmap. The phase banner stays, scrolling away with the page.

## Acceptance criteria

### S1: Connection shown only when it needs action

**Given** a Product Lead connected, with a live session
**When** they look at the header
**Then** it shows no connection chip, and no "Connected to Google" notice follows a
connect
**And** an expiring or expired session still shows its warning and Reconnect

### S2: One menu for the rest

**Given** the header
**When** the Product Lead opens its menu
**Then** it offers the language, the theme and Disconnect, each working as today

### S3: Connect still opens Google's popup

**Given** not connected
**When** the Product Lead chooses Connect, wherever it now is
**Then** Google's popup opens (ADR-003)

### S4: Phone and Welsh

**Given** a 375px phone in Cymraeg
**When** the Product Lead looks at the header
**Then** the service name and the menu fit without truncating either

## Decisions

- **D1** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q1 with (a)): the language stays one
  click away; theme and Disconnect go into an account menu. Changes: S2 (the menu
  offers the theme and Disconnect; the language sits beside it).
- **D2** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q2 with none of the options): DHCW's
  phase banner stays as it is and scrolls out of view with the page, never pinned
  (STY-054 D7). No ADR-010 amendment for it.
- **D3** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q3 with (a)): the "Google connected"
  chip and the "Connected to Google" notice both go; an expiring or expired session
  still warns and offers Reconnect, and a failed or refused connect still says so (S1).

- **D4** (agent, 2026-11-18): Connect and Reconnect sit in the account menu, where
  Disconnect sits while connected, over a header Connect button: that button would
  unmount when the connect worked and take keyboard focus with it, and every page that
  needs a session already offers its own. Changes: S3 (the menu's item is "wherever it
  now is"); `connect()` runs in the item's click (ADR-003).
- **D5** (agent, 2026-11-18): the state stays as a live region visible to no one
  (`ConnectionStatus`), over dropping it with the chip: a screen reader would otherwise
  hear nothing of a connect, an expiry or a failed connect, which the chip announced.
  Changes: S1 (nothing shows; the announcement stays).
- **D6** (agent, 2026-11-18): "Disconnected from Google" stays, over D3's reading as
  every confirmation: D3 names the connect's notice, and a disconnect shows nothing else
  now that the chip no longer turns to "Not connected". Changes: S1 for a connect only.
- **D7** (agent, 2026-11-18): the menu is named "Account", from D1's wording, with a
  person-in-a-circle icon over a gear: the app never names who is connected, but the
  menu holds the session's action; "Cyfrif" in Cymraeg.
- **D8** (owner, 2026-11-18, review of STY-065's prototype; delivered by
  [STY-065](../EPC-015-a-quieter-roadmap-page-top/STY-065-a-roadmaps-page-top-reads-at-a-glance.md)): the phase
  banner can be dismissed until the app is next loaded, and ADR-010 gains an amendment
  for it. Changes D2, which left the banner as it was with no amendment.

## Out of scope

- The shell's navigation: STY-054.

## Delivery

### Departures

- **The theme item is a menu item, not a toggle button** (agent, D1): "Switch to dark
  theme" / "Switch to light theme" keep their copy; choosing one closes the menu, which
  hands focus back to the account button.
- **A service name on one line at every width** (agent, S4): with the chip, theme button
  and Disconnect gone the name fits one line in both languages from 375px, where STY-054
  allowed two until this story; `tests/e2e/shell.spec.ts` holds one.
- **`AuthButton` became `ConnectButton`** (agent, review round 1): its Disconnect branch
  and `variant="header"` served only the deleted header button, so it is the pages'
  Connect alone.
- **The top bar is no longer a size container** (agent): its only user was the chip's
  `@max-5xl:` variant.

### Contract for dependents

- **`AccountMenu`** (`features/auth/components/`) holds `ThemeMenuItem`
  (`components/theme/`) and one session item: Disconnect while connected (run once the
  menu has closed, since it may ask a question), Connect, or Reconnect after expiry
  (calls `connect()` in the click; waiting, disabled, while the session loads or connects).
  `ThemeToggle` and `HeaderAuthButton` are gone. `AuthButton`, now only the pages'
  Connect, is `ConnectButton`; it and the menu's item share `useConnectAction` (label,
  busy, `connect`).
- **`ConnectionStatus`** is `role="status"` with `sr-only`, in the header, for assistive
  technology only.
- **`auth.notifications.connected` is gone**; the notice hook confirms a disconnect only.
  New copy: `layout.account` ("Account", "Cyfrif").
- **Tests**: `chooseFromAccountMenu` and `disconnectFromHeader` for component tests
  (`features/auth/testing/account-menu.ts`) and E2E (`fixtures/account-menu.ts`); the
  account menu has aria snapshots (`account-menu-signed-out`, `account-menu-connected`).
  `holdConnectedNotice` is gone with the notice.
- **Data source**: nothing written changes.

### Scenario evidence

`am` is `src/features/auth/components/account-menu.test.tsx`; `app` is
`src/app/app.test.tsx`; `e2e` names a spec in `tests/e2e/`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | `connection-status.test.tsx` (each state announced, `sr-only`); app "announces the … auth state, shows nothing of it"; `auth-notice.test.tsx` "confirms disconnecting … but not connecting"; e2e `auth.spec.ts` "connecting shows no notice…" and `shell.spec.ts` (no chip, no header Connect or Disconnect); `session-warning.spec.ts` (the warning is as before) |
| S2       | `am` "offers the theme and Disconnect while connected"; app "holds the theme and the session's action in one menu, with the language beside it"; `theme-menu-item.test.tsx`; e2e `preferences.spec.ts`, `structure.spec.ts` "the account menu, open", `focus-indicator.spec.ts` (the trigger and its items take DHCW's fill)                                       |
| S3       | `am` "offers Connect in place of Disconnect…" (calls `connect()` once, in the click) and "waits while the session is…"; app "connects from the account menu, which keeps focus"; e2e `auth.spec.ts` "connecting from the account menu…" (the fake GIS records a popup outside a gesture as a violation); `landing.spec.ts`                                         |
| S4       | e2e `shell.spec.ts` "the service name shows untruncated … at 375px" etc., in Cymraeg, on one line with no sideways scroll; `am` "is in Welsh"; the 375px Cymraeg captures                                                                                                                                                                                          |

These followed working code, each shown red by breaking it: confirming a connect again
fails the two notice tests; leaving out the item's `connect` fails four of `am` and app;
showing the status again fails `connection-status.test.tsx` and the six app header
tests. The E2E full run passed except `focus-indicator.spec.ts`'s item-dialog tour
(STY-044), which failed once under load and passed twice alone.
