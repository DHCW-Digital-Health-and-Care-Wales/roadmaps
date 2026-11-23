import { useTranslation } from "react-i18next"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import { formatCalendarDate } from "@/i18n"

import { useContent } from "../hooks/use-content"

export interface RoadmapFactsProps {
  /** The roadmap as shown, pending edits applied. */
  roadmap: Roadmap
}

/**
 * A roadmap's facts, as items of the list under its title (STY-065 S2): its status,
 * read "Status:" then its label so it is not taken for the service's phase, its product
 * lead and when it was last updated, each only when it has one. Plain text in the
 * muted colour, the status label alone bold and in the text's colour.
 */
export function RoadmapFacts({ roadmap }: RoadmapFactsProps) {
  const { t } = useTranslation()
  const content = useContent()
  const status = roadmap.statusLabel && content(roadmap.statusLabel)
  const updated =
    roadmap.lastUpdated === null
      ? undefined
      : formatCalendarDate(roadmap.lastUpdated, t)

  return (
    <>
      {status && (
        <li className="text-muted-foreground">
          {t("roadmaps.facts.status")}{" "}
          <span lang={status.lang} className="font-bold text-foreground">
            {status.text}
          </span>
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
