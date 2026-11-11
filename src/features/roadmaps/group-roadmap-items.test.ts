import { describe, expect, it } from "vitest"

import { ROADMAP_PLACEMENTS } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"

import { groupRoadmapItems } from "./group-roadmap-items"

describe("groupRoadmapItems", () => {
  it("lists every placement in the public site's order, each item in row order", () => {
    const later = createTestRoadmapItem("Later one", { placement: "later" })
    const nowA = createTestRoadmapItem("Now A")
    const nowB = createTestRoadmapItem("Now B")

    const { placements } = groupRoadmapItems([later, nowA, nowB])

    expect(placements.map(({ placement }) => placement)).toEqual(
      ROADMAP_PLACEMENTS,
    )
    expect(
      placements.find(({ placement }) => placement === "now")?.items,
    ).toEqual([
      { item: nowA, position: 1 },
      { item: nowB, position: 2 },
    ])
    expect(
      placements.find(({ placement }) => placement === "later")?.items,
    ).toEqual([{ item: later, position: 0 }])
    expect(
      placements.find(({ placement }) => placement === "not-doing")?.items,
    ).toEqual([])
  })

  it("keeps unplaced items apart, in row order", () => {
    const soon = createTestRoadmapItem("Soon", {
      placement: null,
      writtenHorizon: "Soon",
    })
    const placed = createTestRoadmapItem("Placed")
    const blank = createTestRoadmapItem("Blank", {
      placement: null,
      writtenHorizon: "",
    })

    const { unplaced, placements } = groupRoadmapItems([soon, placed, blank])

    expect(unplaced).toEqual([
      { item: soon, position: 0 },
      { item: blank, position: 2 },
    ])
    expect(placements.flatMap(({ items }) => items)).toEqual([
      { item: placed, position: 1 },
    ])
  })
})
