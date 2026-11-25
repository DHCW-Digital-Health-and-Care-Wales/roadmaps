# DEF-042: The editor's fields hold English with no lang

- **Status**: Needs triage — found by DEF-033 delivery
- **Severity**: Low — in Welsh, a screen reader may read the English in a field with
  Welsh pronunciation
- **Area**: Features/UI
- **Epic**: EPC-022-monorepo-and-backend-foundation
- **Depends on**: none
- **Binding ADRs**: ADR-008
- **Suggested model**: Sonnet — a few fields, once the open question is answered
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead edits roadmap content in English whatever the interface's language. In
Welsh, the fields that hold it don't say it is English, so a screen reader may read
what is in them with Welsh pronunciation (WCAG 2.2 SC 3.1.2, Language of Parts).
Sighted Product Leads see no difference.

## Reproduce

At commit `83510047` on the default branch, with a roadmap whose item "Reminders" has
the tag "Patients" and the detail "Book by phone":

1. Choose Cymraeg, open the roadmap and edit the item.
2. Open its tags and choose to rename "Patients".
3. Open its details.

**Expected**: the English each field holds is marked `lang="en"`.
**Actual**: the title field, the rename field and the detail's text area have no `lang`
of their own and take the page's `cy`. The last two are named in Welsh by an
`aria-label` (`Ailenwi Patients`, `Manylyn 1 o 1, lefel uchaf`).

## Cause

Verified for the three fields reproduced, by code for the rest: no control that takes
roadmap content sets `lang`. The search: `rg -n '<(Input|Textarea|textarea)\b'
apps/editor/src/features/roadmaps`, leaving out the navigation's search box:

- `editing/edit-form.tsx`: the item and roadmap forms' text fields and text areas.
- `editing/details-field.tsx`: each detail's text area.
- `editing/tags-field.tsx`: the rename field and "Add a tag".
- `editing/quick-add.tsx`: the new item's title.
- `dialogs/add-roadmap-form.tsx`: the new roadmap's text fields.
- `families/family-form.tsx`: the family's name; its colour is in no language.

A `lang` on a control also reaches a name given to it by `aria-label`, which is in the
interface's language, as for the details, rename and quick add fields.

## Open questions

1. **Which fields should say they hold English?** A Product Lead using a screen reader
   in Welsh moves through the item form.
   - (a) None: nothing changes (recommended until a Product Lead reports it).
   - (b) Mark each field whose name comes from a label element, and leave those named
     by `aria-label`.
   - (c) Mark every one, naming from a label element those now named by
     `aria-label`.

## Decisions
