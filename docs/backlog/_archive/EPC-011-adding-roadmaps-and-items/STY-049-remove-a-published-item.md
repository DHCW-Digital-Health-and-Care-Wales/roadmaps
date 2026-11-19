# STY-049: A Product Lead removes a published item

- **Status**: Done — delivered in its PR; grilled with the owner on 2026-11-19, on
  STY-070's write
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: STY-070 (hard)
- **Binding ADRs**: ADR-012, ADR-011, ADR-014, ADR-008, ADR-010, ADR-005
- **Suggested model**: Opus — a new pending state across the card, compact row,
  counts, publish dialog and conflict review
- **Delivered**: <PR URL>

## Summary

A Product Lead can remove an item the public site already shows, from the editor,
rather than deleting its row in the spreadsheet. Remove asks first, and offers "Move to
Not doing" as the first choice, since readers see what was dropped. A confirmed
removal is pending: the item stays in place struck through, with Undo, until the
roadmap is published, when its row is deleted. A co-lead's change to it stops the
publish for review. A new item's Remove asks the same question. The write itself is
STY-070.

## Scope

The card's and compact row's Remove, its confirmation dialog, the struck "Removed"
state and its Undo, the counts and empty panels, the publish dialog's line and the
conflict review's removal form (`features/`, `i18n/`, `tests/e2e/`). A new item's
Remove gains the same dialog (amends STY-046). No repository change: STY-070.

## Acceptance criteria

### S1: Remove asks first, with Not doing first (D3, D4)

**Given** Sam on the published Electronic Referrals roadmap, and the published item
"Fax referrals" in Now
**When** Sam chooses "Remove" on its card, or on its compact row
**Then** a dialog asks "Remove “Fax referrals”?", says that a removed item leaves the
public roadmap when Sam publishes while Not doing shows readers the work was dropped,
and offers "Move to Not doing" first, then "Remove", then Cancel
**And** "Move to Not doing" makes a pending move, as the Move menu does; Cancel, Escape
and the top-corner close change nothing; the dialog follows the epic's _Closing_, focus
and _An expired session_ rules: it only keeps a pending edit, so it works while the
session has expired

### S2: A confirmed removal is pending, struck through, with Undo (D1, D6)

**Given** the dialog of S1
**When** Sam chooses "Remove"
**Then** the card (or row) stays where it was, struck through and tagged "Removed",
with "Undo removal" naming the item, and focus on it; Move and Edit are shown but
disabled
**And** the pending bar counts it as one unpublished change, and nothing is written
until Sam publishes

### S3: Undo restores the item, with its pending edits (D5)

**Given** "Fax referrals" with a pending Phase change, then removed
**When** Sam chooses "Undo removal"
**Then** the card is back, tagged "Changed", with the Phase change still pending, and
the count is what it was before the removal
**And** while removed, the Phase change was not counted and not listed; "Discard all"
restores the item as read, and Disconnect then Keep keeps the removal (ADR-012)

### S4: The page counts what will be published (D9)

**Given** "Fax referrals", the last item in Next, removed
**When** Sam looks at the page
**Then** Next still shows the struck card, not "none in this placement"; the jump
navigation leaves the removed item out of Next's count and marks Next pending
**And** the publish dialog says the public would see no items when the removal leaves
the roadmap empty, as it does today for a roadmap with none

### S5: Publishing lists and deletes the removal (D1)

**Given** a pending removal and one other pending change
**When** Sam chooses "Publish changes"
**Then** the publish dialog's "What changes" lists "Fax referrals" as "Removed", with
no field lines under it, beside the other change
**And** on publishing, the item is gone from the page and the count is 0

### S6: A co-lead's change is reviewed before removing (D2)

**Given** Alex has changed the Description of "Fax referrals" since Sam loaded it, and
Sam publishes its removal
**When** the publish is refused
**Then** the existing conflict review shows "Your change: Removed" beside each field
Alex changed, current value shown, with "Remove anyway" and "Keep the item", and says
nothing was published
**And** "Keep the item" drops the removal and shows the item as it now reads, with any
edits Sam had under it pending; "Remove anyway" keeps the removal for the next publish

