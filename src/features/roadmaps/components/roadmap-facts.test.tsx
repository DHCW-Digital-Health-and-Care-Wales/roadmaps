import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import type { Language } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { RoadmapFacts } from "./roadmap-facts"

const demographics = createTestRoadmap(
  "demographics",
  "Demographics and Identity (MPI, WDS, WAMS)",
  {
    statusLabel: { en: "Live", cy: "Byw" },
    productLead: "Sam Evans & Rhian Morgan",
    lastUpdated: "2026-11-04",
  },
)

function renderFacts(roadmap = demographics, language: Language = "en") {
  renderWithI18n(<RoadmapFacts roadmap={roadmap} />, { language })
}

const facts = () =>
  within(screen.getByRole("list", { name: /Roadmap details|Manylion/ }))
    .getAllByRole("listitem")
    .map((fact) => fact.textContent)

describe("RoadmapFacts", () => {
  it('lists the status, product lead and last update as "Roadmap details" (STY-059 S2)', () => {
    renderFacts()

    expect(facts()).toEqual([
      "Status: Live",
      "Product lead: Sam Evans & Rhian Morgan",
      "Updated 4 November 2026",
    ])
  })

  it('reads the status as "Status:" then its tag, not a bare tag like the phase banner\'s (S2, D5)', () => {
    renderFacts()

    const status = screen.getAllByRole("listitem").at(0)
    if (!status) throw new Error("No facts")
    expect(status).toHaveTextContent(/^Status: Live$/)
    expect(within(status).getByText("Live")).toHaveAttribute(
      "data-slot",
      "badge",
    )
  })

  it("shows each fact only when the roadmap has it (S2)", () => {
    renderFacts({ ...demographics, statusLabel: null, lastUpdated: null })

    expect(facts()).toEqual(["Product lead: Sam Evans & Rhian Morgan"])
  })

  it("shows no list for a roadmap with no facts", () => {
    renderFacts(createTestRoadmap("bare", "Bare roadmap"))

    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("puts one fact to a row on a phone, and from 640px one line, wrapping between facts (S2)", () => {
    renderFacts()

    expect(screen.getByRole("list")).toHaveClass(
      "flex-col",
      "sm:flex-row",
      "sm:flex-wrap",
    )
  })

  it("is in Welsh (ADR-008)", () => {
    renderFacts(demographics, "cy")

    expect(facts()).toEqual([
      "Statws: Byw",
      "Arweinydd cynnyrch: Sam Evans & Rhian Morgan",
      "Diweddarwyd 4 Tachwedd 2026",
    ])
  })
})
