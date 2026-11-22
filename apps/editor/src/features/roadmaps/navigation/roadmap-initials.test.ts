import { describe, expect, it } from "vitest"

import { roadmapInitials } from "./roadmap-initials"

describe("roadmapInitials", () => {
  it.each([
    ["Community Nursing roadmap", "CN"],
    ["Product A roadmap", "PA"],
    ["home equipment loans", "HE"],
    ["Pharmacy", "P"],
    ["  Bed   Management ", "BM"],
    ["Trywydd Cynnyrch B", "TC"],
    ["Ôl-ofal cymunedol", "ÔC"],
  ])("gives %j the initials %j", (title, initials) => {
    expect(roadmapInitials(title)).toBe(initials)
  })

  it("skips words with no letter or number, such as a dash", () => {
    expect(roadmapInitials("(Beta) – 111 Wales")).toBe("B1")
  })

  it("keeps a letter of two UTF-16 units whole", () => {
    expect(roadmapInitials("𝒜lpha Beta")).toBe("𝒜B")
  })

  it("is empty for a title with no letter or number", () => {
    expect(roadmapInitials("– …")).toBe("")
  })
})
