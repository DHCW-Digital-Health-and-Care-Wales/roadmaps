# A compact view of a roadmap's page: rows, a table or a board

- **Date**: 2026-11-18
- **Question**: a roadmap's page shows every item as a full card. What should a compact
  view of it show, how is the rest of an item reached from it, and where does a Product
  Lead switch between the two?
- **Scope**: the items area of a roadmap's page (`RoadmapItems`, `EditableItemCard`,
  `CardGrid`) and the header's row of controls (`RoadmapHeader`), on a desktop and a
  phone. It comes from the owner's request of 2026-11-18 to explore the idea, with no
  record yet, so every rule the frames follow is an open question (_Decisions needed_).
  Base `b6aaea0`. Only documents and one prototype page were added: no application
  code. The skill asks for its stylesheet to be corrected where the app has moved on;
  as in the two analyses before, that was not done here, and
  [CHO-022](../backlog/chores/CHO-022-the-prototype-stylesheet-draws-todays-shell.md)
  records what it lacks. The page carries the shell's styles itself.
- **Prototypes**: one self-contained page of **frames**,
  [`roadmap-compact-view-ux-prototypes.html`](roadmap-compact-view-ux-analysis/roadmap-compact-view-ux-prototypes.html):
  static mock-ups at a desktop (1280px wide, the navigation open) and a phone (375px),
  each labelled with its moment and where keyboard focus is. The shape is frames
  because the question is what the page shows and where things go, not how a control
  feels under the hand.
- **Sample world**: invented. On Wednesday 18 November 2026 Sam Evans, a Product Lead,
  opens Appointment booking, which she co-leads with Rhian Morgan. It is published, in
  the Citizen Services family, its status label "Beta", last updated 4 November 2026.
  It has 18 items: 1 with no recognised horizon (written "Soon"), Recently delivered 1,
  Now 5, Next 4, Later 4, Delivered this year 3 and Not doing 0. It has 3 unpublished
  changes: the first Now item's description is edited, the last Next item is new, and
  Later's order is changed. Planted: a title that wraps, "patient" beside "Patients",
  a new item with only a title, four items with no phase, an unplaced item and an empty
  placement. The navigation holds the navigation analysis's 14 roadmaps, every family
  closed but Citizen Services.

## Readers and where they are

A Product Lead with about 30 minutes a week for roadmaps (persona A1), mostly at a
desk, with a phone for the small jobs: check, move, fix a typo (A2). They want each
roadmap "as Now, Next and Later at a glance" and to move an item between horizons
without retyping it (persona, _What they need_). Today a card shows every field an
item has, so a roadmap of 18 items is a long scroll, and an item moved "Up one" in its
placement's order moves among cards too tall to see two of at once on a phone.

Measured on the frames, which draw the app's sizes with a system font, so each figure
is approximate:

| View     | Desktop: screens to scroll | Desktop: items in view at Now | Phone: screens to scroll | Phone: items in view at Now |
| -------- | -------------------------- | ----------------------------- | ------------------------ | --------------------------- |
| Cards    | about 8                    | 2 whole                       | about 12½                | 1 whole                     |
| A. Rows  | about 2½                   | 8                             | about 4                  | 5                           |
| B. Table | about 3½                   | 5                             | about 5                  | 3                           |
| C. Board | about 2½                   | 11                            | about 4½                 | 4                           |

A screen is the room between the stuck header and the pinned foot bar: about 600px of
an 800px desktop window and of an 812px phone.

## Journeys covered

| Group                                        | Journeys                                                                                                                                                                                                | Stories                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Read and work a roadmap in a compact view | see the whole roadmap; see what is pending; read the rest of an item; move an item to another placement or within its order; edit one; undo a change or remove a new item; scroll with the header stuck | none yet; builds on STY-021, STY-025, STY-031, STY-046, STY-050, STY-052 |
| 2. Switch between cards and compact          | find the switch; switch; keep the choice                                                                                                                                                                | none yet; builds on STY-059, STY-060                                     |

Journey 1 relies on the persona's A1 (short visits), A2 (desktop first, a phone for
small jobs) and, for the pending marks, A9 and A10 (nothing is public until
published). Journey 2 relies on A1: a choice made once should not be made again each
visit.

Excluded:

