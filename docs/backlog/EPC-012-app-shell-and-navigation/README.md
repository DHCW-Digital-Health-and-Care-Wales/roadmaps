# EPC-012: App shell and navigation — the controls that matter scroll away, the plumbing stays

- **Status**: Active — proposed by the owner on 2026-11-17 from a UX review of the
  shell; the owner chose STY-052's and STY-053's designs from their prototypes and
  answered every story's questions in four grilling rounds and a review round
- **Progress**: 1 of 6 terminal (STY-057, delivered in [#136](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/136), awaiting merge); next
  selectable: STY-052 once STY-057 is merged (STY-054 and STY-056 have no hard
  dependency, but prefer to follow STY-052); blocked on: nothing
- **Binding ADRs**: ADR-010, ADR-008, ADR-005, ADR-012, ADR-002, ADR-003, ADR-004

## Summary

The shell is right in its parts: DHCW's header and phase banner, one wide container,
focus moved on navigation, and every page handling its loading, error and expired
states. It is wrong in what it keeps on screen. A roadmap's page runs to about six
desktop screens and eleven phone screens, and its title, "Add an item" and the pending
changes with Publish all scroll away within the first one, while the header keeps
connection status, language, theme and Disconnect. Nothing moves between roadmaps or
placements but scrolling and "Back to roadmaps", and unpublished changes are invisible
from anywhere but their roadmap and its card. This epic keeps the roadmap's controls
and pending changes in view, adds a way to jump between placements, adopts the
dashboard shell ADR-010 deferred, shows unpublished changes app-wide and quietens the
header. It leaves the item card's own density to a later record.

## Owner decisions waiting

None.

## Findings

Audited at `242f683` on 2026-11-17, from the production build with Google faked (the
E2E fixtures), Product A's example tab plus 13 items (22 in all), at 1280×800 and
375×812.

| Screen       | Height (desktop / phone) | What stays on screen as the page scrolls              |
| ------------ | ------------------------ | ----------------------------------------------------- |
| Roadmap list | 1,313px / 1,439px        | nothing (the header is not sticky)                    |
| Roadmap page | 4,765px / 8,885px        | nothing                                               |
| Families     | 1,260px / 1,632px        | nothing                                               |
| Chrome above | about 130px / 125px      | header band and phase banner, before any page content |

### F1 — Publish and the pending count scroll out of view at once

The pending bar ("1 unpublished change", Publish changes, Discard all) sits in the page
flow under the title (`RoadmapPublishing`, rendered by `RoadmapView` before
`EditableRoadmapAbout`). At 1280px it is gone after about 400px of scroll; the Later
placement starts about 3,000px down. A Product Lead who moves a card in Later sees no
sign that anything is pending, nor a way to publish, without scrolling back. The
persona calls publishing "the moment that matters" and publishing by mistake and losing
work its top risks. Counter-argument: the bar is always at the top of the page, so it
is easy to find again; the cost is the trip, every time.

### F2 — The roadmap's identity and actions scroll away

The title, "Add an item", Refresh and Unpublish roadmap sit in one row at the top
(`RoadmapView`); placement headings appear once, above their first card. Halfway down
a phone page of cards, nothing names the roadmap or the placement in view.

### F3 — Nothing jumps between placements

Six placements stack in the public site's order (Recently delivered, Now, Next, Later,
Delivered this year, Not doing; `groupRoadmapItems`), under "About this roadmap", which
takes nearly a full desktop screen. Reaching Later means scrolling past the rest. The
persona's first need is "each of their roadmaps as Now, Next and Later at a glance".

### F4 — Moving between roadmaps, and to families, goes through the list

The shell has no navigation (`AppShell`: header, phase banner, main, footer). A roadmap
page has only "Back to roadmaps" (`BackLink to="/"`); the families page is linked only
from under the list's heading (`rg -n 'to="/families"' src`). A Product Lead can lead
several products (persona A12), so switching roadmaps is a common trip of three steps.
ADR-010 deferred the dashboard shell "to the first record that adds a second top-level
destination or the roadmap editor"; both have shipped (STY-029, EPC-005), so its
trigger has passed.

### F5 — Unpublished changes are invisible away from their roadmap

Pending changes are held in memory per roadmap (ADR-012). Only that roadmap's page and
its card in the list say so (`RoadmapCard`, STY-025 S7); the families page, other
roadmaps and the header say nothing. A `beforeunload` prompt guards a closed tab
(`PendingChangesProvider`).

### F6 — The header spends its room on plumbing

The header holds `ConnectionStatus` ("Google connected"), `LanguageSwitcher`,
`ThemeToggle` and `HeaderAuthButton` (`src/routes/__root.tsx`); after connecting, an
`AuthNotice` ("Connected to Google") adds about 50px to the page. The persona says
sign-in is plumbing. Counter-argument: language and theme are preferences a Product
Lead may want in one click, and the phase banner is DHCW's pattern.

### F7 — Notices appear at the top, far from where the work is

The publish outcome, conflict review, added-roadmap and published-state notices render
above the items in the page flow, where a Product Lead working lower down cannot see
them.

## Design

1. While a roadmap's page is scrolled past its title, its title, its pending changes
   with Publish and Discard, and "Add an item" stay in view (STY-052; F1, F2).
2. A roadmap's page offers a way to reach any placement without scrolling past the
   others, and folds "About this roadmap" so items start sooner (STY-053; F3).
3. The shell gains navigation to each roadmap and to families, categories and
   organisations, by the dashboard shell ADR-010 deferred: collapsible on a desktop, a
   drawer on a phone (STY-054; F4).
4. The shell says when any roadmap has unpublished changes, from every page, by a dot
   on each roadmap in its navigation (STY-055; F5).
5. The header keeps the language one click away and folds theme and Disconnect into a
   menu; the connection shows only when it needs action (STY-056; F6).
6. Only a roadmap's title row pins at the top: the top bar and the phase banner scroll
   away (STY-054 D7, STY-056 D2).
7. An action that needs a session stays available when it has expired, and asks to
   reconnect before it carries on (STY-057, from STY-052 D4; F1).
8. A notice about a publish, or about publishing or unpublishing the roadmap, appears
   at the foot, where the Product Lead pressed it (STY-052; F7). The added-roadmap
   notice stays at the top: it shows on arrival, with the page at its top.
9. **Unchanged:** publishing and its dialog, conflict review's decisions (Keep mine,
   Use theirs) though it moves into a dialog (STY-052), the pending-changes store and
   its rules (ADR-012); the item card and its Move and Edit; DHCW's tokens,
   type and focus styles (ADR-010); hash routing (ADR-004); the routes and their
   addresses.

