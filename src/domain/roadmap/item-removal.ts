/**
 * Removing an item the roadmap holds (STY-070): a removal is pending with the roadmap's
 * other changes until it is published, which deletes the item's row
 * (`publish-plan.ts`). Pure functions over `RoadmapChanges`, the domain's as a new
 * item's are (`new-item.ts`), since when a removal is found, refused or already done
 * are rules of a roadmap, whatever screen removes one. The item's edits stay beneath
 * its removal, in `RoadmapChanges.items`, and its place in a pending order stays in
 * that order (STY-049 D5, D8), so undoing the removal brings both back.
 */

import { findEditedItem, itemHoldsLoaded } from "./find-edited-item"
import {
  EDITABLE_ITEM_FIELDS,
  type ItemRemoval,
  type ItemTarget,
  itemValue,
  type RemovalConflict,
  type RoadmapChanges,
  sameTarget,
} from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"

/**
 * `changes` with `item`, read at `position` among the roadmap's items, removed;
 * `changes` itself when it is already. Its edits and its place in any order are kept.
 */
export function removeItem(
  changes: RoadmapChanges,
  item: RoadmapItem,
  position: number,
): RoadmapChanges {
  const removal = { item, position }
  if (changes.removals.some((each) => sameTarget(each, removal))) return changes
  return { ...changes, removals: [...changes.removals, removal] }
}

/**
 * `changes` without `removal`, found by its item: the item's edits and its place in an
 * order count again, as they were (STY-049 D5). "Keep the item" in a removal's
 * conflict is this too (STY-070 S4).
 */
export function undoRemoval(
  changes: RoadmapChanges,
  removal: ItemTarget,
): RoadmapChanges {
  const removals = changes.removals.filter((each) => !sameTarget(each, removal))
  return removals.length === changes.removals.length
    ? changes
    : { ...changes, removals }
}

/**
 * "Remove anyway" in a removal's conflict (STY-070 S4): the removal stays, with the
 * item as the publish read it as its base, so the next publish deletes it unless a
 * co-lead changes it again.
 */
export function removeAnyway(
  changes: RoadmapChanges,
  conflict: RemovalConflict,
): RoadmapChanges {
  return {
    ...changes,
    removals: changes.removals.map((each) =>
      sameTarget(each, conflict.removal)
        ? { ...each, item: conflict.current }
        : each,
    ),
  }
}

/** The removal of the item `target` is, if it is removed. */
export function removalOf(
  changes: RoadmapChanges | undefined,
  target: ItemTarget,
): ItemRemoval | undefined {
  return changes?.removals.find((each) => sameTarget(each, target))
}

/**
 * `changes` after a fresh read of the roadmap's items (STY-070 S5): a removal of an item
 * with an ID that no item read holds is done, whoever removed it, and is no longer
 * pending, nor are the item's edits beneath it; one found follows its item to its
 * place in the read, and takes its ID if it had none, keeping the item as loaded, its
 * base. One without an ID that is not found is kept, as an edit is: the next publish
 * says it can't be found (D3). `changes` itself when nothing changes.
 */
export function reconcileRemovals(
  changes: RoadmapChanges,
  items: readonly RoadmapItem[],
): RoadmapChanges {
  if (changes.removals.length === 0) return changes
  const read = new Set(items.flatMap(({ id }) => (id === null ? [] : [id])))
  const done: ItemRemoval[] = []
  const removals = changes.removals.flatMap((removal): ItemRemoval[] => {
    const { item, position } = removal
    if (item.id !== null && !read.has(item.id)) {
      done.push(removal)
      return []
    }
    const index = findEditedItem(items, new Set(), removal, [])
    const found = items[index]
    if (found === undefined) return [removal]
    const id = item.id ?? found.id
    if (index === position && id === item.id) return [removal]
    return [{ item: { ...item, id }, position: index }]
  })
  if (
    removals.length === changes.removals.length &&
    removals.every((each, at) => each === changes.removals[at])
  ) {
    return changes
  }
  return {
    ...changes,
    items: changes.items.filter(
      (entry) => !done.some((removal) => sameTarget(removal, entry)),
    ),
    removals,
  }
}

/** What publishing a roadmap's removals comes to, over a fresh read of its items. */
export interface PlannedRemovals {
  /** Each item to delete, by its index among the items read, as read there. */
  found: { index: number; item: RoadmapItem }[]
  conflicts: RemovalConflict[]
  /** Each removal whose item can't be found (ADR-012 Option 13). */
  missing: ItemRemoval[]
  /** Each removal of an item no row holds the ID of: done already (STY-049 D7). */
  gone: ItemRemoval[]
}

/** A roadmap as read, as `planRemovals` needs it (`RoadmapSnapshot`). */
interface RemovalSnapshot {
  items: readonly RoadmapItem[]
  repeatedIds: ReadonlySet<string>
  takenIds: ReadonlySet<string>
}

/**
 * Where each removal's item is in `snapshot`, found as an edited item is
 * (`findEditedItem`), with no pending values, since a removal writes none. An item with
 * an ID no row holds is gone, which counts as removed (S5); one with an ID a row the
 * read skips still holds, one without an ID whose position no longer holds what was
 * loaded, and one whose repeated ID's first row no longer does are missing (D3). An
 * item found whose fields differ from what was loaded is a conflict (S4); one found
 * anywhere else in its roadmap is not.
 */
export function planRemovals(
  removals: readonly ItemRemoval[],
  snapshot: RemovalSnapshot,
): PlannedRemovals {
  const planned: PlannedRemovals = {
    found: [],
    conflicts: [],
    missing: [],
    gone: [],
  }
  for (const removal of removals) {
    const { id } = removal.item
    const index = findEditedItem(
      snapshot.items,
      snapshot.repeatedIds,
      removal,
      [],
    )
    const current = snapshot.items[index]
    if (current === undefined) {
      if (id !== null && !snapshot.takenIds.has(id)) planned.gone.push(removal)
      else planned.missing.push(removal)
      continue
    }
    const fields = EDITABLE_ITEM_FIELDS.flatMap((field) => {
      const base = itemValue(removal.item, field)
      const now = itemValue(current, field)
      return base === now ? [] : [{ field, base, current: now }]
    })
    if (fields.length > 0) {
      planned.conflicts.push({ subject: "removal", removal, current, fields })
    } else {
      planned.found.push({ index, item: current })
    }
  }
  return planned
}

/**
 * Whether a removal sent is held by `items`, a read of the roadmap after a write whose
 * answer was lost (STY-049 D12): one with an ID when no row holds the ID, `takenIds`
 * reading every row; one without an ID when the item at its index no longer holds what
 * it did, which only says so once every other write is held (`"if-others-held"`).
 */
export function heldRemoval(
  { index, item }: { index: number; item: RoadmapItem },
  items: readonly RoadmapItem[],
  takenIds: ReadonlySet<string>,
): boolean | "if-others-held" {
  if (item.id !== null) return !takenIds.has(item.id)
  const now = items[index]
  return now !== undefined && itemHoldsLoaded(now, item, [])
    ? false
    : "if-others-held"
}
