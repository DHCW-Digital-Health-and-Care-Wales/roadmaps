import { describe, expect, it } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { ROADMAP_PLACEMENTS } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"

import { groupRoadmapItems, hasGroupedItems } from "./group-roadmap-items"

const placementOf = ({ placement }: RoadmapItem) => placement

describe("groupRoadmapItems", () => {
  it("lists every placement in the public site's order, each item in row order", () => {
    const later = createTestRoadmapItem("Later one", { placement: "later" })
    const nowA = createTestRoadmapItem("Now A")
    const nowB = createTestRoadmapItem("Now B")

    const { placements } = groupRoadmapItems([later, nowA, nowB], placementOf)

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

    const { unplaced, placements } = groupRoadmapItems(
      [soon, placed, blank],
      placementOf,
    )

    expect(unplaced).toEqual([
      { item: soon, position: 0 },
      { item: blank, position: 2 },
    ])
    expect(placements.flatMap(({ items }) => items)).toEqual([
      { item: placed, position: 1 },
    ])
  })

  it("groups anything by the placement it is said to show in, keeping each as given", () => {
    const cards = [
      { title: "Moved to later", shown: "later" as const },
      { title: "Unplaced", shown: null },
      { title: "New, last in later", shown: "later" as const },
    ]

    const { unplaced, placements } = groupRoadmapItems(
      cards,
      ({ shown }) => shown,
    )

    expect(unplaced).toEqual([{ item: cards[1], position: 1 }])
    expect(
      placements.find(({ placement }) => placement === "later")?.items,
    ).toEqual([
      { item: cards[0], position: 0 },
      { item: cards[2], position: 2 },
    ])
  })

  it("shows those that arrived in a placement last, in the order they arrived (STY-051 S1)", () => {
    const cards = [
      { title: "Moved second", shown: "now" as const, turn: 1 },
      { title: "Read first", shown: "now" as const },
      { title: "Moved first", shown: "now" as const, turn: 0 },
      { title: "Elsewhere", shown: "later" as const, turn: 2 },
      { title: "Read last", shown: "now" as const },
      { title: "New", shown: "now" as const, turn: 3 },
    ]

    const { placements } = groupRoadmapItems(
      cards,
      ({ shown }) => shown,
      ({ turn }) => turn,
    )

    expect(
      placements
        .find(({ placement }) => placement === "now")
        ?.items.map(({ item, position }) => [item.title, position]),
    ).toEqual([
      ["Read first", 1],
      ["Read last", 4],
      ["Moved first", 2],
      ["Moved second", 0],
      ["New", 5],
    ])
  })
})

describe("hasGroupedItems", () => {
  it("is false for no items, and true for one unplaced or one placed", () => {
    const unplaced = createTestRoadmapItem("Soon", {
      placement: null,
      writtenHorizon: "Soon",
    })

    expect(hasGroupedItems(groupRoadmapItems([], placementOf))).toBe(false)
    expect(hasGroupedItems(groupRoadmapItems([unplaced], placementOf))).toBe(
      true,
    )
    expect(
      hasGroupedItems(
        groupRoadmapItems(
          [createTestRoadmapItem("Later", { placement: "later" })],
          placementOf,
        ),
      ),
    ).toBe(true)
  })
})
