/**
 * Adding an item to a roadmap (STY-045): a new item is pending with the roadmap's other
 * changes from the moment it is added, and published with them (`publish-plan.ts`).
 * Pure functions over `RoadmapChanges`.
 */

import { AppError } from "@/lib/errors"

import { createItemId, createUnusedId } from "./item-id"
import type {
  EditableItemField,
  NewItem,
  RoadmapChanges,
} from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"
import { isRoadmapPlacement } from "./roadmap-placement"

/**
 * What a Product Lead gives to add an item: each field as its edit's value is typed or
 * chosen, in English only, and any field left out.
 */
export type NewItemInput = Partial<Record<EditableItemField, string>>

/** Why a new item can't be added: it needs a title and a placement (ADR-014). */
export interface NewItemProblems {
  title?: "blank"
  /** None chosen, or none of the six. */
  placement?: "none"
}

/** The input as a new item holds it, every value trimmed, and what is wrong with it. */
export function checkNewItem(input: NewItemInput): {
  values: NewItem["values"]
  problems: NewItemProblems
} {
  const value = (field: EditableItemField) => input[field]?.trim() ?? ""
  const values: NewItem["values"] = {
    title: value("title"),
    description: value("description"),
    expectedOutcome: value("expectedOutcome"),
    phase: value("phase"),
    placement: value("placement"),
    tags: value("tags"),
    organisationIds: value("organisationIds"),
    details: value("details"),
  }
  return {
    values,
    problems: {
      ...(values.title === "" && { title: "blank" as const }),
      ...(!isRoadmapPlacement(values.placement) && {
        placement: "none" as const,
      }),
    },
  }
}

/**
 * `changes` with a new item added after those already pending, from input `checkNewItem`
 * passed. Its ID is made now, in the `Item ID` format: one that none of `items`, the
 * roadmap's items as read, has, nor any other new item. Throws for input `checkNewItem`
 * refuses, which a screen never sends.
 */
export function addNewItem(
  changes: RoadmapChanges,
  input: NewItemInput,
  items: readonly RoadmapItem[],
  createId: () => string = createItemId,
): RoadmapChanges {
  const { values, problems } = checkNewItem(input)
  if (Object.keys(problems).length > 0) {
    throw new AppError("unknown", {
      message: "A new item's input was not checked",
    })
  }
  const taken = new Set([
    ...items.flatMap(({ id }) => id ?? []),
    ...changes.newItems.map(({ id }) => id),
  ])
  const id = createUnusedId(taken, createId)
  return { ...changes, newItems: [...changes.newItems, { id, values }] }
}

/**
 * `changes` without each new item that `items`, a fresh read of the roadmap's items,
 * holds, found by its ID: its write landed, so the item read is shown in its place,
 * whatever a co-lead has made of it since. `changes` itself when none is dropped.
 */
export function dropPublishedNewItems(
  changes: RoadmapChanges,
  items: readonly RoadmapItem[],
): RoadmapChanges {
  const read = new Set(items.map(({ id }) => id))
  const pending = changes.newItems.filter(({ id }) => !read.has(id))
  return pending.length === changes.newItems.length
    ? changes
    : { ...changes, newItems: pending }
}
