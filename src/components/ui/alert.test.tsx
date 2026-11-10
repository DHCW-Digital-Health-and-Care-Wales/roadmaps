import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "./alert"

describe("Alert", () => {
  it.each([
    ["info", "border-status-info-border"],
    ["success", "border-status-success-border"],
    ["warning", "border-focus"],
    ["destructive", "border-destructive"],
  ] as const)("the %s notice has a 4px %s border", (variant, border) => {
    render(
      <Alert variant={variant}>
        <AlertContent>
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Description</AlertDescription>
        </AlertContent>
      </Alert>,
    )

    expect(screen.getByRole("alert")).toHaveClass("border-4", border)
    expect(screen.getByRole("alert")).toHaveTextContent("TitleDescription")
  })

  it("is an info notice by default and announces itself", () => {
    render(<Alert>Note</Alert>)

    expect(screen.getByRole("alert")).toHaveClass("border-status-info-border")
  })

  it("can be a note that does not interrupt", () => {
    render(<Alert role="note">Where the data comes from</Alert>)

    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByRole("note")).toBeInTheDocument()
  })

  it("renders its title as a heading when asked, and its action beside it", () => {
    render(
      <Alert>
        <AlertContent>
          <AlertTitle as="h2">Couldn't load</AlertTitle>
        </AlertContent>
        <AlertAction>
          <button type="button">Retry</button>
        </AlertAction>
      </Alert>,
    )

    expect(
      screen.getByRole("heading", { level: 2, name: "Couldn't load" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Couldn't load" })).toHaveClass(
      "text-heading-m",
    )
  })

  it("sets each variant's icon colour instead of forcing the text colour", () => {
    render(<Alert variant="warning" />)

    const classes = screen.getByRole("alert").className
    expect(classes).toContain("[&>svg]:text-status-warning-fg")
    expect(classes).not.toContain("text-current")
  })
})
