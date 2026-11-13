import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { localToday } from "./local-today"

describe("localToday", () => {
  beforeEach(() => {
    // Node reads TZ again when it is set, so the browser's zone is London here.
    vi.stubEnv("TZ", "Europe/London")
    vi.useFakeTimers({ toFake: ["Date"] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("is the browser's local date, not UTC's, just after local midnight (STY-036 D11)", () => {
    vi.setSystemTime(new Date("2026-07-01T23:30:00Z"))

    expect(localToday()).toBe("2026-07-02")
  })

  it("pads the month and day, as YYYY-MM-DD (D2)", () => {
    vi.setSystemTime(new Date("2026-01-05T12:00:00Z"))

    expect(localToday()).toBe("2026-01-05")
  })
})
