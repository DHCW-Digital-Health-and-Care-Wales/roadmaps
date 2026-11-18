import { createContext, use } from "react"

import type { RoadmapGroup } from "../group-roadmaps"

/** What takes focus as the navigation next shows it: opening it from the rail asks for one. */
export type NavigationFocusTarget = "search" | "count"

/**
 * The navigation's search and what it lists (STY-061), the families it keeps closed
 * (STY-062) and whether the count of unpublished changes narrows it (STY-063), held above
 * the routes' pages and shared by the navigation beside the page and in the drawer, so it
 * lasts while the Product Lead moves between pages and as the drawer closes. The search and the narrowing by the count do not last past a reload (D3,
 * STY-063 D4); the closed families do.
 */
export interface NavigationSearch {
  /** Every group of roadmaps, as the list orders them; `null` until they are read. */
  groups: readonly RoadmapGroup[] | null
  /**
   * The groups the navigation narrows to, by the search or the count: `groups` itself
   * while neither narrows it.
   */
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
  /**
   * Empties the search, telling a screen reader every roadmap shows (S5), unless the
   * count narrows the list, which a blank search leaves as it is (STY-063 S3).
   */
  clear: () => void
  /**
   * The count of unpublished changes shows only the roadmaps with changes (STY-063): while
   * two or more have them and the roadmaps are read. Typing in the search, or fewer than
   * two left with changes, ends it.
   */
  onlyChanged: boolean
  /** Shows only the roadmaps with changes, empties the search and says so (STY-063 S1). */
  showChanged: () => void
  /** Shows every roadmap again, telling a screen reader (STY-063 S2). */
  showEveryRoadmap: () => void
  /**
   * Asks for focus in `target` as it next shows: the rail's spyglass opens the search
   * (STY-061 S9) and its count opens the count (STY-063 S7).
   */
  requestFocus: (target: NavigationFocusTarget) => void
  /** The families closed, by `RoadmapGroup.key`; remembered on this device (STY-062 D4). */
  closed: ReadonlySet<string>
  /** Every family is closed: the button over them opens them rather than closes. */
  allClosed: boolean
  /** Closes the family if it is open, and opens it if it is closed (STY-062 S1). */
  toggleFamily: (key: string) => void
  /**
   * Closes every family, or opens every one once all are closed (STY-062 S3), telling a
   * screen reader which.
   */
  toggleAllFamilies: () => void
  /**
   * Takes the request for focus in `target`, if there is one, clearing it: only that
   * control, once, as it shows.
   */
  takeFocusRequest: (target: NavigationFocusTarget) => boolean
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
