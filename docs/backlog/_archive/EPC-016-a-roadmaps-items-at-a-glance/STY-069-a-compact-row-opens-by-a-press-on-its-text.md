# STY-069: A Product Lead opens a compact row by pressing its text, not only its chevron

- **Status**: Done — the owner asked for it on 2026-11-18 as a follow-up to STY-067
- **Type**: Feature
- **Area**: Features/UI + E2E
- **Epic**: [EPC-016-a-roadmaps-items-at-a-glance](README.md)
- **Depends on**: STY-067 (hard: the compact view and its rows)
- **Binding ADRs**: ADR-002, ADR-010
- **Suggested model**: Sonnet — one handler on one component, with its tests
- **Delivered**: _(the PR; added once it exists)_

## Summary

In the compact view a row opens only by its small chevron at the start of the line,
which is a poor target for a finger or a mouse. This story makes the row's text open
it too: pressing a row's title, or on a desktop the start of its description or the
room beside it, opens the row in place, and pressing again closes it. The chevron stays
as it is, and stays the one control a keyboard or a screen reader reaches. Not in it:
the row's controls (Move, Edit) or its other fields opening it.

## Acceptance criteria

### S1: A press on the text opens the row

**Given** a row of the compact view, closed
**When** the Product Lead presses its title, or, from 768px, the start of its
description or the room between the text and the row's tag
**Then** the row opens in place as it does by its chevron (STY-067 S6)
**And** on a phone the same holds for the title and what sits under it, its flag and
its pending tag

### S2: A second press closes it

**Given** a row opened by its text or by its chevron
**When** the Product Lead presses its title again
**Then** the row closes, and its chevron reads "Show the rest of" then the title
**And** a press on an opened row's fields, below the title, opens or closes nothing

### S3: What else is pressed is unchanged

**Given** a row
**When** the Product Lead presses Move or Edit, or the chevron
**Then** each does what it did (STY-067 S6, S8), and a press on Move or Edit does not
open the row

### S4: Selecting the text does not open it

**Given** a row, closed
**When** the Product Lead drags across its title to copy it
**Then** the row stays closed

### S5: A keyboard and a screen reader are as before

**Given** the compact view
**When** a keyboard or a screen reader reaches a row
**Then** the chevron is its one control to open it, in the same order, with the same
names; the text is no stop and takes no role
**And** a pointer over the text shows the pointer cursor, and axe reports no WCAG 2.2
AA violation

## Decisions

- **D1** (owner, 2026-11-18): a second press on the text closes the row, as the
  chevron does. Adds S2. Changes STY-067 S6, which names the chevron as the control.
- **D2** (agent, 2026-11-18): the text takes no role and no focus, over a button or a
  link around the title, which would add a second stop and a second name to every row;
  the chevron already carries the state (STY-067 D14).
- **D3** (agent, 2026-11-18): a press that ends a selection of text opens nothing (S4),
  over opening on every click, so a Product Lead can copy a title.
- **D4** (agent, 2026-11-18): the story joins EPC-016, whose compact view it finishes,
  over a new one-story epic; the epic stays Done, as the story is delivered in the PR
  that adds it.

## Out of scope

- The Cards view: its card has no row to open.
- A press on an opened row's fields, or on Move, Edit, "Undo changes" or Remove.

## Delivery

### Departures

None.

### Contract for dependents

- No new key, prop or stored value. `CompactItemRow` opens by `toggleByText`, on the
  element holding the title (and, on a desktop, the description); its `aria-expanded`
  chevron is unchanged.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1, S2   | `pages/roadmap-detail-page-compact.test.tsx` (`opens and closes by a press on its title, or on its description…`, `opens by a press on its title on a phone too`); `roadmap-items-compact.spec.ts` (`opens and closes a row by a press on its text at 1280px/375px`) |
| S3       | `roadmap-items-compact.spec.ts` (the same test ends on Move, the row closed); the existing chevron, Move and Edit tests                                                                                                                                              |
| S4       | `roadmap-detail-page-compact.test.tsx` (`stays closed when the press ends a selection of its text`)                                                                                                                                                                  |
| S5       | `roadmap-items-compact.spec.ts` (`the keyboard`, `has no axe violation in the compact view…`), unchanged and green; the cursor: observed run, the row's text carries `cursor-pointer`                                                                                |

Each test was written after the code and shown red by breaking it: the selection guard
removed (S4), the handler made to do nothing (S1, S2: seven component tests and both
Playwright tests failed), then restored.
