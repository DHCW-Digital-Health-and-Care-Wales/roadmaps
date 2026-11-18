# The tops of the roadmap list and a roadmap's page: seven designs over four rounds

- **Date**: 2026-11-18
- **Question**: the tops of the roadmap list and of a roadmap's page read as controls
  placed arbitrarily, on a phone and an iPad most of all. What do they keep, drop, merge
  or move so each reads as one deliberate layout at 375px, 820px and 1280px?
- **Scope**: the area between the phase banner and the first card on the roadmap list
  (`RoadmapsPage`) and on a roadmap's page (`RoadmapTitleRow`, `EditableRoadmapAbout`,
  `PlacementLinks`, `RoadmapPublishing`'s foot bar), at the top and once scrolled. It
  comes from the owner's review of the shipped screens on 2026-11-18, with no record
  yet. Base `41f62a9`. The designs assume
  [STY-056](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-056-a-quieter-header.md)
  has landed: the top bar keeps the menu button, the service name, the language button
  and one menu for theme and Disconnect, and the "Connected to Google" notice has gone.
  Only documents and prototype pages were added; no application code, and no
  correction to the skill's stylesheet. The pages' shared styles add an iPad frame
  (820px), a 1280px desktop frame beside the navigation and a short 812×375 frame.
- **Prototypes**: one self-contained page of **frames**,
  [`page-headers-ux-prototypes.html`](page-headers-ux-analysis/page-headers-ux-prototypes.html):
  today's screens for comparison, then design G, round 4's and the recommendation.
  Static mock-ups at a phone (375px), an iPad (820px) and a desktop (1280px), each
  labelled with its moment and where keyboard focus is. Rounds 1 to 3's pages (designs
  A to F) were removed once the owner chose G; the table below describes them.
- **Sample world**: invented. On Wednesday 18 November 2026 Sam Evans, a Product Lead,
  opens the editor. The list holds 29 roadmaps, 7 not published, in six groups:
  Patient Record 4, Primary & Community 6, Medicines & Diagnostics 5, Hospital Care 7,
  Data & Analytics 4, and No product family 3. Sam co-leads Demographics and Identity
  (MPI, WDS, WAMS) with Rhian Morgan. It is published, its status label "Live", last
  updated 4 November 2026, in the Patient Record family and the Identity category. Its
  15 items stand as follows: Recently delivered 1, Now 8, Next 5, Later 1, Delivered
  this year 0, Not doing 0, and none unplaced. When scrolled, the roadmap has 2
  unpublished changes, both edits to Now items' descriptions, so Now carries the
  pending mark. Sam also leads Community Nursing: not published, status label "Beta",
  last updated 12 November 2026, with Now 3, Next 2 and Later 2. The long title, with
  its acronyms, is the planted awkward case: it wraps on every device. Welsh frames
  reuse `cy.ts`'s strings; "Statws" is its own, and the rest of the Welsh is draft.

## Readers and where they are

The reader is a Product Lead (persona A1, A2). They have about 30 minutes a week for
roadmaps, work mostly at a desk, and use a phone or tablet for small jobs: checking a
roadmap, moving a card, publishing. The owner's screenshots are from a phone and an
iPad, and the complaint is about those widths. On a phone, every pixel of the first
screen spent above the first card is a scroll before any work. The interface is in
English and Welsh (ADR-008), and the Welsh labels run about 30% longer.

## Journeys covered

| Group                                          | Journeys                                                                                                                                                                                                                                                    | Stories                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1. The top of the list and of a roadmap's page | open the list and see how many roadmaps there are; add a roadmap; refresh; open a roadmap and see its status, leads and last update; read About and edit it; add an item; reach a placement; scroll and keep the title, actions and pending changes in view | STY-025, STY-029, STY-041, STY-046, STY-052, STY-053, STY-054, STY-056 |

Each journey relies on persona assumptions A1 and A2. The scrolled moment also relies
on A9 and A10 (publishing is the moment that matters).

Excluded:

- the top bar and phase banner, which belong to STY-056 and STY-054 D7 (the owner kept
  the banner as it is);
- the navigation drawer and its unpublished-change dots (STY-054, STY-055);
- the item card itself, whose compact form is a later record (EPC-012 _Out of scope_);
- the families page;
- connecting to Google.

## What every design shares

- STY-056's header and the phase banner, unchanged, scrolling away (STY-054 D7).
- The title row still sticks once scrolled (STY-052 D5). The pending changes still pin
  at the foot below a desktop, with their count, Publish and Discard (STY-052).
- Every control a Product Lead has today stays reachable: Add an item, More (Refresh,
  Publish or Unpublish roadmap), About this roadmap and its Edit, a way to each
  placement with its count and pending mark, and the status, product lead and last
  update.
