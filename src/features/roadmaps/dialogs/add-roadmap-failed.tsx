import { CircleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import type { AppError } from "@/lib/errors"

import { writeFailureMessage } from "../write-failure-message"

export interface AddRoadmapFailedProps {
  failure: AppError
  onDismiss: () => void
}

/**
 * Why a roadmap couldn't be added, and who can put it right (STY-041 S7). What was typed
 * stays in the form.
 */
export function AddRoadmapFailed({
  failure,
  onDismiss,
}: AddRoadmapFailedProps) {
  const { t } = useTranslation()
  return (
    <DismissibleNotice
      role="alert"
      variant="destructive"
      Icon={CircleAlertIcon}
      title={t("roadmaps.add.failed.title")}
      onDismiss={onDismiss}
    >
      <p>{writeFailureMessage(t, "add", failure.kind)}</p>
    </DismissibleNotice>
  )
}
