import { describe, expect, it } from "vitest"

import {
  reconcileRemovals,
  removalOf,
  removeAnyway,
  removeItem,
  undoRemoval,
} from "./item-removal"
import {
  type ItemRemoval,
  NO_CHANGES,
  type RemovalConflict,
  type RoadmapChanges,
} from "./roadmap-changes"
import { createTestRoadmapItem } from "./testing/test-roadmap-item"

const booking = createTestRoadmapItem("Online booking", { id: "bookingx" })
const letters = createTestRoadmapItem("Letters by email")
const reminders = createTestRoadmapItem("Text reminders", { id: "remindrx" })

describe("removeItem and undoRemoval (STY-070 S1)", () => {
  const edit = {
    item: booking,
    position: 0,
    fields: { phase: { base: "", value: "Live" } },
  }
  const order = {
    placement: "now" as const,
    base: [{ id: "bookingx" }, { id: "remindrx" }],
    items: [{ id: "remindrx" }, { id: "bookingx" }],
  }
  const changes: RoadmapChanges = {
    ...NO_CHANGES,
    items: [edit],
    orders: [order],
  }

  it("holds the item as loaded and its position, keeping its edits and its place in an order", () => {
    const removed = removeItem(changes, booking, 0)

    expect(removed).toEqual({
      ...changes,
      removals: [{ item: booking, position: 0 }],
    })
    expect(removed.items[0]).toBe(edit)
    expect(removed.orders[0]).toBe(order)
  })

  it("removes an item once, found by its ID or, with none, by its place", () => {
    const removed = removeItem(removeItem(changes, booking, 0), letters, 1)

    expect(removeItem(removed, booking, 3)).toBe(removed)
    expect(removeItem(removed, letters, 1)).toBe(removed)
    expect(removeItem(removed, createTestRoadmapItem("Other"), 2)).not.toBe(
      removed,
    )
  })

  it("brings back what it was, edits and order, on undoing", () => {
    const removed = removeItem(changes, booking, 0)
    const [removal] = removed.removals

    expect(removal && undoRemoval(removed, removal)).toEqual(changes)
    expect(undoRemoval(changes, { item: booking, position: 0 })).toBe(changes)
  })

  it("tells whether an item is removed", () => {
    const removed = removeItem(changes, letters, 1)

    expect(removalOf(removed, { item: letters, position: 1 })).toEqual({
      item: letters,
      position: 1,
    })
    expect(removalOf(removed, { item: letters, position: 2 })).toBeUndefined()
    expect(removalOf(undefined, edit)).toBeUndefined()
  })
})

describe("removeAnyway (STY-070 S4)", () => {
  it("keeps the removal, with the item as the publish found it as its base", () => {
    const removal: ItemRemoval = { item: booking, position: 0 }
    const current = { ...booking, phase: { en: "Beta", cy: "" } }
    const conflict: RemovalConflict = {
      subject: "removal",
      removal,
      current,
      fields: [{ field: "phase", base: "", current: "Beta" }],
    }
    const changes = { ...NO_CHANGES, removals: [removal] }

    expect(removeAnyway(changes, conflict)).toEqual({
      ...NO_CHANGES,
      removals: [{ item: current, position: 0 }],
    })
  })
})

describe("reconcileRemovals (STY-070 S5)", () => {
  const changes: RoadmapChanges = {
    ...NO_CHANGES,
    removals: [
      { item: booking, position: 0 },
      { item: letters, position: 1 },
    ],
  }

  it("is no longer pending for an item with an ID that a read no longer holds", () => {
    expect(reconcileRemovals(changes, [reminders, letters])).toEqual({
      ...NO_CHANGES,
      removals: [{ item: letters, position: 1 }],
    })
  })

  it("follows an item with an ID to its place, and one without takes the ID it now has", () => {
    const lettersRead = { ...letters, id: "lettersx" }

    expect(
      reconcileRemovals(changes, [reminders, lettersRead, booking]),
    ).toEqual({
      ...NO_CHANGES,
      removals: [
        { item: booking, position: 2 },
        { item: lettersRead, position: 1 },
      ],
    })
  })

  it("keeps the item as loaded, so a co-lead's change since is still a conflict", () => {
    const theirs = { ...booking, phase: { en: "Beta", cy: "" } }

    expect(reconcileRemovals(changes, [theirs, letters])).toBe(changes)
  })

  it("keeps one without an ID that a read can't find, for the publish to report", () => {
    const changed = { ...letters, phase: { en: "Beta", cy: "" } }

    expect(reconcileRemovals(changes, [booking, changed])).toBe(changes)
  })
})
