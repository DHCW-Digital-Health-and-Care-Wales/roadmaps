import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { editItemText } from "../testing/item-dialog"

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

const items: RoadmapItem[] = [
  createTestRoadmapItem("First now", { id: "item-1" }),
  createTestRoadmapItem("Second now", { id: "item-2" }),
  createTestRoadmapItem("Online booking", { id: "item-3", placement: "later" }),
  createTestRoadmapItem("Someday item", {
    id: "item-4",
    placement: null,
    writtenHorizon: "Soon",
  }),
]

function main() {
  return within(screen.getByRole("main"))
}

async function renderPage({
  pageItems = items,
  language,
}: { pageItems?: RoadmapItem[]; language?: Language } = {}) {
  const user = userEvent.setup()
  await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository: createInMemoryRoadmapRepository(roadmaps, {
      producta: pageItems,
    }),
    ...(language ? { language } : {}),
  })
  // Its items' cards, or the panel that stands in for none.
  await (pageItems.length > 0
    ? main().findAllByRole("heading", { level: 3 })
    : main().findByText("No items yet"))
  return user
}

function jumpToButton(name: string | RegExp = "Jump to") {
  return main().getByRole("button", { name })
}

/** The row of links under "About this roadmap". */
function links() {
  return main().getByRole("navigation", { name: "Horizons and sections" })
}

async function openJumpTo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(jumpToButton())
  return screen.findByRole("menu")
}

/** Each of `elements` has the accessible name `names` gives it, in order. */
function expectNames(elements: HTMLElement[], names: readonly string[]) {
  expect(elements).toHaveLength(names.length)
  elements.forEach((element, at) => {
    expect(element).toHaveAccessibleName(names[at])
  })
}

const EVERY_TARGET = [
  "Not on the public roadmap, 1 item",
  "Recently delivered, no items",
  "Now, 2 items",
  "Next, no items",
  "Later, 1 item",
  "Delivered this year, no items",
  "Not doing, no items",
]

describe("Jumping between a roadmap's placements (STY-053)", () => {
  it("lists the unplaced items and all six placements with their counts, in the menu and the links (S2, S4, S5, D3, D5)", async () => {
    const user = await renderPage()

    expectNames(within(links()).getAllByRole("link"), EVERY_TARGET)
    const menu = await openJumpTo(user)
    expectNames(within(menu).getAllByRole("menuitem"), EVERY_TARGET)
  })

  it("leaves the unplaced items out while there are none (S4)", async () => {
    await renderPage({ pageItems: items.slice(0, 3) })

    expect(within(links()).getAllByRole("link")[0]).toHaveAccessibleName(
      "Recently delivered, no items",
    )
  })

  it("marks where a change is pending, in the menu and the links (S2)", async () => {
    const user = await renderPage()

    await editItemText(
      user,
      "Online booking",
      "Title",
      "Online booking for all",
    )

    expect(
      within(links()).getByRole("link", { name: /^Later/ }),
    ).toHaveAccessibleName("Later, 1 item, unpublished changes")
    expect(
      within(links()).getByRole("link", { name: /^Now/ }),
    ).toHaveAccessibleName("Now, 2 items")
    const menu = await openJumpTo(user)
    expect(
      within(menu).getByRole("menuitem", { name: /^Later/ }),
    ).toHaveAccessibleName("Later, 1 item, unpublished changes")
  })

  it("moves focus to the placement's heading from the menu, and names it the current one (S1, S3)", async () => {
    const user = await renderPage()

    const menu = await openJumpTo(user)
    await user.click(within(menu).getByRole("menuitem", { name: /^Later/ }))

    const later = main().getByRole("heading", { level: 2, name: "Later" })
    await waitFor(() => {
      expect(later).toHaveFocus()
    })
    expect(jumpToButton("Jump to: Later")).toBeInTheDocument()
    expect(
      within(links()).getByRole("link", { name: /^Later/ }),
    ).toHaveAttribute("aria-current", "location")

    await user.click(jumpToButton("Jump to: Later"))
    expect(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: /^Later/,
      }),
    ).toHaveAttribute("aria-current", "location")
  })

  it("moves focus to the heading from a link, without changing the address (S1, D8)", async () => {
    const user = await renderPage()
    const address = window.location.href
    const link = within(links()).getByRole("link", {
      name: /^Not on the public roadmap/,
    })
    // Its address is the roadmap's own, so one opened in a new tab opens it.
    expect(link).toHaveAttribute(
      "href",
      expect.stringMatching(/\/roadmaps\/producta$/),
    )

    await user.click(link)

    expect(
      main().getByRole("heading", {
        level: 2,
        name: "Not on the public roadmap",
      }),
    ).toHaveFocus()
    expect(window.location.href).toBe(address)
  })

  it("names no placement once the one jumped to has gone from the page (S3)", async () => {
    const user = await renderPage()
    await user.click(
      within(links()).getByRole("link", { name: /^Not on the public roadmap/ }),
    )
    expect(
      jumpToButton("Jump to: Not on the public roadmap"),
    ).toBeInTheDocument()

    // Its one item given a placement, the unplaced items go.
    await user.click(main().getByRole("button", { name: "Move Someday item" }))
    await user.click(await screen.findByRole("menuitem", { name: "Now" }))

    await waitFor(() => {
      expect(jumpToButton("Jump to")).toBeInTheDocument()
    })
  })

  it("reaches an empty placement, which says it has none (S5)", async () => {
    const user = await renderPage()

    await user.click(within(links()).getByRole("link", { name: /^Not doing/ }))

    const notDoing = main().getByRole("heading", {
      level: 2,
      name: "Not doing",
    })
    expect(notDoing).toHaveFocus()
    expect(notDoing.parentElement?.nextElementSibling).toHaveTextContent(
      "No items",
    )
  })

  it("shows no navigation for a roadmap with no items, which has nowhere to jump", async () => {
    await renderPage({ pageItems: [] })

    expect(
      main().queryByRole("button", { name: /^Jump to/ }),
    ).not.toBeInTheDocument()
    expect(main().queryByRole("navigation")).not.toBeInTheDocument()
  })

  it("is Welsh, its names and counts (S7)", async () => {
    const user = await renderPage({ language: "cy" })

    expect(
      within(
        main().getByRole("navigation", { name: "Gorwelion ac adrannau" }),
      ).getByRole("link", { name: /^Nawr/ }),
    ).toHaveAccessibleName("Nawr, 2 eitem")
    await user.click(main().getByRole("button", { name: "Neidio i" }))
    const menu = await screen.findByRole("menu")
    await user.click(within(menu).getByRole("menuitem", { name: /^Hwyrach/ }))
    await waitFor(() => {
      expect(
        main().getByRole("heading", { level: 2, name: "Hwyrach" }),
      ).toHaveFocus()
    })
    expect(
      main().getByRole("button", { name: "Neidio i: Hwyrach" }),
    ).toBeInTheDocument()
  })
})
