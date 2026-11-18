# EPC-016: A roadmap's items at a glance — every item a full card, however long

- **Status**: Active — two stories from the compact view UX analysis, with the owner's
  answers of 2026-11-18
- **Progress**: 1 of 2 terminal (STY-066); next selectable: STY-067; blocked on: nothing
- **Binding ADRs**: ADR-002, ADR-005, ADR-008, ADR-010, ADR-011

## Summary

A roadmap's page shows each item as a card holding every field it has. That is right
for reading one item and stays the page's first view. It is wrong for seeing the plan:
a roadmap of 18 items runs to about 8 screens on a desktop and over 12 on a phone, and
one long description makes its card, and its row of cards, as tall as it likes. This
epic gives the Product Lead two things. A card cuts any field that runs past three
lines, with "Show more" to read the rest. And a compact view, chosen by a switch beside
Add an item and More and remembered on the device, shows each item as a row: its title
and, on a desktop, the start of its description, with Move and Edit always in view.
It leaves the table and the board the analysis drew, what a Product Lead may write, and
what the public site shows.

## Owner decisions waiting

None.

## Findings

Audited at `2e073ee` on 2026-11-18, from captures of the app at 1280px and 375px and
the frames of the
[compact view UX analysis](../../analysis/roadmap-compact-view-ux-analysis.md), which
draw a sample roadmap of 18 items at the app's sizes.

### F1 — The page is as long as its items' text

`RoadmapItemCard` shows every field whole, under its label. The sample roadmap's items
area is about 5,000px on a desktop, two cards across beside the open navigation, and
about 7,800px on a phone: about 8 and 12½ screens of the room between the stuck header
and the foot bar. Two cards are in view at once on a desktop and one on a phone.

### F2 — One long field sets a card's height, and its neighbour's

Nothing limits what a Product Lead writes (persona A11), and a field's text wraps
without limit. A description of 85 words makes a card about 500px tall on a desktop,
and every card of its row stretches to the tallest. On a phone that one card is about
a screen.

### F3 — An order is hard to follow among tall cards

"Up one" and "Down one" (STY-050) move an item among cards too tall to see two of at
once on a phone, so the Product Lead reads the Move menu's "2 of 5" in place of the
page.

## Design

1. Any field of a card that runs past three lines shows three, a text ending in an
   ellipsis, with "Show more", which shows it whole in place (F2). STY-066.
2. A switch with the page's actions chooses between Cards and a compact view, kept on
   the device across sessions; Cards is what a Product Lead sees until they choose
   (F1). STY-067.
3. The compact view is rows under the same headings: on a desktop one line that never
   wraps, the title then the start of the description, cut with an ellipsis; on a
   phone the title on the lines it needs. Move and Edit are always in view, and a row
   opens in place to its other fields, cut as a card's are (F1, F3). STY-067.
4. **Unchanged:** the six placements and the unplaced group, in order, under their
   headings; the pending marks; Move, Edit, "Undo changes" and Remove, their names and
   what they do; the top of the page, but for the switch; the foot bar; the item
   dialog; what is read from and written to the data source.

## Shared assumptions and contracts

### One page, two views

Both views draw the same page items in the same groups and order (`usePageItems`,
`groupPageItems`). A view changes no pending edit, and every pending edit shows in
both.

### Display only

Cutting a field and choosing a view change what this editor shows. They change nothing
a Product Lead may write, nothing the repository reads or writes, and nothing the
public site shows.

### Copy

Each new string is in both catalogues (ADR-008), in the product's voice, and reuses
the catalogue's own where it has one: "Move", "Edit", "Undo changes", "Remove",
"Changed", "New".

## Stories

| ID      | Story                                                                                                                                                                         | Area                               | Depends on | State |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | ----- |
| STY-066 | [A Product Lead reads cards of a like height, however long an item's text](../_archive/EPC-016-a-roadmaps-items-at-a-glance/STY-066-a-long-field-is-cut-after-three-lines.md) | Features/UI + i18n (en + cy) + E2E | —          | ✅    |
| STY-067 | [A Product Lead sees a roadmap's items as compact rows, and switches back to cards](STY-067-a-compact-view-of-a-roadmaps-items.md)                                            | Features/UI + i18n (en + cy) + E2E | STY-066    |       |

## Sequencing

STY-066, then STY-067: an opened row shows a card's fields with STY-066's cut, so
STY-067 needs it on the default branch.

## Out of scope

- The table and the board the analysis drew: the owner chose rows. Either could be a
  third choice of the switch if Product Leads ask for it.
- A limit on what a Product Lead may write (persona A11): a later record. Meanwhile
  "Show more" is the sign that an item says too much (STY-066 D3).
- Filtering or sorting a roadmap's items, and dragging one: no record asks for them.
- The roadmap list's cards.

## Defects

None.

## Related

- [Compact view UX analysis](../../analysis/roadmap-compact-view-ux-analysis.md) and
  its prototype page; its _Outcome_ maps each decision to a story here
- [STY-021](../_archive/EPC-004-roadmap-items/STY-021-roadmap-page-shows-items.md),
  whose S2 and D3 these stories change
- [STY-065](../_archive/EPC-015-a-quieter-roadmap-page-top/STY-065-a-roadmaps-page-top-reads-at-a-glance.md),
  which set the top of the page the switch joins
- [Product Lead persona](../personas/product-lead.md), A1, A2 and A11
