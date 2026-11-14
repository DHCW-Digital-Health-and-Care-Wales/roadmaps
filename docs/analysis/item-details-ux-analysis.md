# Editing an item's details: three editors for a nested list

- **Date**: 2026-11-14
- **Question**: how should a Product Lead write, nest, reorder and remove an item's
  details, the nested list the public site shows under “What this covers”?
- **Scope**: the Details field of an item's edit form, for
  [STY-039](../backlog/_archive/EPC-010-item-details/STY-039-edit-an-items-details.md). Base
  `3d0029e`. Only documents and one prototype page were added; no application code.
- **Prototypes**: [`item-details-ux-analysis/prototypes.html`](item-details-ux-analysis/prototypes.html),
  one self-contained page; open it in a browser. Nesting is something done, not seen,
  so, as for tags and unlike the `ux-prototypes` skill's static desktop and phone
  frames, each design is a working field inside one item card, with the card's width
  and the theme switchable, and the page is written by hand, not assembled. Under each
  design the page shows what publishing would write.

## Readers and where they are

A Product Lead with about 30 minutes a week for roadmaps (persona A1), mostly at a
desk, with a phone for small jobs (A2). They are on a roadmap's page and have chosen
Edit on an item card. The form is inside that card, so the field is narrow everywhere:
about 360px across on a desktop (three cards across), 343px on a phone and 294px at
the narrowest two-across layout, less 20px for each level a detail is nested. Details
are sentences, so this is writing, which the persona does at a desk; fixing a word or
dropping a line is a job for the phone. Today they type the list into a spreadsheet
cell, a line per detail with a hyphen for each level, and cannot see how it will nest
until the public site shows it.

## Journeys covered

| Group                  | Journeys                                                                                                                     | Story   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------- |
| Edit an item's details | write a detail; nest it and move it back out; change its text; reorder; remove; paste lines; confirm or cancel; see the card | STY-039 |

Each relies on the persona's A1 (short visits), A2 (desktop first, phone second) and
A11 (no limit on how much an item says).

Excluded: the Details field shut in the whole form, which follows the field built for
Tags and Organisations (STY-039 S17); publishing and conflict review, which list
the item's details on screens that exist (S14, S15); the Welsh interface; an item with
Welsh details (S18).

## What every design shares

- It is the Details field of the item's edit form. Done keeps the details pending and
  shows the card with its “Changed” tag; Cancel and Escape leave them; nothing is
  written.
- **A list has three levels.** The first detail is at the top level, and a detail is
  at most one level deeper than the one above it.
- **A detail is one line of text**, trimmed. A line break ends it, so pasted lines are
  a detail each; a blank line is none.
- **Hyphens at the start of a detail nest it**, typed or pasted, and are never part of
  its text. So lines copied from the spreadsheet paste as the list they were.
- **What is written is the same**: a line per detail, a hyphen for each level and a
  space (`-- Adult clinics first`), a top-level line with none (STY-039 S14, D14).
- **The Tab key moves on**, in every design: it never nests a detail (STY-039 D6).
- Text typed but not yet kept counts when the form is confirmed.
- The app's look: its input, buttons, tag and focus styles, light and dark.

The sample is the item the tag prototypes edit, “Offer video appointments where
suitable”, on the invented Outpatient Booking roadmap. It has seven details: three at
the top level, “Follow-up appointments in three specialties” with three nested under
it, and “A video call where the clinician and patient agree it suits” with one. None
is at the third level until the reader adds one. The page lists them.

## Edit an item's details

Sam has opened the item's form to bring its details up to date: add a line under one
of the specialties, add a new detail at the end, put the details in a better order,
and drop one that no longer holds.

| Design                  | Idea                                                                                                                                                                                                                                                                                                                                           | Strengths                                                                                                                                                                                                                                                                                           | Risks                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Outline              | The list is written like a document, in one box. Every detail is its own line of text, indented as it will read. Enter starts the next detail; Backspace at the start of one moves it out, or joins it to the one above. Buttons under the list act on the detail being written: Move out, Move in, up, down, Remove. A removal can be undone. | Writing is the main job and this is the fastest way to do it: type, Enter, type. What is seen is the list as it will read. Nesting has a named button and says why when it can't. The list is one stop for the Tab key, then the buttons. The shortest of the three: about 460px for seven details. | The most to build and test: Enter, Backspace and the arrow keys are ours across many fields, and each needs its screen-reader announcement. The buttons sit under the list, so on a phone with a long list they are a scroll away from the detail being written. A detail must be selected before a button means anything, which a first-time reader has to find out.     |
| B. Rows with a menu     | The editor chosen for tags, carried over. Each detail is a row that reads as the card does, with Edit and a menu: add a detail below, add one nested under this, move in, out, up or down, remove. A field under the list adds a detail at the end. A removal can be undone.                                                                   | Every action is a named choice, the same by pointer, keyboard and touch, with nothing to learn. One pattern for tags and details. The safest for a screen reader: each control's name says its detail. Built from what exists (the dropdown menu, the text area).                                   | Slow for writing: each new detail in the middle is a menu, a choice, a field and a button, and a list of seven is fourteen buttons. Nesting is two presses each time. The row's two buttons take 76px from a 294px card, so a third-level detail wraps into a narrow column.                                                                                              |
| C. Text box and preview | The details are one box of text, a line each, with a hyphen at the start of a line to nest it, as in the spreadsheet. Enter starts a line nested as the one above. Move in and Move out add or take away the hyphens of the lines selected. Under the box the list shows as it will read, with a note on any line that can't nest as written.  | The least to build: the form's text area, and a value that is the text written. Nothing to learn for someone who edits the spreadsheet, and the fastest for moving several lines at once. The preview answers what the spreadsheet never did: how it will nest.                                     | Punctuation is the interface: the risk named against the one-line text design for tags, which was not chosen. The list is shown twice, so it is the tallest: about 650px. No control per detail, so STY-039 S13 would be re-cut; a reorder is cut and paste, and a removal has no Undo but the browser's. A mistake shows as a note under the box, not where it was made. |

