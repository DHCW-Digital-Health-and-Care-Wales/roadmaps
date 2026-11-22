import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button } from "./button"

describe("Button", () => {
  it("is 40px high by default and 32px small (STY-015 S1)", () => {
    render(
      <>
        <Button>Default</Button>
        <Button size="sm">Small</Button>
      </>,
    )

    expect(screen.getByRole("button", { name: "Default" })).toHaveClass("h-10")
    expect(screen.getByRole("button", { name: "Small" })).toHaveClass("h-8")
  })

  it.each([
    ["default", ["bg-primary", "shadow-control"]],
    ["secondary", ["bg-background", "border-input", "shadow-control-edge"]],
    ["destructive", ["bg-destructive-fill", "shadow-control"]],
  ] as const)(
    "the %s variant is a bold, 4px, barred button",
    (variant, classes) => {
      render(<Button variant={variant}>Press</Button>)

      expect(screen.getByRole("button")).toHaveClass(
        "font-bold",
        "rounded-lg",
        "focus-visible:focus-fill",
        ...classes,
      )
    },
  )

  it("dims a disabled button and drops its bar, even when it stays focusable", async () => {
    const onClick = vi.fn()
    render(
      <Button
        variant="secondary"
        disabled
        focusableWhenDisabled
        onClick={onClick}
      >
        Refresh
      </Button>,
    )

    const button = screen.getByRole("button", { name: "Refresh" })
    expect(button).toHaveAttribute("data-disabled")
    expect(button).toHaveClass(
      "data-disabled:opacity-50",
      "data-disabled:shadow-none",
    )
    button.focus()
    expect(button).toHaveFocus()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
