import { describe, expect, it } from "vitest"

import { formatCalendarDate } from "./format-calendar-date"
import { createI18n } from "./create-i18n"

describe("formatCalendarDate", () => {
  it("writes the date out in English, day first", () => {
    const { t } = createI18n({ language: "en" })
    expect(formatCalendarDate("2026-10-01", t)).toBe("1 October 2026")
    expect(formatCalendarDate("2026-09-15", t)).toBe("15 September 2026")
    expect(formatCalendarDate("2026-12-31", t)).toBe("31 December 2026")
  })

  it("writes the date out in Welsh, whatever locale data the browser has", () => {
    const { t } = createI18n({ language: "cy" })
    expect(formatCalendarDate("2026-01-05", t)).toBe("5 Ionawr 2026")
    expect(formatCalendarDate("2026-10-01", t)).toBe("1 Hydref 2026")
    expect(formatCalendarDate("2026-09-15", t)).toBe("15 Medi 2026")
  })

  it("has a name for every month in both languages", () => {
    const names = (language: "en" | "cy") => {
      const { t } = createI18n({ language })
      return Array.from({ length: 12 }, (_, index) =>
        formatCalendarDate(`2026-${String(index + 1).padStart(2, "0")}-01`, t),
      )
    }
    for (const language of ["en", "cy"] as const) {
      expect(new Set(names(language)).size).toBe(12)
    }
  })

  it("gives nothing for what isn't a date", () => {
    const { t } = createI18n({ language: "en" })
    expect(formatCalendarDate("", t)).toBeUndefined()
    expect(formatCalendarDate("2026-13-01", t)).toBeUndefined()
    expect(formatCalendarDate("1 October", t)).toBeUndefined()
  })
})
