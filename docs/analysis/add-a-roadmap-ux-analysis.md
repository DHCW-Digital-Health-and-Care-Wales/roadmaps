# Adding a roadmap and its items: twelve mock-ups over four journeys

- **Date**: 2026-11-14
- **Question**: where does a Product Lead add a roadmap, and an item to a roadmap; how
  much does each form ask; and where are they afterwards?
- **Scope**: the roadmap list and a roadmap's page, for
  [EPC-011](../backlog/EPC-011-adding-roadmaps-and-items/README.md). Base `400c90c`.
  Only documents and one prototype page were added; no application code.
- **Prototypes**: [`add-a-roadmap-ux-analysis/add-a-roadmap-ux-prototypes.html`](add-a-roadmap-ux-analysis/add-a-roadmap-ux-prototypes.html),
  one self-contained page of static mock-ups, each with a desktop and a phone frame;
  open it in a browser. Its mock-ups approximate the app's look: the `ux-prototypes`
  stylesheet is not yet the DHCW one (CHO-009).

## Readers and where they are

A Product Lead with about 30 minutes a week for roadmaps (persona A1), mostly at a
desk, with a phone for small jobs (A2). Starting a roadmap happens a few times a year,
at a desk, and is followed by writing: what the roadmap is about, then its first
items. Adding one item to a roadmap that exists is a routine job on any visit. Today
both are done by hand in the shared spreadsheet (A3).

## Journeys covered

| Group                     | Journeys                                                                           | Stories          |
| ------------------------- | ---------------------------------------------------------------------------------- | ---------------- |
| 1. Start adding a roadmap | open the form; say what the roadmap is; see its public address; add or cancel      | STY-041          |
| 2. Just after adding      | see that it was added and is not published; find it; see what to do next           | STY-041, STY-042 |
| 3. Add an item            | open the form; write the item; choose its horizon; see it pending among the others | STY-046, STY-047 |
| 4. An empty roadmap       | see that a roadmap has no items; add its first                                     | STY-042, STY-046 |

Each relies on A1 (short visits), A2 (desktop first), A9 and A10 (nothing is public
until a deliberate publish) and A12 (a co-lead may be working on the same data).

Excluded: connecting to Google; publishing and its conflict review, which exist
(EPC-005, EPC-008); the Welsh interface; removing a roadmap or an item and reordering
items, which are recorded for later (STY-048 to STY-050).

## What every design shares

- **A new roadmap is written at once and starts not published**: a new entry in the
  roadmap list and an empty roadmap copied from the template, together or not at all.
- **A roadmap has a short name**, which becomes the end of its public address and
  can't be changed in the editor afterwards. Each design shows the address before
  adding.
- **A new item is a pending edit**: tagged "New", counted with the roadmap's
  unpublished changes, and written only when the roadmap is published or saved.
- A title is required in every form; the designs differ in what else is. English only.
- The app's look: its header band, cards, buttons and badges.

The sample is invented. On Saturday 14 November 2026, Sam Evans, who leads Outpatient
Booking, starts the Community Nursing roadmap. Five roadmaps exist, one not published;
at 10:41 Sam's is added, making six and two. At 11:05 Sam adds an item to Outpatient
Booking, its one unpublished change, and at 11:10 is writing a second.

## 1. Start adding a roadmap

Sam has chosen "Add a roadmap" on the roadmap list and typed what the form asks.

| Design               | Idea                                                                                                                                                                   | Strengths                                                                                                                                           | Risks                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. On the list       | A small form opens at the top of the list, as "Add a family" does. It asks the title alone and shows the address it gives, with Change. The rest is edited afterwards. | The least to build: one form, no new component. Nothing is asked twice, since "About this roadmap" already edits everything else.                   | Two steps: the roadmap is filed under "No product family" until Sam edits and saves it. The short name is a link to change, easy to miss for a value that is for good. |
| B. A dialog          | A dialog over the list asks the essentials: title, short name, product family, category, product lead.                                                                 | The card is filed under its family and shows who leads it from the start. The short name is a field, in plain sight. The list stays visible behind. | The app's first dialog form: a new component, with focus and closing rules to settle. Writes a family and category at creation, which A leaves to an existing write.   |
| C. A page of its own | A new page asks everything "About this roadmap" holds, with a preview of the card.                                                                                     | One step, nothing to finish later. Room for hints on the writing fields, and the preview answers "how will it look?".                               | The most to build, and a second copy of the About form to keep in step. Asks for a vision before the roadmap exists, on a job the persona does in short visits.        |

