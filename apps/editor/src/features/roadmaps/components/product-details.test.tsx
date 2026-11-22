import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import type { Language } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { ProductDetails, type ProductDetailsProps } from "./product-details"

const productA = createTestRoadmap("producta", "Product A roadmap", {
  statusLabel: { en: "Beta", cy: "" },
  productLead: "Alex Jones, Sam Evans",
  family: { en: "Single Record", cy: "Cofnod Sengl" },
  category: { en: "GP & Community Services", cy: "" },
  vision: { en: "First line\nSecond line", cy: "" },
  serviceDescription: { en: "What Product A does.", cy: "" },
  lastUpdated: "2026-10-02",
})

function details() {
  return screen.getByRole("region", {
    name: /^(Product details|Manylion y cynnyrch)$/,
  })
}

function renderDetails(
  props: Partial<ProductDetailsProps> = {},
  language: Language = "en",
) {
  const user = userEvent.setup()
  renderWithI18n(<ProductDetails roadmap={productA} {...props} />, {
    language,
  })
  return user
}

/** The disclosure, which opens and closes it. */
function disclosure(
  name: RegExp | string = /^(Product details|Manylion y cynnyrch)$/,
) {
  return within(details()).getByRole("button", { name })
}

/** Renders it and opens it by its disclosure. */
async function renderOpen(
  props: Partial<ProductDetailsProps> = {},
  language: Language = "en",
) {
  const user = renderDetails(props, language)
  await user.click(disclosure())
  return user
}

const facts = () =>
  within(details()).getByRole("list", {
    name: /^(Roadmap details|Manylion y map trywydd)$/,
  })
const terms = () =>
  within(details())
    .getAllByRole("term")
    .map((term) => term.textContent)
const definitions = () =>
  within(details())
    .getAllByRole("definition")
    .map((value) => value.textContent)

describe("ProductDetails", () => {
  it('holds the facts as plain text, then its disclosure, in the list "Roadmap details" (STY-065 S2)', () => {
    renderDetails()

    const items = within(facts()).getAllByRole("listitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "Status: Beta",
      "Product lead: Alex Jones, Sam Evans",
      "Updated 2 October 2026",
      "Product details",
    ])
    const status = within(items[0] ?? facts()).getByText("Beta")
    expect(status).not.toHaveAttribute("data-slot", "badge")
    expect(items.at(-1)).toContainElement(disclosure())
  })

  it("leaves out a fact the roadmap lacks, keeping the disclosure last (S2)", () => {
    renderDetails({
      roadmap: { ...productA, statusLabel: null, lastUpdated: null },
    })

    expect(
      within(facts())
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Product lead: Alex Jones, Sam Evans", "Product details"])
  })

  it("opens closed: a heading holding its disclosure, its fields hidden (S3)", () => {
    renderDetails()

    const region = details()
    const heading = within(region).getByRole("heading", { level: 2 })
    expect(heading).toHaveTextContent("Product details")
    expect(heading).toContainElement(disclosure())
    expect(disclosure()).toHaveAttribute("aria-expanded", "false")
    expect(within(region).queryByRole("term")).not.toBeInTheDocument()
  })

  it("expands in place, reading as expanded, and closes again (S3)", async () => {
    const user = await renderOpen()

    expect(disclosure()).toHaveAttribute("aria-expanded", "true")
    expect(within(details()).getByText("What Product A does.")).toBeVisible()

    await user.click(disclosure())
    expect(disclosure()).toHaveAttribute("aria-expanded", "false")
    expect(
      within(details()).queryByText("What Product A does."),
    ).not.toBeInTheDocument()
  })

  it("is a text control with a chevron (S3)", () => {
    renderDetails()

    const button = disclosure()
    // The design system's link and its focus; its 44px press is measured in E2E.
    expect(button).toHaveClass("text-link", "focus-visible:focus-link")
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("tags a pending change beside the disclosure while closed, and leaves it to its controls once open (S3)", async () => {
    const user = renderDetails({ changed: true })

    const last = within(facts()).getAllByRole("listitem").at(-1)
    expect(within(last ?? facts()).getByText("Changed")).toBeVisible()

    await user.click(disclosure())
    expect(within(details()).queryByText("Changed")).not.toBeInTheDocument()
  })

  it("shows the vision, service description, family and category under their labels once open, keeping line breaks (S3)", async () => {
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
    expect(within(details()).getByText(/First line/)).toHaveClass(
      "whitespace-pre-line",
    )
    // The facts above hold the rest, not the open details.
    expect(
      within(details()).getAllByRole("term")[0]?.closest("dl"),
    ).not.toHaveTextContent(/Beta|Alex Jones|October/)
  })

  it("leaves out empty fields and their labels (S3)", async () => {
    await renderOpen({
      roadmap: { ...productA, vision: null, family: null },
    })

    expect(terms()).toEqual(["Service description", "Category"])
  })

  it("says there are no product details yet when every field is empty (S3)", async () => {
    await renderOpen({
      roadmap: {
        ...productA,
        vision: null,
        serviceDescription: null,
        family: null,
        category: null,
      },
    })

    expect(details()).toHaveTextContent("There are no product details yet.")
    expect(within(details()).queryByRole("term")).not.toBeInTheDocument()
  })

  it("ends the open details in its controls, after the fields, and shows them only while open (S3)", async () => {
    const user = renderDetails({
      actions: <button type="button">Edit</button>,
    })
    const region = details()

    expect(
      within(region).queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument()

    await user.click(disclosure())

    const edit = within(region).getByRole("button", { name: "Edit" })
    const lastField = within(region).getAllByRole("definition").at(-1)
    expect(lastField?.compareDocumentPosition(edit)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(facts()).not.toContainElement(edit)
  })

  it("is Welsh where the roadmap has Welsh, field by field (ADR-008)", async () => {
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
    expect(
      within(facts())
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Statws: Beta",
      "Arweinydd cynnyrch: Alex Jones, Sam Evans",
      "Diweddarwyd 2 Hydref 2026",
      "Manylion y cynnyrch",
    ])
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