### S7: An item already gone counts as removed (D7)

**Given** Alex has deleted the row of "Fax referrals", an item with an ID, by hand,
and Sam publishes its removal with another change
**When** the publish runs
**Then** the other change is published and the removal is no longer pending, with no
"not found" notice for it

### S8: Removing from a placement with a pending order (D8)

**Given** Sam has reordered Now and removes one of its items
**When** Sam looks at Now
**Then** the removed item leaves the pending order and offers no reorder; undoing the
removal puts it back where it was in that order

### S9: A roadmap that isn't published says Save (D10)

**Given** a roadmap that is not published
**When** Sam chooses "Remove" on one of its items
**Then** the dialog says the item leaves the roadmap when Sam saves, and does not
mention the public site
**And** "Move to Not doing" is still offered first

### S10: A new item's Remove asks the same question (D11)

**Given** the new, pending item "Patient app pilot" in Next
**When** Sam chooses "Remove" on it
**Then** the same dialog opens, with "Move to Not doing" first
**And** "Remove" drops the new item at once, as today, with focus on "Add an item";
"Move to Not doing" moves it there, still tagged "New"

### S11: Not doing is not offered where it means nothing (D3)

**Given** an item already in Not doing, or an unplaced item
**When** Sam chooses "Remove" on it
**Then** the dialog offers "Remove" and Cancel only

### S12: Welsh

**Given** the interface in Welsh
**When** Sam removes an item, undoes it and meets its conflict
**Then** every new string (the dialog, "Removed", "Undo removal", the publish line,
the review's removal form) is in Welsh (ADR-008)

## Tests

S1, S2, S6 and S10 need Playwright against the fake GIS and Sheets, as a journey on a
phone and a desktop: the dialog's focus and the struck card's Undo are what a user
does. The counts (S3, S4, S8) hold in component tests.

## Decisions

All owner answers are from the grilling of 2026-11-19 on the
[UX analysis](../../../analysis/remove-a-published-item-ux-analysis.md); "Decision n" is
its _Decisions needed_ row.

- **D1** (owner, Q1): a removal is pending until the roadmap is published, shown in
  place struck through with Undo (design A1), over a separate "Removed" group (A3) or
  a write at once (A2). ADR-012 Options 4 and 8 stand.
- **D2** (owner, Q2): a co-lead's change to any field the editor reads, `Horizon`
  included, makes the removal a conflict, reviewed in the existing review (design B1),
  over the removal winning (B2). A co-lead's reorder of the placement alone is not one.
  "Keep the item" brings back the edits under the removal, compared as any edit is.
- **D3** (owner, Q3): the confirmation offers "Move to Not doing" as its first
  action, A2's question with A1's pending removal; not offered for an item in Not
  doing or unplaced.
- **D4** (owner, Decision 4): a Remove button on the card (and compact row), with a
  confirmation that must be confirmed before the removal joins the pending changes,
  over an entry in the Move menu or the Edit dialog.
- **D5** (owner, Decision 5): an item's pending edits stay beneath its removal and
  stop counting; Undo brings them back, so Undo reverses one step.
- **D6** (owner): a removed card or row shows Undo, with Move and Edit visible but
  disabled, over hiding them or a read-only open.
- **D7** (owner, Decision 6): an item already gone at publish counts as removed and
  the rest publishes, over Option 13's "not found" refusal. Narrowed by STY-070 D3
  (agent): "gone" is no row holding its ID; an item without one that can't be found
  keeps Option 13's refusal, since a co-lead's edit also makes it "not found".
- **D8** (owner, Q4 and Decision 7): the removed item leaves its placement's pending
  order; the row is deleted last in the batch, bottom first, so no item needs an ID
  to be removed. Over refusing a removal while an order is pending.
- **D9** (owner, Decision 9): counts and empty panels reflect what will be published;
  no new warning.
- **D10** (owner): wording follows Save and Publish (ADR-012 Option 10).
- **D11** (owner): a new item's Remove asks the same question, Not doing included,
  then drops it at once; built here, amending STY-046's S-level behaviour (its Remove
  dropped at once without asking).
