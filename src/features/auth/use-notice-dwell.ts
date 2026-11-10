import { useEffect, useState, type FocusEvent } from "react"

/** How long a confirmation stays on screen before it clears itself. */
export const CONFIRMATION_DWELL_MS = 8_000

/**
 * Calls `onElapse` once `active` has held for {@link CONFIRMATION_DWELL_MS}, waiting while
 * the pointer is over the element or focus is inside it, and starting the full dwell again
 * once both leave: content is never removed from under someone reading or using it (WCAG
 * 2.2.1, 2.2.2). Spread the returned handlers on the element.
 */
export function useNoticeDwell(active: boolean, onElapse: () => void) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const waiting = active && !hovered && !focused

  useEffect(() => {
    if (!waiting) return
    const timer = setTimeout(onElapse, CONFIRMATION_DWELL_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [waiting, onElapse])

  return {
    onPointerEnter: () => {
      setHovered(true)
    },
    onPointerLeave: () => {
      setHovered(false)
    },
    onFocus: () => {
      setFocused(true)
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      // Moving between controls inside keeps it waiting.
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
    },
  }
}