**Recommendation**: **A, outline**. Details are sentences, and A is the only design
where writing them is plain typing; it shows one list, as it will read, and it is the
shortest. It keeps what C offers a spreadsheet user, since a typed or pasted hyphen
still nests a detail. Its cost is the build and its testing. If that cost is too high
for now, the fallback is C, not B: C is a fraction of the work and is still better than
the spreadsheet, where B makes the commonest job, writing, the slowest.

Considered and not drawn:

- **A list built by place**: each detail has its own “Add under this”, and there is no
  moving in or out. Nothing can nest wrongly, but a detail written at the wrong level
  can only be retyped.
- **A rich-text editor from a library**: bold, links and lists it would then have to
  refuse, and a new dependency, for a format that is hyphens at the start of a line.
- **Tab to nest**, as document editors do: see STY-039 D6.

## Decisions needed

| Decision                                                              | Options                                                                                                    | Where it is asked, and decided    |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Which editor is built                                                 | A (recommended), B or C                                                                                    | decided: A, STY-039 D10           |
| An item's Welsh details when its details are edited                   | read-only for such an item (recommended, as for tags); each detail keeps its Welsh; cleared with a warning | decided: read-only, STY-039 D11   |
| How many levels a list has                                            | three (recommended, as prototyped); as many as are written                                                 | decided: three, STY-039 D12       |
| What the shut Details field shows                                     | the details as the card lists them (recommended); how many there are, on one line                          | decided: the details, STY-039 D13 |
| How a top-level line is written                                       | with no hyphen, as the public site's guide says (recommended, as prototyped); with a hyphen on every line  | decided: no hyphen, STY-039 D14   |
| A and B: the details nested under one that is removed                 | they stay, one level up (recommended, as prototyped); they are removed with it                             | decided: they stay, STY-039 D15   |
| If A: where Enter puts a new detail when others are nested under this | first among those nested, as prototyped; or after them, at this one's level                                | as prototyped: STY-039 D16        |
| If A: Enter in an empty nested detail                                 | moves it out a level, as prototyped and as a document does; or does nothing                                | as prototyped: STY-039 D17        |
| If B: where “Add a detail” at the foot adds                           | at the end, at the top level, as prototyped; or at the level of the last detail                            | not built: STY-039 D10            |
| If C: no control per detail                                           | STY-039 S13 re-cut for a text area; S7 by cut and paste                                                    | not built: STY-039 D10            |

Reads and writes: every design reads only the item's own details. The write of the
`Details` cell is STY-039's own (S14); `Details (cy)` is never written (STY-039 D11).

## Not yet drawn

- The Details field shut in the whole form, beside Tags and Organisations (STY-039
  S17, D13).
- The Welsh interface, and an item with Welsh details, whose details are read-only
  (S18).
- The publish dialog and the conflict review showing two lists side by side (S15).
- An item with no details (S12): each prototype handles it, reached by removing all
  seven, and none starts there.
- A list of twenty or more details, where B is longest and A's buttons are furthest
  from the detail being written.
- axe over the field's states (S13): the prototypes use native controls and a status
  region, and were driven by keyboard and by script, not scanned.

## What does not change

- The card shows details as its nested list under “Details”.
- An edit is pending until the Product Lead publishes; publishing, conflict review and
  Refresh work as ADR-012 sets.
- How details are read from the data source (ADR-011), and how the public site shows
  them.
- No limit on the number or length of details.

## Related

- [STY-039](../backlog/_archive/EPC-010-item-details/STY-039-edit-an-items-details.md) and
  [EPC-010](../backlog/_archive/EPC-010-item-details/README.md).
- [`item-tags-ux-analysis.md`](item-tags-ux-analysis.md): the tag editors, whose
  design B is this analysis's B.
- [`roadmap-tab-format.md`](roadmap-tab-format.md): the `Details` column.
- Persona: `docs/backlog/personas/product-lead.md`.

## Outcome

The owner accepted every recommendation (2026-11-14).

- **Which editor**: A, the outline, as prototyped (STY-039 D10, scenarios S21–S25).
  Enter at the end of a detail that has others nested starts the first of them, and
  Enter in an empty nested detail moves it out (agent; D16, D17). B and C are not
  built.
- **An item's Welsh details**: read-only in the form for now (STY-039 D11, S18, S19).
- **Levels**: three (STY-039 D12, S3, S20).
- **The shut field**: shows the details as the card lists them (STY-039 D13, S17).
- **A top-level line**: written with no hyphen (STY-039 D14, S14).
- **The details nested under one that is removed**: stay, one level up (STY-039 D15,
  S6, S25).
