# CHO-038: The roadmap page's specs repeat a run only where it can fail alone

- **Status**: Done
- **Type**: Refactor
- **Area**: E2E (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: none
- **Binding ADRs**: ADR-006, ADR-008, ADR-010
- **Suggested model**: Sonnet — each width or choice is weighed against the
  breakpoints and branches it could reach
- **Delivered**: _(add on delivery)_

## Summary

The roadmap page's specs take 341 s of the E2E suite's 1,215 s summed. Most of what they
check is layout, which only a browser sees, and stays. But several tests run once per
width, language or choice where the runs share one code path and cross no breakpoint,
and a few assert what a Vitest page test asserts already. Cutting those saves about
120 s and 900 lines. Done looks like: a run repeats only where the repeat can fail on
its own, and a position is checked only where it is an accessibility rule or decides
what a user can reach.

## Measurement

At `9ee767b`, twelve specs (`moved-travel`, `roadmap-items-compact`, `control-row`,
`roadmap-header`, `roadmap-controls`, `roadmap-items-cut`, `placement-navigation`,
`side-panel`, `roadmap-page`, `moved-mark`, `last-updated`, `roadmap-errors`): 128 tests,
244 runs. Candidates, estimates re-read at delivery (CHO-014 D12):

| Candidates                                                                                                                                                                                                                                                                                                                    | CI s | Finding                                                                                                                                                                                                                                  | Verdict                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `moved-travel.spec.ts:165`, `:213`                                                                                                                                                                                                                                                                                            | ~27  | 14 runs over the four Move choices and pointer or keyboard, one code path                                                                                                                                                                | 5 runs, a late-close run among them                    |
| `roadmap-items-cut.spec.ts:68`–`:165`                                                                                                                                                                                                                                                                                         | ~8   | The same ten-item page opened 16 times at two widths; the clamp does not change with width; `:187` holds the width                                                                                                                       | Once at 375 px, two tests                              |
| `control-row.spec.ts:102` (12 runs), `:418` (6); `roadmap-items-compact.spec.ts:479` (10); `roadmap-header.spec.ts:360` (12)                                                                                                                                                                                                  | ~27  | Widths and languages beyond those each side of a breakpoint                                                                                                                                                                              | 5, 3, 5 and 4 runs                                     |
| `control-row.spec.ts:154`, `:187`; `roadmap-header.spec.ts:399` with `placement-navigation.spec.ts:340`; `moved-mark.spec.ts:54`; `roadmap-header.spec.ts:295`                                                                                                                                                                | ~7   | Repeat `roadmap-header.spec.ts:100`, each other, `moved-travel.spec.ts:270` and `:559`, and `publishing-roadmap.spec.ts`                                                                                                                 | Cut one of each                                        |
| `roadmap-page.spec.ts:163`, `:179`, `:214`, `:253`, `:283`; `last-updated.spec.ts:32`, `:71`, `:90`; `placement-navigation.spec.ts:187`, `:203`, `:310`; `roadmap-items-compact.spec.ts:452`; `moved-travel.spec.ts:474`; `side-panel.spec.ts:332`; `roadmap-errors.spec.ts:36`, `:120`, `:139`; `roadmap-header.spec.ts:226` | ~19  | A page test of the same state drives the same action to the same outcome; for an unreadable roadmap (`roadmap-page.spec.ts:163`, `:283`, `roadmap-errors.spec.ts:120`, `:139`) the Sheets parser tests hold the Sheets half (CHO-014 S9) | Cut; keep `last-updated.spec.ts:114` as the round trip |
| `roadmap-page.spec.ts`: Edit beside About's heading, the empty panel under 160 px (CHO-014's first measurement)                                                                                                                                                                                                               | —    | A position beside assertions of behaviour                                                                                                                                                                                                | Cut the position, keep the test                        |

`roadmap-page.spec.ts:253` is the only test of the items panel's unknown-error copy:
that case moves into a Vitest test before it goes. `roadmap-page.spec.ts:446` stays, trimmed to its Welsh check at 375 px that the empty
roadmap does not scroll sideways, the only reflow check of that state. The dark runs of
`roadmap-page.spec.ts:348` and `:395` compare a border with the theme's own `--border`,
a colour per theme, and stay.

