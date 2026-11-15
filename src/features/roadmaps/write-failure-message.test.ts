import { describe, expect, it } from "vitest"

import { createI18n } from "@/i18n/create-i18n"

import { writeFailureMessage } from "./write-failure-message"

describe("writeFailureMessage", () => {
  const { t } = createI18n()

  it("shares one message for a kind, naming what is changed where it differs", () => {
    expect(writeFailureMessage(t, "lists", "network")).toBe(
      writeFailureMessage(t, "families", "network"),
    )
    expect(writeFailureMessage(t, "lists", "forbidden")).toContain(
      "change roadmaps",
    )
    expect(writeFailureMessage(t, "publish", "forbidden")).toContain(
      "change this roadmap",
    )
    expect(writeFailureMessage(t, "add", "forbidden")).toContain("add roadmaps")
  })

  it("keeps the wording a surface words differently", () => {
    expect(writeFailureMessage(t, "publish", "not-found")).toBe(
      "This roadmap is no longer listed.",
    )
    expect(writeFailureMessage(t, "add", "unauthenticated")).toBe(
      "Your session expired before it could be added. Try again.",
    )
  })

  it("speaks Welsh", () => {
    const cy = createI18n({ language: "cy" })
    expect(writeFailureMessage(cy.t, "families", "forbidden")).toContain(
      "newid teuluoedd",
    )
  })
})
