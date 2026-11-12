# DEF-004: A pending "No category" is dropped, unwritten, once the roadmap's category leaves its list

- **Status**: Needs triage — found by STY-028 delivery, recorded by its retro
- **Severity**: Low — a Product Lead's pending change disappears without a publish, and
  the public site keeps the old category; it needs the Categories tab edited by hand
  while the change is pending
- **Area**: Infrastructure + Features/UI
- **Epic**: EPC-006-product-families-and-colours
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-013
- **Suggested model**: Opus — where the category read and the pending-change settling
  meet, across the adapter and the feature
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead sets a roadmap to "No category" and leaves it pending. If the roadmap's
current category is then removed or renamed in the Categories tab by hand, the next
read shows the roadmap with no category, so the pending "No category" looks published
and disappears. The spreadsheet still holds the old category, and the public site still
groups the roadmap under it. A family in the same position keeps its name, so a pending
"No family" stays. Workaround: choose "No category" again and publish.

## Reproduce

At commit `6459466` on the default branch, as a Vitest case:

1. Parse an index row whose `Category` is `Hospital & Specialist Care`, with a
   Categories list that has it: the roadmap's `categoryId` is its ID.
2. `editRoadmap` it to `categoryId: ""` ("No category"): the change is pending.
3. Parse the same row with a Categories list that lacks that category, and
   `reconcileRoadmap` the pending changes with that read.

**Expected**: "No category" stays pending, as "No family" does for a family the list
lacks.
**Actual**: the read's `category` is `null`, and the pending change is dropped.

A read with the Categories tab missing keeps the pending change for a public-site
spelling, as here, but drops it for any other name, which ADR-013's fixed list makes
unlikely.

## Cause

Verified: `parseRoadmapIndex` (`roadmap-index-parser.ts`) reads a `Category` its list
lacks as none, recording `unknown-category`, where a family its list lacks keeps its
own name (`familyNotListed`). Without a list it reads `Category` by the public site's
spellings, and any other name reads as none too. `noChoiceHeld` (`pending-changes.ts`)
keeps a pending "No category" only while the read still names a category, so either
read settles it. The case "keeps No family or category pending while a read names one
it can't link" (`pending-changes.test.ts`) builds such a read by hand with the name
kept, which the parser doesn't produce for categories.

- `rg -n '"unknown-category"|PUBLIC_SITE_CATEGORIES|noChoiceHeld' src --glob '!*.test.ts'` — 9 sites:
  `roadmap-index-parser.ts:37,122,142,143,435,468,470` (the problem code, the
  fallback spellings and both reads that give none) and `pending-changes.ts:207,216`
  (`reconcileRoadmap`'s one use of `noChoiceHeld`, and its definition).

## Acceptance criteria

### S1: "No category" stays pending while the roadmap's category is unlisted

**Given** a roadmap with a listed category, and "No category" pending
**When** the roadmap is read again with that category gone from the Categories tab, or
with the tab missing
**Then** "No category" stays pending

## Decisions

## Delivery _(add on delivery; as in `story.md`)_
