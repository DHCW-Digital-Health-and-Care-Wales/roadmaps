import {
  ROADMAP_PLACEMENTS,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"

/** One of the things grouped, with its position among them. */
export interface Positioned<T> {
  item: T
  position: number
}

export interface RoadmapItemGroups<T> {
  /** Those with no recognised horizon, which the public site leaves out. */
  unplaced: Positioned<T>[]
  /** Every placement in the public site's order, each with its items (maybe none). */
  placements: { placement: RoadmapPlacement; items: Positioned<T>[] }[]
}

/**
 * A roadmap's items by placement, each group in the order given: `placementOf` says
 * where each shows, which for a roadmap's page is where a pending move puts it
 * (STY-031), with the items new to the roadmap last (STY-046).
 */
export function groupRoadmapItems<T>(
  items: readonly T[],
  placementOf: (item: T) => RoadmapPlacement | null,
): RoadmapItemGroups<T> {
  const positioned = items.map((item, position) => ({ item, position }))
  const at = (placement: RoadmapPlacement | null) =>
    positioned.filter(({ item }) => placementOf(item) === placement)
  return {
    unplaced: at(null),
    placements: ROADMAP_PLACEMENTS.map((placement) => ({
      placement,
      items: at(placement),
    })),
  }
}
