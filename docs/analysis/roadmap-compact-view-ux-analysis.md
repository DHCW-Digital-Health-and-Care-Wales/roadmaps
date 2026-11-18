# A compact view of a roadmap's page: rows, a table or a board

- **Date**: 2026-11-18
- **Question**: a roadmap's page shows every item as a full card. What should a compact
  view of it show, how is the rest of an item reached from it, and where does a Product
  Lead switch between the two? And, from the owner's later request: how does a card
  keep its height when a field runs long?
- **Scope**: the items area of a roadmap's page (`RoadmapItems`, `EditableItemCard`,
  `RoadmapItemCard`, `CardGrid`) and the top of the page (`RoadmapHeader`), on a desktop
  and a phone. It comes from the owner's request of 2026-11-18 to explore the idea. The
  owner answered the same day: the answers are in _Outcome_, and in the stories of
  [EPC-016](../backlog/EPC-016-a-roadmaps-items-at-a-glance/README.md).
  Base `2e073ee`: the frames were first drawn at `b6aaea0`, and redrawn after STY-065
  changed the top of the page. Only documents and one prototype page were added: no
  application code. The skill asks for its stylesheet to be corrected where the app
  has moved on; as in the two analyses before, that was not done here, and
  [CHO-022](../backlog/chores/CHO-022-the-prototype-stylesheet-draws-todays-shell.md)
  records what it lacks. The page carries the shell's styles itself.
- **Prototypes**: one self-contained page of **frames**,
  [`roadmap-compact-view-ux-prototypes.html`](roadmap-compact-view-ux-analysis/roadmap-compact-view-ux-prototypes.html):
  static mock-ups at a desktop (1280px wide, the navigation open) and a phone (375px),
  each labelled with its moment and where keyboard focus is. The shape is frames
  because the question is what the page shows and where things go, not how a control
  feels under the hand. The page holds today's cards and the three designs the owner
  chose: A, D and G. The frames of the designs set aside (B, C, E and F) and of A as
  first drawn were removed; the tables below describe them.
- **Sample world**: invented. On Wednesday 18 November 2026 Sam Evans, a Product Lead,
  opens Appointment booking, which she co-leads with Rhian Morgan. It is published, in
  the Citizen Services family, its status label "Beta", last updated 4 November 2026.
  It has 18 items: 1 with no recognised horizon (written "Soon"), Recently delivered 1,
  Now 5, Next 4, Later 4, Delivered this year 3 and Not doing 0. It has 3 unpublished
  changes: the first Now item's description is edited, the last Next item is new, and
  Later's order is changed. Planted: a long title; on the third Now item a description
  of about 85 words; on the fourth an expected outcome of about 50 words and six lines
  of details; "patient" beside "Patients"; a new item with only a title; four items
  with no phase; an unplaced item and an empty placement. The navigation holds the
  navigation analysis's 14 roadmaps, every family closed but Citizen Services.

## Readers and where they are

A Product Lead with about 30 minutes a week for roadmaps (persona A1), mostly at a
desk, with a phone for the small jobs: check, move, fix a typo (A2). They want each
roadmap "as Now, Next and Later at a glance" and to move an item between horizons
without retyping it (persona, _What they need_). Today a card shows every field an
item has, so a roadmap of 18 items is a long scroll, and an item moved "Up one" in its
placement's order moves among cards too tall to see two of at once on a phone.

Measured on the frames, which draw the app's sizes with a system font, so each figure
is approximate:

| View                    | Desktop: screens to scroll | Desktop: items in view at Now | Phone: screens to scroll | Phone: items in view at Now |
| ----------------------- | -------------------------- | ----------------------------- | ------------------------ | --------------------------- |
| Cards                   | about 8                    | 2 whole                       | about 12½                | 1 whole                     |
| A. Rows, as chosen      | about 2½                   | 9                             | about 3¾                 | 5                           |
| A. Rows, as first drawn | about 2½                   | 8                             | about 4                  | 5                           |
| B. Table                | about 3½                   | 5                             | about 5                  | 3                           |
| C. Board                | about 2½                   | 11                            | about 4½                 | 4                           |

