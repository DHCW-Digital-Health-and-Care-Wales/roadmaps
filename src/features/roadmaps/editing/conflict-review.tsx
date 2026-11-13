import { TriangleAlertIcon } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { Button } from "@/components/ui/button"
import {
  type FieldConflict,
  isChoiceField,
} from "@/domain/roadmap/roadmap-changes"
import { localise, type LocalisedText } from "@/domain/roadmap/localised-text"
import { isRoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { useLanguage } from "@/i18n"

import { useOrganisations } from "../hooks/use-organisations"
import { describeOrganisations, type OpenConflict } from "./conflicts"
import type { PublishAction } from "./pending-changes-store"
import type { DecisionFocus } from "./use-decision-focus"
import { useRoadmapChoices } from "./use-roadmap-choices"

export interface ConflictReviewProps {
  ref: RefObject<HTMLDivElement | null>
  action: PublishAction
  /** The fields still to decide, in page order. */
  open: readonly OpenConflict[]
  /** The loaded titles of the edited items that are gone. */
  removed: readonly LocalisedText[]
  /** Whether any change is still pending. */
  hasPendingChanges: boolean
  /** The ref for each conflict's Keep mine button, by its key. */
  keepMineRef: DecisionFocus["keepMineRef"]
  onKeepMine: (conflict: FieldConflict) => void
  onUseTheirs: (conflict: FieldConflict) => void
  onDismiss: () => void
}

/**
 * A publish someone else's changes stopped (STY-026): each field they changed that the
 * Product Lead also changed, their text beside the current text (a family or category
 * by its name, a placement by its heading, organisations as `describeOrganisations`
 * names them), to keep or give up one by one; then what
 * was lost with removed items. Nothing was written, so it cannot be dismissed until
 * every field is decided.
 */
export function ConflictReview({
  ref,
  action,
  open,
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
  const shown = (conflict: FieldConflict, value: string) => {
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
          <p>{t(`roadmaps.publish.notice.refused.choose.${action}`)}</p>
          <ul className="mb-4 flex flex-col gap-4">
            {open.map(({ conflict, yours, item, key }) => {
              const target = t("roadmaps.publish.notice.refused.target", {
                subject: item
                  ? localise(item.title, language)
                  : t("roadmaps.about.title"),
                field:
                  conflict.subject === "item"
                    ? t(`roadmaps.edit.itemFields.${conflict.field}`)
                    : t(`roadmaps.edit.roadmapFields.${conflict.field}`),
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
                      value={shown(conflict, yours)}
                    />
                    <ConflictValue
                      label={t("roadmaps.publish.notice.refused.theirs")}
                      value={shown(conflict, conflict.current)}
                    />
                  </dl>
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

function ConflictValue({ label, value }: { label: string; value: string }) {
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
