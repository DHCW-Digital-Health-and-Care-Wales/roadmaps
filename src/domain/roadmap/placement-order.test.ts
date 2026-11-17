import { describe, expect, it } from "vitest"

import {
  arrangedOrder,
  findOrderedItems,
  orderedItem,
  sameOrder,
  sameOrderedItem,
} from "./placement-order"
import type { ItemChanges, OrderedItem } from "./roadmap-changes"
import { createTestRoadmapItem } from "./testing/test-roadmap-item"

const withId = (id: string): OrderedItem => ({ id })

describe("orderedItem", () => {
  it("holds an item by its ID, or with none by what it read as, and where", () => {
    const first = createTestRoadmapItem("First", { id: "firstidx" })
    const second = createTestRoadmapItem("Second")

    expect(orderedItem(first, 0)).toEqual({ id: "firstidx" })
    expect(orderedItem(second, 1)).toEqual({
      id: null,
      item: second,
      position: 1,
    })
  })
})

describe("sameOrderedItem", () => {
  it("tells items of one read apart by ID, or by place with none", () => {
    const item = createTestRoadmapItem("Item")

    expect(sameOrderedItem(withId("a"), withId("a"))).toBe(true)
    expect(sameOrderedItem(withId("a"), withId("b"))).toBe(false)
    expect(sameOrderedItem(orderedItem(item, 2), orderedItem(item, 2))).toBe(
      true,
    )
    expect(sameOrderedItem(orderedItem(item, 2), orderedItem(item, 3))).toBe(
      false,
    )
    expect(sameOrderedItem(withId("a"), orderedItem(item, 0))).toBe(false)
  })
})

describe("sameOrder", () => {
  it("is the same items in the same sequence", () => {
    const order = [withId("a"), withId("b")]

    expect(sameOrder(order, [withId("a"), withId("b")])).toBe(true)
    expect(sameOrder(order, [withId("b"), withId("a")])).toBe(false)
    expect(sameOrder(order, [withId("a")])).toBe(false)
    expect(sameOrder([], [])).toBe(true)
  })
})

describe("arrangedOrder", () => {
  it("keeps the order's items that are present in its sequence, then the others, last, in theirs (S5, S11)", () => {
    expect(arrangedOrder(["c", "gone", "a"], ["a", "b", "c", "d"])).toEqual([
      "c",
      "a",
      "b",
      "d",
    ])
  })

  it("is the items present when the order holds none of them", () => {
    expect(arrangedOrder(["x"], ["a", "b"])).toEqual(["a", "b"])
  })

  it("tells items apart as it is told to, and gives those present", () => {
    const present = [withId("a"), withId("b")]

    const arranged = arrangedOrder(
      [withId("b"), withId("a")],
      present,
      sameOrderedItem,
    )

    expect(arranged).toEqual([withId("b"), withId("a")])
    expect(arranged[0]).toBe(present[1])
  })
})

describe("findOrderedItems", () => {
  const edits: ItemChanges[] = []

  it("finds an item by its ID, the first row holding it, wherever it now is", () => {
    const items = [
      createTestRoadmapItem("Other", { id: "otheridx" }),
      createTestRoadmapItem("Item", { id: "itemidxx" }),
      createTestRoadmapItem("Copy", { id: "itemidxx" }),
    ]

    expect(
      findOrderedItems(items, [withId("itemidxx"), withId("goneidxx")], edits),
    ).toEqual([1, -1])
  })

  it("finds an item with no ID where it was, holding what it did, with an ID or not", () => {
    const loaded = createTestRoadmapItem("Item")

    expect(
      findOrderedItems(
        [createTestRoadmapItem("Other"), { ...loaded, id: "givenidx" }],
        [orderedItem(loaded, 1)],
        edits,
      ),
    ).toEqual([1])
  })

  it("finds it elsewhere once its row has moved, by what it holds, each item once", () => {
    const first = createTestRoadmapItem("Same")
    const second = createTestRoadmapItem("Same")
    const other = createTestRoadmapItem("Other")

    expect(
      findOrderedItems(
        [other, second, first],
        [orderedItem(first, 0), orderedItem(second, 1), orderedItem(other, 2)],
        edits,
      ),
    ).toEqual([2, 1, 0])
  })

  it("finds none for an item whose content a co-lead changed", () => {
    const loaded = createTestRoadmapItem("Item")

    expect(
      findOrderedItems(
        [createTestRoadmapItem("Their item")],
        [orderedItem(loaded, 0)],
        edits,
      ),
    ).toEqual([-1])
  })

  it("finds it holding its pending edits, written by a publish whose answer was lost", () => {
    const loaded = createTestRoadmapItem("Item")
    const pending: ItemChanges = {
      item: loaded,
      position: 0,
      fields: { title: { base: "Item", value: "My item" } },
    }

    expect(
      findOrderedItems(
        [
          createTestRoadmapItem("Other", { id: "otheridx" }),
          createTestRoadmapItem("My item", { id: "givenidx" }),
        ],
        [orderedItem(loaded, 0)],
        [pending],
      ),
    ).toEqual([1])
  })
})
