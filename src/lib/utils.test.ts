import { describe, expect, it } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  it("keeps a type token beside a text colour", () => {
    expect(cn("text-body", "text-muted-foreground")).toBe(
      "text-body text-muted-foreground",
    )
    expect(cn("text-heading-xl", "text-foreground")).toBe(
      "text-heading-xl text-foreground",
    )
    expect(cn("text-status-info-fg", "text-body-xs")).toBe(
      "text-status-info-fg text-body-xs",
    )
  })

  it("resolves two type tokens, or a token and a default size, to the last", () => {
    expect(cn("text-body-xs", "text-heading-m")).toBe("text-heading-m")
    expect(cn("text-heading-s font-normal", "text-body")).toBe(
      "font-normal text-body",
    )
    expect(cn("text-sm", "text-body-xs")).toBe("text-body-xs")
  })

  it("keeps variants of a type token apart", () => {
    expect(cn("text-body", "sm:text-heading-l", "text-body-xs")).toBe(
      "sm:text-heading-l text-body-xs",
    )
  })

  it("resolves two shadows to the last", () => {
    expect(cn("shadow-control", "shadow-none")).toBe("shadow-none")
    expect(cn("shadow-xs", "shadow-control")).toBe("shadow-control")
  })

  it("keeps a semantic shadow beside a shadow colour", () => {
    expect(cn("shadow-control", "shadow-primary")).toBe(
      "shadow-control shadow-primary",
    )
  })

  it("resolves two focus utilities under one variant to the last", () => {
    expect(cn("focus-visible:focus-fill", "focus-visible:focus-ring")).toBe(
      "focus-visible:focus-ring",
    )
    expect(cn("focus-visible:focus-fill", "has-focus-visible:focus-ring")).toBe(
      "focus-visible:focus-fill has-focus-visible:focus-ring",
    )
  })
})
