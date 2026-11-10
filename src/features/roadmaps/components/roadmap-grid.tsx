import type { Roadmap } from "@/domain/roadmap/roadmap"

import { RoadmapCard } from "./roadmap-card"

/** Shared by the grid and its skeleton, so loading does not shift the layout. */
export const roadmapGridClassName =
  "grid gap-3 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3"

export interface RoadmapGridProps {
  roadmaps: readonly Roadmap[]
}

/** The roadmaps as a responsive list of cards (one, two, then three columns). */
export function RoadmapGrid({ roadmaps }: RoadmapGridProps) {
  return (
    <ul className={roadmapGridClassName}>
      {roadmaps.map((roadmap) => (
        <li key={roadmap.id}>
          <RoadmapCard roadmap={roadmap} />
        </li>
      ))}
    </ul>
  )
}
