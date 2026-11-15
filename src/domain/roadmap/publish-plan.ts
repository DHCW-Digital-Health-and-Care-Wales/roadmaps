/**
 * What publishing a roadmap's changes writes, decided against a fresh read of the
 * roadmap (ADR-012 §"Finding what to write"). Pure, so every `RoadmapRepository` applies
 * the same rules; each locates the cells itself.
 */

import { AppError } from "@/lib/errors"

import { isCalendarDate } from "./calendar-date"
import { findEditedItem } from "./find-edited-item"
import { detailsOf, detailsValue } from "./item-details"
import { createItemId, createUnusedId } from "./item-id"
import type { Roadmap } from "./roadmap"
import {
  EDITABLE_ITEM_FIELDS,
  EDITABLE_ROADMAP_FIELDS,
  type EditableItemField,
  type EditableRoadmapField,
  type FieldChange,
  type FieldConflict,
  isChoiceField,
  type ItemChanges,
  itemValue,
  organisationIdsOf,
  organisationIdsValue,
  type PublishOutcome,
  type RoadmapChanges,
  type RoadmapChoiceField,
  roadmapValue,
  tagsOf,
  tagsValue,
} from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"
import { isRoadmapPlacement } from "./roadmap-placement"

/** A roadmap as just read, to publish over. */
export interface RoadmapSnapshot {
  roadmap: Roadmap
  /** In order; a later repeat of an ID has `id: null`, as the parser reads it. */
  items: readonly RoadmapItem[]
  /** IDs held by more than one row. */
  repeatedIds: ReadonlySet<string>
  /** Every ID the roadmap's rows hold, kept or not: a new ID is none of these. */
  takenIds: ReadonlySet<string>
  /**
   * The family or category whose list the data source doesn't have: the row's value
   * for it can't be told from none, so no choice of it is published (ADR-013).
   */
  missingLists: ReadonlySet<RoadmapChoiceField>
  /** The IDs the organisation list holds: only these can be chosen (ADR-014). */
  organisationIds: ReadonlySet<string>
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
  /**
   * The items new to the roadmap, in the order they were added, each with the ID it was
   * added with and every field it has: they go after the roadmap's last item (STY-045).
   */
  newItems: {
    id: string
    fields: { field: EditableItemField; value: string }[]
  }[]
}

export type PublishPlan =
  /** Nothing to write: published already, or refused. */
  | { kind: "settled"; outcome: PublishOutcome }
  | { kind: "write"; writes: PublishWrites }

const REQUIRED_FIELDS: ReadonlySet<string> = new Set(["title"])

/**
 * Decides what publishing `changes` over `snapshot` (`null`: the roadmap is no longer
 * listed) writes: each pending value that differs from the current one, unless a
 * co-lead changed it too, each new item the roadmap doesn't hold, plus an ID for every
 * item without one. Values are trimmed. An item's organisations are compared as a set,
 * its tags as the ordered list and its details as the list they show as; tags are never
 * written to an item that now has Welsh ones, nor details (STY-037 S22, STY-039 S19),
 * and a change made over whatever the field holds (`FieldChange.overwrite`) is never a
 * conflict. A new item is never a conflict or missing: it is written unless a row of
 * the roadmap holds its ID, which a write of it whose answer was lost left there
 * (STY-045). Throws `AppError('unknown')` for a blank title, a placement that is none of
 * the six, an organisation the list doesn't hold, a `Last updated` that is no
 * `YYYY-MM-DD` date or two new items with one ID, which callers never send, and
 * `AppError('invalid-data')` for a family or category chosen while its list is missing.
 */
