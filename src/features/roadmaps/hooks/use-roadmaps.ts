import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

import type { Roadmap } from "@/domain/roadmap/roadmap"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { useEnabledWhileConnected } from "./enabled-while-connected"
import { roadmapListQueryOptions } from "./roadmap-queries"

/** The list query's options, fetching only while connected. */
function useRoadmapListOptions() {
  return useEnabledWhileConnected(
    roadmapListQueryOptions(useRoadmapRepository()),
  )
}

/** The user's roadmaps. `refetch()` backs the Refresh and Retry buttons. */
export function useRoadmaps() {
  return useQuery(useRoadmapListOptions())
}

/**
 * One roadmap, derived from the list (ADR-002: no single-roadmap repository call yet).
 * `data` is `null` once the list has loaded without a roadmap with this id.
 */
export function useRoadmap(roadmapId: string) {
  const select = useCallback(
    (roadmaps: Roadmap[]) =>
      roadmaps.find((roadmap) => roadmap.id === roadmapId) ?? null,
    [roadmapId],
  )
  return useQuery({ ...useRoadmapListOptions(), select })
}
