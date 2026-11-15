import { useTranslation } from "react-i18next"

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
import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"

import { MarkUpdatedCheckbox } from "./mark-updated-checkbox"
import type { PublishAction } from "./pending-changes-store"
import { WhatChanges } from "./what-changes"

export interface PublishDialogProps {
  open: boolean
  action: PublishAction
  changes: RoadmapChanges
  publishing: boolean
  /** Whether publishing is available: only while connected (S12). */
  available: boolean
  /** Whether "Mark as updated today" is ticked, offered unless a date is pending. */
  markUpdated: boolean
  onMarkUpdatedChange: (checked: boolean) => void
  /** Whether closing returns focus to the control that opened it. */
  returnFocus: () => boolean
  /** Called once the dialog has finished closing. */
  onClosed: () => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Asks before publishing, saying when the public site shows the changes (S9) and
 * listing them (`WhatChanges`), with "Mark as updated today" unless a date is pending,
 * which is published instead (STY-036 S6, S7). Cancel writes nothing; while the publish
 * is under way it cannot be closed, and while publishing is unavailable it cannot be
 * confirmed.
 */
export function PublishDialog({
  open,
  action,
  changes,
  publishing,
  available,
  markUpdated,
  onMarkUpdatedChange,
  returnFocus,
  onClosed,
  onConfirm,
  onCancel,
}: PublishDialogProps) {
  const { t } = useTranslation()

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
      <AlertDialogContent finalFocus={returnFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t(`roadmaps.publish.dialog.title.${action}`)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(`roadmaps.publish.dialog.note.${action}`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <WhatChanges changes={changes} />
        {!changes.roadmap.lastUpdated && (
          <MarkUpdatedCheckbox
            checked={markUpdated}
            disabled={publishing}
            onCheckedChange={onMarkUpdatedChange}
          />
        )}
        <AlertDialogFooter>
          <Button
            disabled={publishing || !available}
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
