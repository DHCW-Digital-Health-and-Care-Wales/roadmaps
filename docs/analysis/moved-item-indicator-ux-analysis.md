# Seeing where a moved item went: four designs, and the one chosen

- **Date**: 2026-11-19
- **Question**: once a Product Lead moves an item, by "Up one", "Down one", "To the
  top", "To the bottom" or to another placement, how do they see at a glance which item
  moved and where it went, in both the Cards and the Compact view?
- **Scope**: a roadmap's page, after a choice in an item's Move menu
  ([STY-050](../backlog/_archive/EPC-011-adding-roadmaps-and-items/STY-050-reorder-items-in-a-placement.md),
  [STY-051](../backlog/_archive/EPC-011-adding-roadmaps-and-items/STY-051-a-moved-item-goes-last-in-its-new-placement.md),
  [STY-067](../backlog/_archive/EPC-016-a-roadmaps-items-at-a-glance/STY-067-a-compact-view-of-a-roadmaps-items.md)).
  No record asks this yet: the owner raised it on 2026-11-19 and asked to see
  alternatives beyond a highlight or a border. Drawn at `3cd6b8f`, re-audited at
  `e75d846` for the records. Only this analysis and one prototype page were added; no
  application code, and no correction to the skill's stylesheet or starter.
- **Outcome**: the owner chose design E, C then B, on 2026-11-19; see _Outcome_.
- **Prototypes**: [`moved-item-indicator-ux-analysis/moved-item-indicator-ux-prototypes.html`](moved-item-indicator-ux-analysis/moved-item-indicator-ux-prototypes.html),
  one self-contained page, open in a browser. Its shape is a **working component**:
  the question is what the page does after a move, over a few seconds, so each design
  is the roadmap's items area with every Move menu working. Switches set the theme, the
  screen, the view (Cards or Compact) and reduced motion for every design.
- **Sample**: on Thursday 19 November 2026 Sam Evans opens Outpatient Booking,
  published on Saturday 14 November, nothing pending. Now holds four items, the first
  two almost alike: "Text reminders before every appointment" and "Text reminders
  before every video appointment", whose descriptions both start "We send a text".
  Next holds two, Later one; the other three placements none. Later is below the
  screen's room, so a move there has to scroll.

## The problem today

After a move the page draws the item in its new place and puts focus on its Move
(STY-050 S2). A screen reader hears "Moved down. 2 of 4." from a status line. A
sighted Product Lead sees almost nothing:

- Focus shows only by keyboard. After a click or a tap, Move takes focus with no
  visible ring, so nothing marks the item.
- "Up one" and "Down one" swap two neighbours. When they read alike, as reminders for
  appointments and for video appointments do, the page looks unchanged; in the
  Compact view, two rows of one line each.
- A move to another placement puts the item last there (STY-051), often off the
  screen. Focus scrolls it into view with a jump, unmarked, and nothing on the
  placement it left says it went.
- The status line is for assistive technology only; nothing visible says what the
  move came to.

## Readers and where they are

A Product Lead with about 30 minutes a week (persona A1), mostly at a desk with a
mouse, sometimes on a phone by touch (A2). Moves are the persona's core job ("move
items between horizons") and the usual reorder is small: one place up, or to the top
(the reorder analysis). Nothing is public until published (A9, A10), so the risk is
not a wrong publish but doubt: did the move happen, and to which item?

## Journeys covered

| Group                          | Journeys                                                                                                                   | Stories                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1. See where a moved item went | move within a placement (up, down, top, bottom); move to another placement; two moves in a row; undo the order; both views | STY-050, STY-051, STY-067 |

Excluded: how a Product Lead chooses a move (settled: the Move menu, STY-050); the
publish dialog's "What changes", which already names an order change; the Welsh
interface; connecting to Google.

## What every design shares

- **The move itself is today's**: the Move menu, its choices, an item moved to another
  placement landing last, the "Order changed" tag and "Undo order" at the heading,
  the "Changed" tag on an item moved to another placement.
- **The moved item is scrolled into view** where the screen's room does not show it,
  smoothly unless motion is reduced, and focus goes to its Move, as today.
- **The status line says the move**, as today: "Moved down. 2 of 4." A move to another
  placement adds a line, "Moved to Later. 2 of 2.", where today nothing is said but the
  focused Move's name.
