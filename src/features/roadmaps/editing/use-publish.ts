import type { Roadmap } from "@/domain/roadmap/roadmap"
import { markedUpdated } from "@/domain/roadmap/roadmap-changes"
import { toAppError } from "@/lib/errors"

import {
  usePublishRoadmapChanges,
  type CurrentText,
} from "../hooks/use-publish-roadmap-changes"
import { roadmapPageReads } from "../write-hold/read-back"
import { holdAfterWrite, writeAnswer } from "../write-hold/hold-after-write"
import { useWriteHold } from "../write-hold/write-hold-context"
import {
  discardItems,
  withCurrentItemText,
  withCurrentRoadmapText,
} from "./conflicts"
import { countChanges, settlePublished } from "./pending-changes"
import { usePendingChangesStore } from "./pending-changes-context"
import { publishAction, type PublishNotice } from "./pending-changes-store"

/** How a refusal shows the text it found, in the roadmap and its items as cached. */
export const CURRENT_TEXT: CurrentText = {
  roadmap: withCurrentRoadmapText,
  items: withCurrentItemText,
}

/**
 * Publishes (or saves) the roadmap's pending changes, once: never while a publish of the
 * roadmap is under way, never retried (S13). Given `today`, its date, the roadmap's
 * `Last updated` is set to it in the same write ("Mark as updated today", STY-036 S6).
 * What it came to is the roadmap's notice; on success the changes it sent are no longer
 * pending, and any made meanwhile stay. Once the roadmap and its items are not read
 * back after it, or its answer was lost, the app is held until a Refresh reads them
 * (DEF-015), the changes sent still pending; a publish that landed then settles and
 * says so.
 * A refusal discards the changes to items that are gone and leaves each conflict to the
 * review, showing the co-lead's text even if the read after it fails; a roadmap gone
 * from the list loses its changes (STY-026).
 * Works through the store alone, so leaving the page does not lose the outcome.
 */
export function usePublish(
  roadmap: Roadmap,
): (today?: string) => Promise<void> {
  const store = usePendingChangesStore()
  const hold = useWriteHold()
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
      const holding = holdAfterWrite(
        hold,
        { write: action, reads: roadmapPageReads(roadmap.id) },
        writeAnswer(outcome.status, "published"),
        readBack(),
      )
      switch (outcome.status) {
        case "published": {
          const published: PublishNotice = { action, kind: "published" }
          const settle = () => {
            store.update(roadmap.id, (changes) =>
              settlePublished(changes, sent),
            )
          }
          if (!holding) {
            settle()
            notice = published
            break
          }
          void holding.then(() => {
            settle()
            store.showNotice(roadmap.id, published)
          })
          notice = null
          break
        }
        case "unconfirmed":
          // Held above, by `holdAfterWrite` (DEF-015).
          notice = null
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
