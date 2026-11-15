import { useState } from "react"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

/**
 * A roadmap's card keys, by each item's position, and the keys items with an ID took
 * over from before they had one.
 */
export interface ItemCardKeys {
  readonly keys: readonly string[]
  readonly adopted: ReadonlyMap<string, string>
}

/** An item without an ID is known only by where it is and what it holds. */
function positionalKey(item: RoadmapItem, position: number): string {
  return `position:${String(position)}:${JSON.stringify({ ...item, id: null })}`
}

/**
 * Each item's card key, so a card, and the item dialog open on its item, lasts across
 * reads while it is the same item (STY-025, STY-044): an item with an ID by its ID,
 * wherever it moves; one without by its position and content, so a read that puts
 * another item there or changes it starts a new card and closes the dialog. An item
 * given its first ID, at the same position with the same content, as a first publish
 * does to every item, keeps the key it had without one.
 */
export function assignItemCardKeys(
  items: readonly RoadmapItem[],
  previous: ItemCardKeys | undefined,
): ItemCardKeys {
  const before = new Set(previous?.keys)
  const adopted = new Map(previous?.adopted)
  const used = new Set<string>()
  const cardKey = (item: RoadmapItem, position: number): string => {
    if (item.id === null) return positionalKey(item, position)
    const kept = adopted.get(item.id)
    if (kept !== undefined && !used.has(kept)) return kept
    const unidentified = positionalKey(item, position)
    if (before.has(unidentified) && !used.has(unidentified)) {
      adopted.set(item.id, unidentified)
      return unidentified
    }
    return `id:${item.id}`
  }
  const keys = items.map((item, position) => {
    const key = cardKey(item, position)
    used.add(key)
    return key
  })
  return { keys, adopted }
}

function sameKeys(a: ItemCardKeys, b: ItemCardKeys): boolean {
  return (
    a.adopted.size === b.adopted.size &&
    a.keys.length === b.keys.length &&
    a.keys.every((key, index) => key === b.keys[index])
  )
}

/**
 * {@link assignItemCardKeys} for a roadmap's items, remembering the keys it last gave:
 * the very list it gave before, while the keys are the same.
 */
export function useItemCardKeys(
  items: readonly RoadmapItem[],
): readonly string[] {
  const [remembered, setRemembered] = useState(() =>
    assignItemCardKeys(items, undefined),
  )
  const next = assignItemCardKeys(items, remembered)
  if (sameKeys(next, remembered)) return remembered.keys
  // Adjusting state while rendering, as React documents for state that follows props.
  setRemembered(next)
  return next.keys
}
