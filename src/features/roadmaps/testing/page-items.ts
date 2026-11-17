import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import type { PageItem } from "../editing/page-items"
import {
  applyItemChanges,
  matchItemChanges,
  shownNewItem,
} from "../editing/pending-changes"
import { shownTurns } from "../editing/pending-orders"

/** The page's items over `read` with `pending`, as `usePageItems` gives them. */
export function pageItemsOf(
  read: readonly RoadmapItem[],
  pending: RoadmapChanges,
): PageItem[] {
  const entries = matchItemChanges(read, pending)
  const turns = shownTurns(read, pending)
  return [
    ...read.map((each, position) => ({
      key: `read-${String(position)}`,
      item: each,
      shown: applyItemChanges(each, entries.get(position)),
      entry: entries.get(position),
      newItemId: undefined,
      turn: turns[position],
    })),
    ...pending.newItems.map((newItem, added) => ({
      key: `new-${newItem.id}`,
      item: shownNewItem(newItem),
      shown: shownNewItem(newItem),
      entry: undefined,
      newItemId: newItem.id,
      turn: turns[read.length + added],
    })),
  ]
}
