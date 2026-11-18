import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { formatCalendarDate, useLanguage } from "@/i18n"

export interface RoadmapFactsProps {
  /** The roadmap as shown, pending edits applied. */
  roadmap: Roadmap
}

/**
 * A roadmap's facts, as items of the list under its title (STY-065 S2): its status,
 * read "Status:" then its label so it is not taken for the service's phase, its product
 * lead and when it was last updated, each only when it has one. Plain text, quieter
 * than the title, the status label alone in the text's own weight and colour.
 */
export function RoadmapFacts({ roadmap }: RoadmapFactsProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const status = roadmap.statusLabel && localise(roadmap.statusLabel, language)
  const updated =
    roadmap.lastUpdated === null
      ? undefined
      : formatCalendarDate(roadmap.lastUpdated, t)

  return (
    <>
      {status && (
        <li className="text-muted-foreground">
          {t("roadmaps.facts.status")}{" "}
          <span className="font-bold text-foreground">{status}</span>
        </li>
      )}
      {roadmap.productLead !== null && (
        <li className="wrap-anywhere text-muted-foreground">
          {t("roadmaps.facts.productLead", { name: roadmap.productLead })}
        </li>
      )}
      {updated && (
        <li className="text-muted-foreground">
          {t("roadmaps.facts.updated", { date: updated })}
        </li>
      )}
    </>
  )
}