**Recommendation**: **A**. Everything but the title already has an editor, and the
roadmap is not public, so nothing is rushed. B is the fallback if the roadmap should
be filed correctly from the first moment.

## 2. Just after adding

The roadmap was added at 10:41 with its title alone, so these frames show the emptiest
case.

| Design                        | Idea                                                                                                  | Strengths                                                                                                    | Risks                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| A. Stay on the list           | The list shows a notice with a link to the new roadmap, its card under its family, and the new count. | Sam sees where it was filed. Good for adding several in a row.                                               | One more click before any work on it, and the next jobs are all on its page.                              |
| B. Open the new roadmap       | Sam lands on its page with a notice. About is a bordered panel; "No items yet" is a dashed panel.     | The next jobs (what it's about, items, publishing) are here. Nothing new to learn: it is the roadmap's page. | An empty page, and until an item can be added here its empty state can only point to the spreadsheet.     |
| C. Open it, with set-up steps | As B, with a panel listing what is left: say what it's about, add items, publish.                     | Guides a first-timer through a job done rarely.                                                              | A new panel to build, and a rule for when it goes away. Its "Add an item" step needs journey 3 delivered. |

**Recommendation**: **B**. The work that follows is on the roadmap's page, and B adds
nothing to maintain.

## 3. Add an item

Sam is on Outpatient Booking, which is published, with one new item already pending,
and is writing a second for Next.

| Design            | Idea                                                                                                                 | Strengths                                                                                                                            | Risks                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A. In its horizon | Each horizon and section ends with "+ Add an item", which opens the item's form as a card there, its horizon chosen. | The item is written where it will sit, among its neighbours. Reuses the card form as it is.                                          | Six add controls on the page. The form is as narrow as a card, which is why Tags, Organisations and Details start shut.                       |
| B. A dialog       | One "Add an item" button opens the item's form in a dialog, with the horizon as a field.                             | One control. More room than a card. The same model as adding a roadmap, and it can become the one place an item is added and edited. | The roadmap is behind the dialog while Sam writes. A long form in a dialog on a phone. A horizon must be chosen, so it can be chosen wrongly. |
| C. Quick add      | Under each heading is a line: a title and Enter adds a card with the title alone; the rest is written with Edit.     | The fastest way to get ten titles down on a new roadmap.                                                                             | Items start half-written, each needing a second visit, and a title-only item can be published as it is. Six more fields on the page.          |

**Recommendation**: **A**. It keeps the persona's "edit where they see it" and needs no
choice of horizon. B is the better choice if editing is to move into a dialog as
well, since then one component serves both.

## 4. An empty roadmap

Sam opens Community Nursing at 11:10. It has a product lead, saved at 10:52, and no
items.

| Design                      | Idea                                                                                        | Strengths                                                                | Risks                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| A. Every heading            | The six headings as on any roadmap, each saying "No items", each with its add control.      | An empty roadmap is not a special case. Shows the format from the start. | Six empty headings and six controls to read past. Only fits design 3A.              |
| B. One panel                | The dashed "No items yet" panel, with one line on what to add and one "Add an item" button. | One clear next step. Fits any of the three ways to add an item.          | Says nothing of the six placements until there is an item.                          |
| C. The three horizons first | Three boxes, Now, Next and Later, each saying what it means, each with its add control.     | Teaches the format to someone starting their first roadmap.              | A layout only empty roadmaps have. Hides the three sections until there is an item. |

**Recommendation**: **B**, with whichever design is chosen for journey 3.

Considered and not drawn: **adding a roadmap as a copy of an existing one**, which
would carry items that are not the new product's; **a wizard**, for a form of five
fields.

## Decisions needed

| Decision                                                  | Options                                                                                           | Where it is asked, and decided                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Where a roadmap is added, and how much is asked           | A (recommended), B or C                                                                           | decided: B, STY-041 D1                                    |
| Where the short name comes from                           | suggested and changeable (recommended); the whole title; squeezed like `ProductA`; always typed   | decided: suggested, STY-041 D2                            |
| What a short name may hold                                | letters, numbers, spaces and hyphens (recommended); anything a tab's name allows                  | decided: letters, numbers, spaces and hyphens, STY-040 D8 |
| When a new roadmap is written                             | at once (recommended); pending until saved                                                        | decided: at once, STY-040 D2                              |
| Whether it starts published                               | never (recommended); a tick box; always                                                           | decided: never, STY-040 D3                                |
| Where Sam is after adding                                 | A, B (recommended) or C                                                                           | decided: B, STY-041 D3                                    |
| A short name a tab already has                            | refused (recommended); the existing tab is listed                                                 | decided: refused, STY-040 D7                              |
| No usable template                                        | refused, naming who fixes it (recommended); a plain tab is built                                  | decided: refused, STY-040 D4                              |
| The copied template's example rows                        | deleted, as asked (recommended); emptied, keeping their formatting                                | decided: deleted, STY-040 D5                              |
| Publishing a roadmap the public would see empty           | allowed, and the dialog says so (recommended); unchanged; refused                                 | decided: says so, STY-042 D3, D4                          |
| The same title as another roadmap                         | allowed (recommended); refused                                                                    | decided: allowed, STY-040 D6                              |
| Closing a dialog that holds text                          | Cancel and Escape drop it, a click outside does nothing (recommended); ask first; all three close | decided: as recommended, STY-041 D5                       |
| Where an item is added, and how much is asked             | A (recommended), B or C                                                                           | decided: B, STY-046 D1                                    |
| When a new item is written                                | pending until published (recommended); at once                                                    | decided: pending, STY-045 D1                              |
| Where a new item shows in its horizon                     | last (recommended); first; chosen                                                                 | decided: last, STY-045 D2                                 |
| Where a new item may be added                             | any horizon or section (recommended); the three horizons                                          | decided: any, STY-045 D3                                  |
| The horizon when the dialog opens                         | none chosen (recommended); Now; the last used                                                     | decided: none, STY-046 D4                                 |
| After "Add item"                                          | "Add and start another" as well (recommended); the dialog just closes                             | decided: both buttons, STY-046 D5                         |
| What an empty roadmap shows                               | A, B (recommended) or C                                                                           | decided: B, STY-046 D3                                    |
| Removing a roadmap, removing a published item, reordering | a record each for later (recommended); out of scope; in this epic                                 | decided: recorded, STY-048, STY-049, STY-050              |

Reads and writes: adding a roadmap needs a write the repository does not have
(STY-040), which copies the `Template` tab, never read until now (STY-040 D1). A new
item needs a pending change with no item behind it, and its write (STY-045). The
journey 2 and 4 pages read only what the roadmap's page reads today.

## Not yet drawn

- Every refusal in the "Add a roadmap" dialog: a short name in use, a family or
  category that has gone, no usable template, a failed write (STY-041 S4, S6, S7).
- The dialogs in their editing forms: "About this roadmap" (STY-043) and an item
  (STY-044). Each is its adding form with the current values, drawn in journeys 1B
  and 3B.
- "Add and start another", and the dialog's message that an item was added (STY-046
  S4).
