import { afterEach, describe, expect, it, vi } from "vitest"

import {
  NAVIGATION_STORAGE_KEY,
  readNavigationFolded,
  storeNavigationFolded,
} from "./navigation-preference"

describe("the navigation's fold (STY-054 D5)", () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("is open until folded, and remembers a fold", () => {
    expect(readNavigationFolded()).toBe(false)

    storeNavigationFolded(true)
    expect(readNavigationFolded()).toBe(true)

    storeNavigationFolded(false)
    expect(readNavigationFolded()).toBe(false)
    expect(localStorage.getItem(NAVIGATION_STORAGE_KEY)).toBeNull()
  })

  it("ignores an unknown stored value", () => {
    localStorage.setItem(NAVIGATION_STORAGE_KEY, "sideways")
    expect(readNavigationFolded()).toBe(false)
  })

  it("stays open, and carries on, when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })

    expect(readNavigationFolded()).toBe(false)
    expect(() => {
      storeNavigationFolded(true)
    }).not.toThrow()
  })
})
