import { EyeOffIcon, GlobeIcon } from "lucide-react"
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

import { MarkUpdatedCheckbox } from "./mark-updated-checkbox"
import type { PublishedState } from "./use-published-state"

export interface PublishedStateActionProps {
  state: PublishedState
  /** The roadmap's title, as shown. */
  title: string
}

/**
 * "Publish roadmap" or "Unpublish roadmap" beside a roadmap's title, and the dialog
 * that asks first, saying when the public site shows the change, when it would show
 * the roadmap with no items (STY-042 S3), and what happens to pending edits: published
 * with it ("Save and publish", S5) or left pending (S7), and, when publishing, "Mark as
 * updated today" (STY-036 D10).
 * Unavailable, though focusable, while it can't be chosen (S1); the dialog can't be
 * closed while the write is under way.
 */
export function PublishedStateAction({
  state,
  title,
}: PublishedStateActionProps) {
  const { t } = useTranslation()
  const { available, pending } = state
  // The button offers what the roadmap's state now calls for; the dialog keeps what it
  // asked while it closes, though the state flips under it.
  const liveVerb = state.publishing ? "publish" : "unpublish"
  const Icon = state.publishing ? GlobeIcon : EyeOffIcon
  const { publishing, count, noItems } = state.asked
  const askedVerb = publishing ? "publish" : "unpublish"
  const description = [
    t(`roadmaps.publishRoadmap.confirm.note.${askedVerb}`),
    noItems && t("roadmaps.publishRoadmap.confirm.noItems"),
    count > 0 &&
      t(
        publishing
          ? "roadmaps.publishRoadmap.confirm.withChanges"
          : "roadmaps.publishRoadmap.confirm.keepsChanges",
        { count },
      ),
  ]

  return (
    <>
      <Button
        variant="secondary"
        disabled={!available}
        focusableWhenDisabled
        aria-busy={pending}
        onClick={state.ask}
      >
        <Icon data-icon="inline-start" aria-hidden="true" />
        {t(`roadmaps.publishRoadmap.action.${liveVerb}`)}
      </Button>
      <AlertDialog
        open={state.open}
        onOpenChange={(next) => {
          if (!next) state.cancel()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(`roadmaps.publishRoadmap.confirm.title.${askedVerb}`, {
                title,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {description.filter(Boolean).join(" ")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {state.offersMarkUpdated && (
            <MarkUpdatedCheckbox
              checked={state.markUpdated}
              disabled={pending}
              onCheckedChange={state.setMarkUpdated}
            />
          )}
          <AlertDialogFooter>
            <Button
              disabled={!available}
              focusableWhenDisabled
              aria-busy={pending}
              onClick={state.confirm}
            >
              {publishing && count > 0
                ? t("roadmaps.publishRoadmap.confirm.saveAndPublish")
                : t(`roadmaps.publishRoadmap.action.${askedVerb}`)}
            </Button>
            <AlertDialogCancel disabled={pending}>
              {t("common.cancel")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
