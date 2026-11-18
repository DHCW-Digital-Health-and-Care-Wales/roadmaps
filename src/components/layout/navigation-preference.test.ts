import { afterEach, describe, expect, it, vi } from "vitest"

import {
  clampNavigationWidth,
  NAVIGATION_STORAGE_KEY,
  NAVIGATION_WIDTH_STORAGE_KEY,
  readNavigationFolded,
  readNavigationWidth,
  storeNavigationFolded,
  storeNavigationWidth,
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

describe("the navigation's width (STY-064 S2, S5)", () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("keeps a width within 208px and 400px, in whole px", () => {
    expect(clampNavigationWidth(100)).toBe(208)
    expect(clampNavigationWidth(500)).toBe(400)
    expect(clampNavigationWidth(300.6)).toBe(301)
  })

  it("is 256px until dragged, and remembers a width", () => {
    expect(readNavigationWidth()).toBe(256)

    storeNavigationWidth(320)
    expect(readNavigationWidth()).toBe(320)

    storeNavigationWidth(256)
    expect(localStorage.getItem(NAVIGATION_WIDTH_STORAGE_KEY)).toBeNull()
  })

  it.each([
    ["sideways", 256],
    ["", 256],
    ["NaN", 256],
    ["Infinity", 256],
    ["150", 208],
    ["9000", 400],
  ])("reads %j as %i", (stored, width) => {
    localStorage.setItem(NAVIGATION_WIDTH_STORAGE_KEY, stored)
    expect(readNavigationWidth()).toBe(width)
  })

  it("is 256px, and carries on, when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })

    expect(readNavigationWidth()).toBe(256)
    expect(() => {
      storeNavigationWidth(320)
    }).not.toThrow()
  })
})
