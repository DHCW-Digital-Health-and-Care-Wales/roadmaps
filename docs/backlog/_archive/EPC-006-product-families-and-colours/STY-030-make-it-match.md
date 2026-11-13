# STY-030: A roadmap out of step with its family is made to match

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Infrastructure + Features/UI + i18n (en + cy)
- **Epic**: [EPC-006-product-families-and-colours](README.md)
- **Depends on**: STY-027 (hard)
- **Binding ADRs**: ADR-013, ADR-012
- **Suggested model**: Sonnet — it reuses STY-027's flag and an existing write path
- **Delivered**: [#48](https://github.com/collisdigital/roadmaps-editor/pull/48)

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

## Delivery

### What the data source receives

This changes what the editor writes to the shared spreadsheet, the contract with the
public site (README, _What the editor writes_). "Make it match" writes one roadmap's
index row, at once after a re-read, in one `batchUpdate`: `Family ID`, `Family`,
`Family (cy)`, `Colour`, `Category ID` and `Category`, copied from the lists as read, each
only where it differs (`IndexRowWriter.writeFamily` and `.writeCategory`, as a publish
writes a chosen family). Nothing else is written.

### Departures

- **Where it sits.** On the roadmap's page, under its family and category line, beside the
  "Doesn't match" badge, not on the list's card. A published roadmap asks in an alert
  dialog first (S2); an unpublished one is written on the click, since S2 asks for a
  warning only about going public.
- **`Roadmap.copied` carries the row's own cells (S4).** The page holds the roadmap as
  shown (the lists' values), which two rows with different copied cells share, so
  `Roadmap` gained `copied` (the row's `Family`, `Family (cy)`, `Colour` and `Category`
  as read). The write is refused when these, the roadmap's family or category (ID, names,
  colour) or whether it is published differ from what the page loaded, or the roadmap is
  no longer out of step or no longer fixable. In the test double, a write sets `copied`
  as the adapter does.
- **S3's pointer.** The "Family isn't listed" badge stays; beside it the page says
  "Choose its family under About this roadmap." where "Make it match" would have been.
- **A roadmap published meanwhile** is refused like any other change (the page shows it as
  now, and its confirmation comes first), so an unpublished roadmap never goes public
  without S2's warning.
- **A refused write** shows "This roadmap changed while you were looking…" and the roadmap
  list is re-read; the roadmap the refusal returned is put in the cached list first, so the
  page shows it as it now is even if that read fails.
- **Pending edits** are untouched: the write is a separate mutation
  (`useMatchRoadmap`), and a later publish writes its own cells.
- **Tests.** The domain tests (`list-match.test.ts`) and the component tests were written
  beside the code in one pass and not run red first; the contract's invalid-data case
  was observed red against the in-memory double. The Playwright spec followed working
  code.

### Contract for dependents

- **Domain** (`@/domain/roadmap/list-match`): `MatchOutcome` (`matched`,
  `roadmap-not-found`, `changed`), `canMatchLists`, `planListMatch`.
- **Port**: `RoadmapRepository.matchRoadmapToLists(loaded)`; both implementations pass the
  contract's `describeListMatch` (the not-out-of-step, not-found and no-list cases; the
  matched case is each adapter's own test, since an out-of-step row can't be built
  through `Roadmap` alone).
- **`Roadmap.copied`** (`RoadmapCopiedCells`): the row's own `Family`, `Family (cy)`,
  `Colour` and `Category` as read; `inStep` in `testing/test-roadmap.ts` derives it for
  fixtures.
- **Hook / UI**: `useMatchRoadmap()`, `MatchListsAction`.
- **Welsh to review** (machine-assisted): every string under `roadmaps.lists.match` in
  `src/i18n/locales/cy.ts`.

### Scenario evidence

- **S1**: adapter "writes the row's copied cells from the lists in one batchUpdate,
  nothing else (S1)"; in-memory "clears the flag (S1)"; page "writes at once for an
  unpublished roadmap…"; e2e "makes a roadmap out of step match its lists…".
- **S2**: page "tells a published roadmap's reader first, writing nothing until they
  confirm (S2)"; the same e2e (no write before the dialog's confirm).
- **S3**: domain `canMatchLists` "false for a roadmap whose family is not listed"; page
  "is not offered for a family the list doesn't have (S3)"; the same e2e.
- **S4**: domain `planListMatch` cases (family, category, a copied cell, published);
  adapter "writes nothing when a co-lead edited one of the row's own copied cells
  meanwhile, though it is still out of step (S4)"; contract "writes nothing when … changed since it
  loaded (S4)"; adapter "writes nothing when the roadmap is no longer out of step, or
  changed since it loaded (S4)"; page "shows the roadmap as it now is when it changed
  meanwhile", "asks first when an unpublished roadmap was published meanwhile (S2)" and
  "shows the roadmap the refusal returned even when the list can't be read again (S4)".
  The pending-edits-stay-pending part rests on the separate mutation, not a
  test.
