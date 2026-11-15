# STY-046: A Product Lead adds an item

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: STY-044 (hard, must be on the default branch), STY-045 (hard),
  STY-042 (hard)
- **Binding ADRs**: ADR-012, ADR-014, ADR-011, ADR-005, ADR-008, ADR-010
- **Suggested model**: Opus — a new kind of pending change, shown, counted and removed
  on a page built around items the data source already holds
- **Delivered**: _the PR's URL, once it is open_

## Summary

A Product Lead adds an item on a roadmap's page instead of in the spreadsheet. One
"Add an item" button opens the item dialog, empty: a title and a horizon or section
are required. "Add item" closes the dialog; "Add and start another" keeps it open for
the next. A new item shows last in its horizon, tagged "New", and is pending like any
edit: nothing is public until the roadmap is published or saved. It can be edited,
moved or removed before then. An empty roadmap's panel holds the button. How the
publish dialog names a new item is STY-047; removing a published item is STY-049.

## Scope

The item dialog's adding form, the button, the new item's card and its place in the
pending changes the page and the roadmap list count; the empty panel's button; the
tags offered and the empty-roadmap line once a roadmap has new items (`features/`);
copy in both catalogues. The pending new item and its write are STY-045's; the
publish dialog's list is STY-047's.

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

### S7: Publishing writes it and drops the tag

**Given** a roadmap with a new item
**When** Sam publishes or saves its changes
**Then** the item is written (STY-045 S2), its card shows without "New", last in its
horizon, and the notice confirms the publish as it does for edits

### S8: An empty roadmap's panel holds the button (items round 2 Q1)

**Given** a roadmap with no items and none pending
**When** its page shows
**Then** the "No items yet" panel of STY-042 says to add what the product is doing
now, next and later, and holds "Add an item"; the sentence about the spreadsheet is
gone, and its copy has left both catalogues
**And** once the roadmap has an item, pending or not, the six headings show as on
any roadmap

### S9: Closing, Welsh, phone and assistive technology

