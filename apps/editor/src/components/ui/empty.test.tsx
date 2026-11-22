import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Empty } from "./empty"

describe("Empty", () => {
  it("has square corners, like the cards and panels beside it (DEF-007 D1)", () => {
    const { container } = render(<Empty />)

    expect(container.querySelector("[data-slot=empty]")?.className).not.toMatch(
      /rounded-(?!none)/,
    )
  })
})
