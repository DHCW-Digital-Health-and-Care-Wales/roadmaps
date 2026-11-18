import { useState } from "react"

/** How a roadmap's page shows its items: each a card, or each a row (STY-067). */
export type ItemsView = "cards" | "compact"

/**
 * Where the view a Product Lead chose is remembered (STY-067 D4): one choice for every
 * roadmap, a convenience for this device only, beside the navigation's fold. What can't
 * be read or kept leaves the page in Cards, and is never an error.
 */
export const ITEMS_VIEW_STORAGE_KEY = "roadmaps.items.view"

const COMPACT = "compact"

/** The view last chosen on this device; Cards where nothing readable is kept (S11). */
export function readItemsView(): ItemsView {
  try {
    return localStorage.getItem(ITEMS_VIEW_STORAGE_KEY) === COMPACT
      ? "compact"
      : "cards"
  } catch {
    return "cards"
  }
}

/** Remembers the view (non-sensitive). Failing to keep it is not an error. */
export function storeItemsView(view: ItemsView): void {
  try {
    if (view === "compact")
      localStorage.setItem(ITEMS_VIEW_STORAGE_KEY, COMPACT)
    else localStorage.removeItem(ITEMS_VIEW_STORAGE_KEY)
  } catch {
    // The view still applies for this visit.
  }
}

/**
 * The view a roadmap's page shows its items in, read as the page opens, and a choice of
 * another, which is kept for the next page and the next visit.
 */
export function useItemsView(): [ItemsView, (view: ItemsView) => void] {
  const [view, setView] = useState(readItemsView)
  const choose = (next: ItemsView) => {
    setView(next)
    storeItemsView(next)
  }
  return [view, choose]
}
