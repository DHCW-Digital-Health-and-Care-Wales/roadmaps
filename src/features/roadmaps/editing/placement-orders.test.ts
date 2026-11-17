import { describe, expect, it } from "vitest"

import { addNewItem } from "@/domain/roadmap/new-item"
import { orderedItem } from "@/domain/roadmap/placement-order"
import {
  NO_CHANGES,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"

import {
  countChanges,
  editItem,
  matchItemChanges,
  reconcileItems,
  settlePublished,
  undoItem,
} from "./pending-changes"

import {
  reorderItem,
  settleOrders,
  shownTurns,
  undoOrder,
} from "./placement-orders"

const item = (title: string, placement: RoadmapPlacement = "now") =>
  createTestRoadmapItem(title, {
    id: `${title.toLowerCase()}idxxxx`,
    placement,
  })
const a = item("A")
const b = item("B")
const c = item("C")
const d = item("D")
const x = item("X", "next")
const items = [a, b, x, c, d]

/** The titles a placement shows, in order, with `changes` pending over `read`. */
function shown(
  changes: RoadmapChanges,
  placement: RoadmapPlacement = "now",
  read: readonly RoadmapItem[] = items,
) {
  const turns = shownTurns(read, changes)
  const entries = matchItemChanges(read, changes)
  const placed = [
    ...read.map((each, position) => ({
      title: each.title.en,
      placement:
        entries.get(position)?.fields.placement?.value ?? each.placement,
      turn: turns[position],
    })),
    ...changes.newItems.map(({ values }, added) => ({
      title: values.title,
      placement: values.placement,
      turn: turns[read.length + added],
    })),
  ]
  return placed
    .filter((each) => each.placement === placement)
    .sort((one, other) => (one.turn ?? -1) - (other.turn ?? -1))
    .map(({ title }) => title)
}

/** `changes` with the item of `read` titled `title` moved to `placement`. */
function move(
  changes: RoadmapChanges,
  title: string,
  placement: RoadmapPlacement,
  read: readonly RoadmapItem[] = items,
) {
  const position = read.findIndex((each) => each.title.en === title)
  const moved = read[position]
  if (!moved) throw new Error(`No item ${title}`)
  const entry = matchItemChanges(read, changes).get(position)
  return settleOrders(
    editItem(changes, entry, moved, position, { placement }),
    read,
  )
}

const at = (title: string) => items.findIndex((each) => each.title.en === title)

/** `changes` after a fresh read of the roadmap's items, as the store settles them. */
const afterRead = (changes: RoadmapChanges, read: readonly RoadmapItem[]) =>
  settleOrders(reconcileItems(changes, read), read)

describe("reorderItem", () => {
  it("keeps the placement's new order pending, from the order as loaded (S2)", () => {
    const changes = reorderItem(NO_CHANGES, items, at("D"), "top")

    expect(changes.orders).toEqual([
      {
        placement: "now",
        base: [a, b, c, d].map(({ id }) => ({ id })),
        items: [d, a, b, c].map(({ id }) => ({ id })),
      },
    ])
    expect(shown(changes)).toEqual(["D", "A", "B", "C"])
    expect(countChanges(changes)).toBe(1)
  })

  it.each([
    ["top", "C", ["C", "A", "B", "D"]],
    ["up", "C", ["A", "C", "B", "D"]],
    ["down", "B", ["A", "C", "B", "D"]],
    ["bottom", "B", ["A", "C", "D", "B"]],
  ] as const)("moves an item to the %s (S2)", (to, title, order) => {
    expect(shown(reorderItem(NO_CHANGES, items, at(title), to))).toEqual(order)
  })

  it("builds on the pending order, keeping the base it was first reordered from", () => {
    const once = reorderItem(NO_CHANGES, items, at("D"), "top")

    const twice = reorderItem(once, items, at("B"), "bottom")

    expect(shown(twice)).toEqual(["D", "A", "C", "B"])
    expect(twice.orders).toHaveLength(1)
    expect(twice.orders[0]?.base).toEqual(once.orders[0]?.base)
  })

  it("is no change once the order is the one the page shows without it (D12)", () => {
    const moved = reorderItem(NO_CHANGES, items, at("D"), "up")

    expect(reorderItem(moved, items, at("D"), "down")).toEqual(NO_CHANGES)
  })

  it("changes nothing for a move that leaves the item where it is, or an unplaced item", () => {
    const unplaced = createTestRoadmapItem("Unplaced", {
      placement: null,
      writtenHorizon: "",
    })

    expect(reorderItem(NO_CHANGES, items, at("A"), "top")).toBe(NO_CHANGES)
    expect(reorderItem(NO_CHANGES, items, at("X"), "bottom")).toBe(NO_CHANGES)
    expect(reorderItem(NO_CHANGES, [a, unplaced, b], 1, "top").orders).toEqual(
      [],
    )
  })

  it("orders each placement on its own", () => {
    const y = item("Y", "next")
    const read = [...items, y]

    const changes = reorderItem(
      reorderItem(NO_CHANGES, read, at("D"), "top"),
      read,
      read.indexOf(y),
      "top",
    )

    expect(changes.orders.map(({ placement }) => placement)).toEqual([
      "now",
      "next",
    ])
    expect(shown(changes, "next", read)).toEqual(["Y", "X"])
    expect(countChanges(changes)).toBe(2)
  })

  it("orders items that have no ID yet, each held by what it read as", () => {
    const first = createTestRoadmapItem("First")
    const second = createTestRoadmapItem("Second")
    const read = [first, second]

    const changes = reorderItem(NO_CHANGES, read, 1, "top")

    expect(changes.orders[0]?.items).toEqual([
      orderedItem(second, 1),
      orderedItem(first, 0),
    ])
    expect(shown(changes, "now", read)).toEqual(["Second", "First"])
  })
})

describe("a pending order and the Product Lead's other changes (S4, S5)", () => {
  const reordered = reorderItem(NO_CHANGES, items, at("D"), "top")

  it("takes an item moved into the placement last, where it can be reordered", () => {
    const moved = move(reordered, "X", "now")

    expect(shown(moved)).toEqual(["D", "A", "B", "C", "X"])
    expect(shown(reorderItem(moved, items, at("X"), "up"))).toEqual([
      "D",
      "A",
      "B",
      "X",
      "C",
    ])
  })

  it("takes an item added to the placement last, after one moved in", () => {
    const added = settleOrders(
      addNewItem(
        move(reordered, "X", "now"),
        {
          title: "New",
          placement: "now",
        },
        items,
      ),
      items,
    )

    expect(shown(added)).toEqual(["D", "A", "B", "C", "X", "New"])
    expect(shown(reorderItem(added, items, items.length, "top"))).toEqual([
      "New",
      "D",
      "A",
      "B",
      "C",
      "X",
    ])
  })

  it("lets an item moved out leave the order, and one whose move in is undone", () => {
    const out = move(reordered, "A", "later")
    expect(shown(out)).toEqual(["D", "B", "C"])
    expect(out.orders[0]?.items).toEqual([d, b, c].map(({ id }) => ({ id })))

    const movedIn = reorderItem(
      move(reordered, "X", "now"),
      items,
      at("X"),
      "top",
    )
    const entry = matchItemChanges(items, movedIn).get(at("X"))
    if (!entry) throw new Error("X is moved")
    const undone = settleOrders(undoItem(movedIn, entry), items)
    expect(shown(undone)).toEqual(["D", "A", "B", "C"])
    expect(shown(undone, "next")).toEqual(["X"])
  })

  it("puts an item moved out and back in last, as any item moved in", () => {
    const back = move(move(reordered, "A", "later"), "A", "now")

    expect(shown(back)).toEqual(["D", "B", "C", "A"])
  })

  it("is no change once it is the order the page shows with the item moved in last (D12)", () => {
    const movedIn = reorderItem(
      move(NO_CHANGES, "X", "now"),
      items,
      at("X"),
      "up",
    )
    expect(shown(movedIn)).toEqual(["A", "B", "C", "X", "D"])

    const back = reorderItem(movedIn, items, at("X"), "down")

    expect(back.orders).toEqual([])
    expect(countChanges(back)).toBe(1)
  })

  it("is no change once a move out leaves the page's own order (D12)", () => {
    // D first, then D moved out: A, B and C are as they were loaded.
    expect(move(reordered, "D", "later").orders).toEqual([])
  })

  it("is left alone by an item's Undo changes, which restores its text (S4)", () => {
    const edited = editItem(reordered, undefined, a, at("A"), { title: "A1" })
    const entry = matchItemChanges(items, edited).get(at("A"))
    if (!entry) throw new Error("A is edited")

    const undone = settleOrders(undoItem(edited, entry), items)

    expect(undone.items).toEqual([])
    expect(undone.orders).toEqual(reordered.orders)
  })
})

describe("undoOrder", () => {
  it("drops the placement's order alone (S3)", () => {
    const edited = editItem(
      reorderItem(NO_CHANGES, items, at("D"), "top"),
      undefined,
      a,
      at("A"),
      { title: "A1" },
    )

    const undone = undoOrder(edited, "now")

    expect(undone.orders).toEqual([])
    expect(undone.items).toEqual(edited.items)
    expect(undoOrder(undone, "now")).toBe(undone)
  })
})

describe("a pending order after a read (S9)", () => {
  const reordered = reorderItem(NO_CHANGES, items, at("D"), "top")

  it("is no longer pending once the read holds it, whoever made it", () => {
    expect(afterRead(reordered, [d, a, b, x, c])).toEqual(NO_CHANGES)
  })

  it("is kept, with its base, over a read that doesn't hold it", () => {
    const renamed = { ...a, title: { en: "Their A", cy: "" } }

    const kept = afterRead(reordered, [renamed, b, x, c, d])

    expect(kept.orders).toEqual(reordered.orders)
  })

  it("takes an item a co-lead added or moved in last, and lets one they removed or moved out go", () => {
    const theirs = item("E")
    const read = [a, { ...b, placement: "later" as const }, x, d, theirs]

    const kept = afterRead(reordered, read)

    expect(shown(kept, "now", read)).toEqual(["D", "A", "E"])
    // The order as loaded is still what their change is found by.
    expect(kept.orders[0]?.base).toEqual(reordered.orders[0]?.base)
  })

  it("is the same changes when the read changes nothing of it", () => {
    expect(afterRead(reordered, items)).toBe(reordered)
  })

  it("is no longer pending once a read gives its items IDs in the order it holds", () => {
    const first = createTestRoadmapItem("First")
    const second = createTestRoadmapItem("Second")
    const pending = reorderItem(NO_CHANGES, [first, second], 1, "top")

    expect(
      afterRead(pending, [
        { ...second, id: "secondid" },
        { ...first, id: "firstidx" },
      ]),
    ).toEqual(NO_CHANGES)
  })

  it("follows items with no ID to where a read finds them", () => {
    const first = createTestRoadmapItem("First")
    const second = createTestRoadmapItem("Second")
    const pending = reorderItem(NO_CHANGES, [first, second], 1, "top")
    const read = [item("Theirs", "next"), first, second]

    const kept = afterRead(pending, read)

    expect(shown(kept, "now", read)).toEqual(["Second", "First"])
    expect(kept.orders[0]?.items).toEqual([
      orderedItem(second, 2),
      orderedItem(first, 1),
    ])
  })
})

describe("settlePublished", () => {
  it("drops an order that was sent", () => {
    const sent = reorderItem(NO_CHANGES, items, at("D"), "top")

    expect(settlePublished(sent, sent)).toEqual(NO_CHANGES)
  })
})
