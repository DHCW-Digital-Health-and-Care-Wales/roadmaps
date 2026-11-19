/**
 * What publishing a roadmap's changes writes, decided against a fresh read of the
 * roadmap (ADR-012 §"Finding what to write"). Pure, so every `RoadmapRepository` applies
 * the same rules; each locates the cells itself.
 */

import { AppError } from "@/lib/errors"

import { isCalendarDate } from "./calendar-date"
import { findEditedItem } from "./find-edited-item"
import { detailsOf, detailsValue } from "./item-details"
import { type ItemMove, planItemMoves } from "./item-moves"
import { createItemId, createUnusedId } from "./item-id"
import { heldRemoval, planRemovals } from "./item-removal"
import { arrangedOrder, findOrderedItems, orderedItem } from "./placement-order"
import type { Roadmap } from "./roadmap"
import {
  type Conflict,
  EDITABLE_ITEM_FIELDS,
  EDITABLE_ROADMAP_FIELDS,
  type EditableItemField,
  type EditableRoadmapField,
  type FieldChange,
  isChoiceField,
  type ItemChanges,
  type ItemRemoval,
  type ItemTarget,
  itemValue,
  type OrderConflict,
  type OrderedItem,
  organisationIdsOf,
  organisationIdsValue,
  type PublishOutcome,
  type RoadmapChanges,
  type RoadmapChoiceField,
  roadmapValue,
  sameTarget,
  tagsOf,
  tagsValue,
} from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"
import { isRoadmapPlacement, type RoadmapPlacement } from "./roadmap-placement"

/** A roadmap as just read, to publish over. */
export interface RoadmapSnapshot {
  roadmap: Roadmap
  /** In order; a later repeat of an ID has `id: null`, as the parser reads it. */
  items: readonly RoadmapItem[]
  /** IDs held by more than one row. */
  repeatedIds: ReadonlySet<string>
  /** Every ID the roadmap's rows hold, kept or not: a new ID is none of these. */
  takenIds: ReadonlySet<string>
  /**
   * The family or category whose list the data source doesn't have: the row's value
   * for it can't be told from none, so no choice of it is published (ADR-013).
   */
  missingLists: ReadonlySet<RoadmapChoiceField>
  /** The IDs the organisation list holds: only these can be chosen (ADR-014). */
  organisationIds: ReadonlySet<string>
}

/**
 * The values to write; item `index`es are into the snapshot's `items`, and `id` is the
 * ID the item holds once written, by which a later read finds it.
 */
export interface PublishWrites {
  roadmap: { field: EditableRoadmapField; value: string }[]
  items: {
    index: number
    id: string
    field: EditableItemField
    value: string
  }[]
  /**
   * New IDs, for items with none: they go with any other write (ADR-012 Option 6), but
   * to an item removed, whose row is deleted.
   */
  ids: { index: number; id: string }[]
  /**
   * The items removed (STY-070), each by its index and as read there: their rows are
   * deleted after every other write, the bottom row first, so each is deleted where the
   * moves and new items leave it. A write whose answer was lost is judged by the item,
   * by its ID or, with none, by what its index then holds (`heldRemoval`).
   */
  removals: { index: number; item: RoadmapItem }[]
  /**
   * The items to move, in the order to make the moves, after every value above is
   * written: one whose placement is written that is not yet last in it (STY-051), and
   * those that put a placement in its pending order (STY-050).
   */
  moves: ItemMove[]
  /**
   * The items new to the roadmap, each with the ID it was added with and every field it
   * has, in the order to write them, after the moves: the order they were added, but as
   * its placement's pending order has those in one. One goes after the roadmap's last
   * item (STY-045), unless that order puts an item after it: it then goes just `before`
   * that item, by its index, where the moves leave it (STY-050 S8).
   */
  newItems: {
    id: string
    fields: { field: EditableItemField; value: string }[]
    before?: number
  }[]
  /**
   * Each placement whose pending order the moves and new items above reach: the IDs of
   * its `items` once written, in order, and of those it held, `null` for one with none
   * yet. A write whose answer was lost is judged by them (STY-050 S14).
   */
  orders: {
    placement: RoadmapPlacement
    items: string[]
    was: (string | null)[]
  }[]
}

export type PublishPlan =
  /** Nothing to write: published already, or refused. */
  | { kind: "settled"; outcome: PublishOutcome }
  | { kind: "write"; writes: PublishWrites }

const REQUIRED_FIELDS: ReadonlySet<string> = new Set(["title"])

