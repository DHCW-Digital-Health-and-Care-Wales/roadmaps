import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { useNoticeDwell } from "@/features/auth/use-notice-dwell"

/** What a family write did, or that the family had gone. */
export type FamilyNotice =
  | { kind: "added" | "changed" | "changedPublic"; name: string }
  | { kind: "gone" }

export interface FamilyOutcomeNoticeProps {
  ref: RefObject<HTMLDivElement | null>
  notice: FamilyNotice
  onDismiss: () => void
}

/**
 * A family write's outcome as a page notice: a confirmation that clears itself after a
 * dwell, or, when the family had gone, a warning that stays until dismissed. Focus comes
 * here when the form closes.
 */
export function FamilyOutcomeNotice({
  ref,
  notice,
  onDismiss,
}: FamilyOutcomeNoticeProps) {
  const { t } = useTranslation()
  const done = notice.kind !== "gone"
  const dwell = useNoticeDwell(done, onDismiss)
  return (
    <DismissibleNotice
      ref={ref}
      tabIndex={-1}
      role={done ? "status" : "alert"}
      variant={done ? "success" : "warning"}
      Icon={done ? CircleCheckIcon : TriangleAlertIcon}
      onDismiss={onDismiss}
      className="max-w-2xl outline-none focus-visible:focus-ring"
      {...dwell}
    >
      <p>
        {notice.kind === "gone"
          ? t("roadmaps.families.notice.gone")
          : t(`roadmaps.families.notice.${notice.kind}`, { name: notice.name })}
      </p>
    </DismissibleNotice>
  )
}
