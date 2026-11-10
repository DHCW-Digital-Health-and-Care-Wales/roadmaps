import { describe, expect, it } from "vitest"

import { foldText } from "./text"

describe("foldText", () => {
  it("lower-cases and removes accents", () => {
    expect(foldText("Single Récord ŴY")).toBe("single record wy")
  })
})
