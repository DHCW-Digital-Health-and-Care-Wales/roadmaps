# STY-047: The publish dialog names the new items

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: STY-046 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012, ADR-008, ADR-010
- **Suggested model**: Sonnet — one list that already names pending changes learns of
  a new kind

## Summary

Before publishing, a Product Lead sees which items are new: the publish dialog lists
each new item by its title, marked as new, beside the edits. A Product Lead should
know what publishing will make public, and a new item is the largest change there
is. Nothing about what is written changes, and the review of a co-lead's conflicting
change never lists a new item, which can't conflict.

## Scope

The publish dialog's list of changes (`features/`); copy in both catalogues.

## Acceptance criteria

### S1: The publish dialog lists a new item (items round 3 Q3)

**Given** a roadmap with a new item and an edit to another
**When** Sam chooses "Publish changes", "Save changes" or "Save and publish"
**Then** the dialog lists the new item under "What changes", by its title, marked as
new, with the edited item as it is listed today
**And** a conflict in the edit publishes nothing and keeps the new item pending
(STY-045 S3), and the conflict review never lists a new item

### S2: Welsh and assistive technology

**Given** the interface is in Welsh, or Sam uses a screen reader
**When** the publish dialog lists a new item
**Then** its marker is in Welsh and is read with the item's title; axe finds nothing
in the dialog

## Decisions

- **D1** (owner, 2026-11-14, items round 3 Q3, confirming the agent's choices): a new
  item is listed under "What changes" and can never conflict with a co-lead.
- **D2** (agent, 2026-11-14, owner asked for stories that fit one agent's context):
  cut from STY-046, over one story of eleven scenarios across the page, the list and
  the publish dialog.

- **D3** (agent, 2026-11-15, from STY-046's delivery): until this story lists them,
  the publish dialog shows no "What changes" when new items are all that is pending,
  in place of a heading over an empty list (`publish-dialog.tsx`). The list this
  story adds is never empty then, so that guard goes with it.
- **D4** (agent, 2026-11-15; put to the owner in the PR): S1 names "Save and
  publish", which is the button of the question "Publish roadmap" asks, and that
  question listed nothing: it says how many changes go public with the roadmap
  (STY-035 S5). It now lists them too, under that sentence, in the same list, whenever
  changes go with the publish. Over leaving one of S1's three ways without the list,
  and over a list of new items alone there, which would name some of what is written
  and not the rest. Unpublishing lists nothing, since its changes stay pending
  (STY-035 S7). Taking the list back out of that question is one line.
- **D5** (agent, 2026-11-15): the marker is "New item", on the line under the title
  where an edited item's changed fields are, so the list keeps one shape. Over the
  card's "New" tag drawn in the list, a second look for one line.
- **D6** (agent, 2026-11-15): new items are listed last, in the order added: where
  the page shows them among its items, and the order they are written in (STY-045 D2).

## Out of scope

- Adding, editing and removing a new item, the tags offered and the empty-roadmap
  line: STY-046. Its write: STY-045.

## Delivery

### Departures

- **S1: "Save and publish" opens no dialog of its own** (agent, D4): it confirms
  "Publish roadmap", whose question now lists what changes, edits included, which it
  did not list before. "Publish changes" and "Save changes" list an edited item as
  they did.
- **S1: nothing of the conflict was built** (agent): a conflict in the edit already
  published nothing and kept the new item, and the review already listed fields of
  edits alone (STY-045 S3, STY-046). The three tests of it, one for each way to
  publish, passed when written: they hold the scenario, and were not red first.
- **S2: the journey runs once** (owner; CHO-011 D5, the epic's delivery notes), at the
  default size and theme. Axe checks the publish dialog with a new item in both
  themes, and "Publish roadmap" with one at 375px.
- **D3: the guard is gone, and an older fault shows through it** (agent): while the
  dialog closes after a publish, nothing is pending, so "What changes" stands over no
  lines for that moment. Before STY-046 the same moment dropped the one list there
  was. Recorded, not fixed here:
  [DEF-010](../../defects/DEF-010-the-publish-dialog-changes-what-it-shows-while-it-closes.md).
- **Every alert dialog scrolls when it is taller than the screen** (agent): "Publish
  roadmap" became the third to need it, with the publish dialog and a family's, so
  the two copies of the rule went into the dialog itself.
- **Tests.** The publish dialog's list was written first and run red: six page tests
  failed before any code. The tests of the list in "Publish roadmap" came after its
  code, and were shown to fail with its line taken out, which was put back from a
  saved copy: tests that discriminate, not ones written first. The Playwright specs
  followed working code.
- **Welsh is machine-assisted** (agent), as all of `cy.ts` is: "Eitem newydd" wants a
  fluent read.

### Contract for dependents

- **Nothing about what is written changed.**
- **`WhatChanges`** (`editing/what-changes.tsx`) takes a roadmap's `changes` and draws
  the heading and the one list: the roadmap's own text, each edited item, then each new
  item. A dialog that asks before pending changes are written draws it; a new kind of
  pending change is added there, once. `changedParts` still lists edits only: the new
  items come from `changes.newItems`, which `countChanges` counts too.
- **`PublishedStateQuestion.changes`** (`editing/use-published-state.ts`) is the
  pending changes as the question was asked, in place of `count`, which
  `PublishedStateAction` now takes from them.
- **Gone**: the publish dialog's guard on an empty list, and the scrolling rule on
  `PublishDialog` and `FamilyChangeDialog`, which `AlertDialogContent` now has.
- **Copy**, in both catalogues, the Welsh machine-assisted:
  `roadmaps.publish.dialog.newItem`.
- **Tests**: `listedChanges` reads the list's lines, in
  `roadmap-detail-page-adding.test.tsx` and in `tests/e2e/adding-an-item.spec.ts`.
  Structure snapshot: `add-item-publish-dialog`.

### Scenario evidence

`adding` is `src/features/roadmaps/pages/roadmap-detail-page-adding.test.tsx`;
`publishing` is
`src/features/roadmaps/pages/roadmap-detail-page-publishing-roadmap.test.tsx`; `e2e`
is `tests/e2e/adding-an-item.spec.ts`; `axe` is `tests/e2e/accessibility.spec.ts`;
`structure` is `tests/e2e/structure.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | adding "lists a new item by its title, marked as new, after the edited item as it is listed", "lists new items alone, in the order added, which they are written in", "lists it for “Save changes” too, on a roadmap that isn't published", "lists it in the question that offers “Save and publish”, under how many changes go public", "names a new item by the title it has now, once, whatever was edited of it" and "a conflict in the edit publishes nothing through …, keeps the new item pending, and its review never lists it" (“Publish changes”, “Save changes”, “Save and publish”); publishing S2, S5 and S7 (the question lists edits that go with a publish, and nothing with none pending or when unpublishing); e2e "the publish dialog lists a new item beside an edit; a co-lead's conflict publishes nothing and keeps it" (once, default theme and size), the first journey and the empty roadmap's; structure `add-item-publish-dialog` |
| S2       | adding "marks a new item in Welsh, in the line that holds its title" and "gives the marker in the list item its title is in, so the two are read together"; e2e "adding an item in Welsh"; axe "adding an item: … the new item's card and the publish dialog that lists it" (both themes) and "an empty roadmap's panel …, then its first item in “Publish roadmap”, on a phone" (both themes)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
