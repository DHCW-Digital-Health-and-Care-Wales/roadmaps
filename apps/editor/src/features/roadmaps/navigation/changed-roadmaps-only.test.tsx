import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { disconnectFromHeader } from "@/features/auth/testing/account-menu"
import { DESKTOP_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { change } from "../testing/change-roadmap"
import { expectOpeningFocus } from "../testing/opening-focus"
import { recordSayings } from "../testing/record-sayings"
import { TYPING_PAUSE_MS } from "./navigation-search-provider"

// STY-063: with two or more roadmaps changed, the navigation's count is a button that
// shows only those roadmaps, and every roadmap again once pressed again; on a desktop
// unless a test says otherwise. The count's other forms (a link to the one roadmap with
// changes, text on its page and while the roadmaps are unread) are held in
// `unpublished-changes.test.tsx`.

const care = { en: "Care Closer to Home", cy: "Gofal yn Nes at Adref" }
const single = { en: "Single Record", cy: "Cofnod Sengl" }
const ROADMAPS = [
  createTestRoadmap("producta", "Product A roadmap", { family: care }),
  createTestRoadmap("productb", "Product B roadmap", { family: care }),
  createTestRoadmap("productc", "Product C roadmap", { family: single }),
  createTestRoadmap("carers", "Carers' register"),
]
const ROADMAP_ITEMS = {
  producta: [createTestRoadmapItem("A item", { id: "a-1" })],
  productb: [createTestRoadmapItem("B item", { id: "b-1" })],
  productc: [createTestRoadmapItem("C item", { id: "c-1" })],
  carers: [createTestRoadmapItem("D item", { id: "d-1" })],
}
const CHANGED_TEXT = "2 roadmaps have unpublished changes"

afterEach(() => {
  localStorage.clear()
})

/** The navigation, beside the page or in the drawer that holds it. */
const navigation = () =>
  screen.getByRole("navigation", { name: "Roadmaps", hidden: true })
const count = () =>
  within(navigation()).getByRole("button", { name: CHANGED_TEXT })
const searchBox = () =>
  within(navigation()).getByRole("searchbox", { name: "Search roadmaps" })
/** A name, with or without what a dot adds to it, or a rail's initials. */
const named = (name: string) =>
  new RegExp(`(^|\\s)${name.replace(/[']/g, ".")}(, unpublished changes)?$`)
const link = (name: string) =>
  within(navigation()).getByRole("link", { name: named(name) })
const hasLink = (name: string) =>
  within(navigation()).queryByRole("link", { name: named(name) }) !== null

/**
 * What `said` holds of the navigation's live region: not the shell's, which says the
 * count (`unpublished-changes.test.tsx`).
 */
const spoken = (said: readonly string[]) =>
  said.filter((text) => !text.endsWith("have unpublished changes"))

/** Renders the shell with Product A and Product B changed, on the families page. */
async function renderChanged() {
  const user = userEvent.setup()
  const rendered = await renderWithProviders({
    authState: connected,
    roadmaps: ROADMAPS,
    roadmapItems: ROADMAP_ITEMS,
    path: "/families",
  })
  await change(user, rendered.router, "producta", "A item")
  await change(user, rendered.router, "productb", "B item")
  await act(() => rendered.router.navigate({ to: "/families" }))
  // The shell says so, as the navigation may be a closed drawer.
  await screen.findAllByText(CHANGED_TEXT)
  return { user, ...rendered }
}

describe("the count on a desktop", () => {
  it("shows only the roadmaps with changes, empties the search and keeps focus, saying so (S1)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user } = await renderChanged()
    await user.type(searchBox(), "product")
    expect(hasLink("Product C roadmap")).toBe(true)
    const said = recordSayings()
    expect(count()).toHaveAttribute("aria-pressed", "false")

    await user.click(count())

    expect(searchBox()).toHaveValue("")
    expect(hasLink("Product A roadmap")).toBe(true)
    expect(hasLink("Product B roadmap")).toBe(true)
    expect(hasLink("Product C roadmap")).toBe(false)
    expect(hasLink("Carers' register")).toBe(false)
    // Each under its family's name, as plain headings.
    expect(
      within(navigation()).getByRole("list", { name: care.en }),
    ).toHaveTextContent("Product A roadmap")
    expect(
      within(navigation()).queryByRole("button", { name: care.en }),
    ).not.toBeInTheDocument()
    expect(count()).toHaveAttribute("aria-pressed", "true")
    expect(count()).toHaveFocus()
    expect(spoken(said)).toEqual([
      "Showing only the 2 roadmaps with unpublished changes",
    ])
  })

  it("shows every roadmap again when pressed again, with the search still empty (S2)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user } = await renderChanged()
    await user.click(count())
    const said = recordSayings()

    await user.click(count())

    expect(count()).toHaveAttribute("aria-pressed", "false")
    expect(count()).toHaveFocus()
    expect(searchBox()).toHaveValue("")
    expect(hasLink("Product C roadmap")).toBe(true)
    expect(hasLink("Carers' register")).toBe(true)
    expect(spoken(said)).toEqual(["Showing all roadmaps"])
  })

  it("keeps the closed families as they were (S2)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user } = await renderChanged()
    await user.click(
      within(navigation()).getByRole("button", { name: single.en }),
    )
    expect(hasLink("Product C roadmap")).toBe(false)

    await user.click(count())
    await user.click(count())

    expect(hasLink("Product C roadmap")).toBe(false)
    expect(
      within(navigation()).getByRole("button", { name: single.en }),
    ).toHaveAttribute("aria-expanded", "false")
  })

  it("lets go as the Product Lead types, and the search narrows the list (S3)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user } = await renderChanged()
    await user.click(count())

    await user.type(searchBox(), "carers")

    expect(count()).toHaveAttribute("aria-pressed", "false")
    expect(hasLink("Carers' register")).toBe(true)
    expect(hasLink("Product A roadmap")).toBe(false)
  })

  it("keeps the count pressed for spaces alone, saying nothing (S3)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user } = await renderChanged()
    await user.click(count())

    await user.type(searchBox(), "  ")
    await new Promise((resolve) => setTimeout(resolve, TYPING_PAUSE_MS + 200))

    expect(count()).toHaveAttribute("aria-pressed", "true")
    expect(hasLink("Product C roadmap")).toBe(false)
    // The live region still holds what it said as the count was pressed.
    expect(
      screen.getByText("Showing only the 2 roadmaps with unpublished changes"),
    ).toBeInTheDocument()
    expect(screen.queryByText("Showing all roadmaps")).not.toBeInTheDocument()
  })

  it("says every roadmap shows once, though spaces were typed just before pressing it again (S2, S3)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user } = await renderChanged()
    await user.click(count())
    // Each saying is a new span, so words said again are new to a screen reader.
    let sayings = 0
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.textContent === "Showing all roadmaps") sayings += 1
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    await user.type(searchBox(), "  ")
    await user.click(count())
    await new Promise((resolve) => setTimeout(resolve, TYPING_PAUSE_MS + 200))
    observer.disconnect()

    expect(sayings).toBe(1)
  })

  it("shows every roadmap, and leads to the one left with changes, once fewer than two have changes (S4)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router } = await renderChanged()
    await user.click(count())

    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "productb" },
      }),
    )
    await user.click(
      within(screen.getByRole("main")).getByRole("button", {
        name: "Discard all changes",
      }),
    )
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Discard all changes",
      }),
    )

    await waitFor(() => {
      expect(hasLink("Product C roadmap")).toBe(true)
    })
    expect(hasLink("Carers' register")).toBe(true)
    expect(
      within(navigation()).getByRole("link", {
        name: "1 roadmap has unpublished changes",
      }),
    ).toHaveAttribute("href", "/roadmaps/producta")
    // The narrowing does not come back with a second roadmap's changes.
    await change(user, router, "productc", "C item")
    expect(count()).toHaveAttribute("aria-pressed", "false")
    expect(hasLink("Carers' register")).toBe(true)
  })

  it("lasts while moving between pages (S6)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router } = await renderChanged()
    await user.click(count())

    await user.click(link("Product B roadmap"))

    expect(router.state.location.pathname).toBe("/roadmaps/productb")
    expect(count()).toHaveAttribute("aria-pressed", "true")
    expect(hasLink("Product C roadmap")).toBe(false)
  })

  it("is text, with nothing to press, once the roadmaps are unread (S9)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user } = await renderChanged()
    await user.click(count())

    await disconnectFromHeader(user)
    await user.click(
      screen.getByRole("button", { name: "Keep changes and disconnect" }),
    )

    await waitFor(() => {
      expect(hasLink("Product A roadmap")).toBe(false)
    })
    expect(
      within(navigation()).queryByRole("button", { name: CHANGED_TEXT }),
    ).not.toBeInTheDocument()
    expect(within(navigation()).getByText(CHANGED_TEXT)).toBeInTheDocument()
  })
})

