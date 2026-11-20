# EPC-021: A "Jump to" menu that lines up — the edited mark pushes counts out of line

- **Status**: Done — one story, raised and grilled by the owner on 2026-11-20, delivered
- **Progress**: 1 of 1 terminal (STY-084)
- **Binding ADRs**: ADR-008, ADR-010

## Summary

The "Jump to" menu is the jump control below 1024px. Each row shows a place on the
page, its item count and, while it holds unpublished changes, a dot. The dot appears
only on edited rows, so their counts sit further left than the others and the column of
counts zigzags. The warning icon on "Not on the public roadmap" does the same to that
row's name. This epic gives each mark a fixed place, so names, counts and dots line up
whatever is edited. The row of links shown from 1024px stays as it is.

## Owner decisions waiting

None.

## Findings

Audited at `a3db831` on 2026-11-20.

### F1 — A row's count moves left when it has unpublished changes

`JumpTargetLabel` pushes the count to the end with `ms-auto` and renders
`UnpublishedDot` after it only when `pending` is true. An edited row's count therefore
ends one dot and one gap (16px) short of an unedited row's. The owner saw it on a phone:
Now 14 and Delivered this year 1 stood right of Next 5 ●, Later 4 ● and Not doing 1 ●.

### F2 — The unplaced row's name starts one icon further right

The same label puts `TriangleAlertIcon` before the name of the unplaced target only. In
the menu that icon follows the tick's column, which is kept on every row
(`invisible` when not current), so "Not on the public roadmap" starts one icon and a gap
right of the placement names.

## Design

1. In the menu, every row keeps the dot's place at its end, hidden where the row has no
   pending change, whether or not any row is edited (F1; STY-084 D1).
2. In the menu, the unplaced row's warning icon takes the tick's place, so every name
   starts at one edge; the tick replaces it while that row is current (F2; STY-084 D2).
3. **Unchanged:** the row of links from 1024px (STY-084 D3), what a screen reader reads
   for each row, the dot's colour and the menu's order of targets.

## Shared assumptions and contracts

### Copy

No string is added or changed.

## Stories

| ID      | Story                                                                                  | Area        | Depends on | State |
| ------- | -------------------------------------------------------------------------------------- | ----------- | ---------- | ----- |
| STY-084 | ["Jump to" lines up its names, counts and dots](STY-084-jump-to-lines-up-its-marks.md) | Features/UI | —          | ✅    |

## Sequencing

One story, no prerequisite. It touches only the placement navigation, so it can run
beside EPC-011, EPC-018 and EPC-019 deliveries.

## Out of scope

- **The row of links from 1024px.** Links wrap side by side and form no columns; a kept
  space there would read as uneven padding (STY-084 D3).
- **Another mark for unpublished changes.** The dot stays the app's one mark for them
  (STY-053, STY-055).

## Defects

None.

## Related

- [EPC-012](../EPC-012-app-shell-and-navigation/README.md): STY-053 built the
  menu, its counts and dots; STY-055 the dot app-wide
- ADR-010 (DHCW look): the dot's and the count's tokens
