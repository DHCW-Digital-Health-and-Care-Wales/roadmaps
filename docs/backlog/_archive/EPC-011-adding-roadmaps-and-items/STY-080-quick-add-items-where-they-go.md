# STY-080: A Product Lead adds items where they will go, by title alone (quick add)

- **Status**: Done — delivered in its PR; grilled with the owner on 2026-11-20 from
  design E of the add-items analysis
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: none (STY-046 and STY-047 are delivered)
- **Binding ADRs**: ADR-012, ADR-014, ADR-011, ADR-005, ADR-008, ADR-010
- **Suggested model**: Opus — a new inline control in both views of a page many tests
  read, with focus, blur and layout rules that are easy to get subtly wrong

## Summary

Each horizon and section on a roadmap's page ends with a quiet "Add an item". Choosing
it opens a title field in its place: Enter, or Add, adds a new item there, title only,
and opens a fresh field for the next; Escape, Cancel or leaving the field drops what was
typed. It works in the cards and compact views, on a phone and with a keyboard, and
while the session has expired, as editing does. The page's own "Add an item" and the
dialog stay. Expanding the field into the dialog is STY-081; the publish dialog's flag
for a title-only item is STY-082.

## Scope

The quick add control and its field in both views of a roadmap's page (`features/`),
replacing an empty placement's "No items" line; the page's "Add an item" no longer
asking to reconnect (D7); copy in both catalogues; E2E. The new item itself, its write
and its place in the publish dialog are STY-045's, STY-046's and STY-047's, unchanged.

## Acceptance criteria

The grilling of 2026-11-20 is cited as "quick add round n Qm" (the epic's _How the
grilling is cited_).

### S1: Every placement ends with "Add an item" (quick add round 1 Q2, round 2 Q4, round 3 Q1)

**Given** Sam is connected and a roadmap's items have loaded, with items in Now and none
in Not doing **When** the page shows, in the cards view and in the compact view **Then**
each of the six placements ends with a quiet "Add an item", named for its placement to a
screen reader ("Add an item to Now"): a card with a light dashed outline, grey text and
a plus in the cards view, a grey row in the compact view whose plus sits under the rows'
chevrons and whose text lines up with their titles **And** Not doing, which has no
items, offers "Add the first item" ("Add the first item to Not doing" to a screen
reader) in place of today's "No items" line, while its count in the placement links
stays 0; the unplaced items' group has no quick add, since a new item needs a placement

### S2: Choosing it opens a title field in its place

**Given** that page **When** Sam chooses "Add an item" under Next **Then** a title field
takes its place, focused, named "Title of a new item in Next", with Add and Cancel:
under the field in the cards view and on a phone, beside it in the compact view on a
wider screen, where the field fills the row from its left edge **And** the field holds
no placeholder text and no hint; Add and Cancel are full-size buttons (40px), as a
form's are

### S3: Enter, or Add, adds the item and opens the next field (D1)

**Given** Sam has typed "Book a hearing test online" in Next's field **When** Sam
presses Enter, or chooses Add **Then** a new item with that title shows last in Next,
tagged "New", as one more unpublished change, and a fresh field opens after it, focused,
for the next title; a screen reader hears "“Book a hearing test online” was added to
Next." **And** nothing is written until Sam publishes or saves

### S4: Escape, or Cancel, drops what was typed

**Given** Sam has typed a title in a field **When** Sam presses Escape or chooses Cancel
**Then** nothing is added, the field closes, and "Add an item" is back, focused

### S5: Leaving the field drops what was typed (quick add round 1 Q4)

**Given** Sam has typed a title in Next's field **When** Sam clicks or taps elsewhere,
or tabs past Cancel, without adding **Then** nothing is added and "Add an item" comes
back **And** a press that left the field lands where it was aimed: choosing "Add an
item" under Later opens Later's field, though Next's field, taller than its control,
closes as the press ends; tabbing from the field to its own Add or Cancel keeps it open

### S6: Empty, spaced and repeated titles (quick add round 3 Q2)

**Given** a field **When** Sam presses Enter with nothing typed, or only spaces; or
types `␣␣see␣␣␣your waiting time␣` (␣ a space) in Next, which already has "See your
waiting time" **Then** an empty title adds nothing and the field stays open; spaces are
trimmed and run together, giving "see your waiting time"; a repeated title is added as
typed, beside the other

