# EPC-014: A navigation that scales — every roadmap, always open, at one width

- **Status**: Done — the owner asked on 2026-11-18 to deliver the navigation UX
  prototype as drawn, choosing its chevrons and the count's new behaviour
- **Progress**: 4 of 4 terminal (STY-061, STY-062, STY-063, STY-064)
- **Binding ADRs**: ADR-010, ADR-008, ADR-005, ADR-002

## Summary

EPC-012 gave the shell a navigation that reaches every roadmap and the families page in
one step, folds to a rail, and says which roadmaps have unpublished changes. It lists
every roadmap in the spreadsheet with every family open, at one width, so a Product
Lead scrolls past the products they don't lead on every switch, and a long title wraps.
Its count leads to one roadmap with changes at a time. This epic adds a search above the
list, families that close (one at a time or all together), a count that shows only the
roadmaps with changes, and an edge to drag the navigation's width. It leaves the
navigation's entries, their order and marks, the rail's marks and the drawer's entries
as they are, and writes nothing new to the data source.

## Owner decisions waiting

None.

## Findings

Audited at `f46384c` on 2026-11-18 against the code and the running app at 1280px and
375px (captures taken for the analysis, not kept).

| Screen                      | The navigation today                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Desktop, open (from 1024px) | the fold button alone on its row, All roadmaps, the count, every family open, Families, at 256px |
| Desktop, folded to its rail | the fold button, then every mark, at 64px, the whole column scrolling under a scrollbar          |
| Phone drawer (below 1024px) | "Menu" and Close menu, then the same entries as the open navigation                              |

### F1 — Every family is always open

`RoadmapGroupLinks` (`features/roadmaps/navigation/roadmap-navigation.tsx`) draws each
family's name as a plain `<p>` and its roadmaps after it, with no control to put them
away. With the analysis's 14 roadmaps the list passes a laptop's height; with the page
headers analysis's 29, most families sit below the fold. A Product Lead leads one or two
products (persona A1) and scrolls past the rest on every switch.

### F2 — No way to find a roadmap by name

The navigation has no input: reaching a roadmap means reading down the list by family.
`rg -n '<input|Input' src/components/layout src/features/roadmaps/navigation` finds
none.

### F3 — One width for every title

`[data-navigation="open"]` sets `--navigation-width: --spacing(64)` (256px) in
`styles/globals.css`, and nothing changes it. A long title wraps to two or three lines;
on a 1280px monitor the page could give the navigation more.

### F4 — The count leads to one roadmap at a time

With two or more roadmaps changed, the count is a link to the next one after the page
open (`nextChangedRoadmap`, STY-055 D5). Seeing which roadmaps wait to publish means
reading the dots down the whole list, past closed-off families once F1 is fixed.

### F5 — The whole column scrolls, scrollbar and all

`NavigationSidebar` is one `overflow-y-auto` column, so the fold button scrolls away
with the list, and in the 64px rail a scrollbar takes room from the marks.

## Design

The [navigation UX analysis](../../../analysis/navigation-sidebar-ux-analysis.md)'s
prototype, design A, as drawn; its decisions are in the stories.

1. The top row holds a search, then the fold button; folded, a spyglass, then the button
   that opens the navigation; in the phone's drawer, the search, then Close menu. The row
   stays in place while the list scrolls under it, inside the navigation landmark, and
   the rail scrolls without a scrollbar (STY-061; F2, F5).
2. The search narrows the list as the Product Lead types, matching titles and family
   names without case or accents (STY-061; F2).
3. Each family's name is a button that closes and opens its roadmaps, with a chevron at
   its end; "Close all" and "Open all" act on every family; closed families are
   remembered on this device (STY-062; F1).
4. With two or more roadmaps changed, the count is a button that shows only them, and
   shows every roadmap again when pressed again (STY-063; F4).
5. On a desktop the navigation's right edge drags its width, from 208px to 400px,
   remembered on this device (STY-064; F3).
6. **Unchanged:** the entries and their order, the roadmaps' colours, dots and initials,
   the current page's mark, focus moving to the page on a choice (STY-054 S1, S3, D3);
   the fold and its icons (STY-054 D5, D10, D11); the drawer below 1024px and its menu
   buttons (STY-054 D8, D9); the count's text, its absence with nothing pending, and
   what the shell announces of it (STY-055 S3, S4, D4); the count with one roadmap
   (STY-055 D5, D6); what the editor reads and writes (ADR-002).

## Shared assumptions and contracts

### The prototype is the reference

[`navigation-sidebar-ux-prototypes.html`](../../../analysis/navigation-sidebar-ux-analysis/navigation-sidebar-ux-prototypes.html)
works every behaviour these stories build, at 375px, 1023px, 1024px and 1280px, light
and dark. Its _Things to try_ list is a checklist for each story. Where a story and the
prototype differ, the story wins. The prototype's sample world (14 roadmaps in five
groups, three with changes) is the one the scenarios use; tests use the E2E fixtures.