/**
 * Decides what publishing `changes` over `snapshot` (`null`: the roadmap is no longer
 * listed) writes: each pending value that differs from the current one, unless a
 * co-lead changed it too, each new item the roadmap doesn't hold, plus an ID for every
 * item without one. Values are trimmed. An item's organisations are compared as a set,
 * its tags as the ordered list and its details as the list they show as; tags are never
 * written to an item that now has Welsh ones, nor details (STY-037 S22, STY-039 S19),
 * and a change made over whatever the field holds (`FieldChange.overwrite`) is never a
 * conflict. A new item is never a conflict or missing: it is written unless a row of
 * the roadmap holds its ID, which a write of it whose answer was lost left there
 * (STY-045). An item whose placement is written goes last in it, in the order the
 * changes give the moves (`planItemMoves`, STY-051), unless the placement's order is
 * pending: its items are then put in that order, the items a co-lead added or moved in
 * last, a new item among them inserted, unless a co-lead changed the placement's items
 * too, which is a conflict (STY-050). A removed item's row is deleted, its edits
 * beneath the removal published with it or not at all, and it takes no ID and no place
 * in a move or an order, unless a co-lead changed any of its fields, which is a
 * conflict, or it can't be found; one whose ID no row holds is removed already
 * (`planRemovals`, STY-070). Throws `AppError('unknown')` for a blank title, a
 * placement that is none of the six, an organisation the list doesn't hold, a `Last
 * updated` that is no `YYYY-MM-DD` date or two new items with one ID, which callers
 * never send, and `AppError('invalid-data')` for a family or category chosen while its
 * list is missing.
 */
export function planRoadmapPublish(
  changes: RoadmapChanges,
  snapshot: RoadmapSnapshot | null,
  createId: () => string = createItemId,
): PublishPlan {
  if (snapshot === null) {
    return { kind: "settled", outcome: { status: "roadmap-not-found" } }
  }
  const newItems = newItemWrites(changes.newItems, snapshot)
  const removals = planRemovals(changes.removals, snapshot)
  const removed = new Set(removals.found.map(({ index }) => index))
  const conflicts: Conflict[] = []
  const missingItems: (ItemChanges | ItemRemoval)[] = []
  // Where each item found is to be, by its index: only those with a placement pending.
  const movedTo = new Map<number, string>()
  const roadmapWrites: PublishWrites["roadmap"] = []
  const itemWrites: Omit<PublishWrites["items"][number], "id">[] = []

  for (const field of EDITABLE_ROADMAP_FIELDS) {
    const pending = pendingValue(field, changes.roadmap[field], snapshot)
    if (pending === null) continue
    if (isChoiceField(field) && snapshot.missingLists.has(field)) {
      throw new AppError("invalid-data", {
        message: `The ${field} can't be published without its list`,
      })
    }
    const current = roadmapValue(snapshot.roadmap, field)
    if (current === pending.value) continue
    if (current !== pending.base && !pending.overwrite) {
      conflicts.push({
        subject: "roadmap",
        field,
        base: pending.base,
        pending: pending.value,
        current,
      })
    } else {
      roadmapWrites.push({ field, value: pending.value })
    }
  }

  for (const itemChanges of changes.items) {
    // An item's edits stay beneath its removal, unpublished (STY-049 D5).
    if (changes.removals.some((each) => sameTarget(each, itemChanges))) {
      continue
    }
    const pending = EDITABLE_ITEM_FIELDS.flatMap((field) => {
      const change = pendingValue(field, itemChanges.fields[field], snapshot)
      return change === null ? [] : [{ field, ...change }]
    })
    if (pending.length === 0) continue
    const index = findEditedItem(
      snapshot.items,
      snapshot.repeatedIds,
      itemChanges,
      pending,
    )
    const current = snapshot.items[index]
    if (current === undefined) {
      missingItems.push(itemChanges)
      continue
    }
    for (const { field, base, value } of pending) {
      if (field === "placement") movedTo.set(index, value)
      const currentValue = itemValue(current, field)
      if (currentValue === value) continue
      // Writing the English alone could pair the wrong Welsh with a tag or a detail
      // (STY-037 D16, STY-039 D8).
      const gainedWelsh =
        (field === "tags" && current.hasWelshTags) ||
        (field === "details" && current.hasWelshDetails)
      if (currentValue !== base || gainedWelsh) {
        conflicts.push({
          subject: "item",
          item: itemChanges,
          field,
          base,
          pending: value,
          current: currentValue,
          ...(gainedWelsh && { gainedWelsh }),
        })
      } else {
        itemWrites.push({ index, field, value })
      }
    }
  }

  conflicts.push(...removals.conflicts)
  missingItems.push(...removals.missing)
  const orders = plannedOrders(changes, snapshot, {
    movedTo,
    notFound: [...missingItems, ...removals.gone],
    removed,
    newItems,
  })
  conflicts.push(...orders.conflicts)
  if (conflicts.length > 0 || missingItems.length > 0) {
    return {
      kind: "settled",
      outcome: { status: "refused", conflicts, missingItems },
    }
  }
  const moves = planItemMoves(
    // A row to delete is in no placement, so nothing moves past it or after it.
    snapshot.items.map(({ placement }, index) =>
      removed.has(index) ? null : placement,
    ),
    itemWrites.flatMap(({ index, field, value }) =>
      field === "placement" ? [{ index, placement: value }] : [],
    ),
    orders.targets.map(({ placement, items }) => ({
      placement,
      items: items.filter((slot) => typeof slot === "number"),
    })),
  )
  if (
    roadmapWrites.length === 0 &&
    itemWrites.length === 0 &&
    newItems.length === 0 &&
    moves.length === 0 &&
    removed.size === 0
  ) {
    return { kind: "settled", outcome: { status: "published" } }
  }
  const ids = newIds(snapshot, newItems, removed, createId)
  const newIdAt = new Map(ids.map(({ index, id }) => [index, id]))
  const idAt = (index: number) => {
    const id = snapshot.items[index]?.id ?? newIdAt.get(index)
    if (id === undefined)
      throw new Error("Every item has an ID or is given one")
    return id
  }
  return {
    kind: "write",
    writes: {
      roadmap: roadmapWrites,
      items: itemWrites.map((write) => ({ ...write, id: idAt(write.index) })),
      ids,
      removals: removals.found,
      moves,
      newItems: orderedNewItems(newItems, orders.targets),
      orders: orders.targets
        .filter(({ items, was }) => !sameSlots(items, was))
        .map(({ placement, items, was }) => ({
          placement,
          items: items.map((slot) =>
            typeof slot === "number" ? idAt(slot) : slot,
          ),
          was: was.map((index) => snapshot.items[index]?.id ?? null),
        })),
    },
  }
}

