import { CircleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import type { AppError } from "@/lib/errors"

export interface FamilyWriteFailedProps {
  action: "add" | "change"
  error: AppError
  onDismiss: () => void
}

/** Why adding or changing a family failed; what was typed stays in the form. */
export function FamilyWriteFailed({
  action,
  error,
  onDismiss,
}: FamilyWriteFailedProps) {
  const { t } = useTranslation()
  return (
    <DismissibleNotice
      role="alert"
      variant="destructive"
      Icon={CircleAlertIcon}
      title={t(`roadmaps.families.notice.failed.${action}`)}
      onDismiss={onDismiss}
      className="max-w-2xl"
    >
      <p>{t(`roadmaps.families.errors.${error.kind}`)}</p>
    </DismissibleNotice>
  )
}