- **Display only**: an indicator changes no pending edit, nothing written and nothing
  the public site shows. It is gone after "Start again" (a reload, in the app).
- **The app's look**: cards and compact rows, tags, buttons and tokens as built.

## 1. See where a moved item went

| Design                        | Idea                                                                                                                                                                                                                                                                                        | Strengths                                                                                                                                                                                                                                     | Risks                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Glow that fades            | The moved item lights up in its new place, a tinted fill and a thick border, then fades to an ordinary card or row over about three seconds.                                                                                                                                                | The familiar "yellow fade". Small to build. Leaves the page as it was once seen.                                                                                                                                                              | Gone if the Product Lead looks away, as a meeting or a second screen makes likely. Says nothing in words, so the near-alike pair still has to be read. The app's reduced-motion rule cuts every animation to 0.01ms (`globals.css`), so a fade built as a CSS animation would vanish at once: it must be held by state, as the prototype holds it. |
| B. Marked until the next move | The moved item keeps a bold edge and a tag saying what happened, "Moved down · 2 of 4" or "Moved from Now · 2 of 2", until another item is moved or the order is undone.                                                                                                                    | Nothing fades: a glance back still finds it. The tag says, in words and position, what the menu's label said before the move, so the near-alike pair is told apart by more than colour. Works the same with reduced motion and in both views. | A tag beside "Changed" and "Order changed": one more thing on the page, and a third tone to keep apart (drawn green, since blue already means pending). The edge and tag stay after the Product Lead has seen them, until the next move. On a phone's compact row the tag adds a line.                                                             |
| C. Slide into place           | The moved item lifts, with a shadow, and glides from where it was to where it lands while the items it passes slide aside; then its outline fades. Reduced motion skips the travel.                                                                                                         | Shows from and to in one movement: the eye follows the item itself, so the near-alike swap is seen, not read. Across placements the page scrolls with it, so the Product Lead is carried to Later.                                            | Motion only: once it has played, nothing is left to read, as in A. Needs measured positions and transforms (FLIP); the prototype's hand-built version will not feel exactly as a build does. With reduced motion it is A without a fade. Two quick moves interrupt one travel with the next.                                                       |
| D. A trace where it was       | A dashed outline stays where the item was, "Was here: Text reminders before every appointment · Moved down · 2 of 4", and the item is outlined where it landed, until the next move. A move to another placement leaves the trace behind with "Show it", and the item a "Back to Now" link. | Shows both ends at once, and in words. Answers the other half of the question, "what happened to the one that was here?", and gives a way back from Later.                                                                                    | The trace takes room: in the card grid it is a strip across a row and breaks the grid's rows until the next move; in rows it adds a line. It reads as a placeholder that might be a gap in the order. Two new links to build and name. The most to explain.                                                                                        |

**Recommendation**: **C then B**. The item slides to its place, so the Product Lead
sees the move happen, then keeps B's edge and tag until the next move, so a glance back
still finds it and the tag says where it went in words. With reduced motion, B alone.
Add-on, only if moves to another placement prove disorienting: D's "Back to {placement}"
link in B's tag for those moves. A is not recommended: it fades before a look away ends
and says nothing in words. D on its own costs room and reads as a gap.

## Decisions needed

| Decision                                     | Options                                                                                                                       | Where it is asked |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| How a moved item is shown                    | C then B (recommended); A; B alone; C alone; D                                                                                | this analysis     |
| How long a mark lasts (B, D)                 | until the next move or "Undo order" (recommended, as drawn); until the next action of any kind; a set time                    | this analysis     |
| The mark's tone (B)                          | a tone of its own, drawn as success green (recommended); the info blue of "Changed"; no tag, the edge alone                   | this analysis     |
| What a move to another placement says        | "Moved to Later. 2 of 2." in the status line (recommended, a new string); today's silence but for the focused Move's name     | this analysis     |
| How the page scrolls to a moved item         | smoothly, a jump with reduced motion (recommended, as drawn); a jump, as today                                                | this analysis     |
| A way back after a move to another placement | none (recommended for now); D's "Back to {placement}" in the mark                                                             | this analysis     |
| A fade under reduced motion (A, C)           | held by state, then removed, with no fade (as drawn, and needed: `globals.css` cuts animations to 0.01ms); dropped altogether | this analysis     |

