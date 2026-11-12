/**
 * The rules of pending edits (ADR-012, EPC-005 "The pending-edit store"): what an edit
 * keeps, what a fresh read or a publish drops, and how an edit finds its item again. Pure
 * functions over `RoadmapChanges`; the store applies them.
 */

import { findEditedItem } from "@/domain/roadmap/find-edited-item"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  EDITABLE_ITEM_FIELDS,
  EDITABLE_ROADMAP_FIELDS,
  type EditableItemField,
  type EditableRoadmapField,
  type FieldChange,
  type ItemChanges,
  itemText,
  type RoadmapChanges,
  roadmapText,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

/** A form's values, as typed: kept trimmed. */
export type RoadmapValues = Partial<Record<EditableRoadmapField, string>>
export type ItemValues = Partial<Record<EditableItemField, string>>

type FieldChanges<F extends string> = Partial<Record<F, FieldChange>>

export const NO_CHANGES: RoadmapChanges = { roadmap: {}, items: [] }

/**
 * `fields` with `values` applied over `current`: a value is kept trimmed, with the text
 * it was first edited from as its base; a value equal to that base, or to the current
 * text, is no edit.
 */
function editFields<F extends string>(
  fields: FieldChanges<F>,
  values: Partial<Record<F, string>>,
  current: (field: F) => string,
): FieldChanges<F> {
  const next = new Map(Object.entries(fields) as [F, FieldChange][])
  for (const [field, raw] of Object.entries(values) as [F, string][]) {
    const value = raw.trim()
    const text = current(field)
    const base = fields[field]?.base ?? text
    if (value === base || value === text) next.delete(field)
    else next.set(field, { base, value })
  }
  return Object.fromEntries(next) as FieldChanges<F>
}

/** `fields` without each whose value `current` holds; `fields` itself if none. */
function dropHeld<F extends string>(
  fields: FieldChanges<F>,
  current: (field: F) => string | undefined,
): FieldChanges<F> {
  const held = (Object.keys(fields) as F[]).filter(
    (field) => fields[field]?.value === current(field),
  )
  if (held.length === 0) return fields
  return Object.fromEntries(
    Object.entries(fields).filter(([field]) => !held.includes(field as F)),
  ) as FieldChanges<F>
}

function isEmpty(fields: object): boolean {
  return Object.keys(fields).length === 0
}

/** Whether two entries edit the same item: by its ID, or by its place with none. */
function sameTarget(a: ItemChanges, b: ItemChanges): boolean {
  return a.item.id !== null || b.item.id !== null
    ? a.item.id === b.item.id
    : a.position === b.position
}

/** `changes` with the roadmap's own text edited to `values`. */
export function editRoadmap(
  changes: RoadmapChanges,
  roadmap: Roadmap,
  values: RoadmapValues,
): RoadmapChanges {
  return {
    ...changes,
    roadmap: editFields(changes.roadmap, values, (field) =>
      roadmapText(roadmap, field),
    ),
  }
}

/**
 * `changes` with an item edited to `values`: `previous` is the item's entry (from
 * {@link matchItemChanges}), `item` and `position` where the item is now.
 */
export function editItem(
  changes: RoadmapChanges,
  previous: ItemChanges | undefined,
  item: RoadmapItem,
  position: number,
  values: ItemValues,
): RoadmapChanges {
  const fields = editFields(previous?.fields ?? {}, values, (field) =>
    itemText(item, field),
  )
  const others = changes.items.filter((entry) => entry !== previous)
  return {
    ...changes,
    items: isEmpty(fields) ? others : [...others, { item, position, fields }],
  }
}

/** `changes` without the roadmap's own text's. */
export function undoRoadmap(changes: RoadmapChanges): RoadmapChanges {
  return { ...changes, roadmap: {} }
}

/** `changes` without `entry`. */
export function undoItem(
  changes: RoadmapChanges,
  entry: ItemChanges,
): RoadmapChanges {
  return { ...changes, items: changes.items.filter((each) => each !== entry) }
}

/** An entry's pending English, as `findEditedItem` takes it. */
function pendingValues(
  entry: ItemChanges,
): { field: EditableItemField; value: string }[] {
  return EDITABLE_ITEM_FIELDS.flatMap((field) => {
    const change = entry.fields[field]
    return change ? [{ field, value: change.value }] : []
  })
}

const NO_REPEATED_IDS: ReadonlySet<string> = new Set()

/**
 * Which entry edits which of `items`, by index: an item with an ID by its ID, one with
 * none at its place holding what was loaded (or that with the pending English). An entry
 * matching nothing is left out: its item was removed or changed by a co-lead (STY-026).
 */
