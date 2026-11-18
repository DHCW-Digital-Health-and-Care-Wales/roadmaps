# EPC-015: A quieter top to a roadmap's page — one stack, but still a jumble

- **Status**: Done — the owner accepted the working prototype on 2026-11-18
- **Progress**: 1 of 1 terminal (STY-065)
- **Binding ADRs**: ADR-010, ADR-008, ADR-012, ADR-002

## Summary

EPC-013 put the top of a roadmap's page on one left edge, in one stack. Built, the
owner still found it "a jumble of buttons, links, text, tags": every row holds a
different mix of controls, and nothing separates what the page says from what it does.
This epic keeps every control and gives each kind one place: the page's actions on the
title's row, the facts as one line of plain text ending in a disclosure, one notice
when the roadmap is not published, then the jump control. It renames "About this
roadmap" to "Product details", names the dialog and its fields to match, and lets the
Beta banner be dismissed. It moves and renames controls, not data, and leaves the
navy header, the navigation and the item card as they are.

## Owner decisions waiting

None.

## Findings

Audited at `82bd14f` on 2026-11-18 from the owner's screenshots and captures of the
app at 375px, 820px and 1280px.

| Row, top to bottom | What it holds                                                 |
| ------------------ | ------------------------------------------------------------- |
| 1                  | the title                                                     |
| 2                  | "Status:" and a tag, then two facts as text                   |
| 3                  | the Not published tag and a Publish roadmap button            |
| 4                  | the About this roadmap disclosure, a link, and an Edit button |
| 5                  | Add an item, More, then "Jump to" or the placement links      |

### F1 — Five rows, each a different mix

A tag among text, an outlined tag beside a button, a link beside a button, then three
buttons: seven kinds of thing in five rows, each row ending at a different right edge.
What the page says (its facts, its state) and what it does (its actions) alternate.

### F2 — Edit and Publish roadmap sit away from what they act on

Edit, beside a closed disclosure, does not say what it edits; Publish roadmap, beside a
tag, reads as one more button in a column of them.

### F3 — On an iPad the jump control is a select the page's width

"Jump to" below 1024px grows to the content's edge, 500px of button for six choices,
though the page there is wider than a small desktop's beside the navigation.

### F4 — "About this roadmap" names the wrong thing

The vision, service description, family and category describe the product the roadmap
is for. The dialog that edits them, "Edit this roadmap", also holds the roadmap's own
title and last update, unlabelled as such.

### F5 — The Beta banner takes a row of every screen for good

A Product Lead who has read it cannot put it away: 46px on a desktop and 62px on a
phone, above every page.

## Design

1. The page's actions, Add an item and More, sit at the end of the title's row from a
   tablet's width, at the top and once stuck; narrower, More sits there as "…" and Add
   an item shares the row under the facts with "Jump to" (F1). STY-065.
2. The facts are one line of plain text, ending in the "Product details" disclosure; its
   Edit is inside it, and in More as "Edit product details" (F1, F2). STY-065.
3. A roadmap not published shows one notice, saying what that means and holding Publish
   roadmap (F1, F2). STY-065.
4. The jump control is the row of placement links from 768px, "Jump to" narrower, the
   same at the top and once stuck (F3). STY-065.
5. "Product details" names the disclosure, the dialog ("Edit product details") and a
   roadmap's changes in the publish dialog and the conflict review; the roadmap's title
   is labelled "Product name", and its own date says so ("Roadmap last updated") (F4).
   STY-065.
6. The Beta banner can be dismissed until the app is next loaded (F5). STY-065.
7. **Unchanged:** the navy header and the navigation (STY-054, STY-056); the stuck
   strip narrower than 768px and its menu button (STY-060); the item card, Move and
   Edit; the publish dialog and conflict review beyond the names above; the
   pending-changes store and its rules (ADR-012); what the editor reads and writes;
   DHCW's tokens, type and focus styles (ADR-010); pinning only above 500px of viewport
   height (STY-052 D18).

## Shared assumptions and contracts

### The prototype is the reference

The owner reviewed a prototype built in the app's own code, over three rounds of
screenshots on 2026-11-18, in place of a design-review page. STY-065's scenarios
describe it; where they differ from a screenshot, the story wins.

### Widths

A tablet's width is 768px (`TABLET_WIDTH`, `lib/use-media-query.ts`). Every row fits its
Cymraeg labels at 375px, 640px, 768px, 820px, 1024px and 1280px without sideways scroll,
and no control passes the right edge.

## Stories

| ID      | Story                                                                                             | Area                               | Depends on | State |
| ------- | ------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | ----- |
| STY-065 | [The top of a roadmap's page reads at a glance](STY-065-a-roadmaps-page-top-reads-at-a-glance.md) | Features/UI + i18n (en + cy) + E2E | —          | ✅    |

## Sequencing

One story, since the layout, the names and the roadmap dialog's second opener change the
same header block and the same tests.

## Out of scope

- **Moving anything into the navy header**: the owner allowed it, and the page's top
  tidied without it.
- **The roadmap list's top**, which STY-058 settled.
- **A compact item card** and **a Now / Next / Later board**: EPC-012 _Out of scope_.

## Defects

None.

## Related

- [EPC-013 Tidy page tops](../EPC-013-tidy-page-tops/README.md), whose STY-059
  and STY-060 this epic changes
- [Page headers UX analysis](../../../analysis/page-headers-ux-analysis.md), which drew
  design G
- [ADR-010](../../../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md)
- [Product Lead persona](../../personas/product-lead.md)
