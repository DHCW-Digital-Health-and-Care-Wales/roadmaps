# EPC-018 delivery notes

- `revealMoved` (`editing/reveal-moved.ts`) scrolls the moved item into view two
  frames after focus reaches it, and again for a second as the document's style
  changes (the first change's foot bar measures itself late, and a menu's or dialog's
  scroll lock lets go late), until its `stop` runs as the item loses the mark. A slide
  that moves the item meanwhile must leave that scroll the last word, or end before it.
- Tie each reveal's or slide's cancel to the move that started it: the previous move's
  cleanup runs after the next move has begun, and stopping whatever runs then cancels
  the next move's (`EditableItem`'s `revealing` ref shows the guard).
- Focus on Move after a move is sent with `preventScroll`; a test that checks where
  the page ends after a move polls (`expect.poll`) rather than reading it once.
- The mark is checked again whenever its item shows somewhere new (STY-071 D17): a
  slide must not change the page's items or the store on its way, or the mark it ends
  on is judged against that in-between state.
- A slide is `travel` (`editing/item-travel.ts`; STY-072's Contract for dependents).
  Only an item with an ID travels, and the example spreadsheet's items get theirs only
  when first published: an E2E test of a slide calls `publishOnce` first, or nothing
  travels.
- A view transition's captured elements take no press, so the travel is drawn only
  between the pinned bars, and a press there skips it (STY-072 D7). Playwright reports
  `<html>` intercepting a click there: press the page first, or drive the keyboard.
