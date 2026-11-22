import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

/** The example roadmaps (`tests/fixtures/sheets/Roadmaps.csv`) as the app reads them. */
const productA = createTestRoadmap("producta", "Product A roadmap", {
  category: {
    en: "GP & Community Services",
    cy: "Meddygon Teulu a Gwasanaethau Cymunedol",
  },
  family: { en: "Single Record", cy: "" },
  statusLabel: { en: "Beta", cy: "" },
  productLead: "Alex Jones",
  lastUpdated: "2026-10-01",
  colour: "#325083",
  serviceDescription: {
    en: "What Product A does and who it helps.",
    cy: "",
  },
})
const productB = createTestRoadmap("productb", "Product B roadmap", {
  title: { en: "Product B roadmap", cy: "Trywydd Cynnyrch B" },
  family: { en: "Medicines & Diagnostics", cy: "Meddyginiaethau a Diagnosteg" },
  statusLabel: { en: "Alpha", cy: "Alffa" },
  lastUpdated: "2026-09-15",
  colour: "#006747",
  serviceDescription: {
    en: "What Product B does and who it helps.",
    cy: "Beth mae Cynnyrch B yn ei wneud a phwy mae'n ei helpu.",
  },
})
const productC = createTestRoadmap("productc", "Product C roadmap", {
  published: false,
  category: {
    en: "Tests, Scans & Results",
    cy: "Profion, Sganiau a Chanlyniadau",
  },
  statusLabel: { en: "Alpha", cy: "" },
  productLead: "Sam Evans",
  lastUpdated: "2026-10-01",
  colour: "#912b88",
})

async function renderCards(roadmaps: Roadmap[], language: "en" | "cy" = "en") {
  await renderWithProviders({ authState: connected, roadmaps, language })
  const main = within(screen.getByRole("main"))
  await main.findAllByRole("list")
  return main
}

/** The whole card of a link: its list item, holding what is not in the link. */
function cardOf(link: HTMLElement): HTMLElement {
  const card = link.closest<HTMLElement>("li")
  if (!card) throw new Error("the link is not in a card")
  return card
}