/**
 * An item of a placement as its order is planned: one the roadmap holds, by its index
 * among the snapshot's items, or a new one, by its ID.
 */
type Slot = number | string

/** A placement's pending order as the publish writes it. */
interface OrderTarget {
  placement: RoadmapPlacement
  /** The placement's items once written, in order. */
  items: Slot[]
  /** The items it holds as read, in order. */
  was: number[]
}

function sameSlots(a: readonly Slot[], b: readonly Slot[]): boolean {
  return a.length === b.length && a.every((slot, index) => slot === b[index])
}

/**
 * Each pending order as it is written over `snapshot`, or the conflict it is in (STY-050
 * S10): a placement's items as read are in neither the order's base nor the order to
 * write. That order is `arrangedOrder`'s: the pending one over the items the placement
 * is to hold, those it holds bar any moved out (`movedTo`, the found items with a
 * placement pending, in the order moved) or `removed`, by index, then the items moved
 * in and the `newItems` written. An item edited or removed that is no longer found or
 * already gone (`notFound`) has left both orders, so one that differs by it alone is no
 * conflict.
 */
function plannedOrders(
  changes: RoadmapChanges,
  snapshot: RoadmapSnapshot,
  {
    movedTo,
    notFound,
    removed,
    newItems,
  }: {
    movedTo: ReadonlyMap<number, string>
    notFound: readonly ItemTarget[]
    removed: ReadonlySet<number>
    newItems: PublishWrites["newItems"]
  },
): { conflicts: OrderConflict[]; targets: OrderTarget[] } {
  const conflicts: OrderConflict[] = []
  const targets: OrderTarget[] = []
  const found = (entry: OrderedItem) =>
    !notFound.some(({ item, position }) =>
      entry.id === null
        ? item.id === null && position === entry.position
        : item.id === entry.id,
    )
  const written = new Set(newItems.map(({ id }) => id))
  /** Each of `ordered` that is still an item, or a new one to write. */
  const slotsOf = (ordered: readonly OrderedItem[]): Slot[] => {
    const known = ordered.filter(found)
    const indexes = findOrderedItems(snapshot.items, known, changes.items)
    return known.flatMap(({ id }, at): Slot[] => {
      const index = indexes[at] ?? -1
      if (index >= 0) return [index]
      return id !== null && written.has(id) ? [id] : []
    })
  }

  for (const order of changes.orders) {
    const { placement } = order
    const was = snapshot.items.flatMap((item, index) =>
      item.placement === placement ? [index] : [],
    )
    const present: Slot[] = [
      ...was.filter(
        (index) =>
          !removed.has(index) &&
          (movedTo.get(index) ?? placement) === placement,
      ),
      ...[...movedTo.keys()].filter(
        (index) =>
          movedTo.get(index) === placement &&
          snapshot.items[index]?.placement !== placement,
      ),
      ...newItems.flatMap(({ id, fields }) =>
        fields.some(
          ({ field, value }) => field === "placement" && value === placement,
        )
          ? [id]
          : [],
      ),
    ]
    const items = arrangedOrder(slotsOf(order.items), present)
    // A base item that has gone is one more than the placement holds: never the same.
    const base = order.base.filter(found)
    const baseHeld = base.length === was.length && sameSlots(slotsOf(base), was)
    if (baseHeld || sameSlots(items, was)) {
      targets.push({ placement, items, was })
    } else {
      conflicts.push({
        subject: "order",
        placement,
        base: order.base,
        pending: order.items,
        current: was.flatMap((index) => {
          const item = snapshot.items[index]
          return item
            ? [{ item: orderedItem(item, index), title: item.title }]
            : []
        }),
      })
    }
  }
  return { conflicts, targets }
}

