# STY-026: A co-lead's change is shown, not overwritten

- **Status**: Proposed — owner decisions settled in the Editing epic's grilling
  (2026-11-11); waits for STY-025
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-005-editing
- **Depends on**: STY-025 (hard)
- **Binding ADRs**: ADR-012 §"Finding what to write", ADR-008, ADR-010
- **Suggested model**: Opus — the decision screen that stands between two people's work
  on a public roadmap

## Summary

Two Product Leads can lead one product. When a co-lead has changed a field that this
Product Lead also changed, publishing stops and shows each such field with their text
beside the co-lead's; they keep theirs or take the co-lead's, field by field, and
publish again. An item the co-lead deleted, or a roadmap removed from the list, is
reported and its changes discarded. Nothing is ever overwritten unseen. This replaces
STY-025's interim "someone else has changed this roadmap" message.

## Scope

`features/` (the conflict review, its effect on the pending store, the removed-roadmap
handling) and `i18n/`. It uses STY-023's outcome as is.

## Acceptance criteria

### S1: Conflicts are shown side by side

**Given** a pending title "B" edited from "A", and a co-lead has since set it to "C"
**When** the Product Lead confirms the publish
**Then** nothing is written, and a review lists every conflicting field by item and field,
"Your change" ("B") beside "Current text" ("C")
**And** each has "Keep mine" and "Use theirs"

### S2: Choosing resolves the conflict

**Given** the review from S1
**When** they choose "Keep mine"
**Then** the pending change stays "B" with its base now "C", so the next publish writes it
**And** "Use theirs" drops that pending change; the page shows "C"

### S3: Publishing again after review

**Given** every conflict resolved
**When** they publish again
**Then** the confirmation lists the remaining changes, and the write proceeds as STY-025
S10
**And** a further co-lead change meanwhile is a new conflict, shown again

### S4: Unrelated co-lead changes are kept

**Given** a co-lead changed a field the Product Lead did not edit
**When** they publish
**Then** there is no conflict, the co-lead's change is not overwritten, and the page shows
it after the publish

### S5: A removed item is reported

**Given** pending changes to an item a co-lead has deleted (its ID is gone), or to an item
without an ID whose position holds neither its loaded text nor that text with the
pending changes applied (Q30, STY-023 S12)
**When** they publish
**Then** nothing is written, a message names the item by its loaded title, its pending
changes are discarded
**And** the remaining changes stay pending, ready to publish again

### S6: A removed roadmap is reported

**Given** pending changes to a roadmap whose row has gone from the roadmap list, at publish
or on a Refresh or items read (STY-021 D11)
**When** that is found
**Then** its pending changes are discarded, and the not-found page says the roadmap was
removed and its unpublished changes could not be kept
**And** the list's "Unpublished changes" marker disappears with it

### S7: Welsh, keyboard and phones

**Given** the review, in Cymraeg, at 375px, light and dark
**When** they work through it by keyboard
**Then** every label is Welsh, the two values are distinguishable without colour, focus
moves into the review and back to the publish control, and axe passes

## Tests

S1–S6 are component tests against the in-memory repository seeded to change between read
and publish; S1, S2, S5 and S6 also run in Playwright with the fake changed mid-test;
S7 extends the accessibility, focus and structure specs.

## Decisions

- **D1** (owner, 2026-11-11, grilling Q15, Q16): field-level conflicts; nothing published
  until each is resolved by "Keep mine" or "Use theirs" side by side → S1–S3.
- **D2** (owner, 2026-11-11, grilling Q16, Q30): a deleted item, or an unmatched item
  without an ID, is reported and its changes discarded → S5.
- **D3** (agent, 2026-11-11): "Keep mine" rebases the pending change onto the current
  value, so the next publish's conflict check passes for that field and still catches a
  later co-lead change (S3).

## Out of scope

- Merging two texts within one field: never planned.
- Showing who made the co-lead change: the spreadsheet does not say, through this API.
