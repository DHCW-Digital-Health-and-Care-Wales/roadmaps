import { CircleAlertIcon, TriangleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"

import type { NewRoadmapFailure } from "./use-new-roadmap-form"

export interface AddRoadmapFailedProps {
  failure: NewRoadmapFailure
  onDismiss: () => void
}

/**
 * Why a roadmap couldn't be added, and who can put it right; or, when the answer was
 * lost, that it may have been added (STY-041 S7). What was typed stays in the form.
 */
export function AddRoadmapFailed({
  failure,
  onDismiss,
}: AddRoadmapFailedProps) {
  const { t } = useTranslation()
  const unconfirmed = failure === "unconfirmed"
  return (
    <DismissibleNotice
      role="alert"
      variant={unconfirmed ? "warning" : "destructive"}
      Icon={unconfirmed ? TriangleAlertIcon : CircleAlertIcon}
      title={t(
        unconfirmed
          ? "roadmaps.add.unconfirmed.title"
          : "roadmaps.add.failed.title",
      )}
      onDismiss={onDismiss}
    >
      <p>
        {unconfirmed
          ? t("roadmaps.add.unconfirmed.description")
          : t(`roadmaps.add.failed.errors.${failure.kind}`)}
      </p>
    </DismissibleNotice>
  )
}
