import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { AppError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render-with-providers"

import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

const items: RoadmapItem[] = [
  createTestRoadmapItem("First now", { id: "item-1" }),
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
  }),
]

type User = ReturnType<typeof userEvent.setup>

function main() {
  return within(screen.getByRole("main"))
}

/** The card (or form) of the item headed `title`. */
function card(title: string) {
  const heading = main().getByRole("heading", { level: 3, name: title })
  const item = heading.closest("li")
  if (!item) throw new Error(`No card for ${title}`)
  return item
}

/** The titles of the cards listed under a horizon or section heading. */
function titlesUnder(heading: string) {
  return within(main().getByRole("list", { name: heading }))
    .getAllByRole("heading", { level: 3 })
    .map(({ textContent }) => textContent)
}

async function renderPage({
  repository = createInMemoryRoadmapRepository(roadmaps, { producta: items }),
  language,
}: { repository?: InMemoryRoadmapRepository; language?: Language } = {}) {
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

/** Moves the item from its card's menu. */
async function moveWithMenu(user: User, title: string, to: string) {
  await user.click(main().getByRole("button", { name: `Move ${title}` }))
  await user.click(await screen.findByRole("menuitem", { name: to }))
}

/** Moves the item through its edit form. */
async function moveWithForm(user: User, title: string, to: string) {
  await user.click(main().getByRole("button", { name: `Edit ${title}` }))
  const form = within(main().getByRole("form", { name: title }))
  await user.selectOptions(
    form.getByRole("combobox", { name: "Horizon or section" }),
    to,
  )
  await user.click(form.getByRole("button", { name: "Done" }))
}

describe("Moving an item (STY-031)", () => {
  it.each([
    ["menu", moveWithMenu],
    ["form", moveWithForm],
  ] as const)(
    "shows an item moved by its %s in its new place, in row order, pending (S1, S3)",
    async (_way, move) => {
      const { user, repository } = await renderPage()
      const write = vi.spyOn(repository, "publishRoadmapChanges")

      await move(user, "Online booking", "Now")

      expect(titlesUnder("Now")).toEqual([
        "First now",
        "Online booking",
        "Last now",
      ])
      expect(main().queryByRole("list", { name: "Later" })).toBeNull()
      expect(within(card("Online booking")).getByText("Changed")).toBeVisible()
      expect(main().getByText("1 unpublished change")).toBeInTheDocument()
      expect(write).not.toHaveBeenCalled()
    },
  )

  it("offers the other five placements by heading, in page order, and no menu while the form is open (S2)", async () => {
    const { user } = await renderPage()

    await user.click(
      main().getByRole("button", { name: "Move Online booking" }),
    )

    const menu = await screen.findByRole("menu")
    expect(menu).toHaveTextContent(/^Move to/)
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map(({ textContent }) => textContent),
    ).toEqual([
      "Recently delivered",
      "Now",
      "Next",
      "Delivered this year",
      "Not doing",
    ])
    await user.keyboard("{Escape}")
    await user.click(
      main().getByRole("button", { name: "Edit Online booking" }),
    )
    expect(
      main().queryByRole("button", { name: "Move Online booking" }),
    ).toBeNull()
  })

  it("sets the form's choice to the item's placement, offering all six (S3)", async () => {
    const { user } = await renderPage()

    await user.click(
      main().getByRole("button", { name: "Edit Online booking" }),
    )

    const choice = within(
      main().getByRole("form", { name: "Online booking" }),
    ).getByRole("combobox", { name: "Horizon or section" })
    expect(choice).toHaveDisplayValue("Later")
    expect(
      within(choice)
        .getAllByRole("option")
        .map(({ textContent }) => textContent),
    ).toEqual([
      "Recently delivered",
      "Now",
      "Next",
      "Later",
      "Delivered this year",
      "Not doing",
    ])
  })

  it.each([
    ["menu", moveWithMenu],
    ["form", moveWithForm],
  ] as const)(
    "places an unplaced item by its %s, no longer flagged (S4)",
    async (_way, move) => {
      const { user } = await renderPage()

      await move(user, "Someday item", "Later")

      expect(titlesUnder("Later")).toEqual(["Online booking", "Someday item"])
      const placed = within(card("Someday item"))
      expect(placed.getByText("Changed")).toBeVisible()
      expect(placed.queryByText("Horizon “Soon” isn't recognised")).toBeNull()
      expect(
        main().queryByRole("list", { name: "Not on the public roadmap" }),
      ).toBeNull()
    },
  )

  it("never unplaces an item: the menu offers all six, the form starts on none, which can't be chosen (S4)", async () => {
    const { user } = await renderPage()

    await user.click(main().getByRole("button", { name: "Move Someday item" }))
    expect(await screen.findAllByRole("menuitem")).toHaveLength(6)
    await user.keyboard("{Escape}")
    await user.click(main().getByRole("button", { name: "Edit Someday item" }))

    const choice = within(
      main().getByRole("form", { name: "Someday item" }),
    ).getByRole("combobox", { name: "Horizon or section" })
    expect(choice).toHaveDisplayValue("Choose a horizon or section")
    expect(
      within(choice).getByRole("option", {
        name: "Choose a horizon or section",
      }),
    ).toBeDisabled()
  })

  it("is no change once moved back (S5)", async () => {
    const { user } = await renderPage()
    await moveWithMenu(user, "Online booking", "Now")

    await moveWithMenu(user, "Online booking", "Later")

    expect(titlesUnder("Later")).toEqual(["Online booking"])
    expect(within(card("Online booking")).queryByText("Changed")).toBeNull()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("publishes the placement, listed among the item's changed fields (S6, S7)", async () => {
    const { user, repository } = await renderPage()
    await moveWithMenu(user, "Online booking", "Recently delivered")

    await user.click(main().getByRole("button", { name: "Publish changes" }))
    const dialog = within(screen.getByRole("alertdialog"))
    expect(dialog.getByRole("listitem")).toHaveTextContent(
      /^Online booking\s*Horizon or section$/,
    )
    await user.click(dialog.getByRole("button", { name: "Publish changes" }))

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    const published = await repository.listRoadmapItems("producta")
    expect(published.map(({ placement }) => placement)).toEqual<
      (RoadmapPlacement | null)[]
    >(["now", "recently-delivered", "now", null])
    expect(titlesUnder("Recently delivered")).toEqual(["Online booking"])
    expect(within(card("Online booking")).queryByText("Changed")).toBeNull()
  })

  it("shows a co-lead's other move beside yours, by heading, to keep or use (S8)", async () => {
    const { user, repository } = await renderPage()
    await moveWithMenu(user, "Online booking", "Now")
    repository.coLead((_list, itemsOf) => {
      const booking = itemsOf("producta")[1]
      if (booking) booking.placement = "next"
    })

    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )

    const review = await main().findByRole("alert")
    const conflict = within(within(review).getByRole("listitem"))
    expect(conflict.getByText(/: /, { selector: "p" })).toHaveTextContent(
      "Online booking: Horizon or section",
    )
    expect(
      conflict.getAllByRole("definition").map(({ textContent }) => textContent),
    ).toEqual(["Now", "Next"])
    await user.click(
      conflict.getByRole("button", {
        name: "Use theirs Online booking: Horizon or section",
      }),
    )
    expect(titlesUnder("Next")).toEqual(["Online booking"])
  })

  it("shows an item a co-lead unplaced as unplaced after Use theirs, even if the roadmap couldn't be read again (S8)", async () => {
    const { user, repository } = await renderPage()
    await moveWithMenu(user, "Online booking", "Now")
    repository.coLead((_list, itemsOf) => {
      const booking = itemsOf("producta")[1]
      if (!booking) return
      booking.placement = null
      booking.writtenHorizon = ""
    })
    vi.spyOn(repository, "listRoadmaps").mockRejectedValue(
      new AppError("forbidden"),
    )
    vi.spyOn(repository, "listRoadmapItems").mockRejectedValue(
      new AppError("forbidden"),
    )

    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )
    expect(
      await main().findByText("Couldn't refresh your roadmaps"),
    ).toBeInTheDocument()
    const review = main()
      .getAllByRole("alert")
      .find((each) => each.textContent.includes("Someone else"))
    if (!review) throw new Error("No review")
    expect(
      within(review)
        .getAllByRole("definition")
        .map(({ textContent }) => textContent),
    ).toEqual(["Now", "Not on the public roadmap"])
    await user.click(
      within(review).getByRole("button", {
        name: "Use theirs Online booking: Horizon or section",
      }),
    )

    expect(titlesUnder("Not on the public roadmap")).toEqual([
      "Online booking",
      "Someday item",
    ])
    expect(main().queryByRole("list", { name: "Now" })).not.toBeNull()
    expect(titlesUnder("Now")).not.toContain("Online booking")
  })

  it("moves by keyboard, naming the menu for the item, then focuses the moved item's card (S10)", async () => {
    const { user } = await renderPage()
    const button = main().getByRole("button", { name: "Move Online booking" })
    button.focus()

    await user.keyboard("{Enter}")
    await screen.findByRole("menu")
    await user.keyboard("{ArrowDown}{Enter}")

    expect(titlesUnder("Now")).toContain("Online booking")
    await vi.waitFor(() => {
      expect(
        main().getByRole("button", { name: "Move Online booking" }),
      ).toHaveFocus()
    })
    expect(card("Online booking")).toContainElement(
      document.activeElement as HTMLElement,
    )
  })

  it.each([
    ["Done", (user: User) => moveWithForm(user, "Online booking", "Now")],
    [
      "Undo changes",
      async (user: User) => {
        await moveWithMenu(user, "Online booking", "Now")
        await user.click(
          main().getByRole("button", { name: "Undo changes Online booking" }),
        )
      },
    ],
  ])(
    "returns focus to the moved card's Edit after %s",
    async (_action, act) => {
      const { user } = await renderPage()

      await act(user)

      await vi.waitFor(() => {
        expect(
          main().getByRole("button", { name: "Edit Online booking" }),
        ).toHaveFocus()
      })
    },
  )

  it("speaks Welsh: the menu, its name, the form's label and the headings (S11)", async () => {
    const user = userEvent.setup()
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository: createInMemoryRoadmapRepository(roadmaps, {
        producta: items,
      }),
      language: "cy",
    })
    await main().findByRole("heading", { level: 3, name: "Last now" })

    await user.click(
      main().getByRole("button", { name: "Symud Archebu ar-lein" }),
    )
    const menu = await screen.findByRole("menu")
    expect(menu).toHaveTextContent(/^Symud i/)
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map(({ textContent }) => textContent),
    ).toEqual([
      "Wedi'u cyflawni'n ddiweddar",
      "Nawr",
      "Nesaf",
      "Wedi'u cyflawni eleni",
      "Ddim yn bwrw ymlaen",
    ])
    await user.keyboard("{Escape}")
    await user.click(
      main().getByRole("button", { name: "Golygu Archebu ar-lein" }),
    )
    expect(
      main().getByRole("combobox", { name: "Gorwel neu adran" }),
    ).toHaveDisplayValue("Hwyrach")
  })
})
