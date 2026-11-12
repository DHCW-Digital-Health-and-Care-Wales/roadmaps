import {
  CircleAlertIcon,
  CircleCheckIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { useEffect, useRef, useState, type RefObject } from "react"
import { useTranslation } from "react-i18next"

import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
import { useAuth } from "@/features/auth/use-auth"
import { useNoticeDwell } from "@/features/auth/use-notice-dwell"
import { useLanguage } from "@/i18n"

import {
  applyItemChanges,
  changedItemFields,
  changedRoadmapFields,
  countChanges,
  NO_CHANGES,
} from "./pending-changes"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import type { PublishNotice } from "./pending-changes-store"
import { publishAction, usePublish } from "./use-publish"

export interface RoadmapPublishingProps {
  /** The roadmap as last read. */
  roadmap: Roadmap
}

/**
 * Under a roadmap's title: what its last publish came to, and, while changes are
 * pending, how many there are with Publish (or Save, S11) and Discard all (STY-025 S2,
 * S6, S9–S15, S18). Publishing asks first, listing what changes; it is unavailable,
 * though focusable, unless connected.
 */
export function RoadmapPublishing({ roadmap }: RoadmapPublishingProps) {
  const { t } = useTranslation()
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const connected = useAuth().state.status === "connected"
  const publish = usePublish(roadmap)
  const [confirming, setConfirming] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const notice = useRef<HTMLDivElement>(null)

  const changes = snapshot.changes.get(roadmap.id)
  const count = countChanges(changes)
  const publishing = snapshot.publishing.has(roadmap.id)
  const outcome = snapshot.notices.get(roadmap.id)
  const action = publishAction(roadmap)

  // A confirmation is for the page it was given on (the copywriter's page notice).
  useEffect(
    () => () => {
      if (store.getSnapshot().notices.get(roadmap.id)?.kind === "published") {
        store.clearNotice(roadmap.id)
      }
    },
    [store, roadmap.id],
  )

  // Once a publish ends the dialog, focus goes to the notice saying what it came to.
  const focusNoticeOnClose = useRef(false)
  const confirm = () => {
    focusNoticeOnClose.current = true
    void publish().finally(() => {
      setConfirming(false)
    })
  }

  return (
    <>
      {outcome && (
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
        <div className="flex flex-col gap-3 border-l-8 border-status-info-border bg-card py-3 pr-4 pl-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="font-bold" role="status">
            {t(`roadmaps.publish.pending.${action}`, { count })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!connected || publishing}
              focusableWhenDisabled
              aria-busy={publishing}
              onClick={() => {
                focusNoticeOnClose.current = false
                setConfirming(true)
              }}
            >
              <UploadIcon data-icon="inline-start" aria-hidden="true" />
              {t(`roadmaps.publish.action.${action}`)}
            </Button>
            <Button
              variant="secondary"
              disabled={publishing}
              focusableWhenDisabled
              onClick={() => {
                setDiscarding(true)
              }}
            >
              {t("roadmaps.publish.discardAll")}
            </Button>
          </div>
        </div>
      )}
      <PublishDialog
        open={confirming}
        roadmap={roadmap}
        changes={changes ?? NO_CHANGES}
        publishing={publishing}
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
          store.update(roadmap.id, () => NO_CHANGES)
          setDiscarding(false)
        }}
        onCancel={() => {
          setDiscarding(false)
        }}
      />
    </>
  )
}

interface PublishOutcomeNoticeProps {
  ref: RefObject<HTMLDivElement | null>
  notice: PublishNotice
  onDismiss: () => void
}

/**
 * A publish's outcome as a page notice: a confirmation clears itself after a dwell; a
 * failure interrupts and stays until dismissed or the next attempt, saying the changes
 * are kept. Focus comes here when the publish dialog closes.
 */
