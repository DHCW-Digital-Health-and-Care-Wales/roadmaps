import { describe, expect, it } from "vitest"

import { foldText, nameKey } from "./text"

describe("foldText", () => {
  it("lower-cases and removes accents", () => {
    expect(foldText("Single Récord ŴY")).toBe("single record wy")
  })
})

describe("nameKey", () => {
  it("matches names ignoring case, accents, spaces and punctuation", () => {
    expect(nameKey("single-record")).toBe(nameKey(" Single Récord "))
  })

  it("keeps letters of any script, and matches a name of only punctuation as written", () => {
    expect(nameKey("Ωμέγα")).toBe("ωμεγα")
    expect(nameKey(" & ")).toBe("&")
  })
})
