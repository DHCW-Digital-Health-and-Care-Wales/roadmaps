import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type {
  FieldConflict,
  RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapKeys } from "./roadmap-queries"

/** The roadmap and its items as read, showing the text a refusal found (STY-026). */
export interface CurrentText {
  roadmap: (roadmap: Roadmap, conflicts: readonly FieldConflict[]) => Roadmap
  items: (
    items: readonly RoadmapItem[],
    conflicts: readonly FieldConflict[],
  ) => RoadmapItem[]
}

/**
 * Publishes one roadmap's changes (ADR-012). A publish is never retried; whatever its
 * result, the roadmap and its items are read again before it settles, so the page shows
 * what the data source now holds. A refusal first shows the text it found by
 * `currentText`, so the page shows it even if that read fails.
 */
export function usePublishRoadmapChanges(
  roadmapId: string,
  { currentText }: { currentText?: CurrentText } = {},
) {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changes: RoadmapChanges) =>
      repository.publishRoadmapChanges(roadmapId, changes),
    retry: false,
    onSuccess: (outcome) => {
      if (outcome.status === "refused" && currentText) {
        showCurrentText(queryClient, roadmapId, outcome.conflicts, currentText)
      }
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

/**
 * Writes the text a refusal found into the roadmap and its items as read. The data keeps
 * its age, so it is read again as soon as it would have been.
 */
function showCurrentText(
  queryClient: QueryClient,
  roadmapId: string,
  conflicts: readonly FieldConflict[],
  currentText: CurrentText,
) {
  if (conflicts.some((conflict) => conflict.subject === "roadmap")) {
    patchQueryData<readonly Roadmap[]>(
      queryClient,
      roadmapKeys.list(),
      (roadmaps) =>
        roadmaps.map((each) =>
          each.id === roadmapId ? currentText.roadmap(each, conflicts) : each,
        ),
    )
  }
  if (conflicts.some((conflict) => conflict.subject === "item")) {
    patchQueryData<readonly RoadmapItem[]>(
      queryClient,
      roadmapKeys.items(roadmapId),
      (items) => currentText.items(items, conflicts),
    )
  }
}

function patchQueryData<T>(
  queryClient: QueryClient,
  key: QueryKey,
  patch: (data: T) => T,
) {
  const state = queryClient.getQueryState<T>(key)
  if (state?.data === undefined) return
  queryClient.setQueryData<T>(key, patch(state.data), {
    updatedAt: state.dataUpdatedAt,
  })
}
