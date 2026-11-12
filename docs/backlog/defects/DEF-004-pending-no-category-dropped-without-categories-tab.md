# DEF-004: A pending "No category" is dropped, unwritten, once the Categories tab goes missing

- **Status**: Needs triage — found by STY-028 delivery, recorded by its retro
- **Severity**: Low — a Product Lead's pending change disappears without a publish; it
  needs the Categories tab removed or renamed while the change is pending
- **Area**: Infrastructure + Features/UI
- **Epic**: EPC-006-product-families-and-colours
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-013
- **Suggested model**: Opus — where the category read and the pending-change settling
  meet, across the adapter and the feature
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead sets a roadmap to "No category" and leaves it pending. If the
Categories tab is then removed or renamed, the next read of the roadmap shows it with
no category, so the pending "No category" looks published and disappears. The
spreadsheet still holds the old category, and the public site still shows it. This
happens only when the old category isn't one of the public site's own spellings, such
as a category added to the list. Workaround: restore the tab and choose "No category"
again.

## Reproduce

At commit `6459466` on the default branch, as a Vitest case:

1. Parse an index row whose `Category` is `Clinical`, with a Categories list that has
   `Clinical`: the roadmap's `categoryId` is that ID.
2. `editRoadmap` it to `categoryId: ""` ("No category"): the change is pending.
3. Parse the same row with no Categories list (`categories: null`), and
   `reconcileRoadmap` the pending changes with that read.

**Expected**: "No category" stays pending, as it does for a family when the Families tab
is missing.
**Actual**: the read's `category` is `null`, and the pending change is dropped.

## Cause

Verified: without a list, `parseRoadmapIndex` reads `Category` by the public site's
spellings (`PUBLIC_SITE_CATEGORIES`, `roadmap-index-parser.ts`), and any other name
reads as none. `noChoiceHeld` (`pending-changes.ts`) keeps a pending "No category" only
while the read still names a category, so a name the fallback can't read settles it.
The case "keeps No family or category pending while a read names one it can't link"
(`pending-changes.test.ts`) builds that read by hand with the name kept, which the
parser doesn't produce for categories.

- `rg -n 'PUBLIC_SITE_CATEGORIES|noChoiceHeld' src` — the parser's fallback and its one
  caller, and `reconcileRoadmap`'s one use of `noChoiceHeld`.

## Acceptance criteria

### S1: "No category" stays pending while the Categories tab is missing

**Given** a roadmap whose category is listed but isn't a public-site spelling, with
"No category" pending
**When** the roadmap is read again with the Categories tab missing
**Then** "No category" stays pending, and a publish refuses it as STY-028 refuses any
choice while its list is missing

## Decisions

## Delivery _(add on delivery; as in `story.md`)_