describe("the count folded to a rail", () => {
  it("opens the navigation, remembered as open, narrowed, with the count pressed and in focus (S7)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    localStorage.setItem("roadmaps.navigation", "folded")
    const { user } = await renderChanged()
    // The circle carries no pressed state, and the rail lists every roadmap.
    const circle = within(navigation()).getByRole("button", {
      name: CHANGED_TEXT,
    })
    expect(circle).not.toHaveAttribute("aria-pressed")
    expect(hasLink("Product C roadmap")).toBe(true)
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()

    await user.click(circle)

    expect(count()).toHaveAttribute("aria-pressed", "true")
    await expectOpeningFocus(() => count())
    expect(hasLink("Product C roadmap")).toBe(false)
    expect(hasLink("Product A roadmap")).toBe(true)
    expect(localStorage.getItem("roadmaps.navigation")).toBeNull()
  })

  it("opens it narrowed whether or not the count was pressed before (S7)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user } = await renderChanged()
    await user.click(count())
    await user.click(
      screen.getByRole("button", { name: "Fold the navigation" }),
    )
    expect(hasLink("Product C roadmap")).toBe(true)

    await user.click(
      within(navigation()).getByRole("button", { name: CHANGED_TEXT }),
    )

    expect(count()).toHaveAttribute("aria-pressed", "true")
    expect(hasLink("Product C roadmap")).toBe(false)
  })
})