/**
 * `newItems` in the order to write them, each that a pending order puts before an item
 * the roadmap holds with that item, to be inserted before it; the rest are appended.
 * Those of one placement with a pending order take the places they have between them,
 * in that order's sequence.
 */
function orderedNewItems(
  newItems: PublishWrites["newItems"],
  targets: readonly OrderTarget[],
): PublishWrites["newItems"] {
  // The item each new item of a pending order goes before, when one follows it.
  const before = new Map<string, number | undefined>()
  for (const { items } of targets) {
    items.forEach((slot, at) => {
      if (typeof slot !== "string") return
      before.set(
        slot,
        items.slice(at).find((next) => typeof next === "number"),
      )
    })
  }
  const groups = targets.map(({ items }) =>
    items.filter((slot) => typeof slot === "string"),
  )
  return newItems.map((newItem) => {
    const group = groups.find((ids) => ids.includes(newItem.id))
    if (!group) return newItem
    // Among the new items, the places of its placement's go to them in its order.
    const turn = newItems
      .filter(({ id }) => group.includes(id))
      .indexOf(newItem)
    const taking = newItems.find(({ id }) => id === group[turn]) ?? newItem
    const next = before.get(taking.id)
    return next === undefined ? taking : { ...taking, before: next }
  })
}

/**
 * How many of `writes` the roadmap now holds (`null`: no longer listed, so unknown),
 * to settle a write whose answer was lost (ADR-012 Option 16). Items are found by the
 * ID each holds once written, never by place, as rows may have moved since; a new item
 * is held when a row holds its ID, whatever that row now reads (STY-045). A move is held
 * when its placement is: the write is all or nothing, so no place is looked at (STY-051
 * S8). A placement's order is held when the placement's items are in it and not held
 * when they are in the order they had; in any other, as after a co-lead's change, it
 * can't be told (STY-050 S14). A removal is held as `heldRemoval` judges it (STY-070 S6).
 */
export function heldWrites(
  writes: PublishWrites,
  snapshot: RoadmapSnapshot | null,
): "all" | "none" | "some" {
  if (snapshot === null) return "some"
  const withId = (id: string) => snapshot.items.find((item) => item.id === id)
  const orders = writes.orders.map(({ placement, items, was }) => {
    const now = snapshot.items.flatMap((item) =>
      item.placement === placement ? [item.id] : [],
    )
    const holds = (ids: readonly (string | null)[]) =>
      ids.length === now.length && ids.every((id, at) => id === now[at])
    return holds(items) ? true : holds(was) ? false : null
  })
  if (orders.includes(null)) return "some"
  const held = [
    ...orders,
    ...writes.roadmap.map(
      ({ field, value }) => roadmapValue(snapshot.roadmap, field) === value,
    ),
    ...writes.items.map(({ id, field, value }) => {
      const item = withId(id)
      return item !== undefined && itemValue(item, field) === value
    }),
    ...writes.ids.map(({ id }) => snapshot.takenIds.has(id)),
    ...writes.newItems.map(({ id }) => snapshot.takenIds.has(id)),
  ]
  // Held by one without an ID only once every other write is.
  let heldIfOthersAre = false
  for (const removal of writes.removals) {
    const verdict = heldRemoval(removal, snapshot.items, snapshot.takenIds)
    if (verdict === "if-others-held") heldIfOthersAre = true
    else held.push(verdict)
  }
  // A row the read skips (its title cleared since) may still hold an item's write.
  const unread = writes.items.some(
    ({ id }) => withId(id) === undefined && snapshot.takenIds.has(id),
  )
  if (!unread && held.every(Boolean)) return "all"
  return unread || heldIfOthersAre || held.some(Boolean) ? "some" : "none"
}

