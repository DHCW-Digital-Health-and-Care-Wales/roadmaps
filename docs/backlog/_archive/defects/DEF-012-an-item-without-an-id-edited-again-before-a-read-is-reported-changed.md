# DEF-012: An item without an ID, edited again before a read holds its publish, is reported changed

- **Status**: Superseded — by [DEF-015](DEF-015-a-write-the-editor-can-t-read-back-leaves-the-app-out-of-step.md), owner, 2026-11-15 (D1); archived
- **Severity**: Low — the second edit is discarded with "changed since you opened it",
  and the Product Lead redoes it after a Refresh
- **Area**: Features (pending-edit rules)
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: DEF-009 (merged)
- **Binding ADRs**: ADR-012 (Options 11, 13)
- **Suggested model**: Opus — how an item without an ID is found while the page can't read
- **Delivered**: _(add on delivery)_

## Summary

On a roadmap's first publish from the editor its items have no ID. A Product Lead
publishes an edit to one; the write lands (giving every row an ID) and the read after
it fails, so DEF-009 keeps the edit pending. If they edit the same item again before
any read and publish, the item is reported as changed since they opened it, and that
edit is discarded. A read in between (Refresh) avoids it. Worked out from the code.

## Reproduce

On `fix/def-009-published-item-stays-pending` (not yet on the default branch), as a
page case built on `roadmap-detail-page-editing.test.tsx`, with items that have no ID:

1. Edit an item's title and publish, the next reads of the items failing.
2. Edit the same item's title again, let reads succeed, and publish.

**Expected**: the second edit is published.
**Actual**: the publish reports the item as changed since it was opened.

## Cause

Suspected, from the code. `keepUnread` (`editing/pending-changes.ts`) keeps the content
an item without an ID was loaded with, so its card finds it in the items last read; the
publish finds such an item by its position holding that content, or that content with
the pending edits applied (ADR-012 Option 11), and the row holds what was published
before the second edit, which is neither. Taking the published content instead would
fix the publish but hide the kept edit from the card (DEF-009 S2).

- `rg -n 'entry.item.id === null' src/features/roadmaps/editing/pending-changes.ts` — one site.

## Acceptance criteria

### S1: A second edit of an item without an ID is published

**Given** a published edit of an item without an ID, kept pending because the read after it failed
**When** the Product Lead edits the item again and publishes before any read
**Then** the second edit is published, and the item is not reported changed

## Decisions

- **D1** (owner, 2026-11-15, grilling of DEF-011 to DEF-014, Q6–Q9): Superseded by
  [DEF-015](DEF-015-a-write-the-editor-can-t-read-back-leaves-the-app-out-of-step.md).
  Rather than teach the pending-edit rules to tell a kept edit from an ordinary one, a
  write the editor can't read back holds the app until a Refresh succeeds, so this
  sequence can't be reached (DEF-015 S7), and DEF-009's re-basing is removed. A
  database API whose write returns what it wrote removes the case (ADR-012).

## Delivery _(add on delivery; as in `story.md`)_
