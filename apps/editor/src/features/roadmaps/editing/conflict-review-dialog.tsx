import { UploadIcon } from "lucide-react"
import { type ReactNode, useRef } from "react"
import { Trans, useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { detailsOf } from "@/domain/roadmap/item-details"
import {
  type Conflict,
  type EditableItemField,
  isChoiceField,
} from "@/domain/roadmap/roadmap-changes"
import { localise, type LocalisedText } from "@/domain/roadmap/localised-text"
import { isRoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { formatCalendarDate, useLanguage } from "@/i18n"

import { ContentText, ShownText } from "../components/content-text"
import { DetailList } from "../components/detail-list"
import { FieldName } from "../components/field-name"
import { useOrganisations } from "../hooks/use-organisations"
import {
  describeOrganisations,
  type OpenConflict,
  type OpenFieldConflict,
  type OpenOrderConflict,
  type OpenRemovalConflict,
  removalFieldNotes,
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
  /** The fields, orders and removals still to decide, in page order. */
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
 * Product Lead also changed (`FieldConflictItem`), each placement's order
 * (`OrderConflictItem`, STY-050) and each item removed that they changed
 * (`RemovalConflictItem`, STY-049 S6), to keep or give up one by one, focus starting
 * on the first's Keep mine and moving to the next's as each is decided (D18). Tags or
 * details that have gained Welsh versions can only be given up (STY-037 S22, STY-039
 * S19). Once every one is decided it names what was lost with removed items (D17) and
 * says so, with "Publish changes", focused, while anything is left to publish (D16), or
 * Close alone (D22).
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
    (each) => each.kind !== "field" || !each.conflict.gainedWelsh,
  )
  const publishRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const focus = useDecisionFocus(
    conflicts,
    () => publishRef.current ?? closeRef.current,
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
        closeLabel={t("common.close")}
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
        <DialogBody>
          {deciding && (
            <ul className="flex flex-col gap-4">
              {conflicts.map((each) => {
                switch (each.kind) {
                  case "order":
                    return (
                      <OrderConflictItem
                        key={each.key}
                        open={each}
                        pageItems={pageItems}
                        {...decision(each)}
                      />
                    )
                  case "removal":
                    return (
                      <RemovalConflictItem
                        key={each.key}
                        open={each}
                        {...decision(each)}
                      />
                    )
                  default:
                    return (
                      <FieldConflictItem
                        key={each.key}
                        open={each}
                        {...decision(each)}
                      />
                    )
                }
              })}
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
        </DialogBody>
        <DialogFooter>
          {!deciding && hasPendingChanges && (
            <Button ref={publishRef} onClick={onPublish}>
              <UploadIcon data-icon="inline-start" aria-hidden="true" />
              {t(`roadmaps.publish.action.${action}`)}
            </Button>
          )}
          <DialogClose
            ref={closeRef}
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

/**
 * "Keep mine" and "Use theirs", or what `labels` calls them, each named for what it
 * decides (`target`).
 */
function Decision({
  target,
  labels,
  firstButton,
  onKeepMine,
  onUseTheirs,
}: DecisionProps & {
  target: string
  labels?: { keepMine: string; useTheirs: string }
}) {
  const { t } = useTranslation()
  const { keepMine, useTheirs } = labels ?? {
    keepMine: t("roadmaps.publish.notice.refused.keepMine"),
    useTheirs: t("roadmaps.publish.notice.refused.useTheirs"),
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Button size="sm" ref={firstButton} onClick={onKeepMine}>
        {keepMine} <span className="sr-only">{target}</span>
      </Button>
      <Button size="sm" variant="secondary" onClick={onUseTheirs}>
        {useTheirs} <span className="sr-only">{target}</span>
      </Button>
    </div>
  )
}

/** A conflict's lead-in, as `conflictTarget` shows it and as plain words. */
interface TargetLead {
  shown: ReactNode
  plain: string
}

/**
 * The lead-in naming what a conflict is about, "First item:": `shown` with an item's
 * title marked where it is English in Welsh, and `plain` the same words, for the
 * buttons' hidden words, which can't mark a part of themselves (ADR-008).
 */
function useTargetLead(): (subject: LocalisedText | string) => TargetLead {
  const { t } = useTranslation()
  const language = useLanguage()
  const key = "roadmaps.publish.notice.refused.targetLead"
  return (subject) => {
    // The catalogue places the subject as an element, `<subject />`; as plain words,
    // its text stands there.
    const plain = t(key, {
      subject:
        typeof subject === "string" ? subject : localise(subject, language),
      interpolation: { prefix: "<", suffix: " />" },
    })
    return {
      plain,
      shown:
        typeof subject === "string" ? (
          plain
        ) : (
          <Trans
            i18nKey={key}
            components={{ subject: <ContentText value={subject} /> }}
          />
        ),
    }
  }
}

/**
 * What a conflict is about, as its lead-in and the name of its field make it: `shown`
 * in the line above the values, with the field's icon before the name when it has one,
 * and `plain`, the same words alone, for the buttons' hidden words (STY-079 D2, D5).
 */
function conflictTarget(lead: TargetLead, name: string, field?: string) {
  return {
    shown: (
      <>
        {lead.shown} <FieldName field={field}>{name}</FieldName>
      </>
    ),
    plain: `${lead.plain} ${name}`,
  }
}

/** One conflict of the review: what it is about, the two values, then the choice. */
function ConflictItem({
  target,
  yours,
  theirs,
  children,
}: {
  target: ReactNode
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
  const targetLead = useTargetLead()
  const { describe } = useRoadmapChoices(
    conflict.subject === "roadmap" && isChoiceField(conflict.field),
  )
  const itemValue = useShownItemValue()
  const shown = (value: string): ReactNode => {
    if (conflict.subject === "item") return itemValue(conflict.field, value)
    if (isChoiceField(conflict.field)) {
      return <ShownText content={describe(conflict.field, value)} />
    }
    if (conflict.field === "lastUpdated") {
      return formatCalendarDate(value, t) ?? value
    }
    return value
  }
  const target = conflictTarget(
    targetLead(item ? item.title : t("roadmaps.productDetails.title")),
    conflict.subject === "item"
      ? t(`roadmaps.edit.itemFields.${conflict.field}`)
      : t(`roadmaps.edit.roadmapFields.${conflict.field}`),
    // A roadmap's field never has an icon.
    conflict.subject === "item" ? conflict.field : undefined,
  )
  return (
    <ConflictItem
      target={target.shown}
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
              <span className="sr-only">{target.plain}</span>
            </Button>
          </div>
        </>
      ) : (
        <Decision
          target={target.plain}
          firstButton={firstButton}
          onKeepMine={onKeepMine}
          onUseTheirs={onUseTheirs}
        />
      )}
    </ConflictItem>
  )
}

/**
 * An item's field's value as the review shows it: details as the nested list they will
 * read as, a placement by its heading, organisations as `describeOrganisations` names
 * them, with any codes the list doesn't know, and text as it is.
 */
function useShownItemValue(): (
  field: EditableItemField,
  value: string,
  unknownCodes?: readonly string[],
) => ReactNode {
  const { t } = useTranslation()
  const language = useLanguage()
  const { data: organisations } = useOrganisations()
  return (field, value, unknownCodes = []) => {
    switch (field) {
      case "details":
        // None reads "No text", as any other field does.
        return value === "" ? "" : <DetailList details={detailsOf(value)} />
      case "placement":
        return isRoadmapPlacement(value)
          ? t(`roadmaps.items.placements.${value}`)
          : t("roadmaps.items.unplaced.title")
      case "organisationIds":
        return [
          describeOrganisations(value, organisations, language),
          ...unknownCodes,
        ]
          .filter((each) => each !== "")
          .join(", ")
      default:
        return value
    }
  }
}

/**
 * An item removed that a co-lead changed (STY-049 S6): "Removed", the Product Lead's
 * change, beside each field they changed, as it now reads, with "Remove anyway" and
 * "Keep the item". A field whose value reads as it did changed in what only the item
 * shows, such as its Welsh, and is listed all the same.
 */
function RemovalConflictItem({
  open: { conflict },
  firstButton,
  onKeepMine,
  onUseTheirs,
}: DecisionProps & { open: OpenRemovalConflict }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const itemValue = useShownItemValue()
  const target = localise(conflict.removal.item.title, language)
  return (
    <ConflictItem
      target={<ContentText value={conflict.removal.item.title} />}
      yours={{
        label: t("roadmaps.publish.notice.refused.yours"),
        value: t("roadmaps.publish.notice.refused.removal.yours"),
      }}
      theirs={{
        label: t("roadmaps.publish.notice.refused.theirs"),
        value: (
          <dl className="flex flex-col gap-2">
            {conflict.fields.map(({ field, current }) => {
              const notes = removalFieldNotes(conflict, field)
              return (
                <div key={field} className="flex flex-col gap-0.5">
                  <dt className="font-bold">
                    <FieldName field={field}>
                      {t(`roadmaps.edit.itemFields.${field}`)}
                    </FieldName>
                  </dt>
                  <dd>
                    {current === "" && !notes.unknownCodes ? (
                      <i>{t("roadmaps.publish.notice.refused.empty")}</i>
                    ) : (
                      itemValue(field, current, notes.unknownCodes)
                    )}
                  </dd>
                  {notes.writtenHorizon !== undefined && (
                    <dd>
                      {t("roadmaps.publish.notice.refused.removal.writtenAs", {
                        horizon: notes.writtenHorizon,
                      })}
                    </dd>
                  )}
                  {notes.welsh !== undefined && (
                    <dd className="whitespace-pre-line">
                      {t("roadmaps.publish.notice.refused.removal.welsh", {
                        text:
                          notes.welsh ||
                          t("roadmaps.publish.notice.refused.empty"),
                      })}
                    </dd>
                  )}
                </div>
              )
            })}
          </dl>
        ),
      }}
    >
      <Decision
        target={target}
        labels={{
          keepMine: t("roadmaps.publish.notice.refused.removal.removeAnyway"),
          useTheirs: t("roadmaps.publish.notice.refused.removal.keepItem"),
        }}
        firstButton={firstButton}
        onKeepMine={onKeepMine}
        onUseTheirs={onUseTheirs}
      />
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
  const targetLead = useTargetLead()
  const target = conflictTarget(
    targetLead(t(`roadmaps.items.placements.${conflict.placement}`)),
    t("roadmaps.publish.notice.refused.orderField"),
  )
  const orders = reviewedOrders(conflict, pageItems)
  return (
    <ConflictItem
      target={target.shown}
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
        target={target.plain}
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
  if (lines.length === 0) return <i>{t("roadmaps.items.noneInPlacement")}</i>
  return (
    <ol className="flex list-decimal flex-col gap-1 pl-6">
      {lines.map(({ key, title }) => (
        <li key={key} className="wrap-break-word">
          <ContentText value={title} />
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
