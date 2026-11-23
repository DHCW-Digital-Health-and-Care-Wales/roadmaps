import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useMeasure } from "./use-measure"

/** jsdom watches no sizes and loads no fonts: stand-ins the test drives. */
function stubLayout() {
  const resized: (() => void)[] = []
  const disconnect = vi.fn()
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resized.push(callback)
      }
      observe() {
        // The test reports sizes itself, through `resize`.
      }
      disconnect = disconnect
    },
  )
  let fontsReady = () => {
    // Replaced as the promise is made.
  }
  const ready = new Promise<void>((resolve) => {
    fontsReady = resolve
  })
  Object.defineProperty(document, "fonts", {
    value: { ready },
    configurable: true,
  })
  return {
    resize: () => {
      for (const callback of resized) callback()
    },
    fontsReady: async () => {
      fontsReady()
      await ready
    },
    disconnect,
  }
}

/** The hook over one element whose measurement the test sets, read through `measure`. */
function renderMeasure() {
  const element = document.createElement("div")
  const elementRef = { current: element }
  let width = 1
  const measure = vi.fn(() => width)
  const view = renderHook(
    ({ content }) => useMeasure(elementRef, content, measure, 0),
    { initialProps: { content: "a" } },
  )
  return {
    view,
    measure,
    setWidth: (next: number) => {
      width = next
    },
  }
}

describe("useMeasure", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(document, "fonts")
  })

  it("measures as it is first drawn, once where the browser cannot watch sizes", () => {
    const { view, measure } = renderMeasure()

    expect(view.result.current).toBe(1)
    expect(measure).toHaveBeenCalledOnce()
  })

  const triggers: {
    when: string
    change: (changes: Changes) => void | Promise<void>
  }[] = [
    {
      when: "the content changes",
      change: ({ view }) => {
        view.rerender({ content: "b" })
      },
    },
    {
      when: "the element's size changes",
      change: ({ layout }) => {
        layout.resize()
      },
    },
    {
      when: "the fonts are ready",
      change: ({ layout }) => layout.fontsReady(),
    },
  ]

  it.each(triggers)("measures again when $when", async ({ change }) => {
    const layout = stubLayout()
    const { view, setWidth } = renderMeasure()
    setWidth(2)

    await act(async () => {
      await change({ view, layout })
    })

    expect(view.result.current).toBe(2)
  })

  it("stops watching once gone, a late font measuring nothing", async () => {
    const layout = stubLayout()
    const { view, measure } = renderMeasure()

    view.unmount()
    await act(async () => {
      await layout.fontsReady()
    })

    expect(layout.disconnect).toHaveBeenCalledOnce()
    expect(measure).toHaveBeenCalledOnce()
  })
})

interface Changes {
  view: ReturnType<typeof renderMeasure>["view"]
  layout: ReturnType<typeof stubLayout>
}
