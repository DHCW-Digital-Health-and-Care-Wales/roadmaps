# STY-030: A roadmap out of step with its family is made to match

- **Status**: Proposed — grilled in EPC-006 rounds 1–4 (2026-11-12)
- **Type**: Feature
- **Area**: Infrastructure + Features/UI + i18n (en + cy)
- **Epic**: EPC-006-product-families-and-colours
- **Depends on**: STY-027 (hard)
- **Binding ADRs**: ADR-013, ADR-012
- **Suggested model**: Sonnet — it reuses STY-027's flag and an existing write path

## Summary

When someone edits the spreadsheet by hand, a roadmap's family name, colour or
category can fall out of step with the lists; STY-027 flags it. This story adds "Make it match",
which rewrites that roadmap's copied cells from the `Families` and `Categories` tabs, so
the public site shows what the editor shows.

## Acceptance criteria

### S1: Make it match rewrites the copied cells (round 2 Q4)

**Given** a roadmap flagged out of step: linked to Single Record, but its `Colour` reads
`#325083`
**When** the Product Lead chooses "Make it match"
**Then** its row's `Family ID`, `Family`, `Family (cy)`, `Colour`, `Category ID` and
`Category` are written from the lists, and the flag goes
**And** no other cell changes

### S2: A published roadmap says so first

**Given** the flagged roadmap is published
**When** the Product Lead chooses "Make it match"
**Then** they are told the fix goes public at the next nightly update before anything is
written

### S3: A roadmap not in the lists is not fixable here

**Given** a roadmap whose family is not in the list (STY-027 S8)
**When** it is shown
**Then** "Make it match" is not offered; the notice points to choosing a family (STY-028)

### S4: The fix is written at once, refused on a conflict (round 4 Q7)

**Given** the flagged roadmap, with or without pending edits
**When** "Make it match" is confirmed
**Then** the row is re-read and written at once in one write, apart from the roadmap's
pending edits, which stay pending
**And** if the family, the category or the row's copied cells changed since the page
loaded, nothing is written and the roadmap is shown as it now is

## Decisions

- **D1** (owner, 2026-11-12, EPC-006 grilling round 2 Q4): the list shows the family's
  values, flags the roadmap and offers "Make it match" → this record.
- **D2** (owner, 2026-11-12, round 4 Q7): the fix writes at once, not as a pending edit
  → adds S4.

## Out of scope

- Preventing a row falling out of step: hand edits to the sheet can't be stopped while it is the data source.
