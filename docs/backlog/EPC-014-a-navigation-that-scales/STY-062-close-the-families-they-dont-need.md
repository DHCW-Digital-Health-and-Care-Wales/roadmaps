# STY-062: A Product Lead closes the families they don't need

- **Status**: Proposed — the owner asked on 2026-11-18 to deliver the navigation UX
  prototype as drawn, its chevrons and "Close all" included
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-014-a-navigation-that-scales](README.md)
- **Depends on**: STY-061 (hard, must be on the default branch)
- **Binding ADRs**: ADR-010, ADR-008, ADR-005
- **Suggested model**: Sonnet — a disclosure per family and one for all, remembered as
  the fold is

## Summary

The navigation lists every family open, so a Product Lead scrolls past the products
they don't lead. This story makes each family's name a button that closes and opens its
roadmaps, with a chevron at its end, and adds "Close all", which becomes "Open all" once
every family is closed. Closed families are remembered on this device, keep a dot when
a roadmap inside has unpublished changes, and open again when the Product Lead goes to
one of their roadmaps. A search still finds roadmaps in closed families.

## Acceptance criteria

### S1: Close and open a family

**Given** the navigation open on a desktop, every family open
**When** the Product Lead presses "Single Record"
**Then** its roadmaps hide, its chevron points right, and it is announced as collapsed
**And** focus stays on it
**When** they press it again
**Then** its roadmaps show, and its chevron points down

### S2: A closed family with changes

**Given** Shared care plans has unpublished changes
**When** the Product Lead closes Single Record
**Then** its name keeps a dot, and a screen reader reads it with "unpublished changes"

### S3: Close all and Open all

**Given** every family open
**When** the Product Lead presses "Close all", above the first family
**Then** every family closes, the current roadmap's too, and the button becomes "Open
all" with focus on it
**And** a screen reader is told every family is closed
**When** they open one family alone
**Then** the button is "Close all" again
**When** they press "Close all", then "Open all"
**Then** every family opens

### S4: Remembered on this device

**Given** Single Record and Workforce closed
**When** the Product Lead reloads the page
**Then** both are still closed
**And** where browser storage can't be read or kept, every family is open and no error
shows

### S5: Going to a roadmap opens its family

**Given** Single Record closed
**When** the Product Lead goes to Shared care plans by any route (its card on the list,
the count, or an address)
**Then** Single Record opens, so its current roadmap shows

### S6: A search finds roadmaps in closed families

**Given** Single Record closed
**When** the Product Lead searches "shared"
**Then** Shared care plans shows under "Single Record", a plain heading, and "Close all"
does not show
**When** they clear the search
**Then** Single Record is closed again

### S7: The rail and a single group

**Given** the navigation folded to its rail, with families closed
**When** the Product Lead looks at it
**Then** every roadmap's mark shows, and no family control
**And** where every roadmap is in one group, so the navigation names no family (STY-054
D3), there is no family button and no "Close all"

### S8: On a phone, in Welsh, by keyboard

**Given** the drawer at 375px in Cymraeg, or a keyboard alone, or the dark theme
**When** the Product Lead closes and opens families
**Then** the family buttons and "Close all" work in the drawer as on a desktop, their
names are in Cymraeg and fit, and each is reached and worked by keyboard with the
navigation's focus styles

## Decisions

- **D1** (owner, 2026-11-18, request and analysis decision 2 (a)): each family's name
  carries a chevron at its end, down while open and right while closed.
- **D2** (owner, 2026-11-18, request; placement left to the agent): a control that closes
  or opens every family. **D3** below places it.
- **D3** (agent, 2026-11-18, analysis decision 16 (a)): one button at the end of its own
  row above the first family, "Close all" while any is open and "Open all" once all are
  closed, shown only while the list is whole, over a button in the top row, which
  leaves the search too narrow at 208px.
- **D4** (agent, 2026-11-18, analysis decisions 3 (a), 4 (a), 5 (a) and 7 (a)): the whole
  name is the button; closed families are remembered on this device; a closed family
  with changes keeps a dot; a search finds roadmaps in closed families.
- **D5** (agent, 2026-11-18): going to a roadmap opens its family, over leaving the
  current page hidden in a closed one.

## Starting point

Audited at `f46384c`. A group's `key` is its family's English name (`familyKey`,
ADR-013), or `NO_FAMILY_KEY`: a family renamed on the families page gets a new key, so
it shows open after the rename. That is acceptable for a convenience; remembering by
key needs no migration.

## Out of scope

- The count's narrowing, which shows roadmaps in closed families: STY-063.
