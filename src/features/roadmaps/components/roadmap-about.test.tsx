import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import type { Language } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { RoadmapAbout, type RoadmapAboutProps } from "./roadmap-about"

const productA = createTestRoadmap("producta", "Product A roadmap", {
  statusLabel: { en: "Beta", cy: "" },
  productLead: "Alex Jones, Sam Evans",
  family: { en: "Single Record", cy: "Cofnod Sengl" },
  category: { en: "GP & Community Services", cy: "" },
  vision: { en: "First line\nSecond line", cy: "" },
  serviceDescription: { en: "What Product A does.", cy: "" },
  lastUpdated: "2026-10-02",
})

function about() {
  return screen.getByRole("region", { name: /about this roadmap|ynglŷn/i })
}

function renderAbout(
  props: Partial<RoadmapAboutProps> & { roadmap?: Roadmap } = {},
  language: Language = "en",
) {
  const user = userEvent.setup()
  renderWithI18n(<RoadmapAbout roadmap={productA} {...props} />, {
    language,
  })
  return user
}

/** Renders the panel and opens it with its "Show more". */
async function renderOpen(
  props: Partial<RoadmapAboutProps> = {},
  language: Language = "en",
) {
  const user = renderAbout(props, language)
  await user.click(
    within(about()).getByRole("button", { name: /Show more|Dangos mwy/ }),
  )
  return user
}

const terms = () =>
  within(about())
    .getAllByRole("term")
    .map((term) => term.textContent)
const definitions = () =>
  within(about())
    .getAllByRole("definition")
    .map((value) => value.textContent)

describe("RoadmapAbout", () => {
  it("opens folded to one line: status, product lead and when it was last updated (STY-053 S6)", () => {
    renderAbout()

    const region = about()
    expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent(
      "About this roadmap",
    )
    expect(region).toHaveTextContent(
      "Beta" + "Product lead: Alex Jones, Sam Evans" + "Updated 2 October 2026",
    )
    expect(within(region).queryByRole("term")).not.toBeInTheDocument()
    expect(region).not.toHaveTextContent("What Product A does.")
    expect(
      within(region).getByRole("button", { name: "Show more" }),
    ).toHaveAttribute("aria-expanded", "false")
  })

  it("leaves out of its one line what the roadmap doesn't have", () => {
    renderAbout({
      roadmap: { ...productA, statusLabel: null, lastUpdated: null },
    })

    expect(about()).toHaveTextContent(
      /^About this roadmapProduct lead: Alex Jones, Sam EvansShow more$/,
    )
  })

  it("tags a pending change on its one line, and not once open (S6)", async () => {
    const user = renderAbout({ changed: true })

    expect(within(about()).getByText("Changed")).toBeVisible()

    await user.click(within(about()).getByRole("button", { name: "Show more" }))
    expect(within(about()).queryByText("Changed")).not.toBeInTheDocument()
  })

  it("shows each field under its label once open, family and category among them, keeping line breaks, then the date (STY-036 S1, STY-053 D6)", async () => {
    await renderOpen()

    expect(
      within(about()).getByRole("button", { name: "Show less" }),
    ).toHaveAttribute("aria-expanded", "true")
    expect(terms()).toEqual([
      "Status",
      "Product lead",
      "Family",
      "Category",
      "Vision",
      "Service description",
      "Last updated",
    ])
    expect(definitions()).toEqual([
      "Beta",
      "Alex Jones, Sam Evans",
      "Single Record",
      "GP & Community Services",
      "First line\nSecond line",
      "What Product A does.",
      "2 October 2026",
    ])
    expect(within(about()).getByText(/First line/)).toHaveClass(
      "whitespace-pre-line",
    )
    // Its one line gives way to the fields.
    expect(about()).not.toHaveTextContent("Product lead: Alex Jones")
  })

  it("leaves out empty fields and their labels", async () => {
    await renderOpen({
      roadmap: { ...productA, vision: null, productLead: null, family: null },
    })

    expect(terms()).toEqual([
      "Status",
      "Category",
      "Service description",
      "Last updated",
    ])
  })

  it("says there is nothing yet when every field is empty, and that it has no date (STY-036 S1)", async () => {
    await renderOpen({
      roadmap: createTestRoadmap("producta", "Product A roadmap"),
    })

    expect(about()).toHaveTextContent("There's nothing about this roadmap yet.")
    expect(definitions()).toEqual(["No date"])
  })

  it("shows its controls beside the heading, as they suit it folded or open, ahead of the fields (STY-042 S1)", async () => {
    await renderOpen({
      actions: (open) => (
        <button type="button">{open ? "Edit open" : "Edit folded"}</button>
      ),
    })

    const region = about()
    const edit = within(region).getByRole("button", { name: "Edit open" })
    const [firstLabel] = within(region).getAllByRole("term")
    expect(firstLabel && edit.compareDocumentPosition(firstLabel)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it("is Welsh where the roadmap has Welsh, field by field, and shows the lead as written", async () => {
    await renderOpen(
      {
        roadmap: {
          ...productA,
          vision: { en: "English vision", cy: "Gweledigaeth Gymraeg" },
        },
      },
      "cy",
    )

    expect(
      within(about()).getByRole("heading", { level: 2 }),
    ).toHaveTextContent("Ynglŷn â'r map trywydd hwn")
    expect(terms()).toEqual([
      "Statws",
      "Arweinydd cynnyrch",
      "Teulu",
      "Categori",
      "Gweledigaeth",
      "Disgrifiad o'r gwasanaeth",
      "Diweddarwyd ddiwethaf",
    ])
    expect(definitions()).toEqual([
      "Beta",
      "Alex Jones, Sam Evans",
      "Cofnod Sengl",
      "GP & Community Services",
      "Gweledigaeth Gymraeg",
      "What Product A does.",
      "2 Hydref 2026",
    ])
  })
})
