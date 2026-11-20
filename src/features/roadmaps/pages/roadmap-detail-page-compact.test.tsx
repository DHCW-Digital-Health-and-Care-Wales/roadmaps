import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { AppError } from "@/lib/errors"
import { DESKTOP_WIDTH, TABLET_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { ITEMS_VIEW_STORAGE_KEY } from "../hooks/use-items-view"
import { expectDialogClosed } from "../testing/edit-dialog"
import { holdCall } from "../testing/held-call"
import { confirmRemoval } from "../testing/removal-dialog"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  addItem,
  confirmItemEdit,
  openEditItemDialog,
} from "../testing/item-dialog"

// A roadmap's items as compact rows, and the switch between the views (STY-067). A
// row's one line, its cut and the placement kept in view are layout, which jsdom does
// not do: `tests/e2e/roadmap-items-compact.spec.ts` reads those.

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

const items: RoadmapItem[] = [
  createTestRoadmapItem("First now", {
    id: "item-1",
    description: { en: "What the first is, in a sentence.", cy: "" },
    phase: { en: "Beta", cy: "" },
    expectedOutcome: { en: "Patients book at any hour.", cy: "" },
    tags: [{ en: "Patients", cy: "" }],
  }),
  {
    ...createTestRoadmapItem("Online booking", {
      id: "item-2",
      placement: "later",
    }),
    title: { en: "Online booking", cy: "Archebu ar-lein" },
  },
  createTestRoadmapItem("Last now", { id: "item-3" }),
  createTestRoadmapItem("Someday item", {
    id: "item-4",
    placement: null,
    writtenHorizon: "Soon",
    description: { en: "Not yet placed.", cy: "" },
  }),
]

type User = ReturnType<typeof userEvent.setup>

function main() {
  return within(screen.getByRole("main"))
}

/** The card or row of the item headed `title`. */
function itemOf(title: string) {
  const heading = main().getByRole("heading", { level: 3, name: title })
  const item = heading.closest("li")
  if (!item) throw new Error(`No item for ${title}`)
  return item
}

/** The titles of the items listed under a horizon or section heading. */
function titlesUnder(heading: string) {
  return within(main().getByRole("list", { name: heading }))
    .getAllByRole("heading", { level: 3 })
    .map(({ textContent }) => textContent)
}

function chevron(title: string) {
  return main().getByRole("button", { name: `Show the rest of ${title}` })
}

async function renderPage({
  repository = createInMemoryRoadmapRepository(roadmaps, { producta: items }),
  language,
  phone = false,
}: {
  repository?: InMemoryRoadmapRepository
  language?: Language
  /** Narrower than a tablet, where jsdom's media queries match none. */
  phone?: boolean
} = {}) {
  if (!phone) matchMediaQueries(TABLET_WIDTH, DESKTOP_WIDTH)
  const user = userEvent.setup()
  await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
    ...(language ? { language } : {}),
  })
  await main().findByRole("heading", { level: 3, name: "Last now" })
  return { user, repository }
}

