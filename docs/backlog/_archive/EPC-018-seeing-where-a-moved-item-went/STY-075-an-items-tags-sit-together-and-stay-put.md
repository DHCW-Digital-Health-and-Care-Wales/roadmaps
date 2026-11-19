# STY-075: A Product Lead sees an item's tags together, and still as a row opens

- **Status**: Done — the owner asked for it and answered its questions on 2026-11-19,
  after seeing STY-071's mark in use (D1–D5)
- **Type**: Feature
- **Area**: Features/UI + E2E
- **Epic**: [EPC-018-seeing-where-a-moved-item-went](../../EPC-018-seeing-where-a-moved-item-went/README.md)
- **Depends on**: STY-071 (hard: the mark it moves)
- **Binding ADRs**: ADR-002, ADR-010
- **Suggested model**: Sonnet — layout in two components, held by Playwright geometry
- **Delivered**: _the PR URL, once raised_

## Summary

An item's tags show in two places. On a card, the moved label sits under the title and
"Changed" sits at the foot, so they read as unrelated. On a phone's compact row they
stack on two lines. On a desktop's compact row, the tags and an unplaced item's flag
jump up 3px as the row opens. This story puts the moved label beside the pending tag,
"Changed" or "New", at the foot of a card and on one line in every row, and keeps a
row's tags and flag still as it opens and closes. "Removed" always shows alone. No new copy, and the tags
themselves do not change.

## Scope

`features/roadmaps`: the item's card and compact row, and the edit controls at a
card's foot. Nothing in `domain/`, `infrastructure/` or `i18n/`.

## Acceptance criteria

### S1: A card shows its tags together, at its foot (owner, D1, D2)

**Given** an item moved from Now to Later, so marked "Moved from Now" and tagged
"Changed", in the Cards view
**When** the card shows
**Then** "Moved from Now", then "Changed", sit side by side at the card's foot, where
"Changed" is today, before "Undo changes", Remove, Move and Edit
**And** nothing of the mark sits under the title any more
**And** a new item that is marked shows "Moved …" then "New" there in the same way
**And** a marked item with no pending tag (one moved only within its placement) shows
its label alone at the foot
**And** the mark's edge, the card's foot bar and the label's words are as STY-071 S1,
S2 and D7 set them

### S2: On a narrow card the tags wrap together (owner, D2; D6)

**Given** the card of S1 on a 375px phone
**When** the card shows
**Then** the two tags stay on one line together, and the buttons wrap under them as
they do today
**And** where one line can't hold both tags, the second wraps under the first, with
nothing between them

### S3: A phone's compact row shows its tags on one line (owner, D3)

**Given** the item of S1 in the Compact view on a 375px phone
**When** the row shows, closed or opened
**Then** "Moved" (cut as STY-071 S3 sets) and "Changed" sit side by side on one line
under the title, wrapping only when the line can't hold both
**And** an unplaced item's flag stays on its own line, under the title, as today

### S4: A desktop's compact row keeps its tags still as it opens (owner, D4)

**Given** a 1280px desktop in the Compact view, and an item marked "Moved from Now"
and tagged "Changed"
**When** the Product Lead opens its row, then closes it
**Then** the label and the tag sit at the same height in all three states, level with
the row's first line, centred on it as they are closed today
**And** so do they for an item whose title wraps onto more lines when its row is opened
**And** so does a "New" or "Removed" tag
**And** an unplaced item's flag on that line starts at the same height, though opened
it may wrap onto more lines (STY-067)
**And** the chevron, the title, Move and Edit don't move either, with or without
reduced motion

### S5: "Removed" stays as it is (owner, D5)

**Given** an item removed and not yet published
**When** it shows as a card or a row
**Then** it shows "Removed" alone, where "Changed" shows, and no moved mark (STY-071
D13; its Move is held, STY-049 D6)

## Tests

Every scenario is layout, which jsdom does not draw: Playwright at 375px and 1280px,
measuring the tags' boxes against the card's foot, the title and each other, and a
row's tag positions closed, opened and closed again, with and without reduced motion
(`tests/e2e/AGENTS.md`). STY-071's `moved-mark.spec.ts` checks the card's label under
the title; that check changes with S1.

## Decisions

