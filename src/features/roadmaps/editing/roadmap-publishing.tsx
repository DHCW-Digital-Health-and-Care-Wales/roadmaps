import { type RefObject, useEffect, useRef, useState } from "react"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  type Conflict,
  NO_CHANGES,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import { useSessionAction } from "@/features/auth/session-action"
import { localToday } from "@/lib/local-today"

import { ConflictReviewDialog } from "./conflict-review-dialog"
import { keepMine, openConflicts, takeTheirs } from "./conflicts"
import { DiscardDialog } from "./discard-dialog"
import type { PageItem } from "./page-items"
import { PendingBar } from "./pending-bar"
import { countChanges } from "./pending-changes"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import { discardable, publishAction } from "./pending-changes-store"
import { PublishDialog } from "./publish-dialog"
import { PublishOutcomeNotice } from "./publish-outcome-notice"
import { RefusalNotice } from "./refusal-notice"
import { usePublish } from "./use-publish"

export interface RoadmapPublishingProps {
  /** The roadmap as last read. */
  roadmap: Roadmap
  /** The page's items (`usePageItems`), which the review draws an order's items from. */
  pageItems: readonly PageItem[]
  /** The roadmap's heading, where focus goes once a review leaves nothing to publish. */
  heading: RefObject<HTMLElement | null>
}

/**
 * At the foot of a roadmap's page (STY-052): what its last publish came to, and, while
 * changes are pending, how many there are with Publish (or Save, S11) and Discard
 * (STY-025 S2, S6, S9–S15, S18). Publishing asks first, listing what changes and
 * offering to mark the roadmap as updated today (STY-036 S6); it is unavailable, though
 * focusable, while a publish is under way and until every field and order someone else
 * changed is decided in the review (STY-026, STY-050), which opens in a dialog (STY-052
 * D12). After the session has expired it asks to reconnect first, then carries on
 * (STY-057).
 */
export function RoadmapPublishing({
  roadmap,
  pageItems,
  heading,
}: RoadmapPublishingProps) {
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const publish = usePublish(roadmap)
  const [confirming, setConfirming] = useState(false)
  // What the dialog listed when it was confirmed: set then, dropped when it is next asked.
  const [confirmed, setConfirmed] = useState<RoadmapChanges | null>(null)
  const [markUpdated, setMarkUpdated] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  // Open until closed, though deciding the last field drops the refusal it reviews.
  const [reviewing, setReviewing] = useState(false)
  // "Publish changes" in the review: the publish dialog opens once the review has gone.
  const publishAfterReview = useRef(false)
  const notice = useRef<HTMLDivElement>(null)
  const publishButton = useRef<HTMLButtonElement>(null)

  const changes = snapshot.changes.get(roadmap.id)
  const count = countChanges(changes)
  const publishing = snapshot.publishing.has(roadmap.id)
  const outcome = snapshot.notices.get(roadmap.id)
  const action = publishAction(roadmap)
  const canDiscard = discardable(snapshot, roadmap.id)
  // The store keeps a refusal only while it has something to say.
  const refused = outcome?.kind === "refused" ? outcome : null
  const open = refused ? openConflicts(refused.conflicts, changes) : []
  const deciding = open.length > 0

  // A read that leaves nothing to publish closes a dialog not yet confirmed, as the page
  // then shows nothing pending (DEF-010 D1). Once confirmed, the write's own settling
  // drops the changes and the dialog closes with it.
  if (confirming && !confirmed && count === 0) setConfirming(false)

  // A confirmation is for the page it was given on (the copywriter's page notice).
  useEffect(
    () => () => {
      if (store.getSnapshot().notices.get(roadmap.id)?.kind === "published") {
        store.clearNotice(roadmap.id)
      }
    },
    [store, roadmap.id],
  )

  const decide = (resolve: typeof keepMine) => (conflict: Conflict) => {
    store.update(roadmap.id, (pending) => resolve(pending, conflict))
  }

  // Once a publish ends the dialog, focus goes to the notice saying what it came to.
  const focusNoticeOnClose = useRef(false)
  const confirm = () => {
    focusNoticeOnClose.current = true
    setConfirmed(changes ?? NO_CHANGES)
    void publish(markUpdated ? localToday() : undefined).finally(() => {
      setConfirming(false)
    })
  }

  const ask = useSessionAction(() => {
    focusNoticeOnClose.current = false
    setMarkUpdated(false)
    setConfirmed(null)
    setConfirming(true)
  })

  return (
    <>
      {refused && (
        <RefusalNotice
          ref={notice}
          action={action}
          deciding={deciding}
          removed={refused.removed}
          hasPendingChanges={count > 0}
          onReview={() => {
            setReviewing(true)
          }}
          onDismiss={() => {
            store.clearNotice(roadmap.id)
          }}
        />
      )}
      {outcome && outcome.kind !== "refused" && (
        <PublishOutcomeNotice
          // Each publish's notice is new: announced again, with a dwell of its own.
          key={`${outcome.kind}-${String(publishing)}`}
          ref={notice}
          notice={outcome}
          onDismiss={() => {
            store.clearNotice(roadmap.id)
          }}
        />
      )}
      {(count > 0 || publishing) && (
        <PendingBar
          action={action}
          count={count}
          publishButton={publishButton}
          publishHeld={publishing || deciding}
          publishing={publishing}
          discardHeld={!canDiscard}
          onPublish={ask}
          onDiscard={() => {
            setDiscarding(true)
          }}
        />
      )}
      <ConflictReviewDialog
        open={reviewing}
        onClose={() => {
          setReviewing(false)
        }}
        // Undecided, back to "Review the changes"; decided, to Publish, or to the
        // roadmap's title once nothing is left (D16, D18, D22).
        finalFocus={() =>
          deciding ? true : (publishButton.current ?? heading.current ?? true)
        }
        action={action}
        conflicts={open}
        pageItems={pageItems}
        removed={refused?.removed ?? []}
        hasPendingChanges={count > 0}
        onKeepMine={decide(keepMine)}
        onUseTheirs={decide(takeTheirs)}
        onPublish={() => {
          publishAfterReview.current = true
          setReviewing(false)
        }}
        onClosed={() => {
          if (!publishAfterReview.current) return
          publishAfterReview.current = false
          ask(publishButton.current)
        }}
      />
      <PublishDialog
        open={confirming}
        action={action}
        changes={confirmed ?? changes ?? NO_CHANGES}
        publishing={publishing}
        markUpdated={markUpdated}
        onMarkUpdatedChange={setMarkUpdated}
        returnFocus={() =>
          focusNoticeOnClose.current ? false : (publishButton.current ?? true)
        }
        onClosed={() => {
          if (focusNoticeOnClose.current) notice.current?.focus()
        }}
        onConfirm={confirm}
        onCancel={() => {
          setConfirming(false)
        }}
      />
      <DiscardDialog
        open={discarding}
        onDiscard={() => {
          if (canDiscard) store.discard(roadmap.id)
          setDiscarding(false)
        }}
        onCancel={() => {
          setDiscarding(false)
        }}
      />
    </>
  )
}
