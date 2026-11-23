import { describe, expect, it } from "vitest"

import { type ContentLanguage, localise, resolve } from "./localised-text"

describe("resolve", () => {
  it.each<[string, ContentLanguage, string, ContentLanguage]>([
    ["English", "en", "Product A", "en"],
    ["Welsh", "cy", "Cynnyrch A", "cy"],
  ])("returns the %s, in its language", (_, language, text, written) => {
    expect(resolve({ en: "Product A", cy: "Cynnyrch A" }, language)).toEqual({
      text,
      language: written,
    })
  })

  it("falls back to the English, said to be English, when there is no Welsh", () => {
    expect(resolve({ en: "Product A", cy: "" }, "cy")).toEqual({
      text: "Product A",
      language: "en",
    })
  })
})

describe("localise", () => {
  it("is the resolved text alone", () => {
    expect(localise({ en: "Product A", cy: "" }, "cy")).toBe("Product A")
  })
})
