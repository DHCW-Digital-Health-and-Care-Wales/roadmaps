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

/**
 * A roadmap's items by placement, each group in row order: where `placementAt` puts
 * each, its own placement unless a pending move says otherwise (STY-031).
 */
export function groupRoadmapItems(
  items: readonly RoadmapItem[],
  placementAt: (
    item: RoadmapItem,
    position: number,
  ) => RoadmapPlacement | null = (item) => item.placement,
): RoadmapItemGroups {
  const positioned = items.map((item, position) => ({
    item,
    position,
    placement: placementAt(item, position),
  }))
  const at = (placement: RoadmapPlacement | null) =>
    positioned.flatMap(({ placement: each, ...rest }) =>
      each === placement ? [rest] : [],
    )
  return {
    unplaced: at(null),
    placements: ROADMAP_PLACEMENTS.map((placement) => ({
      placement,
      items: at(placement),
    })),
  }
}
