import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useFocusNoticeOnClose } from "./use-focus-notice-on-close"

function makeNotice() {
  const element = document.createElement("div")
  element.tabIndex = -1
  const focus = vi.spyOn(element, "focus")
  return { element, focus }
}

describe("useFocusNoticeOnClose", () => {
  it("focuses the notice on close even when the opening animation completes after confirming (DEF-038)", () => {
    const notice = makeNotice()
    const opener = document.createElement("button")
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) =>
        useFocusNoticeOnClose(open, () => notice.element),
      { initialProps: { open: true } },
    )

    act(() => {
      result.current.confirmed()
      // The opening animation finishes while the confirmed write is in flight.
      result.current.onOpenChangeComplete(true)
    })

    rerender({ open: false })

    expect(result.current.finalFocus(opener)).toBe(false)

    act(() => {
      result.current.onOpenChangeComplete(false)
    })

    expect(notice.focus).toHaveBeenCalledOnce()
  })

  it("returns focus to otherwise (or true) and skips the notice when closed unconfirmed", () => {
    const notice = makeNotice()
    const opener = document.createElement("button")
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) =>
        useFocusNoticeOnClose(open, () => notice.element),
      { initialProps: { open: true } },
    )

    rerender({ open: false })

    expect(result.current.finalFocus(opener)).toBe(opener)
    expect(result.current.finalFocus()).toBe(true)

    act(() => {
      result.current.onOpenChangeComplete(false)
    })

    expect(notice.focus).not.toHaveBeenCalled()
  })

  it("starts unconfirmed again on the next opening after a confirmed close", () => {
    const notice = makeNotice()
    const opener = document.createElement("button")
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) =>
        useFocusNoticeOnClose(open, () => notice.element),
      { initialProps: { open: true } },
    )

    act(() => {
      result.current.confirmed()
    })
    rerender({ open: false })
    act(() => {
      result.current.onOpenChangeComplete(false)
    })
    expect(notice.focus).toHaveBeenCalledOnce()

    // Reopen and cancel without confirming.
    rerender({ open: true })
    rerender({ open: false })

    expect(result.current.finalFocus(opener)).toBe(opener)

    act(() => {
      result.current.onOpenChangeComplete(false)
    })

    expect(notice.focus).toHaveBeenCalledOnce()
  })

  it("falls back to otherwise when confirmed but no notice is mounted on close", () => {
    const opener = document.createElement("button")
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useFocusNoticeOnClose(open, () => null),
      { initialProps: { open: true } },
    )

    act(() => {
      result.current.confirmed()
    })
    rerender({ open: false })

    expect(result.current.finalFocus(opener)).toBe(opener)
    expect(result.current.finalFocus()).toBe(true)

    expect(() => {
      act(() => {
        result.current.onOpenChangeComplete(false)
      })
    }).not.toThrow()
  })
})
