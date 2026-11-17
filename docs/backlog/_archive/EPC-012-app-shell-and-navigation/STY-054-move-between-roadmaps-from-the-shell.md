# STY-054: A Product Lead moves between roadmaps, and to families, from the shell

- **Status**: Done — DHCW's dashboard shell: a navigation to every roadmap and the
  families page, beside the page and folding to a rail on a desktop, a drawer on a phone
- **Type**: Feature + Docs
- **Area**: Features/UI + Routing + i18n (en + cy) + E2E + Docs
- **Epic**: [EPC-012-app-shell-and-navigation](../../EPC-012-app-shell-and-navigation/README.md)
- **Depends on**: STY-052 (preferred order: its phone menu button sits in STY-052's
  sticky strip, D8)
- **Binding ADRs**: ADR-010 _Deferred: the dashboard shell_, ADR-004, ADR-008, ADR-002
- **Suggested model**: Opus — a shell-wide layout change, an ADR amendment and
  focus on navigation
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/142

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

## Delivery

### Departures

- **A desktop from 1024px** (agent): the navigation stands beside the page from
  `DESKTOP_WIDTH` (`lib/use-media-query.ts`), and is a drawer below it, a tablet's
  included, since 256px of navigation would leave a 768px tablet about 500px of page.
  The menu button shows wherever there is a drawer (D8 and D9 name a phone).
- **DHCW's template for the page's top** (agent; the chosen page draws the navigation
  only scrolled): as `nhswDashboard`, the navigation runs from the page's top at the
  left, and the top bar, phase banner, page and footer stand beside it. It comes first
  in the page, after the skip link, as in DHCW's template.
- **The rail keeps every destination, and the open navigation shows their icons**
  (agent): the context frames' rail had no "All roadmaps" and the open navigation no
  icons. Folding now drops nothing, and the icons, Lucide's `layout-grid` and the
  frames' `globe`, tie the two forms together, as DHCW's navigation links carry icons.
- **A tooltip names each entry of the rail** (agent): its initials do not name a
  roadmap to sight. shadcn's Base UI tooltip came in for it. A roadmap's initials are
  the first letter or number of its title's first two words ("CN"), and begin its name
  ("CN Community Nursing roadmap"), so speech input can say what is shown (WCAG 2.5.3).
- **The drawer is titled "Menu"** (agent): the frames drew "All roadmaps" beside its
  close button; a dialog needs a name, and the menu button that opens it says "Menu".
- **A family's name is read once** (agent): it names its list, so as text it is hidden
  from assistive technology; in the rail it is not shown.
- **The top bar's name wraps rather than be cut** (agent): in Cymraeg at 375px and
  768px, the menu button left the short or full service name about 30px short, which
  `tests/e2e/shell.spec.ts` holds as a regression. It wraps to two lines at most there
  until STY-056's account menu gives the room back. The connection chip follows the
  top bar's own width (a size container), so beside the navigation it shows from a 64rem
  top bar, as it showed from a 1024px screen.
- **Columns follow the page's room** (agent, from D5): every card grid (`CardGrid`) has
  two columns from 36rem of room and three from 64rem. So a 1280px desktop has two open
  and three folded; folded between 1024px and 1167px, two, where there were three.
- **"Back to roadmaps" and the list's link to the families page stay** (agent): the
  chosen page keeps the first; removing either is a product choice for a later record.
- **The STY-031 axe check leaves out Base UI's focus guards** (agent, found here): axe
  passes them only when something covers the screen's centre, its sign of a modal open.
  With two columns of cards, the Move button sits there with its menu open, so the check
  failed on a structure unchanged from the default branch. Only that check, with a menu
  open, leaves them out (`menuOpen`, `tests/e2e/accessibility.spec.ts`).
- **The room the pinned foot leaves at the page's end** (agent, review round 1) is the
  shell's page column's, no longer the body's: the navigation sticks within the shell's
  row, so with the room outside it, at the page's end the navigation rose by the foot's
  height (D7).
- **The count and dots of unpublished changes** are STY-055's, as the epic plans.

### Contract for dependents

The epic's `delivery-notes.md` carries the seams as they stand. Besides those:

