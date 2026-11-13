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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"

export interface FamilyChangeDialogProps {
  open: boolean
  /** The family's name as shown. */
  name: string
  /** The roadmaps the change rewrites. */
  members: readonly Roadmap[]
  /** Whether a re-read found these roadmaps different from those confirmed (S8). */
  membersChanged: boolean
  saving: boolean
  /** Whether saving is available: only while connected. */
  available: boolean
  /** Whether closing returns focus to the control that opened it. */
  returnFocus: () => boolean
  /** Called once the dialog has finished closing. */
  onClosed: () => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Asks before a change that rewrites roadmaps, naming each and marking those published,
 * and when the public site shows it (S3). Says nothing about Welsh (S9). Cancel writes
 * nothing; while the change is under way it cannot be closed.
 */
export function FamilyChangeDialog({
  open,
  name,
  members,
  membersChanged,
  saving,
  available,
  returnFocus,
  onClosed,
  onConfirm,
  onCancel,
}: FamilyChangeDialogProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const published = members.some((roadmap) => roadmap.published)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onCancel()
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
            {t("roadmaps.families.confirm.title", { name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {membersChanged && (
              <span className="mb-2 block font-bold text-foreground">
                {t("roadmaps.families.confirm.membersChanged")}
              </span>
            )}
            {t("roadmaps.families.confirm.roadmaps", { count: members.length })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {members.length > 0 && (
          <>
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              {members.map((roadmap) => (
                <li key={roadmap.id} className="wrap-break-word">
                  <span className="font-bold">
                    {localise(roadmap.title, language)}
                  </span>
                  {roadmap.published && (
                    <>
                      {" "}
                      <Badge variant="info">
                        {t("roadmaps.families.published")}
                      </Badge>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p>
              {t(
                published
                  ? "roadmaps.families.confirm.public"
                  : "roadmaps.families.confirm.notPublic",
              )}
            </p>
          </>
        )}
        <AlertDialogFooter>
          <Button
            disabled={saving || !available}
            focusableWhenDisabled
            aria-busy={saving}
            onClick={onConfirm}
          >
            {t("roadmaps.families.confirm.action")}
          </Button>
          <AlertDialogCancel disabled={saving}>
            {t("common.cancel")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
