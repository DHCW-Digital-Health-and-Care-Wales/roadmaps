import { useId, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { formatCalendarDate, useLanguage } from "@/i18n"

type AboutField =
  "statusLabel" | "productLead" | "vision" | "serviceDescription"

export interface RoadmapAboutProps {
  roadmap: Roadmap
  /**
   * A form editing the roadmap's text, given the heading's id to be named by, shown in
   * place of the fields.
   */
  form?: ((headingId: string) => ReactNode) | undefined
  /** Controls at the foot of the section, such as Edit. */
  actions?: ReactNode | undefined
}

/**
 * What the roadmap is about (STY-024): its status label, product lead, vision and
 * service description, each under a label and only when it has one. Text keeps its line
 * breaks. A roadmap with none says so, so editing has a place to start. Then, always,
 * when it was last updated, as its list card shows the date, or that it has none
 * (STY-036 S1).
 */
export function RoadmapAbout({ roadmap, form, actions }: RoadmapAboutProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const headingId = useId()

  const fields = [
    {
      key: "statusLabel",
      value: roadmap.statusLabel && localise(roadmap.statusLabel, language),
    },
    { key: "productLead", value: roadmap.productLead },
    {
      key: "vision",
      value: roadmap.vision && localise(roadmap.vision, language),
    },
    {
      key: "serviceDescription",
      value:
        roadmap.serviceDescription &&
        localise(roadmap.serviceDescription, language),
    },
  ].filter((field): field is { key: AboutField; value: string } =>
    Boolean(field.value),
  )
  const updated =
    roadmap.lastUpdated === null
      ? undefined
      : formatCalendarDate(roadmap.lastUpdated, t)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-heading-m">
        {t("roadmaps.about.title")}
      </h2>
      {form ? (
        <div className="max-w-prose">{form(headingId)}</div>
      ) : (
        <>
          {fields.length === 0 && (
            <p className="text-muted-foreground">{t("roadmaps.about.empty")}</p>
          )}
          <dl className="flex max-w-prose flex-col gap-3">
            {fields.map(({ key, value }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="font-bold">
                  {t(`roadmaps.about.fields.${key}`)}
                </dt>
                <dd className="wrap-break-word whitespace-pre-line">{value}</dd>
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
        </>
      )}
      {actions && <div className="max-w-prose">{actions}</div>}
    </section>
  )
}
