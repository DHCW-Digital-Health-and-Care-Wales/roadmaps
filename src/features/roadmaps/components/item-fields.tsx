import { TriangleAlertIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { localise, type LocalisedText } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { useLanguage } from "@/i18n"
import { cn } from "@/lib/utils"

import { localiseDetails } from "../localise-details"
import { shortNamesOf } from "../sort-organisations"
import { CutDetails, CutField } from "./cut-field"

/** Each field's label, in the order the fields are shown. */
const fieldLabels = {
  phase: "roadmaps.items.fields.phase",
  description: "roadmaps.items.fields.description",
  expectedOutcome: "roadmaps.items.fields.expectedOutcome",
  tags: "roadmaps.items.fields.tags",
  organisations: "roadmaps.items.fields.organisations",
  details: "roadmaps.items.fields.details",
} as const

export interface ItemFieldsProps {
  item: RoadmapItem
  /** The organisation list, which the item's `organisationIds` name (ADR-014). */
  organisations: readonly Organisation[]
  /** In two columns, as a desktop's opened row shows them (STY-067 S6). */
  columns?: boolean
}

/**
 * Each field an item has but its title, under a label, with no empty labels, each cut
 * after three lines with "Show more" to read the rest (STY-066): as a card shows them,
 * and an opened row of the compact view (STY-067 S6, S7). Text keeps its line breaks;
 * its organisations show by short name, the national one first (ADR-014). Nothing
 * where the item has no field.
 */
export function ItemFields({
  item,
  organisations,
  columns = false,
}: ItemFieldsProps) {
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

  if (fields.length === 0) return null
  return (
    <dl
      className={cn(
        "text-body-xs",
        columns
          ? "max-w-190 columns-2 gap-8 *:mb-2.5 *:break-inside-avoid"
          : "flex flex-col gap-2.5",
      )}
    >
      {fields.map(({ key, value }) => (
        <div key={key} className="flex flex-col gap-0.5">
          <dt className="font-bold">{t(fieldLabels[key])}</dt>
          <dd className="wrap-break-word whitespace-pre-line">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * What is wrong with an unplaced item's horizon, as written (STY-021 D4): none, or one
 * the public site does not recognise.
 */
export function HorizonFlag({ writtenHorizon }: { writtenHorizon: string }) {
  const { t } = useTranslation()
  return (
    <Badge variant="warning">
      <TriangleAlertIcon data-icon="inline-start" aria-hidden="true" />
      {writtenHorizon === ""
        ? t("roadmaps.items.unplaced.noHorizon")
        : t("roadmaps.items.unplaced.unknownHorizon", {
            horizon: writtenHorizon,
          })}
    </Badge>
  )
}
