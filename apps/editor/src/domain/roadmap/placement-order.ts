/**
 * A placement's order as a pending edit (ADR-012, _STY-050 amendments_): how its items
 * are told apart, found again in a later read and put in sequence. Pure, and in items
 * only, so the page, the publish plan and every `RoadmapRepository` order a placement
 * the same way.
 */

import { itemHoldsLoaded, type PendingItemValues } from "./find-edited-item"
import {
  EDITABLE_ITEM_FIELDS,
  type ItemChanges,
  type OrderedItem,
} from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"

/** `item`, read at `position` among its roadmap's items, as an order holds it. */
export function orderedItem(item: RoadmapItem, position: number): OrderedItem {
  return item.id === null ? { id: null, item, position } : { id: item.id }
}

/**
 * Whether two items of orders made over one read are one item: by its ID, or by its
 * place with none. Across reads, an item with no ID is found by `findOrderedItems`.
 */
export function sameOrderedItem(a: OrderedItem, b: OrderedItem): boolean {
  return a.id !== null || b.id !== null
    ? a.id === b.id
    : a.position === b.position
}

/**
 * Whether two items of orders made over different reads are one item: by its ID, or,
 * with none, by what each held, wherever its row was. Two items that hold the same
 * can't be told apart, and are as good as each other in an order.
 */
export function sameItemAcrossReads(a: OrderedItem, b: OrderedItem): boolean {
  return a.id !== null || b.id !== null
    ? a.id === b.id
    : itemHoldsLoaded(a.item, b.item, [])
}

/**
 * Whether two orders hold the same items in the same sequence: orders made over one
 * read, unless `same` tells items of different reads apart (`sameItemAcrossReads`).
 */
export function sameOrder(
  a: readonly OrderedItem[],
  b: readonly OrderedItem[],
  same: (a: OrderedItem, b: OrderedItem) => boolean = sameOrderedItem,
): boolean {
  return (
    a.length === b.length &&
    a.every((item, index) => {
      const other = b[index]
      return other !== undefined && same(item, other)
    })
  )
}

/**
 * A placement's items in the order it is published with (STY-050 S5, S11): those of
 * `order` it holds, in that sequence, then the others of `present`, the items it holds,
 * in theirs. So an item moved or added into it, by the Product Lead or a co-lead,
 * joins last, and one moved out or removed leaves. The items given back are those of
 * `present`; `same` tells two apart.
 */
export function arrangedOrder<T>(
  order: readonly T[],
  present: readonly T[],
  same: (a: T, b: T) => boolean = Object.is,
): T[] {
  const listed: T[] = []
  for (const item of order) {
    const at = present.findIndex((each) => same(each, item))
    const held = present[at]
    if (at >= 0 && held !== undefined && !listed.includes(held)) {
      listed.push(held)
    }
  }
  return [...listed, ...present.filter((item) => !listed.includes(item))]
}

/**
 * Where each of `ordered` is among `items`, a later read of the roadmap's items, or -1
 * for one that has gone: an item with an ID by its ID, the first holding it; one with
 * none where it was, or else wherever an item holds what it did, since rows move
 * (STY-051) and two items holding the same can't be told apart anyway. It may instead
 * hold that content with the values pending in `edits` for the item at its position,
 * written by a publish whose answer was lost. No two are found in one place.
 */
export function findOrderedItems(
  items: readonly RoadmapItem[],
  ordered: readonly OrderedItem[],
  edits: readonly ItemChanges[],
): number[] {
  const holds = (index: number, entry: Extract<OrderedItem, { id: null }>) => {
    const current = items[index]
    return (
      current !== undefined &&
      itemHoldsLoaded(current, entry.item, pendingAt(edits, entry.position))
    )
  }
  // Those still where they were first, so one whose row moved is not found in their place.
  const indexes = ordered.map((entry) => {
    if (entry.id !== null) return items.findIndex(({ id }) => id === entry.id)
    return holds(entry.position, entry) ? entry.position : -1
  })
  const found = new Set(indexes)
  return ordered.map((entry, at) => {
    const index = indexes[at] ?? -1
    if (entry.id !== null || index >= 0) return index
    const elsewhere = items.findIndex(
      (_, each) => !found.has(each) && holds(each, entry),
    )
    if (elsewhere >= 0) found.add(elsewhere)
    return elsewhere
  })
}

/** The values pending for the item with no ID read at `position`, if any are. */
function pendingAt(
  edits: readonly ItemChanges[],
  position: number,
): PendingItemValues {
  const entry = edits.find(
    (each) => each.item.id === null && each.position === position,
  )
  return EDITABLE_ITEM_FIELDS.flatMap((field) => {
    const change = entry?.fields[field]
    return change ? [{ field, value: change.value }] : []
  })
}