- the roadmap list, whose roadmap cards are another layout; the request names the
  Roadmap screen (decision 2);
- filtering or sorting a roadmap's items, by tag or organisation, which no record asks
  for; the order is the Product Lead's to set (STY-050);
- dragging an item, which the reorder analysis set aside for the Move menu;
- the item dialog, "About this roadmap", publishing and its dialogs, which no design
  changes;
- connecting to Google, and the Welsh interface (_Not yet drawn_).

## What every design shares

- **Cards stay, and are what everyone sees first** (decision 16). Compact is a second
  view of the same page, chosen by the Product Lead. Nothing about the card changes.
- **The page around the items is today's**: the header block and its stuck form
  (STY-059, STY-060), the placement links and "Jump to" with their counts and pending
  dots (STY-053), the pinned foot bar with its count, Publish and Discard (STY-052),
  and the navigation.
- **The same groups under the same headings**: the unplaced items first, flagged, with
  the horizon as written (STY-021 D2, D4, D9); then the six placements, each a level-2
  heading that the placement links jump to, an empty one saying "No items" (STY-021
  D1). Design C alone changes their order (decision 10). An item's title stays a
  level-3 heading.
- **The same pending marks**: Changed or New on the item, "Order changed" with "Undo
  order" beside the placement's heading (STY-025, STY-046, STY-050 S3).
- **The same actions, with the same names**: Move opens today's menu, its position
  first ("In Now: 2 of 5"), then the other placements (design B draws it open). Edit
  opens the item dialog. "Undo changes" and Remove do what they do on a card. Focus
  goes where it goes today: back to Move on the item in its new place, back to Edit as
  the dialog closes. While the roadmap is being published they wait as they do on a card,
  unavailable though focusable: a new item's Edit, Move and Remove (STY-046 D10), the
  choices of position in every Move menu, and "Undo order" (STY-050 S15).
- **A phone has the compact view too** (decision 9), since the phone's scroll is the
  longest.
- **Kept on this device**, as the navigation's fold, width and closed families are
  (STY-054 D5): one choice for every roadmap, not sent anywhere. Nothing new is read
  from or written to the data source, and the public site sees no change.
- The app's look, from its own tokens (ADR-010). Copy is draft English in the
  product's voice, reusing the catalogue's strings; the new words are "Cards",
  "Compact", "View", "Compact view", "Show the rest of…" and "Hide the rest of…"
  before an item's title, and in B the heading "Actions", read to a screen reader
  alone, over a row's buttons.
- **In compact, an item's other fields are no longer all on the page**, as STY-021 D3
  has them: they are a press away in A and C, and in Cards or Edit alone in B
  (decision 7).
- **Rules no record settles**, each a row of _Decisions needed_: what a compact item
  shows; how its other fields are read; where "Undo changes" and Remove go, and which
  buttons keep their words; that switching keeps the page at the placement it was in,
  with focus on the switch, and closes any item opened.

## 1. Read and work a roadmap in a compact view

Sam opens Appointment booking to check the plan before a meeting and to move one item.
As cards, Now alone is over three screens on a phone. Each design is the page once Compact
is chosen. The page draws today's cards first, for comparison, then for each design
the whole page, the screen once scrolled to Now, and that screen with an item opened
or a menu open.