async function chooseCompact(user: User) {
  await user.click(main().getByRole("button", { name: "Compact" }))
  await main().findByRole("button", { name: "Show the rest of Last now" })
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("the switch, from a tablet's width (S1, S3)", () => {
  it("is a group named View, Cards pressed, before Add an item and More", async () => {
    await renderPage()

    const group = main().getByRole("group", { name: "View" })
    const cards = within(group).getByRole("button", { name: "Cards" })
    const compact = within(group).getByRole("button", { name: "Compact" })
    expect(cards).toHaveAttribute("aria-pressed", "true")
    expect(compact).toHaveAttribute("aria-pressed", "false")

    const buttons = main().getAllByRole("button")
    const at = (name: string) =>
      buttons.findIndex((button) => button.textContent.startsWith(name))
    expect(at("Cards")).toBeLessThan(at("Compact"))
    expect(at("Compact")).toBeLessThan(at("Add an item"))
    expect(at("Add an item")).toBeLessThan(at("More"))
  })

  it("shows the items as rows under the same headings, in the same order, focus staying on Compact, and Cards brings the cards back", async () => {
    const { user } = await renderPage()
    const before = ["Not on the public roadmap", "Now", "Later"].map(
      titlesUnder,
    )

    await chooseCompact(user)

    const compact = main().getByRole("button", { name: "Compact" })
    expect(compact).toHaveFocus()
    expect(compact).toHaveAttribute("aria-pressed", "true")
    expect(main().getByRole("button", { name: "Cards" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(
      ["Not on the public roadmap", "Now", "Later"].map(titlesUnder),
    ).toEqual(before)
    // A row shows no field under a label until it is opened.
    expect(main().queryByText("Phase")).toBeNull()

    await user.click(main().getByRole("button", { name: "Cards" }))

    expect(main().getByRole("button", { name: "Cards" })).toHaveFocus()
    expect(
      main().queryByRole("button", { name: /^Show the rest of/ }),
    ).toBeNull()
    expect(within(itemOf("First now")).getByText("Phase")).toBeVisible()
  })

  it("is in Welsh too", async () => {
    await renderPage({ language: "cy" })

    const group = main().getByRole("group", { name: "Golwg" })
    expect(
      within(group).getByRole("button", { name: "Cardiau" }),
    ).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(within(group).getByRole("button", { name: "Cryno" }))
    expect(
      await main().findByRole("button", {
        name: "Dangos gweddill Archebu ar-lein",
      }),
    ).toHaveAttribute("aria-expanded", "false")
  })
})

describe("the switch on a phone (S2)", () => {
  it("is one button, Compact view, after Jump to, pressed while the view is compact", async () => {
    const { user } = await renderPage({ phone: true })
    expect(main().queryByRole("group", { name: "View" })).toBeNull()

    const toggle = main().getByRole("button", { name: "Compact view" })
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    const buttons = main().getAllByRole("button")
    const jumpTo = main().getByRole("button", { name: "Jump to" })
    expect(buttons.indexOf(jumpTo)).toBe(buttons.indexOf(toggle) - 1)

    await user.click(toggle)

    expect(toggle).toHaveFocus()
    expect(toggle).toHaveAttribute("aria-pressed", "true")
    expect(chevron("Last now")).toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-pressed", "false")
    expect(
      main().queryByRole("button", { name: /^Show the rest of/ }),
    ).toBeNull()
  })
})

describe("a row (S4, S5, S10)", () => {
  it("holds, on a desktop, the chevron, the title, the start of its description, its tag, then Move and Edit", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)
    await editTitle(user, "First now", "First now two")

    const row = within(itemOf("First now two"))
    expect(
      row.getByRole("button", { name: "Show the rest of First now two" }),
    ).toHaveAttribute("aria-expanded", "false")
    expect(row.getByText("What the first is, in a sentence.")).toBeVisible()
    expect(row.getByText("Changed")).toBeVisible()
    expect(
      row.getByRole("button", { name: "Move First now two" }),
    ).toHaveTextContent(/^Move/)
    expect(
      row.getByRole("button", { name: "Edit First now two" }),
    ).toHaveTextContent(/^Edit/)
    // In the order drawn.
    expect(
      row.getAllByRole("button").map(({ textContent }) => textContent),
    ).toEqual([
      "Show the rest of First now two",
      "Move First now two",
      "Edit First now two",
    ])
    // An item with no description shows its title alone.
    expect(within(itemOf("Last now")).queryByRole("paragraph")).toBeNull()
  })

  it("shows, on a phone, the title with no description, the tag under it, and Move and Edit as icons", async () => {
    const { user } = await renderPage({ phone: true })
    await user.click(main().getByRole("button", { name: "Compact view" }))
    await editTitle(user, "First now", "First now two")

    const row = within(itemOf("First now two"))
    expect(row.queryByText("What the first is, in a sentence.")).toBeNull()
    expect(row.getByText("Changed")).toBeVisible()
    for (const name of ["Move", "Edit"]) {
      const button = row.getByRole("button", { name: `${name} First now two` })
      // Named as on a card, its words visually hidden.
      expect(within(button).getByText(name)).toHaveClass("sr-only")
    }
  })

  it("lists the unplaced items first, flagged, with their note, and an empty placement offers its first item (STY-080 S1)", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)

    const headings = main()
      .getAllByRole("heading", { level: 2 })
      .map(({ textContent }) => textContent)
    expect(headings.indexOf("Not on the public roadmap")).toBe(
      headings.indexOf("Recently delivered") - 1,
    )
    expect(
      main().getByText(
        "These items need a horizon before the public site shows them.",
      ),
    ).toBeVisible()
    expect(
      within(itemOf("Someday item")).getByText(
        "Horizon “Soon” isn't recognised",
      ),
    ).toBeVisible()
    // Four placements hold none: each offers its first item, in place of "No items".
    expect(main().getAllByText("Add the first item")).toHaveLength(4)
    expect(main().queryByText("No items")).toBeNull()
    expect(
      within(main().getByRole("list", { name: "Not doing" })).getByRole(
        "button",
      ),
    ).toHaveAccessibleName("Add the first item to Not doing")
  })
})

