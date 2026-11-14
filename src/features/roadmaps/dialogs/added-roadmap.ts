import { useLocation, useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"

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
 * Whether this page was opened by adding its roadmap and has yet to say so, and
 * `dismiss`, which forgets it, so the page says it once however it is come back to.
 */
export function useAddedRoadmap(): { added: boolean; dismiss: () => void } {
  const added = useLocation({
    select: ({ state }) => state.roadmapAdded === true,
  })
  const navigate = useNavigate()
  // Stable, as a notice's dwell starts again when it changes.
  const dismiss = useCallback(() => {
    void navigate({
      to: ".",
      replace: true,
      resetScroll: false,
      state: (state) => ({ ...state, roadmapAdded: false }),
    })
  }, [navigate])
  return { added, dismiss }
}
