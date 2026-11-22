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

  it("says a protected part of the spreadsheet stopped a write, whatever it changes, and who can lift it (STY-051 S7)", () => {
    const message =
      "Part of the spreadsheet is protected, so nothing was changed. Ask its owner to let this account edit it."

    expect(writeFailureMessage(t, "publish", "protected")).toBe(message)
    expect(writeFailureMessage(t, "families", "protected")).toBe(message)
    expect(
      writeFailureMessage(
        createI18n({ language: "cy" }).t,
        "publish",
        "protected",
      ),
    ).toBe(
      "Mae rhan o'r daenlen wedi'i diogelu, felly newidiwyd dim byd. Gofynnwch i'w pherchennog adael i'r cyfrif hwn ei golygu.",
    )
  })

  it("speaks Welsh", () => {
    const cy = createI18n({ language: "cy" })
    expect(writeFailureMessage(cy.t, "families", "forbidden")).toContain(
      "newid teuluoedd",
    )
  })
})
