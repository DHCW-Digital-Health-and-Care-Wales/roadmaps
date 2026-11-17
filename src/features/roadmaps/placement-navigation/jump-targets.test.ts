import { describe, expect, it } from "vitest"

import { addNewItem } from "@/domain/roadmap/new-item"
import {
  NO_CHANGES,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"

import { groupPageItems } from "../editing/page-items"
import { editItem } from "../editing/pending-changes"
import { reorderItem } from "../editing/pending-orders"
import { pageItemsOf } from "../testing/page-items"
import { summariseJumpTargets } from "./jump-targets"

const item = (title: string, placement: RoadmapPlacement | null = "now") =>
  createTestRoadmapItem(title, { placement, writtenHorizon: "Soon" })

function summarise(
  read: readonly RoadmapItem[],
  pending: RoadmapChanges = NO_CHANGES,
) {
  return summariseJumpTargets(
    groupPageItems(pageItemsOf(read, pending)),
    pending.orders,
  )
}

describe("summariseJumpTargets", () => {
  it("lists every placement in page order with its count, an empty one with 0 (STY-053 S5, D3)", () => {
    const read = [item("Later one", "later"), item("Now A"), item("Now B")]

    expect(summarise(read)).toEqual([
      { target: "recently-delivered", count: 0, pending: false },
      { target: "now", count: 2, pending: false },
      { target: "next", count: 0, pending: false },
      { target: "later", count: 1, pending: false },
      { target: "delivered-this-year", count: 0, pending: false },
      { target: "not-doing", count: 0, pending: false },
    ])
  })

  it("lists the unplaced items first, only while there are some (S4)", () => {
    const read = [item("Soon", null), item("Now A"), item("Blank", null)]

    expect(summarise(read)[0]).toEqual({
      target: "unplaced",
      count: 2,
      pending: false,
    })
    expect(
      summarise([item("Now A")]).map(({ target }) => target),
    ).not.toContain("unplaced")
  })

  it("marks where an edited item shows: a moved one in its pending placement, not where it was (S2)", () => {
    const read = [item("Now A"), item("Now B"), item("Next A", "next")]
    const moved = editItem(NO_CHANGES, undefined, item("Now B"), 1, {
      placement: "later",
    })

    const summaries = summarise(read, moved)

    expect(summaries.find(({ target }) => target === "now")).toEqual({
      target: "now",
      count: 1,
      pending: false,
    })
    expect(summaries.find(({ target }) => target === "later")).toEqual({
      target: "later",
      count: 1,
      pending: true,
    })
    expect(summaries.find(({ target }) => target === "next")?.pending).toBe(
      false,
    )
  })

  it("marks an unplaced item's pending edit on the unplaced items", () => {
    const read = [item("Soon", null)]
    const edited = editItem(NO_CHANGES, undefined, item("Soon", null), 0, {
      title: "Sooner",
    })

    expect(summarise(read, edited)[0]).toEqual({
      target: "unplaced",
      count: 1,
      pending: true,
    })
  })

  it("marks a new item's placement, and counts it there", () => {
    const read = [item("Now A")]
    const added = addNewItem(
      NO_CHANGES,
      { title: "Online booking", placement: "next" },
      read,
    )

    expect(
      summarise(read, added).find(({ target }) => target === "next"),
    ).toEqual({ target: "next", count: 1, pending: true })
  })

  it("marks a placement whose order is pending, though none of its items is edited", () => {
    const read = [item("Now A"), item("Now B")]
    const reordered = reorderItem(NO_CHANGES, read, 1, "top")

    expect(
      summarise(read, reordered).find(({ target }) => target === "now"),
    ).toEqual({ target: "now", count: 2, pending: true })
  })
})
