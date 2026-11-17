import { TriangleAlertIcon } from "lucide-react"
import type { ReactNode, RefObject } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { Button } from "@/components/ui/button"
import { detailsOf } from "@/domain/roadmap/item-details"
import {
  type Conflict,
  type FieldConflict,
  isChoiceField,
} from "@/domain/roadmap/roadmap-changes"
import { localise, type LocalisedText } from "@/domain/roadmap/localised-text"
import { isRoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { formatCalendarDate, useLanguage } from "@/i18n"

import { DetailList } from "../components/detail-list"
import { useOrganisations } from "../hooks/use-organisations"
import {
  describeOrganisations,
  type OpenConflict,
  type OrderLine,
  reviewedOrders,
} from "./conflicts"
import type { PageItem } from "./page-items"
import type { PublishAction } from "./pending-changes-store"
import type { DecisionFocus } from "./use-decision-focus"
import { useRoadmapChoices } from "./use-roadmap-choices"

export interface ConflictReviewProps {
  ref: RefObject<HTMLDivElement | null>
  action: PublishAction
  /** The fields and orders still to decide, in page order. */
  open: readonly OpenConflict[]
  /** The page's items, which an order's items are drawn from (`reviewedOrders`). */
  pageItems: readonly PageItem[]
  /** The loaded titles of the edited items that are gone. */
  removed: readonly LocalisedText[]
  /** Whether any change is still pending. */
  hasPendingChanges: boolean
  /** The ref for each conflict's first button, Keep mine or its like, by its key. */
  keepMineRef: DecisionFocus["keepMineRef"]
  onKeepMine: (conflict: Conflict) => void
  onUseTheirs: (conflict: Conflict) => void
  onDismiss: () => void
}

/**
 * A publish someone else's changes stopped (STY-026): each field they changed that the
 * Product Lead also changed, their text beside the current text (a family or category
 * by its name, a placement by its heading, organisations as `describeOrganisations`
 * names them, a date as the page shows it, details as the nested list they will read
 * as), to keep or give up one by one; then what was lost with removed items. A
 * placement's order they changed is one of them: the order "Keep mine" would publish
 * beside the current one, each a numbered list of titles (STY-050 S11). Tags or
 * details that have gained Welsh versions can only be given up (STY-037 S22, STY-039
 * S19). Nothing was written, so it cannot be dismissed until every one is decided.
 */
export function ConflictReview({
  ref,
  action,
  open,
  pageItems,
  removed,
  hasPendingChanges,
  keepMineRef,
  onKeepMine,
  onUseTheirs,
  onDismiss,
}: ConflictReviewProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const { describe } = useRoadmapChoices(
    open.some(
      ({ conflict }) =>
        conflict.subject === "roadmap" && isChoiceField(conflict.field),
    ),
  )
  const { data: organisations } = useOrganisations()
  const deciding = open.length > 0
  const choosing = open.some(
    ({ conflict }) => conflict.subject === "order" || !conflict.gainedWelsh,
  )
  const shown = (conflict: FieldConflict, value: string): ReactNode => {
    if (conflict.subject === "item" && conflict.field === "details") {
      // None reads "No text", as any other field does.
      return value === "" ? "" : <DetailList details={detailsOf(value)} />
    }
    if (conflict.subject === "roadmap" && isChoiceField(conflict.field)) {
      return describe(conflict.field, value)
    }
    if (conflict.subject === "item" && conflict.field === "placement") {
      return isRoadmapPlacement(value)
        ? t(`roadmaps.items.placements.${value}`)
        : t("roadmaps.items.unplaced.title")
    }
    if (conflict.subject === "item" && conflict.field === "organisationIds") {
      return describeOrganisations(value, organisations, language)
    }
    if (conflict.subject === "roadmap" && conflict.field === "lastUpdated") {
      return formatCalendarDate(value, t) ?? value
    }
    return value
  }

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
      {...(deciding ? {} : { onDismiss })}
      className="max-w-2xl outline-none focus-visible:focus-ring"
    >
      <p>{t(`roadmaps.publish.notice.refused.nothing.${action}`)}</p>
      {deciding && (
        <>
          {choosing && (
            <p>{t(`roadmaps.publish.notice.refused.choose.${action}`)}</p>
          )}
          <ul className="mb-4 flex flex-col gap-4">
            {open.map((each) => {
              const { conflict, key } = each
              const choice = (target: string) => (
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    ref={keepMineRef(key)}
                    onClick={() => {
                      onKeepMine(conflict)
                    }}
                  >
                    {t("roadmaps.publish.notice.refused.keepMine")}{" "}
                    <span className="sr-only">{target}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onUseTheirs(conflict)
                    }}
                  >
                    {t("roadmaps.publish.notice.refused.useTheirs")}{" "}
                    <span className="sr-only">{target}</span>
                  </Button>
                </div>
              )
              if ("item" in each) {
                const { yours, item } = each
                const target = t("roadmaps.publish.notice.refused.target", {
                  subject: item
                    ? localise(item.title, language)
                    : t("roadmaps.about.title"),
                  field:
                    each.conflict.subject === "item"
                      ? t(`roadmaps.edit.itemFields.${each.conflict.field}`)
                      : t(`roadmaps.edit.roadmapFields.${each.conflict.field}`),
                })
                return (
                  <li
                    key={key}
                    className="flex flex-col gap-3 border-t border-border pt-4"
                  >
                    <p className="font-bold">{target}</p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <ConflictValue
                        label={t("roadmaps.publish.notice.refused.yours")}
                        value={shown(each.conflict, yours)}
                      />
                      <ConflictValue
                        label={t("roadmaps.publish.notice.refused.theirs")}
                        value={shown(each.conflict, each.conflict.current)}
                      />
                    </dl>
                    {each.conflict.gainedWelsh ? (
                      <>
                        <p>
                          {t(
                            each.conflict.field === "details"
                              ? "roadmaps.publish.notice.refused.welshDetails"
                              : "roadmaps.publish.notice.refused.welshTags",
                          )}
                        </p>
                        <div>
                          <Button
                            size="sm"
                            variant="secondary"
                            ref={keepMineRef(key)}
                            onClick={() => {
                              onUseTheirs(conflict)
                            }}
                          >
                            {t("roadmaps.publish.notice.refused.discardMine")}{" "}
                            <span className="sr-only">{target}</span>
                          </Button>
                        </div>
                      </>
                    ) : (
                      choice(target)
                    )}
                  </li>
                )
              }
              const target = t("roadmaps.publish.notice.refused.target", {
                subject: t(
                  `roadmaps.items.placements.${each.conflict.placement}`,
                ),
                field: t("roadmaps.publish.notice.refused.orderField"),
              })
              const orders = reviewedOrders(each.conflict, pageItems)
              return (
                <li
                  key={key}
                  className="flex flex-col gap-3 border-t border-border pt-4"
                >
                  <p className="font-bold">{target}</p>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <ConflictValue
                      label={t("roadmaps.publish.notice.refused.yourOrder")}
                      value={<OrderList lines={orders.yours} />}
                    />
                    <ConflictValue
                      label={t("roadmaps.publish.notice.refused.currentOrder")}
                      value={<OrderList lines={orders.theirs} />}
                    />
                  </dl>
                  {choice(target)}
                </li>
              )
            })}
          </ul>
        </>
      )}
      {removed.map((title, index) => (
        // Two removed items may share a title.
        <p key={index}>
          {t("roadmaps.publish.notice.refused.removed", {
            title: localise(title, language),
          })}
        </p>
      ))}
      {removed.length > 0 && hasPendingChanges && (
        <p>{t("roadmaps.publish.notice.refused.otherKept")}</p>
      )}
    </DismissibleNotice>
  )
}

/** A placement's items in an order, numbered: none reads "No items". */
function OrderList({ lines }: { lines: readonly OrderLine[] }) {
  const { t } = useTranslation()
  const language = useLanguage()
  if (lines.length === 0) return <i>{t("roadmaps.items.noneInPlacement")}</i>
  return (
    <ol className="flex list-decimal flex-col gap-1 pl-6">
      {lines.map(({ key, title }) => (
        <li key={key} className="wrap-break-word">
          {localise(title, language)}
        </li>
      ))}
    </ol>
  )
}

function ConflictValue({ label, value }: { label: string; value: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1 border border-border bg-card p-3">
      <dt className="font-bold">{label}</dt>
      <dd className="whitespace-pre-line">
        {value === "" ? (
          <i>{t("roadmaps.publish.notice.refused.empty")}</i>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
