import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import {
  ROADMAP_PLACEMENTS,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"

/** An item with its position among the items grouped. */
export interface PositionedRoadmapItem {
  item: RoadmapItem
  position: number
}

export interface RoadmapItemGroups {
  /** Items with no recognised horizon, which the public site leaves out. */
  unplaced: PositionedRoadmapItem[]
  /** Every placement in the public site's order, each with its items (maybe none). */
  placements: { placement: RoadmapPlacement; items: PositionedRoadmapItem[] }[]
}

/**
 * Items by placement, each group in the order given: a roadmap's items as its page
 * shows them, where a pending move puts each (STY-031), with those new to it last
 * (STY-046).
 */
export function groupRoadmapItems(
  items: readonly RoadmapItem[],
): RoadmapItemGroups {
  const positioned = items.map((item, position) => ({ item, position }))
  const at = (placement: RoadmapPlacement | null) =>
    positioned.filter(({ item }) => item.placement === placement)
  return {
    unplaced: at(null),
    placements: ROADMAP_PLACEMENTS.map((placement) => ({
      placement,
      items: at(placement),
    })),
  }
}
