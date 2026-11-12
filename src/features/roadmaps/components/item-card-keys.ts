import { useState } from "react"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import type { PositionedRoadmapItem } from "../group-roadmap-items"

/** A list's card keys, and the keys items with an ID took over from before they had one. */
export interface ItemCardKeys {
  readonly keys: readonly string[]
  readonly adopted: ReadonlyMap<string, string>
}

/** An item without an ID is known only by where it is and what it holds. */
function positionalKey(item: RoadmapItem, position: number): string {
  return `position:${String(position)}:${JSON.stringify({ ...item, id: null })}`
}

/**
 * Each card's key, so a card, and a form open on it, lasts across reads while it shows
 * the same item (STY-025): an item with an ID by its ID, wherever it moves; one without
 * by its position and content, so a read that puts another item there or changes it
 * starts a new card. An item given its first ID, at the same position with the same
 * content, as a first publish does to every item, keeps the key it had without one.
 */
export function assignItemCardKeys(
  placed: readonly PositionedRoadmapItem[],
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
  const keys = placed.map(({ item, position }) => {
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

/** {@link assignItemCardKeys} for a list's cards, remembering the keys it last gave. */
export function useItemCardKeys(
  placed: readonly PositionedRoadmapItem[],
): readonly string[] {
  const [remembered, setRemembered] = useState(() =>
    assignItemCardKeys(placed, undefined),
  )
  const next = assignItemCardKeys(placed, remembered)
  // Adjusting state while rendering, as React documents for state that follows props.
  if (!sameKeys(next, remembered)) setRemembered(next)
  return next.keys
}
