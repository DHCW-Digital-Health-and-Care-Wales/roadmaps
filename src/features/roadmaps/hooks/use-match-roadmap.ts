import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { Roadmap } from "@/domain/roadmap/roadmap"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapKeys } from "./roadmap-queries"

/**
 * Makes a roadmap's copied family and category cells match the lists (STY-030). The
 * write is never retried, and the roadmaps are read again once it settles, whatever its
 * result, so the page shows what the data source now holds. Pending edits are untouched.
 */
export function useMatchRoadmap() {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (loaded: Roadmap) => repository.matchRoadmapToLists(loaded),
    retry: false,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: roadmapKeys.list() }),
  })
}
