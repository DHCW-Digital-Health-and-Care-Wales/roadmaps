import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { DESKTOP_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { editItemText } from "../testing/item-dialog"
import { recordSayings } from "../testing/record-sayings"
import {
  CLOSED_FAMILIES_STORAGE_KEY,
  readClosedFamilies,
} from "./closed-families"

// STY-062: each family's name is a button that closes and opens its roadmaps, "Close all"
// does so for every family, closed families are remembered on this device, and going to a
// roadmap opens its family. Rendered on a desktop unless a test says otherwise.

const citizen = { en: "Citizen Services", cy: "Gwasanaethau Dinasyddion" }
const single = { en: "Single Record", cy: "Cofnod Sengl" }
const workforce = { en: "Workforce", cy: "Gweithlu" }
const ROADMAPS = [
  createTestRoadmap("booking", "Appointment booking", { family: citizen }),
  createTestRoadmap("viewer", "Care record viewer", { family: single }),
  createTestRoadmap("plans", "Shared care plans", { family: single }),
  createTestRoadmap("rostering", "Rostering", { family: workforce }),
  createTestRoadmap("carers", "Carers' register"),
]
const ROADMAP_ITEMS = { plans: [createTestRoadmapItem("Plan item")] }

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

const navigation = () => screen.getByRole("navigation", { name: "Roadmaps" })
const familyButton = (name: string | RegExp) =>
  within(navigation()).getByRole("button", { name })
const closeAll = () => familyButton("Close all families")
const openAll = () => familyButton("Open all families")

async function renderFamilies(
  options: Parameters<typeof renderWithProviders>[0] = {},
) {
  matchMediaQueries(DESKTOP_WIDTH)
  return renderAgain(options)
}

/** Renders the app again, as a reload does, on the desktop `renderFamilies` set up. */
async function renderAgain(
  options: Parameters<typeof renderWithProviders>[0] = {},
) {
  const user = userEvent.setup()
  const rendered = await renderWithProviders({
    authState: connected,
    roadmaps: ROADMAPS,
    roadmapItems: ROADMAP_ITEMS,
    ...options,
  })
  // The search shows once the roadmaps are read.
  await within(navigation()).findByRole("searchbox")
  return { user, ...rendered }
}

const link = (name: string) =>
  within(navigation()).queryByRole("link", { name })

describe("closing and opening a family (S1)", () => {
  it("hides its roadmaps and says it is collapsed, keeping focus; then shows them again", async () => {
    const { user } = await renderFamilies()
    const button = familyButton("Single Record")
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(link("Care record viewer")).toBeInTheDocument()

    await user.click(button)

    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).toHaveFocus()
    expect(link("Care record viewer")).not.toBeInTheDocument()
    expect(link("Shared care plans")).not.toBeInTheDocument()
    expect(link("Rostering")).toBeInTheDocument()

    await user.click(button)

    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(link("Care record viewer")).toBeInTheDocument()
  })

  it("names its list for the family while it is open", async () => {
    await renderFamilies()
    expect(
      within(navigation()).getByRole("list", { name: "Single Record" }),
    ).toHaveTextContent("Care record viewer")
  })

  it("closes the roadmaps with no family under their heading too", async () => {
    const { user } = await renderFamilies()

    await user.click(familyButton("No product family"))

    expect(link("Carers' register")).not.toBeInTheDocument()
  })
})

describe("a closed family with changes (S2)", () => {
  it("keeps a dot, and is read with its unpublished changes", async () => {
    const { user, router } = await renderFamilies({ path: "/roadmaps/plans" })
    await screen.findByRole("heading", { level: 3, name: "Plan item" })
    await editItemText(user, "Plan item", "Title", "Plan item, edited")
    await act(() => router.navigate({ to: "/families" }))
    const button = familyButton("Single Record")
    expect(button.querySelector("[data-slot=unpublished-dot]")).toBeNull()

    await user.click(button)

    expect(
      familyButton("Single Record, unpublished changes"),
    ).toBeInTheDocument()
    expect(
      familyButton("Single Record, unpublished changes").querySelector(
        "[data-slot=unpublished-dot]",
      ),
    ).not.toBeNull()
    // Another closed family has none.
    await user.click(familyButton("Workforce"))
    expect(
      familyButton("Workforce").querySelector("[data-slot=unpublished-dot]"),
    ).toBeNull()
  })
})

