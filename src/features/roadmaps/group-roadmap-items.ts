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
 * (STY-031). One that `turnOf` gives a turn shows after the others of its group, by its
 * turn. On a roadmap's page those are a moved item, then an item new to the roadmap,
 * as publishing writes them (STY-051 S1, STY-046), or, in a placement whose order is
 * pending, every item, by its place in that order (STY-050 S2).
 */
export function groupRoadmapItems<T>(
  items: readonly T[],
  placementOf: (item: T) => RoadmapPlacement | null,
  turnOf: (item: T) => number | undefined = () => undefined,
): RoadmapItemGroups<T> {
  const positioned = items.map((item, position) => ({ item, position }))
  // A stable sort: those with no turn stay first, in the order given.
  const turn = ({ item }: Positioned<T>) => turnOf(item) ?? -1
  const at = (placement: RoadmapPlacement | null) =>
    positioned
      .filter(({ item }) => placementOf(item) === placement)
      .sort((a, b) => turn(a) - turn(b))
  return {
    unplaced: at(null),
    placements: ROADMAP_PLACEMENTS.map((placement) => ({
      placement,
      items: at(placement),
    })),
  }
}

/** Whether `groups` holds any item, unplaced or in a placement. */
export function hasGroupedItems({
  unplaced,
  placements,
}: RoadmapItemGroups<unknown>): boolean {
  return unplaced.length > 0 || placements.some(({ items }) => items.length > 0)
}