- **`AppShell`** takes `navigation: (form: NavigationForm) => ReactNode`, `full` beside
  the page or in the drawer and `rail` folded; the root route passes
  `RoadmapNavigation` (`features/roadmaps/navigation/`), which STY-055's dots and count
  join. Each destination is a `NavigationLink` (`createLink`, so it takes the router
  `Link`'s props) with a `mark`: an icon, or a roadmap's colour and initials. The list
  and the navigation share `namesFamilies(groups)` (`group-roadmaps.ts`) and
  `useGroupName()` (`hooks/use-group-name.ts`). `AppHeader` takes `start`, where the
  menu button sits.
- **`NavigationMenuButton`** (`components/layout/navigation-drawer.tsx`) renders only
  where the shell has a drawer (`NavigationDrawerContext`); STY-055's dot goes on it.
  The drawer is a Base UI dialog shared by both buttons through a handle, so closing
  returns focus to the one that opened it.
- **`--navigation-width`** (`globals.css`, set by the shell's `data-navigation`) is
  where a bar pinned to the screen starts: `StickyHeader` and `PinnedFoot` use
  `left-(--navigation-width)`.
- **`CardGrid`** (`features/roadmaps/components/card-grid.tsx`) is the one card grid:
  the roadmap cards (`evenRows`), the item cards and both skeletons.
- **The top bar is a size container**: a control in it that follows width uses a
  container variant, as `ConnectionStatus` does (`@max-5xl:sr-only`). STY-056 reshapes it.
- **Copy**: `layout.navigation.*` and `roadmaps.navigation.all`. **Storage**:
  `roadmaps.navigation` holds `folded` (`navigation-preference.ts`).
- **Tests**: `matchMediaQueries(...)` (`src/test/media-query.ts`) renders a desktop in
  jsdom, where no media query matches; `tests/e2e/shell-navigation.spec.ts`;
  `structure.spec.ts`'s `navigation*.aria.yml`.
- **Data source**: nothing written changes. The navigation reads the roadmap list on
  every connected page, sharing the list's query; only the not-found page did not read
  it before.

### Scenario evidence

`e2e` is `tests/e2e/shell-navigation.spec.ts`; `nav` is
`src/features/roadmaps/navigation/roadmap-navigation.test.tsx`; `shell` is
`src/components/layout/app-shell-navigation.test.tsx`.

| Scenario   | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1         | e2e "opens another roadmap in one step, moving focus to its page" and "opens from a roadmap's sticky strip once scrolled, and a roadmap chosen opens its page"; nav "opens another roadmap in one step, moving focus to its page"; shell "closes the drawer when a link is chosen, and moves focus to the page it opens" and "… even for a link to the page already open"                                                                                                   |
| S2         | e2e "reaches the families page from a roadmap's page"; nav "leads to each roadmap and to the families page"; shell (the drawer's families link)                                                                                                                                                                                                                                                                                                                             |
| S3         | e2e "marks the roadmap open as the current page, to sight and to a screen reader" (`aria-current`, bold, the active blue); nav "marks the roadmap open as the current page, and nothing else" and "marks all the roadmaps as current on the home page only"; `focus-indicator.spec.ts` (the current link takes the fill)                                                                                                                                                    |
| S4         | e2e "before connecting, offers only all the roadmaps and the families page…" and "when the roadmap list can't be read, offers only the two pages"; nav "offers only the two pages before connecting" and "… when the roadmap list can't be read"; `structure` `navigation-signed-out`                                                                                                                                                                                       |
| S5         | e2e "opens over the page from the top bar, keeps focus in it and returns it, and fits in en" and "… in cy" (no sideways scroll at 375px, Tab cycles inside, Escape returns focus); shell "opens the navigation as a drawer from the top bar, and closes back to its button" and "closes the drawer on Escape…"; `accessibility.spec.ts` "the shell's navigation as a drawer on a phone" (axe, light and dark); `structure` `navigation-drawer`                              |
| S6         | e2e "keeps a roadmap's pending changes as the Product Lead switches roadmaps and back"                                                                                                                                                                                                                                                                                                                                                                                      |
| D3, D5, D7 | nav "lists all the roadmaps, then each roadmap by family…" and "folded to a rail"; shell "folds to a rail and opens again…" and "starts folded…"; `navigation-preference.test.ts`; e2e "folds to a rail and back, remembered on this device, the cards taking three columns folded and two open" and "stays full height at the left as the page scrolls, the pinned bars beside it"; `accessibility.spec.ts` "the shell's navigation beside a roadmap's page, then folded…" |

`roadmapInitials` was test-first: its tests failed on a stub before it was written. The
rest followed working code, each shown red by breaking it: the drawer handing focus back
to Base UI fails both shell tests of a chosen link, and no focus once it closes fails
"… even for a link to the page already open"; closing it on a click with a modifier
key fails "stays open for a link opened elsewhere…"; the families in reverse order fails
"lists all the roadmaps, then each roadmap by family…"; other initials fail "shows each
roadmap's initials…", and another tooltip text "shows a roadmap's title in a tooltip…".
Removing `exact` from "All roadmaps"' active match fails nothing: the router never marks
`/` current elsewhere, so it states the intent only. Review round 1's fixes: the room at
the page's end back on the body lifts the navigation by the foot's height there, in the
e2e "stays full height…"; the initials hidden from the name fail "shows each roadmap's
initials, named by them and its title" and the tooltip test that finds the link by it.
