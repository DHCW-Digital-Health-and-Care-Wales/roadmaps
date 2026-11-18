# STY-067: A Product Lead sees a roadmap's items as compact rows, and switches back to cards

- **Status**: Needs grilling — the owner chose rows, what a row shows and where the
  switch is; Q1 and Q2 wait for an answer
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-016-a-roadmaps-items-at-a-glance](README.md)
- **Depends on**: STY-066 (hard: an opened row shows its fields, cut)
- **Binding ADRs**: ADR-002, ADR-005, ADR-008, ADR-010, ADR-011
- **Suggested model**: Opus — a second view of the whole items area, at two widths and
  in two languages, with focus carried through moves and a choice kept on the device

## Summary

As cards, a roadmap of 18 items is about 8 screens on a desktop and 12 on a phone. This
story adds a compact view, chosen by a switch beside Add an item and More and
remembered on the device across sessions. Each item is a row under the same headings:
on a desktop one line that never wraps, the title then the start of the description,
cut with "…"; on a phone the title on the lines it needs. Move and Edit are always in
view, and a row opens in place to its other fields, a long one cut as a card cuts it.
Cards stay the first view. Not in it: a table or a board. Waiting on the owner: the
views' names, and whether a phone's row shows a line of the description.

## Scope

`features/roadmaps` (the items area, and the top of the page for the switch), a stored
choice of view on the device beside the navigation's, and `i18n/`. Nothing in `domain/`
or `infrastructure/`: no read or write of the data source changes. `docs/GLOSSARY.md`
gains the compact view, and "item card" becomes an item as the Cards view shows it.

## Acceptance criteria

### S1: The switch sits with the page's actions (owner, D5)

**Given** a roadmap's page at 768px or wider
**When** the Product Lead looks at the title's row
**Then** a two-part switch, Cards and Compact, sits before Add an item and More, which
stay where they are, at the top and once the header has stuck
**And** the switch is one group named for what it chooses, and the view in use reads as
pressed, to the eye and to a screen reader

### S2: The switch on a phone (owner, D5)

**Given** the page narrower than 768px
**When** the Product Lead looks at the row of Add an item and "Jump to", at the top or
once stuck
**Then** one button with an icon, named "Compact view", sits after "Jump to", pressed
while the view is compact
**And** "Jump to" gives up the room, cutting its placement's name as it does today

### S3: Choosing a view

**Given** a roadmap's page showing its items as cards
**When** the Product Lead chooses Compact
**Then** the items show as rows, under the same headings, in the same groups and order
**And** focus stays on the switch, and the placement the page was in is still in view
**And** choosing Cards brings the cards back

### S4: A desktop's row is one line (owner, D1, D2)

**Given** the compact view at 768px or wider
**When** the Product Lead reads a row
**Then** it holds, on one line: a chevron, the item's title, the start of its
description, its pending tag when it has one, then Move and Edit
**And** the description takes what room the title leaves and ends in an ellipsis where
it is cut; an item with no description shows its title alone
**And** the row never wraps and never grows wider than the list, so Move and Edit are
in view on every row
**And** a title longer than the line is itself cut with an ellipsis, and read whole by
a screen reader

### S5: A phone's row shows its title whole (owner, D3)

**Given** the compact view narrower than 768px
**When** the Product Lead reads a row
**Then** the title shows on as many lines as it needs, with no description
**And** its pending tag, when it has one, sits under the title
**And** Move and Edit, as icons named as on a card, sit at the row's end, in view on
every row

### S6: A row opens in place

**Given** a row, closed
**When** the Product Lead presses its chevron, named "Show the rest of" then the
item's title
**Then** every field the item has shows under the row, as a card labels them, the
phase and the description among them, and the title shows whole
**And** the chevron reads as expanded, and is named "Hide the rest of" then the title
**And** any number of rows can be open; each closes by its chevron, and all are closed
again when the view changes or the page is left

### S7: An opened row cuts a long field as a card does (owner, D6)

**Given** an opened row whose description, expected outcome or details run past three
lines
**When** it shows
**Then** each is cut after three lines with "Show more", and shown whole with "Show
less", as STY-066 has a card's
**And** a field of three lines or fewer shows whole

### S8: Move and Edit do what they do on a card

**Given** a row
**When** the Product Lead opens Move and chooses a position or another placement, or
presses Edit
**Then** the item moves, or the item dialog opens, as from a card (STY-031, STY-044,
STY-050)
**And** focus returns to Move on the row in its new place, or to Edit as the dialog
closes
**And** while the roadmap is being published the same controls wait as on a card
(STY-046 D10, STY-050 S15)

### S9: Pending changes show on a row

**Given** an item with pending edits, an item added and not yet published, and a
placement whose order is pending
**When** the compact view shows
**Then** the first row is tagged Changed and the second New, and the placement's
heading shows "Order changed" with "Undo order", as today
**And** an opened row with pending edits ends in "Undo changes", and an opened new
item in Remove, each doing what it does on a card
**And** the placement links, "Jump to" and the foot bar count and mark what they do
today