### S7: On a phone, the field and its buttons stay in view

**Given** Sam is on a phone **When** the field opens and the on-screen keyboard shows
**Then** the field, Add and Cancel scroll into view above the keyboard, and the
keyboard's return key adds as Enter does

### S8: Not before the items are read (quick add round 3 Q7)

**Given** a roadmap's page whose items have not been read, or whose first read failed
**When** the page shows **Then** there is no quick add, since no placements are drawn
**And** once the items are read, quick add is offered whenever the page's "Add an item"
is

### S9: Available while a publish is under way (quick add round 3 Q7)

**Given** a publish of the roadmap is under way **When** Sam adds items by quick add
**Then** they are added as pending new items, while a new item's Edit, Move and Remove
are held as STY-046 D10 has them **And** a field open as the publish settles, and the
items are read again, stays open with what was typed in it

### S10: Available while the session has expired (quick add round 4 Q1)

**Given** Sam's session has expired **When** Sam chooses "Add an item" at a placement
and adds items **Then** the field opens and adds pending items without asking to
reconnect, as Edit and Move do; Publish, Save and Refresh still ask to reconnect first

### S11: The page's "Add an item" no longer asks to reconnect (D7)

**Given** Sam's session has expired **When** Sam chooses the page's "Add an item"
**Then** the item dialog opens at once, without asking to reconnect

### S12: A quick-added item is a new item like any other (quick add round 5 Q1)

**Given** a new item added by quick add, with only a title **When** Sam looks at its
card, or chooses Edit, Move or Remove, reorders it, or publishes **Then** its card shows
its title, the "New" tag and its buttons, with nothing in place of the missing fields;
Edit, Move, the order controls and Remove (which asks first, STY-049 D11) behave as for
any new item; publishing writes it as STY-045 does

### S13: Welsh, themes, keyboard and assistive technology

**Given** the interface is in Welsh or English, in the light or dark theme **When** Sam
uses quick add by keyboard alone, or with a screen reader **Then** every new string is
in Welsh, every quick add control's name differs from every other control's on the page
(the focus tour holds it), the text of "Add an item" meets 4.5:1 in both themes, and axe
finds nothing in an open field or on the page

## Tests

S3–S6 and S9–S11 need Playwright against the Sheets fake in both views: adding a run of
items, Escape, leaving by a click on another placement's control, the expired session, a
publish under way and an empty placement. The phone keyboard of S7 is checked by hand on
a device; the owner saw Add and Cancel stay above the keyboard on an iPhone 17 in the
prototype.

## Decisions

- **D1** (owner, 2026-11-20, analysis design E): one control per placement adds a run of
  items by title, over a button per heading, copying an item, pasting several or copying
  from another roadmap (A–D). It reopens STY-046 D1, which set quick add aside (recorded
  there as D18), with STY-082's flag for the title-only risk.
- **D2** (owner, 2026-11-20, quick add round 2 Q4, round 3 Q1): the control reads "Add
  an item" and, in an empty placement, "Add the first item", replacing "No items"; named
  "Add an item to Next" for assistive technology, over "Add item" and "No items yet, add
  one".
- **D3** (owner, 2026-11-20, prototype review): Add and Cancel show on every screen,
  since a page can't tell whether a keyboard with Escape is attached; no hint and no
  placeholder text, which the owner found redundant and which fades as typing starts.
- **D4** (owner, 2026-11-20, quick add round 1 Q4): leaving the field drops a typed
  title, over keeping a draft or adding it.
- **D5** (owner, 2026-11-20, quick add round 3 Q3–Q4): Add and Cancel are 40px; the
  dashed outline stays quiet (1.4:1 light, 2.7:1 dark), decoration, since the label
  identifies the control.
- **D6** (owner, 2026-11-20, quick add round 3 Q5, Q7): the page's "Add an item" and the
  empty roadmap's panel stay as they are; quick add follows the page's button once the
  items are read and during a publish.
