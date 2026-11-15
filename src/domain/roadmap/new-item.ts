/**
 * Adding an item to a roadmap (STY-045): a new item is pending with the roadmap's other
 * changes from the moment it is added, and published with them (`publish-plan.ts`).
 * Pure functions over `RoadmapChanges`. They are the domain's, as the checks of a new
 * roadmap and a new family are, since what a new item must hold and how its ID is made
 * are rules of a roadmap, whatever screen adds one; how an edit is kept and finds its
 * item again is `features/roadmaps/editing/pending-changes.ts`, whose `reconcileItems`
 * calls `dropPublishedNewItems`. The screen that adds an item (STY-046) calls the rest.
 */

import { AppError } from "@/lib/errors"

import { createItemId, createUnusedId } from "./item-id"
import type {
  EditableItemField,
  ItemValues,
  NewItem,
  RoadmapChanges,
} from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"
import { isRoadmapPlacement } from "./roadmap-placement"

/** Why a new item can't be added: it needs a title and a placement (ADR-014). */
export interface NewItemProblems {
  title?: "blank"
  /** None chosen, or none of the six. */
  placement?: "none"
}

/** `input` as a new item holds it, every value trimmed, and what is wrong with it. */
export function checkNewItem(input: ItemValues): {
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
  input: ItemValues,
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
 * whatever a co-lead has made of it since. `changes` itself when none is dropped. A
 * read gives no item for a row with no title, so a new item whose row a co-lead has
 * cleared of its title stays pending here; the next publish, which sees every row's ID,
 * takes it as published (`planRoadmapPublish`).
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
