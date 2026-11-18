# STY-067: A Product Lead sees a roadmap's items as compact rows, and switches back to cards

- **Status**: Done — the owner chose rows, what a row shows and where the switch is,
  and answered both questions on 2026-11-18
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
remembered on the device. Each item is a row under the same headings, showing its
title and, on a desktop, the start of its description; Move and Edit are always in
view, and a row opens in place to its other fields. Cards stay the first view. Not in
it: a table or a board, which the owner set aside.

## Scope

`features/roadmaps` (the items area, and the top of the page for the switch), a stored
choice of view on the device beside the navigation's, and `i18n/`. Nothing in `domain/`
or `infrastructure/`: no read or write of the data source changes. `docs/GLOSSARY.md`
gains the compact view, "item card" becomes an item as the Cards view shows it, and a
row of the compact view is told apart from the "row" the glossary avoids for a
position.

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

## Tests

S4 needs a browser: that a row stays one line, cuts its description and keeps Move and
Edit in view is layout, which jsdom does not do. So do S1 and S2 beside a long title
and in Cymraeg, at each width of S13. The rest hold as component tests.

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
  page's actions. Adds S1, S2. Changes STY-065 S1, S6, S7 and S10, and STY-060 S3 and
  S4: the title's row and the stuck strip gain the switch, before Add an item in the
  Tab order, and a phone's row of Add an item and "Jump to" gains the button.
- **D6** (owner, 2026-11-18, analysis decision 26): STY-066's cut applies in the
  compact view too, when a row is opened. Adds S7.
- **D7** (owner, 2026-11-18, analysis decision 5): the views are Cards and Compact,
  over Cards and List.
- **D8** (owner, 2026-11-18, analysis decision 18 (c)): a phone's row shows no line of
  the description under its title.
- **D9** (agent, 2026-11-18, analysis decisions 7 and 8): a row opens in place, any
  number at once, over one at a time; Move and Edit are on every row, and "Undo
  changes" and Remove in the opened row, over a menu holding them all.
- **D10** (agent, 2026-11-18, from D2 and D3; analysis decisions 19 and 20): a row
  shows no phase, which an opened row shows with the other fields; a phone's pending
  tag and an unplaced item's flag sit under the title, in words, over an icon alone in
  the line.
- **D11** (agent, 2026-11-18, analysis decisions 9, 12 and 16): a phone has the compact
  view; one choice for every roadmap, over one for each; switching keeps the placement
  in view and closes opened rows; Cards is the first view on every device.
- **D12** (agent, 2026-11-18, analysis decisions 17 and 21): Move and Edit are words on
  a desktop's row and icons on a phone, over words everywhere; the start of the
  description is its text from its first word, over its first sentence.
- **D13** (agent, 2026-11-18, analysis decisions 13 and 15): the switch is two buttons
  in a group, the view in use pressed, over tabs, which the owner turned down for the
  placements (STY-053 D1); "a desktop" starts at 768px, where the top of the page
  changes (STY-065 D7); the glossary changes with this story, not before.
- **D14** (agent, 2026-11-18): the chevron's name changes as the row opens and it reads
  as expanded too, as the item form's opening fields do, over a fixed name.

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

## Delivery

### Departures

- **S1, S2, D13**: the view in use is drawn pressed by what holds its button, DHCW's grey
  with a 2px dark inner ring, the button transparent over it, as the navigation's pressed
  entry is: on the button the grey would hide the focus fill (`src/styles/AGENTS.md`).
  Focused, the pressed button shows the fill inside the ring (agent).
- **S2**: where the page has no placements to jump to (no items yet, or while they are
  read), "Compact view" sits alone at the end of the row of Add an item (agent).
- **S4**: on a desktop's line an unplaced item's flag takes at most a quarter of the
  line and, while the row is closed, is cut with an ellipsis where it runs past it, its
  whole text still read, so a long horizon, or a Welsh flag beside a pending tag, leaves
  the title its room; opened, the flag wraps whole within its quarter. On a card, and on
  a phone's row, it wraps as before (agent).
- **S4, S5**: "a desktop" is the viewport's width from 768px (`TABLET_WIDTH`), as the top
  of the page's, not the list's room: beside the open navigation at 1024px the line is
  narrower, and still one line (agent, D13).
- **S6, D11**: a row opened, then moved to another placement, is drawn anew there,
  closed, as a card's opened field is (STY-066 D7); one moved within its placement's
  order stays open (agent).
- **S8**: one item component draws either view: `EditableItemCard` is `EditableItem`,
  `CardControl` is `ItemControl`. The card's fields and its unplaced flag are
  `ItemFields` and `HorizonFlag` (its own module), which a card and a row share; `EditControls`
  is drawn from `PendingTag`, `DropButton` and `EditButton`, which a row uses apart. Move
  and Edit hold their word in a span of its own, visually hidden on a phone's row; the
  accessible name is unchanged (agent).
- **S3**: the placement navigation gains `align`, a jump that leaves focus where it is,
  so a view chosen puts the placement the page was in back at the top; pressing the
  view already in use changes nothing. `jump` is `align` and a focus, so a jump to a
  target whose heading has gone now ends the last jump, where it was kept (agent).

