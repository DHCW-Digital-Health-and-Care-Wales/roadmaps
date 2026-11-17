# STY-056: A quieter header that keeps a Product Lead's room for roadmaps

- **Status**: Proposed — the owner chose language one click away, the rest in a menu,
  the banner kept and the connection shown only when it needs action (D1–D3)
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-012-app-shell-and-navigation
- **Depends on**: STY-054 (preferred order: its top bar is the header this reshapes)
- **Binding ADRs**: ADR-010, ADR-003, ADR-008
- **Suggested model**: Sonnet — rearranges existing controls; ADR-003's synchronous
  connect is the one trap

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

## Out of scope

- The shell's navigation: STY-054.
