import { render, screen } from "@testing-library/react"
import { TableIcon } from "lucide-react"
import { describe, expect, it } from "vitest"

import { ContextChip } from "./context-chip"

describe("ContextChip", () => {
  it("is a bordered 40px chip whose text carries the meaning", () => {
    render(
      <ContextChip icon={<TableIcon />}>Read from Google Sheets</ContextChip>,
    )

    const chip = screen.getByText("Read from Google Sheets").closest("p")
    expect(chip).toHaveClass("min-h-10", "border")
    expect(chip).toHaveTextContent("Read from Google Sheets")
  })

  it("holds its icon in a link-blue square, hidden from assistive technology", () => {
    const { container } = render(
      <ContextChip icon={<TableIcon />}>Read from Google Sheets</ContextChip>,
    )

    const square = container.querySelector("svg")?.parentElement
    expect(square).toHaveAttribute("aria-hidden", "true")
    expect(square).toHaveClass("bg-link", "size-8")
  })
})