- **D1** (owner, 2026-11-19, the request): on a card the moved label joins the pending
  tag at the foot, above the buttons, side by side. Changes STY-071 S3's "Then the
  label sits under the item's title" and its D5 (recorded there as D20).
- **D2** (owner, 2026-11-19, grilling Q1): the order is the moved label, then the
  pending tag, as a compact row already has it, so both views read alike.
- **D3** (owner, 2026-11-19, grilling Q2): a phone's compact row puts the two tags side
  by side on one line, not stacked.
- **D4** (owner, 2026-11-19, the request and grilling Q3): nothing on a desktop row's
  line jumps as it opens or closes; the tags and the flag keep the place they have when
  the row is closed.
- **D5** (owner, 2026-11-19, the request, confirmed by the agent from the code):
  "Removed" is always alone. Removing clears the mark (STY-071 D13), and a removed
  item's Move is held, so it can't be marked again until "Undo removal".
- **D6** (agent, 2026-11-19): on a narrow card the tags keep together and the buttons
  wrap under them (S2), as the foot row wraps "Changed" and its buttons today, over a
  tag on each line, since D1 asks for them side by side.

## Starting point

Measured at `bd635d9` with Playwright (Chromium), an item moved from Now to Later:

- **Card**: `RoadmapItemCard` draws `mark` under the `h3`; the pending tag is the
  first child of `EditControls`' foot row (`PendingTag`).
- **Desktop row** (1280px): the line is `items-center` while closed and `items-start`
  while open (`CompactItemRow`), so the tags' top is 12px below the row's closed and
  9px opened. The flag shares the line, and the cause. The chevron, title, Move and
  Edit hold at 9px and 13px, since on a one-line title they fill the line's 32px. Opened,
  the title shows whole and may wrap, so the line grows: centring it would move them
  all.
- **Phone row** (375px): no jump, but the line is a `flex-col` of the title, the flag,
  the mark and the tag, so the label and "Changed" stack, 43px and 75px below the
  row's top.

## Out of scope

- The words, tones, arrows and short form of the label: STY-071 S1, S2, S3's short
  form, D6, D7, D10, D19.
- A card's horizon flag, which stays under its title: it says what is wrong with the
  item, not what is pending.

## Delivery

### Departures

- Tests: the Tests section names `moved-mark.spec.ts`'s card check; it now asserts the
  label at the card's foot. The new geometry is in `tests/e2e/item-tags.spec.ts`, and one
  assertion in `moved-travel.spec.ts` holds the tags' place at the end of a STY-072
  travel, agent.
- The desktop row's flag and tags sit `pt-0.75` from the top of the line, not centred, to
  keep the place they have closed: a 26px badge on the line's 32px. The row aligns its
  line from the top in both states. Routine, agent.

### Contract for dependents

- `RoadmapItemCard` takes `marked` (the mark's edge, a boolean) where it took `mark` (the
  label); `EditControls` takes `mark`, the label, drawn before the pending tag in one
  wrapping group. `CompactItemRow` still takes `mark` as the label.
- A desktop compact row's flag and tags carry `ON_THE_LINE_CLASSES`
  (`compact-item-row.tsx`): a new item on that line takes the same offset, or it jumps as
  the row opens.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `item-tags.spec.ts` (`a card on a desktop` and `on a phone`: label, then "Changed", one line at the foot, nothing under the title; the label alone for "Moved down"); `moved-mark.spec.ts` (the card's label at the foot); `moved-travel.spec.ts` (`to Later`) |
| S2       | `item-tags.spec.ts` (`a card on a phone`; `wraps the second tag under the first`)                                                                                                                                                                              |
| S3       | `item-tags.spec.ts` (`a phone's compact row`: one line under the title, closed and opened; the flag on its own line above)                                                                                                                                     |
| S4       | `item-tags.spec.ts` (`a desktop's compact row`: label, tag, flag, chevron, title, Move and Edit at the same height closed, opened and closed again, with and without reduced motion; a title that wraps; "New")                                                |
| S5       | `item-tags.spec.ts` (`shows “Removed” alone`, in a card and a compact row)                                                                                                                                                                                     |
| Red      | The new spec run against the unchanged `src/`: 13 of its 18 tests failed. Layout tests, written after the code, so a break of finished code, not test-first evidence.                                                                                          |
