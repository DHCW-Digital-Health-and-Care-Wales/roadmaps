/** How long a reveal follows the pinned bars as they settle after a move. */
const SETTLING_MS = 1000

/**
 * Scrolls the page until `item`, just moved, is in the room between the pinned header
 * and foot bar, which `scroll-padding` keeps clear: gliding, or in one jump where the
 * system asks for reduced motion (STY-071 S4, D8). The bars may still be settling: a
 * menu or dialog closing lets go of the page's scroll a moment later, and a foot bar the
 * move brought, or a header sticking as the page glides, sets its height on the document
 * (`usePinnedInset`) a few frames on. So the page is scrolled two frames on, and again
 * as the document's style changes, for a second.
 */
export function revealMoved(item: Element) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const reveal = () => {
    item.scrollIntoView({
      block: "nearest",
      behavior: reduced ? "instant" : "smooth",
    })
  }
  const settling = new MutationObserver(reveal)
  settling.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
  })
  setTimeout(() => {
    settling.disconnect()
  }, SETTLING_MS)
  requestAnimationFrame(() => {
    requestAnimationFrame(reveal)
  })
}