- **D12** (owner, settled here rather than left to STY-070): a lost answer counts the
  removal written when no row holds the item's ID, or, without an ID, when its
  position no longer holds the loaded content and every other write is found
  written; nothing written is `network`, as Option 16 has it; anything else is
  unconfirmed and opens the DEF-015 hold.
- **D13** (owner, Decision 8): the write is STY-070, ahead of this story.
- **D14** (owner): no new prototype round: the designs predate STY-065 to STY-068 and
  the dialog as decided, and the build's before/after screenshots are reviewed
  instead.

## Starting point

Audited at `3cd6b8f`.

- "Undo changes" and a new item's "Remove" share one drop path, and the footer's
  `Pending` is `"changed" | "new"`; a removal is a third state, and its Remove opens a
  dialog where today's drops at once.
- The compact row (STY-067) takes the card's tag and drop control as props, so both
  views gain the state together.
- `publishesNoItems` and the jump navigation's counts read the page's items; neither
  knows a removal.

## Out of scope

- The row-deleting write, its conflict and its lost answer: STY-070.
- Removing a roadmap: STY-048.
- What the public site shows: a separate app.

## Delivery

### Departures

- **S4: "the publish dialog says the public would see no items"** (agent): today only
  "Publish roadmap"'s question says it (STY-042 S3), on a roadmap not yet published;
  "Publish changes" never has. D9 asks for no new warning, so `publishesNoItems` now
  counts a removed item as gone, and "Publish roadmap" says it when the removals leave
  the public site nothing to show. A published roadmap's "Publish changes" still says
  nothing of it.
- **S2: a removed card shows as it did, in its place** (agent): with any pending edits
  beneath it shown, struck through, so it "stays where it was" even under a pending
  move, which puts it where the move does. Its edits count for nothing and are not
  listed (D5); "Undo removal" brings back the card as it was, tagged "Changed".
- **S1: the question is a `Dialog`, not an `AlertDialog`** (agent): S1 asks for the
  top-corner close, which only the form dialogs have (EPC-017). It is the page's, as
  the item dialog is (`useRemovalDialog`), so a read that moves its item to another
  list leaves it open, and one that drops the item closes it. Remove is `destructive`,
  "Move to Not doing" the main button, as Disconnect's question has them.
- **Where Remove sits** (agent): on a card, after "Undo changes" and before Move, where
  a new item's Remove already was; in the compact view, at the foot of the opened row,
  with "Undo changes" and "Undo removal" (STY-067). A published item's Remove works
  while a publish is under way, as Edit does; "Undo removal", and a new item's
  controls, wait for it (`discardable`), since a removal sent can't be called back.
- **S8: the removed item keeps its slot in a pending order** (agent): it shows there,
  but is no stop of a move within it: the others' positions count without it (the
  Move menu's "In Now: 2 of 2"), and they move around it (`reorderItem`).
- **Tests** (agent): `changedParts`, `publishesNoItems`, `reorderItem`, the jump counts
  and `openConflicts` (the pending-edit rules) were written first and seen red. The
  page tests followed the code and were shown red by breaking it (Scenario evidence).
  S6's Playwright journey runs once, at the default size: the accessibility spec runs
  it on a phone in both themes, as EPC-011's delivery notes have a dialog's journey.
- **Playwright's names match by substring** (agent): "Move Minimal card" matched the
  new "Remove Minimal card", so every spec's item Move is found `exact`.

### Contract for dependents

- **A page's item carries its removal** (`PageItem.removal`): set for an item the
  roadmap holds that is removed. Its `shown` and `entry` are as before, the entry
  counting for nothing until it is undone. `pageItemsOf(items, changes, keyOf)` builds
  the page's items, which `usePageItems` and the tests' `pageItemsOf` share.
- **`changedParts` lists a removal** (`kind: "removal"`, the item as read, at its
  position) among the items, and leaves out the edits beneath it; `WhatChanges` names
  it "Removed".
- **`openConflicts` opens a `RemovalConflict`** as an `OpenRemovalConflict`
  (`kind: "removal"`), while the removal is pending from an item other than the one
  found, before its item's own fields; the review draws it (`RemovalConflictItem`).
