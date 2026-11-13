# DEF-005: An open About form shows "No family" after Refresh reads a co-lead's family

- **Status**: Needs triage — found by the STY-031 retro's review
- **Severity**: Low — the form shows a family choice that isn't the roadmap's, though
  Done changes nothing and nothing wrong is written
- **Area**: Features/UI
- **Epic**: EPC-006-product-families-and-colours
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-013
- **Suggested model**: Sonnet — one form's options, beside the item form's fix for
  the same case
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead opens About on a roadmap whose family isn't in the family list, so the
Family choice shows that family as not listed. While the form is open, a co-lead gives
the roadmap a listed family, and the Product Lead presses Refresh. The Family choice
now shows "No family", though the roadmap has the co-lead's family and Done keeps it.
A Product Lead who trusts the form may think the roadmap has no family. Workaround:
close the form and open it again.

## Reproduce

At commit `c7d50de` on the default branch, as a Vitest page case built on
`roadmap-detail-page-choices.test.tsx`:

1. Render a roadmap whose row names a family the list lacks (`familyId: null`,
   `familyNotListed: true`), and open About: Family shows "Legacy family (not listed)".
2. As a co-lead, set the roadmap's family to a listed one, then press Refresh.
3. Read the Family select, then press Done.

**Expected**: the Family choice keeps showing the value the form holds, as the not
listed family, and Done keeps it.
**Actual**: the options lose "Legacy family (not listed)", the select shows "No
family", and Done records no change, so the roadmap shows the co-lead's family.

## Cause

Verified: `EditableRoadmapAbout` builds its fields with `choices.fields(shown)` from
the roadmap as read now, while `EditForm` keeps the values it opened with.
`familyOptions` (`use-roadmap-choices.ts`) offers the not listed family only while
`shown.familyNotListed`, so the form's value loses its option, and a native select
shows its first enabled option for a value it lacks. The item form solved the same
case by building its options from `mode.opened.shown` (`editable-item-card.tsx`).

- `rg -n 'choices\.fields\(|familyNotListed && shown\.family' src --glob '!*.test.*'` —
  2 sites: `editable-roadmap-about.tsx:81` (the fields from the current read) and
  `use-roadmap-choices.ts:46` (the not listed option's condition). Category options
  have no option that depends on the read.

## Acceptance criteria

### S1: The open form keeps the not listed family it holds

**Given** About open on a roadmap whose family isn't listed
**When** Refresh reads a co-lead's listed family for it
**Then** the Family choice still shows the not listed family, and Done records no
change

## Decisions

## Delivery _(add on delivery; as in `story.md`)_
