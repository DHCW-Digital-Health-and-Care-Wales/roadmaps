import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { FieldConflict } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { toAppError } from "@/lib/errors"

import { roadmapKeys } from "../hooks/roadmap-queries"
import { usePublishRoadmapChanges } from "../hooks/use-publish-roadmap-changes"
import {
  discardItems,
  withCurrentItemText,
  withCurrentRoadmapText,
} from "./conflicts"
import { countChanges, settlePublished } from "./pending-changes"
import { usePendingChangesStore } from "./pending-changes-context"
import { publishAction, type PublishNotice } from "./pending-changes-store"

/**
 * Publishes (or saves) the roadmap's pending changes, once: never while a publish of the
 * roadmap is under way, never retried (S13). What it came to is the roadmap's notice;
 * on success the changes it sent are no longer pending, and any made meanwhile stay.
 * A refusal discards the changes to items that are gone and leaves each conflict to the
 * review, showing the co-lead's text even if the read after it fails; a roadmap gone
 * from the list loses its changes (STY-026).
 * Works through the store alone, so leaving the page does not lose the outcome.
 */
export function usePublish(roadmap: Roadmap): () => Promise<void> {
  const store = usePendingChangesStore()
  const queryClient = useQueryClient()
  const { mutateAsync } = usePublishRoadmapChanges(roadmap.id, {
    onRefused: (conflicts) => {
      showCurrentText(queryClient, roadmap.id, conflicts)
    },
  })
  const action = publishAction(roadmap)

  return async () => {
    const sent = store.getSnapshot().changes.get(roadmap.id)
    if (!sent || countChanges(sent) === 0) return
    if (!store.startPublish(roadmap.id)) return
    let notice: PublishNotice | null
    try {
      // Settles once the roadmap and its items are read again, or have failed to be.
      const outcome = await mutateAsync(sent)
      switch (outcome.status) {
        case "published":
          store.update(roadmap.id, (changes) => settlePublished(changes, sent))
          notice = { action, kind: "published" }
          break
        case "unconfirmed":
          notice = { action, kind: "unconfirmed" }
          break
        case "refused":
          store.update(roadmap.id, (changes) =>
            discardItems(changes, outcome.missingItems),
          )
          notice = {
            action,
            kind: "refused",
            conflicts: outcome.conflicts,
            removed: outcome.missingItems.map((entry) => entry.item.title),
          }
          break
        case "roadmap-not-found":
          // Its page says so in place of the roadmap (S6).
          store.removeRoadmap(roadmap.id)
          notice = null
          break
      }
    } catch (error) {
      notice = { action, kind: "failed", error: toAppError(error).kind }
    }
    store.finishPublish(roadmap.id, notice)
  }
}

/**
 * Shows the text a refusal found a co-lead wrote, before the roadmap and its items are
 * read again, so "Use theirs" shows theirs even if that read fails (S2). The data keeps
 * its age, so it is read again as soon as it would have been.
 */
function showCurrentText(
  queryClient: QueryClient,
  roadmapId: string,
  conflicts: readonly FieldConflict[],
) {
  if (conflicts.some((conflict) => conflict.subject === "roadmap")) {
    patchQueryData<readonly Roadmap[]>(
      queryClient,
      roadmapKeys.list(),
      (roadmaps) =>
        roadmaps.map((each) =>
          each.id === roadmapId
            ? withCurrentRoadmapText(each, conflicts)
            : each,
        ),
    )
  }
  if (conflicts.some((conflict) => conflict.subject === "item")) {
    patchQueryData<readonly RoadmapItem[]>(
      queryClient,
      roadmapKeys.items(roadmapId),
      (items) => withCurrentItemText(items, conflicts),
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
