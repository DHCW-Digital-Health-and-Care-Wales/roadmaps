# DEF-017: An edit made while a publish moves its item's row is reported as removed

- **Status**: Needs triage — found by STY-051 delivery (its correctness review)
- **Severity**: Low — one edit, typed in the second or two a publish takes, to an item
  that has never had an `Item ID`, is dropped with a notice that the item was removed
- **Area**: Domain + Features/UI
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: ADR-012 (Options 11 and 13; _STY-051 amendments_)
- **Suggested model**: Opus — how an item without an ID is found is a rule of ADR-012
- **Delivered**: _(add on delivery)_

## Summary

Since STY-051 a publish can move rows. A Product Lead who edits an item again while
their publish is still being written keeps that edit, pending. If the item had no
`Item ID` when the page loaded it (a row typed into the spreadsheet by hand, on a
roadmap the editor has not published since) and the publish moved its row, or the row
of an item moved past it, the kept edit shows on no card, and the next publish says
someone else removed or changed the item and drops the edit. The item is still there.
It can happen once per such item: any publish gives every item an ID. The workaround
is to make the edit again. STY-051 D8 records the same effect for a co-lead.

## Reproduce

At `94b0063`, STY-051's delivery, not yet on the default branch; before it no publish
moved a row, so this did not happen. With the pending-edit rules alone
(`src/features/roadmaps/editing/pending-changes.ts`) and the publish plan:

1. A roadmap reads `X` (Later, no ID) then `A` (Now).
2. Move `X` to Now and publish: `sent = editItem(NO_CHANGES, undefined, x, 0, { placement: "now" })`.
3. Before the answer arrives, retitle `X`: `editItem(sent, sent.items[0], x, 0, { title: "X2" })`.
4. The publish lands and is read back: `settlePublished`, then `reconcileItems` over
   `A`, `X` (Now, with its new ID), the order the publish left.
5. Publish again: `planRoadmapPublish` over that read.

**Expected**: the retitle shows on `X`'s card, and the second publish writes it.
**Actual**: `matchItemChanges` matches the entry to no item (it is still at position
0, with no ID), and the plan refuses it as a missing item. With the rows left as they
were (`X`, `A`), the same steps match it. Run as a throwaway test in this delivery;
no test is committed.

## Cause

Verified. An entry for an item without an ID is found at its `position`, holding what
was loaded (`findEditedItem`, ADR-012 Option 11). `settlePublished` keeps an entry
edited since it was sent with the position it had, and the read that follows a publish
now finds another item there. `reconcileItems` gives an entry its item's ID only once
it has matched it.

- `rg -n 'position' src/domain/roadmap/find-edited-item.ts src/features/roadmaps/editing/pending-changes.ts`

## Open questions

- **Q1**: What should happen to an edit made during a publish that moves the row of
  an item with no ID?
  - (a) Accept it, as STY-051 D8 accepts the co-lead's case (recommended) — the build
    stays as it is: the edit is dropped at the next publish, with the "removed or
    changed" notice. Costs nothing; rare, and once per item.
  - (b) Hold Edit and Move on an item with no ID while a publish of its roadmap is
    under way, as a new item's are held — adds a held state to those cards for the
    length of a publish; removes the case.
  - (c) Find the item again after the publish by the content it was sent with —
    changes how an item without an ID is found (ADR-012 Options 11 and 13), which the
    owner chose as position plus content; needs an ADR amendment.

## Decisions
