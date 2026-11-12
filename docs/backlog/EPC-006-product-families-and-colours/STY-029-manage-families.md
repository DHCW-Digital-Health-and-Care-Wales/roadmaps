# STY-029: Anyone connected adds, renames and recolours a family

- **Status**: Proposed — grilled in EPC-006 rounds 1–4 (2026-11-12)
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + Routing + i18n (en + cy)
- **Epic**: EPC-006-product-families-and-colours
- **Depends on**: STY-027 (hard)
- **Binding ADRs**: ADR-013, ADR-012
- **Suggested model**: Opus — one atomic write across a tab and many roadmaps' rows, some
  of them published

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
**Then** `Name (cy)` and each member's `Family (cy)` keep the Welsh name they had, and the
confirmation says nothing about Welsh

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
