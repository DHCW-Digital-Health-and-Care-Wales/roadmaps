import { describe, expect, it } from "vitest"

import { movedItems, planItemMoves } from "./item-moves"

/**
 * The moves planned over a roadmap's items, each written `Title:placement` in the order
 * read (`Title:` for an unplaced one), when the items named are moved, in that order,
 * each to its new placement: the moves in words, and the titles in the order they leave.
 */
function plan(rows: readonly string[], moved: readonly [string, string][]) {
  const items = rows.map((row) => {
    const [title = "", placement = ""] = row.split(":")
    return { title, placement: placement === "" ? null : placement }
  })
  const at = (title: string) => {
    const index = items.findIndex((item) => item.title === title)
    if (index < 0) throw new Error(`No item ${title}`)
    return index
  }
  const titleAt = (index: number) => items[index]?.title ?? "?"
  const moves = planItemMoves(
    items.map(({ placement }) => placement),
    moved.map(([title, placement]) => ({ index: at(title), placement })),
  )
  return {
    moves: moves.map((move) =>
      "after" in move
        ? `${titleAt(move.index)} after ${titleAt(move.after)}`
        : `${titleAt(move.index)} before ${titleAt(move.before)}`,
    ),
    order: movedItems(items, moves).map(({ title }) => title),
  }
}

describe("planItemMoves (STY-051)", () => {
  it("moves the item to just after its new placement's last item (S3)", () => {
    expect(
      plan(
        ["Online booking:next", "A:now", "Video:next", "B:now", "C:now"],
        [["Online booking", "now"]],
      ),
    ).toEqual({
      moves: ["Online booking after C"],
      order: ["A", "Video", "B", "C", "Online booking"],
    })
  })

  it("moves it to just after that item, not to the end of the roadmap (S3)", () => {
    expect(
      plan(
        ["Online booking:next", "A:now", "B:now", "Later one:later"],
        [["Online booking", "now"]],
      ),
    ).toEqual({
      moves: ["Online booking after B"],
      order: ["A", "B", "Online booking", "Later one"],
    })
  })

  it("counts every item the placement holds as read, a co-lead's included (S4)", () => {
    expect(
      plan(
        ["A:now", "Online booking:next", "B:now", "C:now", "D:now"],
        [["Online booking", "now"]],
      ),
    ).toEqual({
      moves: ["Online booking after D"],
      order: ["A", "B", "C", "D", "Online booking"],
    })
  })

  it("leaves a row that is already after every item of its new placement, whatever lies between (S5)", () => {
    expect(
      plan(
        ["A:now", "B:now", "Online booking:next"],
        [["Online booking", "now"]],
      ),
    ).toEqual({ moves: [], order: ["A", "B", "Online booking"] })
    expect(
      plan(
        [
          "A:now",
          "Later one:later",
          "B:now",
          "Video:next",
          "Online booking:next",
        ],
        [["Online booking", "now"]],
      ),
    ).toEqual({
      moves: [],
      order: ["A", "Later one", "B", "Video", "Online booking"],
    })
  })

  it("leaves the one item moved into a placement with no items (S5)", () => {
    expect(
      plan(["Online booking:next", "A:now"], [["Online booking", "later"]]),
    ).toEqual({ moves: [], order: ["Online booking", "A"] })
  })

  it("places an unplaced item last too", () => {
    expect(plan(["Someday:", "A:now"], [["Someday", "now"]])).toEqual({
      moves: ["Someday after A"],
      order: ["A", "Someday"],
    })
  })

  describe("several items moved into one placement (S6)", () => {
    it("puts them last in the order they were moved, not their loaded order", () => {
      expect(
        plan(
          ["Y:next", "X:later", "A:now"],
          [
            ["X", "now"],
            ["Y", "now"],
          ],
        ),
      ).toEqual({
        moves: ["X after A", "Y after X"],
        order: ["A", "X", "Y"],
      })
    })

    it("leaves those already in the order moved, below the placement's items", () => {
      expect(
        plan(
          ["A:now", "X:later", "Other:next", "Y:next"],
          [
            ["X", "now"],
            ["Y", "now"],
          ],
        ),
      ).toEqual({ moves: [], order: ["A", "X", "Other", "Y"] })
    })

    it("moves the later one after the earlier when the placement held no items and its row is above", () => {
      expect(
        plan(
          ["Y:later", "X:later"],
          [
            ["X", "now"],
            ["Y", "now"],
          ],
        ),
      ).toEqual({ moves: ["Y after X"], order: ["X", "Y"] })
    })

    it("makes the fewest moves: the longest run already in order stays", () => {
      expect(
        plan(
          ["A:now", "Y:later", "Z:later", "X:later"],
          [
            ["X", "now"],
            ["Y", "now"],
            ["Z", "now"],
          ],
        ),
      ).toEqual({ moves: ["X after A"], order: ["A", "X", "Y", "Z"] })
    })

    it("moves the first before the rest when the placement held no items and the rest are in order", () => {
      expect(
        plan(
          ["Y:later", "Z:later", "X:later"],
          [
            ["X", "now"],
            ["Y", "now"],
            ["Z", "now"],
          ],
        ),
      ).toEqual({ moves: ["X before Y"], order: ["X", "Y", "Z"] })
    })

    it("moves a row above the placement's items however the others lie", () => {
      expect(
        plan(
          ["Y:later", "A:now", "X:later", "Z:later"],
          [
            ["X", "now"],
            ["Y", "now"],
            ["Z", "now"],
          ],
        ),
      ).toEqual({ moves: ["Y after X"], order: ["A", "X", "Y", "Z"] })
    })
  })

  it("takes an item moving out as none of its old placement's", () => {
    // X is below A, the one item that stays in Now, though above Z, which leaves.
    expect(
      plan(
        ["A:now", "X:later", "Z:now"],
        [
          ["X", "now"],
          ["Z", "later"],
        ],
      ),
    ).toEqual({ moves: [], order: ["A", "X", "Z"] })
  })

  it("keeps every other placement's rows in their order", () => {
    const { order } = plan(
      [
        "N1:next",
        "X:later",
        "L1:later",
        "A:now",
        "N2:next",
        "L2:later",
        "B:now",
      ],
      [
        ["X", "now"],
        ["N1", "later"],
      ],
    )

    expect(order).toEqual(["L1", "A", "N2", "L2", "N1", "B", "X"])
  })

  it("plans nothing when nothing is moved", () => {
    expect(plan(["A:now", "B:next"], [])).toEqual({
      moves: [],
      order: ["A", "B"],
    })
  })
})

describe("movedItems", () => {
  it("makes each move over what the moves before it left", () => {
    expect(
      movedItems(
        ["a", "b", "c", "d"],
        [
          { index: 0, after: 3 },
          { index: 2, before: 1 },
          { index: 1, after: 0 },
        ],
      ),
    ).toEqual(["c", "d", "a", "b"])
  })
})
