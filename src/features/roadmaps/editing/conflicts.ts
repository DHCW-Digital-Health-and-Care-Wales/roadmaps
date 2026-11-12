/**
 * What a refused publish leaves to decide (STY-026): each field a co-lead changed since
 * it was edited, until the Product Lead keeps theirs or takes the co-lead's, and the
 * edited items the co-lead removed, whose changes cannot be kept. Pure functions over
 * `RoadmapChanges`; a conflict needs no state of its own, as the pending change says
 * whether it is still open.
 */

import {
  EDITABLE_ITEM_FIELDS,
  EDITABLE_ROADMAP_FIELDS,
  type FieldChange,
  type FieldConflict,
  type ItemChanges,
  type RoadmapChanges,
  isChoiceField,
  itemText,
  roadmapValue,
} from "@/domain/roadmap/roadmap-changes"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import {
  applyItemChanges,
  applyRoadmapChanges,
  matchItemChanges,
  sameTarget,
} from "./pending-changes"

/** A conflict still to decide, as the review shows it. */
export interface OpenConflict {
  readonly conflict: FieldConflict
  /** The pending value now: what the publish sent, unless edited again since. */
  readonly yours: string
  /** The edited item as it will read once published; `null` for the roadmap's text. */
  readonly item: RoadmapItem | null
  /** Tells conflicts apart, for React. */
  readonly key: string
}

/** Where the roadmap's own text sorts among the edited items: before them all. */
const ROADMAP_FIRST = -1

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
 * items in their order: one is open while its field is pending and not yet edited from
 * the co-lead's text. Keep mine, Use theirs, undoing the edit or a read that finds the
 * field already holding it each close it.
 */
export function openConflicts(
  conflicts: readonly FieldConflict[],
  changes: RoadmapChanges | undefined,
): OpenConflict[] {
  const open = conflicts.flatMap(
    (conflict): { at: number; fieldAt: number; open: OpenConflict }[] => {
      const { change, entry } = pendingOf(changes, conflict)
      if (!change || change.base === conflict.current) return []
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
    },
  )
  return open
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
 * next publish writes it, and still stops for any later change by a co-lead (D3).
 */
export function keepMine(
  changes: RoadmapChanges,
  conflict: FieldConflict,
): RoadmapChanges {
  return withConflictField(changes, conflict, (change) => ({
    ...change,
    base: conflict.current,
  }))
}

/** "Use theirs": the pending change is dropped, leaving the co-lead's text. */
export function takeTheirs(
  changes: RoadmapChanges,
  conflict: FieldConflict,
): RoadmapChanges {
  return withConflictField(changes, conflict, () => undefined)
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
 * `roadmap` showing the English `conflicts` found a co-lead wrote to its own text, in
 * each field that holds what it did in `since`, the roadmap as read when the publish
 * began. A field a read during the publish changed is left as that read found it, as it
 * may be newer than the publish's (DEF-003). With nothing read when it began, `since` is
 * `undefined` and nothing is patched. A family or category is not patched: the conflict
 * holds only its ID, not the names and colour a read gives it (STY-028).
 */
export function withCurrentRoadmapText(
  roadmap: Roadmap,
  conflicts: readonly FieldConflict[],
  since: Roadmap | undefined,
): Roadmap {
  const fields = Object.fromEntries(
    conflicts.flatMap((conflict) =>
      conflict.subject === "roadmap" &&
      !isChoiceField(conflict.field) &&
      since &&
      roadmapValue(roadmap, conflict.field) ===
        roadmapValue(since, conflict.field)
        ? [[conflict.field, currentOf(conflict)]]
        : [],
    ),
  )
  return applyRoadmapChanges(roadmap, { roadmap: fields, items: [] })
}

/**
 * `items` showing the English `conflicts` found a co-lead wrote to them, in each field
 * that holds what it did in `since`, the items as read when the publish began, as
 * `withCurrentRoadmapText` does; an item not in `since` is left as it is.
 */
export function withCurrentItemText(
  items: readonly RoadmapItem[],
  conflicts: readonly FieldConflict[],
  since: readonly RoadmapItem[] | undefined,
): RoadmapItem[] {
  const itemConflicts = conflicts.flatMap((conflict) =>
    conflict.subject === "item" ? [conflict] : [],
  )
  const conflicted: RoadmapChanges = {
    roadmap: {},
    items: itemConflicts.map((conflict) => conflict.item),
  }
  const before = itemsByEntry(since ?? [], conflicted)
  const matched = matchItemChanges(items, conflicted)
  return items.map((item, index) => {
    const entry = matched.get(index)
    const was = entry && before.get(entry)
    if (!entry || !was) return item
    const fields = Object.fromEntries(
      itemConflicts
        .filter(
          (conflict) =>
            sameTarget(conflict.item, entry) &&
            itemText(item, conflict.field) === itemText(was, conflict.field),
        )
        .map((conflict) => [conflict.field, currentOf(conflict)]),
    )
    return applyItemChanges(item, { ...entry, fields })
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
