import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  markedUpdated,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import { toAppError } from "@/lib/errors"

import {
  usePublishRoadmapChanges,
  type CurrentText,
  type ReadBack,
} from "../hooks/use-publish-roadmap-changes"
import {
  discardItems,
  withCurrentItemText,
  withCurrentRoadmapText,
} from "./conflicts"
import { countChanges, keepUnread, settlePublished } from "./pending-changes"
import { usePendingChangesStore } from "./pending-changes-context"
import {
  publishAction,
  type PendingChangesStore,
  type PublishNotice,
} from "./pending-changes-store"

/** How a refusal shows the text it found, in the roadmap and its items as cached. */
export const CURRENT_TEXT: CurrentText = {
  roadmap: withCurrentRoadmapText,
  items: withCurrentItemText,
}

/**
 * Settles the roadmap's changes once `sent` is published, by what the reads after it
 * read back (`read`, from the publish's `readBack`): what a failed read would show stays pending,
 * based on what was published (`keepUnread`), until a read holds it, as the page would
 * otherwise show what was cached before (DEF-009 D1, D2); a new item kept so is
 * published, offering no Remove (D3).
 */
export function settleReadBack(
  store: PendingChangesStore,
  roadmapId: string,
  sent: RoadmapChanges,
  read: ReadBack,
) {
  const readBack: RoadmapChanges = {
    roadmap: read.roadmaps ? sent.roadmap : {},
    items: read.items ? sent.items : [],
    newItems: read.items ? sent.newItems : [],
  }
  const unread: RoadmapChanges = {
    roadmap: read.roadmaps ? {} : sent.roadmap,
    items: read.items ? [] : sent.items,
    newItems: [],
  }
  store.update(roadmapId, (changes) =>
    keepUnread(settlePublished(changes, readBack), unread),
  )
  if (!read.items) {
    store.keepPublished(
      roadmapId,
      sent.newItems.map(({ id }) => id),
    )
  }
}

/**
 * Publishes (or saves) the roadmap's pending changes, once: never while a publish of the
 * roadmap is under way, never retried (S13). Given `today`, its date, the roadmap's
 * `Last updated` is set to it in the same write ("Mark as updated today", STY-036 S6).
 * What it came to is the roadmap's notice; on success the changes it sent are no longer
 * pending, unless a read after it failed (`settleReadBack`), and any made
 * meanwhile stay.
 * A refusal discards the changes to items that are gone and leaves each conflict to the
 * review, showing the co-lead's text even if the read after it fails; a roadmap gone
 * from the list loses its changes (STY-026).
 * Works through the store alone, so leaving the page does not lose the outcome.
 */
export function usePublish(
  roadmap: Roadmap,
): (today?: string) => Promise<void> {
  const store = usePendingChangesStore()
  const { mutateAsync, readBack } = usePublishRoadmapChanges(roadmap.id, {
    currentText: CURRENT_TEXT,
  })
  const action = publishAction(roadmap)

  return async (today) => {
    const sent = store.getSnapshot().changes.get(roadmap.id)
    if (!sent || countChanges(sent) === 0) return
    if (!store.startPublish(roadmap.id)) return
    let notice: PublishNotice | null
    try {
      // Settles once the roadmap and its items are read again, or have failed to be.
      const outcome = await mutateAsync(markedUpdated(sent, today))
      switch (outcome.status) {
        case "published":
          settleReadBack(store, roadmap.id, sent, readBack())
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
