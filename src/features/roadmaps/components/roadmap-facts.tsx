import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { formatCalendarDate, useLanguage } from "@/i18n"

export interface RoadmapFactsProps {
  /** The roadmap as shown, pending edits applied. */
  roadmap: Roadmap
}

/**
 * A roadmap's facts under its title (STY-059 S2): its status, read "Status:" then its
 * tag so it is not taken for the service's phase, its product lead and when it was last
 * updated, each only when it has one. A list named "Roadmap details": on a phone one
 * fact to a row, wider on one line, wrapping between facts.
 */
export function RoadmapFacts({ roadmap }: RoadmapFactsProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const status = roadmap.statusLabel && localise(roadmap.statusLabel, language)
  const updated =
    roadmap.lastUpdated === null
      ? undefined
      : formatCalendarDate(roadmap.lastUpdated, t)

  if (!status && roadmap.productLead === null && !updated) return null
  return (
    <ul
      aria-label={t("roadmaps.facts.name")}
      className="flex flex-col items-start gap-1 text-body-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6"
    >
      {status && (
        <li className="flex items-center gap-1.5">
          {t("roadmaps.facts.status")} <Badge variant="neutral">{status}</Badge>
        </li>
      )}
      {roadmap.productLead !== null && (
        <li className="wrap-anywhere">
          {t("roadmaps.facts.productLead", { name: roadmap.productLead })}
        </li>
      )}
      {updated && <li>{t("roadmaps.facts.updated", { date: updated })}</li>}
    </ul>
  )
}
