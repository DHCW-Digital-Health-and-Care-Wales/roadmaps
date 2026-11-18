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

import { groupRoadmaps } from "../group-roadmaps"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { narrowGroups, searchKey } from "./narrow-roadmaps"
import {
  type NavigationSearch,
  NavigationSearchContext,
} from "./navigation-search-context"

/** How long typing pauses before a screen reader is told how many match (S6). */
export const TYPING_PAUSE_MS = 600

/**
 * Holds the navigation's search (STY-061), above the shell, so the navigation beside the
 * page and in the drawer share it and it lasts between pages (D3). Its live region says
 * what the search finds once typing pauses (S6), and that every roadmap shows once it is
 * cleared (S5); it is always in the page, as the drawer the search may be in is not.
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
  const focusOnShow = useRef(false)

  const groups = useMemo(
    () => (roadmaps ? groupRoadmaps(roadmaps, language) : null),
    [roadmaps, language],
  )
  // The search narrows only while it shows: kept from before Disconnect, it waits for
  // the roadmaps to be read again (S11).
  const key = groups ? searchKey(query) : ""
  const found = useMemo(
    () => narrowGroups(groups ?? [], key, language),
    [groups, key, language],
  )

  const say = (text: string) => {
    setSaid((last) => ({ text, times: last.times + 1 }))
  }
  const sayFound = useEffectEvent(() => {
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
    },
    clear: () => {
      setQuery("")
      setTyped(0)
      say(t("roadmaps.navigation.search.showingAll"))
    },
    requestFocus: () => {
      focusOnShow.current = true
    },
    takeFocusRequest: () => {
      const takes = focusOnShow.current
      focusOnShow.current = false
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
