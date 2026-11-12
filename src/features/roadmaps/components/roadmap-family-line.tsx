import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"

import { RoadmapSwatch } from "./roadmap-swatch"

export interface RoadmapFamilyLineProps {
  roadmap: Pick<Roadmap, "family" | "category" | "colour">
}

/**
 * A roadmap's family, with its colour, and its category, as shown: the lists' values once
 * linked to them (STY-027 S4). Nothing when it has neither.
 */
export function RoadmapFamilyLine({ roadmap }: RoadmapFamilyLineProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const family = roadmap.family && localise(roadmap.family, language)
  const category = roadmap.category && localise(roadmap.category, language)
  if (family === null && category === null) return null

  return (
    <div className="flex items-stretch gap-2.5 text-body-xs text-muted-foreground">
      <RoadmapSwatch colour={roadmap.colour} />
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {family !== null && (
          <p>{t("roadmaps.lists.family", { name: family })}</p>
        )}
        {category !== null && (
          <p>{t("roadmaps.lists.category", { name: category })}</p>
        )}
      </div>
    </div>
  )
}
