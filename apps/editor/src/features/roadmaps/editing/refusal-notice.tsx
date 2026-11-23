import { TriangleAlertIcon } from "lucide-react"
import type { RefObject } from "react"
import { Trans, useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { Button } from "@/components/ui/button"
import type { ItemTarget } from "@/domain/roadmap/roadmap-changes"

import { ContentText } from "../components/content-text"
import type { PublishAction } from "./pending-changes-store"

export interface RefusalNoticeProps {
  ref: RefObject<HTMLDivElement | null>
  action: PublishAction
  /** Whether a field or order someone else changed is still to decide. */
  deciding: boolean
  /** The edited items that are gone, as loaded. */
  removed: readonly ItemTarget[]
  /** Whether any change is still pending. */
  hasPendingChanges: boolean
  /** Opens the review of what is still to decide. */
  onReview: () => void
  onDismiss: () => void
}

/**
 * A publish someone else's changes stopped (STY-026), as a notice at the foot (STY-052
 * D14): nothing was written. While a field or order is still to decide, "Review the
 * changes" opens the review in a dialog, so the page does not move (D12), and the
 * notice can't be dismissed. Once none is, it names what was lost with removed items
 * until dismissed (D17, D23).
 */
export function RefusalNotice({
  ref,
  action,
  deciding,
  removed,
  hasPendingChanges,
  onReview,
  onDismiss,
}: RefusalNoticeProps) {
  const { t } = useTranslation()
  return (
    <DismissibleNotice
      ref={ref}
      tabIndex={-1}
      role="alert"
      variant="warning"
      Icon={TriangleAlertIcon}
      title={t(
        deciding
          ? "roadmaps.publish.notice.refused.title"
          : "roadmaps.publish.notice.refused.partialTitle",
      )}
      action={
        deciding && (
          <Button size="sm" variant="secondary" onClick={onReview}>
            {t("roadmaps.publish.notice.refused.review")}
          </Button>
        )
      }
      {...(deciding ? {} : { onDismiss })}
      className="outline-none focus-visible:focus-ring"
    >
      <p>{t(`roadmaps.publish.notice.refused.nothing.${action}`)}</p>
      {!deciding && (
        <RemovedItems removed={removed} hasPendingChanges={hasPendingChanges} />
      )}
    </DismissibleNotice>
  )
}

export interface RemovedItemsProps {
  /** The edited items that are gone, as loaded. */
  removed: readonly ItemTarget[]
  /** Whether any change is still pending, which is then said to be kept. */
  hasPendingChanges: boolean
}

/** Each removed item whose changes couldn't be kept, then that the others are. */
export function RemovedItems({
  removed,
  hasPendingChanges,
}: RemovedItemsProps) {
  const { t } = useTranslation()
  return (
    <>
      {removed.map(({ item, position }) => (
        // Known as a conflict is: by its ID, or with none by its place as loaded. Two
        // may share a title, and an item kept from an earlier read may share a place.
        <p key={item.id ?? `at-${String(position)}`}>
          <Trans
            i18nKey="roadmaps.publish.notice.refused.removed"
            components={{ title: <ContentText value={item.title} /> }}
          />
        </p>
      ))}
      {removed.length > 0 && hasPendingChanges && (
        <p>{t("roadmaps.publish.notice.refused.otherKept")}</p>
      )}
    </>
  )
}
