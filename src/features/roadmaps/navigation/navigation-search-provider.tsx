import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import { useParams } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { useLanguage } from "@/i18n"

import { groupRoadmaps } from "../group-roadmaps"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { readClosedFamilies, storeClosedFamilies } from "./closed-families"
import { narrowGroups, searchKey } from "./narrow-roadmaps"
import {
  type NavigationSearch,
  NavigationSearchContext,
} from "./navigation-search-context"

/** `keys` but for `key`. */
function without(keys: ReadonlySet<string>, key: string): ReadonlySet<string> {
  return new Set([...keys].filter((other) => other !== key))
}

/** How long typing pauses before a screen reader is told how many match (S6). */
export const TYPING_PAUSE_MS = 600

/**
 * Holds the navigation's search (STY-061) and its closed families (STY-062), above the
 * shell, so the navigation beside the page and in the drawer share them and they last
 * between pages (D3). Its live region says what the search finds once typing pauses (S6),
 * that every roadmap shows once it is cleared (S5), and that every family closed or
 * opened (STY-062 S3); it is always in the page, as the drawer the search may be in is
 * not. Going to a roadmap opens its family (STY-062 S5, D5).
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
  const [closed, setClosed] = useState(readClosedFamilies)
  const focusOnShow = useRef(false)
  const currentId = useParams({
    strict: false,
    select: (params) => params.roadmapId,
  })

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

  useEffect(() => {
    storeClosedFamilies(closed)
  }, [closed])
  // Arriving on a roadmap's page, by any route, opens its family once the roadmaps are
  // read; closing it afterwards, by its button or "Close all", is the Product Lead's.
  const currentFamily = groups?.find((group) =>
    group.roadmaps.some((roadmap) => roadmap.id === currentId),
  )?.key
  // Starts from no page, so a page already open as the provider mounts counts as arrived.
  const [arrival, setArrival] = useState<{
    id: string | undefined
    family: string | undefined
  }>({ id: undefined, family: undefined })
  if (arrival.id !== currentId || arrival.family !== currentFamily) {
    setArrival({ id: currentId, family: currentFamily })
    if (currentFamily !== undefined && closed.has(currentFamily)) {
      setClosed(without(closed, currentFamily))
    }
  }

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
    closed,
    toggleFamily: (key) => {
      setClosed(
        closed.has(key) ? without(closed, key) : new Set([...closed, key]),
      )
    },
    toggleAllFamilies: () => {
      const keys = (groups ?? []).map((group) => group.key)
      const opens = keys.every((key) => closed.has(key))
      setClosed(opens ? new Set() : new Set(keys))
      say(
        opens
          ? t("roadmaps.navigation.families.allOpened")
          : t("roadmaps.navigation.families.allClosed"),
      )
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
