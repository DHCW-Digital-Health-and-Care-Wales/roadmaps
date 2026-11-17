import type { Roadmap } from "@/domain/roadmap/roadmap"

import { CardGrid } from "./card-grid"
import { RoadmapCard } from "./roadmap-card"

/** Rows of even height once there are columns; the skeleton's too, so loading does not shift the layout. */
export const ROADMAP_ROWS = "@xl:auto-rows-fr"

export interface RoadmapGridProps {
  roadmaps: readonly Roadmap[]
  /** The id of the heading naming this list, when it has one. */
  labelledBy?: string
}

/** The roadmaps as a list of cards in columns (`CardGrid`), each row of even height. */
export function RoadmapGrid({ roadmaps, labelledBy }: RoadmapGridProps) {
  return (
    <CardGrid aria-labelledby={labelledBy} className={ROADMAP_ROWS}>
      {roadmaps.map((roadmap) => (
        <li key={roadmap.id}>
          <RoadmapCard roadmap={roadmap} />
        </li>
      ))}
    </CardGrid>
  )
}
