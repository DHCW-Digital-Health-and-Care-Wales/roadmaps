import type { Roadmap } from "./roadmap"
import type { RoadmapItem } from "./roadmap-item"

/** The roadmap's own text a Product Lead may edit, in English only (ADR-012). */
export const EDITABLE_ROADMAP_FIELDS = [
  "title",
  "statusLabel",
  "productLead",
  "vision",
  "serviceDescription",
] as const satisfies readonly (keyof Roadmap)[]

export type EditableRoadmapField = (typeof EDITABLE_ROADMAP_FIELDS)[number]

/** An item's text a Product Lead may edit, in English only (ADR-012). */
export const EDITABLE_ITEM_FIELDS = [
  "title",
  "description",
  "expectedOutcome",
  "phase",
] as const satisfies readonly (keyof RoadmapItem)[]

export type EditableItemField = (typeof EDITABLE_ITEM_FIELDS)[number]

/** A field's pending English, with the English it was first edited from. */
export interface FieldChange {
  /** The value when the field was first edited; `""` for none. */
  base: string
  /** The value to publish, as typed; `""` clears an optional field. */
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

/** Every pending change to one roadmap: its own text and its items' (ADR-012). */
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
