import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import type { RoadmapGroup } from "../group-roadmaps"
import { readClosedFamilies, storeClosedFamilies } from "./closed-families"

/** `keys` but for `key`. */
function without(keys: ReadonlySet<string>, key: string): ReadonlySet<string> {
  return new Set([...keys].filter((other) => other !== key))
}

/** The navigation's closed families, and what the Product Lead does with them. */
export interface ClosedFamilies {
  /** The families closed, by `RoadmapGroup.key`. */
  closed: ReadonlySet<string>
  /** Every listed family is closed; false while there is none to list. */
  allClosed: boolean
  /** Closes the family if it is open, and opens it if it is closed. */
  toggleFamily: (key: string) => void
  /** Closes every family, or opens every one once all are closed. */
  toggleAll: () => void
}

/**
 * Which families the navigation shows closed (STY-062), remembered on this device (D4). A
 * family closed in one visit comes back closed; arriving on a roadmap's page, by any route,
 * opens its family once the roadmaps are read (S5, D5), and closing it afterwards, by its
 * button or "Close all", is the Product Lead's.
 */
export function useClosedFamilies(
  groups: readonly RoadmapGroup[] | null,
): ClosedFamilies {
  const currentId = useParams({
    strict: false,
    select: (params) => params.roadmapId,
  })
  const [closed, setClosed] = useState(readClosedFamilies)
  useEffect(() => {
    storeClosedFamilies(closed)
  }, [closed])

  const currentFamily = groups?.find((group) =>
    group.roadmaps.some((roadmap) => roadmap.id === currentId),
  )?.key
  // Starts from no page, so a page already open as the hook mounts counts as arrived.
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

  const keys = (groups ?? []).map((group) => group.key)
  const allClosed = keys.length > 0 && keys.every((key) => closed.has(key))
  return {
    closed,
    allClosed,
    toggleFamily: (key) => {
      setClosed((now) =>
        now.has(key) ? without(now, key) : new Set([...now, key]),
      )
    },
    toggleAll: () => {
      setClosed(allClosed ? new Set() : new Set(keys))
    },
  }
}
