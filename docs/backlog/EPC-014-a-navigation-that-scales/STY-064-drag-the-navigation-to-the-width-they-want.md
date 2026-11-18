# STY-064: A Product Lead drags the navigation to the width they want

- **Status**: Proposed — the owner asked on 2026-11-18 to deliver the navigation UX
  prototype as drawn
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-014-a-navigation-that-scales](README.md)
- **Depends on**: STY-061 (preferred order)
- **Binding ADRs**: ADR-010, ADR-008, ADR-005
- **Suggested model**: Sonnet — a window splitter on the sidebar's edge, with the pinned
  bars following a width they already read

## Summary

The navigation is 256px wide on every desktop, so long titles wrap while a monitor has
room to spare. This story lets the Product Lead drag the navigation's right edge, from
208px to 400px, or move it by keyboard, and remembers the width on this device. The page
and its pinned bars start where the navigation ends. A double-click puts it back to
256px. The rail and the phone's drawer keep their widths.

## Acceptance criteria

### S1: Drag the edge

**Given** the navigation open on a 1280px desktop
**When** the Product Lead drags its right edge to the right
**Then** the navigation widens with the pointer, and the page, a roadmap's pinned title
strip and its pending changes' foot bar start where it ends
**And** a pointer over the edge shows it can be dragged

### S2: Its limits

**Given** the navigation's edge
**When** the Product Lead drags it past 400px, or below 208px
**Then** it stops at 400px, or at 208px

### S3: Back to the start

**Given** the navigation 400px wide
**When** the Product Lead double-clicks its edge
**Then** it is 256px wide

### S4: By keyboard

**Given** a keyboard alone
**When** the Product Lead tabs to the edge, the navigation's last stop
**Then** it is a separator named "Resize the navigation", saying its width
**And** the left and right arrows move it 16px, Home to 208px and End to 400px, with
focus staying on it and the navigation's focus style showing

### S5: Remembered on this device

**Given** the navigation dragged to 320px
**When** the Product Lead reloads the page, or folds the navigation and opens it again
**Then** it is 320px wide
**And** where browser storage can't be read or kept, it is 256px and no error shows

### S6: The rail and the drawer

**Given** the navigation folded to its rail, or a window below 1024px
**When** the Product Lead looks for the edge
**Then** there is none: the rail is 64px and the drawer keeps its width

### S7: The laptop's least room

**Given** a 1024px window
**When** the Product Lead drags the navigation to 400px
**Then** a roadmap's page keeps its cards and controls in the 624px left, with no
sideways scroll, in English and Cymraeg

## Decisions

- **D1** (owner, 2026-11-18, request): on a desktop the navigation's width is set by
  dragging it.
- **D2** (agent, 2026-11-18, analysis decision 13 (a), as drawn): from 208px to 400px,
  256px to start; a double-click resets it; arrows move it 16px and Home and End to its
  limits; the edge is the navigation's last Tab stop; over folding to the rail when
  dragged narrow, or a widest that follows the window.
- **D3** (agent, 2026-11-18, analysis decision 4 (a)): the width is remembered on this
  device, as the fold is (STY-054 D5).

## Starting point

Audited at `f46384c`. `--navigation-width` is set by `[data-navigation="open"]` in
`styles/globals.css`, and the pinned bars and the sidebar read it; a dragged width sets
the same property. shadcn's `resizable` wraps `react-resizable-panels`, which sizes
panels in percentages of a group, not a px custom property that fixed bars outside the
group read: weigh it against a separator built on the WAI-ARIA window splitter pattern
before choosing, and record the choice (ADR-005 bars a hand-rolled primitive that
competes with one the stack offers).

## Out of scope

- Dragging the rail open, or the drawer's width: EPC-014 _Out of scope_.