The last three rows were measured on frames since removed. A screen is the room
between the stuck header and the pinned foot bar: about 600px of an 800px desktop
window and of an 812px phone.

## Journeys covered

| Group                                        | Journeys                                                                                                                                                                                                | Stories                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1. Read and work a roadmap in a compact view | see the whole roadmap; see what is pending; read the rest of an item; move an item to another placement or within its order; edit one; undo a change or remove a new item; scroll with the header stuck | STY-067; builds on STY-021, STY-031, STY-050      |
| 2. Switch between cards and compact          | find the switch; switch; keep the choice                                                                                                                                                                | STY-067; builds on STY-065                        |
| 3. Keep a long card in hand                  | read a card, or an opened row, whose text runs long; read the rest; put it away again                                                                                                                   | STY-066, and STY-067 for a row; builds on STY-021 |

Journey 1 relies on the persona's A1 (short visits), A2 (desktop first, a phone for
small jobs) and, for the pending marks, A9 and A10 (nothing is public until
published). Journey 2 relies on A1: a choice made once should not be made again each
visit. Journey 3 relies on A11: the card's size is the budget for an item's text, and
no limit is enforced yet.

Excluded:

- the roadmap list, whose roadmap cards are another layout; the request names the
  Roadmap screen (decision 2);
- filtering or sorting a roadmap's items, by tag or organisation, which no record asks
  for; the order is the Product Lead's to set (STY-050);
- dragging an item, which the reorder analysis set aside for the Move menu;
- the item dialog, "Product details", publishing and its dialogs, which no design
  changes;
- connecting to Google, and the Welsh interface (_Not yet drawn_).

## What every design shares

- **Cards stay, and are what everyone sees first** (decision 16). Compact is a second
  view of the same page, chosen by the Product Lead. Journey 3 alone changes the card.
- **The page around the items is today's**: the top of the page and its stuck form
  (STY-059, STY-060, STY-065), the placement links and "Jump to" with their counts and
  pending dots (STY-053), the pinned foot bar with its count, Publish and Discard
  (STY-052), and the navigation.
- **The same groups under the same headings**: the unplaced items first, flagged, with
  the horizon as written (STY-021 D2, D4, D9); then the six placements, each a level-2
  heading that the placement links jump to, an empty one saying "No items" (STY-021
  D1). An item's title stays a level-3 heading.
- **The same pending marks**: Changed or New on the item, "Order changed" with "Undo
  order" beside the placement's heading (STY-025, STY-046, STY-050 S3).
- **The same actions, with the same names**: Move opens today's menu, its position
  first ("In Now: 2 of 5"), then the other placements (design A draws it open). Edit
  opens the item dialog. "Undo changes" and Remove do what they do on a card. Focus
  goes where it goes today: back to Move on the item in its new place, back to Edit as
  the dialog closes. While the roadmap is being published they wait as they do on a
  card, unavailable though focusable: a new item's Edit, Move and Remove (STY-046 D10),
  the choices of position in every Move menu, and "Undo order" (STY-050 S15).
- **A phone has the compact view too** (decision 9), since the phone's scroll is the
  longest.
- **Kept on this device, across sessions**, as the navigation's fold is (STY-054 D5),
  and its width and closed families since: one choice for every roadmap, not sent anywhere (decision
  11). Nothing new is read from or written to the data source, and the public site
  sees no change.
- **An item's fields are no longer all on the page, whole.** STY-021 D3 puts every
  field there. In compact they are a press away (decision 7), and a field past three
  lines is cut wherever it shows (journey 3).
