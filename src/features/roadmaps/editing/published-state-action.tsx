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

import type { PublishedState } from "./use-published-state"

export interface PublishedStateActionProps {
  state: PublishedState
  /** The roadmap's title, as shown. */
  title: string
}

/**
 * "Publish roadmap" or "Unpublish roadmap" beside a roadmap's title, and the dialog
 * that asks first, saying when the public site shows the change and what happens to
 * pending edits: published with it ("Save and publish", S5) or left pending (S7).
 * Unavailable, though focusable, while it can't be chosen (S1); the dialog can't be
 * closed while the write is under way.
 */
export function PublishedStateAction({
  state,
  title,
}: PublishedStateActionProps) {
  const { t } = useTranslation()
  const { available, pending } = state
  const Icon = state.publishing ? GlobeIcon : EyeOffIcon
  const { publishing, count } = state.asked
  const verb = publishing ? "publish" : "unpublish"

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
        {t(
          `roadmaps.publishRoadmap.action.${state.publishing ? "publish" : "unpublish"}`,
        )}
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
              {t(`roadmaps.publishRoadmap.confirm.title.${verb}`, { title })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(`roadmaps.publishRoadmap.confirm.note.${verb}`)}
              {count > 0 && (
                <>
                  {" "}
                  {t(
                    publishing
                      ? "roadmaps.publishRoadmap.confirm.withChanges"
                      : "roadmaps.publishRoadmap.confirm.keepsChanges",
                    { count },
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              disabled={!available}
              focusableWhenDisabled
              aria-busy={pending}
              onClick={state.confirm}
            >
              {publishing && count > 0
                ? t("roadmaps.publishRoadmap.confirm.saveAndPublish")
                : t(`roadmaps.publishRoadmap.action.${verb}`)}
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
