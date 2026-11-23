import { describe, expect, it } from "vitest"
import { resolve } from "./localised"

describe("resolve", () => {
  it("reports when it falls back to English", () => {
    expect(resolve({ en: "Hello", cy: "" }, "cy")).toEqual({
      text: "Hello",
      lang: "en",
    })
    expect(resolve({ en: "Hello", cy: "  " }, "cy").lang).toBe("en")
    expect(resolve({ en: "Hello", cy: "Helo" }, "cy")).toEqual({
      text: "Helo",
      lang: "cy",
    })
  })
})