describe("Close all and Open all (S3)", () => {
  it("closes every family and becomes Open all with focus on it, telling a screen reader", async () => {
    const { user } = await renderFamilies()
    const said = recordSayings()

    await user.click(closeAll())

    for (const name of ["Citizen Services", "Single Record", "Workforce"]) {
      expect(familyButton(name)).toHaveAttribute("aria-expanded", "false")
    }
    expect(familyButton("No product family")).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(openAll()).toHaveTextContent("Open all")
    expect(openAll()).toHaveFocus()
    expect(
      within(navigation()).queryByRole("button", {
        name: "Close all families",
      }),
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(said).toEqual(["All families closed"])
    })
  })

  it("is Close all again once one family is open, and Open all opens every family", async () => {
    const { user } = await renderFamilies()
    const said = recordSayings()
    await user.click(closeAll())

    await user.click(familyButton("Workforce"))
    expect(closeAll()).toHaveTextContent("Close all")

    await user.click(closeAll())
    await user.click(openAll())

    for (const name of ["Citizen Services", "Single Record", "Workforce"]) {
      expect(familyButton(name)).toHaveAttribute("aria-expanded", "true")
    }
    expect(closeAll()).toBeInTheDocument()
    await waitFor(() => {
      expect(said).toEqual(["All families closed", "All families open"])
    })
  })

  it("is reached by Tab from All roadmaps, and worked by Space", async () => {
    const { user } = await renderFamilies()
    within(navigation()).getByRole("link", { name: "All roadmaps" }).focus()

    await user.tab()

    expect(closeAll()).toHaveFocus()
    await user.keyboard(" ")
    expect(openAll()).toHaveFocus()
  })

  it("closes the current roadmap's family too, and leaves it closed", async () => {
    const { user } = await renderFamilies({ path: "/roadmaps/plans" })
    await screen.findByRole("heading", { level: 3, name: "Plan item" })

    await user.click(closeAll())

    expect(familyButton("Single Record")).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(link("Shared care plans")).not.toBeInTheDocument()
  })
})