- The publish dialog listing a new item, and its line for a roadmap the public would
  see empty (STY-047 S1, STY-042 S3).
- Reconnect inside the "Add a roadmap" dialog after the session expires (STY-041
  S11).
- The Welsh interface, dark mode, the loading and expired-session states, and keyboard
  focus and screen-reader names, which the stories' scenarios set.

## What does not change

- An edit is pending until the Product Lead publishes; publishing, conflict review and
  Refresh work as ADR-012 sets.
- What each field writes, and how roadmaps and items are read (ADR-009, ADR-011).
- The roadmap list's grouping by family, its cards and its counts.
- Move on an item's card.

## Related

- [EPC-011](../backlog/EPC-011-adding-roadmaps-and-items/README.md) and its stories,
  STY-040 to STY-050.
- [`roadmaps-tab-format.md`](roadmaps-tab-format.md) and
  [`roadmap-tab-format.md`](roadmap-tab-format.md): the roadmap index, the roadmap tab
  and the `Template` tab.
- [`item-tags-ux-analysis.md`](item-tags-ux-analysis.md) and
  [`item-details-ux-analysis.md`](item-details-ux-analysis.md): the fields the item
  dialog holds.
- Persona: `docs/backlog/personas/product-lead.md`.

## Outcome

Decided with the owner on 2026-11-14, in the grilling rounds the stories cite.

- **Start adding a roadmap**: B, the dialog with the essentials, not the recommended A
  (STY-041 D1, D4).
- **Just after adding**: B, the new roadmap opens (STY-041 D3). The owner also chose
  B's look for the page, which differs from today's: About as a bordered panel with
  Edit beside its heading, and a dashed "No items yet" panel (STY-042 D1).
- **Add an item**: B, one button and a dialog, not the recommended A (STY-046 D1).
- **An empty roadmap**: B, one panel with the button (STY-046 D3).
- **Beyond the designs**: the owner asked that editing converge on the two dialogs, so
  one component adds and edits a roadmap (STY-043) and one an item (STY-044), and the
  in-place forms go. A, C and the in-place forms are not built.
