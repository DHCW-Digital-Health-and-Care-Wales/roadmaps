# Editing an item's tags: four editors compared

- **Date**: 2026-11-13
- **Question**: how should a Product Lead add, rename and remove an item's tags, and be
  offered the tags the roadmap already uses?
- **Scope**: the Tags field of an item's edit form, for
  [STY-037](../backlog/EPC-009-item-tags/STY-037-edit-an-items-tags.md). Base
  `52850bf`. Only documents and one prototype page were added; no application code.
- **Prototypes**: [`item-tags-ux-analysis/prototypes.html`](item-tags-ux-analysis/prototypes.html),
  one self-contained page; open it in a browser. The owner asked for prototypes of the
  component alone, to try (STY-037 D2). So, unlike the `ux-prototypes` skill's static
  desktop and phone frames, each design is a working field inside one item card, with
  the card's width and the theme switchable, and the page is written by hand, not
  assembled.

## Readers and where they are

A Product Lead with about 30 minutes a week for roadmaps (persona A1), mostly at a
desk, with a phone for small jobs (A2). They are on a roadmap's page and have chosen
Edit on an item card. The form is inside that card, so the field is narrow everywhere:
about 360px across on a desktop (three cards across), 343px on a phone and 294px at
the narrowest two-across layout. Tagging is a small job, the kind the persona expects
to do on a phone too. The pain the field answers is _Inconsistent tags_: free text
that drifts ("Patients", "patient", "Citizen").

## Journeys covered

| Group                      | Journeys                                                                                                  | Story            |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------- |
| Edit an item's tags        | add a typed tag; add one the roadmap's other items carry; rename; remove; confirm or cancel; see the card | STY-037          |
| The Tags field in the form | open the form; open the tags editor; shut it; confirm the form; the same for Organisations                | STY-037, STY-038 |

Each relies on the persona's A1 (short visits), A2 (desktop first, phone second), A8
(free-text tags, a shared list later) and A12 (a co-lead may have tagged other items).

Excluded: publishing and conflict review, which list the item's tags on screens that
exist (STY-037 S12, S13); the Welsh interface; an item with Welsh tags (STY-037 S20).

## What every design shares

- It is the Tags field of the item's edit form. Done keeps the tags pending and shows
  the card with its "Changed" tag; Cancel and Escape leave them; nothing is written.
- **Tags offered** are those the roadmap's other items carry and this item lacks, most
  used first, then alphabetical. Typed text narrows them to the tags that hold it. C
  departs: it lists every tag in the roadmap alphabetically, and typing narrows nothing.
- **A typed tag** is trimmed. A comma or a line break ends it, so "Carers, Clinic staff"
  typed or pasted is two tags. A new tag joins at the end.
- **No tag twice** on an item, whatever its capitals: the field says the item has it.
- **A typed tag takes the roadmap's spelling** where one differs only in capitals
  ("clinic staff" becomes "Clinic staff"), and the field says so (STY-037 D15).
- **A rename** keeps the tag's place and changes this item only; a rename to nothing
  leaves the tag as it was.
- Text typed but not yet added, and a name still being changed, count when the form is
  confirmed.
- The app's look: its input, buttons, tag and focus styles, light and dark.

The sample is one invented roadmap, Outpatient Booking, with seven items. The item
edited, "Offer video appointments where suitable", is tagged "Patients" and "Video
consultations". The six others carry "Patients" (three items), "Appointments" (two),
"Clinic staff" (two), and "Community care", "patient", "Self-service", "Waiting lists"
and "Welsh language" (one each). "patient" beside "Patients" is the drift left in on
purpose. The page lists the items.

## Edit an item's tags

Sam has opened the item's form to fix its tags: add one or two the roadmap already
uses, add a new one, correct a spelling, drop one that no longer fits.

