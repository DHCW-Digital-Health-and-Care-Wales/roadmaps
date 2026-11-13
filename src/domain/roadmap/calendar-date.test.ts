import { describe, expect, it } from "vitest"

import { isCalendarDate } from "./calendar-date"

describe("isCalendarDate", () => {
  it.each(["2026-11-13", "2028-02-29", "0999-01-01"])("accepts %s", (value) => {
    expect(isCalendarDate(value)).toBe(true)
  })

  it.each([
    "",
    "2026-02-29",
    "2026-13-01",
    "2026-1-05",
    "13/11/2026",
    " 2026-11-13",
  ])("refuses %j", (value) => {
    expect(isCalendarDate(value)).toBe(false)
  })
})
