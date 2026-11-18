const ATTRIBUTE = "data-left-out"

/**
 * Marks a part the slim header leaves out, visually hidden but still reachable. Reached
 * while stuck from after it (Shift+Tab) or by a screen reader, it scrolls the page back
 * to the header's place, so the header lets go and shows it there; tabbed into from
 * before it, focus goes on past it (`leftOutFocus`, `StickyHeader`).
 */
export const LEFT_OUT = { [ATTRIBUTE]: "" } as const

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

/**
 * Where focus that has just landed on `target`, from `from`, goes while the header in
 * `container` is stuck: `release`, so the header lets go, when `target` is in a left-out
 * part and focus came from after it or from nowhere; the control past the part when it
 * came from before it, as Tab from the strip's menu button does; nowhere else, `null`.
 */
export function leftOutFocus(
  target: Element,
  from: Element | null,
  container: Element,
): HTMLElement | "release" | null {
  const part = target.closest(`[${ATTRIBUTE}]`)
  if (!part) return null
  const fromBefore =
    from !== null &&
    Boolean(
      part.compareDocumentPosition(from) & Node.DOCUMENT_POSITION_PRECEDING,
    )
  return fromBefore ? (controlAfter(part, container) ?? null) : "release"
}
