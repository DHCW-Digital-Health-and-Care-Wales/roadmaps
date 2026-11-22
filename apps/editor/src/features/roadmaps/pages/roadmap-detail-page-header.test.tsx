import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { findReconnectDialog } from "@/features/auth/testing/reconnect-dialog"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { connected } from "@/test/connected-state"
import { DESKTOP_WIDTH, TABLET_WIDTH } from "@/lib/use-media-query"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { expectDialogClosed } from "../testing/edit-dialog"
import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { editRoadmapDialog } from "../testing/roadmap-dialog"
import { moreButton, openMore, roadmapFacts } from "../testing/roadmap-page"

// STY-065: a roadmap's page opens on three rows: the title with its actions, one line of
// facts ending in "Product details", then the jump control; a roadmap not published has
// one notice with Publish roadmap under the facts. (Supersedes STY-059's header block.)

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
  const { authClient } = await renderWithProviders({
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
  // Once the items are read, the jump control is among the controls.
  await main().findByRole("heading", { level: 3, name: "First now" })
  return Object.assign(user, { authClient })
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

/** Tab reaches each of `stops`, in order, from `start`. */
async function expectTabs(
  user: ReturnType<typeof userEvent.setup>,
  start: HTMLElement,
  stops: HTMLElement[],
) {
  start.focus()
  for (const stop of stops) {
    await user.tab()
    expect(document.activeElement).toBe(stop)
  }
}

/** The page's button named exactly `name`. */
const button = (name: string) =>
  main().getByRole("button", { name: (accessible) => accessible === name })

describe("A roadmap's header block (STY-065)", () => {
  it("opens on the title, its facts ending in Product details, then Add an item, More and Jump to, narrower than a tablet, with no Edit, tag or link back (S1, S7)", async () => {
    await renderPage(demographics)

    expect(
      inDocumentOrder([
        main().getByRole("heading", {
          level: 1,
          name: "Demographics and Identity (MPI, WDS, WAMS)",
        }),
        roadmapFacts(),
        button("Product details"),
        button("Add an item"),
        button("More"),
        button("Jump to"),
      ]),
    ).toBe(true)
    expect(button("Product details")).toHaveAttribute("aria-expanded", "false")
    expect(
      main().queryByRole("button", { name: /^Edit Product details/ }),
    ).toBeNull()
    expect(main().queryByRole("button", { name: /Publish/ })).toBeNull()
    expect(main().queryByText("Changed")).toBeNull()
    expect(main().queryByRole("link", { name: /Back to/ })).toBeNull()
  })

  it("holds the facts as plain text in one list named Roadmap details, ending in Product details (S2)", async () => {
    await renderPage(demographics)

    const items = within(roadmapFacts()).getAllByRole("listitem")
    expect(items.map((fact) => fact.textContent)).toEqual([
      "Status: Live",
      "Product lead: Sam Evans & Rhian Morgan",
      "Updated 4 November 2026",
      "Product details",
    ])
    expect(
      within(items[0] ?? roadmapFacts()).getByText("Live"),
    ).not.toHaveAttribute("data-slot", "badge")
    expect(items.at(-1)).toContainElement(button("Product details"))
  })

  it("leaves out a fact the roadmap has not got, keeping Product details last (S2)", async () => {
    await renderPage(communityNursing)

    expect(
      within(roadmapFacts())
        .getAllByRole("listitem")
        .map((fact) => fact.textContent),
    ).toEqual(["Status: Beta", "Product lead: Sam Evans", "Product details"])
  })

  it("shows the title in the large heading size on a phone, today's from 640px (STY-059 S3)", async () => {
    await renderPage(demographics)

    expect(main().getByRole("heading", { level: 1 })).toHaveClass(
      "text-heading-l",
      "sm:text-heading-xl",
    )
  })

  it("shows no Not published notice for a published roadmap (S4)", async () => {
    await renderPage(demographics)

    expect(main().queryByText("Not published")).toBeNull()
    expect(
      main().queryByText("The public site doesn't show this roadmap."),
    ).toBeNull()
    expect(main().queryByRole("button", { name: "Publish roadmap" })).toBeNull()
  })

  it("puts one notice under the facts for a roadmap not published, reading Not published and what it means, with Publish roadmap (S4)", async () => {
    await renderPage(communityNursing)

    const notice = main().getByText("Not published").closest("p")
    expect(notice).toHaveTextContent(
      "Not publishedThe public site doesn't show this roadmap.",
    )
    const publish = button("Publish roadmap")
    expect(publish.parentElement).toContainElement(notice)
    expect(
      inDocumentOrder([
        roadmapFacts(),
        main().getByText("Not published"),
        publish,
      ]),
    ).toBe(true)
    // One notice, not a tag as well.
    expect(main().getAllByText("Not published")).toHaveLength(1)
  })

  it("leaves Publish roadmap out of More at the top, where the notice has it (S4, STY-059 D7)", async () => {
    const user = await renderPage(communityNursing)

    const menu = await openMore(user)

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Edit product details", "Refresh"])
  })

  it("is in Welsh (S2, S4)", async () => {
    await renderPage(communityNursing, { language: "cy" })

    expect(
      main().getByRole("list", { name: "Manylion y map trywydd" }),
    ).toHaveTextContent("Statws: Beta")
    expect(
      main().getByRole("button", { name: "Manylion y cynnyrch" }),
    ).toHaveAttribute("aria-expanded", "false")
    expect(main().getByText("Heb ei gyhoeddi").closest("p")).toHaveTextContent(
      "Heb ei gyhoeddiDydy'r wefan gyhoeddus ddim yn dangos y map trywydd hwn.",
    )
    expect(
      main().getByRole("button", { name: "Cyhoeddi'r map trywydd" }),
    ).toBeInTheDocument()
  })
})

describe("More holds Edit product details (STY-065 S5)", () => {
  it("lists Edit product details, then Refresh, then Unpublish roadmap for a published roadmap", async () => {
    const user = await renderPage(demographics)

    const menu = await openMore(user)

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Edit product details", "Refresh", "Unpublish roadmap"])
  })

  it("opens the roadmap dialog with the product details closed, and returns focus to More as it closes", async () => {
    const user = await renderPage(demographics)

    const menu = await openMore(user)
    await user.click(
      within(menu).getByRole("menuitem", { name: "Edit product details" }),
    )

    const dialog = await screen.findByRole("dialog", {
      name: "Edit product details",
    })
    expect(dialog).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Product details", hidden: true }),
    ).toHaveAttribute("aria-expanded", "false")
    await user.click(
      editRoadmapDialog().getByRole("button", { name: "Cancel" }),
    )
    await expectDialogClosed()
    await waitFor(() => {
      expect(moreButton()).toHaveFocus()
    })
    expect(button("Product details")).toHaveAttribute("aria-expanded", "false")
  })

  it("opens it without asking to reconnect once the session has expired, as Edit in the details does", async () => {
    const user = await renderPage(demographics)
    act(() => {
      user.authClient.setState({ status: "expired" })
    })

    const menu = await openMore(user)
    await user.click(
      within(menu).getByRole("menuitem", { name: "Edit product details" }),
    )

    expect(
      await screen.findByRole("dialog", { name: "Edit product details" }),
    ).toBeVisible()
    expect(
      screen.queryByRole("alertdialog", { name: "Your session has expired" }),
    ).toBeNull()
  })

  it("asks to reconnect for Refresh once the session has expired (STY-057)", async () => {
    const user = await renderPage(demographics)
    act(() => {
      user.authClient.setState({ status: "expired" })
    })

    const menu = await openMore(user)
    await user.click(within(menu).getByRole("menuitem", { name: "Refresh" }))

    expect(await findReconnectDialog()).toBeVisible()
  })

  it("is named in Welsh (ADR-008)", async () => {
    const user = await renderPage(demographics, { language: "cy" })

    await user.click(main().getByRole("button", { name: "Mwy" }))
    const menu = await screen.findByRole("menu")

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Golygu manylion y cynnyrch",
      "Adnewyddu",
      "Dad-gyhoeddi'r map trywydd",
    ])
  })
})

