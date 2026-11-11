import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import {
  heldWrites,
  planRoadmapPublish,
  type PublishWrites,
  type RoadmapSnapshot,
} from "./publish-plan"
import type { RoadmapItem } from "./roadmap-item"
import { createTestRoadmap } from "./testing/test-roadmap"
import { createTestRoadmapItem } from "./testing/test-roadmap-item"

const roadmap = createTestRoadmap("producta", "Product A")

function snapshotOf(
  items: RoadmapItem[],
  takenIds: string[] = [],
): RoadmapSnapshot {
  return {
    roadmap,
    items,
    repeatedIds: new Set(),
    takenIds: new Set([...takenIds, ...items.flatMap(({ id }) => id ?? [])]),
  }
}

/** IDs handed out in turn. */
function idsOf(...ids: string[]) {
  return () => ids.shift() ?? "exhausted"
}

describe("planRoadmapPublish", () => {
  it("gives new IDs only to items without one, skipping any the roadmap holds", () => {
    const items = [
      createTestRoadmapItem("Kept", { id: "keptidxx" }),
      createTestRoadmapItem("First"),
      createTestRoadmapItem("Second"),
    ]

    const plan = planRoadmapPublish(
      {
        roadmap: { vision: { base: "", value: "A vision" } },
        items: [],
      },
      snapshotOf(items, ["dropidxx"]),
      idsOf("keptidxx", "newidaaa", "dropidxx", "newidaaa", "newidbbb"),
    )

    expect(plan).toEqual({
      kind: "write",
      writes: {
        roadmap: [{ field: "vision", value: "A vision" }],
        items: [],
        ids: [
          { index: 1, id: "newidaaa" },
          { index: 2, id: "newidbbb" },
        ],
      },
    })
  })

  it("writes nothing, not even IDs, when every change is already held", () => {
    const item = createTestRoadmapItem("Item", {
      phase: { en: "Live", cy: "" },
    })

    const plan = planRoadmapPublish(
      {
        roadmap: { title: { base: "Product A", value: " Product A " } },
        items: [
          {
            item,
            position: 0,
            fields: { phase: { base: "Beta", value: "Live" } },
          },
        ],
      },
      snapshotOf([item]),
      idsOf(),
    )

    expect(plan).toEqual({ kind: "settled", outcome: { status: "published" } })
  })

  it("rejects a blank title, which the editor never sends", () => {
    let error: unknown
    try {
      planRoadmapPublish(
        { roadmap: { title: { base: "Product A", value: "  " } }, items: [] },
        snapshotOf([]),
      )
    } catch (caught) {
      error = caught
    }

    expect(isAppError(error) && error.kind).toBe("unknown")
  })
})

describe("heldWrites", () => {
  const writes: PublishWrites = {
    roadmap: [{ field: "vision", value: "A vision" }],
    items: [{ index: 0, field: "phase", value: "Live" }],
    ids: [{ index: 0, id: "newidaaa" }],
  }
  const before = createTestRoadmapItem("Item")
  const after = createTestRoadmapItem("Item", {
    id: "newidaaa",
    phase: { en: "Live", cy: "" },
  })
  const written = { ...roadmap, vision: { en: "A vision", cy: "" } }

  it("tells whether all, none or some of the writes are held", () => {
    expect(
      heldWrites(writes, { ...snapshotOf([after]), roadmap: written }),
    ).toBe("all")
    expect(heldWrites(writes, snapshotOf([before]))).toBe("none")
    expect(
      heldWrites(writes, { ...snapshotOf([before]), roadmap: written }),
    ).toBe("some")
  })

  it("can't tell when the roadmap is no longer listed", () => {
    expect(heldWrites(writes, null)).toBe("some")
  })
})