Not settled: whether Vitest holds ArrowDown in the Welsh Jump to menu
(`placement-navigation.spec.ts:356`); whether `side-panel.spec.ts:206` repeats the item
dialog's Cancel tests; whether `moved-travel.spec.ts:256`, a test of a fixture, is
covered by `:213`'s late runs.

## Acceptance criteria

### S1: A run repeats only where it can fail alone

**Given** a test of the roadmap page run per width, language or choice
**When** the chore is delivered
**Then** it runs only at a width each side of a breakpoint where the page offers
different controls, in Welsh only where Welsh copy can change the layout, and once per
branch a choice takes

### S2: The cuts meet CHO-014

**Given** any test this chore cuts or trims
**When** its PR is raised
**Then** CHO-014's S2, S4, S5, S7 and S9 hold for it

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone.

## Out of scope

- The sticky strips, pinned bars, view transitions, hit-testing and clock races these
  specs hold: only a browser sees them, and they stay.
- Vitest tests that repeat each other: CHO-041.

## Delivery

### Departures

- Estimates re-read at delivery (CHO-014 D12), against `7c29b43b` (the `main` run of
  CHO-036 merged): the twelve specs take 232 runs and 337.5 s summed on CI there. After:
  153 runs, 79 fewer. The 90 test names that are gone took 119.8 s on CI there; the 11
  names that replace or trim them (below) take about 19 s locally, so about 100 s
  summed go, against the record's ~120 s. The specs go from 4,973 to 4,276 lines (1,168
  deleted, 471 inserted); the Vitest tests gain 39 lines (two tests). Tests only.
- `moved-travel.spec.ts`: the 8 runs of "a move within a placement travels" (four
  Move choices in two views) become 2, "To the top" in cards and "Down one" in
  compact: every choice takes one code path (`editable-item.tsx` calls `travel`
  once), the view is the branch, since a card and a row each set the transition name.
  The passed item's place, the mark text and Move's focus are trimmed from them (held
  below). The 6 runs of "a long placement" become 2, the cards' by keyboard with the
  publish dialog closing late (DEF-024 S1) and the compact's by pointer: the two
  inputs differ only in how Base UI closes the menu, which the late close reddens.
  That is 4 runs, not the record's 5: the late close rides on a run that stays. The
  record asked "whether `:256`, a test of a fixture, is covered by `:213`'s late
  runs": it is, since a helper that returned before the notice has focus fails the
  keyboard run's Move focus assertion, so `:256` is cut.
- `moved-travel.spec.ts` "to Later, below the screen" keeps its travel, scroll and
  in-the-room assertions and drops the order, the mark, Move's focus and the position of
  the two tags (the order and the mark are held by `roadmap-detail-page-moved-mark.test.tsx`
  "A move to another placement"; Move's focus by `moved-mark.spec.ts` and the reduced-motion
  test below; the pair side by side at a card's foot by `item-tags.spec.ts`).
- `moved-mark.spec.ts`: the reduced-motion run of the Move-to-Later test is cut (the
  reduced-motion move is `moved-travel.spec.ts`'s "where the system asks for reduced
  motion", which also asserts no travel, and now Move's focus, the one thing the cut run
  held that it did not). The no-preference run stays: it moves an
  item with no ID, which travels with no name, a branch no other test takes.
- `roadmap-items-cut.spec.ts`: the loop that opened the ten-item page 16 times (eight
  tests at 1280 and 375 px) is two tests at 375 px, text fields and details. Nothing in
  the card has a breakpoint, so the clamp does not change with width; 1280 px stays in
  the test of the navigation's fold and the axe scans. The merged tests drop the
  `aria-expanded` assertions, held by `roadmap-item-card.test.tsx`.
- `control-row.spec.ts` "shows one jump control" runs 5 of 12 (English at 375, 640 and
  768 px, Welsh at 640 and 768); 375 px in Welsh is held by the Welsh phone tests of the
  same file, 820 and 1280 px take 768 px's branch and 1024 px has its room beside the
  navigation. Its top-of-page position
  check (links under More) is trimmed: `roadmap-header.spec.ts` holds it. "The count,
  Publish and Discard" runs 3 of 6: English at 375 and 640 (in place of 820, since 640
  is where Publish gains its icon) and Welsh at 375.
