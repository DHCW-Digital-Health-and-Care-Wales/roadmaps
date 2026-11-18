import { TriangleAlertIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { localise, type LocalisedText } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { useLanguage } from "@/i18n"

import { localiseDetails } from "../localise-details"
import { shortNamesOf } from "../sort-organisations"
import { CutDetails, CutField } from "./cut-field"

export interface RoadmapItemCardProps {
  item: RoadmapItem
  /** The organisation list, which the item's `organisationIds` name (ADR-014). */
  organisations: readonly Organisation[]
  /** Controls at the foot of the card, such as Edit. */
  actions?: ReactNode
}

/** Each field's label, in the order a card shows the fields. */
const fieldLabels = {
  phase: "roadmaps.items.fields.phase",
  description: "roadmaps.items.fields.description",
  expectedOutcome: "roadmaps.items.fields.expectedOutcome",
  tags: "roadmaps.items.fields.tags",
  organisations: "roadmaps.items.fields.organisations",
  details: "roadmaps.items.fields.details",
} as const

/**
 * A roadmap item as plain text (ADR-011): its title as a heading, then each field it has
 * under a label, with no empty labels, each cut after three lines with "Show more" to
 * read the rest (STY-066). Text keeps its line breaks; its organisations
 * show by short name, the national one first (ADR-014); an unplaced item says what is
 * wrong with its horizon. A list item, for a list of items.
 */
export function RoadmapItemCard({
  item,
  organisations,
  actions,
}: RoadmapItemCardProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const text = (value: LocalisedText) => localise(value, language)
  const title = text(item.title)

  const fields: { key: keyof typeof fieldLabels; value: ReactNode }[] = []
  /** What a button under a cut field says it shows more of, for assistive technology. */
  const cutSubject = (key: keyof typeof fieldLabels) =>
    t(`roadmaps.items.cut.of.${key}`, { item: title })
  // A text, cut after three lines when it runs past them.
  const addText = (key: keyof typeof fieldLabels, value: string) => {
    fields.push({
      key,
      value: <CutField subject={cutSubject(key)}>{value}</CutField>,
    })
  }
  if (item.phase) addText("phase", text(item.phase))
  if (item.description) addText("description", text(item.description))
  if (item.expectedOutcome) {
    addText("expectedOutcome", text(item.expectedOutcome))
  }
  if (item.tags.length > 0) addText("tags", item.tags.map(text).join(", "))
  const named = shortNamesOf(organisations, item.organisationIds, language)
  if (named.length > 0) addText("organisations", named.join(", "))
  if (item.details.length > 0) {
    fields.push({
      key: "details",
      value: (
        <CutDetails
          details={localiseDetails(item.details, language)}
          subject={cutSubject("details")}
        />
      ),
    })
  }

  return (
    <li className="flex flex-col gap-3 border bg-card p-4 text-card-foreground shadow-card-bar">
      <h3 className="text-heading-xs wrap-break-word whitespace-pre-line">
        {title}
      </h3>
      {item.writtenHorizon !== null && (
        <Badge variant="warning">
          <TriangleAlertIcon data-icon="inline-start" aria-hidden="true" />
          {item.writtenHorizon === ""
            ? t("roadmaps.items.unplaced.noHorizon")
            : t("roadmaps.items.unplaced.unknownHorizon", {
                horizon: item.writtenHorizon,
              })}
        </Badge>
      )}
      {fields.length > 0 && (
        <dl className="flex flex-col gap-2.5 text-body-xs">
          {fields.map(({ key, value }) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="font-bold">{t(fieldLabels[key])}</dt>
              <dd className="wrap-break-word whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && <div className="mt-auto pt-1">{actions}</div>}
    </li>
  )
}
