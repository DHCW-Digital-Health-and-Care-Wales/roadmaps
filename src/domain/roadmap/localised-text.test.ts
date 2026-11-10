import { describe, expect, it } from "vitest"

import { localise } from "./localised-text"

describe("localise", () => {
  it("returns the English for English", () => {
    expect(localise({ en: "Product A", cy: "Cynnyrch A" }, "en")).toBe(
      "Product A",
    )
  })

  it("returns the Welsh for Welsh", () => {
    expect(localise({ en: "Product A", cy: "Cynnyrch A" }, "cy")).toBe(
      "Cynnyrch A",
    )
  })

  it("falls back to the English when there is no Welsh", () => {
    expect(localise({ en: "Product A", cy: "" }, "cy")).toBe("Product A")
  })
})
