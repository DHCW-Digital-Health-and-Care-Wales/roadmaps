# STY-064: A Product Lead drags the navigation to the width they want

- **Status**: Done — the open navigation's right edge drags its width from 208px to 400px,
  by pointer, finger or keyboard, remembered on this device
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-014-a-navigation-that-scales](README.md)
- **Depends on**: STY-061 (preferred order), STY-060 (preferred order)
- **Binding ADRs**: ADR-010, ADR-008, ADR-005
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/162
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

### S8: By touch

**Given** a touch screen 1024px or wider, such as a tablet held sideways
**When** the Product Lead drags the edge with a finger
**Then** it widens and narrows as with a pointer, the edge easy to catch though its line
is thin

## Decisions

- **D1** (owner, 2026-11-18, request): on a desktop the navigation's width is set by
  dragging it.
- **D2** (agent, 2026-11-18, analysis decision 13 (a), as drawn): from 208px to 400px,
  256px to start; a double-click resets it; arrows move it 16px and Home and End to its
  limits; the edge is the navigation's last Tab stop; over folding to the rail when
  dragged narrow, or a widest that follows the window.
- **D3** (agent, 2026-11-18, analysis decision 4 (a)): the width is remembered on this
  device, as the fold is (STY-054 D5).
- **D4** (agent, 2026-11-18, the Starting point's weighing): the edge is a separator built
  on the WAI-ARIA window splitter pattern, not shadcn's `resizable`. `react-resizable-panels`
  sizes panels in percentages of a group it lays out itself; the navigation is a sticky
  column whose px width the bars pinned outside any group read as `--navigation-width`, so
  using it would mean wrapping the whole shell in a group and converting percentages back
  to px for every bar. It is a splitter on one edge, not a competing primitive for a
  panel, so ADR-005's bar does not apply.

## Starting point

Audited at `f46384c`. `--navigation-width` is set by `[data-navigation="open"]` in
`styles/globals.css`, and the pinned bars and the sidebar read it; a dragged width sets
the same property. shadcn's `resizable` wraps `react-resizable-panels`, which sizes
panels in percentages of a group, not a px custom property that fixed bars outside the
group read: weigh it against a separator built on the WAI-ARIA window splitter pattern
before choosing, and record the choice (ADR-005 bars a hand-rolled primitive that
competes with one the stack offers). ADR-010's STY-054 amendment says the width is
set in `globals.css` and gives the card columns at 1280px: this delivery amends it.

## Out of scope

- Dragging the rail open, or the drawer's width: EPC-014 _Out of scope_.

## Delivery

### Departures

- **`--navigation-width` is set by `AppShell`, not `globals.css`** (agent, D4's follow-on):
  the design lint bars a custom property in an inline style, so `useNavigationWidth`
  (`app-shell.tsx`) sets it on the shell's frame in a layout effect, as `usePinnedInset`
  sets its bars' heights, while the navigation is open on a desktop. The
  `[data-navigation="open"]` rule is deleted; the folded rule (64px) stays. ADR-010's
  STY-054 amendment now says so.
- **The edge sits after the navigation landmark, in the sidebar** (agent): it is the
  sidebar's last Tab stop, the column straddled by a 12px hit area (24px under a coarse
  pointer, S8), with a 2px line under a pointer or while dragged and the navigation's own
  `focus-fill` when keyed. The sidebar takes `z-41`, above the pinned bars' `z-40`, so the
  half of the edge outside it is not covered by a bar.
- **The focus fill is the whole 12px edge** (agent): the navigation's own `focus-fill`, as
  its buttons take it, not the prototype's 6px bar with dark flanks; half of it lies on the
  navy and half on the page, so it shows against both.
- **A drag cut short is settled when the edge goes** (agent, review): a window narrowed
  below a desktop mid-drag removes the edge, and the width it had reached is kept.
- **`aria-valuetext` is "256 pixels wide"** (agent), the prototype's words, in Welsh
  "256 picsel o led"; the separator is named "Resize the navigation" ("Newid lled y
  llywio").
- **A touch drag is caught only while the pointer can be captured** (agent): if the browser
  has already lost the pointer, `setPointerCapture` throws and the drag does not start.
- **The record's own Status** is `Done`, and as this is the epic's last story the epic
  (README, `delivery-notes.md`) moves to `_archive/` with it: `tests/e2e/AGENTS.md` takes
  the notes that hold beyond the epic (the navigation world, the reload, the two live
  regions); the rest were this epic's code seams, which their code comments hold.

### Contract for dependents

- `NavigationResizeHandle` (`components/layout/navigation-resize-handle.tsx`) takes
  `width`, `onResize` and `onResizeEnd`; `navigation-preference.ts` holds
  `MIN_NAVIGATION_WIDTH`, `MAX_NAVIGATION_WIDTH`, `DEFAULT_NAVIGATION_WIDTH`,
  `clampNavigationWidth`, `readNavigationWidth` and `storeNavigationWidth`.
- The width is kept under `localStorage` key `roadmaps.navigation.width` as whole px,
  removed at 256; a value that can't be read, or is not a number, is 256; one outside
  208 to 400 is clamped. Nothing is written to the data source.
- Catalogue keys `layout.navigation.resize` and `layout.navigation.width`.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `navigation-resize-handle.test.tsx` (`widens with the pointer …`); `app-shell-navigation.test.tsx` (`follows the edge …`); `navigation-width.spec.ts` (`widens with the pointer …`, the cursor in `shows the edge can be dragged …`); screenshots                                                                                                                               |
| S2       | `navigation-preference.test.ts` (`keeps a width within 208px and 400px …`, `reads %j as %i`); `navigation-resize-handle.test.tsx`; `navigation-width.spec.ts` (`widens with the pointer …`)                                                                                                                                                                                     |
| S3       | `navigation-resize-handle.test.tsx` (`goes back to 256px on a double-click`); `navigation-width.spec.ts` (`… on a double-click`)                                                                                                                                                                                                                                                |
| S4       | `navigation-resize-handle.test.tsx` (`is a vertical separator …`, `moves 16px by the arrows …`); `app-shell-navigation.test.tsx` (`… an edge that is its last stop`); `navigation-width.spec.ts` (`is moved by the keyboard …`, with the focus fill); `focus-indicator.spec.ts` (the tour); axe in `accessibility.spec.ts`                                                      |
| S5       | `navigation-resize-handle.test.tsx` (`settles a drag cut short …`); `navigation-preference.test.ts` (`the navigation's width`); `app-shell-navigation.test.tsx` (`is as wide as last left …`, `is 256px where the stored width is not readable`); `navigation-width.spec.ts` (`is remembered across a reload and a fold …`, `is 256px, with no error, where browser storage …`) |
| S6       | `app-shell-navigation.test.tsx` (`has no edge in a rail`, `has no edge, and keeps the width it has …`); `navigation-width.spec.ts` (`has no edge in the rail …`, `has no edge in the phone's drawer`)                                                                                                                                                                           |
| S7       | `navigation-width.spec.ts` (`keeps a roadmap's page in the 624px left at 1024px`, in `en` and `cy`, with the pinned strip starting at 400px); screenshots                                                                                                                                                                                                                       |
| S8       | `navigation-width.spec.ts` (`under a finger …`, real touch events through the browser's protocol, the hit area 24px)                                                                                                                                                                                                                                                            |

Tests followed the code (layout and behaviour, not a pending-edit rule); each was shown red
by breaking the finished code, then restored: the drag not clamped (S2), no double-click reset (S3), no handling of a cancelled pointer (S8), a stored width not clamped (S5) and the edge drawn in the rail (S6) and no settling when the edge goes mid-drag (S5), in `navigation-resize-handle.test.tsx`, `navigation-preference.test.ts` and `app-shell-navigation.test.tsx`.
