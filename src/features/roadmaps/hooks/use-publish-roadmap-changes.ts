import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query"

import { useRef } from "react"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type {
  FieldConflict,
  RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapKeys } from "./roadmap-queries"
import type { RoadmapLists } from "./use-roadmap-lists"

/**
 * The roadmap and its items as read, showing the text a refusal found (STY-026), in each
 * field no read during the publish changed from `since`, as read when it began; a field
 * one did change keeps that read's text, as it may be newer (DEF-003). With nothing
 * cached when it began, `since` is `undefined` and the read is shown as it is. A family
 * or category is named from `lists`, as cached.
 */
export interface CurrentText {
  roadmap: (
    roadmap: Roadmap,
    conflicts: readonly FieldConflict[],
    since: Roadmap | undefined,
    lists: RoadmapLists,
  ) => Roadmap
  items: (
    items: readonly RoadmapItem[],
    conflicts: readonly FieldConflict[],
    since: readonly RoadmapItem[] | undefined,
  ) => RoadmapItem[]
}

/** The roadmap list and the roadmap's items as cached when a publish began. */
export interface ReadBefore {
  roadmaps: readonly Roadmap[] | undefined
  items: readonly RoadmapItem[] | undefined
}

/**
 * Publishes one roadmap's changes (ADR-012). A publish is never retried; whatever its
 * result, the roadmap and its items are read again before it settles, so the page shows
 * what the data source now holds, and `readBack` then tells which of those reads
 * succeeded. A refusal first shows the text it found by
 * `currentText`, so the page shows it even if that read fails.
 */
export function usePublishRoadmapChanges(
  roadmapId: string,
  { currentText }: { currentText?: CurrentText } = {},
) {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  const { readAgain, readBack } = useReadAgain(roadmapId)
  const mutation = useMutation({
    mutationFn: (changes: RoadmapChanges) =>
      repository.publishRoadmapChanges(roadmapId, changes),
    retry: false,
    onMutate: () => readBefore(queryClient, roadmapId),
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
    onSettled: readAgain,
  })
  return { ...mutation, readBack }
}

/** Whether the reads after a publish read the roadmap list, and the roadmap's items. */
export interface ReadBack {
  roadmaps: boolean
  items: boolean
}

/** Everything read back: what a publish that has not settled tells. */
const ALL_READ: ReadBack = { roadmaps: true, items: true }

/**
 * Which of the reads after a write that answered at `since` succeeded (DEF-009). A read
 * a page shows counts only if it answered since then: one that failed, or was cancelled
 * as the session ended, leaves what was cached before. A read no page shows is not
 * made, and counts unless the last one failed, as the next read of it, once a page
 * does, holds what was published.
 */
function readBackSince(
  queryClient: QueryClient,
  roadmapId: string,
  since: number,
): ReadBack {
  const succeeded = (key: QueryKey) => {
    const query = queryClient
      .getQueryCache()
      .find({ queryKey: key, exact: true })
    if (!query) return true
    if (query.getObserversCount() === 0) return query.state.status !== "error"
    return (
      query.state.status === "success" && query.state.dataUpdatedAt >= since
    )
  }
  return {
    roadmaps: succeeded(roadmapKeys.list()),
    items: succeeded(roadmapKeys.items(roadmapId)),
  }
}

/**
 * Reads the roadmap list and the roadmap's items again once a write has answered, and
 * tells, by the `readBack` it returns, which of those reads succeeded, for the publish
 * that last settled.
 */
export function useReadAgain(roadmapId: string) {
  const queryClient = useQueryClient()
  const read = useRef<ReadBack>(ALL_READ)
  return {
    readAgain: async () => {
      const answeredAt = Date.now()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roadmapKeys.list() }),
        queryClient.invalidateQueries({
          queryKey: roadmapKeys.items(roadmapId),
        }),
      ])
      read.current = readBackSince(queryClient, roadmapId, answeredAt)
    },
    readBack: () => read.current,
  }
}

/** The roadmap list and the roadmap's items as cached now, before a publish. */
export function readBefore(
  queryClient: QueryClient,
  roadmapId: string,
): ReadBefore {
  return {
    roadmaps: queryClient.getQueryData(roadmapKeys.list()),
    items: queryClient.getQueryData(roadmapKeys.items(roadmapId)),
  }
}

/**
 * Writes the text a refusal found into the roadmap and its items as last read. The data
 * keeps its age, so it is read again as soon as it would have been.
 */
export function showCurrentText(
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
    const lists: RoadmapLists = {
      families: queryClient.getQueryData(roadmapKeys.families()),
      categories: queryClient.getQueryData(roadmapKeys.categories()),
    }
    patchQueryData<readonly Roadmap[]>(
      queryClient,
      roadmapKeys.list(),
      (roadmaps) =>
        roadmaps.map((each) =>
          each.id === roadmapId
            ? currentText.roadmap(each, conflicts, since, lists)
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

export function patchQueryData<T>(
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
