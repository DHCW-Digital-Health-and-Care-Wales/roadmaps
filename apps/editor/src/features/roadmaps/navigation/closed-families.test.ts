import { afterEach, describe, expect, it, vi } from "vitest"

import {
  CLOSED_FAMILIES_STORAGE_KEY,
  readClosedFamilies,
  storeClosedFamilies,
} from "./closed-families"

describe("the closed families (STY-062 S4)", () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("are none until closed, and are remembered, the no-family group's key too", () => {
    expect(readClosedFamilies().size).toBe(0)

    storeClosedFamilies(new Set(["singlerecord", ""]))
    expect(readClosedFamilies()).toEqual(new Set(["singlerecord", ""]))

    storeClosedFamilies(new Set())
    expect(readClosedFamilies().size).toBe(0)
    expect(localStorage.getItem(CLOSED_FAMILIES_STORAGE_KEY)).toBeNull()
  })

  it.each(["{", '"workforce"', '{"a":1}', "null"])(
    "ignore unreadable stored text %s",
    (stored) => {
      localStorage.setItem(CLOSED_FAMILIES_STORAGE_KEY, stored)
      expect(readClosedFamilies().size).toBe(0)
    },
  )

  it("keep only the keys that are text", () => {
    localStorage.setItem(
      CLOSED_FAMILIES_STORAGE_KEY,
      JSON.stringify(["workforce", 3, null, { key: "x" }]),
    )
    expect(readClosedFamilies()).toEqual(new Set(["workforce"]))
  })

  it("leave every family open, and carry on, when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })

    expect(readClosedFamilies().size).toBe(0)
    expect(() => {
      storeClosedFamilies(new Set(["workforce"]))
    }).not.toThrow()
  })
})