- **D7** (owner, 2026-11-20, quick add round 4 Q1): adding writes nothing until
  publishing, so quick add, STY-081's expand and the page's "Add an item" work while the
  session has expired, without asking to reconnect. Changes STY-057 D1 (recorded there
  as D4) and STY-046 D15 (as D17) for "Add an item".
- **D8** (agent, 2026-11-20, from review): the announcement follows the existing
  "“{{title}}” was added." pattern with the placement, "“{{title}}” was added to
  {{placement}}.", over "added to Next" without "was".

## Starting point

Audited at `cc32b48`:

- The focus tour fails when two tab stops share a name
  (`tests/e2e/focus-indicator.spec.ts`); "Add item" is already the dialog's submit, so
  each control's name carries its placement.
- "No items" is asserted by `placement-navigation.spec.ts` (`getByText("No items")`) and
  the unit tests `roadmap-detail-page-items`, `-compact` and `-placement-navigation`;
  `roadmaps.items.noneInPlacement` is also the conflict review's, so it stays in both
  catalogues. `moved-travel.spec.ts` takes a placement list's `.last()` list item, which
  the new control becomes. The aria snapshots `detail`, `detail-compact` and
  `detail-not-published` (the only one with "No items") change.
- `adding-an-item.spec.ts` asserts that "Add an item" asks to reconnect while expired,
  which S11 reverses.
- Counts, positions and "To the bottom" are worked out from the data, not the DOM, so a
  control at the end of a list does not shift them.
- When the first items read fails, the page draws an error panel and no placements; a
  failed later read keeps the items drawn and "Add an item" enabled (`canAdd` checks
  only that the data is there).
- In the compact view, a new item's Remove is at the foot of its opened row, not on the
  row, as for any item.
- The working prototype is
  `docs/analysis/add-items-ux-analysis/quick-add-ux-prototype.html`; its
  blur-after-press rule and equal-height checks are the ones S5 needs.

## Out of scope

- Expanding the field into the item dialog: STY-081.
- Flagging a title-only item before publishing: STY-082.
- Quick add on an empty roadmap, which keeps its panel (STY-046 D3, D13).

## Delivery

### Departures

- **S9: a publish is under way with the page in reach only once it has been left
  and come back to** (agent): the publish dialog is modal until the publish has
  settled and the items are read again, and opening it moves focus out of any open
  field, which drops it (S5). Back while it writes, then Forward, brings the page
  back with the publish still under way and no dialog: quick add consults no publish
  state, so it adds there, and what it adds stays pending once the publish settles.
  A field open as a read lands is held by a Refresh's read, which redraws the page as
  the publish's own read does.
- **S11 covers the empty roadmap's "Add an item" too** (agent): the page's button and
  the empty panel's are one component (`AddItemButton`), so neither asks to reconnect;
  D7's reason, that adding writes nothing until a publish, holds for both.
- **The control's focus is the ring, not the fill** (agent): it is drawn as a dashed
  card, or a row of the compact view, and takes `focus-ring` as the cards and the
  prototype do; its buttons, Add and Cancel, take the fill.
- **S6: spaces are run together by quick add alone** (agent): the item dialog still
  only trims, as STY-046 has it; no domain rule changed.
- **S5: leaving is a press, a tap or Tab** (agent, from review): focus the page takes
  itself, as the two-minute session warning does, keeps the field and its title, as
  the item dialog keeps its own; a phone keyboard's own close button, which moves no
  focus elsewhere, leaves it open too.
- **S7 was not checked on a device** in this delivery: the field scrolls itself into
  view (`block: "nearest"`) as it opens and after each add, and its title field's
  return key is `enterkeyhint="enter"`, as in the prototype the owner checked on an
  iPhone 17.

### Contract for dependents

- **Quick add is `QuickAdd`** (`features/roadmaps/editing/quick-add.tsx`), the last
  item of each placement's list in both views (`RoadmapItems`); the unplaced items'
  list has none. It holds its own open state and title, so a read that redraws the
  page keeps it open with what was typed; a change of view starts it shut. It adds
  through `addNewItem` with `{ title, placement }` alone, so a quick-added item is a
  `NewItem` whose other values are `""`: STY-082 reads that.