### S10: Unplaced items and empty placements

**Given** a roadmap with an unplaced item and a placement with none
**When** the compact view shows
**Then** the unplaced group comes first, flagged, with its note, and its row says what
is wrong with the item's horizon: in the line on a desktop, under the title on a phone
**And** the empty placement says "No items" under its heading

### S11: The view is remembered (owner, D4)

**Given** a Product Lead who chose Compact on one roadmap
**When** they open another roadmap, reload the page, or come back another day on the
same device
**Then** that roadmap's items show in the compact view
**And** a Product Lead who has never chosen sees Cards
**And** where the choice can't be read or kept, the page shows Cards and the switch
still works for the visit

### S12: The states the items area already has

**Given** the compact view chosen
**When** the items are being read, a roadmap has no items, a read fails, or the
session has expired
**Then** the page shows what it shows today for each, the loading placeholder drawn as
rows
**And** the switch stays in place and can be used

### S13: Keyboard, Welsh and the look

**Given** the page in English and Cymraeg, in the light and the dark theme, at 375px,
768px, 1024px and 1280px
**When** the switch and the compact view are used with a keyboard alone and checked
**Then** every control is reached and named, in the order drawn, the switch before Add
an item from 768px; headings run h1, h2, h3; nothing scrolls sideways or passes the
right edge, with a long title beside the switch
**And** axe reports no WCAG 2.2 AA violation

## Open questions

- **Q1**: What are the two views called?
  - (a) Cards and Compact (recommended) — "compact" is your word for it, and holds if
    another layout is ever added.
  - (b) Cards and List — names what the Product Lead sees.
- **Q2**: Does a phone's row show any of the description? _On a phone the title takes
  the row's lines._
  - (a) No (recommended) — the shortest page: about 3¾ screens for 18 items.
  - (b) One line of it under the title, cut with "…" — says what an item is without
    opening it, at about one line more for every row.

## Decisions

- **D1** (owner, 2026-11-18, compact view UX analysis decision 3): the compact view is
  design A, rows, over a table or a board.
- **D2** (owner, 2026-11-18, analysis decision 6): a row shows only the title and,
  where there is room, the start of the description, cut with "…"; it does not wrap or
  grow, so Move and Edit are always visible. Adds S4.
- **D3** (owner, 2026-11-18, analysis decision 18, after seeing a phone's titles cut):
  on a phone a row shows as many lines as its title needs. Adds S5.
- **D4** (owner, 2026-11-18, analysis decision 11): the view chosen is remembered for
  the user across sessions. The app does not know who is using it, so it is kept on the
  device, as the navigation's fold is. Adds S11.
- **D5** (owner, 2026-11-18, analysis decision 4): the switch is design D, with the
  page's actions. Adds S1, S2. Changes STY-065 S1, S6, S7 and S10: the title's row
  gains the switch, before Add an item in the Tab order, and a phone's row of Add an
  item and "Jump to" gains the button.
- **D6** (owner, 2026-11-18, analysis decision 26): STY-066's cut applies in the
  compact view too, when a row is opened. Adds S7.
- **D7** (agent, 2026-11-18, analysis decisions 7 and 8): a row opens in place, any
  number at once, over one at a time; Move and Edit are on every row, and "Undo
  changes" and Remove in the opened row, over a menu holding them all.
- **D8** (agent, 2026-11-18, from D2 and D3; analysis decisions 19 and 20): a row
  shows no phase, which an opened row shows with the other fields; a phone's pending
  tag and an unplaced item's flag sit under the title, in words, over an icon alone in
  the line.
- **D9** (agent, 2026-11-18, analysis decisions 11, 12 and 16): one choice for every
  roadmap, over one for each; switching keeps the placement in view and closes opened
  rows; Cards is the first view on every device.
- **D10** (agent, 2026-11-18): "a desktop's row" starts at 768px, where the top of the
  page changes its layout (STY-065 D7), so the switch and the row change together.
- **D11** (agent, 2026-11-18, analysis decision 13): the switch is two buttons in a
  group, the view in use pressed, over tabs, which the owner turned down for the
  placements (STY-053 D1) and which would say the views are separate pages.

## Starting point

Audited at `2e073ee`. The page hands a moved item's focus to its new card by its
position among the page's items (`RoadmapItems`, `EditableItemCard`'s `focusRequest`);
a row needs the same. The item dialog returns focus to the Edit that opened it by a ref
the page gives one card (`dialogOpener`). The navigation's fold, width and closed
families are the device preferences already kept (`navigation-preference.ts`), each
read behind a `try` so a browser that refuses storage still works. The prototype's
switch is a pair of pressed buttons; the app has no such control yet, and the DHCW
design system has a button group (`src/components/actions/_button-group.scss`). On the
title's row the switch takes about 220px: at 768px a title is left about 220px.

## Out of scope

- The table and the board: the owner chose rows (D1).
- Filtering, sorting or dragging items.
- Opening every row at once: the Cards view is that.
- A third view, and a choice of view for each roadmap.
