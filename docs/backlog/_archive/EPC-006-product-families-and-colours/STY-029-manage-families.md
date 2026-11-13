# STY-029: Anyone connected adds, renames and recolours a family

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + Routing + i18n (en + cy)
- **Epic**: [EPC-006-product-families-and-colours](README.md)
- **Depends on**: STY-027 (hard)
- **Binding ADRs**: ADR-013, ADR-012
- **Suggested model**: Opus — one atomic write across a tab and many roadmaps' rows, some
  of them published
- **Delivered**: [#41](https://github.com/collisdigital/roadmaps-editor/pull/41)

## Summary

A "Families and categories" page, linked from the roadmap list, lists each family with
its colour and roadmaps, and the six categories read-only. Anyone connected can add a
family, rename one or change its colour. A change that touches roadmaps is confirmed
first, naming each roadmap and whether it is published, then written at once, to the
`Families` tab and every member's row, or not at all. Deleting a family and editing
Welsh names are not offered.

## Acceptance criteria

### S1: The page lists families and categories (round 2 Q5)

**Given** the `Families` and `Categories` tabs
**When** the Product Lead opens "Families and categories" from the roadmap list
**Then** each family shows its name, Welsh name, colour swatch and its roadmaps
**And** the categories show in tab order with no way to change them (round 2 Q1)

### S2: Adding a family (round 1 Q3)

**Given** the page
**When** the Product Lead adds "Screening" with `#00796b`
**Then** a `Families` row is appended with a new ID in the `Item ID` format, that name
and that colour, and a blank `Name (cy)`
**And** no roadmap's row changes

### S3: Renaming or recolouring asks first (round 2 Q9)

**Given** Single Record has four roadmaps, two of them published
**When** the Product Lead renames it or changes its colour
**Then** a confirmation names the four roadmaps and marks the two published, saying their
change goes public at the next nightly update
**And** nothing is written until they confirm

### S4: One write, all or nothing

**Given** a confirmed rename or recolour
**When** it is written
**Then** one write updates the family's `Families` row and each member's `Family ID`,
`Family`, `Family (cy)` and `Colour`, or nothing
**And** the list shows the change without a reload

### S5: A co-lead's change is refused (ADR-012)

**Given** the family's name or colour was changed in the sheet after the page loaded
**When** the Product Lead confirms their change
**Then** nothing is written, and they see the current value beside theirs, as roadmap
conflicts are shown

### S6: Invalid input is refused (round 2 Q6, round 3 Q5)

**Given** the add or edit form
**When** the name is blank, matches another family's ignoring case, accents, spaces and
punctuation, or the colour is not `#rrggbb`
**Then** the form says which, in English and Welsh, and nothing is written

### S7: No tab, no changes (round 3 Q4)

**Given** the `Families` tab is missing
**When** the Product Lead opens the page
**Then** it says families can't be managed until the tab is back, and offers nothing to
change

### S8: Changed membership asks again (round 4 Q5)

**Given** the confirmation named four roadmaps
**When** a co-lead has moved a roadmap into or out of the family before the write
**Then** nothing is written, and the confirmation shows again with the roadmaps the
re-read found

### S9: A rename leaves the Welsh name alone (round 4 Q6)

**Given** Single Record has a `Name (cy)`
**When** the Product Lead renames it to "Shared Care Record"
**Then** `Name (cy)` is unchanged, each member's `Family (cy)` is written from it as S4
writes it, and the confirmation says nothing about Welsh

## Decisions

- **D1** (owner, 2026-11-12, EPC-006 grilling round 1 Q3): anyone connected may add,
  rename and recolour → S2, S3.
- **D2** (owner, 2026-11-12, round 2 Q7–Q9): no Welsh editing, no delete, publish at once
  after a confirmation → S1, S3, S4.
- **D3** (owner, 2026-11-12, round 4 Q5): a membership change since the confirmation
  writes nothing and confirms again → adds S8.
- **D4** (owner, 2026-11-12, round 4 Q6): a rename neither warns about nor blanks the
  Welsh name; Welsh editing comes later → adds S9.

## Out of scope

- Deleting a family: not offered (round 2 Q8).
- Changing categories: until the public site reads the `Categories` tab (round 2 Q1).
- Editing a family's Welsh name: later, not yet recorded (round 4 Q6).

## Delivery

### What the data source receives

This changes what the editor writes to the shared spreadsheet, the contract with the
public site (README, _What the editor writes_). The editor now writes the `Families`
tab, at once after a re-read, in one all-or-nothing `batchUpdate`:

- **Adding a family**: a new row after the last row in use, with an `ID` in the
  `Item ID` format, the `Name` (trimmed) and the `Colour` (lower case); `Name (cy)` is
  left blank. It is one `appendCells` request on the `Families` tab, so Google places
  the row and a family a co-lead added since the read is kept (the only request that
  grows a tab by rows). No roadmap's row is written.
- **Renaming or recolouring**: the family's `Name` or `Colour`, whichever changed, and
  each member roadmap's index row, by STY-028's `IndexRowWriter.writeFamily`:
  `Family ID`, `Family`, `Family (cy)` (copied from `Name (cy)`) and `Colour`, the
  `Family ID` column appended if missing. A member is a row linked to the family by ID,
  or by folded name when it has no ID.

`Name (cy)` is never written (S9), and nothing is written to the `Categories` tab.

### Departures

- **Its own page, one form at a time.** `/families`, linked as "Families and
  categories" under the roadmap list's description (and so in each state of that page,
  the structure snapshots updated). Each family has a Change button opening an inline
  form; "Add a family" opens the same form below the list. Saving a change with
  members asks in an alert dialog; one with none, or adding, writes at once.