describe("an opened row (S6, S9)", () => {
  it("shows every field the item has, as a card labels them, and closes by its chevron", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)

    await user.click(chevron("First now"))

    const hide = main().getByRole("button", {
      name: "Hide the rest of First now",
    })
    expect(hide).toHaveFocus()
    expect(hide).toHaveAttribute("aria-expanded", "true")
    const fields = within(itemOf("First now"))
      .getAllByRole("term")
      .map(({ textContent }) => textContent)
    expect(fields).toEqual(["Phase", "Description", "Expected outcome", "Tags"])
    expect(
      within(itemOf("First now")).getByText("Patients book at any hour."),
    ).toBeVisible()

    await user.click(hide)

    expect(chevron("First now")).toHaveAttribute("aria-expanded", "false")
    expect(within(itemOf("First now")).queryByRole("term")).toBeNull()
  })

  it("opens any number of rows at once, all closed again once the view changes", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)

    await user.click(chevron("First now"))
    await user.click(chevron("Someday item"))

    expect(
      main().getAllByRole("button", { name: /^Hide the rest of/ }),
    ).toHaveLength(2)

    await user.click(main().getByRole("button", { name: "Cards" }))
    await chooseCompact(user)

    expect(
      main().queryByRole("button", { name: /^Hide the rest of/ }),
    ).toBeNull()
  })

  it("ends in Undo changes for an item with pending edits, which drops them, focus going to its Edit", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)
    await editTitle(user, "Last now", "Last now two")
    await user.click(chevron("Last now two"))

    await user.click(
      main().getByRole("button", { name: "Undo changes Last now two" }),
    )

    const edit = main().getByRole("button", { name: "Edit Last now" })
    await waitFor(() => {
      expect(edit).toHaveFocus()
    })
    expect(within(itemOf("Last now")).queryByText("Changed")).toBeNull()
  })

  it("ends in Remove for an item added and not yet published, tagged New, which drops it once asked", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)
    await addItem(user, "Brand new", "Next")

    const row = within(itemOf("Brand new"))
    expect(row.getByText("New")).toBeVisible()
    await user.click(
      row.getByRole("button", { name: "Show the rest of Brand new" }),
    )
    await confirmRemoval(user, "Brand new")

    expect(
      main().queryByRole("heading", { level: 3, name: "Brand new" }),
    ).toBeNull()
    await waitFor(() => {
      expect(
        main().getAllByRole("button", { name: "Add an item" })[0],
      ).toHaveFocus()
    })
  })
})

describe("Move and Edit on a row (S8, S9)", () => {
  it("moves the item to another placement, focus going to Move on its row there", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)

    await user.click(
      main().getByRole("button", { name: "Move Online booking" }),
    )
    await user.click(await screen.findByRole("menuitem", { name: "Now" }))

    expect(titlesUnder("Now")).toEqual([
      "First now",
      "Last now",
      "Online booking",
    ])
    await waitFor(() => {
      expect(
        main().getByRole("button", { name: "Move Online booking" }),
      ).toHaveFocus()
    })
    expect(within(itemOf("Online booking")).getByText("Changed")).toBeVisible()
    expect(chevron("Online booking")).toBeInTheDocument()
  })

  it("moves the item within its placement's order, which the heading then marks", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)

    await user.click(main().getByRole("button", { name: "Move Last now" }))
    await user.click(
      await screen.findByRole("menuitem", { name: "To the top" }),
    )

    expect(titlesUnder("Now")).toEqual(["Last now", "First now"])
    expect(main().getByText("Order changed")).toBeVisible()
    expect(main().getByRole("button", { name: "Undo order Now" })).toBeVisible()
    await waitFor(() => {
      expect(
        main().getByRole("button", { name: "Move Last now" }),
      ).toHaveFocus()
    })
  })

  it("opens the item dialog from Edit, focus returning to the row's Edit as it closes", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)

    await openEditItemDialog(user, "Online booking")
    await user.keyboard("{Escape}")
    await expectDialogClosed()

    await waitFor(() => {
      expect(
        main().getByRole("button", { name: "Edit Online booking" }),
      ).toHaveFocus()
    })
  })

  it("holds a new item's Move, Edit and Remove while the roadmap is being published", async () => {
    const { user, repository } = await renderPage()
    await chooseCompact(user)
    await addItem(user, "Brand new", "Next")
    await user.click(chevron("Brand new"))
    const { held, release, released } = holdCall(
      repository.publishRoadmapChanges.bind(repository),
    )
    vi.spyOn(repository, "publishRoadmapChanges").mockImplementation(held)

    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )
    await waitFor(() => {
      expect(held).toHaveBeenCalled()
    })

    for (const name of ["Move", "Edit", "Remove"]) {
      expect(
        screen.getByRole("button", { name: `${name} Brand new`, hidden: true }),
      ).toHaveAttribute("aria-disabled", "true")
    }
    await act(async () => {
      release()
      await released
    })
  })
})

