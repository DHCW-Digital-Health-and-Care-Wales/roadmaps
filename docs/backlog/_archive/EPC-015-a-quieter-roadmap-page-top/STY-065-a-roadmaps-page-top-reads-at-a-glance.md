# STY-065: A Product Lead reads the top of a roadmap's page at a glance

- **Status**: Done — the top of a roadmap's page is three rows, "About this roadmap" is
  "Product details", and the Beta banner can be dismissed
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-015-a-quieter-roadmap-page-top](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-010, ADR-008, ADR-012, ADR-002
- **Suggested model**: Opus — it reshapes the header block around the sticky strip, the
  roadmap dialog's two openers and the page's order at three widths, in two languages

## Summary

The top of a roadmap's page holds the right things, but as five rows of tags, text, a
link and buttons. This story makes it three: the title with Add an item and More; one
line of facts ending in a "Product details" disclosure; the jump control. A roadmap not
published gets one notice with Publish roadmap. Edit moves into More and the open
details. "About this roadmap" becomes "Product details", since it describes the
product, and the dialog and its fields are named to match. The Beta banner can be
dismissed until the app is next loaded. What the editor reads and writes does not
change.

## Scope

`features/roadmaps` (the header block, the facts, the product details, More, the roadmap
dialog's opener), `components/layout` (the phase banner), `i18n/` and the tests. Nothing
in `domain/` or `infrastructure/`: no read, write or stored value changes.

## Acceptance criteria

### S1: Three rows at the top

**Given** Product A roadmap, published, with a status label, a product lead and a last
update
**When** the Product Lead opens it on a phone, an iPad or a desktop
**Then** above the first placement they see, top to bottom: the title with the page's
actions on its row; one line of facts ending in "Product details"; then the jump
control
**And** no tag, no Edit button and no Publish row shows among them

### S2: The facts on one line

**Given** a roadmap's page
**When** it opens
**Then** under the title one list named "Roadmap details" holds, in plain text and each
only when the roadmap has it, "Status:" with its label, "Product lead:" with the name
and "Updated" with the date, then the "Product details" disclosure
**And** the status label is text, not a tag, and the line wraps between its items, on a
phone onto two lines

### S3: Product details open in place

**Given** the "Product details" disclosure, closed
**When** the Product Lead presses it
**Then** it expands under the line to show the vision, the service description, the
family (with its colour) and the category, each only when the roadmap has it, and reads
as expanded to a screen reader
**And** the details end in an Edit button, 40px tall, that opens the roadmap dialog and
takes focus back as it closes
**And** with a pending change, the Changed tag shows beside the disclosure while it is
closed, and beside "Undo changes" and Edit once it is open
**And** the disclosure is a line of text that takes a press across at least 44px of
height

### S4: A roadmap not yet published

**Given** Product C roadmap, not published
**When** the Product Lead opens it
**Then** under the facts one notice reads "Not published" and "The public site doesn't
show this roadmap.", with a Publish roadmap button, 40px tall, at its end, or under its
text on a phone
**And** pressing it publishes the roadmap as today, its outcome at the foot (STY-052),
and the notice is gone once the roadmap is published
**And** once the strip sticks, More holds Publish roadmap, as today (STY-059 D7)

### S5: More holds Edit product details

**Given** a roadmap's page
**When** the Product Lead opens More
**Then** it lists "Edit product details", then Refresh, then "Unpublish roadmap" for a
published roadmap
**And** "Edit product details" opens the roadmap dialog, with the details open or
closed, without asking to reconnect after the session has expired, and focus returns to
More as the dialog closes

### S6: From a tablet's width

**Given** the page at 768px or wider, in English or Cymraeg
**When** the Product Lead looks at the top
**Then** Add an item and More sit at the end of the title's row, where they stay once
the strip sticks
**And** the six placement links, with their counts and pending marks, are the only jump
control, under the facts at the top and under the title once stuck, starting on the
page's left edge; where they are short of room they wrap onto another line

### S7: Narrower than a tablet

**Given** the page narrower than 768px
**When** the Product Lead looks at the top
**Then** More is "…" with a chevron, named "More", at the end of the title's row
**And** Add an item and "Jump to" share the row under the facts, Add an item as wide as
its label and "Jump to" growing to the right edge
**And** the stuck strip is as STY-060 S3 has it

### S8: The Beta banner can be dismissed

**Given** the phase banner, on any page
**When** the Product Lead presses its ✕, named "Dismiss message"
**Then** the banner goes and focus moves to the page's content
**And** it stays away on every page while the app stays loaded, and shows again once the
app is loaded again
**And** nothing is stored on the device to remember it

### S9: Names that say what they are about

**Given** the roadmap dialog, opened to edit
**When** the Product Lead reads it
**Then** it is headed "Edit product details", and its first and last fields are
labelled "Roadmap title" and "Roadmap last updated"
**And** "Add a roadmap" labels its title "Roadmap title" too
**And** the publish dialog's list of changes and the conflict review name a roadmap's
change "Product details: " then the field, as in "Product details: Roadmap last updated"

### S10: Welsh, keyboard and the first screen

**Given** the page in Cymraeg at 375px, 640px, 768px, 820px, 1024px and 1280px, or a
keyboard alone
**When** the Product Lead uses the top of the page
**Then** nothing scrolls sideways or passes the right edge, and every control is reached
and named
**And** from 768px Tab reaches Add an item, More, "Product details", Publish roadmap
when it shows, then the placement links, as they are drawn
**And** the first placement still starts on the first screen at 1280×800 (STY-053 S6)

## Decisions

- **D1** (owner, 2026-11-18, review of the working prototype): the top of a roadmap's
  page takes the prototype's layout: the actions on the title's row, the facts as one
  line of plain text, one Not published notice, and the row of placement links from a
  tablet's width, at the top and once stuck. Changes STY-059 S1, S2, S6, S7, D2, D4 and
  D5 ("Status: [Live]" as a tag), and STY-060 S1, S2, S4, D1 and D4.
- **D2** (owner, 2026-11-18, same review, question 1): Edit behind More and the open
  details is acceptable. Changes STY-059 S4 and D6, which put a visible Edit beside the
  disclosure.
- **D3** (owner, 2026-11-18): "About this roadmap" is renamed "Product details", since
  what it holds is about the product the roadmap is for, not the roadmap. Changes
  STY-024's and STY-053's name for it.
- **D4** (owner, 2026-11-18, same review, question 2): the Beta banner is dismissible
  with a ✕, remembered until the page is refreshed completely. Changes STY-054 D7 and
  STY-056, which left the banner as it was.
- **D5** (owner, 2026-11-18): the roadmap dialog, editing, is headed "Edit product
  details", and its date field reads "Roadmap last updated", so the roadmap's own date
  is not read as the product's. Changes STY-043 D4 and STY-036's label.
- **D6** (owner, 2026-11-18): its title field reads "Roadmap title", in "Add a roadmap"
  too, where the label is shared. Changes STY-041's label.
- **D7** (agent, 2026-11-18): "a tablet's width" is 768px (`md`), not the 1024px that
  STY-060 D1 switched the jump control at. At 820px beside a drawer the page is 740px
  wide, wider than the 688px it has at 1024px beside the open navigation, where the
  links already wrap in Cymraeg. The owner saw the links on an iPad, at the top and once
  stuck, in the prototype.
- **D8** (agent, 2026-11-18): the header's controls come before the details in the
  page's order from 768px and after them narrower, so Tab follows what is drawn at each
  width as far as one order can: narrower, More is drawn beside the title and reached
  after Add an item. One order for every width would send Tab from the third row to the
  first and back; a control moved between parents as the strip sticks would lose focus
  (STY-052 D5).
- **D9** (agent, 2026-11-18): the code takes the new name with the copy
  (`ProductDetails`, `roadmaps.productDetails`), over leaving components named About
  that draw "Product details".
- **D10** (agent, 2026-11-18): "Edit product details" in More never asks to reconnect,
  as Edit beside the disclosure never did: it keeps edits pending and writes nothing.
- **D11** (agent, 2026-11-18): the banner's dismissal is held in memory, in the shell,
  over session storage, which a full refresh would keep (D4). Its ✕ takes the name
  every notice's has, "Dismiss message".
- **D12** (owner, 2026-11-18, after D6): the title field reads "Product name", not
  "Roadmap title", in the roadmap dialog and in "Add a roadmap": a roadmap's title is
  the name of the product it is for. Changes D6 and S9's "Roadmap title", and STY-041's
  label; left blank it says "Enter a product name". "Roadmap last updated" stands (D5).

- **D13** (agent, 2026-11-18, correctness review round 1): from 768px the stuck strip
  holds its hidden details between More and the placement links, where D8 puts them in
  the page's order. Shift+Tab from the first link therefore lets the strip go to show
  "Product details", as Shift+Tab from Add an item did before, and no longer reaches
  More; Tab from More still goes on to the links. Kept over one order for every width,
  which would put the top's controls out of the order they are drawn in (D8).

## Starting point

Audited at `82bd14f`. The prototype the owner reviewed was built in the app's own code,
not as frames, so this story's build starts from it. `StickyHeader` keeps each control
in one parent as the strip sticks (STY-052 D5), which is why the narrow layout places
More, Add an item and "Jump to" by grid, not by moving them. `roadmaps.edit.roadmapFields`
labels are shared by the roadmap dialog's two forms, the publish dialog's list of
changes and the conflict review.

## Out of scope

- **The stuck strip's own layout** on a phone and a desktop, which the owner called
  fine: only its jump control between 768px and 1024px changes, with the top's (D7).
- **The navy header**: the page's top tidied without moving anything into it.
- **The roadmap list's top** ([STY-058](../EPC-013-tidy-page-tops/STY-058-a-tidy-top-to-the-roadmap-list.md)).
- **A design-review page and analysis** (the `ux-prototypes` skill's): the owner
  iterated on screenshots of the working prototype instead.

## Delivery

### Departures

- **S9**: the publish dialog's list of changes names a roadmap's change as "Product
  details" with the field under it ("Roadmap last updated"), as it listed "About this
  roadmap" before; only the conflict review joins them with a colon. Built as the
  dialog already drew it (agent: wording drift in the scenario).
- **S9**: the title field reads "Product name", not "Roadmap title" (owner, D12).
- **S10**: narrower than 768px Tab reaches More after Add an item, though it is drawn
  beside the title (agent, D8).

### Contract for dependents

- **Layout**: `RoadmapHeader` picks its layout by the window's width, `TABLET_WIDTH`
  (768px, `lib/use-media-query.ts`): the placement links from it, "Jump to" narrower,
  at the top and once stuck. Its props are `details` (the facts' line) and
  `onEditRoadmap`; `shown` has gone.
- **The roadmap dialog** is the page's: `useRoadmapEdit(roadmap, shown)` gives its
  props and `open(from)`, which the open details' Edit and More both call.
- **Catalogue keys**: `roadmaps.productDetails.*` (was `roadmaps.about.*`),
  `roadmaps.editDetails`, `roadmaps.notPublishedNote`,
  `roadmaps.edit.productNameRequired`. `roadmaps.edit.roadmapFields.title` and
  `.lastUpdated` read "Product name" and "Roadmap last updated" wherever a roadmap's
  field is named: both forms of the roadmap dialog, the publish dialog's list and the
  conflict review.
- **Test hooks**: the disclosure "Product details"; Edit, named "Edit Product
  details", only inside the open details; More's "Edit product details"; the dialog
  "Edit product details"; the banner's "Dismiss message". Unit:
  `openProductDetails`, `openEditRoadmapDialog` (opens the details first)
  (`features/roadmaps/testing/`). E2E: `openProductDetails`, `openEditRoadmapDialog`,
  `openEditRoadmapDialogFromMore`, `contentRight` (`tests/e2e/fixtures/`);
  `focusClearOfBars` now reads once the bars have held still.
- **Data source**: nothing written changes.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `tests/e2e/roadmap-header.spec.ts` (`opens on the title with its controls, the facts line, then the jump control, …`, at 375px, 820px and 1280px, in en and cy); `pages/roadmap-detail-page-header.test.tsx` (`opens on the title, its facts ending in Product details, …`)                                                                                                                                                                                                                                                           |
| S2       | `components/roadmap-facts.test.tsx`; `components/product-details.test.tsx` (`holds the facts as plain text…`); `tests/e2e/roadmap-header.spec.ts` (`reads the facts as plain text on one line from 768px, wrapping on a phone`, `reads the status as text, leaving out what a roadmap has not`)                                                                                                                                                                                                                                       |
| S3       | `components/product-details.test.tsx`; `pages/roadmap-detail-page-editing.test.tsx` (`A roadmap's product details open in place`); `tests/e2e/roadmap-page.spec.ts` (`Product details open in place under a rule, ending in a 40px Edit, a press across 44px`, `Product details holds “Changed” beside its disclosure…`)                                                                                                                                                                                                              |
| S4       | `pages/roadmap-detail-page-header.test.tsx` (`puts one notice under the facts for a roadmap not published…`); `tests/e2e/roadmap-header.spec.ts` (`shows Not published as one notice…`, `publishes the roadmap from its notice…`); `tests/e2e/roadmap-controls.spec.ts` (`moves Publish roadmap into More once the row sticks…`)                                                                                                                                                                                                      |
| S5       | `pages/roadmap-detail-page-header.test.tsx` (`lists Edit product details, then Refresh, then Unpublish roadmap…`, `opens the roadmap dialog with the product details closed, and returns focus to More as it closes`, `opens it without asking to reconnect…`); `tests/e2e/editing-a-roadmap.spec.ts`; `tests/e2e/reconnect.spec.ts`                                                                                                                                                                                                  |
| S6       | `tests/e2e/control-row.spec.ts` (`puts Add an item and More at the end of the title's row on an iPad…`, `shows one jump control at …px`, `shapes the stuck strip at 820/1280px…`); `pages/roadmap-detail-page-header.test.tsx` (the tablet Tab order)                                                                                                                                                                                                                                                                                 |
| S7       | `tests/e2e/control-row.spec.ts` (`puts More at the end of the title's row on a phone…`); `pages/roadmap-detail-page-header.test.tsx` (the narrow Tab order)                                                                                                                                                                                                                                                                                                                                                                           |
| S8       | `components/layout/app-shell.test.tsx` (`is dismissed by its button, which moves focus to the page's content`, `stays away after an in-app navigation…`, `shows again once the app is loaded again, as nothing is stored`); `tests/e2e/shell.spec.ts` (`dismissing the phase banner removes it from every page…`)                                                                                                                                                                                                                     |
| S9       | `tests/e2e/editing-a-roadmap.spec.ts` (`the roadmap dialog is headed for the product details…`); `tests/e2e/adding-a-roadmap.spec.ts` (`labels the title of a roadmap Product name…`); `tests/e2e/editing.spec.ts` (`names a roadmap's own date among its product details, in the review…`); `tests/e2e/last-updated.spec.ts`; `pages/roadmaps-page-adding.test.tsx` (the "Product name" label and "Enter a product name"); `pages/roadmap-detail-page-editing.test.tsx` (`opens the roadmap dialog on every product details field…`) |
| S10      | `tests/e2e/roadmap-header.spec.ts` (`fits …px in Cymraeg…` at 375, 640, 768, 820, 1024 and 1280px, `reaches the controls in the order they are drawn…`, `keeps the first placement on the first screen at 1280×800…`)                                                                                                                                                                                                                                                                                                                 |

Each unit test above for S2 to S6, S8 and S9 was shown red by breaking the finished
code (the status drawn as a tag, the details' controls shown while closed, the notice
without its sentence, More without "Edit product details", the controls after the
details at a tablet's width, a banner that stays, the old label and its error), then
green with the code restored.