Reads and writes: every design reads only the page's items and pending edits, and
writes nothing; the mark is the page's own state. No design needs a read or write the
existing stories do not supply. No Accepted ADR is reopened: copy stays in `t()`
(ADR-008), colours stay tokens (ADR-010).

## Not yet drawn

- The Welsh copy for the mark's labels, full and short ("Moved up", "Moved from Now",
  "Placed", "Moved"), the new status lines ("Moved to Later. 2 of 2.", "Placed in Now.
  3 of 3.") and D's links: draft English here, settled with the copywriter skill in
  the build.
- From the grilling, after the page was drawn: "Undo order" travelling back
  (STY-073), since E's undo redraws at once; the "Placed" label (STY-071 D7), since
  the sample has no unplaced item; a move from the item dialog, which marks and does
  not travel (STY-071 D2, STY-072 D3); and a second move taking over a travel in
  flight (STY-072 D4), which the page's hand-built slide does not interrupt cleanly.
- The app's stuck header and pinned foot bar: the prototype's window scrolls within its
  own frame, so how the scroll keeps the item clear of them (the app's
  `scroll-padding`) is for the build.
- A compact row opened to its fields when it moves; a move held while the roadmap is
  being published; a co-lead's conflict on the same placement.
- A real phone by touch: the menu is worked by click and keyboard here.

## What does not change

The Move menu, its choices and where a moved item lands; the "Order changed" tag,
"Undo order", "Changed" and "Undo changes"; the pending edits a move makes and what
publishing writes; the public site.

## Related

- [Reordering a placement's items UX analysis](reorder-items-ux-analysis.md), which
  chose the Move menu and set focus after a move
- [Compact view UX analysis](roadmap-compact-view-ux-analysis.md), whose F3 found an
  order hard to follow among tall cards
- [STY-050](../backlog/_archive/EPC-011-adding-roadmaps-and-items/STY-050-reorder-items-in-a-placement.md),
  [STY-051](../backlog/_archive/EPC-011-adding-roadmaps-and-items/STY-051-a-moved-item-goes-last-in-its-new-placement.md),
  [STY-067](../backlog/_archive/EPC-016-a-roadmaps-items-at-a-glance/STY-067-a-compact-view-of-a-roadmaps-items.md)
- [Product Lead persona](../backlog/personas/product-lead.md), A1, A2, A9 and A10

## Outcome

On 2026-11-19 the owner chose **C then B**, drawn as design E on the prototype page:
C's slide, then B's mark. Two changes to B followed, and the page's B and E were
redrawn with them, so the table's B text above is B as first drawn: the mark gives no position ("Moved up", not "Moved up · 2 of
4"), and a compact row too narrow for the whole label shows its arrow and "Moved"
only. The grilling that followed answered every row of _Decisions needed_:

| Decision                                     | Answer                                                                                                              | Where it went            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| How a moved item is shown                    | C then B                                                                                                            | EPC-018                  |
| How long a mark lasts                        | until the next move, an undo that puts it back, publishing or leaving; kept while a re-read leaves the move pending | STY-071 D4, D9           |
| The mark's tone                              | success green                                                                                                       | STY-071 D10              |
| What a move to another placement says        | "Moved to Later. 2 of 2."                                                                                           | STY-071 D3               |
| How the page scrolls to a moved item         | smoothly; a jump with reduced motion                                                                                | STY-071 D8               |
| A way back after a move to another placement | none                                                                                                                | EPC-018 _Out of scope_   |
| A fade under reduced motion                  | no travel; the mark alone, which never depends on an animation                                                      | EPC-018 _Reduced motion_ |

The grilling added: every move marks, the item dialog's included (STY-071 D2); the
label sits under a card's title (D5) and shortens by the list's width (D6); "Placed"
for an unplaced item (D7); the slide built with React's `ViewTransition` (STY-072 D5)
and travelling the whole way across placements (D2), but not for a move from the
dialog (D3); "Undo order" travels back (STY-073); and the same motion for adding,
removing and discarding is an idea to grill (STY-074).

Review then corrected the page's order rules to the app's (STY-050, STY-051): an item
moved in and then reordered makes its placement's order pending, an item moved back to
its own placement takes its place as last read, and "Undo order" clears the mark only
on the item's own placement.
