import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { useNoticeDwell } from "@/features/auth/use-notice-dwell"

import { writeFailureMessage } from "../write-failure-message"
import type { PublishNotice } from "./pending-changes-store"

export interface PublishOutcomeNoticeProps {
  ref: RefObject<HTMLDivElement | null>
  /** A refused publish is `RefusalNotice`'s. */
  notice: Exclude<PublishNotice, { kind: "refused" }>
  onDismiss: () => void
}

/**
 * A publish's outcome as a page notice: a confirmation clears itself after a dwell; a
 * failure interrupts and stays until dismissed or the next attempt, saying the changes
 * are kept. It shows at the foot, where Publish was pressed (STY-052 D14), and focus
 * comes here when the publish dialog closes.
 */
export function PublishOutcomeNotice({
  ref,
  notice,
  onDismiss,
}: PublishOutcomeNoticeProps) {
  const { t } = useTranslation()
  const published = notice.kind === "published"
  const dwell = useNoticeDwell(published, onDismiss)
  const { action } = notice

  const content = (() => {
    switch (notice.kind) {
      case "published":
        return {
          variant: "success",
          Icon: CircleCheckIcon,
          title: null,
          lines: [
            t(
              action === "publish"
                ? "roadmaps.publish.notice.published"
                : "roadmaps.publish.notice.saved",
            ),
          ],
        } as const
      case "failed":
        return {
          variant: "destructive",
          Icon: CircleAlertIcon,
          title: t(`roadmaps.publish.notice.failed.${action}`),
          lines: [
            writeFailureMessage(t, "publish", notice.error),
            t("roadmaps.publish.notice.kept"),
          ],
        } as const
    }
  })()

  return (
    <DismissibleNotice
      ref={ref}
      tabIndex={-1}
      role={published ? "status" : "alert"}
      variant={content.variant}
      Icon={content.Icon}
      title={content.title}
      onDismiss={onDismiss}
      className="outline-none focus-visible:focus-ring"
      {...dwell}
    >
      {content.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </DismissibleNotice>
  )
}
