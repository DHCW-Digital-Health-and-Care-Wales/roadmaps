import { describe, expect, it } from "vitest"

import { nextChangedRoadmap } from "./next-changed-roadmap"

describe("nextChangedRoadmap", () => {
  const changed = ["a", "b", "c"]

  it("leads to the first from a page that is no roadmap with changes", () => {
    expect(nextChangedRoadmap(changed, undefined)).toBe("a")
    expect(nextChangedRoadmap(changed, "elsewhere")).toBe("a")
  })

  it("leads to the next after the roadmap open, then round to the first", () => {
    expect(nextChangedRoadmap(changed, "a")).toBe("b")
    expect(nextChangedRoadmap(changed, "c")).toBe("a")
  })

  it("leads to the only one from any page but its own", () => {
    expect(nextChangedRoadmap(["a"], undefined)).toBe("a")
    expect(nextChangedRoadmap(["a"], "b")).toBe("a")
    expect(nextChangedRoadmap(["a"], "a")).toBeUndefined()
  })

  it("leads nowhere without a roadmap with changes", () => {
    expect(nextChangedRoadmap([], "a")).toBeUndefined()
  })
})
