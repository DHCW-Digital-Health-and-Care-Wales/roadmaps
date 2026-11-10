import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { InsetText } from "./inset-text"

describe("InsetText", () => {
  it("is a block of text with a thick left border", () => {
    render(<InsetText>Roadmaps come from one spreadsheet.</InsetText>)

    const block = screen.getByText("Roadmaps come from one spreadsheet.")
    expect(block).toHaveClass("border-l-8", "border-input")
  })
})