**Given** Sam has typed into the adding form, in Welsh or English, on a phone or by
keyboard
**When** Sam chooses Cancel, presses Escape, clicks outside, or the session expires
**Then** the dialog behaves as the epic's _The dialogs_ sets, and "Add item" still
works while expired (the epic's _An expired session_)
**And** every new string is in Welsh, the "New" tag and Remove are named for their
item to a screen reader, and axe finds nothing in the adding form or on a new card

### S10: A new item counts when publishing an empty roadmap (round 3 Q1)

**Given** a roadmap, not published, whose only items are new and in a horizon
**When** Sam chooses "Publish roadmap"
**Then** the confirmation offers "Save and publish" for them and does not say the
public site will show the roadmap with no items (STY-042 S3)

### S11: Tags are offered both ways

**Given** a roadmap whose items carry tags, and a new item with a tag of its own
**When** Sam opens Tags in the item dialog, adding or editing
**Then** the new item is offered the roadmap's tags, and the other items are offered
the new item's (STY-037 S3)

## Tests

S3–S8 need Playwright against the Sheets fake: add, add another, remove, publish and
the empty roadmap, in both themes and at phone width.

## Decisions

- **D1** (owner, 2026-11-14, items round 1 Q1): one button and a dialog (design B),
  over the form as a card in its horizon (A, recommended) and a quick-add line (C).
- **D2** (owner, items round 1 Q5): a new, unpublished item has Remove; removing a
  published item is STY-049.
- **D3** (owner, items round 2 Q1): an empty roadmap shows one panel with the button
  (design B), over the six headings (A) or the three horizons first (C).
- **D4** (owner, items round 2 Q2): no horizon is chosen to start with, over Now or
  the last one used.
- **D5** (owner, items round 2 Q3): "Add item" and "Add and start another", which
  keeps the dialog open with the same horizon, over one button that closes.
- **D6** (owner, items round 2 Q4): closing is as for "Add a roadmap".
- **D7** (owner, items round 3 Q3, confirming the agent's choices): "New" tag with
  Edit, Move and Remove; one change; Remove without asking; "Discard all" drops it
  and Refresh keeps it; unavailable while not connected or the items can't be read;
  leaving asks; the spreadsheet sentence goes.
- **D8** (agent, 2026-11-14, owner asked for stories that fit one agent's context):
  how the publish dialog lists a new item is STY-047. Until it is delivered a new
  item is published without being named under "What changes"; nothing else waits:
  it counts in the empty-roadmap line (S10) and stays pending through a refused
  publish (STY-045 S3).
- **D9** (owner, round 3 Q1): a pending new item in a horizon or section counts as
  an item the public would see, since "Save and publish" writes it. S10.
- **D10** (agent, 2026-11-15): a new item's Edit, Move and Remove are unavailable,
  though focusable, while a publish of its roadmap is under way and until a Refresh
  follows one whose answer was lost: the rule "Discard all" has. STY-045 left open
  what an edit to a new item made while its publish is under way becomes; nothing is
  behind a new item, so the edit, or the removal, would be lost unseen as the item
  read takes its place. Over turning what changed since the publish into an edit of
  the published item, which a lost answer gives nothing to tell from a co-lead's
  change (STY-045 D8), and over leaving it lost.
- **D11** (agent, 2026-11-15): "Add an item" is with the page's actions on every
  roadmap, an empty one included, whose panel holds a second, as the roadmap list has
  two "Add a roadmap" (STY-041). S1 and S8 each ask for theirs; the prototype of an
  empty roadmap drew the panel's alone. The owner may want one.
- **D12** (agent, 2026-11-15): the dialog's line names the button that publishes the
  item: "It stays unpublished until you choose “Publish changes”." on a published
  roadmap, as the prototype has it, and "It isn't saved until you choose “Save
  changes”." on one that is not, where saving makes nothing public. Over one line
  saying "publish or save" for both.

## Out of scope

- The publish dialog's list of what changes: STY-047.
- Removing a published item: STY-049. Choosing an item's place in its horizon:
  STY-050.
- Welsh item text: ADR-012 Option 3.

## Delivery

### Departures

- **S1: "unavailable" is unavailable but focusable** (agent), as Refresh and
  "Add a roadmap" are, and it lasts until the organisation list is read too, which the
  dialog names an item's organisations from. A roadmap whose items were read earlier
  and can't be read again still shows them, with Edit and Move, so it keeps the
  button.
- **S1, S8: an empty roadmap has both buttons** (agent, D11).
- **S2: the line differs by what the roadmap's button is called** (agent, D12).
- **S3: "New" sits where "Changed" sits** (agent), at the foot of the card beside its
  buttons, where the page already says what is pending of an item; the prototype drew
  it above the title. Remove takes the place of "Undo changes", ahead of Move and Edit.
- **S4: what was added is said above the form** (agent), in a place that is there
  from the moment the dialog opens, so a screen reader announces it. The next form is
  a new one, so nothing of the last stays in its Tags, Organisations or Details.
- **S6, and STY-045's leftover: a new item's Edit, Move and Remove wait while it may
  be published unseen** (agent, D10). A publish can't be started behind an open
  dialog, so this is reached only by leaving the page while a publish is under way
  and coming back, or after a lost answer.
- **S7, D8: the publish dialog shows no "What changes" when new items are all that
  is pending** (agent), in place of the heading over an empty list. With edits too,
  it lists the edits alone, as D8 says, until STY-047.
- **S9: the journey runs once** (owner; CHO-011 D5, the epic's delivery notes), at the
  default size and theme, with no check of where the dialog sits: the Tests note's
  "in both themes and at phone width" and S9's phone predate that. The accessibility
  spec and the focus tour open the adding form in both themes, and axe checks it and
  the empty panel at 375px.
- **S9: closing** (agent): Cancel and Escape put focus back on the "Add an item" that
  opened the dialog, an empty roadmap's panel's included, also after "Add and start
  another"; "Add item" puts it on the new card's Edit (S3).
- **The item dialog's state moved to the page** (agent): `useItemDialog` is called by
  the roadmap's page, which holds the button, and no longer by its items; the items
  draw the dialog as before.
- **STY-042's panel is taller with the button** (agent): its Playwright bound moved
  from under 160px to under 200px, still well short of the full panel's 288px.
- **Tests.** Written first and run red: 8 tests of the rules (`editNewItem`,
  `removeNewItem`, `shownNewItem`, `publishesNoItems`), then the 36 page tests of
  `roadmap-detail-page-adding.test.tsx`, before any screen code. Four of those 36 were
  then corrected as tests, not as code: an enabled button carries
  `aria-disabled="false"`, a horizon once chosen can't be unchosen, and two awaited
  the page behind a dialog. The Playwright specs followed working code. Two existing
  tests of the empty panel were re-pointed at its new sentence, and the test of
  `groupRoadmapItems`' `placementAt` went with the parameter.
- **Welsh is machine-assisted** (agent), as all of `cy.ts` is: the nine strings under
  _Contract for dependents_ want a fluent read.

### Contract for dependents

- **Nothing about what is written changed**: a new item is published by STY-045's
  write, as it was.
- **Gone**, with nothing left beside what replaced it:
  - `dialogs/edit-item-form.tsx` (`EditItemForm`): it is `dialogs/item-form.tsx`
    (`ItemForm`), which edits and adds;
  - the items' own `entries`, `shownItems` and `keys` lists in `RoadmapItems`, and
    its call of `useItemDialog`: the page's items are one list (`usePageItems`);
  - `groupRoadmapItems`' `placementAt` parameter: it groups the items as shown;
  - `EditControls`' `changed`, `undoable` and `onUndo`: they are `pending`,
    `droppable` and `onDrop`;
  - `EditableItemCard`'s `item` and `entry` props: it takes `pageItem`;
  - the sentence about the spreadsheet (`roadmaps.items.empty.description`, whose key
    now holds what to add), in both catalogues.
- **`ItemDialog`** (`dialogs/item-dialog.tsx`) takes the editing form's props
  (`opened`, `item`, `onDone`) or the adding form's (`action`, `onAdd`), with
  `tagsInUse`, `organisations`, `open`, `onClose` and `opener`. Adding, it draws a
  new `ItemForm` after each "Add and start another", under what was added.
- **`ItemForm`** builds its fields once for both: adding is editing an item with
  nothing in it (`blankItem`), with a horizon or section `required`. **`EditForm`**
  takes what differs: `required` on a field, `confirmLabel`, `another` (a second
  button that confirms), `note`, and `takesFocus` for a form drawn in a dialog
  already open.
- **`usePageItems(roadmapId, items)`** (`editing/page-items.ts`) gives the page's
  items, each a `PageItem`: `key`, `item` (as read; a new item as it is pending),
  `shown`, `entry` and `newItemId`. The items read come first, each at its place among
  them, then the new items, so a position on the page is a place in that list, and a
  new item is last in its horizon or section.
- **`useItemDialog({ roadmap, items, pageItems })`** (`editing/use-item-dialog.ts`) is
  the page's one dialog state: `edit(position)` and `add(from)` open it, `drawn` is
  what `ItemDialog` takes, with a `key` new at each opening, and `cardAt` and
  `cardOpener` say which card's Edit takes focus as it closes: the item it edits, or
  the one "Add item" just added.
- **The rules** (`domain/roadmap/new-item.ts`): `editNewItem(changes, id, values)`
  keeps values over those a new item held, in its place, and throws for a blank title
  or no placement; `removeNewItem(changes, id)` drops it. In
  `editing/pending-changes.ts`: `shownNewItem(newItem)` is the item it will read as,
  `pendingNewItems(items, changes)` the new items no read holds, and
  `publishesNoItems` counts one as an item the public would see.
  `discardable(snapshot, roadmapId)` (`editing/pending-changes-store.ts`) is the
  rule of "Discard all", which a new item's card keeps too (D10).
- **Left for STY-047**: `changedParts` still lists edits only, and the publish dialog
  hides "What changes" when it lists nothing; a publish dialog that lists new items
  has no use for that guard.
- **Copy**, in both catalogues, the Welsh machine-assisted:
  `roadmaps.edit.addItem.title`, `.submit`, `.another`, `.note.publish`, `.note.save`
  and `.added`; `roadmaps.edit.new`, `.remove` and `.placementRequired`;
  `roadmaps.items.empty.description`, reworded.
- **Vitest** (`features/roadmaps/testing/item-dialog.ts`): `openAddItemDialog`,
  `addItemDialog`, `addItemButtons`, `fillAndAddItem` (which fills the open form and
  chooses "Add item" or "Add and start another") and `addItem` (which opens, fills,
  adds and waits for the dialog to go); each takes the language.
- **E2E** (`tests/e2e/fixtures/dialogs.ts`): `addItemButtons`, `openAddItemDialog`
  (from the page's button, or an `opener`) and `addItem`. The dialog is
  `getByRole("dialog", { name: "Add an item" })`, and its journey is
  `tests/e2e/adding-an-item.spec.ts`. A card's Move is found by its exact name, since
  "Remove X" holds "Move X". Structure snapshots: `add-item-dialog` and
  `add-item-new`; `detail` gained the button.

### Scenario evidence

`adding` is `src/features/roadmaps/pages/roadmap-detail-page-adding.test.tsx`; `rules`
is `src/domain/roadmap/new-item.test.ts`, _a new item, before it is published_;
`pending` is `src/features/roadmaps/editing/pending-changes.test.ts`, _a new item_;
`items` is `src/features/roadmaps/pages/roadmap-detail-page-items.test.tsx`; `e2e` is
`tests/e2e/adding-an-item.spec.ts`; `page` is `tests/e2e/roadmap-page.spec.ts`; `axe`
is `tests/e2e/accessibility.spec.ts`; `tour` is `tests/e2e/focus-indicator.spec.ts`;
`structure` is `tests/e2e/structure.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | adding "is one button with the page's actions, once the roadmap's items are read", "is unavailable while the items are read", "… while the items can't be read", "… while the session has expired"; e2e the first journey (one button) and "the dialog stays through the session's end…" (unavailable once expired); structure `detail`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S2       | adding "opens empty, with no horizon chosen, Tags, Organisations and Details shut, saying when the item is published", "says when it is saved, on a roadmap that isn't published", "adds nothing with a blank title or no horizon chosen, saying so at each field, focus on the first"; e2e the first journey                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S3       | adding "closes the dialog and shows the item last in its horizon, tagged New, with Edit, Move and Remove, focus on its Edit, nothing written", "keeps every field given, each trimmed, as an edit's is", "is what Enter in a field does"; pending "shows as the item it will read as once published…"; e2e "a Product Lead adds an item in the item dialog, pending until published" (once, default theme and size); structure `add-item-new`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S4       | adding "adds the item and keeps the dialog open and empty, the horizon still chosen, focus in the title, saying what was added", "starts each next form shut and without the last one's tags, organisations or details", "keeps what was added when the dialog is then cancelled, focus back on “Add an item”", "shows only when adding, never when editing"; e2e "“Add and start another” keeps the dialog open…" (which also holds that a double click on "Add item" adds one item); structure `add-item-dialog`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S5       | adding "is counted on the roadmap's page and marked on the list, and leaving or disconnecting asks first", "is one change to save on a roadmap that isn't published", "is kept by Refresh, and dropped with the rest by “Discard all”"; e2e the first journey (Refresh, the list's marker)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S6       | adding "is edited in the dialog's editing form, and what changes is part of it: still one change, never “Changed” or “Undo changes”", "can't be left without a title by an edit", "is moved by its Move menu, still one change, focus staying on Move", "is dropped by Remove without asking, focus going to “Add an item”; no item the roadmap holds has Remove"; rules (all four); e2e "…a new item is edited, moved and removed before publishing"; D10: adding "holds its Edit, Move and Remove while a publish of the roadmap is under way", "holds them until a Refresh follows a publish whose answer was lost"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| S7       | adding "writes it: its card shows without New, last in its horizon, and the notice confirms the publish", "names no new item under “What changes” yet, and shows no empty list"; e2e the first journey (one `batchUpdate`, its row appended)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S8       | adding "says what to add in its panel, which holds “Add an item”, with no word of the spreadsheet", "shows the six headings once it has an item, pending or not, and the panel again once it has none"; items "says a roadmap with no items has none, instead of six empty groups, and what to add", "says so in Welsh"; page "a roadmap with no items shows a compact dashed panel, which holds "Add an item"" (both themes), "an empty roadmap's page is in Welsh and fits a phone"; e2e "an empty roadmap's panel holds “Add an item”…"; the old sentence in neither catalogue: `rg -n "spreadsheet for now\|yn y daenlen am y tro" src tests` finds nothing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| S9       | closing: adding "Cancel closes the dialog…" and "Escape closes the dialog, dropping what was typed, with focus back on “Add an item”", "keeps the dialog and what was typed when the session expires, and “Add item” still adds", "keeps the dialog and what was typed over a read that lands while it is open"; e2e "Cancel and Escape close the dialog and drop what was typed; a click outside does nothing", "the dialog stays through the session's end, and “Add item” still adds"; Welsh: adding "is Welsh on the Welsh interface: the button, the dialog, what it says, the tag and Remove", "says when it is saved in Welsh…", e2e "adding an item in Welsh"; named for their item: adding "names the New tag and Remove for their item", structure `add-item-new`; axe (both themes) "adding an item: the dialog empty, refused and after adding one, then the new item's card", "an empty roadmap's panel with “Add an item”, on a phone" (the panel, then the adding form, at 375px); tour (both themes) "every control in the item dialog, adding, shows DHCW's focus indicator", "every control on a roadmap's page with a change pending…" (a new card's Remove); the phone and the themes of the journey: the owner's rule, above |
| S10      | pending "is an item the public would see, so publishing with one never leaves them nothing"; adding "offers “Save and publish” for it, and doesn't say the public site will show no items"; e2e "an empty roadmap's panel holds “Add an item”; its first item brings the six headings, and counts when publishing"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S11      | adding "offers a new item the roadmap's tags, and the roadmap's other items the new item's" (adding, the next new item, an item the roadmap holds, and the new item edited)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
