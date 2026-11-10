import { describe, expect, it } from "vitest"

import { createI18n } from "./create-i18n"
import { formatDuration } from "./format-duration"

describe("formatDuration", () => {
  it("writes minutes and seconds out in English", () => {
    const { t } = createI18n({ language: "en" })
    expect(formatDuration(109, t)).toBe("1 minute and 49 seconds")
    expect(formatDuration(121, t)).toBe("2 minutes and 1 second")
  })

  it("leaves out a part that is zero", () => {
    const { t } = createI18n({ language: "en" })
    expect(formatDuration(120, t)).toBe("2 minutes")
    expect(formatDuration(60, t)).toBe("1 minute")
    expect(formatDuration(30, t)).toBe("30 seconds")
    expect(formatDuration(1, t)).toBe("1 second")
  })

  it("writes minutes and seconds out in Welsh, mutating after two", () => {
    const { t } = createI18n({ language: "cy" })
    // A comma, not "a"/"ac", which would depend on how the number is read aloud.
    expect(formatDuration(109, t)).toBe("1 munud, 49 eiliad")
    expect(formatDuration(68, t)).toBe("1 munud, 8 eiliad")
    expect(formatDuration(120, t)).toBe("2 funud")
    expect(formatDuration(30, t)).toBe("30 eiliad")
  })
})
