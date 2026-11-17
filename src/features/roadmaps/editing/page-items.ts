import { useMemo } from "react"

import { editNewItem, removeNewItem } from "@/domain/roadmap/new-item"
import type {
  ItemChanges,
  ItemValues,
  RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import { useItemCardKeys } from "../components/item-card-keys"
import {
  applyItemChanges,
  editItem,
  matchItemChanges,
  pendingNewItems,
  shownNewItem,
  type SinceOpened,
  undoItem,
} from "./pending-changes"
import { useRoadmapChanges } from "./pending-changes-context"
import { shownTurns } from "./pending-orders"

/**
 * One item of a roadmap's page, with a card of its own. An item is known there by its
 * position among the page's items: the roadmap's items in the order read, so each at the
 * place it has among them, then the items new to it in the order added, last, as
 * publishing writes them (STY-045 D2). Where it shows in its placement is another
 * matter: `turn`.
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
  /**
   * Where it shows in its placement, as publishing puts it: its place in the
   * placement's pending order (STY-050 S2), or, with none pending, its turn among the
   * items that show last (STY-051 S1), one moved, in the order moved, then one new, in
   * the order added. None for an item that shows where it was read.
   */
  readonly turn: number | undefined
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
    const turns = shownTurns(items, changes)
    return [
      ...items.flatMap((item, at): PageItem[] => {
        const key = keys[at]
        // Never: `useItemCardKeys` gives a key for each item, by its position.
        if (key === undefined) return []
        const entry = entries.get(at)
        const shown = applyItemChanges(item, entry)
        const turn = turns[at]
        return [{ key, item, shown, entry, newItemId: undefined, turn }]
      }),
      ...pendingNewItems(items, changes).map((newItem, added): PageItem => {
        const item = shownNewItem(newItem)
        return {
          key: newItemCardKey(newItem.id),
          item,
          shown: item,
          entry: undefined,
          newItemId: newItem.id,
          turn: turns[items.length + added],
        }
      }),
    ]
  }, [items, changes, keys])
}

/**
 * `changes` with the page's item at `position` edited to `values`: an edit to an item
 * the roadmap holds, found afresh among `items`, its items as last read, so it never
 * builds on a stale entry; or part of a new item, never an edit of its own (STY-046
 * S6). `from` is the item as read when a form opened on it, with what the form has seen
 * since, for an edit made in a dialog.
 */
export function editPageItem(
  changes: RoadmapChanges,
  items: readonly RoadmapItem[],
  { item, newItemId }: PageItem,
  position: number,
  values: ItemValues,
  from?: { read: RoadmapItem; since: SinceOpened<RoadmapItem> },
): RoadmapChanges {
  if (newItemId !== undefined) return editNewItem(changes, newItemId, values)
  const entry = matchItemChanges(items, changes).get(position)
  return editItem(
    changes,
    entry,
    from?.read ?? item,
    position,
    values,
    from?.since,
  )
}

/**
 * `changes` without what is pending of the page's item at `position`: the edits to an
 * item the roadmap holds ("Undo changes"), or the whole of a new item (Remove).
 */
export function dropPageItem(
  changes: RoadmapChanges,
  items: readonly RoadmapItem[],
  { newItemId }: PageItem,
  position: number,
): RoadmapChanges {
  if (newItemId !== undefined) return removeNewItem(changes, newItemId)
  const entry = matchItemChanges(items, changes).get(position)
  return entry ? undoItem(changes, entry) : changes
}
