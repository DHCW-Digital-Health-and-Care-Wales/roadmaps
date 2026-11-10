import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useAuth } from "@/features/auth/use-auth"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapListQueryOptions } from "./roadmap-queries"

/**
 * The list query's options, fetching only while connected. Cached data stays readable
 * while the session is expired; disconnecting removes it.
 */
function useRoadmapListOptions() {
  const repository = useRoadmapRepository()
  const connected = useAuth().state.status === "connected"
  return { ...roadmapListQueryOptions(repository), enabled: connected }
}

/** The user's roadmaps. `refetch()` backs the Refresh and Retry buttons. */
export function useRoadmaps() {
  return useQuery(useRoadmapListOptions())
}

/**
 * One roadmap, derived from the list (ADR-0002: no single-roadmap repository call yet).
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
