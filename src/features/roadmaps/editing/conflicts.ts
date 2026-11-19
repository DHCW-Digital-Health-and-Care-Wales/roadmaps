/**
 * What a refused publish leaves to decide (STY-026): each field a co-lead changed since
 * it was edited, and each placement's order they changed since it was reordered
 * (STY-050), until the Product Lead keeps theirs or takes the co-lead's, and the
 * edited items the co-lead removed, whose changes cannot be kept. Pure functions over
 * `RoadmapChanges`; a conflict needs no state of its own, as the pending change says
 * whether it is still open. The two orders the review draws are `order-review.ts`'s.
 */

import { changedFields } from "@/domain/roadmap/find-edited-item"
import {
  removalOf,
  removeAnyway,
  undoRemoval,
} from "@/domain/roadmap/item-removal"
import {
  sameItemAcrossReads,
  sameOrder,
} from "@/domain/roadmap/placement-order"
import {
  type Conflict,
  EDITABLE_ITEM_FIELDS,
  EDITABLE_ROADMAP_FIELDS,
  type EditableItemField,
  type FieldChange,
  type FieldConflict,
  type ItemChanges,
  type ItemTarget,
  type OrderConflict,
  type RemovalConflict,
  type RoadmapChanges,
  type RoadmapChoiceField,
  isChoiceField,
  itemValue,
  NO_CHANGES,
  organisationIdsOf,
  roadmapValue,
  sameTarget,
} from "@/domain/roadmap/roadmap-changes"
import type { ContentLanguage } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { ROADMAP_PLACEMENTS } from "@/domain/roadmap/roadmap-placement"

import type { RoadmapLists } from "../hooks/use-roadmap-lists"
import { shortNamesOf } from "../sort-organisations"
import {
  applyItemChanges,
  applyRoadmapChanges,
  matchItemChanges,
} from "./pending-changes"

/** A field's conflict still to decide, as the review shows it. */
export interface OpenFieldConflict {
  readonly kind: "field"
  readonly conflict: FieldConflict
  /** The pending value now: what the publish sent, unless edited again since. */
  readonly yours: string
  /** The edited item as it will read once published; `null` for the roadmap's text. */
  readonly item: RoadmapItem | null
  /** Tells conflicts apart, for React. */
  readonly key: string
}

/**
 * A placement's order still to decide: the review draws its two orders
 * (`reviewedOrders`).
 */
export interface OpenOrderConflict {
  readonly kind: "order"
  readonly conflict: OrderConflict
  readonly key: string
}

/**
 * An item removed that a co-lead changed, still to decide (STY-049 S6): the review
 * draws each field they changed, with "Remove anyway" and "Keep the item".
 */
export interface OpenRemovalConflict {
  readonly kind: "removal"
  readonly conflict: RemovalConflict
  readonly key: string
}

/** A conflict still to decide, as the review shows it. */
export type OpenConflict =
  OpenFieldConflict | OpenOrderConflict | OpenRemovalConflict

/** Where the roadmap's own text sorts among the edited items: before them all. */
const ROADMAP_FIRST = -1

/** How far before its placement's first item in conflict an order's conflict sorts. */
const JUST_BEFORE = 0.5

/** The pending change `conflict` is about, and the item entry holding it, if any. */
function pendingOf(
  changes: RoadmapChanges | undefined,
  conflict: FieldConflict,
): { change: FieldChange | undefined; entry: ItemChanges | undefined } {
  if (conflict.subject === "roadmap") {
    return { change: changes?.roadmap[conflict.field], entry: undefined }
  }
  const entry = changes?.items.find((each) => sameTarget(each, conflict.item))
  return { change: entry?.fields[conflict.field], entry }
}

/**
 * The conflicts of `conflicts` still open over `changes`, the roadmap's text first, then
 * items in their order, a placement's order just before the first of its items (STY-050
 * S11), or, with none of them in conflict, after every item, in page order. One is open
 * while its field is pending and not yet edited from the co-lead's text, its order is
 * pending and not yet from the order found, or its item's removal is pending and not
 * yet from the item found (STY-049 S6). Keep mine, Use theirs, undoing the edit or the
 * removal, or a read that finds the roadmap already holding it each close it. Tags or
 * details that have gained Welsh versions can't be kept (STY-037 S22, STY-039 S19), so
 * theirs stays open until the change is given up.
 */
