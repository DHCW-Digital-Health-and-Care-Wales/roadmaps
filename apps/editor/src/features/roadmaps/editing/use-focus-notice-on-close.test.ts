import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useFocusNoticeOnClose } from "./use-focus-notice-on-close"

function makeNotice() {
  const element = document.createElement("div")
  element.tabIndex = -1
  const focus = vi.spyOn(element, "focus")
  return { element, focus }
}

function renderOutcome(notice: () => HTMLElement | null) {
  const opener = document.createElement("button")
  const { result, rerender } = renderHook(
    ({ open }: { open: boolean }) => useFocusNoticeOnClose(open, notice),
    { initialProps: { open: true } },
  )
  return {
    opener,
    outcome: () => result.current,
    setOpen: (open: boolean) => {
      rerender({ open })
    },
  }
}

describe("useFocusNoticeOnClose", () => {
  it("focuses the notice on close even when the opening animation completes after confirming (DEF-038)", () => {
    const notice = makeNotice()
    const { opener, outcome, setOpen } = renderOutcome(() => notice.element)

    outcome().confirmed()
    // The opening animation finishes while the confirmed write is in flight.
    outcome().onOpenChangeComplete(true)
    setOpen(false)

    expect(outcome().finalFocus(opener)).toBe(false)

    outcome().onOpenChangeComplete(false)

    expect(notice.focus).toHaveBeenCalledOnce()
  })

  it("returns focus to otherwise (or true) and skips the notice when closed unconfirmed", () => {
    const notice = makeNotice()
    const { opener, outcome, setOpen } = renderOutcome(() => notice.element)

    setOpen(false)

    expect(outcome().finalFocus(opener)).toBe(opener)
    expect(outcome().finalFocus()).toBe(true)

    outcome().onOpenChangeComplete(false)

    expect(notice.focus).not.toHaveBeenCalled()
  })

  it("starts unconfirmed again on the next opening after a confirmed close", () => {
    const notice = makeNotice()
    const { opener, outcome, setOpen } = renderOutcome(() => notice.element)

    outcome().confirmed()
    setOpen(false)
    outcome().onOpenChangeComplete(false)
    expect(notice.focus).toHaveBeenCalledOnce()

    // Reopen and cancel without confirming.
    setOpen(true)
    setOpen(false)

    expect(outcome().finalFocus(opener)).toBe(opener)

    outcome().onOpenChangeComplete(false)

    expect(notice.focus).toHaveBeenCalledOnce()
  })

  it("falls back to otherwise when confirmed but no notice is mounted on close", () => {
    const { opener, outcome, setOpen } = renderOutcome(() => null)

    outcome().confirmed()
    setOpen(false)

    expect(outcome().finalFocus(opener)).toBe(opener)
    expect(outcome().finalFocus()).toBe(true)

    expect(() => {
      outcome().onOpenChangeComplete(false)
    }).not.toThrow()
  })
})
