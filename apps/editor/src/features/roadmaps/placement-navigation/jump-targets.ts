import type { TFunction } from "i18next"

import type { PlacementOrder } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"

import type { PageItem } from "../editing/page-items"
import { hasPendingOrder } from "../editing/pending-orders"
import type { Positioned, RoadmapItemGroups } from "../group-roadmap-items"

/** Where a roadmap's page can be jumped to: a placement, or its unplaced items. */
export type JumpTarget = RoadmapPlacement | "unplaced"

/** A jump target as the placement navigation shows it (STY-053 S2, S4, S5). */
export interface JumpTargetSummary {
  target: JumpTarget
  /** How many items the page shows there, bar those removed: what will be published. */
  count: number
  /** Whether one of them, or the placement's order, has a pending change. */
  pending: boolean
}

/**
 * The page's jump targets in page order, with their items as `groups` shows them and
 * `orders`, the roadmap's pending orders: the unplaced items first, while there are
 * some (S4), then all six placements, an empty one with 0 (D3). A removed item is not
 * counted, as it won't be published (STY-049 S4). A placement is marked pending where
 * an item it shows is edited, new or removed, or its order is pending; an item a
 * pending move put there marks it, and not the placement it left.
 */
export function summariseJumpTargets(
  { unplaced, placements }: RoadmapItemGroups<PageItem>,
  orders: readonly PlacementOrder[],
): JumpTargetSummary[] {
  const summary = (
    target: JumpTarget,
    items: readonly Positioned<PageItem>[],
    reordered = false,
  ): JumpTargetSummary => ({
    target,
    count: items.filter(({ item }) => item.removal === undefined).length,
    pending: reordered || items.some(({ item }) => isPending(item)),
  })
  return [
    ...(unplaced.length > 0 ? [summary("unplaced", unplaced)] : []),
    ...placements.map(({ placement, items }) =>
      summary(placement, items, hasPendingOrder(orders, placement)),
    ),
  ]
}

/**
 * Whether the page's item has a pending change: edits, the whole of a new item, or its
 * removal.
 */
function isPending({ entry, newItemId, removal }: PageItem): boolean {
  return entry !== undefined || newItemId !== undefined || removal !== undefined
}

/**
 * The DOM id of a jump target's heading on a roadmap's page, which its list of items is
 * labelled by and the placement navigation jumps to. One roadmap's page shows at a time.
 */
export function jumpTargetHeadingId(target: JumpTarget): string {
  return `placement-${target}`
}

/** A jump target's name: the heading it has on the page. */
export function jumpTargetName(target: JumpTarget, t: TFunction): string {
  return target === "unplaced"
    ? t("roadmaps.items.unplaced.title")
    : t(`roadmaps.items.placements.${target}`)
}
