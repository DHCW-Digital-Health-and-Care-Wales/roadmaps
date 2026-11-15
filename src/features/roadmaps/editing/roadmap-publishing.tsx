import { UploadIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { InsetText } from "@/components/layout/inset-text"
import { Button } from "@/components/ui/button"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  type FieldConflict,
  NO_CHANGES,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import { useAuth } from "@/features/auth/use-auth"
import { localToday } from "@/lib/local-today"

import { ConflictReview } from "./conflict-review"
import { keepMine, openConflicts, takeTheirs } from "./conflicts"
import { DiscardDialog } from "./discard-dialog"
import { countChanges } from "./pending-changes"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import { discardable, publishAction } from "./pending-changes-store"
import { PublishDialog } from "./publish-dialog"
import { PublishOutcomeNotice } from "./publish-outcome-notice"
import { useDecisionFocus } from "./use-decision-focus"
import { usePublish } from "./use-publish"

export interface RoadmapPublishingProps {
  /** The roadmap as last read. */
  roadmap: Roadmap
}

/**
 * Under a roadmap's title: what its last publish came to, and, while changes are
 * pending, how many there are with Publish (or Save, S11) and Discard all (STY-025 S2,
 * S6, S9–S15, S18). Publishing asks first, listing what changes and offering to mark the
 * roadmap as updated today (STY-036 S6); it is unavailable,
 * though focusable, unless connected and until every field someone else changed is
 * decided in the review (STY-026).
 */
export function RoadmapPublishing({ roadmap }: RoadmapPublishingProps) {
  const { t } = useTranslation()
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const connected = useAuth().state.status === "connected"
  const publish = usePublish(roadmap)
  const [confirming, setConfirming] = useState(false)
  // What the dialog listed when it was confirmed: set then, dropped when it is next asked.
  const [confirmed, setConfirmed] = useState<RoadmapChanges | null>(null)
  const [markUpdated, setMarkUpdated] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const notice = useRef<HTMLDivElement>(null)

  const changes = snapshot.changes.get(roadmap.id)
  const count = countChanges(changes)
  const publishing = snapshot.publishing.has(roadmap.id)
  const outcome = snapshot.notices.get(roadmap.id)
  const action = publishAction(roadmap)
  // Discarding before a Refresh could hide changes an unconfirmed publish wrote (S18).
  const canDiscard = discardable(snapshot, roadmap.id)
  // The store keeps a refusal only while it has something to say.
  const refused = outcome?.kind === "refused" ? outcome : null
  const open = refused ? openConflicts(refused.conflicts, changes) : []
  const reviewing = open.length > 0

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

  // Once every field is decided, focus goes to Publish, or to the review while it still
  // names removed items; with neither left, the shell moves it to the page.
  const publishButton = useRef<HTMLButtonElement>(null)
  const focus = useDecisionFocus(
    open,
    () => publishButton.current ?? notice.current,
  )
  const decide = (resolve: typeof keepMine) => (conflict: FieldConflict) => {
    focus.decided(conflict)
    store.update(roadmap.id, (pending) => resolve(pending, conflict))
  }

  // Once a publish ends the dialog, focus goes to the notice saying what it came to.
  const focusNoticeOnClose = useRef(false)
  const confirm = () => {
    if (!connected) return
    focusNoticeOnClose.current = true
    setConfirmed(changes ?? NO_CHANGES)
    void publish(markUpdated ? localToday() : undefined).finally(() => {
      setConfirming(false)
    })
  }

  return (
    <>
      {refused && (
        <ConflictReview
          ref={notice}
          action={action}
          open={open}
          removed={refused.removed}
          hasPendingChanges={count > 0}
          keepMineRef={focus.keepMineRef}
          onKeepMine={decide(keepMine)}
          onUseTheirs={decide(takeTheirs)}
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
        <InsetText
          tone="info"
          className="flex max-w-none flex-col gap-3 bg-card py-3 pl-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        >
          <p className="font-bold" role="status">
            {t(`roadmaps.publish.pending.${action}`, { count })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              ref={publishButton}
              disabled={!connected || publishing || reviewing}
              focusableWhenDisabled
              aria-busy={publishing}
              onClick={() => {
                focusNoticeOnClose.current = false
                setMarkUpdated(false)
                setConfirmed(null)
                setConfirming(true)
              }}
            >
              <UploadIcon data-icon="inline-start" aria-hidden="true" />
              {t(`roadmaps.publish.action.${action}`)}
            </Button>
            <Button
              variant="secondary"
              disabled={!canDiscard}
              focusableWhenDisabled
              onClick={() => {
                setDiscarding(true)
              }}
            >
              {t("roadmaps.publish.discardAll")}
            </Button>
          </div>
        </InsetText>
      )}
      <PublishDialog
        open={confirming}
        action={action}
        changes={confirmed ?? changes ?? NO_CHANGES}
        publishing={publishing}
        available={connected}
        markUpdated={markUpdated}
        onMarkUpdatedChange={setMarkUpdated}
        returnFocus={() => !focusNoticeOnClose.current}
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