describe("the view kept on the device (S11)", () => {
  it("opens the next page in the view last chosen", async () => {
    localStorage.setItem(ITEMS_VIEW_STORAGE_KEY, "compact")
    await renderPage()

    expect(chevron("Last now")).toBeInTheDocument()
    expect(main().getByRole("button", { name: "Compact" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("keeps a choice for the next page", async () => {
    const { user } = await renderPage()
    await chooseCompact(user)

    expect(localStorage.getItem(ITEMS_VIEW_STORAGE_KEY)).toBe("compact")
  })

  it("shows Cards where the choice can't be read, and the switch still works", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    const { user } = await renderPage()

    expect(main().getByRole("button", { name: "Cards" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await chooseCompact(user)
  })
})

describe("the states the items area already has (S12)", () => {
  it("draws the loading placeholder as rows, the switch in place and usable", async () => {
    localStorage.setItem(ITEMS_VIEW_STORAGE_KEY, "compact")
    matchMediaQueries(TABLET_WIDTH, DESKTOP_WIDTH)
    const user = userEvent.setup()
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository: {
        ...createInMemoryRoadmapRepository(roadmaps, { producta: items }),
        listRoadmapItems: () => new Promise<never>(() => undefined),
      },
    })

    const status = await main().findByText("Loading roadmap items…")
    expect(status.closest("[role=status]")?.querySelector("ul")).toHaveClass(
      "border",
    )
    await user.click(main().getByRole("button", { name: "Cards" }))
    expect(main().getByRole("button", { name: "Cards" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("shows a failed read as today, the switch in place", async () => {
    localStorage.setItem(ITEMS_VIEW_STORAGE_KEY, "compact")
    matchMediaQueries(TABLET_WIDTH, DESKTOP_WIDTH)
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository: {
        ...createInMemoryRoadmapRepository(roadmaps, { producta: items }),
        listRoadmapItems: () => Promise.reject(new AppError("network")),
      },
    })

    expect(
      await main().findByRole("heading", {
        level: 2,
        name: "Couldn't load this roadmap's items",
      }),
    ).toBeInTheDocument()
    expect(main().getByRole("group", { name: "View" })).toBeVisible()
  })

  it("shows an expired session as today, the switch in place", async () => {
    localStorage.setItem(ITEMS_VIEW_STORAGE_KEY, "compact")
    matchMediaQueries(TABLET_WIDTH, DESKTOP_WIDTH)
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository: {
        ...createInMemoryRoadmapRepository(roadmaps, { producta: items }),
        listRoadmapItems: () => Promise.reject(new AppError("unauthenticated")),
      },
    })

    expect(
      await main().findByRole("button", { name: /^Reconnect/ }),
    ).toBeVisible()
    expect(main().queryByText("Loading roadmap items…")).toBeNull()
    expect(main().getByRole("group", { name: "View" })).toBeVisible()
  })

  it("shows a roadmap with no items as today", async () => {
    localStorage.setItem(ITEMS_VIEW_STORAGE_KEY, "compact")
    matchMediaQueries(TABLET_WIDTH, DESKTOP_WIDTH)
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository: createInMemoryRoadmapRepository(roadmaps, { producta: [] }),
    })

    expect(await main().findByText("No items yet")).toBeVisible()
    expect(main().getByRole("group", { name: "View" })).toBeVisible()
  })
})

/** Gives the item titled `title` the title `to` in the item dialog. */
async function editTitle(user: User, title: string, to: string) {
  const form = await openEditItemDialog(user, title)
  const field = form.getByRole("textbox", { name: "Title" })
  await user.clear(field)
  await user.type(field, to)
  await confirmItemEdit(user)
}