- `roadmap-items-compact.spec.ts` "the switch beside a long title" runs 5 of 10, the
  same widths as `control-row`; "remembers the view" is cut (the view's storage key and
  its restore are two page tests, below). Welsh at 375 px is cut: `roadmap-header.spec.ts`
  holds the top of the page there in Welsh and `control-row.spec.ts` the stuck strip's
  Jump to; the Compact toggle beside a long title in Welsh at 375 px, stuck, is the one
  state no surviving run holds, at a width where the row shows icons.
- `roadmap-header.spec.ts`: 1280 px is dropped from the two tests that ran at a phone, an
  iPad and a desktop (the header's tablet layout starts at 768 px; 1280 px adds room,
  not a branch, and 1024 px has 768 px's room beside the navigation). Welsh "fits N px" runs 4 of 12: ProductA at 375 and 768,
  ProductC (the notice) at 375 and 768. The first placement on the first screen runs
  for the tallest header, ProductC, in each language: 2 of 4. The record's 4 runs of
  "fits" stand; the audit saw 3 would do, since a notice wraps with no breakpoint.
- `roadmap-page.spec.ts`: the "Changed" tag's position beside Undo, the 32 px and 40
  px heights and Edit's place under the last field, and the empty panel's height under
  200 px are cut; the tests stay. The record named "Edit beside About's heading" and "the
  empty panel under 160 px"; STY-043 and STY-065 replaced the About test, and the
  limit is 200 px now. The dark runs of the two theme tests stay, as the record says.
  The Welsh empty-roadmap test keeps the heading to settle on, the open details and
  the 375 px reflow check.
- `placement-navigation.spec.ts`: "jumps to Later" on a phone now chooses from Jump to
  by keyboard, the one browser run that does, since Base UI hands focus back to the
  trigger as the menu closes, a race jsdom has no animation to run. The Welsh keyboard
  test is cut once Vitest holds ArrowDown and Enter in the Welsh menu.
- `side-panel.spec.ts` ":206" is cut: Cancel, Escape and the close button share the
  dialog's `FormDialog` whichever surface shows it, and `closing-a-dialog.spec.ts`
  runs the click outside each form dialog, the item's among them.
- `roadmap-controls.spec.ts` loses the More menu's list of items (held by
  `roadmap-detail-page-header.test.tsx`); both widths stay, since they sit each side of
  640 px.
- Every axe scan stays, among them the four of `roadmap-items-cut.spec.ts` (CHO-014 S4
  and the owner's rule of 2026-11-23: a scan goes only where another covers the same
  page and state).
- Not settled, answered: Vitest did not hold ArrowDown in the Welsh Jump to menu; it
  does now, shown red by breaking the Welsh "Hwyrach" (`cy.ts`). `side-panel.spec.ts:206`
  does repeat the item dialog's Cancel tests. `moved-travel.spec.ts:256` is covered.
- Archived records that cite a cut or renamed test stay as they were.

### Cuts and the test that holds each (S2; CHO-014 S5, S9)

