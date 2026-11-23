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
  const keepMineButtonsRef = useRef(new Map<string, HTMLButtonElement>())
  const decidedAtRef = useRef<number | null>(null)

  // Runs after the render the decision causes, once the conflict has closed.
  useLayoutEffect(() => {
    const index = decidedAtRef.current
    if (index === null) return
    decidedAtRef.current = null
    const next = open[Math.min(index, open.length - 1)]
    const target = next ? keepMineButtonsRef.current.get(next.key) : after()
    target?.focus()
  })

  return {
    keepMineRef: (key) => (button) => {
      if (button) keepMineButtonsRef.current.set(key, button)
      else keepMineButtonsRef.current.delete(key)
    },
    decided: (conflict) => {
      decidedAtRef.current = open.findIndex(
        (each) => each.conflict === conflict,
      )
    },
    firstOpen: () => {
      const [first] = open
      return (first && keepMineButtonsRef.current.get(first.key)) ?? null
    },
  }
}
