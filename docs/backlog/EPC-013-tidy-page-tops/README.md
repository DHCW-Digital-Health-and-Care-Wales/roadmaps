# EPC-013: Tidy page tops — every control is there, but nothing lines up

- **Status**: Active — the owner chose design G and accepted every decision of the
  page headers UX analysis on 2026-11-18
- **Progress**: 0 of 3 terminal; next selectable: STY-058, STY-059; blocked on: nothing
- **Binding ADRs**: ADR-010, ADR-008, ADR-012, ADR-004, ADR-002

## Summary

EPC-012 put the right controls on a roadmap's page and in the shell: a sticky title
row, "Jump to", the placement links, a folded About, and navigation on every page. The
owner's review of the shipped phone and iPad screens found the tops of the roadmap
list and a roadmap's page "a total mess of stuff just placed arbitrarily". The jump
control shows twice, About is a boxed panel between the controls and the items, links
duplicate the navigation, and the controls change order and edge from row to row. This
epic gives each page one stack on one left edge, with one row of controls in one order
at the top and once scrolled (design G of the
[page headers UX analysis](../../analysis/page-headers-ux-analysis.md)). It moves
controls, not data, and leaves the item card, the navigation and the header as they
are.

## Owner decisions waiting

None.

## Findings

Audited from the owner's screenshots of 2026-11-18 and the analysis's "Today" frames,
drawn at `41f62a9` with STY-056's header, which is on the default branch since
`0f7b22c`. Phone 375px, iPad 820px, desktop 1280px.

| Screen           | Above the first card today                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roadmap list     | title, "Every roadmap, published or not.", the families link, the count, Refresh, Add a roadmap                                                  |
| A roadmap's page | "Back to roadmaps", title, More, Add an item, "Jump to", the boxed About with its facts, Show more and Edit, then the row of six placement links |
| Families page    | "Back to roadmaps", then the page                                                                                                                |

### F1 — The jump control shows twice

Below a desktop, "Jump to" (in the title row) and the row of placement links (under
About) sit one above the other at the top of a roadmap's page (STY-053 D5). On a phone
the links' row scrolls sideways and cuts off after Next.

### F2 — The roadmap's facts and About sit in a box between the controls and the items

The status, product lead and last update are inside the folded About panel
(`EditableRoadmapAbout`, STY-053 D2, D6), which has its own heading, border, Show more
and Edit. It reads as a second block of controls, and pushes the first card down.

### F3 — Controls change order and edge from row to row

The title row puts More before Add an item, "Jump to" takes its own row, About's Show
more and Edit sit on the box's edge, and on the list Refresh comes before Add a
roadmap. Publish roadmap, for a roadmap not yet published, sits in the title row on a
desktop and moves into More on a phone once stuck (STY-052 D15, D19).

### F4 — Links duplicate the navigation

STY-054 added navigation on every page holding "All roadmaps" and "Families,
categories and organisations". "Back to roadmaps" (`BackLink`, on a roadmap's page and
the families page) and the list's families link now repeat it, and the list's
"Every roadmap, published or not." says nothing the count does not.

### F5 — The phone's scrolled strip and pending bar take three rows and two

Once scrolled on a phone, the strip holds the menu button, the title, More, + and
"Jump to" across two rows, and the pending changes' foot bar takes two rows of its own.

## Design

1. The roadmap list's top is its title, the count, then Add a roadmap and Refresh on one
   row; the description line and the families link go (STY-058; F4).
2. No back link on any page: the header's name and logo and the navigation lead to the
   list (STY-058, STY-059; F4).
3. A roadmap's page opens on one header block on one left edge: the title; its facts
   ("Status: [Live]", product lead, last update); for a roadmap not published, the Not
   published tag with Publish roadmap beside it; then the About this roadmap disclosure
   with Edit beside it (STY-059; F2, F3).
