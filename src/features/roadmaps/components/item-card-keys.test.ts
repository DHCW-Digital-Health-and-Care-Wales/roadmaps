import { describe, expect, it } from "vitest"

import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"

import { assignItemCardKeys } from "./item-card-keys"

const one = createTestRoadmapItem("One")
const two = createTestRoadmapItem("Two")

describe("assignItemCardKeys", () => {
  it("keeps an item's key when a read gives it its first ID", () => {
    const before = assignItemCardKeys([one, two], undefined)
    const after = assignItemCardKeys(
      [
        { ...one, id: "id-1" },
        { ...two, id: "id-2" },
      ],
      before,
    )

    expect(after.keys).toEqual(before.keys)
  })

  it("keeps a key it took over as the item moves", () => {
    const first = assignItemCardKeys([one, two], undefined)
    const identified = assignItemCardKeys(
      [
        { ...one, id: "id-1" },
        { ...two, id: "id-2" },
      ],
      first,
    )
    const moved = assignItemCardKeys(
      [
        { ...two, id: "id-2" },
        { ...one, id: "id-1" },
      ],
      identified,
    )

    expect(moved.keys).toEqual([first.keys[1], first.keys[0]])
  })

  it("gives an item without an ID a new key when what it holds changes", () => {
    const before = assignItemCardKeys([one], undefined)
    const after = assignItemCardKeys(
      [{ ...one, phase: { en: "Beta", cy: "" } }],
      before,
    )

    expect(after.keys[0]).not.toEqual(before.keys[0])
  })

  it("keys an item that had an ID from the start by its ID", () => {
    const keys = assignItemCardKeys([{ ...one, id: "id-1" }], undefined)

    expect(keys.keys).toEqual(["id:id-1"])
  })
})
