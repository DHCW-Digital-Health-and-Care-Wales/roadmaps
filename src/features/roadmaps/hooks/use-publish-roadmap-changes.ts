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
import { readBackAfterWrite, roadmapPageReads } from "../write-hold/read-back"
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
 * what the data source now holds, and `readBack` then tells whether both succeeded. A
 * refusal first shows the text it found by `currentText`, so the page shows it even if
 * that read fails.
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

/**
 * Reads what the roadmap's page shows again once a write has answered, and tells, by the
 * `readBack` it returns, whether all of it read, for the write that last settled
 * (`readBackAfterWrite`).
 */
export function useReadAgain(roadmapId: string) {
  const queryClient = useQueryClient()
  const read = useRef(true)
  return {
    readAgain: async () => {
      read.current = await readBackAfterWrite(
        queryClient,
        roadmapPageReads(roadmapId),
      )
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
