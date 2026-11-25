# DEF-033: The editor leaves text it always shows in one language unmarked

- **Status**: Done
- **Severity**: Low — a screen reader reads a family's English name with Welsh
  pronunciation, or Welsh text with English, on the families page and in a conflict
- **Area**: Features/UI
- **Epic**: EPC-022-monorepo-and-backend-foundation
- **Depends on**: none
- **Binding ADRs**: ADR-008
- **Suggested model**: Sonnet — a few sites, through STY-098's `ContentText` pattern
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/322

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

- **D1** (owner, 2026-11-25, triage of STY-098 delivery's finding): fix; DEF-033 is
  `Proposed`.

## Delivery

### Departures

- **Cause**: the sites with the same cause were more than those listed: also the item
  form's organisations (its shut line and its checkboxes, `dialogs/item-form.tsx`),
  the Details field's shut list (`editing/details-field.tsx`), the English family
  names a family conflict shows (`families/family-conflict-review.tsx`), a roadmap's
  own text in a conflict, and, in the open Tags field, each tag's row and each tag
  offered. All are marked (agent).
- **S1**: left unmarked: a product lead's name in a conflict, as on the roadmap's
  page, since people's names are in no one language; and the family's name among a
  family button's hidden words ("Change Single Record"), as STY-098's Delivery keeps
  words that only complete a button's name (agent).
- Status messages that quote typed English are strings that can't mark a part of
  themselves: they and a horizon quoted as written are DEF-041. The fields that hold
  English are DEF-042 (agent).
- A tag offered in the open Tags field is marked on its visible text only: the
  button's name is an attribute, which stays unmarked (STY-098 D2) (agent).

### Contract for dependents

- Show text that is in one language whatever the interface's through
  `<WrittenText written="en" text={…}>` (or `"cy"`), as an element or inside a
  `<Trans>` sentence (`apps/editor/src/features/roadmaps/components/content-text.tsx`).
  Where an element sets its own `lang`, take `useWritten()` (`hooks/use-content.ts`)
  or the pure `showWritten()` (`shown-content.ts`); English details take
  `showEnglishDetails()` (`localise-details.ts`).
- These catalogue entries now place an element, so `<Trans>` reads them:
  `roadmaps.families.welshName` and `.notice.added`, `.changed` and `.changedPublic`
  (`<name />`), and `roadmaps.publish.notice.refused.removal.welsh` (`<welsh />`).
- An edit form's checkbox choice takes its option's `lang`, and `many.summary` returns
  what the shut field shows, or `null` for none.

### Scenario evidence

Each case below that expects a mark was seen failing before the code that passes it;
those that expect none passed before it too.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/editor/src/features/roadmaps/shown-content.test.ts` (`showWritten`, each language in each interface); `pages/families-page.test.tsx` (a family's heading marked in Welsh, its Welsh name in English); `families/family-outcome-notice.test.tsx` and `families/family-conflict-review.test.tsx` (the notices and a conflict's names in Welsh, nothing in English); `pages/roadmap-detail-page-one-language.test.tsx` (organisations on a card; the item form's tags, organisations and details, shut and, for tags and organisations, open, with nothing marked in English; and a refused publish's review: its English values marked in Welsh, a removed item's Welsh in English, and its placements and product leads' names not) |
