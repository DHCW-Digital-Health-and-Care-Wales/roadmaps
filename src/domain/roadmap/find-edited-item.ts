/**
 * Where an edited item is in a fresh read of its roadmap (ADR-012 §"Finding what to
 * write"), so a publish writes to that item or to none.
 */

import { englishDetails, shownLevels } from "./item-details"
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
  return holdsLoaded(current, item, pending) ? index : -1
}

/**
 * Whether `current` holds what `loaded` did when it was read, or that with the
 * `pending` values written, as a publish whose answer was lost leaves it.
 */
export function holdsLoaded(
  current: RoadmapItem,
  loaded: RoadmapItem,
  pending: readonly { field: EditableItemField; value: string }[],
): boolean {
  const edited = new Map(pending.map(({ field, value }) => [field, value]))
  return (
    sameContent(current, loaded, new Map()) ||
    sameContent(current, loaded, edited)
  )
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
  hasWelshTags: true,
  organisationIds: true,
  unknownOrganisationCodes: true,
  details: true,
  hasWelshDetails: true,
}
const CONTENT_KEYS = Object.keys(CONTENT) as (keyof typeof CONTENT)[]

/**
 * Whether `current` holds `loaded`'s content, with `edited` fields' values replaced: a
 * text field's Welsh must still be `loaded`'s where both reads show it, a placed item has
 * no horizon as written, an item whose organisations were written has no unknown codes,
 * as only known ones are written (ADR-014), and details, edited or not, are compared as
 * the list the card shows (STY-039).
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
    if (key === "unknownOrganisationCodes" && edited.has("organisationIds")) {
      return current.unknownOrganisationCodes.length === 0
    }
    if (!isEditable(key)) return sameValue(current[key], loaded[key])
    const value = edited.get(key)
    if (value === undefined) {
      // A set of organisations is the same in any order (ADR-014).
      if (key === "organisationIds") {
        return itemValue(current, key) === itemValue(loaded, key)
      }
      // Details are the same as the list the card shows, however their hyphens are
      // written (STY-039 D4): every level of it, not the three the field compares.
      if (key === "details") {
        return sameValue(shownDetails(current), shownDetails(loaded))
      }
      return sameValue(current[key], loaded[key])
    }
    // Pending details too are held only by the list the card shows as them (STY-039).
    if (key === "details") {
      return sameValue(shownDetails(current), englishDetails(value))
    }
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

/** An item's details as the card shows them: each one's text, at the level it shows at. */
function shownDetails({ details }: RoadmapItem): RoadmapItem["details"] {
  const levels = shownLevels(details.map(({ level }) => level))
  return details.map(({ text }, index) => ({ text, level: levels[index] ?? 0 }))
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