function PublishOutcomeNotice({
  ref,
  notice,
  onDismiss,
}: PublishOutcomeNoticeProps) {
  const { t } = useTranslation()
  const published = notice.kind === "published"
  const dwell = useNoticeDwell(published, onDismiss)
  const { action } = notice

  const content = (() => {
    switch (notice.kind) {
      case "published":
        return {
          variant: "success",
          Icon: CircleCheckIcon,
          title: null,
          lines: [
            t(
              action === "publish"
                ? "roadmaps.publish.notice.published"
                : "roadmaps.publish.notice.saved",
            ),
          ],
        } as const
      case "failed":
        return {
          variant: "destructive",
          Icon: CircleAlertIcon,
          title: t(`roadmaps.publish.notice.failed.${action}`),
          lines: [
            t(`roadmaps.publish.errors.${notice.error}`),
            t("roadmaps.publish.notice.kept"),
          ],
        } as const
      case "refused":
        return {
          variant: "warning",
          Icon: TriangleAlertIcon,
          title: t("roadmaps.publish.notice.refused.title"),
          lines: [
            t("roadmaps.publish.notice.refused.description"),
            t("roadmaps.publish.notice.kept"),
          ],
        } as const
      case "unconfirmed":
        return {
          variant: "warning",
          Icon: TriangleAlertIcon,
          title: t(`roadmaps.publish.notice.unconfirmed.title.${action}`),
          lines: [t("roadmaps.publish.notice.unconfirmed.description")],
        } as const
    }
  })()
  const { Icon } = content

  return (
    <Alert
      ref={ref}
      tabIndex={-1}
      role={published ? "status" : "alert"}
      variant={content.variant}
      className="max-w-2xl outline-none focus-visible:focus-ring"
      {...dwell}
    >
      <Icon aria-hidden="true" />
      <AlertContent>
        {content.title && <AlertTitle>{content.title}</AlertTitle>}
        <AlertDescription>
          {content.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </AlertDescription>
      </AlertContent>
      <AlertAction className="-my-1.5 -mr-2 self-start max-sm:w-auto max-sm:pl-0">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("auth.notice.dismiss")}
          onClick={onDismiss}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  )
}

interface PublishDialogProps {
  open: boolean
  roadmap: Roadmap
  changes: RoadmapChanges
  publishing: boolean
  /** Whether closing returns focus to the control that opened it. */
  returnFocus: () => boolean
  /** Called once the dialog has finished closing. */
  onClosed: () => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Asks before publishing, listing each changed part by name with its changed fields,
 * and when the public site shows them (S9). Cancel writes nothing; while the publish is
 * under way it cannot be closed.
 */
function PublishDialog({
  open,
  roadmap,
  changes,
  publishing,
  returnFocus,
  onClosed,
  onConfirm,
  onCancel,
}: PublishDialogProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const action = publishAction(roadmap)

  const roadmapFields = changedRoadmapFields(changes)
  const parts = [
    ...(roadmapFields.length > 0
      ? [
          {
            key: "roadmap",
            name: t("roadmaps.about.title"),
            fields: roadmapFields.map((field) =>
              t(`roadmaps.edit.roadmapFields.${field}`),
            ),
          },
        ]
      : []),
    ...[...changes.items]
      .sort((a, b) => a.position - b.position)
      .map((entry) => ({
        key: `item-${String(entry.position)}`,
        name: localise(applyItemChanges(entry.item, entry).title, language),
        fields: changedItemFields(entry).map((field) =>
          t(`roadmaps.edit.itemFields.${field}`),
        ),
      })),
  ]

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !publishing) onCancel()
      }}
      onOpenChangeComplete={(next) => {
        if (!next) onClosed()
      }}
    >
      <AlertDialogContent
        finalFocus={returnFocus}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t(`roadmaps.publish.dialog.title.${action}`)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(`roadmaps.publish.dialog.note.${action}`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <h3 className="font-bold">{t("roadmaps.publish.dialog.changes")}</h3>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {parts.map(({ key, name, fields }) => (
              <li key={key} className="wrap-break-word">
                <span className="font-bold">{name}</span>
                <span className="block text-body-xs text-muted-foreground">
                  {fields.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <AlertDialogFooter>
          <Button
            disabled={publishing}
            focusableWhenDisabled
            aria-busy={publishing}
            onClick={onConfirm}
          >
            {t(`roadmaps.publish.action.${action}`)}
          </Button>
          <AlertDialogCancel disabled={publishing}>
            {t("common.cancel")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface DiscardDialogProps {
  open: boolean
  onDiscard: () => void
  onCancel: () => void
}

/** Asks before discarding every pending change to the roadmap (S6). */
function DiscardDialog({ open, onDiscard, onCancel }: DiscardDialogProps) {
  const { t } = useTranslation()
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("roadmaps.publish.discard.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("roadmaps.publish.discard.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="destructive" onClick={onDiscard}>
            {t("roadmaps.publish.discard.confirm")}
          </Button>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