export function openConflicts(
  conflicts: readonly Conflict[],
  changes: RoadmapChanges | undefined,
): OpenConflict[] {
  interface Sorted {
    at: number
    fieldAt: number
    open: OpenConflict
  }
  const fields = conflicts.flatMap((conflict): Sorted[] => {
    if (conflict.subject === "order") return []
    if (conflict.subject === "removal") {
      const removal = removalOf(changes, conflict.removal)
      if (
        !removal ||
        changedFields(removal.item, conflict.current).length === 0
      )
        return []
      const target = removal.item.id ?? `at-${String(removal.position)}`
      return [
        {
          at: removal.position,
          // Before the item's own fields, though none of them is pending beneath it.
          fieldAt: -1,
          open: { kind: "removal", conflict, key: `removal-${target}` },
        },
      ]
    }
    const { change, entry } = pendingOf(changes, conflict)
    if (!change) return []
    if (!conflict.gainedWelsh && change.base === conflict.current) return []
    if (conflict.subject === "roadmap") {
      return [
        {
          at: ROADMAP_FIRST,
          fieldAt: EDITABLE_ROADMAP_FIELDS.indexOf(conflict.field),
          open: {
            kind: "field",
            conflict,
            yours: change.value,
            item: null,
            key: `roadmap-${conflict.field}`,
          },
        },
      ]
    }
    // A pending item change is always in an entry.
    if (!entry) return []
    // An item without an ID yet is told apart by its place.
    const target = entry.item.id ?? `at-${String(entry.position)}`
    return [
      {
        at: entry.position,
        fieldAt: EDITABLE_ITEM_FIELDS.indexOf(conflict.field),
        open: {
          kind: "field",
          conflict,
          yours: change.value,
          item: applyItemChanges(entry.item, entry),
          key: `item-${target}-${conflict.field}`,
        },
      },
    ]
  })
  const orders = conflicts.flatMap((conflict): Sorted[] => {
    if (conflict.subject !== "order") return []
    const order = changes?.orders.find(
      ({ placement }) => placement === conflict.placement,
    )
    const found = conflict.current.map(({ item }) => item)
    // The base may be of another read than the one the publish made: "Keep mine" takes
    // the order found, and the store then finds its items where the page read them.
    if (!order || sameOrder(order.base, found, sameItemAcrossReads)) return []
    const first = Math.min(
      ...fields.flatMap(({ at, open }) =>
        placementOf(open) === conflict.placement ? [at] : [],
      ),
    )
    return [
      {
        at: first - JUST_BEFORE,
        fieldAt: ROADMAP_PLACEMENTS.indexOf(conflict.placement),
        open: { kind: "order", conflict, key: `order-${conflict.placement}` },
      },
    ]
  })
  return [...fields, ...orders]
    .sort(
      // Two orders with no item in conflict are both after every item: page order.
      (a, b) => (a.at === b.at ? 0 : a.at - b.at) || a.fieldAt - b.fieldAt,
    )
    .map(({ open: each }) => each)
}

/** Where the item of an open field's or removal's conflict shows: none for the roadmap. */
function placementOf(open: OpenConflict): RoadmapItem["placement"] {
  if (open.kind === "field") return open.item?.placement ?? null
  if (open.kind === "removal") return open.conflict.removal.item.placement
  return null
}

