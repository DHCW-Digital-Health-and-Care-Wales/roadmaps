# STY-069: A Product Lead opens a compact row by pressing its text, not only its chevron

- **Status**: Done — the owner asked for it on 2026-11-18 as a follow-up to STY-067
- **Type**: Feature
- **Area**: Features/UI + E2E
- **Epic**: [EPC-016-a-roadmaps-items-at-a-glance](README.md)
- **Depends on**: STY-067 (hard: the compact view and its rows)
- **Binding ADRs**: ADR-002, ADR-010
- **Suggested model**: Sonnet — one component moves onto an existing primitive, with its tests
- **Delivered**: _(the PR; added once it exists)_

## Summary

In the compact view a row opens only by its small chevron at the start of the line,
which is a poor target for a finger or a mouse. This story makes the whole line open
it: pressing a row's title, its description on a desktop, its flag or tag, or the room
beside them opens the row in place, and pressing again closes it. The chevron stays,
and stays the one control a keyboard or a screen reader reaches. Not in it: Move,
Edit or the opened row's fields opening it. The cost is that a row's text can no longer
be selected.

## Acceptance criteria

### S1: A press on the line opens the row (owner, D1)

**Given** a row of the compact view, closed
**When** the Product Lead presses its title or, from 768px, the start of its
description, or its flag or pending tag, or the room between them
**Then** the row opens in place as it does by its chevron (STY-067 S6)

### S2: A second press closes it (owner, D1)

**Given** a row opened by its text or by its chevron
**When** the Product Lead presses its line again
**Then** the row closes, and its chevron reads "Show the rest of" then the title
**And** a press on an opened row's fields, below the line, opens or closes nothing

### S3: What else is pressed is unchanged

**Given** a row
**When** the Product Lead presses Move, Edit or the chevron
**Then** each does what it did (STY-067 S6, S8), and a press on Move or Edit does not
open the row

### S4: A keyboard and a screen reader are as before (owner, D3)

**Given** the compact view
**When** a keyboard or a screen reader reaches a row
**Then** the chevron is its one control to open it, in the same order, with the same
names and the same expanded state; the text is no stop and takes no role
**And** a pointer over the line shows the pointer cursor, and axe reports no WCAG 2.2
AA violation

## Decisions

- **D1** (owner, 2026-11-18, the request that added this story): a press on the text
  opens the row, and a second press closes it, as the chevron does. Adds S1, S2.
  Changes STY-067 S6, which names the chevron as the control.
- **D2** (agent, 2026-11-18): the story joins EPC-016, whose compact view it finishes,
  over a new one-story epic; the epic stays Done, as the story is delivered in the PR
  that adds it.
- **D3** (owner, 2026-11-19, the review of the first build, which pressed a click
  handler on the text): the chevron is a shadcn Collapsible's trigger, stretched across
  the line by an overlay with Move and Edit above it, over a handler on the text or a
  button around the title. It follows Product details' pattern, adds no second control
  or name to a row, and needs no lint exception. Collapsible over Accordion: rows open
  independently, so a group's single root, its arrow keys between triggers and its
  heading wrapper are unused. Changes S4.
- **D4** (owner, 2026-11-19, D3's trade): a row's text can't be selected, since the
  overlay covers it, over a handler that keeps it selectable and needs an
  `eslint-disable`. A Product Lead copies a title from its dialog or card.

## Out of scope

- The Cards view: its card has no row to open.
- A press on an opened row's fields, or on Move, Edit, "Undo changes" or Remove.
- Selecting a row's text.

## Delivery

### Departures

None.

### Contract for dependents

- `CompactItemRow` is a `Collapsible` (`@/components/ui/collapsible`) rendered as its
  list item: the chevron is its `CollapsibleTrigger`, whose `after` overlay covers the
  line (`relative` on the line), and the opened fields are its `CollapsibleContent`, so
  an opened row is mounted only while open. Move and Edit sit in a `relative z-10`
  block. The trigger's press nudge is off, since a transform would make the button the
  overlay's box and a press would miss.
- A test that presses a row's text clicks where it is drawn (`pressOn`, in
  `roadmap-items-compact.spec.ts`): the text sits under the overlay, so a locator's own
  click, which waits for the text to receive the press, never lands. jsdom lays nothing
  out, so a component test can't press the overlay.
- Hovering anywhere on the line fills the chevron, as the overlay is part of the button:
  it shows what a press will do.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1, S2   | `roadmap-items-compact.spec.ts` (`opens and closes a row by a press on its line at 1280px/375px`: the title, from 768px the description, an unplaced item's flag, and a press on an opened row's field, which changes nothing); the chevron's names in the component tests |
| S3       | `roadmap-items-compact.spec.ts` (`leaves a row as it is when Move or Edit is pressed at …px`, with plain clicks, which wait for the button to receive the press); the existing chevron, Move and Edit component tests                                                      |
| S4       | the same Playwright test's check of the chevron's cursor, which the overlay takes; `roadmap-items-compact.spec.ts` (`the keyboard`, `has no axe violation in the compact view…`) and the component tests of the chevron's names and expanded state, unchanged and green    |

The title, description and flag presses were shown red by removing the overlay (the
row stayed closed). The Move and Edit test was not: it holds when the overlay is gone,
and would fail, its plain click timing out, if Move or Edit sat beneath it. A press on
the room beside the text or on a pending tag has no test of its own: the overlay is one
box over the line, which the title, the description and the flag each show.