## Shared assumptions and contracts

### Nothing sticky hides focus or content

Anything pinned to the viewport leaves the focused element visible (WCAG 2.4.11), by
`scroll-padding` or equivalent, and stops pinning where the viewport is too short for
it, such as at 400% zoom (WCAG 1.4.10). Dialogs still cover it.

### Welsh widths

Every pinned bar and navigation fits its Cymraeg labels at 375px without sideways
scroll; `tests/e2e/shell.spec.ts` already guards the header row.

### Copy

New strings go through the copywriter skill, in English and Welsh (ADR-008). The
shell speaks roadmaps, placements and publishing, never the data source.

### Connecting stays synchronous

Any control that moves into a menu and connects Google calls `connect()` in its click
handler with no `await` before it (ADR-003).

## Stories

| ID      | Story                                                                                                                                      | Area                                | Depends on | State |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ---------- | ----- |
| STY-052 | [Keep a roadmap's controls in view](STY-052-keep-a-roadmaps-controls-in-view.md)                                                           | Features/UI + i18n (en + cy) + E2E  | STY-057    |       |
| STY-053 | [Jump between a roadmap's placements](STY-053-jump-between-a-roadmaps-placements.md)                                                       | Features/UI + i18n (en + cy) + E2E  | STY-052    |       |
| STY-054 | [Move between roadmaps from the shell](STY-054-move-between-roadmaps-from-the-shell.md)                                                    | Features/UI + Routing + i18n + Docs | —          |       |
| STY-055 | [See unpublished changes across roadmaps](STY-055-see-unpublished-changes-across-roadmaps.md)                                              | Features/UI + i18n (en + cy) + E2E  | STY-054    |       |
| STY-056 | [A quieter header](STY-056-a-quieter-header.md)                                                                                            | Features/UI + i18n (en + cy) + E2E  | —          |       |
| STY-057 | [Reconnect from the action that needs it](../_archive/EPC-012-app-shell-and-navigation/STY-057-reconnect-from-the-action-that-needs-it.md) | Features/UI + i18n (en + cy) + E2E  | —          | ✅    |

## Sequencing

The column above holds hard dependencies only; each story's Depends on gives its
preferred order too.

STY-057 first: STY-052's Publish stays available while the session has expired and
asks to reconnect (STY-052 D4), which is STY-057's dialog, so the owner put it first
(STY-052, EPC-012 review round 1). STY-052 next: it answers the sharpest finding (F1)
and opens no ADR. STY-053 puts its "Jump to" in STY-052's sticky title row, so it
follows; the two were prototyped together. STY-054 amends ADR-010, adds its phone menu
button to STY-052's sticky strip and moves the header's controls into the dashboard
shell's top bar: it can start beside STY-057, but prefers to follow STY-052. STY-055
(whose dots live in its navigation) follows STY-054, and STY-056 (which reshapes that
top bar) prefers to.

## Out of scope

- **A compact item card.** Cards are the bulk of a roadmap page's height, and a
  compact view (title, placement, tags, Move and Edit; details on request) would do
  more for "at a glance" than the shell. It changes the item card, not the shell, so it
  needs its own record; it comes in when the owner asks for it or STY-053's prototypes
  show the shell alone does not reach "at a glance".
- **A Now / Next / Later board.** Placements drawn side by side as columns. The
  glossary avoids "column" for a horizon (CHO-017) and the cards are phone-sized; it
  comes in only with a record that redesigns the item card.

## Defects

- [DEF-018](../defects/DEF-018-reconnecting-on-a-roadmap-s-page-reads-the-roadmap-list-twice.md):
  reconnecting on a roadmap's page reads the roadmap list twice. Needs triage; found by
  STY-057's delivery, and on the default branch before it.

## Related

- [ADR-010](../../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md), _Deferred:
  the dashboard shell_
- [Product Lead persona](../personas/product-lead.md)
- [EPC-005 Editing](../_archive/EPC-005-editing/README.md), which put the pending bar
  under the title
- [Roadmap page shell UX analysis](../../analysis/roadmap-page-shell-ux-analysis.md):
  five mock-ups for STY-052 and STY-053