/** `changes` with `conflict`'s field updated by `update`; `undefined` drops it. */
function withConflictField(
  changes: RoadmapChanges,
  conflict: FieldConflict,
  update: (change: FieldChange) => FieldChange | undefined,
): RoadmapChanges {
  const { change, entry } = pendingOf(changes, conflict)
  if (!change) return changes
  const next = update(change)
  const fields = <F extends string>(
    all: Partial<Record<F, FieldChange>>,
    field: F,
  ): Partial<Record<F, FieldChange>> => {
    const rest = Object.fromEntries(
      Object.entries(all).filter(([each]) => each !== field),
    ) as Partial<Record<F, FieldChange>>
    return next ? { ...rest, [field]: next } : rest
  }
  if (conflict.subject === "roadmap") {
    return { ...changes, roadmap: fields(changes.roadmap, conflict.field) }
  }
  if (!entry) return changes
  const updated = fields(entry.fields, conflict.field)
  return {
    ...changes,
    items: changes.items.flatMap((each) => {
      if (each !== entry) return [each]
      return Object.keys(updated).length === 0
        ? []
        : [{ ...entry, fields: updated }]
    }),
  }
}

/**
 * "Keep mine": the pending change stays, now edited from the co-lead's text, so the
 * next publish writes it, and still stops for any later change by a co-lead (D3). An
 * order stays pending from the order found: the next publish writes the Product Lead's
 * order of the items they know, a co-lead's last (STY-050 S12). A removal stays, from
 * the item found: "Remove anyway" (STY-070 S4).
 */
export function keepMine(
  changes: RoadmapChanges,
  conflict: Conflict,
): RoadmapChanges {
  if (conflict.subject === "removal") return removeAnyway(changes, conflict)
  if (conflict.subject === "order") {
    const base = conflict.current.map(({ item }) => item)
    return {
      ...changes,
      orders: changes.orders.map((order) =>
        order.placement === conflict.placement ? { ...order, base } : order,
      ),
    }
  }
  return withConflictField(changes, conflict, (change) => ({
    ...change,
    base: conflict.current,
  }))
}

/**
 * "Use theirs": the pending change is dropped, leaving the co-lead's text, or their
 * order. A removal is dropped, leaving the item as they made it, with the edits
 * beneath the removal pending again: "Keep the item" (STY-070 S4).
 */
export function takeTheirs(
  changes: RoadmapChanges,
  conflict: Conflict,
): RoadmapChanges {
  if (conflict.subject === "removal") {
    return undoRemoval(changes, conflict.removal)
  }
  if (conflict.subject === "order") {
    return {
      ...changes,
      orders: changes.orders.filter(
        ({ placement }) => placement !== conflict.placement,
      ),
    }
  }
  return withConflictField(changes, conflict, () => undefined)
}

/**
 * `changes` without the edits and removals of `missing`, items a publish could no
 * longer find (ADR-012 Option 13): each by the item it was loaded with, which edits
 * made while publishing keep, or, once a read has moved it, by its ID. An edit or a
 * removal of the same item goes with either.
 */
export function discardItems(
  changes: RoadmapChanges,
  missing: readonly ItemTarget[],
): RoadmapChanges {
  const gone = (entry: ItemTarget) =>
    missing.some(
      (each) =>
        each.item === entry.item ||
        (each.item.id !== null && each.item.id === entry.item.id),
    )
  const removed = changes.removals.filter(gone)
  const removals = changes.removals.filter((entry) => !removed.includes(entry))
  const items = changes.items.filter(
    (entry) =>
      !gone(entry) && !removed.some((removal) => sameTarget(removal, entry)),
  )
  return items.length === changes.items.length &&
    removals.length === changes.removals.length
    ? changes
    : { ...changes, items, removals }
}

/** What `conflict` found its field holds, as a change from its base. */
function currentOf(conflict: FieldConflict): FieldChange {
  return { base: conflict.base, value: conflict.current }
}

/**
 * `roadmap` showing what `conflicts` found a co-lead wrote to its own text, family and
 * category, in each field that holds what it did in `since`, the roadmap as read when
 * the publish began. A field a read during the publish changed is left as that read
 * found it, as it may be newer than the publish's (DEF-003). With nothing read when it
 * began, `since` is `undefined` and nothing is patched. The conflict holds a family or
 * category only by its ID, so one is patched only to none or to one `lists` names
 * (STY-028).
 */
