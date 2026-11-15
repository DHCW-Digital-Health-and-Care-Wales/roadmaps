import { useCallback, useState } from "react"

import type { PublishProblem } from "@/domain/roadmap/published-state"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import {
  markedUpdated,
  NO_CHANGES,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import { useAuth } from "@/features/auth/use-auth"
import { toAppError, type AppErrorKind } from "@/lib/errors"
import { localToday } from "@/lib/local-today"

import { useSetRoadmapPublished } from "../hooks/use-set-roadmap-published"
import { discardItems, openConflicts } from "./conflicts"
import {
  countChanges,
  publishesNoItems,
  settlePublished,
} from "./pending-changes"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import { publishAction, type PublishNotice } from "./pending-changes-store"
import { CURRENT_TEXT } from "./use-publish"

/** What the last publish or unpublish of the roadmap came to, as its page says it. */
export type PublishedStateOutcomeNotice =
  | { kind: "set"; published: boolean; withChanges: boolean }
  /** Nothing was written: the roadmap changed since it was shown. */
  | { kind: "changed" }
  /** Publishing was refused, as the public site's sync would fail (S4). */
  | { kind: "unpublishable"; problems: PublishProblem[]; kept: boolean }
  | { kind: "failed"; published: boolean; error: AppErrorKind; kept: boolean }
  /** The answer was lost (S10); with pending edits sent, the store says so instead. */
  | { kind: "unconfirmed"; published: boolean }

/** What the action asks, as its dialog says it. */
export interface PublishedStateQuestion {
  /** Publish, the roadmap not being published, or unpublish. */
  publishing: boolean
  /** The pending changes: they go with a publish, or stay with an unpublish. */
  changes: RoadmapChanges
  /**
   * Whether a publish leaves the public site none of the roadmap's items to show
   * (STY-042 S3): never while its items are not read.
   */
  noItems: boolean
}

export interface PublishedState {
  /** What the action now offers: publish, the roadmap not being published. */
  publishing: boolean
  /** Whether the action can be chosen now. */
  available: boolean
  /**
   * Whether the dialog offers "Mark as updated today" (STY-036 D10): when publishing,
   * unless a date is pending, which is published instead (S7).
   */
  offersMarkUpdated: boolean
  /** Whether it is ticked: unticked each time the dialog opens. */
  markUpdated: boolean
  setMarkUpdated: (checked: boolean) => void
  /** Whether a write is under way. */
  pending: boolean
  /** Whether the dialog asking is open. */
  open: boolean
  /**
   * What the dialog asks. Whether it publishes is fixed when it opens, though the
   * roadmap's state flips under it. What goes with it follows the pending changes, as a
   * read that lands while it is open can drop one, until it is confirmed: the whole
   * question is then kept while the write runs and the dialog closes.
   */
  asked: PublishedStateQuestion
  ask: () => void
  cancel: () => void
  confirm: () => void
  notice: PublishedStateOutcomeNotice | null
  dismissNotice: () => void
}

/**
 * Publishing or unpublishing a roadmap from its page (STY-035): asked first, then
 * written at once. Publishing sends the roadmap's pending edits with it, through the
 * pending-edit store as a publish of them goes, so a conflict opens its review and a
 * lost answer waits for a Refresh (S5, S6, S10); unpublishing leaves them pending (S7).
 * Publishing can also set the roadmap's `Last updated` to today (STY-036 D10). It is
 * still allowed when the public would see no items, which the question then says, going
 * by `items`, the roadmap's items once read (STY-042 D3). Unavailable unless connected,
 * while a write of the roadmap is under way, and while a conflict is still to decide.
 */
export function usePublishedState(
  roadmap: Roadmap,
  items: readonly RoadmapItem[] | undefined,
): PublishedState {
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const connected = useAuth().state.status === "connected"
  const { mutateAsync, isPending } = useSetRoadmapPublished(roadmap, {
    currentText: CURRENT_TEXT,
  })
  const [open, setOpen] = useState(false)
  const [askedPublishing, setAskedPublishing] = useState<boolean | null>(null)
  const [confirmed, setConfirmed] = useState<PublishedStateQuestion | null>(
    null,
  )
  const [markUpdated, setMarkUpdated] = useState(false)
  const [notice, setNotice] = useState<PublishedStateOutcomeNotice | null>(null)
  // Stable, as a confirmation's dwell restarts when it changes.
  const dismissNotice = useCallback(() => {
    setNotice(null)
  }, [])

  const publishing = !roadmap.published
  const changes = snapshot.changes.get(roadmap.id)
  const asksToPublish = askedPublishing ?? publishing
  const asked: PublishedStateQuestion = confirmed ?? {
    publishing: asksToPublish,
    changes: changes ?? NO_CHANGES,
    noItems:
      asksToPublish && items !== undefined && publishesNoItems(items, changes),
  }
  const outcome = snapshot.notices.get(roadmap.id)
  const reviewing =
    outcome?.kind === "refused" &&
    openConflicts(outcome.conflicts, changes).length > 0
  const pending = isPending || snapshot.publishing.has(roadmap.id)

  const write = async (
    { publishing }: PublishedStateQuestion,
    today: string | undefined,
  ) => {
    const now = store.getSnapshot().changes.get(roadmap.id)
    const sent = publishing && countChanges(now) > 0 ? now : undefined
    if (sent && !store.startPublish(roadmap.id)) return
    const kept = sent !== undefined
    const action = publishAction(roadmap)
    let stored: PublishNotice | null = null
    let shown: PublishedStateOutcomeNotice | null = null
    try {
      const result = await mutateAsync(
        publishing
          ? {
              published: true,
              changes:
                today === undefined
                  ? sent
                  : markedUpdated(sent ?? NO_CHANGES, today),
            }
          : { published: false },
      )
      switch (result.status) {
        case "set":
          if (sent) {
            store.update(roadmap.id, (later) => settlePublished(later, sent))
          }
          shown = { kind: "set", published: publishing, withChanges: kept }
          break
        case "unconfirmed":
          if (sent) stored = { action, kind: "unconfirmed" }
          else shown = { kind: "unconfirmed", published: publishing }
          break
        case "refused":
          store.update(roadmap.id, (later) =>
            discardItems(later, result.missingItems),
          )
          stored = {
            action,
            kind: "refused",
            conflicts: result.conflicts,
            removed: result.missingItems.map((entry) => entry.item.title),
          }
          break
        case "roadmap-not-found":
          // Its page says so in place of the roadmap, as a publish of its edits does.
          if (sent) store.removeRoadmap(roadmap.id)
          break
        case "changed":
          shown = { kind: "changed" }
          break
        case "unpublishable":
          shown = { kind: "unpublishable", problems: result.problems, kept }
          break
      }
    } catch (error) {
      shown = {
        kind: "failed",
        published: publishing,
        error: toAppError(error).kind,
        kept,
      }
    }
    if (sent) store.finishPublish(roadmap.id, stored)
    setNotice(shown)
  }

  return {
    publishing,
    available: connected && !pending && !reviewing,
    offersMarkUpdated: asked.publishing && !changes?.roadmap.lastUpdated,
    markUpdated,
    setMarkUpdated,
    pending,
    open,
    asked,
    ask: () => {
      setAskedPublishing(publishing)
      setConfirmed(null)
      setMarkUpdated(false)
      setOpen(true)
    },
    cancel: () => {
      if (!pending) setOpen(false)
    },
    confirm: () => {
      if (!open || !connected || pending) return
      setNotice(null)
      setConfirmed(asked)
      const today = asked.publishing && markUpdated ? localToday() : undefined
      void write(asked, today).finally(() => {
        setOpen(false)
      })
    },
    notice,
    dismissNotice,
  }
}
