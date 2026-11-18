import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { stubPointerCapture } from "@/test/pointer-capture"
import { renderWithI18n } from "@/test/render-with-i18n"

import { NavigationResizeHandle } from "./navigation-resize-handle"

// The edge of the open navigation (STY-064): a window splitter. Its place in the shell,
// the bars that follow it and what is remembered are held in `app-shell-navigation.test.tsx`.

const ended = vi.fn<(width: number) => void>()

function Harness({ start = 256 }: { start?: number }) {
  const [width, setWidth] = useState(start)
  return (
    <>
      <NavigationResizeHandle
        width={width}
        onResize={setWidth}
        onResizeEnd={ended}
      />
      <output>{width}</output>
    </>
  )
}

const edge = () =>
  screen.getByRole("separator", { name: "Resize the navigation" })

beforeEach(() => {
  ended.mockClear()
  stubPointerCapture()
})

describe("the edge", () => {
  it("is a vertical separator saying its width and its limits (S4)", () => {
    renderWithI18n(<Harness />)

    expect(edge()).toHaveAttribute("tabindex", "0")
    expect(edge()).toHaveAttribute("aria-orientation", "vertical")
    expect(edge()).toHaveAttribute("aria-valuemin", "208")
    expect(edge()).toHaveAttribute("aria-valuemax", "400")
    expect(edge()).toHaveAttribute("aria-valuenow", "256")
    expect(edge()).toHaveAttribute("aria-valuetext", "256 pixels wide")
  })

  it("moves 16px by the arrows, to its limits by Home and End, and keeps focus (S4)", async () => {
    const user = userEvent.setup()
    renderWithI18n(<Harness />)
    await user.tab()
    expect(edge()).toHaveFocus()

    await user.keyboard("{ArrowRight}")
    expect(edge()).toHaveAttribute("aria-valuenow", "272")
    await user.keyboard("{ArrowLeft}{ArrowLeft}")
    expect(edge()).toHaveAttribute("aria-valuenow", "240")
    await user.keyboard("{End}")
    expect(edge()).toHaveAttribute("aria-valuenow", "400")
    await user.keyboard("{ArrowRight}")
    expect(edge()).toHaveAttribute("aria-valuenow", "400")
    await user.keyboard("{Home}")
    expect(edge()).toHaveAttribute("aria-valuenow", "208")
    await user.keyboard("{ArrowLeft}")
    expect(edge()).toHaveAttribute("aria-valuenow", "208")

    expect(edge()).toHaveFocus()
    expect(ended).toHaveBeenLastCalledWith(208)
    expect(ended).toHaveBeenCalledTimes(7)
  })

  it("widens with the pointer, stops at its limits, and settles when let go (S1, S2)", async () => {
    const user = userEvent.setup()
    renderWithI18n(<Harness />)

    await user.pointer([
      { keys: "[MouseLeft>]", target: edge(), coords: { clientX: 256 } },
      { coords: { clientX: 300 } },
    ])
    expect(edge()).toHaveAttribute("aria-valuenow", "300")
    expect(ended).not.toHaveBeenCalled()

    await user.pointer({ coords: { clientX: 900 } })
    expect(edge()).toHaveAttribute("aria-valuenow", "400")
    await user.pointer({ coords: { clientX: 0 } })
    expect(edge()).toHaveAttribute("aria-valuenow", "208")
    await user.pointer({ keys: "[/MouseLeft]" })

    expect(ended).toHaveBeenCalledOnce()
    expect(ended).toHaveBeenCalledWith(208)

    // Let go, it no longer follows the pointer.
    await user.pointer({ coords: { clientX: 350 } })
    expect(edge()).toHaveAttribute("aria-valuenow", "208")
  })

  it("settles when the pointer is cancelled, not only when it is let go (S8)", async () => {
    const user = userEvent.setup()
    renderWithI18n(<Harness />)

    await user.pointer([
      { keys: "[MouseLeft>]", target: edge(), coords: { clientX: 256 } },
      { coords: { clientX: 280 } },
    ])
    edge().dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }))

    expect(ended).toHaveBeenCalledExactlyOnceWith(280)
  })

  it("settles a drag cut short when the edge goes, so the width it reached is kept (S5)", async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithI18n(<Harness />)

    await user.pointer([
      { keys: "[MouseLeft>]", target: edge(), coords: { clientX: 256 } },
      { coords: { clientX: 320 } },
    ])
    expect(ended).not.toHaveBeenCalled()
    unmount()

    expect(ended).toHaveBeenCalledExactlyOnceWith(320)
  })

  it("settles nothing when it goes with no drag under way", () => {
    const { unmount } = renderWithI18n(<Harness />)

    unmount()

    expect(ended).not.toHaveBeenCalled()
  })

  it("goes back to 256px on a double-click (S3)", async () => {
    const user = userEvent.setup()
    renderWithI18n(<Harness start={400} />)

    await user.dblClick(edge())

    expect(edge()).toHaveAttribute("aria-valuenow", "256")
    expect(ended).toHaveBeenLastCalledWith(256)
  })
})
