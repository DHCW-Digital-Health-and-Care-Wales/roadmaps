import { useCallback, useState } from "react"

import type { PublishProblem } from "@/domain/roadmap/published-state"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { markedUpdated } from "@/domain/roadmap/roadmap-changes"
import { useAuth } from "@/features/auth/use-auth"
import { toAppError, type AppErrorKind } from "@/lib/errors"
import { localToday } from "@/lib/local-today"

import { useRoadmapItems } from "../hooks/use-roadmap-items"
import { useSetRoadmapPublished } from "../hooks/use-set-roadmap-published"
import { discardItems, openConflicts } from "./conflicts"
import {
  countChanges,
  NO_CHANGES,
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

/** What the action asks, as its dialog said it. */
export interface PublishedStateQuestion {
  /** Publish, the roadmap not being published, or unpublish. */
  publishing: boolean
  /** Pending edits that go with a publish, or stay with an unpublish. */
  count: number
  /**
   * Whether a publish leaves the public site none of the roadmap's items to show
   * (STY-042 S3): known only once its items are read.
   */
  noItems: boolean
}

export interface PublishedState extends PublishedStateQuestion {
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
   * What the dialog asks: fixed when it opens, and kept while it closes, though the
   * roadmap changes under it.
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
 * Publishing can also set the roadmap's `Last updated` to today (STY-036 D10), and is
 * still allowed when the public would see no items, which the question says (STY-042
 * D3). Unavailable unless connected, while a write of the roadmap is under way, and
 * while a conflict is still to decide.
 */
export function usePublishedState(roadmap: Roadmap): PublishedState {
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const connected = useAuth().state.status === "connected"
  const { mutateAsync, isPending } = useSetRoadmapPublished(roadmap, {
    currentText: CURRENT_TEXT,
  })
  const [open, setOpen] = useState(false)
  const [asked, setAsked] = useState<PublishedStateQuestion | null>(null)
  const [markUpdated, setMarkUpdated] = useState(false)
  const [notice, setNotice] = useState<PublishedStateOutcomeNotice | null>(null)
  // Stable, as a confirmation's dwell restarts when it changes.
  const dismissNotice = useCallback(() => {
    setNotice(null)
  }, [])

  const { data: items } = useRoadmapItems(roadmap.id)
  const publishing = !roadmap.published
  const changes = snapshot.changes.get(roadmap.id)
  const question: PublishedStateQuestion = {
    publishing,
    count: countChanges(changes),
    noItems:
      publishing && items !== undefined && publishesNoItems(items, changes),
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
    ...question,
    available: connected && !pending && !reviewing,
    offersMarkUpdated:
      (asked ?? question).publishing && !changes?.roadmap.lastUpdated,
    markUpdated,
    setMarkUpdated,
    pending,
    open,
    asked: asked ?? question,
    ask: () => {
      setAsked(question)
      setMarkUpdated(false)
      setOpen(true)
    },
    cancel: () => {
      if (!pending) setOpen(false)
    },
    confirm: () => {
      if (!open || asked === null || !connected || pending) return
      setNotice(null)
      const today = asked.publishing && markUpdated ? localToday() : undefined
      void write(asked, today).finally(() => {
        setOpen(false)
      })
    },
    notice,
    dismissNotice,
  }
}
