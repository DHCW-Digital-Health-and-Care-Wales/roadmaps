import { describe, expect, it } from "vitest"

import { firstMounted } from "./first-mounted"

describe("firstMounted", () => {
  it("reads the first ref that holds an element, each time it is read", () => {
    const field = { current: null as HTMLElement | null }
    const button = { current: null as HTMLElement | null }
    const ref = firstMounted(field, button)
    expect(ref.current).toBeNull()

    button.current = document.createElement("button")
    expect(ref.current).toBe(button.current)

    field.current = document.createElement("input")
    expect(ref.current).toBe(field.current)
  })
})
