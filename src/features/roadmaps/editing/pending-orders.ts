/**
 * The rules of a placement's pending order (ADR-012, _STY-050 amendments_): how the
 * Move menu makes one, what a read or another change leaves of it, and where it shows
 * each item. Pure functions over `RoadmapChanges` and the roadmap's items as last
 * read; the store settles every change by them (`settleOrders`).
 */

import {
  arrangedOrder,
  findOrderedItems,
  orderedItem,
  sameOrder,
  sameOrderedItem,
} from "@/domain/roadmap/placement-order"
import type {
  OrderedItem,
  PlacementOrder,
  RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import {
  isRoadmapPlacement,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"

import { groupRoadmapItems } from "../group-roadmap-items"
import {
  matchItemChanges,
  matchRemovals,
  moveTurn,
  newItemTurn,
  pendingNewItems,
} from "./pending-changes"

/** Where the Move menu sends an item within its placement (STY-050 S1). */
export type OrderMove = "top" | "up" | "down" | "bottom"

/** One of the page's items, as its placement's order knows it. */
interface PlacedItem {
  readonly ordered: OrderedItem
  /** Where the page shows it: where a pending move puts it; `null` while unplaced. */
  readonly placement: RoadmapPlacement | null
  /** Its turn among those that show last without an order (`PageItem`, STY-051). */
  readonly arrival: number | undefined
  /**
   * Whether it is removed (STY-049 S8): it keeps its place in an order, and shows
   * there, but is no stop of a move within it.
   */
  readonly removed: boolean
}

/**
 * The page's items in their positions: the roadmap's items as read, then the items new
 * to it (`usePageItems`).
 */
function placedItems(
  items: readonly RoadmapItem[],
  changes: RoadmapChanges | undefined,
): PlacedItem[] {
  const entries = matchItemChanges(items, changes)
  const removals = matchRemovals(items, changes)
  return [
    ...items.map((item, position): PlacedItem => {
      const entry = entries.get(position)
      const movedTo = entry?.fields.placement?.value
      return {
        ordered: orderedItem(item, position),
        placement:
          movedTo !== undefined && isRoadmapPlacement(movedTo)
            ? movedTo
            : item.placement,
        arrival: moveTurn(changes, entry),
        removed: removals.has(position),
      }
    }),
    ...pendingNewItems(items, changes).map(
      ({ id, values }, added): PlacedItem => ({
        ordered: { id },
        placement: isRoadmapPlacement(values.placement)
          ? values.placement
          : null,
        arrival: newItemTurn(changes, added),
        removed: false,
      }),
    ),
  ]
}

/**
 * Each placement's items in the order the page shows them without a pending order:
 * as read, then those moved in and those new (STY-051 S1). What an order is no change
 * from (STY-050 D12).
 */
function ownOrders(
  placed: readonly PlacedItem[],
): (placement: RoadmapPlacement) => OrderedItem[] {
  const { placements } = groupRoadmapItems(
    placed,
    ({ placement }) => placement,
    ({ arrival }) => arrival,
  )
  return (placement) =>
    placements
      .find((group) => group.placement === placement)
      ?.items.map(({ item }) => item.ordered) ?? []
}

/**
 * Each of `ordered` as `placed`, the page's items over the latest read, holds it, or
 * none for one that has gone: an item with no ID is found by what it held, wherever
 * its row now is, and takes the ID it has been given.
 */
function latest(
  ordered: readonly OrderedItem[],
  items: readonly RoadmapItem[],
  changes: RoadmapChanges,
  placed: readonly PlacedItem[],
): (OrderedItem | undefined)[] {
  const indexes = findOrderedItems(items, ordered, changes.items)
  return ordered.map((entry, at) => {
    const index = indexes[at] ?? -1
    if (index >= 0) return placed[index]?.ordered
    // A new item is no item read: it is the one pending with its ID, if one is.
    return placed
      .slice(items.length)
      .find((each) => each.ordered.id === entry.id)?.ordered
  })
}

/** Whether two lists hold the very same entries: nothing to replace one with. */
function unchanged(
  before: readonly OrderedItem[],
  after: readonly OrderedItem[],
): boolean {
  return (
    before.length === after.length &&
    before.every((entry, at) => {
      const other = after[at]
      if (other === undefined) return false
      return entry.id === null
        ? other.id === null &&
            entry.position === other.position &&
            entry.item === other.item
        : entry.id === other.id
    })
  )
}

/**
 * `changes` with each pending order as `items`, the roadmap's items as last read, and
 * the other changes leave it (STY-050 S5, S9): an item moved or added into the
 * placement, by the Product Lead or a co-lead, joins it last, and one moved out or
 * removed leaves. An order that is then the one the page shows without it is no longer
 * pending (D12): it was reordered back, the read holds it, or what made it differ has
 * gone. Its base stays the order it was first reordered from. `changes` itself when
 * nothing changes.
 */
export function settleOrders(
  changes: RoadmapChanges,
  items: readonly RoadmapItem[],
): RoadmapChanges {
  if (changes.orders.length === 0) return changes
  const placed = placedItems(items, changes)
  const ownOrder = ownOrders(placed)
  const orders = changes.orders.flatMap((order): PlacementOrder[] => {
    const own = ownOrder(order.placement)
    const arranged = arrangedOrder(
      latest(order.items, items, changes, placed).flatMap((entry) =>
        entry ? [entry] : [],
      ),
      own,
    )
    if (sameOrder(arranged, own)) return []
    // An item of the base that has gone stays in it: the base is no longer held.
    const followed = latest(order.base, items, changes, placed)
    const base = order.base.map((was, at) => followed[at] ?? was)
    return unchanged(order.items, arranged) && unchanged(order.base, base)
      ? [order]
      : [{ placement: order.placement, base, items: arranged }]
  })
  return orders.length === changes.orders.length &&
    orders.every((order, at) => order === changes.orders[at])
    ? changes
    : { ...changes, orders }
}

/**
 * `changes` with the page's item at `position` moved within its placement (STY-050
 * S2): the placement's order, as the page shows it, becomes pending, with the order
 * `items` read it in as its base, unless one is pending already. A removed item is no
 * stop of the move, and keeps its place in the order (STY-049 S8). `changes` itself
 * for an unplaced or removed item, or a move that leaves the item where it is.
 */
export function reorderItem(
  changes: RoadmapChanges,
  items: readonly RoadmapItem[],
  position: number,
  to: OrderMove,
): RoadmapChanges {
  const placed = placedItems(items, changes)
  const moved = placed[position]
  const placement = moved?.placement ?? null
  if (!moved || placement === null || moved.removed) return changes
  const pending = changes.orders.find((each) => each.placement === placement)
  const shown = arrangedOrder(
    pending?.items ?? [],
    ownOrders(placed)(placement),
    sameOrderedItem,
  )
  const removed = new Set(
    placed.flatMap(({ ordered, removed }) => (removed ? [ordered] : [])),
  )
  const stops = shown.filter((each) => !removed.has(each))
  const from = stops.indexOf(moved.ordered)
  const at = positionAfter(from, stops.length, to)
  if (from < 0 || at === from) return changes
  const others = stops.filter((each) => each !== moved.ordered)
  const reordered = [...others.slice(0, at), moved.ordered, ...others.slice(at)]
  const order: PlacementOrder = {
    placement,
    base:
      pending?.base ??
      placed
        .slice(0, items.length)
        .filter((_, index) => items[index]?.placement === placement)
        .map(({ ordered }) => ordered),
    // Each removed item where it was, the others in their new order around it.
    items: shown.map((each) =>
      removed.has(each) ? each : (reordered.shift() ?? each),
    ),
  }
  return settleOrders(
    {
      ...changes,
      orders: pending
        ? changes.orders.map((each) => (each === pending ? order : each))
        : [...changes.orders, order],
    },
    items,
  )
}

/**
 * Where an item at `from`, its 0-based place among the `count` items of its placement,
 * is once it is moved `to`: where it is, for a move it can't make.
 */
export function positionAfter(
  from: number,
  count: number,
  to: OrderMove,
): number {
  const at = { top: 0, up: from - 1, down: from + 1, bottom: count - 1 }[to]
  return at < 0 || at >= count ? from : at
}

/** Whether `orders`, a roadmap's pending orders, hold one for `placement`. */
export function hasPendingOrder(
  orders: readonly PlacementOrder[] | undefined,
  placement: RoadmapPlacement,
): boolean {
  return orders?.some((order) => order.placement === placement) ?? false
}

/** `changes` without the placement's pending order ("Undo order", STY-050 S3). */
export function undoOrder(
  changes: RoadmapChanges,
  placement: RoadmapPlacement,
): RoadmapChanges {
  const orders = changes.orders.filter((each) => each.placement !== placement)
  return orders.length === changes.orders.length
    ? changes
    : { ...changes, orders }
}

/**
 * Where each of the page's items, by its position among them, shows in its placement
 * (`PageItem.turn`): its place in the placement's pending order, or, with none pending,
 * its turn among the items that show last, a moved one then a new one (STY-051 S1);
 * none for an item that shows where it was read.
 */
export function shownTurns(
  items: readonly RoadmapItem[],
  changes: RoadmapChanges | undefined,
): (number | undefined)[] {
  const placed = placedItems(items, changes)
  if (!changes || changes.orders.length === 0) {
    return placed.map(({ arrival }) => arrival)
  }
  const ownOrder = ownOrders(placed)
  const shown = new Map(
    changes.orders.map(({ placement, items: order }) => [
      placement,
      arrangedOrder(order, ownOrder(placement), sameOrderedItem),
    ]),
  )
  return placed.map(({ ordered, placement, arrival }) => {
    const order = placement === null ? undefined : shown.get(placement)
    return order ? order.indexOf(ordered) : arrival
  })
}