/**
 * What is written for each new item the roadmap doesn't hold yet, in the order added:
 * every field it has, as `publishedValue` gives it, so as an edit of that field is
 * written. One whose ID a row holds, read or not, was written already.
 */
function newItemWrites(
  newItems: RoadmapChanges["newItems"],
  snapshot: RoadmapSnapshot,
): PublishWrites["newItems"] {
  if (new Set(newItems.map(({ id }) => id)).size !== newItems.length) {
    throw new AppError("unknown", {
      message: "Two new items can't be published with one ID",
    })
  }
  return newItems.flatMap(({ id, values }) => {
    const fields = EDITABLE_ITEM_FIELDS.flatMap((field) => {
      const value = publishedValue(field, values[field], snapshot)
      return value === "" ? [] : [{ field, value }]
    })
    return snapshot.takenIds.has(id) ? [] : [{ id, fields }]
  })
}

/**
 * A change's value as it is published, with its base, or `null` when it changes
 * nothing. One set over whatever the field holds is never nothing.
 */
function pendingValue(
  field: string,
  change: FieldChange | undefined,
  snapshot: RoadmapSnapshot,
): { base: string; value: string; overwrite: boolean } | null {
  if (change === undefined) return null
  const value = publishedValue(field, change.value, snapshot)
  const overwrite = change.overwrite === true
  return value === change.base && !overwrite
    ? null
    : { base: change.base, value, overwrite }
}

/**
 * A field's value as it is published, an edit's or a new item's: trimmed, a set of
 * organisations as `organisationIdsValue` gives it, tags as `tagsValue` does and details
 * as `detailsValue` does. Throws for a value that is never sent (`planRoadmapPublish`).
 */
function publishedValue(
  field: string,
  raw: string,
  snapshot: RoadmapSnapshot,
): string {
  const value =
    field === "organisationIds"
      ? listedOrganisationIdsValue(raw, snapshot.organisationIds)
      : field === "tags"
        ? tagsValue(tagsOf(raw))
        : field === "details"
          ? detailsValue(detailsOf(raw))
          : raw.trim()
  if (value === "" && REQUIRED_FIELDS.has(field)) {
    throw new AppError("unknown", {
      message: `A blank ${field} can't be published`,
    })
  }
  if (field === "placement" && !isRoadmapPlacement(value)) {
    throw new AppError("unknown", {
      message: "Only one of the six placements can be published",
    })
  }
  if (field === "lastUpdated" && value !== "" && !isCalendarDate(value)) {
    throw new AppError("unknown", {
      message: "Only a YYYY-MM-DD date can be published as Last updated",
    })
  }
  return value
}

/** `value`'s organisations as one value, each of which the list must hold. */
function listedOrganisationIdsValue(
  value: string,
  listed: ReadonlySet<string>,
): string {
  const ids = organisationIdsOf(value)
    .map((id) => id.trim())
    .filter((id) => id !== "")
  if (!ids.every((id) => listed.has(id))) {
    throw new AppError("unknown", {
      message: "Only an organisation the list holds can be published",
    })
  }
  return organisationIdsValue(ids)
}

/**
 * A new ID for every item without one but those `removed`, by index, none repeating an
 * ID the roadmap holds or one a new item is written with.
 */
function newIds(
  snapshot: RoadmapSnapshot,
  newItems: PublishWrites["newItems"],
  removed: ReadonlySet<number>,
  createId: () => string,
): PublishWrites["ids"] {
  const taken = new Set([...snapshot.takenIds, ...newItems.map(({ id }) => id)])
  return snapshot.items.flatMap(({ id }, index) => {
    if (id !== null || removed.has(index)) return []
    const next = createUnusedId(taken, createId)
    taken.add(next)
    return [{ index, id: next }]
  })
}
