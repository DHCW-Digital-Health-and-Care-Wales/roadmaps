import { describe, expect, it } from "vitest"

import { canMatchLists, planListMatch } from "./list-match"
import { createTestRoadmap } from "./testing/test-roadmap"

const loaded = createTestRoadmap("producta", "Product A", {
  family: { en: "Single Record", cy: "" },
  familyId: "fc29g5b9",
  colour: "#12a3c9",
  category: { en: "GP & Community Services", cy: "" },
  categoryId: "khzpchkh",
  outOfStep: true,
})

describe("canMatchLists", () => {
  it("is true for a roadmap out of step with a family it is linked to (S1)", () => {
    expect(canMatchLists(loaded)).toBe(true)
  })

  it("is false for a roadmap in step", () => {
    expect(canMatchLists({ ...loaded, outOfStep: false })).toBe(false)
  })

  it("is false for a roadmap whose family is not listed (S3)", () => {
    const unlisted = { ...loaded, familyId: null, familyNotListed: true }

    expect(canMatchLists(unlisted)).toBe(false)
  })
})

describe("planListMatch", () => {
  it("writes when the roadmap is as it was loaded and still out of step (S1)", () => {
    expect(planListMatch(loaded, structuredClone(loaded))).toEqual({
      kind: "write",
    })
  })

  it("is settled as not found when the roadmap is no longer listed", () => {
    expect(planListMatch(loaded, undefined)).toEqual({
      kind: "settled",
      outcome: { status: "roadmap-not-found" },
    })
  })

  it.each([
    ["its family was recoloured", { colour: "#ff0000" }],
    ["its family was renamed", { family: { en: "Shared Care", cy: "" } }],
    ["its family was changed", { familyId: "vdkxj63m" }],
    ["its category was renamed", { category: { en: "Other", cy: "" } }],
    ["its category was changed", { categoryId: "w7vrv5kn" }],
  ])("writes nothing when %s since it loaded (S4)", (_, change) => {
    const current = { ...loaded, ...change }

    expect(planListMatch(loaded, current)).toEqual({
      kind: "settled",
      outcome: { status: "changed", roadmap: current },
    })
  })

  it("writes nothing when the roadmap is already in step (S4)", () => {
    const current = { ...loaded, outOfStep: false }

    expect(planListMatch(loaded, current)).toEqual({
      kind: "settled",
      outcome: { status: "changed", roadmap: current },
    })
  })

  it("writes nothing when its family is no longer listed (S3, S4)", () => {
    const current = {
      ...loaded,
      familyId: null,
      familyNotListed: true,
    }

    expect(planListMatch(loaded, current)).toEqual({
      kind: "settled",
      outcome: { status: "changed", roadmap: current },
    })
  })
})