| Cut                                                                                                                                                   | Held by                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `moved-travel.spec.ts` six of the eight runs per choice and view; the passed item's place, the mark, Move's focus                                     | the two runs left; `roadmap-detail-page-moved-mark.test.tsx` "A move within a placement" (each choice's mark), `-ordering.test.tsx` (each choice's order and Move's focus)                                                                                   |
| `moved-travel.spec.ts` four of the six "long placement" runs; the mark; the late-close fixture test                                                   | the cards' keyboard run with the late close, and the compact's pointer run                                                                                                                                                                                   |
| `moved-travel.spec.ts` "a mark on an item elsewhere stays"                                                                                            | `-moved-mark.test.tsx` "is kept by “Undo order” on another placement" (the branch of `moved-mark.ts` `orderUndone`, shown red by breaking it)                                                                                                                |
| `moved-travel.spec.ts` "to Later": the order, the mark, Move's focus and the tags' position                                                           | `-moved-mark.test.tsx` "A move to another placement"; Move's focus by `moved-mark.spec.ts` and the reduced-motion test; `item-tags.spec.ts` "shows “Moved from Now”, then “Changed”, side by side at its foot"                                               |
| `moved-mark.spec.ts` the reduced-motion run                                                                                                           | `moved-travel.spec.ts` "where the system asks for reduced motion, the move shows at once, marked, focus on its Move"                                                                                                                                         |
| `roadmap-items-cut.spec.ts` the 1280 px half of the loop (8 tests), the 375 px loop's six other tests (folded into two), and `aria-expanded`          | the two tests at 375 px; the fold at 1280 px; `roadmap-item-card.test.tsx` "cuts a description past three lines…" and "shows the rest in place…"                                                                                                             |
| `last-updated.spec.ts` the date from the roadmap dialog, Today and the refusal, today ticked with the changes                                         | `roadmap-detail-page-last-updated.test.tsx` (each, through the in-memory repository); the cell as `YYYY-MM-DD` text by the Sheets adapter's test; the round trip by "writes today's date with Enabled when ticked on Publish roadmap"                        |
| `control-row.spec.ts` seven runs of the jump control, the phone's and the iPad's rows of controls, three runs of the foot bar                         | the runs left; `roadmap-header.spec.ts` "opens on the title with its controls" at 375 and 820 px in both languages                                                                                                                                           |
| `roadmap-items-compact.spec.ts` five runs of the switch; "remembers the view"                                                                         | the runs left; `roadmap-detail-page-compact.test.tsx` "keeps a choice for the next page" and "opens the next page in the view last chosen"                                                                                                                   |
| `roadmap-header.spec.ts` the 1280 px runs (two tests), the status and facts in English and Welsh, "publishes the roadmap from its notice", Welsh runs | `roadmap-facts.test.tsx` and `-header.test.tsx`; `-publishing-roadmap.test.tsx` and `publishing-roadmap.spec.ts`; the runs left                                                                                                                              |
| `roadmap-page.spec.ts` "columns in a different order", the unplaced items, Refresh, a retryable failure, a tab with no title column                   | the Sheets half by `roadmap-tab-parser.test.ts` (S9); the rest by `roadmap-detail-page-items.test.tsx`; the unknown-error copy by its new test "says something went wrong, with Retry"                                                                       |
| `roadmap-page.spec.ts` the position and size checks, the empty Welsh page's copy                                                                      | `-editing.test.tsx` and `product-details.test.tsx` (order); `-adding.test.tsx` and `-items.test.tsx` (the copy)                                                                                                                                              |
| `roadmap-errors.spec.ts` the permission error, the unreadable index in English and Welsh                                                              | `roadmaps-page.test.tsx` (the copy, no Retry) and `query-client.test.ts`; the Sheets half by `google-sheets-roadmap-repository.test.ts`                                                                                                                      |
| `side-panel.spec.ts` ":206" Cancel, Escape and close; the Welsh menu                                                                                  | `-editing.test.tsx`, `form-dialog.test.tsx` and `closing-a-dialog.spec.ts`; `edit-surface-menu-item.test.tsx` "names both ways in Welsh"                                                                                                                     |
| `placement-navigation.spec.ts` the count in the links and in Jump to; the unplaced half of the reach test; the first placement on the first screen    | `roadmap-detail-page-placement-navigation.test.tsx`; `roadmap-header.spec.ts` (ProductC at 1280 px)                                                                                                                                                          |
| `placement-navigation.spec.ts` the Welsh keyboard test                                                                                                | the new `-placement-navigation.test.tsx` "is used by keyboard alone in Welsh" (ArrowDown, Enter); the browser's keyboard choice by "jumps to Later" on a phone; the tab order by `roadmap-header.spec.ts`; the Welsh phone's reflow by `control-row.spec.ts` |
| `roadmap-controls.spec.ts` the More menu's list                                                                                                       | `roadmap-detail-page-header.test.tsx` "lists Edit product details, then Refresh, then Unpublish roadmap"                                                                                                                                                     |

Each holder runs against the in-memory repository or through the fakes, so it outlives
the switch from Google Sheets; only a cell shape or a column order rests on the Sheets
adapter's tests, which go with it.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | the twelve specs pass, 153 runs; each loop runs at a width each side of a breakpoint, in Welsh only where its copy is longer, and once per branch a choice takes (above)              |
| S2       | red shown by breaking the code each new test checks: `errors.unknown` in `en.ts`; the Welsh "Hwyrach" in `cy.ts`; `moved-mark.ts` `orderUndone`. The PR lists each cut and its holder |
