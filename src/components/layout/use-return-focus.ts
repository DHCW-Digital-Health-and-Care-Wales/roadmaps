import { useEffect, useState } from "react"

/**
 * Gives focus back to exactly the element that had it when a dialog opened (often
 * `<main>`, which `AppShell` focuses), or to `<main>` once that element is gone, as when
 * a dialog beneath was closed. Base UI's own return focus moves on to the first tabbable
 * element instead, which would land on a page's first control. It relies on the dialog's
 * content mounting afresh for each opening.
 */
export function useReturnFocus() {
  // Read while rendering the opening dialog, before Base UI moves focus into it.
  const [previous] = useState(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )
  useEffect(
    () => () => {
      const target = previous?.isConnected
        ? previous
        : document.querySelector("main")
      target?.focus({ preventScroll: true })
    },
    [previous],
  )
}