- **Every placement is a list now**, an empty one holding only its quick add, so a
  test that counted lists, or took a list's last item for its last card, filters by
  the item heading (`moved-travel.spec.ts`).
- **Leaving the field is `useLeaveAfterPress`** (`editing/use-leave-after-press.ts`),
  whose `onFocus` and `onBlur` the field holds: a press or a tap outside it, or Tab,
  closes it a task after the press has ended, so the press's click lands where it was
  aimed first; focus back in the field cancels it. Focus the page takes itself, as the
  session warning does, leaves the field open with its title. A press on the field's
  own Add or Cancel (and on STY-081's expand) keeps focus in the title by preventing
  the press's default.
- **"Add an item" and quick add ask for no session** (D7): `AddItemButton` no longer
  wraps `useSessionAction`.

### Scenario evidence

Page tests are in `src/features/roadmaps/pages/roadmap-detail-page-quick-add.test.tsx`
unless named otherwise; Playwright's in `tests/e2e/quick-add.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `ends each of the six placements, in the cards view…` and `…compact view…`; `roadmap-detail-page-items.test.tsx`, `-compact.test.tsx` and `-placement-navigation.test.tsx` (no "No items"); Playwright `an empty placement offers its first item…`, `placement-navigation.spec.ts`; `structure.spec.ts` (`detail`, `detail-compact`, `detail-not-published`)                                                                                                                                                                                                                              |
| S2       | `opens in its place, focused…`; Playwright `the field's layout (S2)` in Welsh at 375, 640, 768, 1024 and 1280px, both views: Add and Cancel 40px, under or beside the field, inside the list                                                                                                                                                                                                                                                                                                                                                                                              |
| S3       | `adds the title last in its placement… on Enter` and `…on Add`; Playwright `adds a run of items by title in the cards view…` and `…compact view…` (no write until Publish); `structure.spec.ts` (`quick-add-open`)                                                                                                                                                                                                                                                                                                                                                                        |
| S4       | `drops what was typed on Escape…` and `…on Cancel…`; Playwright `Cancel drops what was typed…` and the run's Escape                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| S5       | `stays open as Tab goes to its own Add and Cancel…`, `drops what was typed when a click lands elsewhere`; Playwright `a press on another placement's “Add an item” opens its field, as Next's closes` at 375px with a mouse, and `on a touch screen › a tap on another placement's “Add an item”…` in the compact view; `stays open, with what was typed, when the page takes focus itself…`; Playwright `the session warning, opening as a title is typed, leaves the field and its title`                                                                                               |
| S6       | `adds nothing for an empty title or spaces…`; Playwright `an empty placement offers its first item…`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S7       | Not run: a device check (Departures)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S8       | `is not there before the items are read…`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S9       | `adds pending items while a publish of the roadmap is under way, the page left and come back to…`; `keeps an open field, and what was typed in it, as the items are read again`; Playwright `a field open as the items are read again…` (Departures)                                                                                                                                                                                                                                                                                                                                      |
| S10      | `opens the field and adds pending items without asking to reconnect`; Playwright `adds while the session has expired…; Publish still asks`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S11      | `roadmap-detail-page-adding.test.tsx` (`opens the dialog at once while not connected…`), expired and connecting; `adding-an-item.spec.ts` (`the dialog stays through the session's end…`)                                                                                                                                                                                                                                                                                                                                                                                                 |
| S12      | `is a new item like any other: Edit opens the dialog on its title alone…`; the Playwright run publishes two quick-added items                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S13      | `In Welsh (S13)`; Playwright `the field's layout` in Welsh; `has no axe violation with a field open…` in both themes and views; `focus-indicator.spec.ts`'s page tours, whose stops now include each placement's control, every name differing                                                                                                                                                                                                                                                                                                                                            |
| Red      | The page tests were written first and failed before `QuickAdd` existed (16 of 17; S8's passed, as nothing was drawn). S11's test failed against `AddItemButton` still wrapping `useSessionAction`. Followed the code and shown red by breaking it: focus back in the title after Add chosen by keyboard (the focus call removed), and review round 1's tap on a touch screen (the field closed at once when no press was under way, as before the fix). The final fresh pass's session warning: `stays open… when the page takes focus itself…` failed with the check of who left removed |
