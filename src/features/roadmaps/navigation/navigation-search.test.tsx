import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { DESKTOP_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { expectOpeningFocus } from "../testing/opening-focus"

// STY-061: the search at the top of the shell's navigation, narrowing the roadmaps as
// the Product Lead types, on a desktop unless a test says otherwise. What the navigation
// lists unsearched is held in `roadmap-navigation.test.tsx`.

const citizen = { en: "Citizen Services", cy: "Gwasanaethau Dinasyddion" }
const medicines = {
  en: "Medicines & Diagnostics",
  cy: "Meddyginiaethau a Diagnosteg",
}
const single = { en: "Single Record", cy: "Cofnod Sengl" }
const ROADMAPS = [
  createTestRoadmap("ffon", "Ffôn Iechyd helpline", { family: citizen }),
  createTestRoadmap("online", "Prescriptions online", { family: citizen }),
  createTestRoadmap("eprescribing", "Electronic prescribing", {
    family: medicines,
  }),
  createTestRoadmap("viewer", "Care record viewer", { family: single }),
  createTestRoadmap("plans", "Shared care plans", {
    family: single,
    title: { en: "Shared care plans", cy: "Cynlluniau gofal a rennir" },
  }),
  createTestRoadmap("carers", "Carers' register"),
]
const EVERY_LINK = [
  "All roadmaps",
  "Ffôn Iechyd helpline",
  "Prescriptions online",
  "Electronic prescribing",
  "Care record viewer",
  "Shared care plans",
  "Carers' register",
  "Families, categories and organisations",
]

afterEach(() => {
  localStorage.clear()
})

const navigation = () => screen.getByRole("navigation", { name: "Roadmaps" })
const searchBox = () =>
  within(navigation()).getByRole("searchbox", { name: "Search roadmaps" })

async function renderSearch(
  options: Parameters<typeof renderWithProviders>[0] = {},
) {
  matchMediaQueries(DESKTOP_WIDTH)
  const rendered = await renderWithProviders({
    authState: connected,
    roadmaps: ROADMAPS,
    ...options,
  })
  await within(navigation()).findByRole("link", { name: "Carers' register" })
  return rendered
}

/** The navigation's link names, in order. */
function linkNames() {
  return within(navigation())
    .getAllByRole("link")
    .map((link) => link.textContent)
}

/**
 * Everything the page's live regions say from now on, in order: the search's and the
 * shell's, which are always in the page.
 */
function recordSayings(): string[] {
  const said: string[] = []
  const observer = new MutationObserver(() => {
    for (const region of document.querySelectorAll("[aria-live=polite]")) {
      const text = region.textContent
      if (text && said.at(-1) !== text) said.push(text)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })
  return said
}

describe("the navigation's search", () => {
  it("narrows the list as the Product Lead types, the part found underlined (S1)", async () => {
    const user = userEvent.setup()
    await renderSearch()

    await user.type(searchBox(), "prescri")

    expect(linkNames()).toEqual([
      "All roadmaps",
      "Prescriptions online",
      "Electronic prescribing",
      "Families, categories and organisations",
    ])
    // Each under its family's name.
    const nav = within(navigation())
    expect(
      nav.getByRole("list", { name: "Citizen Services" }),
    ).toHaveTextContent("Prescriptions online")
    expect(
      nav.getByRole("list", { name: "Medicines & Diagnostics" }),
    ).toHaveTextContent("Electronic prescribing")
    expect(
      nav
        .getAllByRole("link")
        .flatMap((link) =>
          [...link.querySelectorAll(".underline")].map(
            (part) => part.textContent,
          ),
        ),
    ).toEqual(["Prescri", "prescri"])
  })

  it("finds titles without case or accents (S2)", async () => {
    const user = userEvent.setup()
    await renderSearch()

    await user.type(searchBox(), "ffon")
    expect(linkNames()).toEqual([
      "All roadmaps",
      "Ffôn Iechyd helpline",
      "Families, categories and organisations",
    ])

    await user.clear(searchBox())
    await user.type(searchBox(), "CARE")
    expect(linkNames()).toEqual([
      "All roadmaps",
      "Care record viewer",
      "Shared care plans",
      "Carers' register",
      "Families, categories and organisations",
    ])
  })

  it("finds every roadmap of a family by the family's name (S3)", async () => {
    const user = userEvent.setup()
    await renderSearch()

    await user.type(searchBox(), "single")

    expect(linkNames()).toEqual([
      "All roadmaps",
      "Care record viewer",
      "Shared care plans",
      "Families, categories and organisations",
    ])
  })

  it("says when no roadmap matches, and shows no family (S4)", async () => {
    const user = userEvent.setup()
    await renderSearch()

    await user.type(searchBox(), "xyz")

    const nav = within(navigation())
    expect(nav.getByText("No roadmaps match “xyz”")).toBeInTheDocument()
    expect(nav.queryByRole("list", { name: /Citizen/ })).not.toBeInTheDocument()
    expect(linkNames()).toEqual([
      "All roadmaps",
      "Families, categories and organisations",
    ])
  })

  it("empties on Escape, showing every roadmap with focus in the search (S5)", async () => {
    const user = userEvent.setup()
    await renderSearch()
    await user.type(searchBox(), "care")
    const said = recordSayings()

    await user.keyboard("{Escape}")

    expect(searchBox()).toHaveValue("")
    expect(searchBox()).toHaveFocus()
    expect(linkNames()).toEqual(EVERY_LINK)
    await waitFor(() => {
      expect(said).toEqual(["Showing all roadmaps"])
    })
  })

  it("empties from its clear button, moving focus to the search (S5)", async () => {
    const user = userEvent.setup()
    await renderSearch()
    await user.type(searchBox(), "care")

    await user.click(
      within(navigation()).getByRole("button", { name: "Clear search" }),
    )

    expect(searchBox()).toHaveValue("")
    expect(searchBox()).toHaveFocus()
    expect(linkNames()).toEqual(EVERY_LINK)
    expect(
      within(navigation()).queryByRole("button", { name: "Clear search" }),
    ).not.toBeInTheDocument()
  })

  it("tells a screen reader how many match once, after typing pauses (S6)", async () => {
    const user = userEvent.setup()
    await renderSearch()
    const said = recordSayings()

    await user.type(searchBox(), "care")

    // Nothing as each key is typed.
    expect(said).toEqual([])
    await waitFor(() => {
      expect(said).toEqual(["3 roadmaps match"])
    })
  })

  it("lasts while moving between pages (S7)", async () => {
    const user = userEvent.setup()
    const { router } = await renderSearch()
    await user.type(searchBox(), "care")

    await user.click(
      within(navigation()).getByRole("link", { name: "Shared care plans" }),
    )

    expect(router.state.location.pathname).toBe("/roadmaps/plans")
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus()
    })
    expect(searchBox()).toHaveValue("care")
    expect(linkNames()).toEqual([
      "All roadmaps",
      "Care record viewer",
      "Shared care plans",
      "Carers' register",
      "Families, categories and organisations",
    ])
  })

  it("leads the top row inside the landmark, the fold button after it (S8)", async () => {
    const user = userEvent.setup()
    await renderSearch()

    searchBox().focus()
    await user.tab()

    expect(
      within(navigation()).getByRole("button", {
        name: "Fold the navigation",
      }),
    ).toHaveFocus()
  })

  describe("folded to a rail (S9, D4)", () => {
    it("shows a spyglass above the button that opens it, and every roadmap whatever the search", async () => {
      const user = userEvent.setup()
      await renderSearch()
      await user.type(searchBox(), "care")

      await user.click(
        within(navigation()).getByRole("button", {
          name: "Fold the navigation",
        }),
      )

      expect(
        within(navigation())
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Search roadmaps", "Open the navigation"])
      expect(within(navigation()).getAllByRole("link")).toHaveLength(
        EVERY_LINK.length,
      )
    })

    it("opens the navigation from its spyglass, remembered, with focus in the search", async () => {
      const user = userEvent.setup()
      localStorage.setItem("roadmaps.navigation", "folded")
      matchMediaQueries(DESKTOP_WIDTH)
      await renderWithProviders({ authState: connected, roadmaps: ROADMAPS })

      await user.click(
        await within(navigation()).findByRole("button", {
          name: "Search roadmaps",
        }),
      )

      await expectOpeningFocus(searchBox())
      // Remembered as open: the fold is forgotten.
      expect(localStorage.getItem("roadmaps.navigation")).toBeNull()
    })
  })

  it("does not show before the roadmaps are read, open or folded (S11, D6)", async () => {
    const user = userEvent.setup()
    matchMediaQueries(DESKTOP_WIDTH)
    await renderWithProviders({ authState: { status: "ready" } })
    expect(
      within(navigation()).queryByRole("searchbox"),
    ).not.toBeInTheDocument()

    await user.click(
      within(navigation()).getByRole("button", { name: "Fold the navigation" }),
    )

    expect(
      within(navigation())
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Open the navigation"])
  })

  it("speaks Welsh, finding a roadmap by its Welsh title (S12)", async () => {
    const user = userEvent.setup()
    matchMediaQueries(DESKTOP_WIDTH)
    await renderWithProviders({
      authState: connected,
      roadmaps: ROADMAPS,
      language: "cy",
    })
    const nav = within(
      screen.getByRole("navigation", { name: "Mapiau trywydd" }),
    )

    const box = await nav.findByRole("searchbox", {
      name: "Chwilio mapiau trywydd",
    })
    expect(box).toHaveAttribute("placeholder", "Chwilio")
    await user.type(box, "gofal")

    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Pob map trywydd",
      "Cynlluniau gofal a rennir",
      "Teuluoedd, categorïau a sefydliadau",
    ])
  })
})

