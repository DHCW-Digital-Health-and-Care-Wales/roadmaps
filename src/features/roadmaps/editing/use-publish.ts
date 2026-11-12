import type { Roadmap } from "@/domain/roadmap/roadmap"
import { toAppError } from "@/lib/errors"

import { usePublishRoadmapChanges } from "../hooks/use-publish-roadmap-changes"
import { discardItems } from "./conflicts"
import { countChanges, settlePublished } from "./pending-changes"
import { usePendingChangesStore } from "./pending-changes-context"
import { publishAction, type PublishNotice } from "./pending-changes-store"

/**
 * Publishes (or saves) the roadmap's pending changes, once: never while a publish of the
 * roadmap is under way, never retried (S13). What it came to is the roadmap's notice;
 * on success the changes it sent are no longer pending, and any made meanwhile stay.
 * A refusal discards the changes to items that are gone and leaves each conflict to the
 * review; a roadmap gone from the list loses its changes (STY-026).
 * Works through the store alone, so leaving the page does not lose the outcome.
 */
export function usePublish(roadmap: Roadmap): () => Promise<void> {
  const store = usePendingChangesStore()
  const { mutateAsync } = usePublishRoadmapChanges(roadmap.id)
  const action = publishAction(roadmap)

  return async () => {
    const sent = store.getSnapshot().changes.get(roadmap.id)
    if (!sent || countChanges(sent) === 0) return
    if (!store.startPublish(roadmap.id)) return
    let notice: PublishNotice | null
    try {
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