| Design   | Idea                                                                                                                                                                                                                                                                                                                                         | Strengths                                                                                                                                                                                                                                                                                                                                                                     | Risks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today    | Each item a card with every field it has, two or three across on a desktop and one on a phone.                                                                                                                                                                                                                                               | Everything is read without a press. The card's size is the budget for an item's text (persona A11).                                                                                                                                                                                                                                                                           | About 8 screens on a desktop and 12½ on a phone for 18 items. The shape of the plan is not seen at once, and a move within a placement's order is hard to follow.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| A. Rows  | Each item one line: a chevron, its title, its pending tag, its phase, then Move and Edit. The chevron opens the row in place to show the item's other fields, and "Undo changes" or Remove; any number of rows can be open. On a phone the phase and tag sit under the title, and Move and Edit are icons.                                   | The densest view on a phone, and as short a scroll as C on a desktop, with a placement's whole order in view as an item moves. The page keeps its order, headings and links, so nothing else is relearnt. The rest of an item is one press away, where it is. The same on a phone as on a desktop. The smallest build: today's fields and controls in a row and a disclosure. | Tags and organisations are out of sight until a row is opened, so "patient" beside "Patients" is not seen. A Product Lead who stays in compact no longer sees the card whose size is the text's budget. Icon buttons on a phone lose their words. "Undo changes" is a press further away than on a card. One tab stop more per item than a card has: the chevron.                                                                                                                                                                                                                                                         |
| B. Table | Each placement a table: Title, Phase, Tags and Organisations in columns, then icons for Move and Edit, and for "Undo changes" or Remove on a pending item. Nothing opens: the description, expected outcome and details are read in Cards or in Edit. On a phone there is no room for columns, so each row stacks its cells under its title. | Phase, tags and organisations line up down the page, so drift between items shows: the planted "patient" is in view. Every action is in the row.                                                                                                                                                                                                                              | The least dense of the three, and on a phone it is short cards more than a table. The fields a public reader reads first, the description and the expected outcome, cannot be read here (departs from STY-021 D3). Column headings repeat under each of six headings. Icon buttons everywhere. A long title wraps in a narrow column. Empty cells for the many items with no phase or organisation.                                                                                                                                                                                                                       |
| C. Board | Now, Next and Later side by side, then the three sections side by side, each item a small tile: title, phase, pending tag, and icons for Move and Edit. A tile opens in place into the card it is. On a phone the six placements run one under another, in the board's order.                                                                | On a desktop the three horizons are read at once, the picture a Product Lead and a public reader have of a roadmap. A tile opens in its column to the card's fields.                                                                                                                                                                                                          | The gain is a desktop's alone: a phone gets tiles in a list, less dense than rows. On a desktop a tile is about 300px wide beside a card's 460px, so an opened tile wraps more than the card does, and it lays its phase and "Undo changes" out differently. It reorders the page (departs from STY-021 D1), while the placement links keep the public site's order. Beside the open navigation at 1024px a tile is about 215px wide. Columns of unequal length leave gaps. Move's choices do not match where a tile would go by eye. The largest build, and it draws a horizon as the column the glossary says to avoid. |

**Recommendation**: **A. Rows**. It saves the most room on a phone and as much scroll as
any design on a desktop, where C alone shows more at once, and it brings the least
that is new: the page keeps its shape, every action keeps
its name, and an item's whole text is one press away. No add-on now. B's columns are
worth a second look if Product Leads ask to check tags across a roadmap, and C's board
if they ask to see the horizons side by side on a desktop; either could later be a
third choice of the same switch.

## 2. Switch between cards and compact

The switch is the one new control on the page. The row of controls is already full on
a phone once the header has stuck: Add an item, More and "Jump to", which gives way by
cutting the placement's name (STY-060 D5). Every frame draws design A's rows; the
question is the same for B and C.

| Design                    | Idea                                                                                                                                                                                                                                                                                          | Strengths                                                                                                                                 | Risks                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D. In the row of controls | On a desktop, a two-part switch, Cards and Compact, at the end of the row, the view in use pressed. On a phone, one button with the rows icon, named "Compact view" and pressed while compact, after More. The same at the top and once stuck, so the view changes from anywhere in the page. | Seen on arrival, one press, and it says which view is in use. It stays as the page scrolls, where a long page is what prompts the switch. | A fourth control in a phone's stuck row of controls leaves "Jump to" about 50px narrower, so longer placement names are cut sooner. The control differs by width, a switch of two words on a desktop and one icon on a phone, as the jump control does (STY-060 D1). An icon alone is less clear than the words. Welsh labels are longer (_Not yet drawn_). |
| E. In More                | More gains a "View" group under Refresh and Unpublish roadmap: Cards and Compact, the one in use ticked.                                                                                                                                                                                      | No new control on the page, so the stuck row of controls is as today at every width. It suits a choice made once and kept.                | Two presses, and nothing on the page says another view exists or which is in use. More holds actions today; a view setting is another kind of thing in it.                                                                                                                                                                                                  |
| F. Above the items        | A line between the header and the first heading: "View", then the two-part switch, with its words at every width.                                                                                                                                                                             | The switch sits by what it changes, and a phone has room for the words.                                                                   | It scrolls away with the top of the page, so switching from the middle of a long roadmap means going back up. It adds a row of about 50px before the first item, on a page whose top was just tidied (EPC-013).                                                                                                                                             |

