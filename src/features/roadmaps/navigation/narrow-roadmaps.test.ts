import { describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"

import { groupRoadmaps } from "../group-roadmaps"
import { findIn, narrowGroups, searchKey } from "./narrow-roadmaps"

const single = { en: "Single Record", cy: "Cofnod Sengl" }
const citizen = { en: "Citizen Services", cy: "Gwasanaethau Dinasyddion" }
const GROUPS = groupRoadmaps(
  [
    createTestRoadmap("ffon", "Ffôn Iechyd helpline", { family: citizen }),
    createTestRoadmap("online", "Prescriptions online", { family: citizen }),
    createTestRoadmap("viewer", "Care record viewer", { family: single }),
    createTestRoadmap("plans", "Shared care plans", {
      family: single,
      title: { en: "Shared care plans", cy: "Cynlluniau gofal a rennir" },
    }),
    createTestRoadmap("carers", "Carers' register"),
  ],
  "en",
)

/** The ids each narrowed group keeps, by group key. */
function found(key: string, language: "en" | "cy" = "en") {
  return narrowGroups(GROUPS, searchKey(key), language).map((group) => [
    group.key,
    group.roadmaps.map((roadmap) => roadmap.id),
  ])
}

describe("searchKey", () => {
  it("folds case and accents, and runs spaces together", () => {
    expect(searchKey("  FFÔN   Iechyd ")).toBe("ffon iechyd")
  })

  it("is blank for blank text", () => {
    expect(searchKey(" \t ")).toBe("")
  })
})

describe("findIn", () => {
  it("finds the part of the text the search holds, as the text spells it", () => {
    const text = "Ffôn Iechyd helpline"
    const part = findIn(text, searchKey("FFON"))
    expect(part && text.slice(part.start, part.end)).toBe("Ffôn")
  })

  it("keeps a decomposed accent with its letter", () => {
    const text = "Caffé roadmap"
    const part = findIn(text, searchKey("caffe"))
    expect(part && text.slice(part.start, part.end)).toBe("Caffé")
  })

  it("finds the part after a character written in two code units, such as an emoji", () => {
    const text = "🩺 Care record viewer"
    const part = findIn(text, searchKey("care"))
    expect(part && text.slice(part.start, part.end)).toBe("Care")
  })

  it("finds nothing for a blank search or a missing one", () => {
    expect(findIn("Care record viewer", "")).toBeNull()
    expect(findIn("Care record viewer", "xyz")).toBeNull()
  })
})

describe("narrowGroups", () => {
  it("keeps every group for a blank search", () => {
    expect(narrowGroups(GROUPS, "", "en")).toBe(GROUPS)
  })

  it("keeps only the roadmaps found, in their groups' order, leaving out a group with none (S1, S2)", () => {
    expect(found("CARE")).toEqual([
      ["singlerecord", ["viewer", "plans"]],
      ["", ["carers"]],
    ])
  })

  it("finds every roadmap of a family by its name (S3, D2)", () => {
    expect(found("single")).toEqual([["singlerecord", ["viewer", "plans"]]])
  })

  it("never finds the roadmaps with no family by that group's name", () => {
    expect(found("family")).toEqual([])
  })

  it("compares titles and families in the interface's language", () => {
    expect(found("gofal", "cy")).toEqual([["singlerecord", ["plans"]]])
    expect(found("sengl", "cy")).toEqual([
      ["singlerecord", ["viewer", "plans"]],
    ])
  })

  it("finds nothing for text no roadmap holds (S4)", () => {
    expect(found("xyz")).toEqual([])
  })
})
