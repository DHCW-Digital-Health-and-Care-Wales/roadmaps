import type { Roadmap } from "./roadmap"
import type { RoadmapItem } from "./roadmap-item"

/** The roadmap's own text a Product Lead may edit, in English only (ADR-012). */
export const ROADMAP_TEXT_FIELDS = [
  "title",
  "statusLabel",
  "productLead",
  "vision",
  "serviceDescription",
] as const satisfies readonly (keyof Roadmap)[]

export type RoadmapTextField = (typeof ROADMAP_TEXT_FIELDS)[number]

/**
 * The roadmap's family and category, chosen from their lists by ID, `""` for none
 * (ADR-013): the ID is the base a conflict is found by, so a rename is none.
 */
export const ROADMAP_CHOICE_FIELDS = [
  "familyId",
  "categoryId",
] as const satisfies readonly (keyof Roadmap)[]

export type RoadmapChoiceField = (typeof ROADMAP_CHOICE_FIELDS)[number]

/** Every roadmap field a Product Lead may edit, in the form's order. */
export const EDITABLE_ROADMAP_FIELDS = [
  ...ROADMAP_TEXT_FIELDS,
  ...ROADMAP_CHOICE_FIELDS,
] as const

export type EditableRoadmapField = (typeof EDITABLE_ROADMAP_FIELDS)[number]

/**
 * A family's value when its row names one the family list doesn't have (STY-027 S8):
 * never an ID, so choosing "No family" over it is an edit.
 */
export const UNLISTED_FAMILY = "(unlisted)"

export function isChoiceField(
  field: EditableRoadmapField,
): field is RoadmapChoiceField {
  return (ROADMAP_CHOICE_FIELDS as readonly string[]).includes(field)
}

/** An item's text a Product Lead may edit, in English only (ADR-012). */
export const ITEM_TEXT_FIELDS = [
  "title",
  "description",
  "expectedOutcome",
  "phase",
] as const satisfies readonly (keyof RoadmapItem)[]

export type ItemTextField = (typeof ITEM_TEXT_FIELDS)[number]

/**
 * Every item field a Product Lead may edit, in the form's order: its text, then its
 * placement, chosen by ID, `""` for none (ADR-014): the ID is the base a conflict is
 * found by, and an unplaced item's is none, whatever its horizon says.
 */
export const EDITABLE_ITEM_FIELDS = [...ITEM_TEXT_FIELDS, "placement"] as const

export type EditableItemField = (typeof EDITABLE_ITEM_FIELDS)[number]

export function isItemTextField(
  field: EditableItemField,
): field is ItemTextField {
  return (ITEM_TEXT_FIELDS as readonly string[]).includes(field)
}

/**
 * The roadmap's value for `field`, `""` for none: its English for text, an ID for a
 * family or category, or `UNLISTED_FAMILY`.
 */
export function roadmapValue(
  roadmap: Roadmap,
  field: EditableRoadmapField,
): string {
  switch (field) {
    case "title":
      return roadmap.title.en
    case "productLead":
      return roadmap.productLead ?? ""
    case "familyId":
      return (
        roadmap.familyId ?? (roadmap.familyNotListed ? UNLISTED_FAMILY : "")
      )
    case "categoryId":
      return roadmap.categoryId ?? ""
    default:
      return roadmap[field]?.en ?? ""
  }
}

/**
 * The item's value for `field`, `""` for none: its English for text, or its placement's
 * ID.
 */
export function itemValue(item: RoadmapItem, field: EditableItemField): string {
  switch (field) {
    case "title":
      return item.title.en
    case "placement":
      return item.placement ?? ""
    default:
      return item[field]?.en ?? ""
  }
}

/** The item's Welsh for `field`, `""` for none: never edited, so never written. */
export function itemWelsh(item: RoadmapItem, field: ItemTextField): string {
  return field === "title" ? item.title.cy : (item[field]?.cy ?? "")
}

/** A field's pending value, with the value it was first edited from. */
export interface FieldChange {
  /** The value when the field was first edited; `""` for none. */
  base: string
  /** The value to publish, as typed or chosen; `""` clears an optional field. */
  value: string
}

/** One item's pending changes, with what is needed to find it again (ADR-012). */
export interface ItemChanges {
  /** The item as last loaded. */
  item: RoadmapItem
  /** Its 0-based place among the roadmap's items when last loaded. */
  position: number
  fields: Partial<Record<EditableItemField, FieldChange>>
}

/** Every pending change to one roadmap: its own fields and its items' (ADR-012). */
export interface RoadmapChanges {
  roadmap: Partial<Record<EditableRoadmapField, FieldChange>>
  items: readonly ItemChanges[]
}

/**
 * A field a co-lead changed since it was edited: its current value differs from both
 * its base and its pending value (ADR-012 Option 12).
 */
export type FieldConflict = (
  | { subject: "roadmap"; field: EditableRoadmapField }
  | { subject: "item"; item: ItemChanges; field: EditableItemField }
) & {
  base: string
  /** The pending value, trimmed. */
  pending: string
  current: string
}

/**
 * What publishing a roadmap's changes came to. Every outcome but `published` wrote
 * nothing, except `unconfirmed`, which may have written everything.
 */
export type PublishOutcome =
  /** Every change is in the data source (or already was). */
  | { status: "published" }
  /**
   * The write's answer never arrived and a check could not settle whether it was
   * applied (ADR-012 Option 16): the changes may be in the data source.
   */
  | { status: "unconfirmed" }
  /** The roadmap is no longer listed; nothing was written. */
  | { status: "roadmap-not-found" }
  /**
   * A co-lead's change conflicts, or an edited item can no longer be found; nothing was
   * written. `missingItems` are the very `ItemChanges` given.
   */
  | {
      status: "refused"
      conflicts: FieldConflict[]
      missingItems: ItemChanges[]
    }