**Recommendation**: **D. In the row of controls**. A view that is hard to find is not
used, and the long page is where the switch is wanted. If the phone's stuck row of controls
proves too tight in Welsh, E is the fallback for a phone alone.

## Decisions needed

No record holds open questions on this yet. Each row is a choice between designs, a
rule the frames chose where the request was silent, or an earlier decision a design
reopens.

| #   | Decision                                                                                                                                                                                                                                                                                                                                             | Options                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Where the work goes: no epic or story holds it.                                                                                                                                                                                                                                                                                                      | (a) one story, the switch and the chosen compact view, once decisions 3 and 4 are made; (b) an epic, if more than one compact view is wanted; (c) not now                                                                |
| 2   | Which screen "the Roadmap screen" is. The frames read it as a roadmap's page, whose items are cards.                                                                                                                                                                                                                                                 | (a) a roadmap's page, as drawn; (b) the roadmap list, whose roadmaps are cards; (c) both                                                                                                                                 |
| 3   | The compact view (journey 1).                                                                                                                                                                                                                                                                                                                        | (a) A, rows; (b) B, a table; (c) C, a board; (d) more than one, as further choices of the switch                                                                                                                         |
| 4   | Where the switch is (journey 2).                                                                                                                                                                                                                                                                                                                     | (a) D, in the row of controls; (b) E, in More; (c) F, above the items; (d) D on a desktop and E on a phone                                                                                                               |
| 5   | What the two views are called.                                                                                                                                                                                                                                                                                                                       | (a) Cards and Compact, as drawn; (b) Cards and the layout's own name: List, Table or Board, the last a word the glossary avoids for a roadmap                                                                            |
| 6   | What a compact item shows without a press.                                                                                                                                                                                                                                                                                                           | (a) title, phase and pending tag (A and C, as drawn); (b) those with tags and organisations (B, as drawn); (c) the title and pending tag alone                                                                           |
| 7   | How an item's other fields are read in compact. Every answer changes STY-021 D3 for the compact view, by which every field shows on the page: (a) and (b) put them a press away, (c) takes them off it.                                                                                                                                              | (a) the item opens in place, any number at once (A and C, as drawn); (b) one open at a time; (c) they are not: switch to Cards, or open Edit (B, as drawn)                                                               |
| 8   | Where an item's actions are in compact.                                                                                                                                                                                                                                                                                                              | (a) Move and Edit on every item, "Undo changes" and Remove in the opened item (A and C, as drawn) or as an icon in the row (B, as drawn); (b) every action on every item; (c) one "…" menu on each item holding them all |
| 9   | Whether a phone has the compact view.                                                                                                                                                                                                                                                                                                                | (a) yes, as drawn; (b) a desktop and tablet only                                                                                                                                                                         |
| 10  | The board's order (C only): Now, Next and Later first, then the three sections. Reopens STY-021 D1, the six placements in the public site's order, and leaves the placement links in an order the page no longer has.                                                                                                                                | (a) horizons, then sections, as drawn, the links unchanged; (b) the same, the links reordered to match; (c) Recently delivered as a strip above the board, so the page's order holds                                     |
| 11  | Whether the view is kept, and for what.                                                                                                                                                                                                                                                                                                              | (a) on this device, for every roadmap, as the navigation's fold is (STY-054 D5), as drawn; (b) on this device, for each roadmap; (c) for the visit only                                                                  |
| 12  | What switching does to the page. The three parts of (a) can be chosen apart.                                                                                                                                                                                                                                                                         | (a) the placement the page was in stays at the top, focus stays on the switch, and items opened are closed, as drawn; (b) the page returns to its top                                                                    |
| 13  | What the switch is. The app has no control of this kind yet; the DHCW design system has a button group and tabs (`dhcw-design-system`, `src/components/actions/_button-group.scss` and `src/components/content/_tabs.scss`). The owner turned down tabs for a roadmap's placements (STY-053 D1); tabs here would switch the view, not the placement. | (a) a group of two buttons, the view in use pressed (D and F, as drawn), from the design system's button group; (b) tabs; (c) one button, "Compact view", pressed or not, at every width (D's phone, as drawn)           |
| 14  | The table's column headings (B only).                                                                                                                                                                                                                                                                                                                | (a) repeated in each placement, as drawn; (b) once, stuck under the header                                                                                                                                               |
| 15  | The words for the glossary. "Item card" is defined as "a roadmap item as shown on a roadmap", which compact makes untrue. C draws a horizon as a column, a word the glossary avoids for it, and "board" is one it avoids for a roadmap.                                                                                                              | (a) add "compact view", and say an item card is an item as the Cards view shows it; (b) leave the glossary until a story is written                                                                                      |
| 16  | Which view a Product Lead sees before they have chosen.                                                                                                                                                                                                                                                                                              | (a) Cards, on every device, as drawn; (b) compact on a phone, where the scroll is longest, and Cards on a desktop                                                                                                        |
| 17  | Whether a compact item's buttons keep their words.                                                                                                                                                                                                                                                                                                   | (a) words on a desktop's row (A) and icons on a phone, in the table and on the board, as drawn; (b) words everywhere, at the cost of a second line on a phone; (c) icons everywhere                                      |

## Not yet drawn

- Welsh: "Cards", "Compact" and "Compact view" in Cymraeg, and D's switch in a phone's
  stuck row beside a longer "Jump to".
- The dark theme, in which the pressed part of the switch must still read as pressed.
- A tablet (820px) and a laptop with the navigation open (1024px), where C's tiles are
  narrowest and A's row holds less of a title on one line.
- The states the items area already has, in compact: loading (a skeleton of rows, not
  of cards), a roadmap with no items (the same panel, with the switch still shown), a
  failed read and an expired session (the alert above, as today).
- The moment of publishing, when a new item's buttons, the order choices and "Undo
  order" wait (STY-046 D10, STY-050 S15), in any compact view.
- Remove in an opened new item (A and C); the frames open a changed item, with "Undo
  changes".
- The Move menu open in A and C. It is today's menu, which B's frame draws.
- A roadmap not published, whose header has "Publish roadmap", and whose foot bar says
  "changes to save".
- The moment the view changes, and the status message a screen reader hears.
- A placement of many items in C, where one column runs far below the others.
- The options no frame draws: 2 (b) and (c), 4 (d), 5 (b), 6 (c), 7 (b), 8 (b) and (c),
  10 (b) and (c), 11 (b) and (c), 12 (b), 13 (b), 14 (b), 16 (b), and 17 (b) and (c).
- For a screen reader: each of B's tables named by its placement's heading, E's "View"
  naming its two choices as a group, and whether a row's chevron needs both a name
  that changes and its expanded state.
- Short cards: A's row drawn as cards in today's grid. It saves less room than rows
  and reads across, which an order reads against.

## What does not change

- The Cards view, the card and its text budget; the item dialog; the Move menu's
  choices and what they do (ADR-014, STY-050).
- What is pending, how it is counted and published (ADR-012). A view changes no
  pending edit, and a pending edit shows in both.
- The header block, the placement navigation and the foot bar, except for where the
  switch goes.
- The data source and the public site: nothing new is read or written. The choice of
  view joins the theme, the language and the navigation's fold, width and closed
  families in this device's storage.
- English and Welsh for every string (ADR-008), and the app's tokens for every style
  (ADR-010).

## Related

- [Product Lead persona](../backlog/personas/product-lead.md)
- [STY-021: a roadmap's page shows its items](../backlog/_archive/EPC-004-roadmap-items/STY-021-roadmap-page-shows-items.md),
  whose D3 every compact view changes and whose D1 design C reopens
- [STY-053: jump between a roadmap's placements](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-053-jump-between-a-roadmaps-placements.md),
  whose D1 turned down tabs for the placements
- [Reorder items UX analysis](reorder-items-ux-analysis.md), which chose the Move menu
  over dragging
- [Page headers UX analysis](page-headers-ux-analysis.md), which set the row of
  controls the switch joins
- [Navigation sidebar UX analysis](navigation-sidebar-ux-analysis.md), whose roadmaps
  the navigation here lists
- [ADR-010: align the UI with the DHCW design system](../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md)
- [ADR-011: roadmap items from each roadmap's tab](../adr/ADR-011-roadmap-items-from-each-roadmaps-tab.md)
