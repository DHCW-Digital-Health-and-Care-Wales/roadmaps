/**
 * What a refused publish leaves to decide (STY-026): each field a co-lead changed since
 * it was edited, and each placement's order they changed since it was reordered
 * (STY-050), until the Product Lead keeps theirs or takes the co-lead's, and the
 * edited items the co-lead removed, whose changes cannot be kept. Pure functions over
 * `RoadmapChanges`; a conflict needs no state of its own, as the pending change says
 * whether it is still open.
 */

import {
  orderedItem,
  sameOrder,
  sameOrderedItem,
} from "@/domain/roadmap/placement-order"
import {
  type Conflict,
  EDITABLE_ITEM_FIELDS,
  EDITABLE_ROADMAP_FIELDS,
  type EditableItemField,
  type FieldChange,
  type FieldConflict,
  type ItemChanges,
  type OrderConflict,
  type OrderedItem,
  type RoadmapChanges,
  type RoadmapChoiceField,
  isChoiceField,
  itemValue,
  NO_CHANGES,
  organisationIdsOf,
  roadmapValue,
} from "@/domain/roadmap/roadmap-changes"
import type {
  ContentLanguage,
  LocalisedText,
} from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import { groupRoadmapItems } from "../group-roadmap-items"
import type { RoadmapLists } from "../hooks/use-roadmap-lists"
import { shortNamesOf } from "../sort-organisations"
import type { PageItem } from "./page-items"
import {
  applyItemChanges,
  applyRoadmapChanges,
  matchItemChanges,
  sameTarget,
} from "./pending-changes"

/** A conflict still to decide, as the review shows it. */
export type OpenConflict = {
  /** Tells conflicts apart, for React. */
  readonly key: string
} & (
  | {
      readonly conflict: FieldConflict
      /** The pending value now: what the publish sent, unless edited again since. */
      readonly yours: string
      /** The edited item as it will read once published; `null` for the roadmap's text. */
      readonly item: RoadmapItem | null
    }
  /** A placement's order: the review draws its two orders (`reviewedOrders`). */
  | { readonly conflict: OrderConflict }
)

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
 * S11): one is open while its field is pending and not yet edited from the co-lead's
 * text, or its order is pending and not yet from the order found. Keep mine, Use
 * theirs, undoing the edit or a read that finds the roadmap already holding it each
 * close it. Tags or details that have gained Welsh versions can't be kept (STY-037 S22,
 * STY-039 S19), so theirs stays open until the change is given up.
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
    const { change, entry } = pendingOf(changes, conflict)
    if (!change) return []
    if (!conflict.gainedWelsh && change.base === conflict.current) return []
    if (conflict.subject === "roadmap") {
      return [
        {
          at: ROADMAP_FIRST,
          fieldAt: EDITABLE_ROADMAP_FIELDS.indexOf(conflict.field),
          open: {
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
    if (!order || sameOrder(order.base, found)) return []
    // Before its placement's items; with none of them in conflict, after every item.
    const first = Math.min(
      ...fields.flatMap(({ at, open }) =>
        "item" in open && open.item?.placement === conflict.placement
          ? [at]
          : [],
      ),
    )
    return [
      {
        at: first - JUST_BEFORE,
        fieldAt: 0,
        open: { conflict, key: `order-${conflict.placement}` },
      },
    ]
  })
  return [...fields, ...orders]
    .sort((a, b) => a.at - b.at || a.fieldAt - b.fieldAt)
    .map(({ open: each }) => each)
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
 * order of the items they know, a co-lead's last (STY-050 S12).
 */
export function keepMine(
  changes: RoadmapChanges,
  conflict: Conflict,
): RoadmapChanges {
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
 * order.
 */
export function takeTheirs(
  changes: RoadmapChanges,
  conflict: Conflict,
): RoadmapChanges {
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

/** One item of an order the review shows, by the title the page shows it with. */
export interface OrderLine {
  /** Tells the items of one order apart, for React. */
  readonly key: string
  readonly title: LocalisedText
}

/**
 * The two orders the review shows for `conflict` (STY-050 S11), from `pageItems`, the
 * page's items: `yours`, what "Keep mine" would publish, the placement's items the
 * Product Lead knows in their order, with the items a co-lead added or moved in last
 * and those they removed or moved out gone; and `theirs`, the order the publish found.
 * An item is shown by the title the page shows, so one reads the same in both. The
 * page may not hold what the publish found, when the read after it failed: an item
 * of the page's that the publish did not find in the placement is shown only if the
 * Product Lead moved or added it there, and one it did find that the page lacks is
 * shown last, unless the Product Lead moved it out.
 */
export function reviewedOrders(
  conflict: OrderConflict,
  pageItems: readonly PageItem[],
): { yours: OrderLine[]; theirs: OrderLine[] } {
  const onPage = pageItems.map((pageItem, position) => ({
    pageItem,
    ordered:
      pageItem.newItemId === undefined
        ? orderedItem(pageItem.item, position)
        : { id: pageItem.newItemId },
  }))
  const lineOf = (ordered: OrderedItem, title: LocalisedText): OrderLine => ({
    key: ordered.id ?? `at-${String(ordered.position)}`,
    title:
      onPage.find((each) => sameOrderedItem(each.ordered, ordered))?.pageItem
        .shown.title ?? title,
  })
  const found = (ordered: OrderedItem) =>
    conflict.current.some(({ item }) => sameOrderedItem(item, ordered))
  // The Product Lead's own: moved to where the page shows it, or new.
  const placedByThem = ({ entry, newItemId }: PageItem) =>
    newItemId !== undefined || entry?.fields.placement !== undefined

  const shown =
    groupRoadmapItems(
      onPage,
      ({ pageItem }) => pageItem.shown.placement,
      ({ pageItem }) => pageItem.turn,
    )
      .placements.find(({ placement }) => placement === conflict.placement)
      ?.items.map(({ item }) => item)
      .filter(
        ({ pageItem, ordered }) => found(ordered) || placedByThem(pageItem),
      ) ?? []
  const added = conflict.current.filter(({ item }) => {
    const known = onPage.find((each) => sameOrderedItem(each.ordered, item))
    // One the page never read is a co-lead's; one it shows elsewhere is theirs too,
    // moved in since, unless the Product Lead moved it out.
    if (known === undefined) return true
    return !shown.includes(known) && !placedByThem(known.pageItem)
  })
  return {
    yours: [
      ...shown.map(({ pageItem, ordered }) =>
        lineOf(ordered, pageItem.shown.title),
      ),
      ...added.map(({ item, title }) => lineOf(item, title)),
    ],
    theirs: conflict.current.map(({ item, title }) => lineOf(item, title)),
  }
}

/**
 * `changes` without the entries of `missing`, items a publish could no longer find: each
 * by the item it was loaded with, which edits made while publishing keep, or, once a
 * read has moved it, by its ID.
 */
export function discardItems(
  changes: RoadmapChanges,
  missing: readonly ItemChanges[],
): RoadmapChanges {
  const gone = (entry: ItemChanges) =>
    missing.some(
      (each) =>
        each.item === entry.item ||
        (each.item.id !== null && each.item.id === entry.item.id),
    )
  const items = changes.items.filter((entry) => !gone(entry))
  return items.length === changes.items.length ? changes : { ...changes, items }
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
