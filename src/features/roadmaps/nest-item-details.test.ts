import { describe, expect, it } from "vitest"

import type { RoadmapItemDetail } from "@/domain/roadmap/roadmap-item"

import { nestItemDetails } from "./nest-item-details"

const detail = (en: string, level: number): RoadmapItemDetail => ({
  text: { en, cy: "" },
  level,
})

describe("nestItemDetails", () => {
  it("nests each entry under the previous shallower one", () => {
    const first = detail("First", 0)
    const child = detail("Child", 1)
    const grandchild = detail("Grandchild", 2)
    const sibling = detail("Sibling", 1)
    const second = detail("Second", 0)

    expect(
      nestItemDetails([first, child, grandchild, sibling, second]),
    ).toEqual([
      {
        detail: first,
        children: [
          { detail: child, children: [{ detail: grandchild, children: [] }] },
          { detail: sibling, children: [] },
        ],
      },
      { detail: second, children: [] },
    ])
  })

  it("nests a skipped level one step down, and keeps a deep first entry at the top", () => {
    const deepFirst = detail("Deep first", 2)
    const top = detail("Top", 0)
    const skipped = detail("Skipped", 3)

    expect(nestItemDetails([deepFirst, top, skipped])).toEqual([
      { detail: deepFirst, children: [] },
      { detail: top, children: [{ detail: skipped, children: [] }] },
    ])
  })

  it("is empty for no details", () => {
    expect(nestItemDetails([])).toEqual([])
  })
})
