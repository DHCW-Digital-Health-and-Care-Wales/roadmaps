import { useLocation, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"

import type { Roadmap } from "@/domain/roadmap/roadmap"

declare module "@tanstack/react-router" {
  interface HistoryState {
    /** The page was opened by adding its roadmap, and has yet to say so (STY-041 S5). */
    roadmapAdded?: boolean
  }
}

/**
 * Opens the page of a roadmap just added, telling it so. The word travels with the
 * history entry, in memory with the page it is for: never in the URL.
 */
export function useOpenAddedRoadmap(): (roadmap: Roadmap) => void {
  const navigate = useNavigate()
  return (roadmap) => {
    void navigate({
      to: "/roadmaps/$roadmapId",
      params: { roadmapId: roadmap.id },
      state: { roadmapAdded: true },
    })
  }
}

/**
 * Whether `roadmap`'s page says it was just added, and `dismiss`, which ends that. The
 * page opened by adding it says so once: the history entry forgets the word as soon as
 * the page has taken it, so going back to the page, or reloading it, says nothing; and
 * publishing the roadmap ends a notice that says it isn't published.
 */
export function useAddedRoadmapNotice(roadmap: Roadmap): {
  shown: boolean
  dismiss: () => void
} {
  const told = useLocation({
    select: ({ state }) => state.roadmapAdded === true,
  })
  const navigate = useNavigate()
  const [shown, setShown] = useState(told)
  if (shown && roadmap.published) setShown(false)
  useEffect(() => {
    if (!told) return
    void navigate({
      to: ".",
      replace: true,
      resetScroll: false,
      state: (state) => ({ ...state, roadmapAdded: false }),
    })
  }, [told, navigate])
  // Stable, as a notice's dwell starts again when it changes.
  const dismiss = useCallback(() => {
    setShown(false)
  }, [])
  return { shown, dismiss }
}
