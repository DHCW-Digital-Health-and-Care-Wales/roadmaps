/**
 * Where the desktop navigation's fold is remembered (STY-054 D5): a convenience for this
 * device only, so a choice that can't be read or kept just leaves the navigation open.
 */
export const NAVIGATION_STORAGE_KEY = "roadmaps.navigation"

const FOLDED = "folded"

/** Whether the Product Lead last folded the navigation on this device. */
export function readNavigationFolded(): boolean {
  try {
    return localStorage.getItem(NAVIGATION_STORAGE_KEY) === FOLDED
  } catch {
    return false
  }
}

/** Remembers the fold (non-sensitive). Failing to store it is not an error. */
export function storeNavigationFolded(folded: boolean): void {
  try {
    if (folded) localStorage.setItem(NAVIGATION_STORAGE_KEY, FOLDED)
    else localStorage.removeItem(NAVIGATION_STORAGE_KEY)
  } catch {
    // The fold still applies for this visit.
  }
}
