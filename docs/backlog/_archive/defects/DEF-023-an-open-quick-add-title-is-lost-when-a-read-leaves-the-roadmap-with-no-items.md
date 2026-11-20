# DEF-023: An open quick add title is lost when a read leaves the roadmap with no items

- **Status**: Won't fix — owner, 2026-11-20 (D1); archived. Found by STY-080 delivery
  (its correctness review)
- **Severity**: Low — a title typed in a quick add field, not yet added, is lost: a few
  words
- **Area**: Features/UI
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one component's drawing rule, once the owner chooses it
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead types a title in a placement's quick add field (STY-080) and, before
they add it, a read of the roadmap leaves it with no items and none pending: a co-lead
removed every item during a Refresh, or a publish of their own removed the last one
while they had left the page and come back. The page then shows an empty roadmap's
panel in place of the placements, as an empty roadmap does (STY-046), and the open
field goes with them, with what was typed. Nothing that was added is lost. The
workaround is to type the title again, from the panel's "Add an item".

## Reproduce

Found at STY-080's branch head `869d7db`, before its merge; quick add is not on the
default branch before STY-080. With the page tests' in-memory repository:

1. A roadmap holds one item, `Online booking`, in Now; its page is open.
2. Ask for a Refresh, holding its read (`holdRefresh`).
3. Choose "Add the first item" under Next and type `Book a hearing test`.
4. A co-lead removes the roadmap's only item (`repository.coLead`), then let the read go.

**Expected**: the field stays open with `Book a hearing test` in it.
**Actual**: the field has gone and "No items yet" heads the page's panel.

The same follows a publish that removes the roadmap's last item while the field is
open, reached by Back then Forward during the write (found by STY-080's review).

## Cause

Verified: `RoadmapItems` draws the empty roadmap's panel in place of every placement
when the page has no item read or pending (`hasGroupedItems`), which unmounts each
`QuickAdd` and the title it holds; quick add on an empty roadmap is out of STY-080's
scope (STY-046 D3, D13).

- `rg -n 'hasGroupedItems\(groups\)' src/features/roadmaps` — 2 sites:
  `components/roadmap-items.tsx` (the panel), `pages/roadmap-detail-page.tsx` (whether
  the placement navigation shows).

## Acceptance criteria

None: Won't fix (D1).

## Decisions

- **D1** (owner, 2026-11-20, STY-080 delivery's question on its review): Won't fix.
  Too rare, and the loss is a few words typed but not added; the empty roadmap keeps
  its panel, as STY-046 D3 and D13 and STY-080's Out of scope have it. Reopen if a
  Product Lead reports losing a title this way.
