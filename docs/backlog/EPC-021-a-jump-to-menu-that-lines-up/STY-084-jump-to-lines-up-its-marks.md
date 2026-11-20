# STY-084: A Product Lead sees "Jump to" line up its names, counts and dots

- **Status**: Proposed — grilled with the owner on 2026-11-20 (D1–D3)
- **Type**: Feature
- **Area**: Features/UI
- **Epic**: [EPC-021-a-jump-to-menu-that-lines-up](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-008, ADR-010
- **Suggested model**: Sonnet — one shared label and one menu, every rule settled
- **Delivered**: _(add on delivery)_

## Summary

In the "Jump to" menu, a row with unpublished changes shows a dot after its count, and
the dot pushes that count left, so the counts no longer line up. Every row now keeps the
dot's place, empty where nothing is edited, so counts and dots each form one straight
column whatever the Product Lead has edited. The warning icon on "Not on the public
roadmap" moves into the tick's place, so every name starts at the same edge too. The
row of links shown from 1024px stays as it is, and a screen reader hears the same as
before.

## Scope

`features/roadmaps` only: the jump target label and the "Jump to" menu. No copy, no
domain or infrastructure change.

## Acceptance criteria

### S1: Edited and unedited rows end their counts at one edge

**Given** a roadmap whose Next and Later hold unpublished changes and whose Now does not
**When** the Product Lead opens "Jump to"
**Then** the right edges of every row's count line up
**And** the dots of Next and Later line up with each other, after their counts

### S2: Counts sit in the same place when nothing is edited (owner, D1)

**Given** a roadmap with no unpublished changes
**When** the Product Lead opens "Jump to"
**Then** every row keeps an empty place for the dot after its count, and the counts end
where they would on an edited row
**And** no dot shows

### S3: The unplaced row's name starts where the others do (owner, D2)

**Given** a roadmap with unplaced items, and the page scrolled to Now
**When** the Product Lead opens "Jump to"
**Then** "Not on the public roadmap" shows its warning icon in the place the tick takes
on the current row, and its name starts at the same edge as "Now" and "Next"
**And** Now shows its tick

### S4: The tick replaces the warning on the current unplaced row (owner, D2)

**Given** a roadmap with unplaced items, and the page scrolled to them
**When** the Product Lead opens "Jump to"
**Then** "Not on the public roadmap" shows the tick, not the warning icon, and its name
still starts at the same edge as the others

### S5: A screen reader hears what it heard before

**Given** any row of the menu, edited or not, current or not, unplaced or a placement
**When** a screen reader reads it
**Then** it reads the same phrase as before ("Next, 5 items, unpublished changes"), and
announces neither the empty dot place nor the warning icon

### S6: The links from 1024px are unchanged (owner, D3)

**Given** a window 1024px or wider
**When** the Product Lead looks at the row of jump links
**Then** a link without unpublished changes has no empty place for a dot, and the unplaced
link keeps its warning icon before its name, as before

### S7: The menu lines up in Welsh

**Given** the interface in Welsh, and a roadmap with some edited rows
**When** the Product Lead opens "Jump to"
**Then** the names start at one edge, and the counts and dots each line up, as in S1

## Tests

Alignment is layout, which jsdom does not compute. Component tests hold the structure:
a hidden dot place on every row without a pending change (S2), the warning in the
tick's place and the tick replacing it (S3, S4), the accessible names (S5) and no dot
place in the links (S6). One Playwright check in the open menu at a phone width holds
S1: the counts' right edges, and the dots' left edges, are equal. S7 is held by the
before/after screenshots in Welsh rather than a second E2E run (CHO-014).

## Decisions

- **D1** (owner, 2026-11-20, grilling Q1): keep the dot's place when no row is edited? →
  Always keep it, so counts never shift between states. Adds S2.
- **D2** (owner, 2026-11-20, grilling Q2): line up the names as well? → Yes: the
  unplaced row's warning icon shares the tick's place, the tick shown instead while that
  row is current, over a column of its own on every row. Adds S3, S4.
- **D3** (owner, 2026-11-20, grilling Q3): the links from 1024px? → Leave them as they
  are; the change is the menu's only. Adds S6.
- **D4** (agent, 2026-11-20): a one-story epic over reopening EPC-012, which is Done
  and archived.

## Starting point

Audited at `a3db831`. `JumpTargetLabel` is shared by the menu and the links and renders
its marks as flex children of what holds it; the menu's tick is already kept on every
row with `invisible`, the precedent for D1. The warning icon sits inside the label,
after the menu's tick, which is why the tick's place alone does not align the unplaced
name today (EPC-021 F2).

## Out of scope

- **The links from 1024px** (D3).
- **The dot's colour on a focused or highlighted row.** Unchanged here; STY-053 and
  STY-055 own it.
