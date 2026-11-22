import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ITEMS_VIEW_STORAGE_KEY,
  readItemsView,
  storeItemsView,
  useItemsView,
} from "./use-items-view"

describe("the items' view, kept on the device (STY-067 S11)", () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("is Cards until Compact is chosen, and remembers the choice", () => {
    expect(readItemsView()).toBe("cards")

    storeItemsView("compact")
    expect(readItemsView()).toBe("compact")

    storeItemsView("cards")
    expect(readItemsView()).toBe("cards")
    expect(localStorage.getItem(ITEMS_VIEW_STORAGE_KEY)).toBeNull()
  })

  it("ignores an unknown stored value", () => {
    localStorage.setItem(ITEMS_VIEW_STORAGE_KEY, "board")
    expect(readItemsView()).toBe("cards")
  })

  it("shows Cards, and still switches for the visit, when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })

    const { result } = renderHook(() => useItemsView())
    expect(result.current[0]).toBe("cards")
    act(() => {
      result.current[1]("compact")
    })
    expect(result.current[0]).toBe("compact")
  })

  it("is read again by the next page that opens", () => {
    const first = renderHook(() => useItemsView())
    act(() => {
      first.result.current[1]("compact")
    })
    first.unmount()

    expect(renderHook(() => useItemsView()).result.current[0]).toBe("compact")
  })
})
