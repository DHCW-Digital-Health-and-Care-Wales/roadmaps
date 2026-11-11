import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { renderWithI18n } from "@/test/render-with-i18n"

import { RoadmapAbout } from "./roadmap-about"

const productA = createTestRoadmap("producta", "Product A roadmap", {
  statusLabel: { en: "Beta", cy: "" },
  productLead: "Alex Jones, Sam Evans",
  vision: { en: "First line\nSecond line", cy: "" },
  serviceDescription: { en: "What Product A does.", cy: "" },
})

function about() {
  return screen.getByRole("region", { name: /about this roadmap|ynglŷn/i })
}

describe("RoadmapAbout", () => {
  it("shows each of the four fields under its label, keeping line breaks", () => {
    renderWithI18n(<RoadmapAbout roadmap={productA} />)

    const region = about()
    expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent(
      "About this roadmap",
    )
    expect(
      within(region)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["Status", "Product lead", "Vision", "Service description"])
    expect(
      within(region)
        .getAllByRole("definition")
        .map((value) => value.textContent),
    ).toEqual([
      "Beta",
      "Alex Jones, Sam Evans",
      "First line\nSecond line",
      "What Product A does.",
    ])
    expect(within(region).getByText(/First line/)).toHaveClass(
      "whitespace-pre-line",
    )
  })

  it("leaves out empty fields and their labels", () => {
    renderWithI18n(
      <RoadmapAbout
        roadmap={{ ...productA, vision: null, productLead: null }}
      />,
    )

    expect(
      within(about())
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["Status", "Service description"])
  })

  it("says there is nothing yet when all four are empty", () => {
    renderWithI18n(
      <RoadmapAbout
        roadmap={createTestRoadmap("producta", "Product A roadmap")}
      />,
    )

    const region = about()
    expect(within(region).getByRole("heading", { level: 2 })).toBeVisible()
    expect(region).toHaveTextContent("There's nothing about this roadmap yet.")
    expect(within(region).queryAllByRole("term")).toEqual([])
  })

  it("is Welsh where the roadmap has Welsh, field by field, and shows the lead as written", () => {
    renderWithI18n(
      <RoadmapAbout
        roadmap={{
          ...productA,
          vision: { en: "English vision", cy: "Gweledigaeth Gymraeg" },
        }}
      />,
      { language: "cy" },
    )

    const region = about()
    expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent(
      "Ynglŷn â'r map trywydd hwn",
    )
    expect(
      within(region)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual([
      "Statws",
      "Arweinydd cynnyrch",
      "Gweledigaeth",
      "Disgrifiad o'r gwasanaeth",
    ])
    expect(
      within(region)
        .getAllByRole("definition")
        .map((value) => value.textContent),
    ).toEqual([
      "Beta",
      "Alex Jones, Sam Evans",
      "Gweledigaeth Gymraeg",
      "What Product A does.",
    ])
  })
})
