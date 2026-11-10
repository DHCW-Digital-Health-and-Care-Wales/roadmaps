import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Badge } from "./badge"

describe("Badge (DHCW's tag)", () => {
  it.each(["neutral", "info", "success", "warning", "danger"] as const)(
    "the %s tag is a square, bordered tag in its status ink",
    (variant) => {
      render(<Badge variant={variant}>Label</Badge>)

      const tag = screen.getByText("Label")
      expect(tag).toHaveClass(
        `border-status-${variant}-border`,
        `bg-status-${variant}-bg`,
        `text-status-${variant}-fg`,
        "border",
        "font-bold",
      )
      expect(tag.className).not.toMatch(/rounded/)
    },
  )

  it("has an outline variant, neutral by default", () => {
    render(
      <>
        <Badge variant="outline">Outline</Badge>
        <Badge>Default</Badge>
      </>,
    )

    expect(screen.getByText("Outline")).toHaveClass("border-foreground")
    expect(screen.getByText("Default")).toHaveClass("bg-status-neutral-bg")
  })

  it("never looks clickable: no hover, focus or cursor styles", () => {
    render(<Badge variant="info">Label</Badge>)

    expect(screen.getByText("Label").className).not.toMatch(
      /hover:|focus|cursor-pointer/,
    )
  })
})
