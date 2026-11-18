import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { connected } from "@/test/connected-state"
import { DESKTOP_WIDTH } from "@/lib/use-media-query"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { openMore, roadmapFacts } from "../testing/roadmap-page"

// STY-059: a roadmap's page opens on one header block, on one left edge: the title, its
// facts, the Not published tag with Publish roadmap for a roadmap not published, About
// this roadmap with its Edit, then Add an item, More and "Jump to".

const demographics = createTestRoadmap(
  "demographics",
  "Demographics and Identity (MPI, WDS, WAMS)",
  {
    statusLabel: { en: "Live", cy: "Byw" },
    productLead: "Sam Evans & Rhian Morgan",
    lastUpdated: "2026-11-04",
  },
)
const communityNursing = createTestRoadmap(
  "community-nursing",
  "Community Nursing",
  {
    published: false,
    statusLabel: { en: "Beta", cy: "" },
    productLead: "Sam Evans",
  },
)

function main() {
  return within(screen.getByRole("main"))
}

async function renderPage(
  roadmap: Roadmap,
  { language }: { language?: Language } = {},
) {
  const user = userEvent.setup()
  await renderWithProviders({
    path: `/roadmaps/${roadmap.id}`,
    authState: connected,
    repository: createInMemoryRoadmapRepository(
      [demographics, communityNursing],
      {
        [roadmap.id]: [createTestRoadmapItem("First now", { id: "item-1" })],
      },
    ),
    ...(language ? { language } : {}),
  })
  // Once the items are read, "Jump to" is among the controls.
  await main().findByRole("heading", { level: 3, name: "First now" })
  return user
}

/** Whether each of `elements` comes after the one before it in the document. */
function inDocumentOrder(elements: HTMLElement[]): boolean {
  return elements.every((element, at) => {
    const before = elements[at - 1]
    return (
      before === undefined ||
      Boolean(
        before.compareDocumentPosition(element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    )
  })
}

/** The three controls Tab reaches after About's Edit. */
async function tabsAfterEdit(
  user: ReturnType<typeof userEvent.setup>,
): Promise<(Element | null)[]> {
  button("Edit About this roadmap").focus()
  const reached: (Element | null)[] = []
  for (let press = 0; press < 3; press++) {
    await user.tab()
    reached.push(document.activeElement)
  }
  return reached
}

/** The page's button named exactly `name`. */
const button = (name: string) =>
  main().getByRole("button", { name: (accessible) => accessible === name })

describe("A roadmap's header block (STY-059)", () => {
  it("opens on the title, its facts, About with Edit, then Add an item, More and Jump to, with no link back (S1)", async () => {
    await renderPage(demographics)

    expect(
      inDocumentOrder([
        main().getByRole("heading", {
          level: 1,
          name: "Demographics and Identity (MPI, WDS, WAMS)",
        }),
        roadmapFacts(),
        button("About this roadmap"),
        button("Edit About this roadmap"),
        button("Add an item"),
        button("More"),
        button("Jump to"),
      ]),
    ).toBe(true)
    expect(button("About this roadmap")).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(
      within(roadmapFacts())
        .getAllByRole("listitem")
        .map((fact) => fact.textContent),
    ).toEqual([
      "Status: Live",
      "Product lead: Sam Evans & Rhian Morgan",
      "Updated 4 November 2026",
    ])
    expect(main().queryByRole("link", { name: /Back to/ })).toBeNull()
  })

  it("shows the title in the large heading size on a phone, today's from 640px (S3)", async () => {
    await renderPage(demographics)

    expect(main().getByRole("heading", { level: 1 })).toHaveClass(
      "text-heading-l",
      "sm:text-heading-xl",
    )
  })

  it("holds Unpublish roadmap in More for a published roadmap, and shows no Publish row (S6)", async () => {
    const user = await renderPage(demographics)

    expect(main().queryByText("Not published")).toBeNull()
    const menu = await openMore(user)
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Refresh", "Unpublish roadmap"])
  })

  it("puts the Not published tag and Publish roadmap under the facts, before About, and not in More (S6, D4)", async () => {
    const user = await renderPage(communityNursing)

    const publish = button("Publish roadmap")
    expect(publish.parentElement).toHaveTextContent(
      /^Not publishedPublish roadmap$/,
    )
    expect(
      inDocumentOrder([
        roadmapFacts(),
        main().getByText("Not published"),
        publish,
        button("About this roadmap"),
        button("Add an item"),
      ]),
    ).toBe(true)
    const menu = await openMore(user)
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Refresh"])
  })

  it("reaches Add an item, More and Jump to by Tab after Edit (S7)", async () => {
    const user = await renderPage(demographics)

    expect(await tabsAfterEdit(user)).toEqual([
      button("Add an item"),
      button("More"),
      button("Jump to"),
    ])
  })

  it("reaches Add an item, More, then the placement links by Tab after Edit on a desktop (S7, STY-060 S1)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const user = await renderPage(demographics)

    expect(await tabsAfterEdit(user)).toEqual([
      button("Add an item"),
      button("More"),
      main().getByRole("link", { name: "Recently delivered, no items" }),
    ])
  })

  it("is in Welsh (S8)", async () => {
    await renderPage(communityNursing, { language: "cy" })

    expect(
      main().getByRole("list", { name: "Manylion y map trywydd" }),
    ).toHaveTextContent("Statws: Beta")
    expect(
      main().getByRole("button", { name: "Ynglŷn â'r map trywydd hwn" }),
    ).toHaveAttribute("aria-expanded", "false")
    expect(main().getByText("Heb ei gyhoeddi").parentElement).toHaveTextContent(
      /^Heb ei gyhoeddiCyhoeddi'r map trywydd$/,
    )
  })
})

describe("One jump control per width (STY-060)", () => {
  it("is Jump to below a desktop, with no row of placement links (S1)", async () => {
    await renderPage(demographics)

    expect(button("Jump to")).toBeInTheDocument()
    expect(main().queryByRole("navigation")).toBeNull()
  })

  it("is the row of placement links from a desktop, after More, with no Jump to (S1)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    await renderPage(demographics)

    const links = main().getByRole("navigation", {
      name: "Horizons and sections",
    })
    expect(inDocumentOrder([button("More"), links])).toBe(true)
    expect(within(links).getAllByRole("link")).toHaveLength(6)
    expect(main().queryByRole("button", { name: /^Jump to/ })).toBeNull()
  })

  it("is the same in Welsh (S1)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    await renderPage(demographics, { language: "cy" })

    expect(
      main().getByRole("navigation", { name: "Gorwelion ac adrannau" }),
    ).toBeInTheDocument()
    expect(main().queryByRole("button", { name: /^Neidio i/ })).toBeNull()
  })
})