- **Nothing changed closes the form** without a read or write.
- **The family list as re-read is the base.** The form remembers the family as the page
  showed it; at the write the adapter re-reads and refuses a field a co-lead changed
  (S5) unless they changed it to the same value. "Keep mine" and "Use theirs" each
  move the base to the current value, and save again needs the Product Lead's click.
- **Members are compared by roadmap ID (S8).** The confirmation sends the IDs it named;
  a re-read finding others writes nothing and returns the members found, which the
  dialog shows with "The roadmaps in this family have changed. Check them again."
- **S7 covers an unreadable list too.** A missing `Families` tab, or one that can't be
  read, shows "Families can't be changed right now" with no Change or Add; a write
  that finds the tab gone (`invalid-data`) shows the write failure. The change path also
  refuses (`invalid-data`) while the roadmap index is the `Template` tab, as a publish
  does.
- **A family deleted meanwhile** is reported as gone ("This family is no longer
  listed, so your change wasn't saved."), the form closing.
- **Known edges.**
  - An index row with no `Family ID` whose `Family` already matches a family's _new_
    name (a stray row, not a member before) is linked to it by name after the rename,
    without its ID being written until its next publish.
  - A write whose answer is lost is settled by reading again: an add when the family
    is listed, a change only when the family and the row of every roadmap it wrote
    (by ID) hold it. Otherwise,
    or if that read fails too, the network error shows, and a retry of an add that had
    in fact landed is refused as name-taken, which is accurate.
  - An index row the editor skips (its `Sheet` is not a valid roadmap ID, or repeats an
    earlier row's) is not rewritten by a rename, and keeps the old family name and
    colour until it is fixed and published (README).
  - While a family write is under way, its fields are read-only and Change and "Add a
    family" are disabled. An open form stays shown, with the list it opened with, even
    if a refresh drops the family, so its outcome is always reported; if a refresh
    finds no usable list, the S7 note shows, the form keeps what was typed and can't
    save, and no other form opens.
  - A members-changed answer with no members left shows the zero copy and drops the
    public-site note.
- **Tests.** The domain, contract and adapter tests were written with each slice and
  run red where the code was new; the page tests and Playwright specs followed working
  code.

### Contract for dependents

- **Domain** (`@/domain/roadmap/family-changes`): `FamilyInput`, `FamilyEdit`
  (`family`, `changes`, `members`), `FamilyConflict`, `FamilyOutcome` (`saved`,
  `refused`, `members-changed`, `name-taken`, `family-not-found`), `checkFamilyInput`,
  `familyMembers`, `planNewFamily`, `planFamilyChange`, `familyHeld`.
- **Port**: `RoadmapRepository.addFamily(input)` and `.changeFamily(edit)`, covered by
  the contract's `describeFamilyChanges`; the in-memory and Sheets adapters implement
  them.
- **Sheets adapter**: `#writeFamily(requests, held, family)` sends a family write and
  settles a lost answer when `held` finds it applied; STY-030 can write one roadmap's row with `IndexRowWriter.writeFamily` as here.
- **Hooks** (`features/roadmaps/hooks/use-family-changes.ts`): `useAddFamily()` and
  `useChangeFamily()` refresh the lists and the roadmap list once settled;
  `useFamilyWriting()` says one is under way.
- **Test fakes**: `applyBatchUpdate` applies `appendCells` to the `Families` tab only,
  after its last row with data, growing the grid.
- **Welsh to review** (machine-assisted): `roadmaps.familiesLink` and every string under
  `roadmaps.families` in `src/i18n/locales/cy.ts`.

### Scenario evidence

- **S1**: page "lists each family with its names and roadmaps, and the categories (S1)"
  and "is linked from the roadmap list"; e2e `families.spec.ts` "lists each family with
  its colour, names and roadmaps, and the categories read-only (S1)"; axe
  `accessibility.spec.ts` "families, a family's form, then its confirmation".
- **S2**: domain "gives a new family an ID no row holds, and a blank Welsh name";
  contract "adds it to the end of the list with a new ID and no Welsh name (S2)";
  adapter "appends a row after the last, with an ID no row holds, after two reads (S2)"
  and "keeps a family a co-lead added after the read, appending after it (S2)"; page "adds a family, and shows it without a reload (S2)"; e2e "adds a family as a
  new Families row, changing no roadmap (S2)".
- **S3**: page "names each roadmap and marks the published ones before a change (S3,
  S9)"; e2e "confirms a rename naming each roadmap, …" (Cancel writes nothing).
- **S4**: contract "renames and recolours it and every roadmap in it, keeping Welsh (S3,
  S9)"; adapter "writes the family's changed cells and its roadmaps' rows, linking each
  by ID, in one batchUpdate (S4, S9)", "writes only the field changed" and "rethrows a
  lost write's network error when the family holds the change but its roadmaps don't
  (S4)" and "… when a co-lead's rename unlinked a roadmap it named (S4)"; page "renames a family and its roadmaps at once, keeping its Welsh name (S4,
  S9)", "says the family is gone when a co-lead deleted it, though the list refreshes
  first" and "offers no other form while a family write is under way";
  S7 also page "keeps an open form but offers no other when the family list goes (S7)"; e2e (one
  `batchUpdate`, Product A's and C's cells, Product B untouched).
- **S5**: domain "refuses a field a co-lead changed since, showing each side" and "is
  no conflict when a co-lead made the same change"; contract "refuses a field a co-lead
  changed, writing nothing (S5)"; page "shows a co-lead's value beside the Product
  Lead's, and saves again after a choice (S5)"; e2e "refuses a change a co-lead made
  first, …".
- **S6**: domain `checkFamilyInput` cases and "refuses a name another family has,
  folded"; contract "refuses a name another family has, folded, writing nothing (S6)"
  (add and change); page "says what is wrong with each field, and writes nothing (S6)";
  e2e "says what is wrong with the input, and writes nothing (S6)".
- **S7**: contract `it.each` invalid-data cases under "adding or changing a family";
  page "offers nothing to change without a family list (S7)"; e2e "offers nothing to
  change without a Families tab (S7)".
- **S8**: contract "gives the roadmaps in it now when they are not those confirmed,
  writing nothing (S8)"; page "asks again with the roadmaps a re-read found (S8)"; e2e
  "asks again when a roadmap joined the family since the confirmation (S8)".
- **S9**: the S3 and S4 cases above check `Name (cy)` kept, `Family (cy)` written from
  it, and no Welsh in the confirmation.
