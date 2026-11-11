import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import {
  ROADMAP_PLACEMENTS,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"

/**
 * An item with its position among the roadmap's items, which keys it: items have no
 * identity yet (ADR-011).
 */
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

/** A roadmap's items by placement, each group in row order. */
export function groupRoadmapItems(
  items: readonly RoadmapItem[],
): RoadmapItemGroups {
  const positioned = items.map((item, position) => ({ item, position }))
  return {
    unplaced: positioned.filter(({ item }) => item.placement === null),
    placements: ROADMAP_PLACEMENTS.map((placement) => ({
      placement,
      items: positioned.filter(({ item }) => item.placement === placement),
    })),
  }
}
