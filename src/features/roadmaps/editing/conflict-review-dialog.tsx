import { UploadIcon } from "lucide-react"
import { type ReactNode, useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { RemovedItems } from "./refusal-notice"
import { useDecisionFocus } from "./use-decision-focus"
import { useRoadmapChoices } from "./use-roadmap-choices"

export interface ConflictReviewDialogProps {
  open: boolean
  onClose: () => void
  /** Called once the dialog has finished closing. */
  onClosed: () => void
  /** Where focus goes as the dialog closes: `true` back to what opened it. */
  finalFocus: () => HTMLElement | boolean
  action: PublishAction
  /** The fields and orders still to decide, in page order. */
  conflicts: readonly OpenConflict[]
  /** The page's items, which an order's items are drawn from (`reviewedOrders`). */
  pageItems: readonly PageItem[]
  /** The loaded titles of the edited items that are gone. */
  removed: readonly LocalisedText[]
  /** Whether any change is still pending. */
  hasPendingChanges: boolean
  onKeepMine: (conflict: Conflict) => void
  onUseTheirs: (conflict: Conflict) => void
  /** "Publish changes", once every one is decided: closes the review to publish. */
  onPublish: () => void
}

/**
 * The review of a publish someone else's changes stopped (STY-026), in a dialog over
 * the page, which does not move (STY-052 D12): each field they changed that the
 * Product Lead also changed (`FieldConflictItem`), and each placement's order
 * (`OrderConflictItem`, STY-050), to keep or give up one by one, focus starting on the
 * first's Keep mine and moving to the next's as each is decided (D18). Tags or details
 * that have gained Welsh versions can only be given up (STY-037 S22, STY-039 S19). Once
 * every one is decided it names what was lost with removed items (D17) and says so,
 * with "Publish changes", focused, while anything is left to publish (D16), or Close
 * alone (D22).
 */
export function ConflictReviewDialog({
  open,
  onClose,
  onClosed,
  finalFocus,
  action,
  conflicts,
  pageItems,
  removed,
  hasPendingChanges,
  onKeepMine,
  onUseTheirs,
  onPublish,
}: ConflictReviewDialogProps) {
  const { t } = useTranslation()
  const deciding = conflicts.length > 0
  const choosing = conflicts.some(
    (each) => each.kind === "order" || !each.conflict.gainedWelsh,
  )
  const publish = useRef<HTMLButtonElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const focus = useDecisionFocus(
    conflicts,
    () => publish.current ?? close.current,
  )
  const decision = (each: OpenConflict) => ({
    firstButton: focus.keepMineRef(each.key),
    onKeepMine: () => {
      focus.decided(each.conflict)
      onKeepMine(each.conflict)
    },
    onUseTheirs: () => {
      focus.decided(each.conflict)
      onUseTheirs(each.conflict)
    },
  })
  const description: string[] = [
    t(`roadmaps.publish.notice.refused.nothing.${action}`),
  ]
  if (deciding && choosing) {
    description.push(t(`roadmaps.publish.notice.refused.choose.${action}`))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      onOpenChangeComplete={(next) => {
        if (!next) onClosed()
      }}
    >
      <DialogContent
        initialFocus={() => focus.firstOpen() ?? true}
        finalFocus={finalFocus}
      >
        <DialogHeader>
          <DialogTitle>
            {t(
              deciding || removed.length === 0
                ? "roadmaps.publish.notice.refused.title"
                : "roadmaps.publish.notice.refused.partialTitle",
            )}
          </DialogTitle>
          <DialogDescription>{description.join(" ")}</DialogDescription>
        </DialogHeader>
        {deciding && (
          <ul className="flex flex-col gap-4">
            {conflicts.map((each) =>
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
        )}
        {!deciding && (
          <>
            <RemovedItems
              removed={removed}
              hasPendingChanges={hasPendingChanges}
            />
            <p className="font-bold">
              {t(
                hasPendingChanges
                  ? `roadmaps.publish.notice.refused.decided.${action}`
                  : `roadmaps.publish.notice.refused.nothingLeft.${action}`,
              )}
            </p>
          </>
        )}
        <DialogFooter>
          {!deciding && hasPendingChanges && (
            <Button ref={publish} onClick={onPublish}>
              <UploadIcon data-icon="inline-start" aria-hidden="true" />
              {t(`roadmaps.publish.action.${action}`)}
            </Button>
          )}
          <DialogClose
            ref={close}
            variant={!deciding && !hasPendingChanges ? "default" : "secondary"}
          >
            {t("common.close")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    subject: item
      ? localise(item.title, language)
      : t("roadmaps.productDetails.title"),
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