- The app's look, from its own tokens (ADR-010). Copy is draft English in the
  product's voice, reusing the catalogue's strings. The new words are "Cards",
  "Compact", "View" and "Compact view" for the switch; "Show the rest of…" and "Hide
  the rest of…" before an item's title, on a row's chevron; and "Show more" and "Show
  less" under a cut field (decision 27 keeps the two pairs).

## 1. Read and work a roadmap in a compact view

Sam opens Appointment booking to check the plan before a meeting and to move one
item. As cards, Now alone is over three screens on a phone. Each design is the page
once Compact is chosen. The first round drew A, B and C. The owner chose A and changed
what its row shows, twice; the last row of the table is the row as chosen, which the
page draws in five moments: the whole page, the screen once scrolled to Now, two rows
opened, two opened rows whose fields run long, and a Move menu open.

| Design                  | Idea                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Strengths                                                                                                                                                                                                                                                                                                               | Risks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today                   | Each item a card with every field it has, two or three across on a desktop and one on a phone.                                                                                                                                                                                                                                                                                                                                                                                                                                  | Everything is read without a press. The card's size is the budget for an item's text (persona A11).                                                                                                                                                                                                                     | About 8 screens on a desktop and 12½ on a phone for 18 items. The shape of the plan is not seen at once, and a move within a placement's order is hard to follow.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| A. Rows, as first drawn | Each item a row: a chevron, its title, its pending tag, its phase, then Move and Edit. The chevron opens the row in place to show the item's other fields, and "Undo changes" or Remove; any number of rows can be open. A long title wrapped, on a desktop and a phone alike.                                                                                                                                                                                                                                                  | The densest view on a phone, and as short a scroll as C on a desktop, with a placement's whole order in view as an item moves. The page keeps its order, headings and links, so nothing else is relearnt. The rest of an item is one press away, where it is. The smallest build: today's fields and controls in a row. | Tags and organisations are out of sight until a row is opened, so "patient" beside "Patients" is not seen. A Product Lead who stays in compact no longer sees the card whose size is the text's budget. Icon buttons on a phone lose their words. "Undo changes" is a press further away than on a card. One tab stop more per item than a card has: the chevron.                                                                                                                                                                                                                                                         |
| B. Table                | Each placement a table: Title, Phase, Tags and Organisations in columns, then icons for Move and Edit, and for "Undo changes" or Remove on a pending item. Nothing opens: the description, expected outcome and details are read in Cards or in Edit. On a phone there is no room for columns, so each row stacks its cells under its title.                                                                                                                                                                                    | Phase, tags and organisations line up down the page, so drift between items shows: the planted "patient" is in view. Every action is in the row.                                                                                                                                                                        | The least dense of the three, and on a phone it is short cards more than a table. The fields a public reader reads first, the description and the expected outcome, cannot be read here. Column headings repeat under each of six headings. Icon buttons everywhere. A long title wraps in a narrow column. Empty cells for the many items with no phase or organisation.                                                                                                                                                                                                                                                 |
| C. Board                | Now, Next and Later side by side, then the three sections side by side, each item a small tile: title, phase, pending tag, and icons for Move and Edit. A tile opens in place into the card it is. On a phone the six placements run one under another, in the board's order.                                                                                                                                                                                                                                                   | On a desktop the three horizons are read at once, the picture a Product Lead and a public reader have of a roadmap. A tile opens in its column to the card's fields.                                                                                                                                                    | The gain is a desktop's alone: a phone gets tiles in a list, less dense than rows. On a desktop a tile is about 300px wide beside a card's 460px, so an opened tile wraps more than the card does, and it lays its phase and "Undo changes" out differently. It reorders the page (departs from STY-021 D1), while the placement links keep the public site's order. Beside the open navigation at 1024px a tile is about 215px wide. Columns of unequal length leave gaps. Move's choices do not match where a tile would go by eye. The largest build, and it draws a horizon as the column the glossary says to avoid. |
| **A. Rows, as chosen**  | A as first drawn, with the owner's row. On a desktop each item is one line that never wraps: the chevron, the title, then the start of the description in what room is left, cut with an ellipsis, the pending tag, and Move and Edit, always in view. No phase. On a phone the title takes the lines it needs, with no description; the pending tag, or an unplaced item's flag, sits under it; Move and Edit are icons at the row's end. An opened row shows every other field, a long one cut as a card cuts it (journey 3). | On a desktop every row is one height, so a placement reads as a list and its order is plain, and the description's first words say what an item is without opening it. On a phone every title is read whole. Move and Edit never leave the row's end on either.                                                         | On a desktop the longest titles leave a description a few words, and a title longer than the line would itself be cut. On a phone a row is two to four lines, so the roadmap is about 3¾ screens, not 2½, and no description shows there (decision 18). The phase is out of sight with the tags and organisations.                                                                                                                                                                                                                                                                                                        |