### Narrowing

One rule decides what the navigation lists, and every story keeps it:

- Whole: every family, open or closed as the Product Lead left it.
- Narrowed by a search (STY-061) or by the count (STY-063): only the roadmaps found, in
  their families' order; a family with nothing to show is left out; a closed family
  shows what it holds (STY-062); a family's name is a plain heading, not a button; "Close
  all" does not show. Only one narrows at a time: pressing the count empties the search,
  and typing lets the count go.
- The rail lists every roadmap, whole, whatever the search, the count or the closed
  families; it shows no family heading or control, and each family's list keeps its
  name for a screen reader, as today.
- All roadmaps, the count and "Families, categories and organisations" always show.

### State the shell keeps

The search text and the count's narrowing last while the Product Lead moves between
pages, and not past a reload: they live above the routes' pages, shared by the desktop
navigation and the phone's drawer. The fold, the width (STY-064) and the closed families
(STY-062) are remembered on this device as the fold is today (STY-054 D5): browser
storage, a convenience only, so a value that can't be read or kept falls back to its
default and is never an error. Nothing is written to the data source.

### What a screen reader is told

Through a polite live region that the shell always holds, outside the drawer, as
`UnpublishedAnnouncement` is: how many roadmaps match once typing pauses (STY-061);
"Showing all roadmaps" when a search is cleared or the count lets go, but not when a
blank search is cleared while the count is pressed; the count's
narrowing (STY-063); "All families closed" and "All families open" (STY-062). A
control's own state (pressed, expanded) is on the control, not announced again.

### Widths

The navigation stands beside the page from `DESKTOP_WIDTH` (1024px,
`lib/use-media-query.ts`) and is a drawer below it. Every new control fits its Cymraeg
label at the navigation's narrowest (208px from STY-064, 256px before it) and in the
drawer at 375px, with no sideways scroll.

### Copy and controls

New strings go through the copywriter skill, in English and Welsh (ADR-008); the
prototype's English is draft. Icons are Lucide's: `search`, `x`, `chevron-down`,
`chevron-right`, `chevrons-down-up`, `chevrons-up-down`, `list-filter`. Focus styles as
the root `AGENTS.md` sets them; on navy, the navigation's own (`focus-fill` on its
links and buttons, `focus-ring` on the search).

## Stories

| ID      | Story                                                                                                                         | Area                               | Depends on                                                                                                            | State |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----- |
| STY-061 | [A Product Lead finds a roadmap by searching the navigation](STY-061-find-a-roadmap-by-searching-the-navigation.md)           | Features/UI + i18n (en + cy) + E2E | —                                                                                                                     | ✅    |
| STY-062 | [A Product Lead closes the families they don't need](STY-062-close-the-families-they-dont-need.md)                            | Features/UI + i18n (en + cy) + E2E | STY-061                                                                                                               | ✅    |
| STY-063 | [A Product Lead shows only the roadmaps with unpublished changes](STY-063-show-only-the-roadmaps-with-unpublished-changes.md) | Features/UI + i18n (en + cy) + E2E | STY-061, STY-062                                                                                                      | ✅    |
| STY-064 | [A Product Lead drags the navigation to the width they want](STY-064-drag-the-navigation-to-the-width-they-want.md)           | Features/UI + i18n (en + cy) + E2E | STY-061, [STY-060](../EPC-013-tidy-page-tops/STY-060-one-row-of-controls-at-the-top-and-once-scrolled.md) (preferred) | ✅    |

## Sequencing

STY-061 goes first: it rebuilds the navigation's top row and its scrolling, and builds
the narrowing and the state the shell keeps, which the others extend. STY-062 follows
it, hard, since a search must find roadmaps in closed families. STY-063 follows both,
hard: pressing the count empties the search, and shows roadmaps in closed families.
STY-064 touches the sidebar's frame and the pinned bars, not the list; it runs last to
keep the sidebar's changes in one place at a time, though only its order after STY-061
matters within this epic. Across epics, it follows EPC-013's STY-060, which rebuilds
the roadmap's stuck strip and the pending changes' foot bar that STY-064 S1 moves, so
the two never change those bars at once.

## Out of scope

- **A shortcut to the search**, such as "/": not asked; the prototype draws none.
- **Searching an item's text**, or roadmaps by tag or lead: the search finds roadmaps by
  title and family only.
- **Resizing on a phone or in the drawer**, and dragging the rail open: the drawer keeps
  its width and the rail its 64px.
- **Remembering the search across a reload**: it lasts while the Product Lead moves
  between pages, as the analysis's decision 11 chose.

## Defects

None.

## Related

- [Navigation UX analysis](../../../analysis/navigation-sidebar-ux-analysis.md), with its
  _Outcome_
- [EPC-012 App shell and navigation](../EPC-012-app-shell-and-navigation/README.md),
  whose STY-054 and STY-055 these stories change
- [ADR-010](../../../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md)
- [Product Lead persona](../../personas/product-lead.md)