describe("remembered on this device (S4)", () => {
  it("keeps the closed families across a reload, and writes nothing to the data source", async () => {
    const repository = createInMemoryRoadmapRepository(ROADMAPS, ROADMAP_ITEMS)
    // Every method of the in-memory repository except its `list*` reads.
    const spies = (Object.keys(repository) as (keyof typeof repository)[])
      .filter((method) => !method.startsWith("list"))
      .map((method) => vi.spyOn(repository, method))
    expect(spies.length).toBeGreaterThanOrEqual(6)
    const { user, unmount } = await renderFamilies({ repository })
    await user.click(familyButton("Single Record"))
    await user.click(familyButton("Workforce"))
    expect(readClosedFamilies()).toEqual(new Set(["singlerecord", "workforce"]))
    unmount()

    await renderAgain({ repository })

    expect(familyButton("Single Record")).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(familyButton("Workforce")).toHaveAttribute("aria-expanded", "false")
    expect(familyButton("Citizen Services")).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it("leaves every family open, with no error, where storage can't be read or kept", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    const { user } = await renderFamilies()

    expect(familyButton("Single Record")).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    // Closing still works for the visit.
    await user.click(familyButton("Single Record"))
    expect(link("Care record viewer")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("going to a roadmap opens its family (S5)", () => {
  function closeSingle() {
    localStorage.setItem(
      CLOSED_FAMILIES_STORAGE_KEY,
      JSON.stringify(["singlerecord"]),
    )
  }

  it("opens it where the page loads on one of its roadmaps, a reload included", async () => {
    closeSingle()

    await renderFamilies({ path: "/roadmaps/plans" })

    expect(familyButton("Single Record")).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    expect(link("Shared care plans")).toHaveAttribute("aria-current", "page")
  })

  it("opens it as the Product Lead goes to one of its roadmaps from another page", async () => {
    closeSingle()
    const { router } = await renderFamilies()
    expect(link("Shared care plans")).not.toBeInTheDocument()

    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "plans" },
      }),
    )

    expect(familyButton("Single Record")).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("leaves a family closed that holds no roadmap the Product Lead goes to", async () => {
    closeSingle()
    await renderFamilies({ path: "/roadmaps/rostering" })

    expect(familyButton("Single Record")).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("lets the Product Lead close the current roadmap's family afterwards", async () => {
    const { user } = await renderFamilies({ path: "/roadmaps/plans" })

    await user.click(familyButton("Single Record"))

    expect(familyButton("Single Record")).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })
})

describe("a search finds roadmaps in closed families (S6)", () => {
  it("shows them under a plain heading, with no Close all, and closes the family again once cleared", async () => {
    const { user } = await renderFamilies()
    await user.click(familyButton("Single Record"))

    await user.type(
      within(navigation()).getByRole("searchbox", { name: "Search roadmaps" }),
      "shared",
    )

    expect(link("Shared care plans")).toBeInTheDocument()
    expect(
      within(navigation()).getByRole("list", { name: "Single Record" }),
    ).toHaveTextContent("Shared care plans")
    expect(
      within(navigation()).queryByRole("button", { name: /families$/ }),
    ).not.toBeInTheDocument()
    expect(
      within(navigation()).queryByRole("button", { name: "Single Record" }),
    ).not.toBeInTheDocument()

    await user.click(
      within(navigation()).getByRole("button", { name: "Clear search" }),
    )

    expect(familyButton("Single Record")).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(link("Shared care plans")).not.toBeInTheDocument()
  })
})

describe("the rail and a single group (S7)", () => {
  it("lists every roadmap, with no family control, whatever is closed", async () => {
    const { user } = await renderFamilies()
    await user.click(closeAll())

    await user.click(
      within(navigation()).getByRole("button", { name: "Fold the navigation" }),
    )

    const nav = within(navigation())
    expect(nav.getByRole("link", { name: /Care record viewer/ })).toBeVisible()
    expect(nav.getByRole("link", { name: /Rostering/ })).toBeInTheDocument()
    expect(nav.queryByRole("button", { name: /families$/ })).toBeNull()
    expect(nav.queryByRole("button", { name: "Single Record" })).toBeNull()
    // Each family's list keeps its name for a screen reader.
    expect(nav.getByRole("list", { name: "Single Record" })).toBeInTheDocument()
  })

  it("has no family button and no Close all where no roadmap has a family", async () => {
    await renderFamilies({
      roadmaps: [
        createTestRoadmap("one", "One roadmap"),
        createTestRoadmap("two", "Two roadmap"),
      ],
    })

    expect(
      within(navigation()).queryByRole("button", { name: /families$/ }),
    ).not.toBeInTheDocument()
    expect(
      within(navigation()).queryByRole("button", { name: /^No product/ }),
    ).not.toBeInTheDocument()
    expect(link("One roadmap")).toBeInTheDocument()
  })
})

describe("with no roadmaps to list", () => {
  it("has no family button and no Close all, as when signed out", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    await renderWithProviders({ authState: connected, roadmaps: [] })

    expect(
      await within(navigation()).findByRole("link", { name: "All roadmaps" }),
    ).toBeInTheDocument()
    expect(
      within(navigation()).queryByRole("button", { name: /families$/ }),
    ).not.toBeInTheDocument()
  })
})

describe("in the drawer on a phone (S8)", () => {
  it("closes and opens families from the menu", async () => {
    const user = userEvent.setup()
    await renderWithProviders({ authState: connected, roadmaps: ROADMAPS })
    await user.click(await screen.findByRole("button", { name: /^Menu/ }))
    const dialog = await screen.findByRole("dialog")

    await user.click(
      within(dialog).getByRole("button", { name: "Single Record" }),
    )

    expect(
      within(dialog).queryByRole("link", { name: "Care record viewer" }),
    ).not.toBeInTheDocument()
    await user.click(
      within(dialog).getByRole("button", { name: "Close all families" }),
    )
    expect(
      within(dialog).getByRole("button", { name: "Open all families" }),
    ).toHaveFocus()
  })
})