**Recommendation**: **A. Rows**, which the owner chose. It saves the most room on a
phone and as much scroll as any design on a desktop, where C alone shows more at once,
and it brings the least that is new: the page keeps its shape and every action keeps
its name. B's columns are worth a second look if Product Leads ask to check tags
across a roadmap, and C's board if they ask to see the horizons side by side on a
desktop; either could later be a third choice of the same switch.

## 2. Switch between cards and compact

The switch is the one new control on the page. Since STY-065 the top of the page is
three rows: the title with Add an item and More at its end; one line of facts ending
in "Product details"; then the jump control. From 768px the jump control is the row of
placement links. Narrower, More is "…" on the title's row, and Add an item and "Jump
to" share the row under the facts. Once stuck, a phone's row is Add an item, More and
"Jump to", which gives way by cutting the placement's name (STY-060 D5). The owner
chose D, which the page draws at the top, in Cards, and once stuck, in Compact.

| Design                     | Idea                                                                                                                                                                                                                                                                                                                                                              | Strengths                                                                                                                                 | Risks                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D. With the page's actions | From 768px, a two-part switch, Cards and Compact, on the title's row before Add an item and More, the view in use pressed; Add an item and More stay where they are. Narrower, one button with the rows icon, named "Compact view" and pressed while compact, after "Jump to". The same at the top and once stuck, so the view changes from anywhere in the page. | Seen on arrival, one press, and it says which view is in use. It stays as the page scrolls, where a long page is what prompts the switch. | The switch takes about 220px of the title's row, so a long title wraps sooner: at 768px it leaves a title about 220px. On a phone "Jump to" is about 50px narrower, at the top and once stuck, so longer placement names are cut sooner. The control differs by width, a switch of two words and one icon, as the jump control does (STY-065 S6, S7). An icon alone is less clear than the words. Welsh labels are longer (_Not yet drawn_). |
| E. In More                 | More gains a "View" group under Edit product details, Refresh and Unpublish roadmap: Cards and Compact, the one in use ticked.                                                                                                                                                                                                                                    | No new control on the page, so the top STY-065 quietened stays as it is at every width. It suits a choice made once and kept.             | Two presses, and nothing on the page says another view exists or which is in use. More holds actions today; a view setting is another kind of thing in it.                                                                                                                                                                                                                                                                                   |
| F. Above the items         | A line between the jump control and the first heading: "View", then the two-part switch, with its words at every width.                                                                                                                                                                                                                                           | The switch sits by what it changes, and a phone has room for the words.                                                                   | It scrolls away with the top of the page, so switching from the middle of a long roadmap means going back up. It adds a fourth row of about 50px to a top that STY-065 cut to three.                                                                                                                                                                                                                                                         |

**Recommendation**: **D. With the page's actions**, which the owner chose. A view that
is hard to find is not used, and the long page is where the switch is wanted. If the
title's row proves too tight for a long title, or the phone's stuck row in Welsh, E is
the fallback.

## 3. Keep a long card in hand

