import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { TABLET_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
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

/**
 * Renders the page on a phone, where "Jump to" is the jump control, or from a `tablet`'s width,
 * where the row of links is (STY-065 S6, S7).
 */
async function renderPage({
  pageItems = items,
  language,
  tablet = false,
}: { pageItems?: RoadmapItem[]; language?: Language; tablet?: boolean } = {}) {
  if (tablet) matchMediaQueries(TABLET_WIDTH)
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

/** The row of placement links, the jump control from a tablet's width. */
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
  it("lists the unplaced items and all six placements with their counts in Jump to's menu (S2, S4, S5, D3)", async () => {
    const user = await renderPage()

    const menu = await openJumpTo(user)
    expectNames(within(menu).getAllByRole("menuitem"), EVERY_TARGET)
  })

  it("lists them in the links from a tablet's width (S2, S4, S5, D3)", async () => {
    await renderPage({ tablet: true })

    expectNames(within(links()).getAllByRole("link"), EVERY_TARGET)
  })

  it("leaves the unplaced items out while there are none (S4)", async () => {
    await renderPage({ pageItems: items.slice(0, 3), tablet: true })

    expect(within(links()).getAllByRole("link")[0]).toHaveAccessibleName(
      "Recently delivered, no items",
    )
  })

  it("marks where a change is pending in the menu (S2)", async () => {
    const user = await renderPage()

    await editItemText(
      user,
      "Online booking",
      "Title",
      "Online booking for all",
    )

    const menu = await openJumpTo(user)
    expect(
      within(menu).getByRole("menuitem", { name: /^Later/ }),
    ).toHaveAccessibleName("Later, 1 item, unpublished changes")
    expect(
      within(menu).getByRole("menuitem", { name: /^Now/ }),
    ).toHaveAccessibleName("Now, 2 items")
  })

  it("marks where a change is pending in the links from a tablet's width (S2)", async () => {
    const user = await renderPage({ tablet: true })

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
  })

  describe("lines up its marks (STY-084)", () => {
    const WARNING = "svg.lucide-triangle-alert"
    const TICK = "svg.lucide-check"
    const DOT = '[data-slot="unpublished-dot"]'

    function row(menu: HTMLElement, name: RegExp) {
      return within(menu).getByRole("menuitem", { name })
    }

    it("keeps the dot's place on every row, hidden where nothing is pending (S2, D1)", async () => {
      const user = await renderPage()

      const menu = await openJumpTo(user)
      const dots = within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.querySelector(DOT))
      expect(dots).toHaveLength(7)
      dots.forEach((dot) => {
        expect(dot).toHaveClass("invisible")
      })
    })

    it("shows the dot only on a row with a pending change, the others keeping its place (S1)", async () => {
      const user = await renderPage()
      await editItemText(user, "Online booking", "Title", "Online booking 2")

      const menu = await openJumpTo(user)
      expect(row(menu, /^Later/).querySelector(DOT)).not.toHaveClass(
        "invisible",
      )
      expect(row(menu, /^Now/).querySelector(DOT)).toHaveClass("invisible")
      // The count, then the dot's place, then the screen reader's phrase, on both.
      for (const name of [/^Later/, /^Now/]) {
        const children = [...row(menu, name).children]
        expect(children.at(-3)).toHaveTextContent(/^\d+$/)
        expect(children.at(-2)).toBe(row(menu, name).querySelector(DOT))
        expect(children.at(-1)).toHaveClass("sr-only")
      }
    })

    it("puts the warning in the tick's place on the unplaced row, and the tick on the current one (S3, D2)", async () => {
      const user = await renderPage()
      // Scrolled to Now.
      const menu = await openJumpTo(user)
      await user.click(row(menu, /^Now/))
      await waitFor(() => {
        expect(jumpToButton("Jump to: Now")).toBeInTheDocument()
      })
      await user.click(jumpToButton("Jump to: Now"))
      const open = await screen.findByRole("menu")

      const unplaced = row(open, /^Not on the public roadmap/)
      expect(unplaced.firstElementChild).toHaveAttribute("aria-hidden", "true")
      expect(unplaced.firstElementChild).toHaveClass("lucide-triangle-alert")
      expect(unplaced.querySelectorAll(WARNING)).toHaveLength(1)
      expect(unplaced.querySelector(TICK)).toBeNull()
      expect(row(open, /^Now/).firstElementChild).toHaveClass("lucide-check")
      expect(row(open, /^Now/).firstElementChild).not.toHaveClass("invisible")
      // Every other row keeps an empty place for it.
      expect(row(open, /^Next/).firstElementChild).toHaveClass("invisible")
      expect(row(open, /^Next/).querySelector(WARNING)).toBeNull()
    })

    it("shows the tick, not the warning, on the unplaced row while it is current (S4, D2)", async () => {
      const user = await renderPage()
      const menu = await openJumpTo(user)
      await user.click(row(menu, /^Not on the public roadmap/))
      await waitFor(() => {
        expect(
          jumpToButton("Jump to: Not on the public roadmap"),
        ).toBeInTheDocument()
      })
      await user.click(jumpToButton("Jump to: Not on the public roadmap"))

      const unplaced = row(
        await screen.findByRole("menu"),
        /^Not on the public roadmap/,
      )
      expect(unplaced.firstElementChild).toHaveClass("lucide-check")
      expect(unplaced.firstElementChild).not.toHaveClass("invisible")
      expect(unplaced.querySelector(WARNING)).toBeNull()
    })

    it("reads each row as before, the empty place and the warning unannounced (S5)", async () => {
      const user = await renderPage()
      await editItemText(user, "Online booking", "Title", "Online booking 2")

      const menu = await openJumpTo(user)
      expectNames(within(menu).getAllByRole("menuitem"), [
        "Not on the public roadmap, 1 item",
        "Recently delivered, no items",
        "Now, 2 items",
        "Next, no items",
        "Later, 1 item, unpublished changes",
        "Delivered this year, no items",
        "Not doing, no items",
      ])
      for (const item of within(menu).getAllByRole("menuitem")) {
        for (const mark of item.querySelectorAll("svg, " + DOT)) {
          expect(mark).toHaveAttribute("aria-hidden", "true")
        }
      }
    })

    it("leaves the links with no place for a dot, and the warning before the name (S6, D3)", async () => {
      await renderPage({ tablet: true })

      expect(links().querySelector(DOT)).toBeNull()
      const unplaced = within(links()).getByRole("link", {
        name: /^Not on the public roadmap/,
      })
      expect(unplaced.firstElementChild).toHaveClass("lucide-triangle-alert")
      expect(links().querySelector(TICK)).toBeNull()
    })
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

    await user.click(jumpToButton("Jump to: Later"))
    expect(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: /^Later/,
      }),
    ).toHaveAttribute("aria-current", "location")
  })

  it("moves focus to the heading from a link, marks it the current one, and keeps the address (S1, S3, D8)", async () => {
    const user = await renderPage({ tablet: true })
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
    expect(link).toHaveAttribute("aria-current", "location")
    expect(window.location.href).toBe(address)
  })

  it("names no placement once the one jumped to has gone from the page (S3)", async () => {
    const user = await renderPage()
    const menu = await openJumpTo(user)
    await user.click(
      within(menu).getByRole("menuitem", {
        name: /^Not on the public roadmap/,
      }),
    )
    await waitFor(() => {
      expect(
        jumpToButton("Jump to: Not on the public roadmap"),
      ).toBeInTheDocument()
    })

    // Its one item given a placement, the unplaced items go.
    await user.click(main().getByRole("button", { name: "Move Someday item" }))
    await user.click(await screen.findByRole("menuitem", { name: "Now" }))

    await waitFor(() => {
      expect(jumpToButton("Jump to")).toBeInTheDocument()
    })
  })

  it("reaches an empty placement, which offers its first item (S5, STY-080 S1)", async () => {
    const user = await renderPage({ tablet: true })

    await user.click(within(links()).getByRole("link", { name: /^Not doing/ }))

    const notDoing = main().getByRole("heading", {
      level: 2,
      name: "Not doing",
    })
    expect(notDoing).toHaveFocus()
    expect(notDoing.parentElement?.nextElementSibling).toHaveTextContent(
      "Add the first item",
    )
  })

  for (const tablet of [false, true]) {
    it(`shows no navigation for a roadmap with no items, which has nowhere to jump${tablet ? ", from a tablet's width" : ""}`, async () => {
      await renderPage({ pageItems: [], tablet })

      expect(
        main().queryByRole("button", { name: /^Jump to/ }),
      ).not.toBeInTheDocument()
      expect(main().queryByRole("navigation")).not.toBeInTheDocument()
    })
  }

  it("is Welsh, its names and counts, in Jump to (S7)", async () => {
    const user = await renderPage({ language: "cy" })

    await user.click(main().getByRole("button", { name: "Neidio i" }))
    const menu = await screen.findByRole("menu")
    expect(
      within(menu).getByRole("menuitem", { name: /^Nawr/ }),
    ).toHaveAccessibleName("Nawr, 2 eitem")
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

  it("is Welsh in the links from a tablet's width (S7)", async () => {
    await renderPage({ language: "cy", tablet: true })

    expect(
      within(
        main().getByRole("navigation", { name: "Gorwelion ac adrannau" }),
      ).getByRole("link", { name: /^Nawr/ }),
    ).toHaveAccessibleName("Nawr, 2 eitem")
  })
})
