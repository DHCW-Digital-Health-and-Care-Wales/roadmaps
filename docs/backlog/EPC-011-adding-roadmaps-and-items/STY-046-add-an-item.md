# STY-046: A Product Lead adds an item

- **Status**: Proposed — grilled with the owner on 2026-11-14 (items rounds 1–3); dialog
  B and empty state B chosen from the prototypes
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: STY-044 (hard, must be on the default branch), STY-045 (hard),
  STY-042 (hard)
- **Binding ADRs**: ADR-012, ADR-014, ADR-011, ADR-005, ADR-008, ADR-010
- **Suggested model**: Opus — a new kind of pending change shown, counted, removed and
  published across the page, the list and the publish dialog

## Summary

A Product Lead adds an item on a roadmap's page instead of in the spreadsheet. One
"Add an item" button opens the item dialog, empty: a title and a horizon or section
are required, and everything else an item has is there. "Add item" closes the dialog;
"Add and start another" keeps it open for the next. A new item shows last in its
horizon, tagged "New", and is pending like any edit: nothing is public until the
roadmap is published or saved. It can be edited, moved or removed before then. An
empty roadmap's panel holds the button. Removing a published item is STY-048.

## Scope

The item dialog's adding form, the button, the new item's card and its place in the
pending changes shown on the page, the roadmap list and the publish dialog; the empty
panel's button (`features/`); copy in both catalogues. The pending new item and its
write are STY-045's.

## Acceptance criteria

### S1: The roadmap's page offers "Add an item" (items round 1 Q1)

**Given** Sam is connected and a roadmap's items have loaded
**When** the page shows
**Then** one "Add an item" button sits with the page's actions
**And** it is unavailable while not connected, while the session has expired, and
while the items can't be read

### S2: The dialog opens empty, with no horizon chosen (items round 2 Q2)

**Given** Sam chooses "Add an item"
**When** the item dialog opens
**Then** it is headed for adding, every field is empty, the horizon or section reads
"Choose a horizon or section", Tags, Organisations and Details are shut, and it says
the item stays unpublished until Sam publishes or saves the roadmap
**And** "Add item" with a blank title, or with no horizon or section chosen, adds
nothing and says so at that field

### S3: "Add item" adds it and closes (items round 2 Q3)

**Given** Sam has typed "Choose a clinic closer to home" and chosen Next
**When** Sam chooses "Add item"
**Then** the dialog closes and the item's card shows last in Next, tagged "New", with
Edit, Move and Remove, and focus on its Edit
**And** nothing is written

### S4: "Add and start another" keeps the dialog open (items round 2 Q3)

**Given** the same input
**When** Sam chooses "Add and start another"
**Then** the item is added as in S3, the dialog stays open and empty with Next still
chosen and focus in the title, and it says "Choose a clinic closer to home" was added
**And** the button shows only when adding, never when editing

### S5: A new item is one pending change (items round 1 Q2)

**Given** a roadmap with one new item
**When** Sam looks at its page, the roadmap list, or tries to leave
**Then** the page counts one unpublished change, or one change to save, the list's
card carries its marker, and leaving, closing the tab or disconnecting asks first, as
for an edit
**And** Refresh keeps the new item, and "Discard all" drops it with the rest

### S6: A new item can be edited, moved and removed before publishing (items round 1 Q5)

**Given** a new item's card
**When** Sam chooses Edit, Move or Remove
**Then** Edit opens the item dialog in its editing form and Move its menu, and what
they change is part of the new item, still one change, with no "Changed" tag or
"Undo changes"
**And** Remove drops the item without asking, as "Undo changes" does for an edit,
and moves focus to "Add an item"; no card of an item the data source holds has
Remove

### S7: Publishing lists it, writes it and drops the tag

**Given** a roadmap with a new item and an edit to another
**When** Sam chooses "Publish changes" or "Save changes"
**Then** the dialog lists the new item under "What changes", as new, by its title
**And** once published its card shows without "New", last in its horizon, and a
conflict in the other edit publishes nothing and keeps the new item pending
(STY-045 S3)

### S8: An empty roadmap's panel holds the button (items round 2 Q1)

**Given** a roadmap with no items and none pending
**When** its page shows
**Then** the "No items yet" panel of STY-042 says to add what the product is doing
now, next and later, and holds "Add an item"; the sentence about the spreadsheet is
gone
**And** once the roadmap has an item, pending or not, the six headings show as on
any roadmap

### S9: A new item counts when publishing an empty roadmap

**Given** a roadmap, not published, whose only items are new and in a horizon
**When** Sam chooses "Publish roadmap"
**Then** the confirmation offers "Save and publish" for them and does not say the
public site will show the roadmap with no items (STY-042 S3)

### S10: Tags are offered both ways

**Given** a roadmap whose items carry tags, and a new item with a tag of its own
**When** Sam opens Tags in the dialog, adding or editing
**Then** the new item is offered the roadmap's tags, and the other items are offered
the new item's (STY-037 S3)

### S11: Closing, Welsh, phone and assistive technology

**Given** Sam has typed into the adding form, in Welsh or English, on a phone or by
keyboard
**When** Sam chooses Cancel, presses Escape, clicks outside, or the session expires
**Then** the dialog behaves as the epic's _The dialogs_ sets: Cancel and Escape drop
the text without asking, a click outside does nothing, an expired session keeps it
**And** every new string is in Welsh, the "New" tag and Remove are named for their
item to a screen reader, and axe finds nothing in the adding form or on a new card

## Tests

S3–S9 need Playwright against the Sheets fake: add, add another, remove, publish and
the empty roadmap, in both themes and at phone width.

## Decisions

- **D1** (owner, 2026-11-14, items round 1 Q1): one button and a dialog (design B),
  over the form as a card in its horizon (A, recommended) and a quick-add line (C).
- **D2** (owner, items round 1 Q5): a new, unpublished item has Remove; removing a
  published item is STY-048.
- **D3** (owner, items round 2 Q1): an empty roadmap shows one panel with the button
  (design B), over the six headings (A) or the three horizons first (C).
- **D4** (owner, items round 2 Q2): no horizon is chosen to start with, over Now or
  the last one used.
- **D5** (owner, items round 2 Q3): "Add item" and "Add and start another", over one
  button that closes.
- **D6** (owner, items round 2 Q4): closing is as for "Add a roadmap".
- **D7** (owner, items round 3 Q3, confirming the agent's choices): "New" tag with
  Edit, Move and Remove; one change; Remove without asking; "Discard all" drops it
  and Refresh keeps it; listed under "What changes"; unavailable while not connected
  or the items can't be read; leaving asks; the spreadsheet sentence goes.
- **D8** (agent): "Add and start another" keeps the horizon just used, though the
  dialog opens with none: a run of items usually shares one, and Sam has just chosen
  it.

## Out of scope

- Removing a published item: STY-048. Choosing an item's place in its horizon:
  STY-049.
- Welsh item text: ADR-012 Option 3.
