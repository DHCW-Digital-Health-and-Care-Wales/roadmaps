import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { DESKTOP_WIDTH } from "@/lib/use-media-query"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"

// What the shell's navigation lists (STY-054); the shell's drawer and fold are held in
// `components/layout/app-shell-navigation.test.tsx`. Rendered on a desktop, where the
// navigation stands beside the page.

const nursing = { en: "Care Closer to Home", cy: "Gofal yn Nes at Adref" }
const flow = { en: "Hospital Flow", cy: "Llif Ysbytai" }
const ROADMAPS = [
  createTestRoadmap("theatres", "Theatre Scheduling", {
    family: flow,
    colour: "#ffb81c",
  }),
  createTestRoadmap("pharmacy", "Pharmacy Stock"),
  createTestRoadmap("nursing", "Community Nursing roadmap", {
    title: {
      en: "Community Nursing roadmap",
      cy: "Map trywydd Nyrsio Cymunedol",
    },
    family: nursing,
    colour: "#007f3b",
  }),
  createTestRoadmap("beds", "Bed Management", { family: flow }),
]

afterEach(() => {
  localStorage.clear()
})

function navigation() {
  return screen.getByRole("navigation", { name: "Roadmaps" })
}

async function renderNavigation(
  options: Parameters<typeof renderWithProviders>[0] = {},
) {
  matchMediaQueries(DESKTOP_WIDTH)
  return renderWithProviders({
    authState: connected,
    roadmaps: ROADMAPS,
    ...options,
  })
}

/** The navigation's link names, in order. */
async function linkNames() {
  const nav = navigation()
  await within(nav).findByRole("link", { name: /Bed Management$/ })
  return within(nav)
    .getAllByRole("link")
    .map((link) => link.textContent)
}

describe("the shell's navigation", () => {
  it("lists all the roadmaps, then each roadmap by family as the list orders them, then families (D2, D3)", async () => {
    await renderNavigation()

    expect(await linkNames()).toEqual([
      "All roadmaps",
      "Community Nursing roadmap",
      "Bed Management",
      "Theatre Scheduling",
      "Pharmacy Stock",
      "Families, categories and organisations",
    ])
    const nav = within(navigation())
    expect(
      nav.getByRole("list", { name: "Hospital Flow" }).querySelectorAll("a"),
    ).toHaveLength(2)
    expect(
      nav.getByRole("list", { name: "No product family" }),
    ).toHaveTextContent("Pharmacy Stock")
  })

  it("names no family when no roadmap has one, as the list does", async () => {
    await renderNavigation({
      roadmaps: [createTestRoadmap("pharmacy", "Pharmacy Stock")],
    })

    await within(navigation()).findByRole("link", { name: "Pharmacy Stock" })
    expect(
      within(navigation()).queryByText("No product family"),
    ).not.toBeInTheDocument()
  })

  it("leads to each roadmap and to the families page", async () => {
    await renderNavigation()

    const nav = within(navigation())
    expect(
      await nav.findByRole("link", { name: "Bed Management" }),
    ).toHaveAttribute("href", "/roadmaps/beds")
    expect(nav.getByRole("link", { name: "All roadmaps" })).toHaveAttribute(
      "href",
      "/",
    )
    expect(
      nav.getByRole("link", { name: "Families, categories and organisations" }),
    ).toHaveAttribute("href", "/families")
  })

  it("marks the roadmap open as the current page, and nothing else (S3)", async () => {
    await renderNavigation({ path: "/roadmaps/beds" })

    const nav = within(navigation())
    const current = await nav.findByRole("link", { name: "Bed Management" })
    await waitFor(() => {
      expect(current).toHaveAttribute("aria-current", "page")
    })
    expect(
      nav
        .getAllByRole("link")
        .filter((link) => link.hasAttribute("aria-current")),
    ).toEqual([current])
  })

  it("marks all the roadmaps as current on the home page only", async () => {
    await renderNavigation()

    const all = within(navigation()).getByRole("link", { name: "All roadmaps" })
    await linkNames()
    expect(all).toHaveAttribute("aria-current", "page")
  })

  it("opens another roadmap in one step, moving focus to its page (S1)", async () => {
    const user = userEvent.setup()
    await renderNavigation({ path: "/roadmaps/beds" })

    await user.click(
      await within(navigation()).findByRole("link", {
        name: "Theatre Scheduling",
      }),
    )

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Theatre Scheduling",
      }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus()
    })
  })

  it("offers only the two pages before connecting (S4)", async () => {
    await renderNavigation({ authState: { status: "ready" } })

    expect(
      within(navigation())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["All roadmaps", "Families, categories and organisations"])
  })

  it("offers only the two pages when the roadmap list can't be read (S4)", async () => {
    await renderNavigation({
      repository: createInMemoryRoadmapRepository(new AppError("network")),
    })

    await screen.findByRole("button", { name: "Retry" })
    expect(
      within(navigation())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["All roadmaps", "Families, categories and organisations"])
  })

  it("speaks Welsh: titles and families in Welsh where they have it", async () => {
    await renderNavigation({ language: "cy" })

    const nav = within(
      screen.getByRole("navigation", { name: "Mapiau trywydd" }),
    )
    expect(
      await nav.findByRole("link", { name: "Map trywydd Nyrsio Cymunedol" }),
    ).toBeInTheDocument()
    expect(
      nav.getByRole("link", { name: "Pob map trywydd" }),
    ).toBeInTheDocument()
    expect(nav.getByRole("list", { name: "Llif Ysbytai" })).toBeInTheDocument()
    expect(
      nav.getByRole("list", { name: "Dim teulu cynnyrch" }),
    ).toBeInTheDocument()
  })

  describe("folded to a rail (D5)", () => {
    async function renderRail() {
      localStorage.setItem("roadmaps.navigation", "folded")
      return renderNavigation()
    }

    it("shows each roadmap's initials, named by them and its title (WCAG 2.5.3)", async () => {
      await renderRail()

      const link = await within(navigation()).findByRole("link", {
        name: "CN Community Nursing roadmap",
      })
      expect(link).toHaveTextContent(/^CN /)
      // Every destination keeps its name, the pages' read alone beside their icons.
      expect(await linkNames()).toEqual([
        "All roadmaps",
        "CN Community Nursing roadmap",
        "BM Bed Management",
        "TS Theatre Scheduling",
        "PS Pharmacy Stock",
        "Families, categories and organisations",
      ])
      expect(
        within(navigation()).getByRole("list", { name: "Hospital Flow" }),
      ).toBeInTheDocument()
    })

    it("shows a roadmap's title in a tooltip as it is pointed at", async () => {
      const user = userEvent.setup()
      await renderRail()

      await user.hover(
        await within(navigation()).findByRole("link", {
          name: "BM Bed Management",
        }),
      )

      // Base UI gives a tooltip no role: it repeats a name the link already has.
      expect(
        await screen.findByText("Bed Management", {
          selector: "[data-slot=tooltip-content]",
        }),
      ).toBeInTheDocument()
    })
  })
})