describe("RoadmapCard", () => {
  it("shows the title, category, status, product lead, summary and date written out (S2)", async () => {
    const main = await renderCards([productA])

    const card = await main.findByRole("link", { name: "Product A roadmap" })
    expect(card).toHaveAttribute("href", "/roadmaps/producta")
    const inCard = within(cardOf(card))
    expect(inCard.getByText("GP & Community Services")).toBeInTheDocument()
    expect(inCard.getByText("Beta")).toBeInTheDocument()
    expect(inCard.getByText("Product lead: Alex Jones")).toBeInTheDocument()
    expect(
      inCard.getByText("What Product A does and who it helps."),
    ).toBeInTheDocument()
    expect(inCard.getByText("Updated 1 October 2026")).toBeInTheDocument()
    // The family is the group heading's, not the card's.
    expect(inCard.queryByText("Single Record")).not.toBeInTheDocument()
  })

  it("is DHCW's clickable card: square, barred, with an underlined link title and a decorative chevron (STY-015 S4)", async () => {
    const main = await renderCards([productA])

    const link = await main.findByRole("link", { name: "Product A roadmap" })
    const card = link.parentElement?.parentElement
    expect(card).toHaveClass("border", "shadow-card-bar", "hover:border-input")
    expect(card?.className).not.toMatch(/rounded/)
    expect(card).toHaveClass("has-focus-visible:focus-ring")
    expect(link).toHaveClass("underline", "text-link", "after:inset-0")
    const chevron = card?.querySelector("svg")?.parentElement
    expect(chevron).toHaveAttribute("aria-hidden", "true")
    expect(chevron).toHaveClass("bg-link", "rounded-full")
    expect(within(cardOf(link)).getByText("Beta")).toHaveClass(
      "bg-status-neutral-bg",
    )
  })

  it("names the link by the title alone, the rest being its description (S2)", async () => {
    const main = await renderCards([productA])

    const card = await main.findByRole("link", { name: "Product A roadmap" })
    expect(card).toHaveAccessibleName("Product A roadmap")
    expect(card).toHaveAccessibleDescription(
      "GP & Community Services Beta What Product A does and who it helps. " +
        "Product lead: Alex Jones Updated 1 October 2026",
    )
  })

  it("shows only what exists, with no empty labels or blank parts (S3)", async () => {
    const main = await renderCards([
      productB,
      createTestRoadmap("bare", "Bare roadmap"),
    ])

    const bare = await main.findByRole("link", { name: "Bare roadmap" })
    expect(cardOf(bare)).toHaveTextContent(/^Bare roadmap$/)
    expect(bare).not.toHaveAttribute("aria-describedby")

    const card = main.getByRole("link", { name: "Product B roadmap" })
    expect(card).toHaveAccessibleDescription(
      "Alpha What Product B does and who it helps. Updated 15 September 2026",
    )
    expect(cardOf(card)).not.toHaveTextContent(/product lead|other/i)
  })

  it("badges a roadmap the public can't see, apart from its status, and no other (S4)", async () => {
    const main = await renderCards([productA, productC])

    const unpublished = main.getByRole("link", { name: "Product C roadmap" })
    expect(
      within(cardOf(unpublished)).getByText("Not published"),
    ).toBeInTheDocument()
    expect(within(cardOf(unpublished)).getByText("Alpha")).toBeInTheDocument()
    expect(unpublished).toHaveAccessibleDescription(
      "Tests, Scans & Results Alpha Not published Product lead: Sam Evans Updated 1 October 2026",
    )
    const published = main.getByRole("link", { name: "Product A roadmap" })
    expect(
      within(cardOf(published)).queryByText("Not published"),
    ).not.toBeInTheDocument()
  })

  it("is Welsh in Cymraeg: its content where it has Welsh, and every label, category, badge and date (S5)", async () => {
    const main = await renderCards([productA, productB, productC], "cy")

    const b = await main.findByRole("link", { name: "Trywydd Cynnyrch B" })
    expect(within(cardOf(b)).getByText("Alffa")).toBeInTheDocument()
    expect(
      within(cardOf(b)).getByText(
        "Beth mae Cynnyrch B yn ei wneud a phwy mae'n ei helpu.",
      ),
    ).toBeInTheDocument()
    expect(
      within(cardOf(b)).getByText("Diweddarwyd 15 Medi 2026"),
    ).toBeInTheDocument()

    const a = main.getByRole("link", { name: "Product A roadmap" })
    expect(
      within(cardOf(a)).getByText("Meddygon Teulu a Gwasanaethau Cymunedol"),
    ).toBeInTheDocument()
    // The product lead's name is shown as written.
    expect(
      within(cardOf(a)).getByText("Arweinydd cynnyrch: Alex Jones"),
    ).toBeInTheDocument()
    expect(within(cardOf(a)).getByText("Beta")).toBeInTheDocument()

    const c = main.getByRole("link", { name: "Product C roadmap" })
    expect(within(cardOf(c)).getByText("Heb ei gyhoeddi")).toBeInTheDocument()
    expect(
      within(cardOf(c)).getByText("Profion, Sganiau a Chanlyniadau"),
    ).toBeInTheDocument()
  })

  it("flags a roadmap out of step with its family or category, or whose family isn't listed, and no other (STY-027 S4, S8)", async () => {
    const main = await renderCards([
      { ...productA, outOfStep: true },
      { ...productB, familyNotListed: true },
      productC,
    ])

    const a = main.getByRole("link", { name: "Product A roadmap" })
    expect(a).toHaveAccessibleDescription(
      "GP & Community Services Beta Doesn't match its family or category " +
        "What Product A does and who it helps. Product lead: Alex Jones Updated 1 October 2026",
    )
    const b = main.getByRole("link", { name: "Product B roadmap" })
    expect(
      within(cardOf(b)).getByText("Family isn't listed"),
    ).toBeInTheDocument()
    const c = main.getByRole("link", { name: "Product C roadmap" })
    expect(cardOf(c)).not.toHaveTextContent(/match|listed/)
  })

  it("flags in Welsh in Cymraeg (STY-027 S4, S8)", async () => {
    const main = await renderCards(
      [
        { ...productA, outOfStep: true },
        { ...productB, familyNotListed: true },
      ],
      "cy",
    )

    expect(
      main.getByText("Yn wahanol i'w deulu neu gategori"),
    ).toBeInTheDocument()
    expect(main.getByText("Teulu heb ei restru")).toBeInTheDocument()
  })

  it("shows a product lead's name as written, even with markup or nesting syntax in it", async () => {
    const lead = "Alex <b>Jones</b> & $t(roadmaps.title)"
    const main = await renderCards([
      createTestRoadmap("x", "X roadmap", { productLead: lead }),
    ])

    expect(await main.findByText(`Product lead: ${lead}`)).toBeInTheDocument()
  })
})

describe("RoadmapCard colour (S6)", () => {
  function swatchOf(link: HTMLElement) {
    const swatch = cardOf(link).querySelector<HTMLElement>(
      "span[aria-hidden='true']",
    )
    if (!swatch) throw new Error("no swatch")
    return swatch
  }

  it("shows the roadmap's own colour as a decorative swatch, and a theme colour without one", async () => {
    const main = await renderCards([
      productA,
      createTestRoadmap("plain", "Plain roadmap"),
    ])

    const own = swatchOf(
      await main.findByRole("link", { name: "Product A roadmap" }),
    )
    expect(own).toHaveStyle({ backgroundColor: "rgb(50, 80, 131)" })
    expect(own).toHaveTextContent("")
    const none = swatchOf(main.getByRole("link", { name: "Plain roadmap" }))
    expect(none.getAttribute("style")).toBeNull()
    // The placeholder is a theme token, not a tint (ADR-010).
    expect(none).toHaveClass("bg-border")
  })

  it("never puts a colour that isn't #rrggbb into a style", async () => {
    const main = await renderCards([
      createTestRoadmap("hostile", "Hostile roadmap", {
        colour: "red; background: url(https://example.com/x)",
      }),
    ])

    const swatch = swatchOf(
      await main.findByRole("link", { name: "Hostile roadmap" }),
    )
    expect(swatch.getAttribute("style")).toBeNull()
  })
})