- **The card's controls**: `EditControls` takes `remove`, a slot before `move`, and
  `droppable` and `dropButton` for "Undo removal"; `DropButton` draws "Undo changes" or
  "Undo removal" for its `pending`, and nothing for `new`; `RemoveButton` asks.
  `ItemControl` names the four controls focus is sent back to.
- **`RoadmapItems` takes `action`** (`publishAction`), which the question words by.
- **Test helpers**: Vitest `features/roadmaps/testing/removal-dialog.ts`
  (`askToRemove`, `removeItem`, `removalDialog`, `REMOVAL`); Playwright
  `askToRemove`, `removeItem` and `removalDialog` in `tests/e2e/fixtures/dialogs.ts`.

### Scenario evidence

All page tests are in `src/features/roadmaps/pages/roadmap-detail-page-removing.test.tsx`
unless named otherwise; Playwright's in `tests/e2e/removing-an-item.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `Remove asks first, with Not doing first (S1)`: the question, its order and focus, Cancel, Escape and the corner close, a click outside, "Move to Not doing", an expired session, a compact row; Playwright `a published item is removed…` on a desktop and a phone                                                                                                                                                     |
| S2       | `A confirmed removal (S2)`; Playwright `a published item is removed…` (struck heading, focus, held Edit, no write)                                                                                                                                                                                                                                                                                                      |
| S3       | `Undo removal (S3)`: the edits beneath, the count, Discard all, Disconnect then Keep                                                                                                                                                                                                                                                                                                                                    |
| S4       | `What the page counts (S4)`; `jump-targets.test.ts` (`leaves a removed item out of its placement's count…`); `pending-changes.test.ts` (`leaves the public site no items once every placed item is removed`)                                                                                                                                                                                                            |
| S5       | `Publishing a removal (S5, S7)`; `pending-changes.test.ts` (`is listed as removed at its item's place…`); Playwright `a published item is removed…` (the dialog's line, the row deleted)                                                                                                                                                                                                                                |
| S6       | `A co-lead's change to a removed item (S6)`: the review, Keep the item, Remove anyway; `conflicts.test.ts` (`is open while the removal is pending…`, `is closed by Remove anyway…`); Playwright `a co-lead's change to a removed item is reviewed…`; `structure.spec.ts` and `accessibility.spec.ts` (`an item's removal…`)                                                                                             |
| S7       | `publishes the rest when a co-lead has already deleted the item…`                                                                                                                                                                                                                                                                                                                                                       |
| S8       | `A removal in a placement with a pending order (S8)`; `pending-orders.test.ts` (`a removed item in a pending order (STY-049 S8)`)                                                                                                                                                                                                                                                                                       |
| S9       | `A roadmap that isn't published (S9)`                                                                                                                                                                                                                                                                                                                                                                                   |
| S10      | `A new item's Remove (S10)`; `roadmap-detail-page-adding.test.tsx` (`is dropped by Remove once asked…`, the empty roadmap's panel); `roadmap-detail-page-compact.test.tsx` (`ends in Remove for an item added…`); Playwright `a new item's Remove asks the same question…` on a desktop and a phone, and `adding-an-item.spec.ts`                                                                                       |
| S11      | `Not doing where it means nothing (S11)`                                                                                                                                                                                                                                                                                                                                                                                |
| S12      | `Welsh (S12)`: the question, the tag and Undo removal, the publish dialog's line and the review's removal form in Welsh                                                                                                                                                                                                                                                                                                 |
| Reads    | `A read that lands while the dialog is open`: a co-lead's move keeps it open, an item gone closes it                                                                                                                                                                                                                                                                                                                    |
| Red      | The six new pure-rule tests failed before the code (`changedParts`, `publishesNoItems`, `reorderItem` twice, the jump count, `openConflicts`). Broken finished code turned the page tests red: focus after Remove sent to Remove (2 tests), Not doing always offered (2), no "Removed" line (2), the review listing no field (1), a removed card not struck (1), the review's Welsh "Remove anyway" left in English (1) |