export function planRoadmapPublish(
  changes: RoadmapChanges,
  snapshot: RoadmapSnapshot | null,
  createId: () => string = createItemId,
): PublishPlan {
  if (snapshot === null) {
    return { kind: "settled", outcome: { status: "roadmap-not-found" } }
  }
  const newItems = newItemWrites(changes.newItems, snapshot)
  const conflicts: FieldConflict[] = []
  const missingItems: ItemChanges[] = []
  const roadmapWrites: PublishWrites["roadmap"] = []
  const itemWrites: Omit<PublishWrites["items"][number], "id">[] = []

  for (const field of EDITABLE_ROADMAP_FIELDS) {
    const pending = pendingValue(field, changes.roadmap[field], snapshot)
    if (pending === null) continue
    if (isChoiceField(field) && snapshot.missingLists.has(field)) {
      throw new AppError("invalid-data", {
        message: `The ${field} can't be published without its list`,
      })
    }
    const current = roadmapValue(snapshot.roadmap, field)
    if (current === pending.value) continue
    if (current !== pending.base && !pending.overwrite) {
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
      const change = pendingValue(field, itemChanges.fields[field], snapshot)
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
      const currentValue = itemValue(current, field)
      if (currentValue === value) continue
      // Writing the English alone could pair the wrong Welsh with a tag or a detail
      // (STY-037 D16, STY-039 D8).
      const gainedWelsh =
        (field === "tags" && current.hasWelshTags) ||
        (field === "details" && current.hasWelshDetails)
      if (currentValue !== base || gainedWelsh) {
        conflicts.push({
          subject: "item",
          item: itemChanges,
          field,
          base,
          pending: value,
          current: currentValue,
          ...(gainedWelsh && { gainedWelsh }),
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
  if (
    roadmapWrites.length === 0 &&
    itemWrites.length === 0 &&
    newItems.length === 0
  ) {
    return { kind: "settled", outcome: { status: "published" } }
  }
  const ids = newIds(snapshot, newItems, createId)
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
      newItems,
    },
  }
}

/**
 * How many of `writes` the roadmap now holds (`null`: no longer listed, so unknown),
 * to settle a write whose answer was lost (ADR-012 Option 16). Items are found by the
 * ID each holds once written, never by place, as rows may have moved since; a new item
 * is held when a row holds its ID, whatever that row now reads (STY-045).
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
      return item !== undefined && itemValue(item, field) === value
    }),
    ...writes.ids.map(({ id }) => snapshot.takenIds.has(id)),
    ...writes.newItems.map(({ id }) => snapshot.takenIds.has(id)),
  ]
  // A row the read skips (its title cleared since) may still hold an item's write.
  const unread = writes.items.some(
    ({ id }) => withId(id) === undefined && snapshot.takenIds.has(id),
  )
  if (!unread && held.every(Boolean)) return "all"
  return unread || held.some(Boolean) ? "some" : "none"
}

/**
 * What is written for each new item the roadmap doesn't hold yet, in the order added:
 * every field it has, as `publishedValue` gives it, so as an edit of that field is
 * written. One whose ID a row holds, read or not, was written already.
 */
function newItemWrites(
  newItems: RoadmapChanges["newItems"],
  snapshot: RoadmapSnapshot,
): PublishWrites["newItems"] {
  if (new Set(newItems.map(({ id }) => id)).size !== newItems.length) {
    throw new AppError("unknown", {
      message: "Two new items can't be published with one ID",
    })
  }
  return newItems.flatMap(({ id, values }) => {
    const fields = EDITABLE_ITEM_FIELDS.flatMap((field) => {
      const value = publishedValue(field, values[field], snapshot)
      return value === "" ? [] : [{ field, value }]
    })
    return snapshot.takenIds.has(id) ? [] : [{ id, fields }]
  })
}

/**
 * A change's value as it is published, with its base, or `null` when it changes
 * nothing. One set over whatever the field holds is never nothing.
 */
function pendingValue(
  field: string,
  change: FieldChange | undefined,
  snapshot: RoadmapSnapshot,
): { base: string; value: string; overwrite: boolean } | null {
  if (change === undefined) return null
  const value = publishedValue(field, change.value, snapshot)
  const overwrite = change.overwrite === true
  return value === change.base && !overwrite
    ? null
    : { base: change.base, value, overwrite }
}

/**
 * A field's value as it is published, an edit's or a new item's: trimmed, a set of
 * organisations as `organisationIdsValue` gives it, tags as `tagsValue` does and details
 * as `detailsValue` does. Throws for a value that is never sent (`planRoadmapPublish`).
 */
function publishedValue(
  field: string,
  raw: string,
  snapshot: RoadmapSnapshot,
): string {
  const value =
    field === "organisationIds"
      ? listedOrganisationIdsValue(raw, snapshot.organisationIds)
      : field === "tags"
        ? tagsValue(tagsOf(raw))
        : field === "details"
          ? detailsValue(detailsOf(raw))
          : raw.trim()
  if (value === "" && REQUIRED_FIELDS.has(field)) {
    throw new AppError("unknown", {
      message: `A blank ${field} can't be published`,
    })
  }
  if (field === "placement" && !isRoadmapPlacement(value)) {
    throw new AppError("unknown", {
      message: "Only one of the six placements can be published",
    })
  }
  if (field === "lastUpdated" && value !== "" && !isCalendarDate(value)) {
    throw new AppError("unknown", {
      message: "Only a YYYY-MM-DD date can be published as Last updated",
    })
  }
  return value
}

/** `value`'s organisations as one value, each of which the list must hold. */
function listedOrganisationIdsValue(
  value: string,
  listed: ReadonlySet<string>,
): string {
  const ids = organisationIdsOf(value)
    .map((id) => id.trim())
    .filter((id) => id !== "")
  if (!ids.every((id) => listed.has(id))) {
    throw new AppError("unknown", {
      message: "Only an organisation the list holds can be published",
    })
  }
  return organisationIdsValue(ids)
}

/**
 * A new ID for every item without one, none repeating an ID the roadmap holds or one a
 * new item is written with.
 */
function newIds(
  snapshot: RoadmapSnapshot,
  newItems: PublishWrites["newItems"],
  createId: () => string,
): PublishWrites["ids"] {
  const taken = new Set([...snapshot.takenIds, ...newItems.map(({ id }) => id)])
  return snapshot.items.flatMap(({ id }, index) => {
    if (id !== null) return []
    const next = createUnusedId(taken, createId)
    taken.add(next)
    return [{ index, id: next }]
  })
}
