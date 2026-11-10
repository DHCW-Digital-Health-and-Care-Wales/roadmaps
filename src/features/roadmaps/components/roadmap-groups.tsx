import { useId, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"

import { groupRoadmaps } from "../group-roadmaps"
import { RoadmapGrid } from "./roadmap-grid"

export interface RoadmapGroupsProps {
  roadmaps: readonly Roadmap[]
}

/**
 * The roadmaps grouped by product family under a heading each, in the current language's
 * order. When no roadmap has a family there is one list and no heading.
 */
export function RoadmapGroups({ roadmaps }: RoadmapGroupsProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const headingId = useId()
  const groups = useMemo(
    () => groupRoadmaps(roadmaps, language),
    [roadmaps, language],
  )

  const [only] = groups
  if (groups.length === 1 && only?.family === null) {
    return <RoadmapGrid roadmaps={only.roadmaps} />
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ key, family, roadmaps: members }, index) => {
        const id = `${headingId}-${String(index)}`
        return (
          <div key={key} className="flex flex-col gap-3">
            <h2
              id={id}
              className="text-base font-semibold tracking-tight wrap-anywhere"
            >
              {family ? localise(family, language) : t("roadmaps.noFamily")}
            </h2>
            <RoadmapGrid roadmaps={members} labelledBy={id} />
          </div>
        )
      })}
    </div>
  )
}
