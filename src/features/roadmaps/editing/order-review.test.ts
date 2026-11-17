import { describe, expect, it } from "vitest"

import { addNewItem } from "@/domain/roadmap/new-item"
import { orderedItem } from "@/domain/roadmap/placement-order"
import {
  NO_CHANGES,
  type OrderConflict,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"

import { reviewedOrders } from "./order-review"
import type { PageItem } from "./page-items"
import {
  applyItemChanges,
  editItem,
  matchItemChanges,
  shownNewItem,
} from "./pending-changes"
import { reorderItem, settleOrders, shownTurns } from "./pending-orders"

const item = (title: string, placement: RoadmapPlacement = "now") =>
  createTestRoadmapItem(title, {
    id: `${title.toLowerCase()}idxxxx`,
    placement,
  })
const a = item("A")
const b = item("B")
const c = item("C")
const theirs = item("E")
const loaded = [a, b, c]
/** As a co-lead left the roadmap: C removed, E added. */
const current = [a, b, theirs]

/** The conflict a publish of Now's order, as `pending` holds it, finds over `found`. */
function conflictOver(
  pending: RoadmapChanges,
  found: readonly RoadmapItem[],
): OrderConflict {
  const order = pending.orders[0]
  if (!order) throw new Error("Now is reordered")
  return {
    subject: "order",
    placement: "now",
    base: order.base,
    pending: order.items,
    current: found.map((each, position) => ({
      item: orderedItem(each, position),
      title: each.title,
    })),
  }
}

const reordered = reorderItem(NO_CHANGES, loaded, 2, "top")
const conflict = conflictOver(reordered, current)

/** The page's items over `read`, as `usePageItems` gives them. */
function pageItemsOf(
  read: readonly RoadmapItem[],
  pending: RoadmapChanges,
): PageItem[] {
  const entries = matchItemChanges(read, pending)
  const turns = shownTurns(read, pending)
  return [
    ...read.map((each, position) => ({
      key: `read-${String(position)}`,
      item: each,
      shown: applyItemChanges(each, entries.get(position)),
      entry: entries.get(position),
      newItemId: undefined,
      turn: turns[position],
    })),
    ...pending.newItems.map((newItem, added) => ({
      key: `new-${newItem.id}`,
      item: shownNewItem(newItem),
      shown: shownNewItem(newItem),
      entry: undefined,
      newItemId: newItem.id,
      turn: turns[read.length + added],
    })),
  ]
}

const titles = (lines: readonly { title: { en: string } }[]) =>
  lines.map(({ title }) => title.en)

describe("reviewedOrders (STY-050 S11)", () => {
  it("shows what Keep mine would publish beside the order found: a co-lead's item last, one they removed gone", () => {
    // The read after the refusal holds the co-lead's change.
    const pending = settleOrders(reordered, current)

    const { yours, theirs: found } = reviewedOrders(
      conflict,
      pageItemsOf(current, pending),
    )

    expect(titles(yours)).toEqual(["A", "B", "E"])
    expect(titles(found)).toEqual(["A", "B", "E"])
  })

  it("keeps the Product Lead's order of the items they know, and their own moves and new items", () => {
    const moved = item("X", "next")
    const read = [...current, moved]
    const pending = settleOrders(
      addNewItem(
        editItem(
          reorderItem(NO_CHANGES, [...loaded, moved], 1, "top"),
          undefined,
          moved,
          3,
          { placement: "now" },
        ),
        { title: "New", placement: "now" },
        read,
      ),
      read,
    )

    const { yours, theirs: found } = reviewedOrders(
      conflict,
      pageItemsOf(read, pending),
    )

    expect(titles(yours)).toEqual(["B", "A", "E", "X", "New"])
    expect(titles(found)).toEqual(["A", "B", "E"])
  })

  it("shows each item by the title the page shows, in both orders", () => {
    const pending = settleOrders(
      editItem(reorderItem(NO_CHANGES, loaded, 1, "top"), undefined, a, 0, {
        title: "My A",
      }),
      current,
    )

    const { yours, theirs: found } = reviewedOrders(
      conflict,
      pageItemsOf(current, pending),
    )

    expect(titles(yours)).toEqual(["B", "My A", "E"])
    expect(titles(found)).toEqual(["My A", "B", "E"])
  })

  describe("when the read after the refusal failed", () => {
    it("shows a co-lead's items all the same, and leaves out one the Product Lead moved out", () => {
      // The page still holds the roadmap as loaded: A, B and C.
      const pending = editItem(
        reorderItem(NO_CHANGES, loaded, 1, "top"),
        undefined,
        a,
        0,
        { placement: "later" },
      )

      const { yours } = reviewedOrders(conflict, pageItemsOf(loaded, pending))

      expect(titles(yours)).toEqual(["B", "E"])
    })

    it("shows each item with no ID by its own title, not that of the item the page read in its place", () => {
      const first = createTestRoadmapItem("First")
      const second = createTestRoadmapItem("Second")
      const third = createTestRoadmapItem("Third")
      // The page still holds them as loaded; a co-lead has since sorted the rows.
      const page = [first, second, third]
      const pending = reorderItem(NO_CHANGES, page, 2, "top")

      const { yours, theirs: found } = reviewedOrders(
        conflictOver(pending, [second, first, third]),
        pageItemsOf(page, pending),
      )

      expect(titles(found)).toEqual(["Second", "First", "Third"])
      expect(titles(yours)).toEqual(["Third", "First", "Second"])
    })

    it("keeps the title the publish read for an item the page can't tell", () => {
      const first = createTestRoadmapItem("First")
      const second = createTestRoadmapItem("Second")
      const page = [first, second]
      const pending = reorderItem(NO_CHANGES, page, 1, "top")
      const renamed = createTestRoadmapItem("Their first")

      const { yours, theirs: found } = reviewedOrders(
        conflictOver(pending, [renamed, second]),
        pageItemsOf(page, pending),
      )

      expect(titles(found)).toEqual(["Their first", "Second"])
      expect(titles(yours)).toEqual(["Second", "Their first"])
    })
  })
})
