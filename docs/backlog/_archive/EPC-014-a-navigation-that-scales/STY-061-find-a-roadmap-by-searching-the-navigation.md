# STY-061: A Product Lead finds a roadmap by searching the navigation

- **Status**: Done — a search tops the navigation, narrowing the roadmaps by title or
  family as the Product Lead types; a spyglass in the rail, and in the drawer beside
  Close menu
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-014-a-navigation-that-scales](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-010, ADR-008, ADR-005, ADR-002
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/155
- **Suggested model**: Opus — state shared by the sidebar, the rail and the drawer
  across pages, a live region, and the shell's top row rebuilt

## Summary

A Product Lead switching roadmaps reads down every family to find the one they want.
This story puts a search at the top of the navigation, with the fold button beside it,
that narrows the list as they type, by title or family name, ignoring case and
accents. Folded, the search is a spyglass that opens the navigation ready to type; on a
phone it shares the drawer's top row with Close menu. The top row stays in view as the
list scrolls, and the rail scrolls without a scrollbar. Closing families and the
count's narrowing follow in STY-062 and STY-063.

## Acceptance criteria

### S1: Typing narrows the list

**Given** the navigation open on a desktop, listing 14 roadmaps
**When** the Product Lead types "prescri" in its search
**Then** only Prescriptions online and Electronic prescribing show, each under its
family's name, the part that matched underlined
**And** All roadmaps, the count and "Families, categories and organisations" still show

### S2: Without case or accents

**Given** the navigation's search
**When** the Product Lead types "ffon", then "CARE"
**Then** "ffon" finds Ffôn Iechyd helpline, and "CARE" finds Care record viewer, Shared
care plans and Carers' register

### S3: A family's name finds its roadmaps

**Given** the navigation's search
**When** the Product Lead types "single"
**Then** every roadmap of the Single Record family shows

### S4: Nothing found

**Given** the navigation's search
**When** the Product Lead types "xyz"
**Then** the navigation says no roadmaps match "xyz", and shows no family
**And** All roadmaps and "Families, categories and organisations" still show

### S5: Clearing the search

**Given** a search for "care"
**When** the Product Lead presses Escape in the search, or its clear button
**Then** the search empties and every roadmap shows, with focus in the search
**And** a screen reader is told every roadmap shows

### S6: Told how many match, not on every key

**Given** a screen reader
**When** the Product Lead types "care" and pauses
**Then** they are told 3 roadmaps match, once, after the pause

### S7: The search lasts while moving between pages

**Given** a search for "care"
**When** the Product Lead chooses Shared care plans
**Then** its page opens and focus moves to it, as on any navigation (STY-054 S1)
**And** the navigation still shows "care" and the roadmaps it finds
**And** after a reload the search is empty

### S8: The top row

**Given** the navigation open on a desktop
**When** the Product Lead scrolls its list
**Then** the search and, to its right, the fold button stay at the top in view
**And** both are inside the navigation landmark, the search reached first by Tab

### S9: Folded to the rail

**Given** the navigation folded to its rail
**When** the Product Lead looks at it
**Then** a spyglass named "Search roadmaps" shows above the button that opens the
navigation, and every roadmap's mark shows whatever the search holds
**And** the rail scrolls by wheel, touch and keyboard without showing a scrollbar
**When** they press the spyglass
**Then** the navigation opens, remembered as open on this device, with focus in the
search

### S10: On a phone

**Given** a 375px phone with the drawer open
**When** the Product Lead looks at its top
**Then** the search and Close menu share one row, and the drawer is still named "Menu"
**And** focus starts on Close menu, so the phone's keyboard stays shut until they choose
the search
**And** choosing a roadmap closes the drawer, and the search holds its text when the
drawer opens again
**And** Escape in a search with text clears it; in an empty search it closes the drawer

### S11: Before the roadmaps are read

**Given** not connected, the roadmaps loading, or a list that failed to load
**When** the Product Lead looks at the navigation
**Then** no search or spyglass shows, and the navigation offers what it does today
(STY-054 S4)

### S12: Welsh, keyboard and dark

**Given** the interface in Cymraeg at 1024px and in the drawer at 375px, or a keyboard
alone, or the dark theme
**When** the Product Lead searches
**Then** the search's name and placeholder are in Cymraeg and fit with no sideways
scroll, a roadmap is found by its Cymraeg title, every control is reached and worked by
keyboard with the navigation's focus styles, and the search is legible on navy in both
themes

## Decisions

- **D1** (owner, 2026-11-18, request and navigation UX analysis): a search at the top of
  the navigation that narrows the roadmaps as they type, the fold button on its row to
  its right, a spyglass when folded; the rail shows no scrollbar.
- **D2** (agent, 2026-11-18, analysis decision 6 (a), as drawn): the search compares a
  roadmap's title in the interface's language and its family's name, without case or
  accents, over the title alone, so "single" finds a family's roadmaps.
- **D3** (agent, 2026-11-18, analysis decision 11 (a)): the search lasts while moving
  between pages and not past a reload, over clearing it on every move.
- **D4** (agent, 2026-11-18, analysis decision 12 (a)): the rail lists every roadmap
  whatever the search; its spyglass opens the navigation, remembered as open, over
  opening it for the search alone.
- **D5** (agent, 2026-11-18, analysis decisions 14 (a) and 15 (a)): the drawer's top row
  holds the search and Close menu, so "Menu" names the dialog without showing; the top
  row stays in place inside the landmark. Changes STY-054's drawer and fold button row.
- **D6** (agent, 2026-11-18): no search before the roadmaps are read, over a search that
  can find nothing, as STY-054 S4 offers nothing that would fail.
- **D7** (agent, 2026-11-18, code review, analysis decision 18 (a)): the drawer opens with focus on Close menu,
  over the search, its first control, which would open a phone's keyboard on every
  visit.

## Starting point

Audited at `f46384c`. `AppShell` renders the navigation twice over: `navigation(form)`
from the root route, inside `NavigationSidebar` on a desktop and `NavigationDrawer`
below 1024px, so state held inside `RoadmapNavigation` is lost as the width crosses
1024px and as the drawer closes; the search's state belongs above both. The fold button
sits in `NavigationSidebar`, outside `NavigationLandmark`, which this story changes.
Roadmap titles are `LocalisedText`, read with `localise(title, language)`.

## Out of scope

- Closing families, and a search that finds roadmaps in closed families: STY-062.
- The count's narrowing, which empties the search: STY-063.
- The navigation's width: STY-064.

## Delivery

### Departures

- **The live region is the search's own** (agent): S6 and S5 are said by a polite
  region that `NavigationSearchProvider` holds beside the shell in the root route,
  always in the page and outside the drawer, as the epic's _What a screen reader is
  told_ asks; it is a second region beside the shell's `UnpublishedAnnouncement`, not
  that one, since the search's state lives in the roadmaps feature, above the shell.
- **A roadmap with no family is found by its title alone** (agent, D2): the prototype
  also matched "No product family", the heading of the roadmaps with none; D2 compares
  a roadmap's family's name, which such a roadmap does not have.
- **The search is a searchbox, not a `search` landmark** (agent): the prototype's
  `form role="search"` was named "Roadmaps", as the navigation landmark it sits in is;
  the search box is named "Search roadmaps" inside that landmark instead.
- **Close menu grows from 32px to 40px** (agent), the search's height, so the drawer's
  top row is one height; the drawer's "Menu" title is hidden even before the roadmaps
  are read (S11), keeping one shape for the row.
- **The spyglass has no tooltip** (agent), as the fold button beside it has none.

### Contract for dependents

- `NavigationSearchProvider` (`features/roadmaps/navigation/navigation-search-provider.tsx`)
  wraps `AppShell` in `routes/__root.tsx` and holds the search; read it with
  `useNavigationSearch()`: `groups` (every group, `null` until the roadmaps are read),
  `found` (the groups the search narrows to), `query`, `key` (`searchKey(query)`, blank
  while `groups` is `null`, so a search kept past Disconnect narrows nothing),
  `type`, `clear` (says "Showing all roadmaps"), `requestFocus` and `takeFocusRequest`. The
  count's narrowing (STY-063) belongs here too: it empties the search, and a blank
  search cleared under it says nothing.
- `narrow-roadmaps.ts`: `searchKey`, `findIn` and `narrowGroups`, the one rule for what
  a search finds; STY-062 lets a closed family show what the search finds in it.
- `AppShell` takes `navigationSearch(form, openNavigation)`, drawn at the start of the
  top row; `NavigationLandmark` takes `top` and `rail`, its list
  (`[data-slot=navigation-list]`) scrolling under the row.
- Catalogue keys `roadmaps.navigation.search.*` (label, placeholder, clear, found,
  noMatch, showingAll).
- E2E: `tests/e2e/fixtures/navigation-world.ts` (`NAVIGATION_WORLD`), the analysis's 14
  roadmaps; the page has two polite live regions, so a spec finds one by its text.

### Scenario evidence

| Scenario | Held by                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `navigation-search.test.tsx` (`narrows the list … underlined`); `navigation-search.spec.ts` (`narrows the list …`)              |
| S2, S3   | `narrow-roadmaps.test.ts`; `navigation-search.test.tsx` (`finds titles without case or accents`, `… by the family's name`)      |
| S4       | `navigation-search.test.tsx` (`says when no roadmap matches, and shows no family`)                                              |
| S5       | `navigation-search.test.tsx` (`empties on Escape …`, `empties from its clear button …`)                                         |
| S6       | `navigation-search.test.tsx` (`tells a screen reader how many match once …`); `navigation-search.spec.ts`                       |
| S7       | `navigation-search.test.tsx` (`lasts while moving between pages`); a reload starts empty: state is React state only             |
| S8       | `navigation-search.test.tsx` (`leads the top row …`); `navigation-search.spec.ts` (`keeps the search and the fold button …`)    |
| S9       | `navigation-search.test.tsx` (`folded to a rail`); `navigation-search.spec.ts` (`folded, scrolls its rail with no scrollbar …`) |
| S10      | `navigation-search.test.tsx` (`in the phone's drawer`); `navigation-search.spec.ts` (`shares the drawer's top row …`)           |
| S11      | `navigation-search.test.tsx` (`does not show before the roadmaps are read …`); `navigation-signed-out.aria.yml`                 |
| S12      | `navigation-search.test.tsx` (`speaks Welsh …`); `navigation-search.spec.ts` (`fits its Cymraeg …`); focus tours; screenshots   |

Tests followed the code (layout and behaviour, not a pending-edit rule); each was shown
red by breaking the finished code, then restored: no family match (S3), Escape left to
the drawer (S10), no typing pause (S6), no `initialFocus` (S10, D7), no focus request
(S9), no underline (S1), in `navigation-search.test.tsx`; and in
`navigation-search.spec.ts`, a landmark without `min-h-0 flex-1` and a rail with its
scrollbar (S8, S9).
