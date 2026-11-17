import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { type ReactNode, useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { formatCalendarDate, useLanguage } from "@/i18n"

import { ChangedTag } from "../editing/edit-controls"
import { RoadmapSwatch } from "./roadmap-swatch"

type AboutField =
  | "statusLabel"
  | "productLead"
  | "family"
  | "category"
  | "vision"
  | "serviceDescription"

export interface RoadmapAboutProps {
  roadmap: Roadmap
  /** It has a pending change, which the folded line tags "Changed" (STY-053 S6). */
  changed?: boolean
  /** Controls beside the heading, such as Edit, as they suit the panel folded or open. */
  actions?: (open: boolean) => ReactNode
}

/**
 * What the roadmap is about (STY-024), in a panel with its controls beside the heading
 * (STY-042 S1). It opens folded to one line (STY-053 S6, D2): its status, product lead
 * and when it was last updated, each only when it has one, and a Changed tag while it
 * has a pending change; "Show more" opens the rest in place. Open, each field shows
 * under its label, only when it has one: status label, product lead, family, with its
 * colour, and category (D6, D8), vision and service description. Text keeps its line breaks. A
 * roadmap with none says so, so editing has a place to start. Then, always, when it was
 * last updated, as its list card shows the date, or that it has none (STY-036 S1).
 */
export function RoadmapAbout({
  roadmap,
  changed = false,
  actions,
}: RoadmapAboutProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const headingId = useId()
  const [open, setOpen] = useState(false)

  const shown = (text: Roadmap["vision"]) => text && localise(text, language)
  const status = shown(roadmap.statusLabel)
  const fields = [
    { key: "statusLabel", value: status },
    { key: "productLead", value: roadmap.productLead },
    { key: "family", value: shown(roadmap.family) },
    { key: "category", value: shown(roadmap.category) },
    { key: "vision", value: shown(roadmap.vision) },
    { key: "serviceDescription", value: shown(roadmap.serviceDescription) },
  ].filter((field): field is { key: AboutField; value: string } =>
    Boolean(field.value),
  )
  const updated =
    roadmap.lastUpdated === null
      ? undefined
      : formatCalendarDate(roadmap.lastUpdated, t)
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={
        <section
          aria-labelledby={headingId}
          className="flex flex-col gap-4 border bg-card px-4 py-3 text-card-foreground sm:px-6"
        />
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <h2 id={headingId} className="text-heading-s">
            {t("roadmaps.about.title")}
          </h2>
          {!open && (
            <>
              {status && <Badge variant="neutral">{status}</Badge>}
              {roadmap.productLead !== null && (
                <span className="text-body-xs wrap-anywhere">
                  {t("roadmaps.facts.productLead", {
                    name: roadmap.productLead,
                  })}
                </span>
              )}
              {updated && (
                <span className="text-body-xs">
                  {t("roadmaps.facts.updated", { date: updated })}
                </span>
              )}
              {changed && <ChangedTag />}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:ml-auto">
          <CollapsibleTrigger
            render={<Button type="button" variant="secondary" size="sm" />}
          >
            {t(open ? "roadmaps.about.showLess" : "roadmaps.about.showMore")}
            <Chevron data-icon="inline-end" aria-hidden="true" />
          </CollapsibleTrigger>
          {actions?.(open)}
        </div>
      </div>
      <CollapsibleContent className="flex flex-col gap-4 pb-1">
        {fields.length === 0 && (
          <p className="text-muted-foreground">{t("roadmaps.about.empty")}</p>
        )}
        <dl className="flex max-w-prose flex-col gap-3">
          {fields.map(({ key, value }) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="font-bold">{t(`roadmaps.about.fields.${key}`)}</dt>
              <dd className="flex items-stretch gap-2.5">
                {/* The family's colour, as it will be published (STY-028 S1). */}
                {key === "family" && <RoadmapSwatch colour={roadmap.colour} />}
                <span className="min-w-0 wrap-break-word whitespace-pre-line">
                  {value}
                </span>
              </dd>
            </div>
          ))}
          <div className="flex flex-col gap-0.5">
            <dt className="font-bold">
              {t("roadmaps.about.fields.lastUpdated")}
            </dt>
            <dd className={updated ? undefined : "text-muted-foreground"}>
              {updated ?? t("roadmaps.about.noDate")}
            </dd>
          </div>
        </dl>
      </CollapsibleContent>
    </Collapsible>
  )
}
