# EPC-018 delivery notes

- The mark is `useMovedMark` (`editing/moved-mark.ts`), held by `RoadmapView`: every
  move calls its `moved`, so a slide keyed on a move starts from `mark`, a new object
  per move, rather than from the Move menu or the dialog.
- `revealMoved` scrolls the moved item into view two frames after focus reaches it,
  and again for a second as the document's style changes (the first change's foot bar
  measures itself late, and a menu's or dialog's scroll lock lets go late). A slide
  that moves the item meanwhile must leave that scroll the last word, or end before it.
- Focus on Move after a move is sent with `preventScroll`; a test that checks where
  the page ends after a move polls (`expect.poll`) rather than reading it once.
- A spec in Welsh connects with `connect(page, "Cysylltu â Google")`, and picks an item
  with no Welsh title ("Minimal card"): one with a Welsh title shows it in place of the
  English.