describe("in the phone's drawer (S10, D5, D7)", () => {
  const menuButton = () =>
    within(screen.getByRole("banner")).getByRole("button", { name: "Menu" })

  async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
    await user.click(menuButton())
    const drawer = await screen.findByRole("dialog", { name: "Menu" })
    await within(drawer).findByRole("link", { name: "Carers' register" })
    return drawer
  }

  it("shares the top row with Close menu, which takes focus as it opens", async () => {
    const user = userEvent.setup()
    await renderWithProviders({ authState: connected, roadmaps: ROADMAPS })

    const drawer = await openDrawer(user)

    const close = within(drawer).getByRole("button", { name: "Close menu" })
    await expectOpeningFocus(close)
    expect(within(navigation()).getByRole("searchbox")).toBeInTheDocument()
    expect(navigation()).toContainElement(close)
  })

  it("clears its text on Escape, and closes the drawer on Escape once empty", async () => {
    const user = userEvent.setup()
    await renderWithProviders({ authState: connected, roadmaps: ROADMAPS })
    await openDrawer(user)
    await user.type(searchBox(), "care")

    await user.keyboard("{Escape}")

    expect(searchBox()).toHaveValue("")
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument()

    await user.keyboard("{Escape}")

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("closes on a choice, and holds the search when it opens again", async () => {
    const user = userEvent.setup()
    await renderWithProviders({ authState: connected, roadmaps: ROADMAPS })
    await openDrawer(user)
    await user.type(searchBox(), "care")

    await user.click(
      within(navigation()).getByRole("link", { name: "Shared care plans" }),
    )
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    await user.click(menuButton())
    await screen.findByRole("dialog", { name: "Menu" })

    expect(searchBox()).toHaveValue("care")
    expect(
      within(navigation()).queryByRole("link", {
        name: "Ffôn Iechyd helpline",
      }),
    ).not.toBeInTheDocument()
  })
})
