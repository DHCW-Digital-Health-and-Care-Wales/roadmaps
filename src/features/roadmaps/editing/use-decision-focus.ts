import { useLayoutEffect, useRef } from "react"

import type { Conflict } from "@/domain/roadmap/roadmap-changes"

import type { OpenConflict } from "./conflicts"

export interface DecisionFocus {
  /** The ref for the Keep mine button of the conflict keyed `key`. */
  readonly keepMineRef: (
    key: string,
  ) => (button: HTMLButtonElement | null) => void
  /** Call as `conflict` is decided, before the decision is stored. */
  readonly decided: (conflict: Conflict) => void
  /** The Keep mine button of the first conflict still open, where a review starts. */
  readonly firstOpen: () => HTMLButtonElement | null
}

/**
 * Moves focus as the review's conflicts are decided: to the Keep mine of the next one
 * still open, in the decided one's place, then, once none is, to `after()`.
 */
export function useDecisionFocus(
  open: readonly OpenConflict[],
  after: () => HTMLElement | null,
): DecisionFocus {
  const keepMineButtons = useRef(new Map<string, HTMLButtonElement>())
  const decidedAt = useRef<number | null>(null)

  // Runs after the render the decision causes, once the conflict has closed.
  useLayoutEffect(() => {
    const index = decidedAt.current
    if (index === null) return
    decidedAt.current = null
    const next = open[Math.min(index, open.length - 1)]
    const target = next ? keepMineButtons.current.get(next.key) : after()
    target?.focus()
  })

  return {
    keepMineRef: (key) => (button) => {
      if (button) keepMineButtons.current.set(key, button)
      else keepMineButtons.current.delete(key)
    },
    decided: (conflict) => {
      decidedAt.current = open.findIndex((each) => each.conflict === conflict)
    },
    firstOpen: () => {
      const [first] = open
      return (first && keepMineButtons.current.get(first.key)) ?? null
    },
  }
}
