import { TriangleAlertIcon } from "lucide-react"
import type { ReactNode, RefObject } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { Button } from "@/components/ui/button"
import { detailsOf } from "@/domain/roadmap/item-details"
import { type Conflict, isChoiceField } from "@/domain/roadmap/roadmap-changes"
import { localise, type LocalisedText } from "@/domain/roadmap/localised-text"
import { isRoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { formatCalendarDate, useLanguage } from "@/i18n"

import { DetailList } from "../components/detail-list"
import { useOrganisations } from "../hooks/use-organisations"
import {
  describeOrganisations,
  type OpenConflict,
  type OpenFieldConflict,
  type OpenOrderConflict,
} from "./conflicts"
import { type OrderLine, reviewedOrders } from "./order-review"
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
 * Product Lead also changed (`FieldConflictItem`), and each placement's order
 * (`OrderConflictItem`, STY-050), to keep or give up one by one; then what was lost
 * with removed items. Tags or details that have gained Welsh versions can only be
 * given up (STY-037 S22, STY-039 S19). Nothing was written, so it cannot be dismissed
 * until every one is decided.
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
  const deciding = open.length > 0
  const choosing = open.some(
    (each) => each.kind === "order" || !each.conflict.gainedWelsh,
  )
  const decision = (each: OpenConflict) => ({
    firstButton: keepMineRef(each.key),
    onKeepMine: () => {
      onKeepMine(each.conflict)
    },
    onUseTheirs: () => {
      onUseTheirs(each.conflict)
    },
  })

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
            {open.map((each) =>
              each.kind === "order" ? (
                <OrderConflictItem
                  key={each.key}
                  open={each}
                  pageItems={pageItems}
                  {...decision(each)}
                />
              ) : (
                <FieldConflictItem
                  key={each.key}
                  open={each}
                  {...decision(each)}
                />
              ),
            )}
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

/** What deciding one conflict takes: its first button's ref, and the two choices. */
interface DecisionProps {
  firstButton: (button: HTMLButtonElement | null) => void
  onKeepMine: () => void
  onUseTheirs: () => void
}

/** "Keep mine" and "Use theirs", each named for what it decides (`target`). */
function Decision({
  target,
  firstButton,
  onKeepMine,
  onUseTheirs,
}: DecisionProps & { target: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-3">
      <Button size="sm" ref={firstButton} onClick={onKeepMine}>
        {t("roadmaps.publish.notice.refused.keepMine")}{" "}
        <span className="sr-only">{target}</span>
      </Button>
      <Button size="sm" variant="secondary" onClick={onUseTheirs}>
        {t("roadmaps.publish.notice.refused.useTheirs")}{" "}
        <span className="sr-only">{target}</span>
      </Button>
    </div>
  )
}

/** One conflict of the review: what it is about, the two values, then the choice. */
function ConflictItem({
  target,
  yours,
  theirs,
  children,
}: {
  target: string
  yours: { label: string; value: ReactNode }
  theirs: { label: string; value: ReactNode }
  children: ReactNode
}) {
  return (
    <li className="flex flex-col gap-3 border-t border-border pt-4">
      <p className="font-bold">{target}</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <ConflictValue {...yours} />
        <ConflictValue {...theirs} />
      </dl>
      {children}
    </li>
  )
}

/**
 * A field a co-lead changed too: the Product Lead's value beside the current one, a
 * family or category by its name, a placement by its heading, organisations as
 * `describeOrganisations` names them, a date as the page shows it and details as the
 * nested list they will read as. Tags or details that have gained Welsh versions can
 * only be given up.
 */
function FieldConflictItem({
  open: { conflict, yours, item },
  firstButton,
  onKeepMine,
  onUseTheirs,
}: DecisionProps & { open: OpenFieldConflict }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const { describe } = useRoadmapChoices(
    conflict.subject === "roadmap" && isChoiceField(conflict.field),
  )
  const { data: organisations } = useOrganisations()
  const shown = (value: string): ReactNode => {
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
  const target = t("roadmaps.publish.notice.refused.target", {
    subject: item ? localise(item.title, language) : t("roadmaps.about.title"),
    field:
      conflict.subject === "item"
        ? t(`roadmaps.edit.itemFields.${conflict.field}`)
        : t(`roadmaps.edit.roadmapFields.${conflict.field}`),
  })
  return (
    <ConflictItem
      target={target}
      yours={{
        label: t("roadmaps.publish.notice.refused.yours"),
        value: shown(yours),
      }}
      theirs={{
        label: t("roadmaps.publish.notice.refused.theirs"),
        value: shown(conflict.current),
      }}
    >
      {conflict.gainedWelsh ? (
        <>
          <p>
            {t(
              conflict.field === "details"
                ? "roadmaps.publish.notice.refused.welshDetails"
                : "roadmaps.publish.notice.refused.welshTags",
            )}
          </p>
          <div>
            <Button
              size="sm"
              variant="secondary"
              ref={firstButton}
              onClick={onUseTheirs}
            >
              {t("roadmaps.publish.notice.refused.discardMine")}{" "}
              <span className="sr-only">{target}</span>
            </Button>
          </div>
        </>
      ) : (
        <Decision
          target={target}
          firstButton={firstButton}
          onKeepMine={onKeepMine}
          onUseTheirs={onUseTheirs}
        />
      )}
    </ConflictItem>
  )
}

/**
 * A placement's order a co-lead changed too: the order "Keep mine" would publish
 * beside the current one, each a numbered list of titles (STY-050 S11).
 */
function OrderConflictItem({
  open: { conflict },
  pageItems,
  firstButton,
  onKeepMine,
  onUseTheirs,
}: DecisionProps & {
  open: OpenOrderConflict
  pageItems: readonly PageItem[]
}) {
  const { t } = useTranslation()
  const target = t("roadmaps.publish.notice.refused.target", {
    subject: t(`roadmaps.items.placements.${conflict.placement}`),
    field: t("roadmaps.publish.notice.refused.orderField"),
  })
  const orders = reviewedOrders(conflict, pageItems)
  return (
    <ConflictItem
      target={target}
      yours={{
        label: t("roadmaps.publish.notice.refused.yourOrder"),
        value: <OrderList lines={orders.yours} />,
      }}
      theirs={{
        label: t("roadmaps.publish.notice.refused.currentOrder"),
        value: <OrderList lines={orders.theirs} />,
      }}
    >
      <Decision
        target={target}
        firstButton={firstButton}
        onKeepMine={onKeepMine}
        onUseTheirs={onUseTheirs}
      />
    </ConflictItem>
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
