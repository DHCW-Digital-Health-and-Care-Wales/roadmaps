/**
 * What publishing a roadmap's changes writes, decided against a fresh read of the
 * roadmap (ADR-012 §"Finding what to write"). Pure, so every `RoadmapRepository` applies
 * the same rules; each locates the cells itself.
 */

import { AppError } from "@/lib/errors"

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
  type PublishOutcome,
  type RoadmapChanges,
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

/** The values to write; item `index`es are into the snapshot's `items`. */
export interface PublishWrites {
  roadmap: { field: EditableRoadmapField; value: string }[]
  items: { index: number; field: EditableItemField; value: string }[]
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
  const writes: PublishWrites = { roadmap: [], items: [], ids: [] }

  for (const field of EDITABLE_ROADMAP_FIELDS) {
    const pending = pendingValue(field, changes.roadmap[field])
    if (pending === null) continue
    const current = roadmapText(snapshot.roadmap, field)
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
      writes.roadmap.push({ field, value: pending.value })
    }
  }

  for (const itemChanges of changes.items) {
    const pending = EDITABLE_ITEM_FIELDS.flatMap((field) => {
      const change = pendingValue(field, itemChanges.fields[field])
      return change === null ? [] : [{ field, ...change }]
    })
    if (pending.length === 0) continue
    const index = findItem(snapshot, itemChanges, pending)
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
        writes.items.push({ index, field, value })
      }
    }
  }

  if (conflicts.length > 0 || missingItems.length > 0) {
    return {
      kind: "settled",
      outcome: { status: "refused", conflicts, missingItems },
    }
  }
  if (writes.roadmap.length === 0 && writes.items.length === 0) {
    return { kind: "settled", outcome: { status: "published" } }
  }
  writes.ids = newIds(snapshot, createId)
  return { kind: "write", writes }
}

/**
 * How many of `writes` the roadmap now holds (`null`: no longer listed, so unknown),
 * to settle a write whose answer was lost (ADR-012 Option 16).
 */
export function heldWrites(
  writes: PublishWrites,
  snapshot: RoadmapSnapshot | null,
): "all" | "none" | "some" {
  if (snapshot === null) return "some"
  const held = [
    ...writes.roadmap.map(
      ({ field, value }) => roadmapText(snapshot.roadmap, field) === value,
    ),
    ...writes.items.map(({ index, field, value }) => {
      const item = snapshot.items[index]
      return item !== undefined && itemText(item, field) === value
    }),
    ...writes.ids.map(({ index, id }) => snapshot.items[index]?.id === id),
  ]
  if (held.every(Boolean)) return "all"
  return held.some(Boolean) ? "some" : "none"
}

/** The roadmap's English for `field`, `""` for none. */
export function roadmapText(
  roadmap: Roadmap,
  field: EditableRoadmapField,
): string {
  switch (field) {
    case "title":
      return roadmap.title.en
    case "productLead":
      return roadmap.productLead ?? ""
    default:
      return roadmap[field]?.en ?? ""
  }
}

/** The item's English for `field`, `""` for none. */
export function itemText(item: RoadmapItem, field: EditableItemField): string {
  return field === "title" ? item.title.en : (item[field]?.en ?? "")
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

/**
 * Where the edited item is now, or -1 (ADR-012): by its ID, the first row holding it,
 * which must still hold what was loaded when the ID is repeated; with no ID, at its
 * position, which must hold exactly what was loaded. Either may instead hold that
 * content with the pending values, written by a publish whose answer was lost.
 */
function findItem(
  snapshot: RoadmapSnapshot,
  { item, position }: ItemChanges,
  pending: readonly { field: EditableItemField; value: string }[],
): number {
  const index =
    item.id === null
      ? position
      : snapshot.items.findIndex(({ id }) => id === item.id)
  const current = snapshot.items[index]
  if (current === undefined) return -1
  if (item.id !== null && !snapshot.repeatedIds.has(item.id)) return index
  const edited = new Map(pending.map(({ field, value }) => [field, value]))
  return sameContent(current, item, new Map()) ||
    sameContent(current, item, edited)
    ? index
    : -1
}

/** Every part of an item but its ID, so its content can be compared. */
const CONTENT: Record<Exclude<keyof RoadmapItem, "id">, true> = {
  title: true,
  placement: true,
  writtenHorizon: true,
  description: true,
  expectedOutcome: true,
  phase: true,
  tags: true,
  organisations: true,
  details: true,
}
const CONTENT_KEYS = Object.keys(CONTENT) as (keyof typeof CONTENT)[]

/** Whether `current` holds `loaded`'s content, with `edited` fields' English replaced. */
function sameContent(
  current: RoadmapItem,
  loaded: RoadmapItem,
  edited: ReadonlyMap<EditableItemField, string>,
): boolean {
  return CONTENT_KEYS.every((key) =>
    isEditable(key) && edited.has(key)
      ? itemText(current, key) === edited.get(key)
      : sameValue(current[key], loaded[key]),
  )
}

function isEditable(key: string): key is EditableItemField {
  return (EDITABLE_ITEM_FIELDS as readonly string[]).includes(key)
}

/** Deep equality of plain data: strings, numbers, booleans, `null`, arrays, objects. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key) => sameValue(Reflect.get(a, key), Reflect.get(b, key)))
  )
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
