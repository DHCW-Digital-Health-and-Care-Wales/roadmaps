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

/** Where the dragged width is remembered, beside the fold (STY-064 D3). */
export const NAVIGATION_WIDTH_STORAGE_KEY = "roadmaps.navigation.width"

/** The open navigation's narrowest, widest and starting width, in px (STY-064 D2). */
export const MIN_NAVIGATION_WIDTH = 208
export const MAX_NAVIGATION_WIDTH = 400
export const DEFAULT_NAVIGATION_WIDTH = 256

/** `width` rounded to a whole px, within the navigation's limits. */
export function clampNavigationWidth(width: number): number {
  return Math.min(
    MAX_NAVIGATION_WIDTH,
    Math.max(MIN_NAVIGATION_WIDTH, Math.round(width)),
  )
}

/** The width last kept on this device; the starting width where nothing readable is. */
export function readNavigationWidth(): number {
  try {
    const stored = localStorage.getItem(NAVIGATION_WIDTH_STORAGE_KEY)
    if (stored === null || stored.trim() === "") return DEFAULT_NAVIGATION_WIDTH
    const width = Number(stored)
    return Number.isFinite(width)
      ? clampNavigationWidth(width)
      : DEFAULT_NAVIGATION_WIDTH
  } catch {
    return DEFAULT_NAVIGATION_WIDTH
  }
}

/** Remembers the width (non-sensitive). Failing to keep it is not an error. */
export function storeNavigationWidth(width: number): void {
  try {
    if (width === DEFAULT_NAVIGATION_WIDTH) {
      localStorage.removeItem(NAVIGATION_WIDTH_STORAGE_KEY)
    } else {
      localStorage.setItem(NAVIGATION_WIDTH_STORAGE_KEY, String(width))
    }
  } catch {
    // The width still applies for this visit.
  }
}
