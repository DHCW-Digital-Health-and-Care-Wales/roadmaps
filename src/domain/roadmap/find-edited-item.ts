/**
 * Where an edited item is in a fresh read of its roadmap (ADR-012 §"Finding what to
 * write"), so a publish writes to that item or to none.
 */

import {
  EDITABLE_ITEM_FIELDS,
  type EditableItemField,
  isItemTextField,
  type ItemChanges,
  type ItemTextField,
  itemValue,
  itemWelsh,
} from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"

/**
 * The edited item's index in `items`, or -1: by its ID, the first item holding it,
 * which must still hold what was loaded when `repeatedIds` has the ID; with no ID, at
 * its position, which must hold exactly what was loaded. Either may instead hold that
 * content with the pending values, written by a publish whose answer was lost.
 */
export function findEditedItem(
  items: readonly RoadmapItem[],
  repeatedIds: ReadonlySet<string>,
  { item, position }: ItemChanges,
  pending: readonly { field: EditableItemField; value: string }[],
): number {
  const index =
    item.id === null ? position : items.findIndex(({ id }) => id === item.id)
  const current = items[index]
  if (current === undefined) return -1
  if (item.id !== null && !repeatedIds.has(item.id)) return index
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

/**
 * Whether `current` holds `loaded`'s content, with `edited` fields' values replaced: a
 * text field's Welsh must still be `loaded`'s where both reads show it, and a placed
 * item has no horizon as written.
 */
function sameContent(
  current: RoadmapItem,
  loaded: RoadmapItem,
  edited: ReadonlyMap<EditableItemField, string>,
): boolean {
  return CONTENT_KEYS.every((key) => {
    if (key === "writtenHorizon" && edited.has("placement")) {
      return current.writtenHorizon === null
    }
    if (!isEditable(key)) return sameValue(current[key], loaded[key])
    const value = edited.get(key)
    if (value === undefined) return sameValue(current[key], loaded[key])
    return (
      itemValue(current, key) === value &&
      (!isItemTextField(key) ||
        !welshShown(loaded, key, value) ||
        itemWelsh(current, key) === itemWelsh(loaded, key))
    )
  })
}

/**
 * Whether a field's Welsh is known both as loaded and as edited to `value`: a read
 * leaves out the Welsh of a field with no English.
 */
function welshShown(
  loaded: RoadmapItem,
  field: ItemTextField,
  value: string,
): boolean {
  return value !== "" && itemValue(loaded, field) !== ""
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
