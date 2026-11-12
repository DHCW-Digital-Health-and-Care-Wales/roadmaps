import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapKeys } from "./roadmap-queries"

/**
 * Publishes one roadmap's changes (ADR-012). A publish is never retried; whatever its
 * result, the roadmap and its items are read again before it settles, so the page shows
 * what the data source now holds.
 */
export function usePublishRoadmapChanges(roadmapId: string) {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changes: RoadmapChanges) =>
      repository.publishRoadmapChanges(roadmapId, changes),
    retry: false,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: roadmapKeys.list() }),
        queryClient.invalidateQueries({
          queryKey: roadmapKeys.items(roadmapId),
        }),
      ]),
  })
}