| Design                  | Idea                                                                                                                                                                                                                                             | Strengths                                                                                                                                                                                                          | Risks                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Type-ahead box       | Tags sit inside one box. Typing opens a list of the roadmap's other tags with their counts; Enter takes the highlighted one, a comma keeps what was typed. A tag's name is a button that renames it; × or Backspace twice removes.               | The shortest form: one box, whatever the number of tags. Fastest for a keyboard user who knows the tag. The familiar tag box of other tools.                                                                       | The offered tags are hidden until Sam types or selects the box. Rename is a hidden affordance. The open list covers Done and Cancel until it closes. "Enter takes the highlighted tag, a comma keeps yours" has to be learned: typing "Car" and Enter adds "Community care", not "Car". A new primitive (shadcn's Combobox), with rename ours to add. |
| B. List and suggestions | Each tag is a row with Rename and Remove, which show as icons where a row is too narrow for both beside the tag (STY-037 D10). Under an "Add a tag" field, the roadmap's other tags are buttons, narrowed as Sam types. A removal can be undone. | Nothing opens or hides, so the roadmap's tags are seen before any typing, which is the nudge towards consistency. Every action is a named button, the same by pointer, keyboard and touch. Built from what exists. | The longest form: a row per tag and a block of offered tags, in a card that already holds six fields. A roadmap with many tags gives a long block until typing narrows it.                                                                                                                                                                            |
| C. Tick list            | Every tag in the roadmap is a checkbox with how many other items carry it, as organisations are. A new tag is typed under the list; a ticked tag can be renamed.                                                                                 | Shows the roadmap's whole vocabulary, so "patient" and "Patients" sit one above the other. The pattern the form already uses for organisations.                                                                    | Grows with the roadmap, not the item: thirty tags are thirty rows for an item with two. The item's tags are scattered through the list. Their order follows the ticking, so unticking and re-ticking moves a tag to the end. Removing is unticking, which reads as "not this one", not "remove".                                                      |
| D. One line of text     | One text field, tags separated by commas, as in the spreadsheet. The roadmap's other tags are buttons that finish the tag being typed or add one at the end; a line reads back the tags that will be kept.                                       | The cheapest: the form's existing text field and string value. Nothing to learn for someone who edits the spreadsheet. Bulk edits by typing.                                                                       | No control per tag, so STY-037 S1 and S11 would be re-cut. Punctuation is the interface: a stray comma or a caret in the wrong place on a phone. A rename can't be told from a removal and an addition, which matters if tags keep their Welsh (Q2 (b)).                                                                                              |

**Recommendation**: **B, list and suggestions**. It answers the pain the field exists
for, since the roadmap's tags are in view before Sam types; it needs no new primitive
and no learned keys; and it behaves the same on the phone. Its cost is height. If
trying it shows the form too long, the add-on is A's box for the item's own tags with
B's always-visible buttons under it, not A's hidden list.

## The Tags field in the item's edit form

The form already holds six fields. In a desktop card it is about 1,400px tall, of which
Organisations takes about 620px; open, editor B adds about 340px. The last figure on
the prototype page is the whole form, with Tags and, at the owner's request,
Organisations both opening on request: shut, the form is about 860px.

| Design                                   | Idea                                                                                                                                                                                                                      | Strengths                                                                                                            | Risks                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shut                                     | The field shows the item's tags on one line beside "Change tags" ("Add tags" when there are none). Choosing it opens editor B in place, with focus in "Add a tag"; "Close tags" shuts it. Done keeps the tags either way. | The form grows by one line for an item whose tags are right, which is most visits. The tags can be read at a glance. | One more press before the first change. The roadmap's other tags are out of sight until the field is opened.                                           |
| Open                                     | The whole editor shows as the form opens, as Organisations does.                                                                                                                                                          | Nothing to find, and the roadmap's tags are in view at once.                                                         | The longest form: about a quarter more to scroll past on every edit, whatever is being edited.                                                         |
| The item's tags open, the roadmap's shut | The rows and "Add a tag" always show; "Used elsewhere in this roadmap" shows only while Sam is adding.                                                                                                                    | Shorter than open, with rename and remove one press away.                                                            | The offer that nudges towards one spelling is hidden until Sam starts typing. A block that appears on focus moves the fields under it. Not prototyped. |

**Recommendation**: **Shut**. Most visits to the form are for something other than tags,
and the one line still says what the tags are.

## Decisions needed

| Decision                                                                                               | Options                                                                                                                     | Where it is asked                                      |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Which editor is built                                                                                  | B (recommended), A, C or D                                                                                                  | decided: STY-037 D11                                   |
| An item's Welsh tags when its tags are edited                                                          | read-only for such an item (recommended); each tag keeps its Welsh; cleared with a warning; left as they are                | decided: read-only, STY-037 D14                        |
| A typed tag takes the roadmap's spelling                                                               | yes, as prototyped (recommended); no                                                                                        | decided: yes, STY-037 D15                              |
| If A: a new primitive                                                                                  | shadcn's Combobox (Base UI) joins `src/components/ui/`, with in-place rename built on it                                    | not built: STY-037 D11                                 |
| If A: which key keeps typed text                                                                       | Enter takes the highlighted tag and a comma keeps what was typed, as prototyped; or Enter keeps what was typed              | not built: STY-037 D11                                 |
| If B: Undo after a removal                                                                             | kept, as prototyped; or left to Cancel and "Undo changes"                                                                   | decided: kept, STY-037 D11                             |
| If B: icons on a narrow row                                                                            | all rows switch together when any tag is too wide to sit beside worded buttons, as prototyped; or by the card's width alone | decided: as prototyped, STY-037 D10                    |
| How the Tags field opens in the form                                                                   | shut, as prototyped (recommended); open; the item's tags open and the roadmap's shut                                        | decided: shut, STY-037 D13; Organisations too, STY-038 |
| If C: removing is unticking; tags ordered by ticking; the list alphabetical and not narrowed by typing | accepted as departures from STY-037 S1, S3 and S5                                                                           | not built: STY-037 D11                                 |
| If D: no control per tag                                                                               | STY-037 S1 and S11 re-cut for a text field                                                                                  | not built: STY-037 D11                                 |

Reads and writes: every design reads only the roadmap's items already on the page,
pending edits included. The write of the `Labels` cell is STY-037's own (S12);
`Labels (cy)` is never written (STY-037 D14).

## Not yet drawn

- The Welsh interface, and an item with Welsh tags, whose tags are read-only (STY-037
  S20).
- The publish dialog and the conflict review naming tags among changed fields.
- A roadmap whose other items have no tags (STY-037 S10), and one with thirty or more,
  where B's block and C's list are longest.
- Another item's pending tags among those offered (S3): the sample has none pending.
- The third way to open the field: the item's tags open and the roadmap's shut.
- axe over the field's states (S11): the prototypes use native controls and a status
  region, and were tried by keyboard, not scanned.

## What does not change

- Tags are free text; no list is stored, shared or enforced.
- The card shows tags as its one "Tags" line.
- An edit is pending until the Product Lead publishes; publishing, conflict review and
  Refresh work as ADR-012 sets.
- How tags are read from the data source (ADR-011).

## Related

- [STY-037](../backlog/EPC-009-item-tags/STY-037-edit-an-items-tags.md) and
  [EPC-009](../backlog/EPC-009-item-tags/README.md).
- [`roadmap-tab-format.md`](roadmap-tab-format.md): the `Labels` column.
- Persona: `docs/backlog/personas/product-lead.md`.

## Outcome

- **Which editor**: B, list and suggestions, with its row buttons as icons where words
  would not fit, and Undo after a removal (owner, 2026-11-13; STY-037 D10 and D11,
  scenarios S15–S18).
- **How the field opens in the form**: shut, opening on request (owner, 2026-11-13;
  STY-037 D13, scenario S19). The owner asked the same of Organisations, which is
  STY-038.
- **An item's Welsh tags**: read-only in the form for now (owner; STY-037 D14, S20).
- **Spelling**: a typed tag takes the roadmap's (owner; STY-037 D15, S21).
