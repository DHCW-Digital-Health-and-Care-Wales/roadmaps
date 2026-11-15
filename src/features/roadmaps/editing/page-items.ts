import { useMemo } from "react"

import type { ItemChanges } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import { useItemCardKeys } from "../components/item-card-keys"
import {
  applyItemChanges,
  matchItemChanges,
  pendingNewItems,
  shownNewItem,
} from "./pending-changes"
import { useRoadmapChanges } from "./pending-changes-context"

/**
 * One item of a roadmap's page, with a card of its own. An item is known there by its
 * position among the page's items: the roadmap's items in the order read, so each at the
 * place it has among them, then the items new to it in the order added, last, as
 * publishing writes them (STY-045 D2).
 */
export interface PageItem {
  /** Its card's key, which it keeps across reads while it is the same item. */
  readonly key: string
  /** As last read; a new item, which no read holds yet, as it is pending. */
  readonly item: RoadmapItem
  /** As the page shows it: as it will read once the roadmap's changes are published. */
  readonly shown: RoadmapItem
  /** The pending edits of an item the roadmap holds, if it has any. */
  readonly entry: ItemChanges | undefined
  /** Its ID among the roadmap's new items, when it is one: added and not published. */
  readonly newItemId: string | undefined
}

/** The key of a new item's card: its own until a read holds the item (`useItemCardKeys`). */
export function newItemCardKey(id: string): string {
  return `new:${id}`
}

const NOT_READ: readonly RoadmapItem[] = []

/**
 * The items of a roadmap's page, each as it shows with the roadmap's pending changes:
 * none until `items`, the roadmap's items, are read.
 */
export function usePageItems(
  roadmapId: string,
  items: readonly RoadmapItem[] = NOT_READ,
): readonly PageItem[] {
  const changes = useRoadmapChanges(roadmapId)
  const keys = useItemCardKeys(items)
  return useMemo(() => {
    const entries = matchItemChanges(items, changes)
    return [
      ...items.flatMap((item, at): PageItem[] => {
        const key = keys[at]
        // Never: `useItemCardKeys` gives a key for each item, by its position.
        if (key === undefined) return []
        const entry = entries.get(at)
        const shown = applyItemChanges(item, entry)
        return [{ key, item, shown, entry, newItemId: undefined }]
      }),
      ...pendingNewItems(items, changes).map((newItem): PageItem => {
        const item = shownNewItem(newItem)
        return {
          key: newItemCardKey(newItem.id),
          item,
          shown: item,
          entry: undefined,
          newItemId: newItem.id,
        }
      }),
    ]
  }, [items, changes, keys])
}