No limit is set on what a Product Lead writes (persona A11), and a card shows every
field whole (STY-021 D3), so one long description makes its card as tall as it likes.
On a desktop the cards of a row stretch to the tallest; on a phone the one card is
about a screen. The owner asked for one design, so it is set beside
today's card with the same text: a description of about 85 words, seven lines of a
desktop's card; an expected outcome of about 50 words, five lines; and six lines of
details.

| Design                                | Idea                                                                                                                                                                                                                                                                                                                                                                                                                                          | Strengths                                                                                                                                                                                                                            | Risks                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today                                 | A card shows each field whole, however long.                                                                                                                                                                                                                                                                                                                                                                                                  | Nothing is hidden. A card that has outgrown its budget looks it, which is the cue to shorten the text.                                                                                                                               | One item's text sets the height of its card and of the card beside it. A long roadmap gets longer, and the cards stop reading as a set.                                                                                                                                                                                                                                               |
| G. A long field cut after three lines | Any field that runs past three lines shows three, ending in an ellipsis where the cut falls within its text: a description, an expected outcome, or a list of details, whose lines are counted as drawn, nested and wrapped ones too. "Show more" under it shows the field whole in place, and then reads "Show less". A field of three lines or fewer is as today, with no control. An opened row of the compact view follows the same rule. | A card's height stays near its neighbours', whatever was written. The first three lines are in view, and the rest is one press away, where it is. Short items, which are most, do not change. One rule for a card and an opened row. | The cue that an item says too much is quieter: the card no longer shows its excess, though the public site still will (decision 25). One more control for each long field of a card. Three lines hold fewer words on a phone than on a desktop. A list cut at three lines can stop part way through a nested group; the frames draw only short details, so none is cut within itself. |

**Recommendation**: **G**, as the owner asked for it. Decision 25 matters most of what
is left: the cut tidies the editor's page and does nothing for the public reader, who
still meets the whole text.

## Decisions needed

Each row is a choice between designs, a rule the frames chose where the request was
silent, or an earlier decision a design reopens. _Outcome_ says which the owner has
answered, which the agent took to draw the frames, and which are still open.

