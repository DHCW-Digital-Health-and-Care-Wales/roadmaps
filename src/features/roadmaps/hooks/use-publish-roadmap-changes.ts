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

/**
 * The roadmap and its items as read, showing the text a refusal found (STY-026), in each
 * field no read during the publish changed from `since`, as read when it began; a field
 * one did change keeps that read's text, as it may be newer (DEF-003).
 */
export interface CurrentText {
  roadmap: (
    roadmap: Roadmap,
    conflicts: readonly FieldConflict[],
    since: Roadmap | undefined,
  ) => Roadmap
  items: (
    items: readonly RoadmapItem[],
    conflicts: readonly FieldConflict[],
    since: readonly RoadmapItem[] | undefined,
  ) => RoadmapItem[]
}

/** The roadmap list and the roadmap's items as cached when a publish began. */
interface ReadBefore {
  roadmaps: readonly Roadmap[] | undefined
  items: readonly RoadmapItem[] | undefined
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
    onMutate: (): ReadBefore => ({
      roadmaps: queryClient.getQueryData(roadmapKeys.list()),
      items: queryClient.getQueryData(roadmapKeys.items(roadmapId)),
    }),
    onSuccess: (outcome, _changes, before) => {
      if (outcome.status === "refused" && currentText) {
        showCurrentText(queryClient, {
          roadmapId,
          conflicts: outcome.conflicts,
          currentText,
          before,
        })
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
 * Writes the text a refusal found into the roadmap and its items as last read. The data
 * keeps its age, so it is read again as soon as it would have been.
 */
function showCurrentText(
  queryClient: QueryClient,
  {
    roadmapId,
    conflicts,
    currentText,
    before,
  }: {
    roadmapId: string
    conflicts: readonly FieldConflict[]
    currentText: CurrentText
    before: ReadBefore
  },
) {
  if (conflicts.some((conflict) => conflict.subject === "roadmap")) {
    const since = before.roadmaps?.find((each) => each.id === roadmapId)
    patchQueryData<readonly Roadmap[]>(
      queryClient,
      roadmapKeys.list(),
      (roadmaps) =>
        roadmaps.map((each) =>
          each.id === roadmapId
            ? currentText.roadmap(each, conflicts, since)
            : each,
        ),
    )
  }
  if (conflicts.some((conflict) => conflict.subject === "item")) {
    patchQueryData<readonly RoadmapItem[]>(
      queryClient,
      roadmapKeys.items(roadmapId),
      (items) => currentText.items(items, conflicts, before.items),
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