describe("the count in the drawer on a phone", () => {
  it("leaves the drawer open and the desktop's fold alone, and choosing a roadmap closes it (S6)", async () => {
    localStorage.setItem("roadmaps.navigation", "folded")
    const { user, router } = await renderChanged()
    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: `Menu, ${CHANGED_TEXT}`,
      }),
    )
    await screen.findByRole("dialog", { name: "Menu" })

    await user.click(count())

    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument()
    expect(count()).toHaveAttribute("aria-pressed", "true")
    expect(hasLink("Product C roadmap")).toBe(false)
    expect(localStorage.getItem("roadmaps.navigation")).toBe("folded")

    await user.click(link("Product B roadmap"))

    expect(router.state.location.pathname).toBe("/roadmaps/productb")
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})

describe("in Welsh", () => {
  it("names the count and says what shows with the noun in its right form", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, i18n } = await renderChanged()
    await act(() => i18n.changeLanguage("cy"))
    const said = recordSayings()

    await user.click(
      within(
        screen.getByRole("navigation", { name: "Mapiau trywydd" }),
      ).getByRole("button", { name: /heb eu cyhoeddi$/ }),
    )

    expect(spoken(said)).toEqual([
      "Yn dangos y 2 fap trywydd â newidiadau heb eu cyhoeddi yn unig",
    ])
  })
})
