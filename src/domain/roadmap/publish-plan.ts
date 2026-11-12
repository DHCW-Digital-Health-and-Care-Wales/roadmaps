/**
 * What publishing a roadmap's changes writes, decided against a fresh read of the
 * roadmap (ADR-012 §"Finding what to write"). Pure, so every `RoadmapRepository` applies
 * the same rules; each locates the cells itself.
 */

import { AppError } from "@/lib/errors"

import { findEditedItem } from "./find-edited-item"
import { createItemId } from "./item-id"
import type { Roadmap } from "./roadmap"
import {
  EDITABLE_ITEM_FIELDS,
  EDITABLE_ROADMAP_FIELDS,
  type EditableItemField,
  type EditableRoadmapField,
  type FieldChange,
  type FieldConflict,
  type ItemChanges,
  itemText,
  type PublishOutcome,
  type RoadmapChanges,
  roadmapValue,
} from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"

/** A roadmap as just read, to publish over. */
export interface RoadmapSnapshot {
  roadmap: Roadmap
  /** In order; a later repeat of an ID has `id: null`, as the parser reads it. */
  items: readonly RoadmapItem[]
  /** IDs held by more than one row. */
  repeatedIds: ReadonlySet<string>
  /** Every ID the roadmap's rows hold, kept or not: a new ID is none of these. */
  takenIds: ReadonlySet<string>
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
  /** New IDs, for items with none: they go with any other write (ADR-012 Option 6). */
  ids: { index: number; id: string }[]
}

export type PublishPlan =
  /** Nothing to write: published already, or refused. */
  | { kind: "settled"; outcome: PublishOutcome }
  | { kind: "write"; writes: PublishWrites }

const REQUIRED_FIELDS: ReadonlySet<string> = new Set(["title"])

/**
 * Decides what publishing `changes` over `snapshot` (`null`: the roadmap is no longer
 * listed) writes: each pending value that differs from the current one, unless a
 * co-lead changed it too, plus an ID for every item without one. Values are trimmed.
 * Throws `AppError('unknown')` for a blank title, which callers never send.
 */
export function planRoadmapPublish(
  changes: RoadmapChanges,
  snapshot: RoadmapSnapshot | null,
  createId: () => string = createItemId,
): PublishPlan {
  if (snapshot === null) {
    return { kind: "settled", outcome: { status: "roadmap-not-found" } }
  }
  const conflicts: FieldConflict[] = []
  const missingItems: ItemChanges[] = []
  const roadmapWrites: PublishWrites["roadmap"] = []
  const itemWrites: Omit<PublishWrites["items"][number], "id">[] = []

  for (const field of EDITABLE_ROADMAP_FIELDS) {
    const pending = pendingValue(field, changes.roadmap[field])
    if (pending === null) continue
    const current = roadmapValue(snapshot.roadmap, field)
    if (current === pending.value) continue
    if (current !== pending.base) {
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
    const pending = EDITABLE_ITEM_FIELDS.flatMap((field) => {
      const change = pendingValue(field, itemChanges.fields[field])
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
      const currentValue = itemText(current, field)
      if (currentValue === value) continue
      if (currentValue !== base) {
        conflicts.push({
          subject: "item",
          item: itemChanges,
          field,
          base,
          pending: value,
          current: currentValue,
        })
      } else {
        itemWrites.push({ index, field, value })
      }
    }
  }

  if (conflicts.length > 0 || missingItems.length > 0) {
    return {
      kind: "settled",
      outcome: { status: "refused", conflicts, missingItems },
    }
  }
  if (roadmapWrites.length === 0 && itemWrites.length === 0) {
    return { kind: "settled", outcome: { status: "published" } }
  }
  const ids = newIds(snapshot, createId)
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
    },
  }
}

/**
 * How many of `writes` the roadmap now holds (`null`: no longer listed, so unknown),
 * to settle a write whose answer was lost (ADR-012 Option 16). Items are found by the
 * ID each holds once written, never by place, as rows may have moved since.
 */
export function heldWrites(
  writes: PublishWrites,
  snapshot: RoadmapSnapshot | null,
): "all" | "none" | "some" {
  if (snapshot === null) return "some"
  const withId = (id: string) => snapshot.items.find((item) => item.id === id)
  const held = [
    ...writes.roadmap.map(
      ({ field, value }) => roadmapValue(snapshot.roadmap, field) === value,
    ),
    ...writes.items.map(({ id, field, value }) => {
      const item = withId(id)
      return item !== undefined && itemText(item, field) === value
    }),
    ...writes.ids.map(({ id }) => snapshot.takenIds.has(id)),
  ]
  // A row the read skips (its title cleared since) may still hold an item's write.
  const unread = writes.items.some(
    ({ id }) => withId(id) === undefined && snapshot.takenIds.has(id),
  )
  if (!unread && held.every(Boolean)) return "all"
  return unread || held.some(Boolean) ? "some" : "none"
}

/** A change's trimmed value with its base, or `null` when it changes nothing. */
function pendingValue(
  field: string,
  change: FieldChange | undefined,
): { base: string; value: string } | null {
  if (change === undefined) return null
  const value = change.value.trim()
  if (value === "" && REQUIRED_FIELDS.has(field)) {
    throw new AppError("unknown", {
      message: `A blank ${field} can't be published`,
    })
  }
  return value === change.base ? null : { base: change.base, value }
}

/** A new ID for every item without one, none repeating an ID the roadmap holds. */
function newIds(
  snapshot: RoadmapSnapshot,
  createId: () => string,
): PublishWrites["ids"] {
  const taken = new Set(snapshot.takenIds)
  return snapshot.items.flatMap(({ id }, index) => {
    if (id !== null) return []
    let next = createId()
    while (taken.has(next)) next = createId()
    taken.add(next)
    return [{ index, id: next }]
  })
}
