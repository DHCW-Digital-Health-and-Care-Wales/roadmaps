import { Trans, useTranslation } from "react-i18next"

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
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import { useSessionAction } from "@/features/auth/session-action"

import { ContentText } from "../components/content-text"
import { MarkUpdatedCheckbox } from "./mark-updated-checkbox"
import { countChanges } from "./pending-changes"
import { publishedStateAction } from "./published-state-action"
import { PublishedStateIcon } from "./published-state-icon"
import { useFocusNoticeOnClose } from "./use-focus-notice-on-close"
import type { PublishedState } from "./use-published-state"
import { WhatChanges } from "./what-changes"

export interface PublishRoadmapButtonProps {
  state: PublishedState
}

/**
 * "Publish roadmap", a visible button while the roadmap is not published (STY-052 D15).
 * Unavailable, though focusable, while it can't be chosen (STY-035 S1). Pressed after
 * the session has expired, it asks to reconnect first, then asks (STY-057).
 */
export function PublishRoadmapButton({ state }: PublishRoadmapButtonProps) {
  const { t } = useTranslation()
  const ask = useSessionAction(state.ask)
  const verb = publishedStateAction(state)
  return (
    <Button
      variant="secondary"
      disabled={!state.available}
      focusableWhenDisabled
      aria-busy={state.pending}
      onClick={(event) => {
        ask(event.currentTarget)
      }}
    >
      <PublishedStateIcon
        action={verb}
        data-icon="inline-start"
        aria-hidden="true"
      />
      {t(`roadmaps.publishRoadmap.action.${verb}`)}
    </Button>
  )
}

export interface PublishedStateDialogProps {
  state: PublishedState
  /** The roadmap's title, as shown in the interface's language. */
  title: LocalisedText
  /**
   * The notice saying what the write came to, where focus goes once it is confirmed: its
   * own, or the refusal of the changes it sent (STY-052 D21).
   */
  notice: () => HTMLElement | null
}

/**
 * The dialog that asks before publishing or unpublishing a roadmap, saying when the
 * public site shows the change, when it would show the roadmap with no items (STY-042
 * S3), and what happens to pending edits: published with it ("Save and publish", S5),
 * and then listed (`WhatChanges`, STY-047 S1), or left pending (S7), and, when
 * publishing, "Mark as updated today" (STY-036 D10). It can't be closed while the write
 * is under way; once confirmed, focus goes to the notice saying what it came to, at the
 * foot (STY-052 D21). Confirmed after the session has expired, it asks to reconnect
 * first, then carries on (STY-057).
 */
export function PublishedStateDialog({
  state,
  title,
  notice,
}: PublishedStateDialogProps) {
  const { t } = useTranslation()
  const { available, pending } = state
  const outcome = useFocusNoticeOnClose(state.open, notice)
  const confirm = useSessionAction(() => {
    outcome.confirmed()
    state.confirm()
  })
  const { publishing, changes, noItems } = state.asked
  const count = countChanges(changes)
  const sendsChanges = publishing && count > 0
  const askedVerb = publishing ? "publish" : "unpublish"
  const description: string[] = [
    t(`roadmaps.publishRoadmap.confirm.note.${askedVerb}`),
  ]
  if (noItems) description.push(t("roadmaps.publishRoadmap.confirm.noItems"))
  if (count > 0) {
    description.push(
      t(
        publishing
          ? "roadmaps.publishRoadmap.confirm.withChanges"
          : "roadmaps.publishRoadmap.confirm.keepsChanges",
        { count },
      ),
    )
  }

  return (
    <AlertDialog
      open={state.open}
      onOpenChange={(next) => {
        if (!next) state.cancel()
      }}
      onOpenChangeComplete={outcome.onOpenChangeComplete}
    >
      <AlertDialogContent finalFocus={() => outcome.finalFocus()}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans
              i18nKey={`roadmaps.publishRoadmap.confirm.title.${askedVerb}`}
              components={{ title: <ContentText value={title} /> }}
            />
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description.join(" ")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {sendsChanges && <WhatChanges changes={changes} />}
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
            onClick={(event) => {
              confirm(event.currentTarget)
            }}
          >
            {sendsChanges
              ? t("roadmaps.publishRoadmap.confirm.saveAndPublish")
              : t(`roadmaps.publishRoadmap.action.${askedVerb}`)}
          </Button>
          <AlertDialogCancel disabled={pending}>
            {t("common.cancel")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
