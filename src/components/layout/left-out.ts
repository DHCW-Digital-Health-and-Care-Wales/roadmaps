/**
 * Marks a part the slim header leaves out, visually hidden but still reachable. Reached
 * while stuck from after it (Shift+Tab) or by a screen reader, it scrolls the page back
 * to the header's place, so the header lets go and shows it there; tabbed into from
 * before it, focus goes on past it (`StickyHeader`).
 */
export const LEFT_OUT = { "data-left-out": "" } as const

/** Finds a part marked `LEFT_OUT`. */
export const LEFT_OUT_SELECTOR = "[data-left-out]"

const FOCUSABLE =
  "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"

/** The first control in `container` after the left-out `part`, outside it. */
export function controlAfter(
  part: Element,
  container: Element,
): HTMLElement | undefined {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].find(
    (control) =>
      !part.contains(control) &&
      Boolean(
        part.compareDocumentPosition(control) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
  )
}
