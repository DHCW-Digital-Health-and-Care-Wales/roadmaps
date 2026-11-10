import type { Roadmap } from "@/domain/roadmap/roadmap"

import { RoadmapCard } from "./roadmap-card"

/** Shared by the grid and its skeleton, so loading does not shift the layout. */
export const roadmapGridClassName =
  "grid grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"

export interface RoadmapGridProps {
  roadmaps: readonly Roadmap[]
  /** The id of the heading naming this list, when it has one. */
  labelledBy?: string
}

/**
 * The roadmaps as a responsive list of cards (one, two, then three columns), 16px apart
 * and 20px from `sm`, DHCW's card group gutter.
 */
export function RoadmapGrid({ roadmaps, labelledBy }: RoadmapGridProps) {
  return (
    <ul aria-labelledby={labelledBy} className={roadmapGridClassName}>
      {roadmaps.map((roadmap) => (
        <li key={roadmap.id}>
          <RoadmapCard roadmap={roadmap} />
        </li>
      ))}
    </ul>
  )
}