- Nothing is shown twice in one view. Today the roadmap's page shows "Jump to" and the
  row of placement links one above the other at the top.
- The filler goes: the list's "Every roadmap, published or not." The list's families
  link goes too, since the navigation now holds "Families, categories and
  organisations" on every page (STY-054).
- One left edge, one spacing rhythm, and buttons of one height in a row.
- The app's look: DHCW tokens, type, buttons, tags and cards (ADR-010), drawn from the
  app's own tokens by the skill's stylesheet. No full-width buttons in the header
  (ADR-010), which round 3's stretched phone buttons broke and round 4 restores.
- **Rules no record settles**, which _Decisions needed_ asks about:
  - a phone title uses the large heading size (`text-heading-l`), not the extra-large
    one, so a long title takes three lines rather than four;
  - a roadmap's status label reads "Status: [Live]", so it is not mistaken for the
    service's Beta banner. The glossary keeps "phase" for an item's tag.

## 1. The top of the list and of a roadmap's page

Sam opens the list on a phone, then the roadmap, then scrolls to Next with 2
unpublished changes. She repeats this on an iPad and a desktop. Round 1 drew the list's
top, the roadmap's top and the roadmap scrolled. Later rounds added the moments the
critics asked for:

- About opened and More opened;
- "Jump to" opened, at the top and once scrolled;
- the end of the page, with focus clear of the foot bar;
- a roadmap that is not published;
- Welsh on a phone, an iPad and a desktop;
- the desktop list;
- a short screen, where nothing pins.

| Design (round)                                        | Idea                                                                                                                                                                                                                                                                                                                                                                                                                      | Strengths                                                                                                                                                                                                                                                            | Risks                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Stacked page header (1)                            | One stack on both pages: back link, title, one facts line, one action row, one bar of sections. The facts leave the boxed About, which becomes a text disclosure. The row of links is the only jump control at the top; "Jump to" appears once stuck.                                                                                                                                                                     | The quietest list top of round 1. Nothing is shown twice.                                                                                                                                                                                                            | On a phone, the links cut off after Next. Opening About pushes Add an item down. The jump control changes from links to "Jump to" once stuck.                                                                                                                               |
| B. One section bar that sticks, About in a sheet (1)  | A's stack with a breadcrumb. The links become a bar that sticks under the slim title at every width. About opens as a sheet. The list gains a bar of family links.                                                                                                                                                                                                                                                        | One jump control throughout, the current placement always in view.                                                                                                                                                                                                   | The family bar adds navigation STY-054 settled. The product lead leaves the page. The phone bar clips and orphans a count once stuck.                                                                                                                                       |
| C. A masthead with the horizons at a glance (1)       | A grey band holds the title, facts, vision and three count tiles for Now, Next and Later. Two tiles filter the list.                                                                                                                                                                                                                                                                                                      | Shows the Now / Next / Later shape at a glance.                                                                                                                                                                                                                      | The tallest and busiest: Add an item about 460px down on a phone. The tiles compete with the cards. The filters are new behaviour.                                                                                                                                          |
| D. One stack, a section bar that sticks (2)           | A's stack with B's bar at every width, faded at its edges, with scroll buttons.                                                                                                                                                                                                                                                                                                                                           | The current placement and pending mark are always in view.                                                                                                                                                                                                           | On a phone, the bar is "considerable machinery for six choices" (Sol): arrows, fades, partly shown labels, worse in Welsh.                                                                                                                                                  |
| E. One stack, "Jump to" where the links don't fit (2) | A's stack. The links where all six fit; a "Jump to" menu where they don't.                                                                                                                                                                                                                                                                                                                                                | Nothing clips on a phone, and "Jump to: Next" names where you are.                                                                                                                                                                                                   | The control changed with the language on one iPad. The controls changed order once stuck.                                                                                                                                                                                   |
| F. One stack, "Jump to" below a desktop (3)           | E with a rule by width only: "Jump to" below 1024px, the six links on a desktop, in either language. The facts sit on fixed rows on a phone. About becomes a details link under "Jump to".                                                                                                                                                                                                                                | The desktop is the best of the set, and the six Welsh links fit there.                                                                                                                                                                                               | The iPad's controls end at three different right edges. The controls reorder once stuck. A not-published phone stacks three rows of controls. Phone buttons stretched, against ADR-010.                                                                                     |
| **G. One stack, one control row (4)**                 | F, and: no back link at any width. The facts end with About this roadmap, a quiet 44px disclosure, and a visible Edit. Publish roadmap sits beside the Not published tag. One row of controls in one order, Add an item, More, then "Jump to" (the six links on a desktop), the same at the top and once stuck. On an iPad that row runs to the content's edge. Add is content-width. The phone's pending bar is one row. | Both critics: ships as drawn (8/10). Every page reads top to bottom on one edge: title, facts, About and Edit, controls, placements. The iPad row and the desktop strip settle round 3's split. Nothing a Product Lead has today is lost. Welsh fits at every width. | The refinements in _Not yet drawn_: the Welsh phone strip wraps "Jump to" onto two lines; Edit and Publish roadmap are 32px beside 40px controls; the title stops at 30 characters on an iPad and a desktop; on a desktop, Add and More move from left to right once stuck. |