describe("The header at each width (STY-065 S6, S7)", () => {
  it("reaches Add an item, More, Product details, then Jump to by Tab, narrower than a tablet (S7, D8)", async () => {
    const user = await renderPage(demographics)

    await expectTabs(user, main().getByRole("heading", { level: 1 }), [
      button("Product details"),
      button("Add an item"),
      button("More"),
      button("Jump to"),
    ])
  })

  it('names More "More" narrower than a tablet, though it shows an ellipsis (S7)', async () => {
    await renderPage(demographics)

    expect(moreButton()).toHaveAccessibleName("More")
    expect(moreButton().querySelector("svg")).toBeInTheDocument()
  })

  it("is Jump to narrower than a tablet, with no row of placement links (S7)", async () => {
    await renderPage(demographics)

    expect(button("Jump to")).toBeInTheDocument()
    expect(main().queryByRole("navigation")).toBeNull()
  })

  it("reaches Add an item, More, Product details, then the placement links by Tab from a tablet's width (S6, S10)", async () => {
    matchMediaQueries(TABLET_WIDTH)
    const user = await renderPage(demographics)

    await expectTabs(user, button("Add an item"), [
      button("More"),
      button("Product details"),
      main().getByRole("link", { name: "Recently delivered, no items" }),
    ])
  })

  it("reaches Publish roadmap between Product details and the placement links when it shows (S6, S10)", async () => {
    matchMediaQueries(TABLET_WIDTH)
    const user = await renderPage(communityNursing)

    await expectTabs(user, button("Add an item"), [
      button("More"),
      button("Product details"),
      button("Publish roadmap"),
      main().getByRole("link", { name: "Recently delivered, no items" }),
    ])
  })

  it("is the row of placement links from a tablet's width, after Product details, with no Jump to (S6)", async () => {
    matchMediaQueries(TABLET_WIDTH)
    await renderPage(demographics)

    const links = main().getByRole("navigation", {
      name: "Horizons and sections",
    })
    expect(
      inDocumentOrder([button("More"), button("Product details"), links]),
    ).toBe(true)
    expect(within(links).getAllByRole("link")).toHaveLength(6)
    expect(main().queryByRole("button", { name: /^Jump to/ })).toBeNull()
    expect(moreButton()).toHaveAccessibleName("More")
  })

  it("is the same beside the navigation on a desktop (S6)", async () => {
    matchMediaQueries(TABLET_WIDTH, DESKTOP_WIDTH)
    await renderPage(demographics)

    expect(
      main().getByRole("navigation", { name: "Horizons and sections" }),
    ).toBeInTheDocument()
    expect(main().queryByRole("button", { name: /^Jump to/ })).toBeNull()
  })

  it("is the row of placement links in Welsh too, with no Neidio i (S6)", async () => {
    matchMediaQueries(TABLET_WIDTH)
    await renderPage(demographics, { language: "cy" })

    expect(
      main().getByRole("navigation", { name: "Gorwelion ac adrannau" }),
    ).toBeInTheDocument()
    expect(main().queryByRole("button", { name: /^Neidio i/ })).toBeNull()
  })
})