| #   | Decision                                                                                                                                                                                                                                                                                                                                             | Options                                                                                                                                                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Where the work goes.                                                                                                                                                                                                                                                                                                                                 | (a) one story; (b) an epic; (c) not now                                                                                                                                                                                                            |
| 2   | Which screen "the Roadmap screen" is. The frames read it as a roadmap's page, whose items are cards.                                                                                                                                                                                                                                                 | (a) a roadmap's page, as drawn; (b) the roadmap list, whose roadmaps are cards; (c) both                                                                                                                                                           |
| 3   | The compact view (journey 1).                                                                                                                                                                                                                                                                                                                        | (a) A, rows, as drawn; (b) B, a table; (c) C, a board; (d) more than one, as further choices of the switch                                                                                                                                         |
| 4   | Where the switch is (journey 2).                                                                                                                                                                                                                                                                                                                     | (a) D, with the page's actions, as drawn; (b) E, in More; (c) F, above the items; (d) D from 768px and E narrower                                                                                                                                  |
| 5   | What the two views are called.                                                                                                                                                                                                                                                                                                                       | (a) Cards and Compact, as drawn; (b) Cards and the layout's own name, List                                                                                                                                                                         |
| 6   | What a compact item shows without a press.                                                                                                                                                                                                                                                                                                           | (a) title, phase and pending tag; (b) those with tags and organisations; (c) the title and pending tag alone; (d) the title, then the start of the description, cut with an ellipsis, on a desktop's line that never wraps, as drawn               |
| 7   | How an item's other fields are read in compact. Every answer changes STY-021 D3 for the compact view, by which every field shows on the page.                                                                                                                                                                                                        | (a) the item opens in place, any number at once, as drawn; (b) one open at a time; (c) they are not: switch to Cards, or open Edit                                                                                                                 |
| 8   | Where an item's actions are in compact.                                                                                                                                                                                                                                                                                                              | (a) Move and Edit on every item, "Undo changes" and Remove in the opened item, as drawn; (b) every action on every item; (c) one "…" menu on each item holding them all                                                                            |
| 9   | Whether a phone has the compact view.                                                                                                                                                                                                                                                                                                                | (a) yes, as drawn; (b) a desktop and tablet only                                                                                                                                                                                                   |
| 10  | The board's order (C only). Fell away with the board.                                                                                                                                                                                                                                                                                                | —                                                                                                                                                                                                                                                  |
| 11  | Whether the view is kept, and for what.                                                                                                                                                                                                                                                                                                              | (a) on this device, across sessions, for every roadmap, as the navigation's fold is (STY-054 D5), as drawn; (b) on this device, for each roadmap; (c) for the visit only                                                                           |
| 12  | What switching does to the page. The three parts of (a) can be chosen apart.                                                                                                                                                                                                                                                                         | (a) the placement the page was in stays at the top, focus stays on the switch, and items opened are closed; (b) the page returns to its top                                                                                                        |
| 13  | What the switch is. The app has no control of this kind yet; the DHCW design system has a button group and tabs (`dhcw-design-system`, `src/components/actions/_button-group.scss` and `src/components/content/_tabs.scss`). The owner turned down tabs for a roadmap's placements (STY-053 D1); tabs here would switch the view, not the placement. | (a) a group of two buttons, the view in use pressed, from the design system's button group, and narrower than 768px one button, "Compact view", pressed or not: D, as drawn; (b) tabs; (c) the one button at every width                           |
| 14  | The table's column headings (B only). Fell away with the table.                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                                                  |
| 15  | The words for the glossary. "Item card" is defined as "a roadmap item as shown on a roadmap", which compact makes untrue.                                                                                                                                                                                                                            | (a) add "compact view", and say an item card is an item as the Cards view shows it, in the story that builds it; (b) in the glossary now, before the story                                                                                         |
| 16  | Which view a Product Lead sees before they have chosen.                                                                                                                                                                                                                                                                                              | (a) Cards, on every device, as drawn; (b) compact on a phone, where the scroll is longest, and Cards on a desktop                                                                                                                                  |
| 17  | Whether a compact item's buttons keep their words.                                                                                                                                                                                                                                                                                                   | (a) Move and Edit in words on a desktop's row and as icons on a phone; "Undo changes" and Remove in words in an opened item, as drawn; (b) words everywhere, at the cost of a line on a phone; (c) icons everywhere                                |
| 18  | A phone's row. A desktop's line never wraps; a phone's has room for about 20 characters of a title.                                                                                                                                                                                                                                                  | (a) one line on a phone too, the title cut; (b) on a phone the title takes the lines it needs, with no description, as drawn; (c) as (b), with one line of the description under the title, cut with an ellipsis                                   |
| 19  | The pending tag in a row.                                                                                                                                                                                                                                                                                                                            | (a) "Changed" or "New" in words: in the line on a desktop, under the title on a phone, as drawn; (b) a dot, as the placement links mark a pending change; (c) its icon alone on a phone, in the line                                               |
| 20  | An unplaced item's flag ("Horizon “Soon” isn't recognised") in a row.                                                                                                                                                                                                                                                                                | (a) in the line on a desktop, where it takes the description's room, and under the title on a phone, as drawn; (b) in the opened row alone, the group's heading saying what is wrong                                                               |
| 21  | What the start of the description is, on a desktop's line.                                                                                                                                                                                                                                                                                           | (a) its text from its first word, cut where the line ends, as drawn; (b) its first sentence or line break at most                                                                                                                                  |
| 22  | Which fields are cut when long.                                                                                                                                                                                                                                                                                                                      | (a) the description and the expected outcome; (b) those and the details; (c) any field under a label that passes three lines, which in the sample world is the description, the expected outcome and the details, as drawn; the title is never cut |
| 23  | Where the rest is read.                                                                                                                                                                                                                                                                                                                              | (a) in place: "Show more" opens the field and becomes "Show less", focus staying on it, as drawn; (b) in the item dialog, by Edit; (c) "Show more" opens every long field of the item at once                                                      |
| 24  | Whether a field shown whole stays so.                                                                                                                                                                                                                                                                                                                | (a) until "Show less", or until the page is left or its view changed; (b) kept on this device                                                                                                                                                      |
| 25  | What tells a Product Lead an item says too much (persona A11), now a card hides it.                                                                                                                                                                                                                                                                  | (a) nothing more: "Show more" is the sign; (b) the item dialog says when a field passes what a card shows; (c) a limit on what can be written, which is a later record                                                                             |
| 26  | Whether a row opened in the compact view cuts long fields as a card does.                                                                                                                                                                                                                                                                            | (a) yes, the same rule wherever a field shows, as drawn; (b) no: opening a row is already the press to read it whole                                                                                                                               |
| 27  | The words for opening. A row's chevron is named "Show the rest of" then the title; a cut field's link reads "Show more". One page then has two wordings for showing what is hidden.                                                                                                                                                                  | (a) the two pairs, as drawn: a row opens to other fields, a link to more of one; (b) "Show more" and "Show less" for both, each named for what it opens                                                                                            |