4. One row of controls, Add an item, More, then the jump control, in that order at the
   top and once stuck. The jump control is "Jump to" below 1024px and the row of six
   placement links from 1024px, in either language, the same at the top and once stuck
   (STY-059, STY-060; F1, F3).
5. The stuck strip on a phone is two rows: the menu button and the title, then +, … and
   "Jump to"; on an iPad the same with labelled buttons; on a desktop the title with Add
   and More on its right, then the links (STY-060; F5).
6. The pending changes' foot bar is one row at every width (STY-060; F5).
7. **Unchanged:** the header, the phase banner and the navigation (STY-054, STY-056);
   the item card, Move and Edit; the publish dialog and conflict review; the
   pending-changes store and its rules (ADR-012); what the editor reads and writes;
   hash routing and the routes' addresses (ADR-004); DHCW's tokens, type and focus
   styles (ADR-010); pinning only above 500px of viewport height (STY-052 D18).

## Shared assumptions and contracts

### The prototype is the reference

[`page-headers-ux-prototypes.html`](../../analysis/page-headers-ux-analysis/page-headers-ux-prototypes.html),
design G, draws every moment these stories build: the list, a roadmap's top, About and
More open, "Jump to" open at the top and once stuck, the end of the page, a roadmap not
published, Welsh on a phone, an iPad and a desktop, and a short screen. Where a story
and the prototype differ, the story wins; the analysis's _Not yet drawn_ refinements
are written into the stories' scenarios.

### Widths

A phone is below 640px, an iPad from 640px to below `DESKTOP_WIDTH` (1024px,
`lib/use-media-query.ts`), a desktop from 1024px. Every row fits its Cymraeg labels at
375px, 640px, 820px and 1024px without sideways scroll, and no control passes the right
edge; a long placement's name is cut with an ellipsis, never a label of a button.

### Controls

Buttons in a row share one height, 40px, as ADR-010's default; none stretches to the
page's width (ADR-010, "no full-width buttons in the header"). Focus styles as root
`AGENTS.md` sets them.

### Copy

New strings go through the copywriter skill, in English and Welsh (ADR-008). A
catalogue key left unused by a removal goes in the same story.

### Nothing sticky hides focus or content

As EPC-012's contract of the same name: `scroll-padding` at each pinned height
(`usePinnedInset`), and nothing pins below 500px of viewport height.

## Stories

| ID      | Story                                                                                                            | Area                               | Depends on | State |
| ------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | ----- |
| STY-058 | [A tidy top to the roadmap list](STY-058-a-tidy-top-to-the-roadmap-list.md)                                      | Features/UI + i18n (en + cy) + E2E | —          |       |
| STY-059 | [A roadmap's page opens on one header block](STY-059-a-roadmaps-page-opens-on-one-header-block.md)               | Features/UI + i18n (en + cy) + E2E | —          |       |
| STY-060 | [One row of controls, at the top and once scrolled](STY-060-one-row-of-controls-at-the-top-and-once-scrolled.md) | Features/UI + i18n (en + cy) + E2E | STY-059    |       |

## Sequencing

STY-058 and STY-059 touch different pages and can run in either order; STY-058 is the
smaller, so it goes first. STY-060 reshapes the stuck strip and the jump control
around the header block and control row STY-059 builds, so it follows STY-059, hard.

## Out of scope

- **A compact item card** and **a Now / Next / Later board**: EPC-012 _Out of scope_.
- **The dark theme, and the list's and roadmap's loading, empty, error, expired and
  not-found states**, which the prototype did not draw: each keeps its present
  behaviour inside the new layout; a state that looks wrong is a defect.

## Defects

None.

## Related

- [Page headers UX analysis](../../analysis/page-headers-ux-analysis.md), with its
  _Outcome_
- [EPC-012 App shell and navigation](../_archive/EPC-012-app-shell-and-navigation/README.md),
  whose STY-052, STY-053 and STY-054 these stories change
- [ADR-010](../../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md)
- [Product Lead persona](../personas/product-lead.md)