**Recommendation**: **G** for both pages, with round 4's refinements (_Not yet drawn_)
made as it is built. It answers the complaint with the least new surface:

- each page is one stack on one left edge;
- nothing is shown twice;
- one row of controls in one order, the same at the top and once scrolled;
- About folds into the facts it belongs to, with its Edit in view.

No add-on. B's family bar and breadcrumb, C's tiles and filters, and D's scrolling bar
on a phone are left out.

### Critique rounds

The owner asked for an Opus and a Sol critique of each round, each with a score out of
10, and further rounds until both scored at least 7, up to four. After round 1 the
owner raised the bar to 8, and from round 2 scored only the design each critic rated
highest. Each critic got the same inputs:

- the owner's screenshots, the persona, EPC-012 and ADR-010;
- the round's page and its artboard screenshots;
- from round 2, the earlier critiques, for context;
- never this analysis or its recommendation.

Critiques were kept in the session's scratchpad, not here.

| Round | Page                                                                                          | Opus (Claude Opus)       | Sol (Codex gpt-6.1-sol, high effort) | Outcome                                      |
| ----- | --------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------ | -------------------------------------------- |
| 1     | removed                                                                                       | A 6, B 7, C 4; overall 7 | A 7, B 6, C 5; overall 7             | Both at 7; the owner raised the bar to 8     |
| 2     | removed                                                                                       | D 6, **E 7**             | D 6, **E 7**                         | Below 8: another round                       |
| 3     | removed                                                                                       | **F 7**                  | **F 8**                              | Opus below 8: another round                  |
| 4     | [`page-headers-ux-prototypes.html`](page-headers-ux-analysis/page-headers-ux-prototypes.html) | **G 8**                  | **G 8**                              | Both at 8 in the last round allowed: stopped |

What moved the scores:

- **Round 1.** The critics split: Opus favoured B's one jump control, Sol A's calm
  stack.
- **Round 2.** Both chose E. A clipped, scrolling bar on a phone was the cost they
  would not pay.
- **Round 3.** Opus held F at 7 for the iPad's ragged right edge and controls that
  reorder once stuck.
- **Round 4.** G fixed both, and both critics scored it "ship as drawn, with only
  nits".

## Decisions needed

| #   | Decision                                                                                                                                         | Options                                                                                                                                                                                            | Raised by                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | Which design the top of both pages takes                                                                                                         | (a) G, recommended; (b) F; (c) E; (d) one of round 1's                                                                                                                                             | this analysis                                  |
| 2   | The jump control. It reopens STY-053 D5, which keeps "Jump to" in the stuck row on every device and the row of links in the page, scrolling away | (a) "Jump to" below 1024px and the six links on a desktop, each the same at the top and once stuck, recommended; (b) a section bar on every device (D); (c) as today, both                         | rounds 1–3' critiques; STY-053 D5              |
| 3   | About. It reopens STY-053 D2 and D6, which fold About to a boxed one-line summary                                                                | (a) status, product lead and last update under the title, then About this roadmap (vision, service description, family and category) and Edit, recommended; (b) About in a sheet (B); (c) as today | designs A–G; STY-053 D2, D6                    |
| 4   | The list's top drops "Every roadmap, published or not." and its families link, which the navigation holds (STY-054)                              | (a) drop both, recommended; (b) keep the link on a phone only, where the navigation is a drawer                                                                                                    | every design                                   |
| 5   | The back link                                                                                                                                    | (a) none on any width, here and on the families page, since the header's name and logo and the navigation lead to the list, recommended; (b) "All roadmaps" below a desktop; (c) as today          | the owner's question, 2026-11-18; STY-054      |
| 6   | Publish roadmap, for a roadmap that is not published. It reopens STY-052 D15, which puts it in the title row                                     | (a) beside the Not published tag, under the facts, recommended; (b) in the title row, as today                                                                                                     | rounds 3–4' critiques                          |
| 7   | Add and More once stuck on a phone. STY-052 D18 and D19 make Add an icon there; this extends that to More                                        | (a) both icons ("+", "…"), recommended; (b) Add an icon, More labelled                                                                                                                             | round 3's fix                                  |
| 8   | The phone's pending bar. It changes STY-052's two-row foot bar                                                                                   | (a) one row, the count wrapping, Publish without its icon, recommended; (b) two rows, as today                                                                                                     | rounds 3–4' critiques                          |
| 9   | Refresh on the list                                                                                                                              | (a) an icon button named "Refresh" on a phone, labelled wider, recommended; (b) labelled everywhere; (c) in a "…" menu                                                                             | design A; Sol's critiques                      |
| 10  | A phone title's size                                                                                                                             | (a) the large heading (`text-heading-l`), recommended; (b) the extra-large heading, as today                                                                                                       | the rule the sheet chose; ADR-010's type scale |
| 11  | A roadmap's status label under its title                                                                                                         | (a) "Status: [Live]", recommended; (b) the tag alone, as today                                                                                                                                     | the rule the sheet chose; round 2's critique   |
| 12  | Add and More on a desktop: on the left of the action row at the top and on the right once stuck, as G draws, or the same side in both            | (a) as drawn; (b) right in both; (c) left in both                                                                                                                                                  | round 4's critiques                            |

