import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { expectDialogClosed } from "../testing/edit-dialog"
import { holdRefresh } from "../testing/held-refresh"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  addItem,
  confirmItemEdit,
  editItemDialog,
  openEditItemDialog,
} from "../testing/item-dialog"
import {
  closeConflictReview,
  openConflictReview,
} from "../testing/roadmap-page"

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

/** The card of the item headed `title`. */
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

/** Moves the item in the item dialog. */
async function moveWithDialog(user: User, title: string, to: string) {
  const form = await openEditItemDialog(user, title)
  await user.selectOptions(
    form.getByRole("combobox", { name: "Horizon or section" }),
    to,
  )
  await confirmItemEdit(user)
}

describe("Moving an item (STY-031)", () => {
  it.each([
    ["menu", moveWithMenu],
    ["dialog", moveWithDialog],
  ] as const)(
    "shows an item moved by its %s last in its new place, pending (S1, S3; STY-051 S1)",
    async (_way, move) => {
      const { user, repository } = await renderPage()
      const write = vi.spyOn(repository, "publishRoadmapChanges")

      await move(user, "Online booking", "Now")

      expect(titlesUnder("Now")).toEqual([
        "First now",
        "Last now",
        "Online booking",
      ])
      // Later holds only its quick add (STY-080).
      expect(
        within(main().getByRole("list", { name: "Later" })).queryAllByRole(
          "heading",
          { level: 3 },
        ),
      ).toHaveLength(0)
      expect(within(card("Online booking")).getByText("Changed")).toBeVisible()
      expect(main().getByText("1 unpublished change")).toBeInTheDocument()
      expect(write).not.toHaveBeenCalled()
    },
  )

  describe("going last in its new placement (STY-051)", () => {
    it("shows items moved into one placement in the order they were moved, whatever is edited since, and new items after them all (S1)", async () => {
      const { user } = await renderPage()

      await moveWithMenu(user, "Someday item", "Now")
      await moveWithMenu(user, "Online booking", "Now")
      expect(titlesUnder("Now")).toEqual([
        "First now",
        "Last now",
        "Someday item",
        "Online booking",
      ])

      await addItem(user, "New clinic", "Now")
      await moveWithMenu(user, "First now", "Later")
      await moveWithMenu(user, "First now", "Now")
      const form = await openEditItemDialog(user, "Someday item")
      await user.type(form.getByRole("textbox", { name: "Title" }), " soon")
      await confirmItemEdit(user)

      expect(titlesUnder("Now")).toEqual([
        "First now",
        "Last now",
        "Someday item soon",
        "Online booking",
        "New clinic",
      ])
    })

    it("shows an item moved after a new item was added before it, the new item still last (S1, D4)", async () => {
      const { user } = await renderPage()
      await addItem(user, "New clinic", "Now")

      await moveWithMenu(user, "Online booking", "Now")

      expect(titlesUnder("Now")).toEqual([
        "First now",
        "Last now",
        "Online booking",
        "New clinic",
      ])
    })

    it.each([
      [
        "undone",
        (user: User) =>
          user.click(
            main().getByRole("button", { name: "Undo changes First now" }),
          ),
      ],
      ["moved back", (user: User) => moveWithMenu(user, "First now", "Now")],
    ] as const)(
      "shows an item where it was loaded once its move is %s, with nothing pending (S2)",
      async (_how, restore) => {
        const { user, repository } = await renderPage()
        const write = vi.spyOn(repository, "publishRoadmapChanges")
        await moveWithMenu(user, "First now", "Later")
        expect(titlesUnder("Later")).toEqual(["Online booking", "First now"])

        await restore(user)

        expect(titlesUnder("Now")).toEqual(["First now", "Last now"])
        expect(titlesUnder("Later")).toEqual(["Online booking"])
        expect(within(card("First now")).queryByText("Changed")).toBeNull()
        expect(main().queryByText(/unpublished change/)).toBeNull()
        expect(
          main().queryByRole("button", { name: "Publish changes" }),
        ).toBeNull()
        expect(write).not.toHaveBeenCalled()
      },
    )

    it.each([
      [
        "en",
        {
          move: "Move Online booking",
          to: "Now",
          publish: "Publish changes",
          title: "Couldn't publish your changes",
          reason:
            "Part of the spreadsheet is protected, so nothing was changed. Ask its owner to let this account edit it.",
          kept: "Your changes are kept in this tab.",
          pending: "1 unpublished change",
          changed: "Changed",
        },
      ],
      [
        "cy",
        {
          move: "Symud Archebu ar-lein",
          to: "Nawr",
          publish: "Cyhoeddi'r newidiadau",
          title: "Doedd dim modd cyhoeddi eich newidiadau",
          reason:
            "Mae rhan o'r daenlen wedi'i diogelu, felly newidiwyd dim byd. Gofynnwch i'w pherchennog adael i'r cyfrif hwn ei golygu.",
          kept: "Mae eich newidiadau wedi'u cadw yn y tab hwn.",
          pending: "1 newid heb ei gyhoeddi",
          changed: "Wedi newid",
        },
      ],
    ] as const)(
      "says a protected part of the spreadsheet stopped the publish, keeping the move pending, without trying again (S7, %s)",
      async (language, copy) => {
        const repository = createInMemoryRoadmapRepository(roadmaps, {
          producta: items,
        })
        const write = vi
          .spyOn(repository, "publishRoadmapChanges")
          .mockRejectedValue(new AppError("protected", { status: 400 }))
        const { user } = await renderPage({ repository, language })
        await user.click(main().getByRole("button", { name: copy.move }))
        await user.click(await screen.findByRole("menuitem", { name: copy.to }))

        await user.click(main().getByRole("button", { name: copy.publish }))
        await user.click(
          within(screen.getByRole("alertdialog")).getByRole("button", {
            name: copy.publish,
          }),
        )

        const notice = await main().findByRole("alert")
        expect(notice).toHaveTextContent(copy.title)
        expect(notice).toHaveTextContent(copy.reason)
        expect(notice).toHaveTextContent(copy.kept)
        expect(write).toHaveBeenCalledTimes(1)
        expect(main().getByText(copy.pending)).toBeInTheDocument()
        expect(
          within(main().getByRole("list", { name: copy.to })).getByText(
            copy.changed,
          ),
        ).toBeVisible()
      },
    )

    it("shows a published move last in its placement once it is read back, after a co-lead's item too (S3, S4)", async () => {
      const { user, repository } = await renderPage()
      await moveWithMenu(user, "First now", "Later")
      repository.coLead((_list, itemsOf) => {
        itemsOf("producta").push(
          createTestRoadmapItem("Added by a co-lead", {
            id: "item-5",
            placement: "later",
          }),
        )
      })

      await user.click(main().getByRole("button", { name: "Publish changes" }))
      await user.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: "Publish changes",
        }),
      )

      expect(
        await main().findByText(/^Changes published\./),
      ).toBeInTheDocument()
      expect(titlesUnder("Later")).toEqual([
        "Online booking",
        "Added by a co-lead",
        "First now",
      ])
      expect(
        (await repository.listRoadmapItems("producta")).map(
          ({ title }) => title.en,
        ),
      ).toEqual([
        "Online booking",
        "Last now",
        "Someday item",
        "Added by a co-lead",
        "First now",
      ])
    })
  })

  it("offers the other five placements by heading, in page order, and no menu within reach while the dialog is open (S2)", async () => {
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
    await openEditItemDialog(user, "Online booking")
    expect(
      screen.queryByRole("button", { name: "Move Online booking" }),
    ).toBeNull()
  })

  it("sets the dialog's choice to the item's placement, offering all six (S3)", async () => {
    const { user } = await renderPage()

    const form = await openEditItemDialog(user, "Online booking")

    const choice = form.getByRole("combobox", { name: "Horizon or section" })
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
    ["dialog", moveWithDialog],
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

  it("never unplaces an item: the menu offers all six, the dialog starts on none, which can't be chosen (S4)", async () => {
    const { user } = await renderPage()

    await user.click(main().getByRole("button", { name: "Move Someday item" }))
    expect(await screen.findAllByRole("menuitem")).toHaveLength(6)
    await user.keyboard("{Escape}")
    const form = await openEditItemDialog(user, "Someday item")

    const choice = form.getByRole("combobox", { name: "Horizon or section" })
    expect(choice).toHaveDisplayValue("Choose a horizon or section")
    expect(
      within(choice).getByRole("option", {
        name: "Choose a horizon or section",
      }),
    ).toBeDisabled()
  })

  it("keeps the none option, and its choice, in the open dialog after a Refresh reads a co-lead's placing the item (S4)", async () => {
    const { user, repository } = await renderPage()
    const land = await holdRefresh(user, repository)
    const form = await openEditItemDialog(user, "Someday item")
    repository.coLead((_list, itemsOf) => {
      const someday = itemsOf("producta")[3]
      if (someday) someday.placement = "now"
    })

    await land()

    const choice = form.getByRole("combobox", { name: "Horizon or section" })
    expect(choice).toHaveDisplayValue("Choose a horizon or section")
    await confirmItemEdit(user)
    expect(titlesUnder("Now")).toContain("Someday item")
    expect(main().queryByText("1 unpublished change")).toBeNull()
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

    const review = await openConflictReview(user)
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
    expect(review).toHaveTextContent(
      "Every change is decided. Nothing is left to publish.",
    )
    await closeConflictReview(user, review)
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
    const review = await openConflictReview(user)
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
    await closeConflictReview(user, review)

    expect(titlesUnder("Not on the public roadmap")).toEqual([
      "Online booking",
      "Someday item",
    ])
    expect(main().queryByRole("list", { name: "Now" })).not.toBeNull()
    expect(titlesUnder("Now")).not.toContain("Online booking")
  })

  it.each([
    [
      "Done",
      async (user: User) => {
        await confirmItemEdit(user)
        expect(within(card("Online booking")).getByText("Typed")).toBeVisible()
      },
    ],
    [
      "Cancel",
      async (user: User) => {
        await user.click(
          editItemDialog().getByRole("button", { name: "Cancel" }),
        )
        await expectDialogClosed()
        expect(within(card("Online booking")).queryByText("Typed")).toBeNull()
      },
    ],
  ])(
    "keeps the open dialog and what was typed when a read moves the item's card to another list, focus on the card where it now is after %s (STY-044 S7)",
    async (_how, close) => {
      const { user, repository } = await renderPage()
      const land = await holdRefresh(user, repository)
      const form = await openEditItemDialog(user, "Online booking")
      await user.type(
        form.getByRole("textbox", { name: "Description" }),
        "Typed",
      )
      repository.coLead((_list, itemsOf) => {
        const booking = itemsOf("producta")[1]
        if (booking) booking.placement = "next"
      })

      await land()

      // Its card is now a new one, in Next, behind the dialog.
      expect(
        within(
          screen.getByRole("list", { name: "Next", hidden: true }),
        ).getByRole("heading", { name: "Online booking", hidden: true }),
      ).toBeInTheDocument()
      expect(form.getByRole("textbox", { name: "Description" })).toHaveValue(
        "Typed",
      )
      await close(user)
      expect(titlesUnder("Next")).toEqual(["Online booking"])
      await vi.waitFor(() => {
        expect(
          main().getByRole("button", { name: "Edit Online booking" }),
        ).toHaveFocus()
      })
    },
  )

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
    ["Done", (user: User) => moveWithDialog(user, "Online booking", "Now")],
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

  it("speaks Welsh: the menu, its name, the dialog's label and the headings (S11)", async () => {
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
    const form = await openEditItemDialog(user, "Archebu ar-lein", "cy")
    expect(
      form.getByRole("combobox", { name: "Gorwel neu adran" }),
    ).toHaveDisplayValue("Hwyrach")
  })
})
