import { createContext, use } from "react"

import type { RoadmapGroup } from "../group-roadmaps"

/**
 * The navigation's search and what it lists (STY-061), and the families it keeps closed
 * (STY-062), held above the routes' pages and
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
  /**
   * `query` as the search compares it (`searchKey`); blank narrows nothing, as it is
   * while the roadmaps are unread (`groups` is `null`) and the search does not show.
   */
  key: string
  /**
   * Typing in the search: sets `query`, and restarts the pause after which a screen
   * reader is told how many match (S6).
   */
  type: (query: string) => void
  /** Empties the search, telling a screen reader every roadmap shows (S5). */
  clear: () => void
  /** Asks for focus in the search as it next shows: the rail's spyglass opens it (S9). */
  requestFocus: () => void
  /** The families closed, by `RoadmapGroup.key`; remembered on this device (STY-062 D4). */
  closed: ReadonlySet<string>
  /** Closes the family if it is open, and opens it if it is closed (STY-062 S1). */
  toggleFamily: (key: string) => void
  /**
   * Closes every family, or opens every one once all are closed (STY-062 S3), telling a
   * screen reader which.
   */
  toggleAllFamilies: () => void
  /**
   * Takes the request for focus, if there is one, clearing it: only the search box,
   * once, as it shows.
   */
  takeFocusRequest: () => boolean
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
