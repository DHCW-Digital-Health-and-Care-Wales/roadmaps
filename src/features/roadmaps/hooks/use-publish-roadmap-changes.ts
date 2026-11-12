import { useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  FieldConflict,
  RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapKeys } from "./roadmap-queries"

/**
 * Publishes one roadmap's changes (ADR-012). A publish is never retried; whatever its
 * result, the roadmap and its items are read again before it settles, so the page shows
 * what the data source now holds. `onRefused` runs before that read, with what the
 * refusal found.
 */
export function usePublishRoadmapChanges(
  roadmapId: string,
  {
    onRefused,
  }: { onRefused?: (conflicts: readonly FieldConflict[]) => void } = {},
) {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changes: RoadmapChanges) =>
      repository.publishRoadmapChanges(roadmapId, changes),
    retry: false,
    onSuccess: (outcome) => {
      if (outcome.status === "refused") onRefused?.(outcome.conflicts)
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: roadmapKeys.list() }),
        queryClient.invalidateQueries({
          queryKey: roadmapKeys.items(roadmapId),
        }),
      ]),
  })
}
