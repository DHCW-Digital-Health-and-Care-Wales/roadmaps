import { TriangleAlertIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { localise, type LocalisedText } from "@/domain/roadmap/localised-text"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { useLanguage, type Language } from "@/i18n"

import { nestItemDetails, type NestedItemDetail } from "../nest-item-details"
import { organisationCodes } from "../organisation-codes"

export interface RoadmapItemCardProps {
  item: RoadmapItem
}

/**
 * A roadmap item as plain text (ADR-011): its title as a heading, then each field it has
 * under a label, with no empty labels. Text keeps its line breaks; an unplaced item says
 * what is wrong with its horizon. A list item, for a list of items.
 */
export function RoadmapItemCard({ item }: RoadmapItemCardProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const text = (value: LocalisedText) => localise(value, language)

  const fields: { key: string; label: string; value: ReactNode }[] = []
  const add = (key: keyof typeof fieldLabels, value: ReactNode) => {
    fields.push({ key, label: t(fieldLabels[key]), value })
  }
  if (item.phase) add("phase", text(item.phase))
  if (item.description) add("description", text(item.description))
  if (item.expectedOutcome) add("expectedOutcome", text(item.expectedOutcome))
  if (item.tags.length > 0) add("tags", item.tags.map(text).join(", "))
  if (item.organisations.length > 0) {
    add(
      "organisations",
      item.organisations.map((code) => organisationCodes[code]).join(", "),
    )
  }
  if (item.details.length > 0) {
    add(
      "details",
      <DetailList nodes={nestItemDetails(item.details)} language={language} />,
    )
  }

  return (
    <li className="flex flex-col gap-3 border bg-card p-4 text-card-foreground shadow-card-bar">
      <h3 className="text-heading-xs wrap-break-word whitespace-pre-line">
        {text(item.title)}
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
          {fields.map(({ key, label, value }) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="font-bold">{label}</dt>
              <dd className="wrap-break-word whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

const fieldLabels = {
  phase: "roadmaps.items.fields.phase",
  description: "roadmaps.items.fields.description",
  expectedOutcome: "roadmaps.items.fields.expectedOutcome",
  tags: "roadmaps.items.fields.tags",
  organisations: "roadmaps.items.fields.organisations",
  details: "roadmaps.items.fields.details",
} as const

function DetailList({
  nodes,
  language,
}: {
  nodes: readonly NestedItemDetail[]
  language: Language
}) {
  return (
    <ul className="list-disc pl-5 [&_ul]:mt-0.5">
      {nodes.map(({ detail, children }, index) => (
        // Details have no identity; their order is fixed for a render.
        <li key={index}>
          {localise(detail.text, language)}
          {children.length > 0 && (
            <DetailList nodes={children} language={language} />
          )}
        </li>
      ))}
    </ul>
  )
}
