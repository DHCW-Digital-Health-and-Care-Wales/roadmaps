import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import { useLanguage } from "@/i18n"

import { usePendingChanges } from "../editing/pending-changes-context"
import { groupRoadmaps } from "../group-roadmaps"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { narrowGroups, narrowToRoadmaps, searchKey } from "./narrow-roadmaps"
import {
  type NavigationFocusTarget,
  type NavigationSearch,
  NavigationSearchContext,
} from "./navigation-search-context"
import { useClosedFamilies } from "./use-closed-families"

/** How long typing pauses before a screen reader is told how many match (S6). */
export const TYPING_PAUSE_MS = 600

/**
 * Holds the navigation's search (STY-061), its closed families (STY-062) and whether the
 * count of unpublished changes narrows it (STY-063), above the shell, so the navigation
 * beside the page and in the drawer share them and they last between pages (D3). Its live
 * region says what the search finds once typing pauses (S6), that every roadmap shows once
 * it is cleared (S5), that every family closed or opened (STY-062 S3), and that only the
 * roadmaps with changes show, or every one again (STY-063 S1, S2); it is always in the
 * page, as the drawer the search may be in is not. Going to a roadmap opens its family
 * (STY-062 S5, D5).
 */
export function NavigationSearchProvider({
  children,
}: {
  children: ReactNode
}) {
  const { t } = useTranslation()
  const language = useLanguage()
  const { data: roadmaps } = useRoadmaps()
  const [query, setQuery] = useState("")
  // Counts the keys typed, so each restarts the pause; 0 once cleared, so nothing is said.
  const [typed, setTyped] = useState(0)
  // What was last said, and how many times, so the same words are said again.
  const [said, setSaid] = useState({ text: "", times: 0 })
  // Whether the count was pressed; `onlyChanged` says whether it narrows.
  const [pressed, setPressed] = useState(false)
  const focusOnShow = useRef<NavigationFocusTarget | null>(null)
  const { changes } = usePendingChanges()
  // Fewer than two roadmaps with changes leave nothing to narrow to (STY-063 S4).
  if (pressed && changes.size < 2) setPressed(false)

  const groups = useMemo(
    () => (roadmaps ? groupRoadmaps(roadmaps, language) : null),
    [roadmaps, language],
  )
  // The search narrows only while it shows: kept from before Disconnect, it waits for
  // the roadmaps to be read again (S11).
  const key = groups ? searchKey(query) : ""
  // The count narrows only while the roadmaps are read, as the search does. It empties
  // the search, so the two never narrow together.
  const onlyChanged = pressed && groups !== null
  const found = useMemo(() => {
    if (onlyChanged) {
      return narrowToRoadmaps(groups, new Set(changes.keys()))
    }
    return narrowGroups(groups ?? [], key, language)
  }, [groups, onlyChanged, changes, key, language])

  const families = useClosedFamilies(groups)

  const say = (text: string) => {
    setSaid((last) => ({ text, times: last.times + 1 }))
  }
  const sayFound = useEffectEvent(() => {
    // Spaces alone leave the count's narrowing as it was, and say nothing (STY-063 S3).
    if (key === "" && onlyChanged) return
    const count = found.reduce((sum, group) => sum + group.roadmaps.length, 0)
    say(
      key === ""
        ? t("roadmaps.navigation.search.showingAll")
        : t("roadmaps.navigation.search.found", { count }),
    )
  })
  useEffect(() => {
    if (typed === 0) return
    const timer = setTimeout(sayFound, TYPING_PAUSE_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [typed])

  const search: NavigationSearch = {
    groups,
    found,
    query,
    key,
    type: (text) => {
      setQuery(text)
      setTyped((count) => count + 1)
      // Typing lets the count go; spaces alone do not (STY-063 S3).
      if (searchKey(text) !== "") setPressed(false)
    },
    clear: () => {
      setQuery("")
      setTyped(0)
      if (!onlyChanged) say(t("roadmaps.navigation.search.showingAll"))
    },
    onlyChanged,
    showChanged: () => {
      setQuery("")
      setTyped(0)
      setPressed(true)
      say(t("roadmaps.navigation.showingChanged", { count: changes.size }))
    },
    showEveryRoadmap: () => {
      // Spaces typed just before leave no pending saying to repeat it.
      setTyped(0)
      setPressed(false)
      say(t("roadmaps.navigation.search.showingAll"))
    },
    closed: families.closed,
    allClosed: families.allClosed,
    toggleFamily: families.toggleFamily,
    toggleAllFamilies: () => {
      say(
        t(
          families.allClosed
            ? "roadmaps.navigation.families.allOpened"
            : "roadmaps.navigation.families.allClosed",
        ),
      )
      families.toggleAll()
    },
    requestFocus: (target) => {
      focusOnShow.current = target
    },
    takeFocusRequest: (target) => {
      const takes = focusOnShow.current === target
      if (takes) focusOnShow.current = null
      return takes
    },
  }

  return (
    <NavigationSearchContext value={search}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {/* Keyed by each saying, so words said again are new to a screen reader. */}
        <span key={said.times}>{said.text}</span>
      </div>
    </NavigationSearchContext>
  )
}
