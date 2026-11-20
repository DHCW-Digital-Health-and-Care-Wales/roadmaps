# STY-082: The publish dialog flags a new item that has only a title

- **Status**: Done — delivered in its PR; grilled with the owner on 2026-11-20
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: STY-080 (hard, must be on the default branch), STY-081 (preferred
  order)
- **Binding ADRs**: ADR-012, ADR-008, ADR-010
- **Suggested model**: Sonnet — one marker on a list the publish dialog already draws
- **Delivered**: _PR URL, set once the PR is open_

## Summary

Quick add makes it easy to put down items by title alone and fill them in later. Before
publishing, a Product Lead sees which new items still have only a title: the publish
dialog marks each one in its list of new items. Nothing is blocked; a title and a
placement are still all an item needs. The cards on the page show nothing extra.

## Scope

The publish dialog's list of changes (`features/`), and the rule that says a new item
has only a title; copy in both catalogues.

## Acceptance criteria

### S1: A title-only new item is marked (quick add round 1 Q1)

**Given** a roadmap with two new items, "Book a hearing test online" with only a title
and "Change your appointment by text" with a description **When** Sam chooses "Publish
changes" or "Save changes", or "Publish roadmap" on a roadmap not published **Then** the
dialog lists both under "What changes", marked as new as today, and marks the first as
having only a title **And** however the item was added, by quick add or the item dialog,
the rule is the same

### S2: Nothing is blocked

**Given** that dialog **When** Sam confirms **Then** both items are written, as STY-045
writes them

### S3: Welsh and assistive technology

**Given** the interface is in Welsh, or Sam uses a screen reader **When** the dialog
lists a title-only item **Then** its mark is in Welsh and is read with the item's title;
axe finds nothing in the dialog

## Decisions

- **D1** (owner, 2026-11-20, quick add round 1 Q1): publish a title-only item, but flag
  it in the publish dialog, over publishing it unmarked or refusing until it has a
  description.
- **D2** (owner, 2026-11-20, quick add round 5 Q1): the item's card on the page shows
  nothing extra.
- **D3** (agent, 2026-11-20): "only a title" means every field but the title and the
  placement is empty: description, expected outcome, phase, tags, organisations and
  details. Over "no description", which would mark an item whose only text is in its
  outcome. The mark's words go through the copywriter skill at delivery; "Title only" is
  the draft. Delivered as "New item, title only" (see Delivery).

## Out of scope

- A published item with only a title: not a new item, so not marked.

## Delivery

### Departures

- **The mark is one line, not a second mark** (agent): the line under an item's title
  in "What changes" says "New item, title only" in place of "New item", the way a
  removed item's says "Removed" (STY-049) and not as a badge beside it. A mark in
  one string reads whole to a screen reader and in Welsh ("Eitem newydd, teitl yn
  unig"), where a second string joined to the first would need the order and the
  mutation settled twice. D3's draft "Title only" became these words after the
  copywriter skill's judgement.
- **The existing STY-047, STY-025 and STY-046 specs now say "title only"** where they
  add an item by title and a placement, which is title only by D3 (the page tests,
  `adding-an-item.spec.ts` and the `add-item-publish-dialog` aria snapshot).
  Where an item has more, an expected outcome or a phase, they keep "New item".

### Contract for dependents

- **`hasOnlyTitle(newItem)`** (`domain/roadmap/new-item.ts`): every `EDITABLE_ITEM_FIELDS`
  value but the title and the placement is `""`. A field added to that list counts
  without a change there. `WhatChanges` calls it; nothing else reads it, and no card
  shows the result (D2).
- **`roadmaps.publish.dialog.newItemTitleOnly`** (en and cy) stands in place of
  `newItem` for such an item.

### Scenario evidence

Domain tests are in `src/domain/roadmap/new-item.test.ts`; page tests in
`roadmap-detail-page-adding.test.tsx` and `roadmap-detail-page-quick-add.test.tsx`;
Playwright's in `tests/e2e/adding-an-item.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `hasOnlyTitle` for each field that makes an item more than a title; page tests `marks a title-only item and one with a description differently…`, `does not mark an item whose only text is its expected outcome`, `stops marking an item once a description is added to it`, the Save changes and Publish roadmap dialogs, and a quick added item (`The publish dialog flags what quick add makes`); Playwright `the publish dialog marks a new item that has only a title…` |
| S2       | Playwright, same test: both items are written in the one write, as STY-045 writes them; page test `marks it for “Save changes”… blocks nothing`                                                                                                                                                                                                                                                                                                                               |
| S3       | page test `says it in Welsh, in the list item that holds the title`; Playwright `adding an item in Welsh`; the axe spec's publish dialog, whose item is title only, in both themes; the `add-item-publish-dialog` aria snapshot                                                                                                                                                                                                                                               |
| Red      | `hasOnlyTitle`'s tests were written first and failed (8 of 30) before it existed. The page tests were shown red by breaking the finished mark: 11 of 100 failed.                                                                                                                                                                                                                                                                                                              |
