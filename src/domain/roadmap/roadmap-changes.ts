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

/**
 * Every roadmap field a Product Lead may edit, in the form's order: its text, its family
 * and category, then the date it was last updated, `YYYY-MM-DD` or `""` for none
 * (STY-036).
 */
export const EDITABLE_ROADMAP_FIELDS = [
  ...ROADMAP_TEXT_FIELDS,
  ...ROADMAP_CHOICE_FIELDS,
  "lastUpdated",
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
 * found by, and an unplaced item's is none, whatever its horizon says. Then its tags,
 * the English ones in order as one value (`tagsValue`, STY-037), so a co-lead's
 * reordering is a conflict. Then its organisations, a set of IDs as one value
 * (`organisationIdsValue`), so a co-lead's reordering is no change and their other set
 * is a conflict. A field that is not text needs its own case in `findEditedItem`, which
 * compares every other part of an item, and in `applyItemChanges` and `withFieldOf`
 * (`pending-changes.ts`).
 */
export const EDITABLE_ITEM_FIELDS = [
  ...ITEM_TEXT_FIELDS,
  "placement",
  "tags",
  "organisationIds",
] as const

export type EditableItemField = (typeof EDITABLE_ITEM_FIELDS)[number]

export function isItemTextField(
  field: EditableItemField,
): field is ItemTextField {
  return (ITEM_TEXT_FIELDS as readonly string[]).includes(field)
}

/**
 * The roadmap's value for `field`, `""` for none: its English for text, an ID for a
 * family or category, or `UNLISTED_FAMILY`, or its date, `YYYY-MM-DD`.
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
    case "lastUpdated":
      return roadmap.lastUpdated ?? ""
    default:
      return roadmap[field]?.en ?? ""
  }
}

/**
 * The item's value for `field`, `""` for none: its English for text, its placement's
 * ID, its English tags as one value, or its organisations' IDs as one value.
 */
export function itemValue(item: RoadmapItem, field: EditableItemField): string {
  switch (field) {
    case "title":
      return item.title.en
    case "placement":
      return item.placement ?? ""
    case "tags":
      return tagsValue(item.tags.map(({ en }) => en))
    case "organisationIds":
      return organisationIdsValue(item.organisationIds)
    default:
      return item[field]?.en ?? ""
  }
}

/**
 * A set of organisation IDs as one field value (ADR-014): no repeats, sorted and comma
 * separated, so the same set is the same value however it was read or ticked; `""` for
 * none.
 */
export function organisationIdsValue(ids: Iterable<string>): string {
  return [...new Set(ids)].sort(byCodeUnit).join(",")
}

/** The IDs of an `organisationIdsValue`, as it orders them. */
export function organisationIdsOf(value: string): string[] {
  return value === "" ? [] : value.split(",")
}

function byCodeUnit(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** A comma or a line break ends a tag (STY-037 D5), so no tag holds either. */
const TAG_SEPARATOR = /[,\n]/

/**
 * An item's English tags as one field value (STY-037 D4, D5): in order, separated by a
 * comma and a space, each trimmed, none blank or repeated exactly, as a read gives
 * them; `""` for none. The order is part of the value, so a co-lead's reordering is a
 * change.
 */
export function tagsValue(tags: Iterable<string>): string {
  return tagsOf([...tags].join(",")).join(", ")
}

/** The tags of a `tagsValue`, in its order. */
export function tagsOf(value: string): string[] {
  return [
    ...new Set(
      value
        .split(TAG_SEPARATOR)
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ""),
    ),
  ]
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
  /**
   * Published over whatever the field then holds, `base` unused: never a conflict. Only
   * `markedUpdated` sets it.
   */
  overwrite?: true
}

/**
 * `changes` with the roadmap's `Last updated` set to `today`, `YYYY-MM-DD`, over
 * whatever it holds when published, never a conflict: the "Mark as updated today" tick
 * box (STY-036 S6, S9). Unticked (`today` undefined), or with a date already pending,
 * which is published instead (S7), `changes` is given back as it is.
 */
export function markedUpdated(
  changes: RoadmapChanges,
  today: string | undefined,
): RoadmapChanges {
  if (today === undefined || changes.roadmap.lastUpdated) return changes
  return {
    ...changes,
    roadmap: {
      ...changes.roadmap,
      lastUpdated: { base: "", value: today, overwrite: true },
    },
  }
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
 * its base and its pending value (ADR-012 Option 12), or its `welshTags` say why it
 * can't be written.
 */
export type FieldConflict = (
  | { subject: "roadmap"; field: EditableRoadmapField }
  | { subject: "item"; item: ItemChanges; field: EditableItemField }
) & {
  base: string
  /** The pending value, trimmed. */
  pending: string
  current: string
  /**
   * The item's tags have gained Welsh versions since it was read, so its pending tags
   * can't be written whatever `current` holds (STY-037 S22): only giving the change up
   * settles it.
   */
  welshTags?: true
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
