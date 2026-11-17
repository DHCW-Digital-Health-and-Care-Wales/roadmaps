# STY-054: A Product Lead moves between roadmaps, and to families, from the shell

- **Status**: Proposed — the owner chose DHCW's dashboard shell (D2–D8); its delivery
  amends ADR-010
- **Type**: Feature + Docs
- **Area**: Features/UI + Routing + i18n (en + cy) + E2E + Docs
- **Epic**: EPC-012-app-shell-and-navigation
- **Depends on**: STY-052 (preferred order: its phone menu button sits in STY-052's
  sticky strip, D8)
- **Binding ADRs**: ADR-010 _Deferred: the dashboard shell_, ADR-004, ADR-008, ADR-002
- **Suggested model**: Opus — a shell-wide layout change, an ADR amendment and
  focus on navigation

## Summary

The shell has no navigation: a roadmap's page has only "Back to roadmaps", and the
families page is linked only from under the list's heading. A Product Lead who leads
several products switches roadmaps in three steps. ADR-010 deferred DHCW's dashboard
shell (navy left-hand navigation, a top bar of chips) until a second destination or the
editor existed; both do. This story gives the shell navigation to every roadmap and to
families, categories and organisations, so switching takes one step: the owner chose
the dashboard shell, collapsible on a desktop and a drawer on a phone.

## Acceptance criteria

### S1: Any roadmap in one step

**Given** a Product Lead on Product A's page, connected
**When** they choose Product B from the shell's navigation
**Then** Product B's page opens, and focus moves to it as on any navigation

### S2: Families from anywhere

**Given** any page, connected
**When** the Product Lead chooses "Families, categories and organisations" from the
shell's navigation
**Then** the families page opens

### S3: Where the Product Lead is

**Given** Product A's page
**When** the Product Lead looks at the navigation
**Then** Product A is marked as the current page, to sight and to a screen reader

### S4: Before connecting, and when the list can't be read

**Given** not connected, or a roadmap list that failed to load
**When** the Product Lead looks at the navigation
**Then** it offers what it can without the list, and nothing that would fail

### S5: Phone

**Given** a 375px phone
**When** the Product Lead opens the navigation
**Then** it opens over the page, traps and returns focus as a dialog does, and fits in
Cymraeg

### S6: Pending changes are kept

**Given** pending changes on Product A
**When** the Product Lead switches to Product B and back
**Then** Product A's pending changes are still there, as today

## Decisions

- **D1** (owner, 2026-11-17, EPC-012 UX prototypes grilling round 2, Q9): this
  story's design considers a side rail of a roadmap's placements beside its
  navigation, the option STY-053 D4 left out of STY-053's prototypes.
- **D2** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q1 with (a)): DHCW's dashboard
  shell: a navy left-hand navigation listing the roadmaps, each with its family
  colour, and "Families, categories and organisations"; a top bar holding the
  header's controls (STY-056); a drawer on a phone. Its delivery amends ADR-010's
  _Deferred: the dashboard shell_. Lost: a breadcrumb switcher.
- **D3** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q2 with (a)): roadmaps are grouped
  by family, as the roadmap list groups them.
- **D4** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q3 with (a)): the roadmap list
  stays the home page.
- **D5** (owner, 2026-11-17, EPC-012 grilling round 3): on a desktop the navigation folds to a narrow
  rail of icons and back, the choice remembered on this device (browser storage, a
  convenience only); folded, the cards get three columns at 1280px.
- **D6** (owner, 2026-11-17, EPC-012 grilling round 3): the side rail of a roadmap's placements (D1) is
  dropped; STY-053's "Jump to" and in-page links cover it.
- **D7** (owner, 2026-11-17, EPC-012 grilling round 3): the top bar and the phase banner scroll away
  with the page; only a roadmap's title row (STY-052) pins at the top. On a desktop
  the navigation stays full height as the page scrolls.
- **D8** (owner, 2026-11-17, EPC-012 grilling round 3): on a phone, the button that opens the drawer
  also sits at the left of a roadmap's sticky title strip (STY-052), so the
  navigation is one press away once scrolled. Changes: S5 (where the drawer opens
  from).
- **D9** (owner, 2026-11-17, EPC-012 UX prototypes grilling round 4): on a phone, the
  navigation's menu button sits at the left of the navy top bar at the page's top, and
  in a roadmap's sticky strip once scrolled (D8).
- **D10** (owner, 2026-11-17, PR #133): the desktop navigation's fold button shows
  Lucide's `panel-left-close` while open and `panel-left` while folded (D5).
- **D11** (owner, 2026-11-17, during delivery): the fold button shows Lucide's
  `panel-left-open` while folded, instead of `panel-left` (D10); `panel-left-close`
  while open is unchanged.

## Out of scope

- The app-wide count of unpublished changes: STY-055.
- Folding the header's controls: STY-056.