## Outcome

On 2026-11-18 the owner kept round 4's page, removed rounds 1 to 3's, and accepted
every decision above as posed: option (a) of each, which for decision 12 is G as
drawn. The decisions and round 4's refinements went to
[EPC-013 Tidy page tops](../backlog/EPC-013-tidy-page-tops/README.md):

| Decisions                                          | Record                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1 (the list's frames), 4, 5 (the families page), 9 | [STY-058](../backlog/_archive/EPC-013-tidy-page-tops/STY-058-a-tidy-top-to-the-roadmap-list.md)            |
| 1, 3, 5, 6, 10, 11; the header block's refinements | [STY-059](../backlog/_archive/EPC-013-tidy-page-tops/STY-059-a-roadmaps-page-opens-on-one-header-block.md) |
| 2, 7, 8, 12; the stuck strip's and foot bar's      | [STY-060](../backlog/EPC-013-tidy-page-tops/STY-060-one-row-of-controls-at-the-top-and-once-scrolled.md)   |

Moving the Not published tag onto the status line (Opus, round 4) was left out: the
owner accepted decision 6 as posed. The changes to STY-052, STY-053 and STY-054 are
recorded in their Decisions.

## Not yet drawn

Round 4's refinements, for the build to make (both critics, round 4):

- In Welsh on a phone, "Jump to" in the stuck strip wraps onto two lines. Keep it to one
  line: cut the placement's name with an ellipsis, since its full name stays in the
  button's accessible name and in the open list.
- Make Edit and Publish roadmap 40px, like the other controls in the block, not 32px.
- Let the title run to the content's width on an iPad and a desktop. G caps it at 30
  characters.
- On a not-published roadmap, consider moving the Not published tag onto the status
  line, leaving Publish roadmap alone on its row on a phone (Opus).
- The About toggle:
  - give it a hover underline;
  - rename the facts list's accessible label to "Roadmap details", so it no longer
    shares a name with the toggle.
- On the phone's foot bar, trim Publish's and Discard's padding to give the count room.
  Keep a chevron beside the stuck "…" (Sol).
- On the iPad, the page-end frame shows an empty band above Next. It is an artefact of
  the mock-up, not of the design.

Not drawn in any round:

- the dark theme;
- the list's loading, empty, error and expired states, and the roadmap's not-found and
  expired states;
- a roadmap out of step with its family or category, with its badges;
- a pending title, with its Changed tag, and About with a pending change;
- the added-roadmap notice;
- the families page without its back link.

## What does not change

- STY-056's header, the phase banner and the navigation (STY-054, STY-056).
- The item card, Move and Edit; the publish dialog and conflict review (STY-052).
- The pending-changes store and its rules (ADR-012).
- What the editor reads and writes: these designs move controls, not data, so nothing
  changes for the public site.
- Hash routing and the routes' addresses (ADR-004).
- DHCW's tokens, type and focus styles (ADR-010).

## Related

- [EPC-012 App shell and navigation](../backlog/_archive/EPC-012-app-shell-and-navigation/README.md)
- [STY-052 Keep a roadmap's controls in view](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-052-keep-a-roadmaps-controls-in-view.md)
- [STY-053 Jump between a roadmap's placements](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-053-jump-between-a-roadmaps-placements.md)
- [STY-056 A quieter header](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-056-a-quieter-header.md)
- [Roadmap page shell UX analysis](roadmap-page-shell-ux-analysis.md), which drew the
  sticky title row and "Jump to"
- [Product Lead persona](../backlog/personas/product-lead.md)
