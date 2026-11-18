import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

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
  props: Partial<RoadmapAboutProps> = {},
  language: Language = "en",
) {
  const user = userEvent.setup()
  renderWithI18n(<RoadmapAbout roadmap={productA} {...props} />, {
    language,
  })
  return user
}

/** The disclosure, which opens and closes it. */
function disclosure(
  name: RegExp | string = /^(About this roadmap|Ynglŷn â'r map trywydd hwn)$/,
) {
  return within(about()).getByRole("button", { name })
}

/** Renders it and opens it by its disclosure. */
async function renderOpen(
  props: Partial<RoadmapAboutProps> = {},
  language: Language = "en",
) {
  const user = renderAbout(props, language)
  await user.click(disclosure())
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
  it("opens closed: a heading holding its disclosure, its fields hidden (STY-059 S4)", () => {
    renderAbout()

    const region = about()
    const heading = within(region).getByRole("heading", { level: 2 })
    expect(heading).toHaveTextContent("About this roadmap")
    expect(heading).toContainElement(disclosure())
    expect(disclosure()).toHaveAttribute("aria-expanded", "false")
    expect(region).toHaveTextContent(/^About this roadmap$/)
    expect(within(region).queryByRole("term")).not.toBeInTheDocument()
  })

  it("expands in place, reading as expanded, and closes again (S4)", async () => {
    const user = await renderOpen()

    expect(disclosure()).toHaveAttribute("aria-expanded", "true")
    expect(within(about()).getByText("What Product A does.")).toBeVisible()

    await user.click(disclosure())
    expect(disclosure()).toHaveAttribute("aria-expanded", "false")
    expect(
      within(about()).queryByText("What Product A does."),
    ).not.toBeInTheDocument()
  })

  it("is a text control at least 44px tall with a chevron, underlined on hover (S4)", () => {
    renderAbout()

    const button = disclosure()
    expect(button).toHaveClass(
      "min-h-11",
      "text-link",
      "focus-visible:focus-link",
    )
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    expect(button.querySelector("span")).toHaveClass(
      "group-hover/about:underline",
    )
  })

  it("tags a pending change beside the disclosure while closed, and leaves it to its controls once open (STY-059 S5)", async () => {
    const user = renderAbout({ changed: true })

    expect(within(about()).getByText("Changed")).toBeVisible()

    await user.click(disclosure())
    expect(within(about()).queryByText("Changed")).not.toBeInTheDocument()
  })

  it("shows the vision, service description, family and category under their labels once open, keeping line breaks (S4)", async () => {
    await renderOpen()

    expect(terms()).toEqual([
      "Vision",
      "Service description",
      "Family",
      "Category",
    ])
    expect(definitions()).toEqual([
      "First line\nSecond line",
      "What Product A does.",
      "Single Record",
      "GP & Community Services",
    ])
    expect(within(about()).getByText(/First line/)).toHaveClass(
      "whitespace-pre-line",
    )
    // The facts under the title hold the rest.
    expect(about()).not.toHaveTextContent(/Beta|Alex Jones|October/)
  })

  it("leaves out empty fields and their labels", async () => {
    await renderOpen({
      roadmap: { ...productA, vision: null, family: null },
    })

    expect(terms()).toEqual(["Service description", "Category"])
  })

  it("says there is nothing yet when every field is empty", async () => {
    await renderOpen({
      roadmap: {
        ...productA,
        vision: null,
        serviceDescription: null,
        family: null,
        category: null,
      },
    })

    expect(about()).toHaveTextContent("There's nothing about this roadmap yet.")
    expect(within(about()).queryByRole("term")).not.toBeInTheDocument()
  })

  it("shows its controls beside the disclosure, as they suit it closed or open, ahead of the fields (STY-059 S4)", async () => {
    const user = renderAbout({
      actions: (open) => (
        <button type="button">{open ? "Edit open" : "Edit closed"}</button>
      ),
    })
    const region = about()
    const row = within(region).getByRole("heading", { level: 2 }).parentElement
    expect(row).toContainElement(
      within(region).getByRole("button", { name: "Edit closed" }),
    )

    await user.click(disclosure())

    expect(
      within(region).queryByRole("button", { name: "Edit closed" }),
    ).not.toBeInTheDocument()
    const edit = within(region).getByRole("button", { name: "Edit open" })
    expect(row).toContainElement(edit)
    const [firstLabel] = within(region).getAllByRole("term")
    expect(firstLabel && edit.compareDocumentPosition(firstLabel)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it("is Welsh where the roadmap has Welsh, field by field", async () => {
    await renderOpen(
      {
        roadmap: {
          ...productA,
          vision: { en: "English vision", cy: "Gweledigaeth Gymraeg" },
        },
      },
      "cy",
    )

    expect(disclosure()).toHaveAttribute("aria-expanded", "true")
    expect(terms()).toEqual([
      "Gweledigaeth",
      "Disgrifiad o'r gwasanaeth",
      "Teulu",
      "Categori",
    ])
    expect(definitions()).toEqual([
      "Gweledigaeth Gymraeg",
      "What Product A does.",
      "Cofnod Sengl",
      "GP & Community Services",
    ])
  })
})
