import { describe, expect, it } from "vitest"

import {
  itemValue,
  markedUpdated,
  type RoadmapChanges,
  tagsOf,
  tagsValue,
} from "./roadmap-changes"
import { createTestRoadmapItem } from "./testing/test-roadmap-item"

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

describe("an item's tags as one field value (STY-037)", () => {
  it("is its English tags in order, separated by a comma and a space, or nothing (S12)", () => {
    const item = createTestRoadmapItem("Online booking", {
      tags: [
        { en: "Patients", cy: "" },
        { en: "Video appointments", cy: "" },
      ],
    })

    expect(itemValue(item, "tags")).toBe("Patients, Video appointments")
    expect(itemValue(createTestRoadmapItem("Bare"), "tags")).toBe("")
  })

  it("reads back as the tags it was made from, in order", () => {
    expect(tagsOf(tagsValue(["Patients", "Carers"]))).toEqual([
      "Patients",
      "Carers",
    ])
    expect(tagsOf("")).toEqual([])
  })

  it("holds each tag trimmed, none blank or repeated exactly, as a read gives them (S7)", () => {
    expect(tagsOf(" Carers ,, Clinic staff\nCarers, carers ")).toEqual([
      "Carers",
      "Clinic staff",
      "carers",
    ])
    expect(tagsValue([" Carers ", "", "Carers"])).toBe("Carers")
  })
})
