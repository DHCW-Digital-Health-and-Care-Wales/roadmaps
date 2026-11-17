import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useMenuChoice } from "./use-menu-choice"

function renderChoice() {
  const run = vi.fn<(choice: string) => void>()
  const { result } = renderHook(() => useMenuChoice(run))
  return { run, menu: () => result.current }
}

describe("useMenuChoice", () => {
  it("runs the item chosen once the menu has closed, and only then", () => {
    const { run, menu } = renderChoice()

    act(() => {
      menu().choose("refresh")
    })
    expect(run).not.toHaveBeenCalled()
    act(() => {
      menu().onOpenChangeComplete(false)
    })

    expect(run).toHaveBeenCalledExactlyOnceWith("refresh")
  })

  it("runs it once, not again as the menu next closes", () => {
    const { run, menu } = renderChoice()
    act(() => {
      menu().choose("refresh")
    })
    act(() => {
      menu().onOpenChangeComplete(false)
    })

    act(() => {
      menu().onOpenChangeComplete(true)
    })
    act(() => {
      menu().onOpenChangeComplete(false)
    })

    expect(run).toHaveBeenCalledOnce()
  })

  it("runs nothing when the menu closes with nothing chosen, or as it opens", () => {
    const { run, menu } = renderChoice()

    act(() => {
      menu().onOpenChangeComplete(false)
    })
    act(() => {
      menu().choose("refresh")
    })
    act(() => {
      menu().onOpenChangeComplete(true)
    })

    expect(run).not.toHaveBeenCalled()
  })
})
