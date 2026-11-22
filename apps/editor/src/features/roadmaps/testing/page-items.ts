import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import { type PageItem, pageItemsOf as pageItems } from "../editing/page-items"

/**
 * The page's items over `read` with `pending`, as `usePageItems` gives them, each read
 * item's card keyed by its position.
 */
export function pageItemsOf(
  read: readonly RoadmapItem[],
  pending: RoadmapChanges,
): PageItem[] {
  return pageItems(read, pending, (position) => `read-${String(position)}`)
}