export function matchItemChanges(
  items: readonly RoadmapItem[],
  changes: RoadmapChanges | undefined,
): ReadonlyMap<number, ItemChanges> {
  const matched = new Map<number, ItemChanges>()
  for (const entry of changes?.items ?? []) {
    const index = findEditedItem(
      items,
      NO_REPEATED_IDS,
      entry,
      pendingValues(entry),
    )
    if (index >= 0 && !matched.has(index)) matched.set(index, entry)
  }
  return matched
}

/**
 * `changes` after a fresh read of the roadmap's own text: each field it already holds is
 * dropped; bases stay as they were. `changes` itself when nothing is dropped.
 */
export function reconcileRoadmap(
  changes: RoadmapChanges,
  roadmap: Roadmap,
): RoadmapChanges {
  const roadmapFields = dropHeld(changes.roadmap, (field) =>
    roadmapText(roadmap, field),
  )
  return roadmapFields === changes.roadmap
    ? changes
    : { ...changes, roadmap: roadmapFields }
}

/**
 * `changes` after a fresh read of the roadmap's items: each entry found follows its item
 * to the read, without the fields the item already holds; an entry not found is kept as
 * it was. Bases stay as they were.
 */
export function reconcileItems(
  changes: RoadmapChanges,
  items: readonly RoadmapItem[],
): RoadmapChanges {
  if (changes.items.length === 0) return changes
  const indexOf = new Map(
    [...matchItemChanges(items, changes)].map(([index, entry]) => [
      entry,
      index,
    ]),
  )
  return {
    ...changes,
    items: changes.items.flatMap((entry): ItemChanges[] => {
      const position = indexOf.get(entry)
      const item = position === undefined ? undefined : items[position]
      if (position === undefined || item === undefined) return [entry]
      const fields = dropHeld(entry.fields, (field) => itemText(item, field))
      return isEmpty(fields) ? [] : [{ item, position, fields }]
    }),
  }
}

/**
 * `changes` once `sent` is published: each edit still as it was sent is gone, and any
 * made meanwhile is kept.
 */
export function settlePublished(
  changes: RoadmapChanges,
  sent: RoadmapChanges,
): RoadmapChanges {
  return {
    roadmap: dropHeld(changes.roadmap, (field) => sent.roadmap[field]?.value),
    items: changes.items.flatMap((entry) => {
      const sentEntry = sent.items.find((each) => sameTarget(each, entry))
      if (!sentEntry) return [entry]
      const fields = dropHeld(
        entry.fields,
        (field) => sentEntry.fields[field]?.value,
      )
      return isEmpty(fields) ? [] : [{ ...entry, fields }]
    }),
  }
}

/** How many fields are pending: what the page counts as unpublished changes. */
export function countChanges(changes: RoadmapChanges | undefined): number {
  if (!changes) return 0
  return (
    Object.keys(changes.roadmap).length +
    changes.items.reduce(
      (count, entry) => count + Object.keys(entry.fields).length,
      0,
    )
  )
}

/** `text` showing `change`'s value as its English: `null` for a cleared field. */
function withEnglish(
  text: LocalisedText | null,
  change: FieldChange | undefined,
): LocalisedText | null {
  if (!change) return text
  if (change.value === "") return null
  return { en: change.value, cy: text?.cy ?? "" }
}

/** The roadmap as it will read once its pending English is published. */
export function applyRoadmapChanges(
  roadmap: Roadmap,
  changes: RoadmapChanges | undefined,
): Roadmap {
  const fields = changes?.roadmap
  if (!fields || isEmpty(fields)) return roadmap
  return {
    ...roadmap,
    title: withEnglish(roadmap.title, fields.title) ?? roadmap.title,
    statusLabel: withEnglish(roadmap.statusLabel, fields.statusLabel),
    productLead: fields.productLead
      ? fields.productLead.value || null
      : roadmap.productLead,
    vision: withEnglish(roadmap.vision, fields.vision),
    serviceDescription: withEnglish(
      roadmap.serviceDescription,
      fields.serviceDescription,
    ),
  }
}

/** The item as it will read once its pending English is published. */
export function applyItemChanges(
  item: RoadmapItem,
  entry: ItemChanges | undefined,
): RoadmapItem {
  if (!entry) return item
  const { fields } = entry
  return {
    ...item,
    title: withEnglish(item.title, fields.title) ?? item.title,
    description: withEnglish(item.description, fields.description),
    expectedOutcome: withEnglish(item.expectedOutcome, fields.expectedOutcome),
    phase: withEnglish(item.phase, fields.phase),
  }
}

/** The roadmap's own fields that are pending, in the form's order. */
export function changedRoadmapFields(
  changes: RoadmapChanges | undefined,
): EditableRoadmapField[] {
  return EDITABLE_ROADMAP_FIELDS.filter((field) => changes?.roadmap[field])
}

/** An item's fields that are pending, in the form's order. */
export function changedItemFields(entry: ItemChanges): EditableItemField[] {
  return EDITABLE_ITEM_FIELDS.filter((field) => entry.fields[field])
}
