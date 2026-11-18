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

/** The facts are items of a list the caller owns, as in the product details' line. */
function renderFacts(roadmap = demographics, language: Language = "en") {
  renderWithI18n(
    <ul
      aria-label={
        language === "cy" ? "Manylion y map trywydd" : "Roadmap details"
      }
    >
      <RoadmapFacts roadmap={roadmap} />
    </ul>,
    { language },
  )
}

const facts = () =>
  within(screen.getByRole("list", { name: /Roadmap details|Manylion/ }))
    .queryAllByRole("listitem")
    .map((fact) => fact.textContent)

describe("RoadmapFacts", () => {
  it('lists the status, product lead and last update as items of the "Roadmap details" list (STY-065 S2)', () => {
    renderFacts()

    expect(facts()).toEqual([
      "Status: Live",
      "Product lead: Sam Evans & Rhian Morgan",
      "Updated 4 November 2026",
    ])
  })

  it('reads the status as "Status:" then its label as plain text, not a tag (S2)', () => {
    renderFacts()

    const status = screen.getAllByRole("listitem").at(0)
    if (!status) throw new Error("No facts")
    expect(status).toHaveTextContent(/^Status: Live$/)
    const label = within(status).getByText("Live")
    expect(label).not.toHaveAttribute("data-slot", "badge")
    expect(label).toHaveClass("font-bold")
  })

  it("shows each fact only when the roadmap has it (S2)", () => {
    renderFacts({ ...demographics, statusLabel: null, lastUpdated: null })

    expect(facts()).toEqual(["Product lead: Sam Evans & Rhian Morgan"])
  })

  it("shows no item for a roadmap with no facts (S2)", () => {
    renderFacts(createTestRoadmap("bare", "Bare roadmap"))

    expect(facts()).toEqual([])
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
