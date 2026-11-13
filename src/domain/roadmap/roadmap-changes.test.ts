import { describe, expect, it } from "vitest"

import { markedUpdated, type RoadmapChanges } from "./roadmap-changes"

describe("markedUpdated", () => {
  const vision: RoadmapChanges = {
    roadmap: { vision: { base: "", value: "Clear" } },
    items: [],
  }

  it("sets Last updated to today over whatever it holds, beside the other changes (STY-036 S6)", () => {
    expect(markedUpdated(vision, "2026-11-13")).toEqual({
      roadmap: {
        vision: { base: "", value: "Clear" },
        lastUpdated: { base: "", value: "2026-11-13", overwrite: true },
      },
      items: [],
    })
  })

  it("leaves a pending date to be published instead (STY-036 S7)", () => {
    const dated: RoadmapChanges = {
      roadmap: { lastUpdated: { base: "", value: "2026-11-10" } },
      items: [],
    }

    expect(markedUpdated(dated, "2026-11-13")).toBe(dated)
  })
})
