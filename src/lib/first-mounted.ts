import type { RefObject } from "react"

/**
 * A ref to the element of the first of `refs` that holds one, read each time it is
 * read: for a control that may have gone, or been swapped for another, by the time the
 * ref is used, as a dialog's opener is as it closes.
 */
export function firstMounted(
  ...refs: readonly RefObject<HTMLElement | null>[]
): RefObject<HTMLElement | null> {
  return {
    get current() {
      return refs.find(({ current }) => current !== null)?.current ?? null
    },
  }
}