export function withCurrentRoadmapText(
  roadmap: Roadmap,
  conflicts: readonly Conflict[],
  since: Roadmap | undefined,
  lists: RoadmapLists = { families: undefined, categories: undefined },
): Roadmap {
  const fields = Object.fromEntries(
    conflicts.flatMap((conflict) =>
      conflict.subject === "roadmap" &&
      since &&
      roadmapValue(roadmap, conflict.field) ===
        roadmapValue(since, conflict.field) &&
      (!isChoiceField(conflict.field) ||
        isNamed(conflict.field, conflict.current, lists))
        ? [[conflict.field, currentOf(conflict)]]
        : [],
    ),
  )
  return applyRoadmapChanges(roadmap, { ...NO_CHANGES, roadmap: fields }, lists)
}

/** Whether `value` is none, or a family or category `lists` names. */
function isNamed(
  field: RoadmapChoiceField,
  value: string,
  lists: RoadmapLists,
): boolean {
  const list = field === "familyId" ? lists.families : lists.categories
  return value === "" || (list?.some(({ id }) => id === value) ?? false)
}

/**
 * `items` showing the English `conflicts` found a co-lead wrote to them, in each field
 * that holds what it did in `since`, the items as read when the publish began, as
 * `withCurrentRoadmapText` does; an item not in `since` is left as it is. An item a
 * co-lead unplaced shows as having no horizon, and one whose tags or details gained
 * Welsh versions as having them, so its form no longer changes them (STY-037 S20, S22;
 * STY-039 S18, S19).
 */
export function withCurrentItemText(
  items: readonly RoadmapItem[],
  conflicts: readonly Conflict[],
  since: readonly RoadmapItem[] | undefined,
): RoadmapItem[] {
  const itemConflicts = conflicts.flatMap((conflict) =>
    conflict.subject === "item" ? [conflict] : [],
  )
  const conflicted: RoadmapChanges = {
    ...NO_CHANGES,
    items: itemConflicts.map((conflict) => conflict.item),
  }
  const before = itemsByEntry(since ?? [], conflicted)
  const matched = matchItemChanges(items, conflicted)
  return items.map((item, index) => {
    const entry = matched.get(index)
    const was = entry && before.get(entry)
    if (!entry || !was) return item
    const found = itemConflicts.filter(
      (conflict) =>
        sameTarget(conflict.item, entry) &&
        itemValue(item, conflict.field) === itemValue(was, conflict.field),
    )
    const fields = Object.fromEntries(
      found.map((conflict) => [conflict.field, currentOf(conflict)]),
    )
    const gained = (field: EditableItemField) =>
      found.some((conflict) => conflict.field === field && conflict.gainedWelsh)
    const shown = {
      ...applyItemChanges(item, { ...entry, fields }),
      // Which Welsh they are isn't known until the next read.
      ...(gained("tags") && { hasWelshTags: true }),
      ...(gained("details") && { hasWelshDetails: true }),
    }
    // A co-lead may unplace an item, which no edit can; its horizon as written isn't
    // known until the next read, so it shows as having none.
    return fields.placement?.value === ""
      ? { ...shown, placement: null, writtenHorizon: "" }
      : shown
  })
}

/**
 * Each entry of `changes` with the item of `items` it matches. `matchItemChanges` keeps
 * the entry objects, so an entry looks up the same edit's item in another read.
 */
function itemsByEntry(
  items: readonly RoadmapItem[],
  changes: RoadmapChanges,
): ReadonlyMap<ItemChanges, RoadmapItem> {
  return new Map(
    [...matchItemChanges(items, changes)].flatMap(([index, entry]) => {
      const item = items[index]
      return item ? [[entry, item] as const] : []
    }),
  )
}

/**
 * A set of organisations, as a conflict holds it (`organisationIdsValue`), the way the
 * review shows it: by short name, as the card sorts them, then by ID each organisation
 * `organisations` doesn't hold, as while the list can't be read, so a set is never
 * shown as empty when it isn't (STY-034 S7).
 */
export function describeOrganisations(
  value: string,
  organisations: readonly Organisation[] | undefined,
  language: ContentLanguage,
): string {
  const ids = organisationIdsOf(value)
  const listed = new Set(organisations?.map(({ id }) => id))
  return [
    ...shortNamesOf(organisations, ids, language),
    ...ids.filter((id) => !listed.has(id)),
  ].join(", ")
}
