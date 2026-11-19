# EPC-018 delivery notes

- `revealMoved` (`editing/reveal-moved.ts`) scrolls the moved item into view two
  frames after focus reaches it, and again for a second as the document's style
  changes (the first change's foot bar measures itself late, and a menu's or dialog's
  scroll lock lets go late). A slide that moves the item meanwhile must leave that
  scroll the last word, or end before it.
- Focus on Move after a move is sent with `preventScroll`; a test that checks where
  the page ends after a move polls (`expect.poll`) rather than reading it once.
- The mark clears once its item shows anywhere but where the move left it (STY-071
  D17): a slide that draws the item somewhere on its way must not change the page's
  items or the store, or it clears the mark it ends on.
