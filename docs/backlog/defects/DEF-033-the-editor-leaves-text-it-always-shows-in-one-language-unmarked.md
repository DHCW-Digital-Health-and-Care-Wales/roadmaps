# DEF-033: The editor leaves text it always shows in one language unmarked

- **Status**: Needs triage — found by STY-098 delivery
- **Severity**: Low — a screen reader reads a family's English name with Welsh
  pronunciation, or Welsh text with English, on the families page and in a conflict
- **Area**: Features/UI
- **Epic**: EPC-022-monorepo-and-backend-foundation
- **Depends on**: none
- **Binding ADRs**: ADR-008
- **Suggested model**: Sonnet — a few sites, through STY-098's `ContentText` pattern
- **Delivered**: _(add on delivery)_

## Summary

STY-098 marks English shown in place of empty Welsh. Some text the editor shows in one
language on purpose, whatever the interface's, is still unmarked: the families page
heads each family with its English name and gives its Welsh name as "Welsh: …", a
family's notices name it in English, an item shows its organisations by their English
short names ("All Wales"), the tags field shows the English tags being edited, and the
conflict review gives a field's English values and a removed item's Welsh as "In
Welsh: …". In the other interface language a screen reader reads that text with the
wrong pronunciation (WCAG 2.2 SC 3.1.2, Language of Parts). Sighted Product Leads see
no difference.

## Reproduce

At commit `ce5027d3` on the default branch, with the example spreadsheet and its lists
(`EXAMPLE_SPREADSHEET_WITH_LISTS`):

1. Choose Cymraeg and connect.
2. Open "Teuluoedd, categorïau a sefydliadau" (the families page).

**Expected**: the family headings "Single Record" and "Medicines & Diagnostics" carry
`lang="en"`.
**Actual**: they sit in the page's `lang="cy"` with no `lang` of their own; nothing on
the page is marked.

## Cause

Verified: these sites show text in one language (a `LocalisedText`'s `.en` or `.cy`,
or English as written) with no `lang` of its own, so nothing is marked where its
language differs from the interface's.

- `rg -n 'name\.en\b|name\.cy\b|notes\.welsh' apps/editor/src/features --glob '*.tsx' --glob '!*.test.tsx'`
  — the shown sites: `families/family-entry.tsx` (the heading and the "Welsh: …" line),
  `families/change-family-form.tsx` and `families/add-family-form.tsx` (the name their
  notices give), `editing/conflict-review-dialog.tsx` (a removal conflict's "In
  Welsh: …").
- `rg -n 'unmarked\(' apps/editor/src/features --glob '!*.test.*'` — the sites STY-098
  leaves unmarked on purpose; of them, text in one language: `components/item-fields.tsx`
  (organisations' short names, English in both languages, ADR-014) and
  `editing/tags-field.tsx` (the English tags being edited). The rest are interface copy.
- `rg -n 'useShownItemValue' apps/editor/src/features` — the conflict review's values of
  an item's field (`editing/conflict-review-dialog.tsx`), the English column as written.

## Acceptance criteria

### S1: Text shown in one language is marked in the other interface

**Given** the editor in Welsh
**When** the families page heads a family with its English name
**Then** the name carries `lang="en"`
**And** in English, a Welsh name or Welsh text shown as such carries `lang="cy"`

## Decisions
