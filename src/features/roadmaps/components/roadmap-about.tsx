import { useId, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"

export interface RoadmapAboutProps {
  roadmap: Roadmap
}

/**
 * What the roadmap is about (STY-024): its status label, product lead, vision and
 * service description, each under a label and only when it has one. Text keeps its line
 * breaks. A roadmap with none says so, so editing has a place to start.
 */
export function RoadmapAbout({ roadmap }: RoadmapAboutProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const headingId = useId()

  const fields: { key: string; label: string; value: ReactNode }[] = []
  if (roadmap.statusLabel) {
    fields.push({
      key: "statusLabel",
      label: t("roadmaps.about.fields.statusLabel"),
      value: localise(roadmap.statusLabel, language),
    })
  }
  if (roadmap.productLead) {
    fields.push({
      key: "productLead",
      label: t("roadmaps.about.fields.productLead"),
      value: roadmap.productLead,
    })
  }
  if (roadmap.vision) {
    fields.push({
      key: "vision",
      label: t("roadmaps.about.fields.vision"),
      value: localise(roadmap.vision, language),
    })
  }
  if (roadmap.serviceDescription) {
    fields.push({
      key: "serviceDescription",
      label: t("roadmaps.about.fields.serviceDescription"),
      value: localise(roadmap.serviceDescription, language),
    })
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-heading-m">
        {t("roadmaps.about.title")}
      </h2>
      {fields.length > 0 ? (
        <dl className="flex max-w-prose flex-col gap-3">
          {fields.map(({ key, label, value }) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="font-bold">{label}</dt>
              <dd className="wrap-break-word whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-muted-foreground">{t("roadmaps.about.empty")}</p>
      )}
    </section>
  )
}