## Outcome

On 2026-11-18, over seven replies, the owner chose the designs, answered the rows
below and asked for the work to be written into the backlog. It is
[EPC-016](../backlog/EPC-016-a-roadmaps-items-at-a-glance/README.md):
[STY-066](../backlog/_archive/EPC-016-a-roadmaps-items-at-a-glance/STY-066-a-long-field-is-cut-after-three-lines.md)
for journey 3, and
[STY-067](../backlog/EPC-016-a-roadmaps-items-at-a-glance/STY-067-a-compact-view-of-a-roadmaps-items.md)
for journeys 1 and 2. No row is left open.

**The owner's answers**

| Decision  | Answer                                                                                                                                                                                                                           | Record         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1         | Write these into the backlog. The agent made it an epic of two stories, since the cut stands without the compact view.                                                                                                           | EPC-016        |
| 3         | (a): design A, rows.                                                                                                                                                                                                             | STY-067 D1     |
| 6         | (d), the owner's own: a row shows only the title and, where there is room, the start of the description, cut with "…". It does not wrap or grow, so Move and Edit are always in view. Decision 18 then changed this for a phone. | STY-067 D2     |
| 18        | (b): on a phone a row shows as many lines as its title needs, after seeing a phone's titles cut on one line; and, asked, no line of the description under it.                                                                    | STY-067 D3, D8 |
| 11        | The view chosen is remembered for the user across sessions. The app does not know who is using it (the glossary's Connection), so that is (a), kept on this device.                                                              | STY-067 D4     |
| 4         | (a): design D, the switch with the page's actions.                                                                                                                                                                               | STY-067 D5     |
| 5         | (a): Cards and Compact.                                                                                                                                                                                                          | STY-067 D7     |
| Journey 3 | The card view stops a long text field after three lines, with "…" and a "Show more" link, or similar, that expands the rest. That is design G, and decision 23 (a).                                                              | STY-066 D1     |
| 22        | The cut applies to any text field that can be long, the description, the expected outcome and the details among them. The agent drew that as (c): by length, whatever the field.                                                 | STY-066 D2, D5 |
| 26        | (a): the cut applies in the compact view too, when a row is opened.                                                                                                                                                              | STY-067 D6     |
| 25        | (a): nothing more says an item is too long; "Show more" is the sign.                                                                                                                                                             | STY-066 D3     |
| 27        | (a): the two wordings stay, "Show the rest of" on a row and "Show more" on a field.                                                                                                                                              | STY-066 D4     |

**What the agent took, to draw the frames**: option (a) of decisions 7, 8, 9, 12, 13,
16, 17, 19, 20, 21 and 24, and 15 (a). Choosing A, D and G did not answer these; they
are the parts the owner has seen drawn and not spoken to. STY-067 D9 to D13 and STY-066
D5 to D8 record them, for the owner to reopen. Decision 2 (a), a roadmap's page, is the
stories' scope. From the owner's row the agent also took that a row shows no phase;
from the cut, that a list of details is cut by the lines it takes as drawn, and
that a control's name changes as it opens.

Rows 10 and 14 fell away with the board and the table.

## Not yet drawn

- Welsh: "Cards", "Compact", "Compact view", "Show more" and "Show less" in Cymraeg,
  D's switch on the title's row beside a long title, and in a phone's stuck row beside
  a longer "Jump to".
- The dark theme, in which the pressed part of the switch must still read as pressed.
- A tablet (820px) and a laptop with the navigation open (1024px), where D's switch
  leaves the title least room and A's line holds less of a description.
- The states the items area already has, in compact: loading (a skeleton of rows, not
  of cards), a roadmap with no items (the same panel, with the switch still shown), a
  failed read and an expired session (the alert above, as today).
- The moment of publishing, when a new item's buttons, the order choices and "Undo
  order" wait (STY-046 D10, STY-050 S15).
- Remove in an opened new item; the frames open a changed item, with "Undo changes".
- A roadmap not published, whose top has the Not published notice with "Publish
  roadmap" (STY-065 S4), and whose foot bar says "changes to save".
- "Product details" opened, above a compact list.
- The moment the view changes, and what a screen reader hears then and as "Show more"
  is pressed.
- A long list of tags or organisations, cut as decision 22 (c) has it.
- Any option not marked "as drawn", and the rules a still frame cannot show: decisions
  11, 12 and 24. Earlier rounds drew 3 (b) and (c), 4 (b) and (c), 6 (a) and (b), 7
  (c), 18 (a), 19 (c) and 22 (a), in frames since removed or replaced.

## What does not change

- A card with no long field, and its text budget; the item dialog; the Move menu's
  choices and what they do (ADR-014, STY-050).
- What a Product Lead may write, and what the public site shows: cutting a field is
  the editor's display only.
- What is pending, how it is counted and published (ADR-012). A view changes no
  pending edit, and a pending edit shows in both.
- The top of the page, the placement navigation and the foot bar, except for where the
  switch goes.
- The data source and the public site: nothing new is read or written. The choice of
  view joins the theme, the language and the navigation's fold, width and closed
  families in this device's storage.
- English and Welsh for every string (ADR-008), and the app's tokens for every style
  (ADR-010).

## Related

- [EPC-016: a roadmap's items at a glance](../backlog/EPC-016-a-roadmaps-items-at-a-glance/README.md),
  which holds the stories
- [Product Lead persona](../backlog/personas/product-lead.md)
- [STY-021: a roadmap's page shows its items](../backlog/_archive/EPC-004-roadmap-items/STY-021-roadmap-page-shows-items.md),
  whose S2 and D3 the compact view and the cut change
- [STY-065: the top of a roadmap's page reads at a glance](../backlog/_archive/EPC-015-a-quieter-roadmap-page-top/STY-065-a-roadmaps-page-top-reads-at-a-glance.md),
  which set the top of the page the switch joins
- [STY-053: jump between a roadmap's placements](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-053-jump-between-a-roadmaps-placements.md),
  whose D1 turned down tabs for the placements
- [Reorder items UX analysis](reorder-items-ux-analysis.md), which chose the Move menu
  over dragging
- [Page headers UX analysis](page-headers-ux-analysis.md), the top's earlier design
- [Navigation sidebar UX analysis](navigation-sidebar-ux-analysis.md), whose roadmaps
  the navigation here lists
- [ADR-010: align the UI with the DHCW design system](../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md)
- [ADR-011: roadmap items from each roadmap's tab](../adr/ADR-011-roadmap-items-from-each-roadmaps-tab.md)
