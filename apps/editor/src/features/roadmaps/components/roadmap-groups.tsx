import { useId, useMemo } from "react"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"

import { groupRoadmaps, namesFamilies } from "../group-roadmaps"
import { useGroupName } from "../hooks/use-group-name"
import { RoadmapGrid } from "./roadmap-grid"

export interface RoadmapGroupsProps {
  roadmaps: readonly Roadmap[]
}

/**
 * The roadmaps grouped by product family under a heading each, in the current language's
 * order. When no roadmap has a family there is one list and no heading.
 */
export function RoadmapGroups({ roadmaps }: RoadmapGroupsProps) {
  const language = useLanguage()
  const groupName = useGroupName()
  const headingId = useId()
  const groups = useMemo(
    () => groupRoadmaps(roadmaps, language),
    [roadmaps, language],
  )

  // With no family to name, the one group's roadmaps, still in title order.
  const [only] = groups
  if (only && !namesFamilies(groups)) {
    return <RoadmapGrid roadmaps={only.roadmaps} />
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group, index) => {
        const id = `${headingId}-${String(index)}`
        const name = groupName(group)
        return (
          <div key={group.key} className="flex flex-col gap-3">
            <h2
              id={id}
              lang={name.lang}
              className="text-heading-s wrap-anywhere"
            >
              {name.text}
            </h2>
            <RoadmapGrid roadmaps={group.roadmaps} labelledBy={id} />
          </div>
        )
      })}
    </div>
  )
}
