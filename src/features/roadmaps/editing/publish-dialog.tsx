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
import { localise } from "@/domain/roadmap/localised-text"
import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
import { useLanguage } from "@/i18n"

import { MarkUpdatedCheckbox } from "./mark-updated-checkbox"
import { changedParts } from "./pending-changes"
import type { PublishAction } from "./pending-changes-store"

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
 * Asks before publishing, listing each changed part by name with its changed fields,
 * and when the public site shows them (S9), with "Mark as updated today" unless a date
 * is pending, which is published instead (STY-036 S6, S7). Cancel writes nothing; while
 * the publish is under way it cannot be closed, and while publishing is unavailable it
 * cannot be confirmed.
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
  const language = useLanguage()
  const parts = changedParts(changes).map((part) =>
    part.kind === "roadmap"
      ? {
          key: "roadmap",
          name: t("roadmaps.about.title"),
          fields: part.fields.map((field) =>
            t(`roadmaps.edit.roadmapFields.${field}`),
          ),
        }
      : {
          key: `item-${String(part.position)}`,
          name: localise(part.item.title, language),
          fields: part.fields.map((field) =>
            t(`roadmaps.edit.itemFields.${field}`),
          ),
        },
  )

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