### Contract for dependents

- **Stored choice**: `roadmaps.items.view` in `localStorage`, `compact` or absent (Cards),
  read and kept by `useItemsView` (`features/roadmaps/hooks/use-items-view.ts`), never
  sent anywhere; nothing read from or written to the data source changes.
- **Catalogue keys**: `roadmaps.view.label`, `.cards`, `.compact`, `.compactView`;
  `roadmaps.items.row.show` and `.hide`, with `{{item}}`.
- **Test hooks**: the group "View" with buttons "Cards" and "Compact" (pressed), from
  768px; "Compact view" (pressed) narrower; a row's chevron "Show the rest of <title>" /
  "Hide the rest of <title>". E2E: `tests/e2e/roadmap-items-compact.spec.ts`; the aria
  snapshot `detail-compact.aria.yml`.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | `pages/roadmap-detail-page-compact.test.tsx` (`is a group named View, Cards pressed, before Add an item and More`); `roadmap-items-compact.spec.ts` (`sits before Add an item at …px in en/cy, at the top and once stuck`, 768–1280px); `roadmap-header.spec.ts` (`opens on the title with its controls…`)   |
| S2       | `roadmap-detail-page-compact.test.tsx` (`is one button, Compact view, after Jump to…`); `roadmap-items-compact.spec.ts` (`sits after Jump to at 375px/640px…`); `control-row.spec.ts` (phone's row and stuck strip)                                                                                          |
| S3       | `roadmap-detail-page-compact.test.tsx` (`shows the items as rows under the same headings, in the same order…`); `roadmap-items-compact.spec.ts` (`keeps the placement the page was in at the top as the view changes, focus on the switch`, `leaves the page where it is when the view in use is pressed…`)  |
| S4       | `roadmap-items-compact.spec.ts` (`is one line at 768px/1024px/1280px…`, `puts an unplaced item's flag in the line`, `keeps a flagged row's title in view and its Edit within the list at 768px/1024px in Cymraeg…`); `roadmap-detail-page-compact.test.tsx` (`holds, on a desktop, the chevron, the title…`) |
| S5       | `roadmap-items-compact.spec.ts` (`shows the title whole on its lines, no description…`); `roadmap-detail-page-compact.test.tsx` (`shows, on a phone, the title with no description…`)                                                                                                                        |
| S6       | `roadmap-detail-page-compact.test.tsx` (`shows every field the item has…`, `opens any number of rows at once, all closed again once the view changes`); `roadmap-items-compact.spec.ts` (`opens a row in place at …px`)                                                                                      |
| S7       | `roadmap-items-compact.spec.ts` (`opens a row in place at 1280px/375px, its long fields cut after three lines`)                                                                                                                                                                                              |
| S8       | `roadmap-detail-page-compact.test.tsx` (`moves the item to another placement…`, `moves the item within its placement's order…`, `opens the item dialog from Edit…`, `holds a new item's Move, Edit and Remove while the roadmap is being published`)                                                         |
| S9       | `roadmap-detail-page-compact.test.tsx` (`ends in Undo changes…`, `ends in Remove…`, `moves the item within its placement's order, which the heading then marks`, and the Changed tag in the row tests)                                                                                                       |
| S10      | `roadmap-detail-page-compact.test.tsx` (`lists the unplaced items first, flagged, with their note, and an empty placement says No items`); `roadmap-items-compact.spec.ts` (the flag in the line and under the title)                                                                                        |
| S11      | `hooks/use-items-view.test.ts`; `roadmap-detail-page-compact.test.tsx` (`the view kept on the device`); `roadmap-items-compact.spec.ts` (`remembers the view on another roadmap and after a reload`)                                                                                                         |
| S12      | `roadmap-detail-page-compact.test.tsx` (`the states the items area already has`: loading drawn as rows, a failed read, an expired session, no items)                                                                                                                                                         |
| S13      | `roadmap-items-compact.spec.ts` (`the keyboard`, `the switch beside a long title` in en and cy at 375–1280px, `has no axe violation in the compact view…`); `roadmap-header.spec.ts` (`reaches the controls in the order they are drawn`); `structure.spec.ts` (`detail-compact.aria.yml`)                   |

Each test was written after the code and shown red by breaking it, then green with the
code restored: the choice never stored (two tests), the phone's toggle not pressed, the
opened row's "Undo changes" and Remove dropped (three tests), a desktop's row with no
description, the switch left out from 768px (19 tests); in Playwright, the view's change
not realigning the page (S3) and a description not cut (S4); after review, the pressed
view realigning later (S3) and the flag drawn whole in Welsh beside a Changed tag, which
left the title no room (S4, two widths); and the opened row's flag cut (S6). The header's specs for
STY-059 S7, STY-060 S3 and STY-065 S1, S7 and S10 changed with D5: the switch before Add
an item from 768px, and "Compact view" after "Jump to" narrower. The aria snapshots
`detail` and `detail-not-published` gain the switch.
