import { createContext, use } from "react"

import type { RoadmapGroup } from "../group-roadmaps"

/**
 * The navigation's search and what it lists (STY-061), held above the routes' pages and
 * shared by the navigation beside the page and in the drawer, so it lasts while the
 * Product Lead moves between pages and as the drawer closes, not past a reload (D3).
 */
export interface NavigationSearch {
  /** Every group of roadmaps, as the list orders them; `null` until they are read. */
  groups: readonly RoadmapGroup[] | null
  /** The groups the search narrows to: `groups` itself while the search is blank. */
  found: readonly RoadmapGroup[]
  /** What the search holds, as typed. */
  query: string
  /** `query` as the search compares it (`searchKey`); blank narrows nothing. */
  key: string
  /** Typing in the search: once typing pauses, a screen reader is told how many match. */
  type: (query: string) => void
  /** Empties the search, telling a screen reader every roadmap shows (S5). */
  clear: () => void
  /** Moves focus to the search as it next shows: the rail's spyglass opens it (S9). */
  focusWhenShown: () => void
  /** Whether a search box now showing takes focus, asked once as it shows. */
  takesFocus: () => boolean
}

/** Provided by `NavigationSearchProvider`; read it through `useNavigationSearch`. */
export const NavigationSearchContext = createContext<NavigationSearch | null>(
  null,
)

/** The navigation's search and what it lists. */
export function useNavigationSearch(): NavigationSearch {
  const search = use(NavigationSearchContext)
  if (!search) {
    throw new Error(
      "useNavigationSearch must be used within a NavigationSearchProvider",
    )
  }
  return search
}
