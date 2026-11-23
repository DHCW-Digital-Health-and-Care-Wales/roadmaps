import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { disconnectFromHeader } from "@/features/auth/testing/account-menu"
import type { Language } from "@/i18n"
import { REDUCED_MOTION } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { holdCall } from "../testing/held-call"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  addItem,
  confirmItemEdit,
  openEditItemDialog,
} from "../testing/item-dialog"
import { expectOpeningFocus } from "../testing/opening-focus"
import {
  closeConflictReview,
  findRefusal,
  moreButton,
  openConflictReview,
  refreshRoadmap,
} from "../testing/roadmap-page"
import {
  withoutViewTransitions,
  withViewTransitions,
} from "../testing/view-transitions"

/**
 * A Product Lead reorders a placement's items from each card's Move menu (STY-050): the
 * order is the placement's pending change, shown and undone at its heading, named in
 * the publish dialog and reviewed as one value when a co-lead changed the placement's
 * items too.
 */

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

const item = (title: string, placement: RoadmapPlacement | null = "now") =>
  createTestRoadmapItem(title, {
    id: `${title.toLowerCase().replaceAll(" ", "")}idxx`,
    placement,
    ...(placement === null && { writtenHorizon: "Soon" }),
  })

/** Now holds four items, Next two, Later one, and one is unplaced. */
const items: RoadmapItem[] = [
  item("Alpha"),
  item("Bravo"),
  item("Echo", "next"),
  item("Charlie"),
  item("Delta"),
  item("Foxtrot", "next"),
  item("Solo", "later"),
  item("Someday", null),
]

type User = ReturnType<typeof userEvent.setup>

function main() {
  return within(screen.getByRole("main"))
}

/** The card of the item headed `title`. */
function card(title: string) {
  const heading = main().getByRole("heading", { level: 3, name: title })
  const found = heading.closest("li")
  if (!found) throw new Error(`No card for ${title}`)
  return found
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
  await main().findByRole("heading", { level: 3, name: "Delta" })
  return { user, repository }
}

/** Opens an item's Move menu. */
async function openMoveMenu(user: User, title: string, move = "Move") {
  await user.click(main().getByRole("button", { name: `${move} ${title}` }))
  return screen.findByRole("menu")
}

/** Chooses from an item's Move menu: a position, or another placement. */
async function chooseFromMenu(user: User, title: string, choice: string) {
  const menu = await openMoveMenu(user, title)
  await user.click(within(menu).getByRole("menuitem", { name: choice }))
}

const menuChoices = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole("menuitem")
    .map(({ textContent }) => textContent)

const MOVE_TO_NOW_ITEM = [
  "Recently delivered",
  "Next",
  "Later",
  "Delivered this year",
  "Not doing",
]

/** Confirms the publish dialog. */
async function publish(user: User) {
  await user.click(main().getByRole("button", { name: "Publish changes" }))
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Publish changes",
    }),
  )
}

/** The review's conflict whose target reads `target`, with its two values. */
function conflictOf(review: HTMLElement, target: string) {
  const found = within(review)
    .getAllByRole("listitem")
    .find((each) => each.querySelector(":scope > p")?.textContent === target)
  if (!found) throw new Error(`No conflict for ${target}`)
  const lists = within(found)
    .getAllByRole("definition")
    .map((definition) =>
      within(definition)
        .queryAllByRole("listitem")
        .map(({ textContent }) => textContent),
    )
  return { conflict: within(found), lists }
}

describe("The Move menu's position group (S1)", () => {
  it("heads the choices of Now's fourth item with its position, above Move to, each choice only where it applies", async () => {
    const { user } = await renderPage()

    const menu = await openMoveMenu(user, "Delta")

    expect(menu).toHaveTextContent(/^In Now: 4 of 4/)
    expect(menuChoices(menu)).toEqual([
      "To the top",
      "Up one",
      ...MOVE_TO_NOW_ITEM,
    ])
    expect(within(menu).getByText("Move to")).toBeInTheDocument()
  })

  it.each([
    ["Alpha", "In Now: 1 of 4", ["Down one", "To the bottom"]],
    [
      "Bravo",
      "In Now: 2 of 4",
      ["To the top", "Up one", "Down one", "To the bottom"],
    ],
  ])("offers %s, at %s, where it can go", async (title, position, choices) => {
    const { user } = await renderPage()

    const menu = await openMoveMenu(user, title)

    expect(within(menu).getByText(position)).toBeInTheDocument()
    expect(menuChoices(menu)).toEqual([...choices, ...MOVE_TO_NOW_ITEM])
  })

  it.each(["Solo", "Someday"])(
    "shows no position for %s, the one item of its placement or an unplaced one",
    async (title) => {
      const { user } = await renderPage()

      const menu = await openMoveMenu(user, title)

      expect(menu).toHaveTextContent(/^Move to/)
      expect(within(menu).queryByText(/ of /)).toBeNull()
      expect(
        within(menu).queryByRole("menuitem", { name: "Up one" }),
      ).toBeNull()
    },
  )
})

describe("Choosing a position (S2)", () => {
  it.each([
    [
      "To the top",
      "Delta",
      ["Delta", "Alpha", "Bravo", "Charlie"],
      "Moved to the top. 1 of 4.",
    ],
    [
      "Up one",
      "Delta",
      ["Alpha", "Bravo", "Delta", "Charlie"],
      "Moved up. 3 of 4.",
    ],
    [
      "Down one",
      "Alpha",
      ["Bravo", "Alpha", "Charlie", "Delta"],
      "Moved down. 2 of 4.",
    ],
    [
      "To the bottom",
      "Alpha",
      ["Bravo", "Charlie", "Delta", "Alpha"],
      "Moved to the bottom. 4 of 4.",
    ],
  ])(
    "“%s” changes the order at once, says the new position and returns focus to the card's Move",
    async (choice, title, order, message) => {
      const { user, repository } = await renderPage()
      const write = vi.spyOn(repository, "publishRoadmapChanges")

      await chooseFromMenu(user, title, choice)

      expect(titlesUnder("Now")).toEqual(order)
      expect(main().getByText(message)).toBeInTheDocument()
      await waitFor(() => {
        expect(
          main().getByRole("button", { name: `Move ${title}` }),
        ).toHaveFocus()
      })
      expect(card(title)).toContainElement(
        document.activeElement as HTMLElement,
      )
      expect(titlesUnder("Next")).toEqual(["Echo", "Foxtrot"])
      expect(write).not.toHaveBeenCalled()
    },
  )

  it("shows the item's new position in its menu, and says a move made twice each time", async () => {
    const { user } = await renderPage()

    await chooseFromMenu(user, "Delta", "Up one")
    await chooseFromMenu(user, "Delta", "Up one")

    expect(main().getByText("Moved up. 2 of 4.")).toBeInTheDocument()
    expect(await openMoveMenu(user, "Delta")).toHaveTextContent(
      /^In Now: 2 of 4/,
    )
  })

  it("moves by keyboard, the menu opening on its first choice, focus staying on the moved card's Move", async () => {
    const { user } = await renderPage()
    main().getByRole("button", { name: "Move Delta" }).focus()

    await user.keyboard("{Enter}")
    const menu = await screen.findByRole("menu")
    // The menu focuses its first choice a frame after it renders.
    await expectOpeningFocus(() =>
      within(menu).getByRole("menuitem", { name: "To the top" }),
    )
    await user.keyboard("{ArrowDown}{Enter}")

    // "To the top" is first, so one step down is "Up one".
    expect(titlesUnder("Now")).toEqual(["Alpha", "Bravo", "Delta", "Charlie"])
    await waitFor(() => {
      expect(main().getByRole("button", { name: "Move Delta" })).toHaveFocus()
    })
  })
})

describe("A pending order at the placement's heading (S3)", () => {
  it("tags the heading “Order changed” with “Undo order”, as one change, and tags no card", async () => {
    const { user } = await renderPage()

    await chooseFromMenu(user, "Delta", "To the top")

    const heading = main().getByRole("heading", { level: 2, name: "Now" })
    expect(heading).toHaveTextContent(/^Now$/)
    expect(heading.parentElement).toHaveTextContent("Order changed")
    expect(main().getByRole("button", { name: "Undo order Now" })).toBeVisible()
    expect(main().queryByText("Changed")).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(main().queryByRole("button", { name: "Undo order Next" })).toBeNull()
  })

  it("“Undo order” restores the loaded order, sends focus to the heading and says so", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")

    await user.click(main().getByRole("button", { name: "Undo order Now" }))

    expect(titlesUnder("Now")).toEqual(["Alpha", "Bravo", "Charlie", "Delta"])
    expect(main().getByRole("heading", { level: 2, name: "Now" })).toHaveFocus()
    expect(main().getByText("Order of Now undone")).toBeInTheDocument()
    expect(main().queryByText("Order changed")).toBeNull()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("is no change once reordered back to the order the page shows without it (D12)", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "Up one")

    await chooseFromMenu(user, "Delta", "Down one")

    expect(titlesUnder("Now")).toEqual(["Alpha", "Bravo", "Charlie", "Delta"])
    expect(main().queryByText("Order changed")).toBeNull()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("is dropped by “Discard all” (S9)", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")

    await user.click(
      main().getByRole("button", { name: "Discard all changes" }),
    )
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Discard all changes",
      }),
    )

    expect(titlesUnder("Now")).toEqual(["Alpha", "Bravo", "Charlie", "Delta"])
    expect(main().queryByText("Order changed")).toBeNull()
  })

  it("is kept with its base through Disconnect and “Keep changes”, so a co-lead's change made meanwhile still stops the publish (S9)", async () => {
    const user = userEvent.setup()
    const repository = createInMemoryRoadmapRepository(roadmaps, {
      producta: items,
    })
    const { router } = await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository,
    })
    await main().findByRole("heading", { level: 3, name: "Delta" })
    await chooseFromMenu(user, "Delta", "To the top")

    await disconnectFromHeader(user)
    await user.click(
      screen.getByRole("button", { name: "Keep changes and disconnect" }),
    )
    repository.coLead((_list, itemsOf) => {
      itemsOf("producta").splice(5, 0, item("Golf"))
    })
    await act(() => router.navigate({ to: "/" }))
    await user.click(main().getByRole("button", { name: "Connect Google" }))
    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "producta" },
      }),
    )

    await main().findByRole("heading", { level: 3, name: "Golf" })
    expect(titlesUnder("Now")).toEqual([
      "Delta",
      "Alpha",
      "Bravo",
      "Charlie",
      "Golf",
    ])
    expect(main().getByText("Order changed")).toBeInTheDocument()
    await publish(user)
    const review = await openConflictReview(user)
    expect(conflictOf(review, "Now: Order").lists).toEqual([
      ["Delta", "Alpha", "Bravo", "Charlie", "Golf"],
      ["Alpha", "Bravo", "Charlie", "Delta", "Golf"],
    ])
  })

  it("is dropped by a Refresh that reads the order already there, and kept by one that doesn't (S9)", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")

    await refreshRoadmap(user)
    await vi.waitFor(() => {
      expect(moreButton()).not.toHaveAttribute("aria-busy", "true")
    })
    expect(main().getByText("Order changed")).toBeInTheDocument()

    // A co-lead puts Delta first too.
    repository.coLead((_list, itemsOf) => {
      const stored = itemsOf("producta")
      const [delta] = stored.splice(4, 1)
      if (delta) stored.unshift(delta)
    })
    await refreshRoadmap(user)

    await waitFor(() => {
      expect(main().queryByText("Order changed")).toBeNull()
    })
    expect(titlesUnder("Now")).toEqual(["Delta", "Alpha", "Bravo", "Charlie"])
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  describe("where the items travel back (STY-073)", () => {
    afterEach(withoutViewTransitions)

    it("“Undo order” draws the default order as one travel within the placement, the other pending edits kept, and marks no item", async () => {
      const { user } = await renderPage()
      await chooseFromMenu(user, "Delta", "To the top")
      // Added before Echo is moved in, yet the undo puts Echo, moved in, before it.
      await addItem(user, "New clinic", "Now")
      await chooseFromMenu(user, "Echo", "Now")
      await chooseFromMenu(user, "New clinic", "To the top")
      expect(titlesUnder("Now")[0]).toBe("New clinic")
      const start = withViewTransitions()

      await user.click(main().getByRole("button", { name: "Undo order Now" }))

      // Not drawn until the browser has drawn the page as it was.
      expect(titlesUnder("Now")[0]).toBe("New clinic")
      await waitFor(() => {
        expect(titlesUnder("Now")).toEqual([
          "Alpha",
          "Bravo",
          "Charlie",
          "Delta",
          "Echo",
          "New clinic",
        ])
      })
      expect(start.mock.calls.map(([options]) => options.types)).toEqual([
        ["item-move"],
      ])
      expect(
        main().getByRole("heading", { level: 2, name: "Now" }),
      ).toHaveFocus()
      expect(main().getByText("Order of Now undone")).toBeInTheDocument()
      expect(main().queryByText("Order changed")).toBeNull()
      // The move in and the new item stay, as pending edits of their own.
      expect(main().getByText("2 unpublished changes")).toBeInTheDocument()
      expect(main().queryAllByText(/^(Moved |Placed)/)).toEqual([])
    })

    it("“Undo order” draws the default order at once where the system asks for reduced motion", async () => {
      const { user } = await renderPage()
      await chooseFromMenu(user, "Delta", "To the top")
      const start = withViewTransitions()
      matchMediaQueries(REDUCED_MOTION)

      await user.click(main().getByRole("button", { name: "Undo order Now" }))

      expect(titlesUnder("Now")).toEqual(["Alpha", "Bravo", "Charlie", "Delta"])
      expect(start).not.toHaveBeenCalled()
    })
  })
})

describe("A pending order and the items' own changes (S4, S5)", () => {
  it("is left alone by an item's “Undo changes”, which restores its title (S4)", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    const form = await openEditItemDialog(user, "Bravo")
    await user.type(form.getByRole("textbox", { name: "Title" }), " two")
    await confirmItemEdit(user)
    expect(main().getByText("2 unpublished changes")).toBeInTheDocument()

    await user.click(
      main().getByRole("button", { name: "Undo changes Bravo two" }),
    )

    expect(titlesUnder("Now")).toEqual(["Delta", "Alpha", "Bravo", "Charlie"])
    expect(main().getByText("Order changed")).toBeInTheDocument()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("takes an item moved in, and one added, last, where each can be reordered (S5)", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")

    await chooseFromMenu(user, "Echo", "Now")
    await addItem(user, "New clinic", "Now")

    expect(titlesUnder("Now")).toEqual([
      "Delta",
      "Alpha",
      "Bravo",
      "Charlie",
      "Echo",
      "New clinic",
    ])
    await chooseFromMenu(user, "New clinic", "To the top")
    await chooseFromMenu(user, "Echo", "Up one")
    expect(titlesUnder("Now")).toEqual([
      "New clinic",
      "Delta",
      "Alpha",
      "Bravo",
      "Echo",
      "Charlie",
    ])
    // The move and the new item are changes of their own beside the order.
    expect(main().getByText("3 unpublished changes")).toBeInTheDocument()
  })

  it("lets an item moved out leave the order, and takes one back out when its move in is undone (S5)", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    await chooseFromMenu(user, "Echo", "Now")
    await chooseFromMenu(user, "Echo", "To the top")

    await chooseFromMenu(user, "Alpha", "Later")
    expect(titlesUnder("Now")).toEqual(["Echo", "Delta", "Bravo", "Charlie"])

    await user.click(main().getByRole("button", { name: "Undo changes Echo" }))
    expect(titlesUnder("Now")).toEqual(["Delta", "Bravo", "Charlie"])
    expect(titlesUnder("Next")).toEqual(["Echo", "Foxtrot"])
    expect(main().getByText("Order changed")).toBeInTheDocument()
  })
})

describe("Publishing a pending order (S6, S7, S15)", () => {
  it("names the order in one line of “What changes”, the new order not listed (S6)", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    const form = await openEditItemDialog(user, "Bravo")
    await user.type(form.getByRole("textbox", { name: "Title" }), " two")
    await confirmItemEdit(user)

    await user.click(main().getByRole("button", { name: "Publish changes" }))

    const dialog = within(screen.getByRole("alertdialog"))
    expect(
      dialog.getAllByRole("listitem").map(({ textContent }) => textContent),
    ).toEqual(["NowOrder changed", "Bravo twoTitle"])
  })

  it("publishes the order, which then shows with nothing pending (S7)", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")

    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(
      (await repository.listRoadmapItems("producta")).map(
        ({ title }) => title.en,
      ),
    ).toEqual([
      "Delta",
      "Alpha",
      "Bravo",
      "Echo",
      "Charlie",
      "Foxtrot",
      "Solo",
      "Someday",
    ])
    expect(titlesUnder("Now")).toEqual(["Delta", "Alpha", "Bravo", "Charlie"])
    expect(main().queryByText("Order changed")).toBeNull()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("holds the order choices and “Undo order” while the roadmap is being published (S15)", async () => {
    const { user, repository } = await renderPage()
    const { held, release, released } = holdCall(
      repository.publishRoadmapChanges.bind(repository),
    )
    vi.spyOn(repository, "publishRoadmapChanges").mockImplementation(held)
    await chooseFromMenu(user, "Delta", "To the top")
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )
    await waitFor(() => {
      expect(held).toHaveBeenCalled()
    })
    // The dialog can't be closed while it publishes: the page behind it is the same.
    const undo = screen.getByRole("button", {
      name: "Undo order Now",
      hidden: true,
    })
    expect(undo).toHaveAttribute("aria-disabled", "true")

    await act(async () => {
      release()
      await released
    })
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
  })

  it("leaves the order as it is when a choice is made while publishing (S15)", async () => {
    const { user, repository } = await renderPage()
    const { held, release, released } = holdCall(
      repository.publishRoadmapChanges.bind(repository),
    )
    vi.spyOn(repository, "publishRoadmapChanges").mockImplementation(held)
    const form = await openEditItemDialog(user, "Bravo")
    await user.type(form.getByRole("textbox", { name: "Title" }), " two")
    await confirmItemEdit(user)
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )
    await waitFor(() => {
      expect(held).toHaveBeenCalled()
    })

    const move = screen.getByRole("button", {
      name: "Move Delta",
      hidden: true,
    })
    await user.click(move)
    const choice = await screen.findByRole("menuitem", {
      name: "To the top",
      hidden: true,
    })
    expect(choice).toHaveAttribute("aria-disabled", "true")
    expect(
      screen.getByRole("menuitem", { name: "Later", hidden: true }),
    ).not.toHaveAttribute("aria-disabled", "true")
    // Chosen all the same, by pointer and by keyboard: nothing moves, nothing is said.
    fireEvent.click(choice)
    choice.focus()
    await user.keyboard("{Enter}")
    expect(screen.queryByText(/^Moved to the top/)).toBeNull()
    await user.keyboard("{Escape}")

    await act(async () => {
      release()
      await released
    })
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(titlesUnder("Now")).toEqual([
      "Alpha",
      "Bravo two",
      "Charlie",
      "Delta",
    ])
    expect(main().queryByText("Order changed")).toBeNull()
  })
})

describe("A co-lead's change to the placement's items (S10–S13)", () => {
  /** A co-lead adds an item to Now, after Delta. */
  const addTheirs = (repository: InMemoryRoadmapRepository) => {
    repository.coLead((_list, itemsOf) => {
      itemsOf("producta").splice(5, 0, item("Golf"))
    })
  }

  it("stops the publish and shows both orders, yours as “Keep mine” would publish it (S10, S11)", async () => {
    const { user, repository } = await renderPage()
    const before = await repository.listRoadmapItems("producta")
    await chooseFromMenu(user, "Delta", "To the top")
    addTheirs(repository)

    await publish(user)

    const refusal = await findRefusal()
    expect(refusal).toHaveTextContent(
      "Someone else has changed this roadmap tooNothing was published.Review the changes",
    )
    const review = await openConflictReview(user)
    expect(review).toHaveAccessibleDescription(
      "Nothing was published. Choose which to keep for each, then publish again.",
    )
    const { conflict, lists } = conflictOf(review, "Now: Order")
    expect(
      conflict.getAllByRole("term").map(({ textContent }) => textContent),
    ).toEqual(["Your order", "Current order"])
    expect(lists).toEqual([
      ["Delta", "Alpha", "Bravo", "Charlie", "Golf"],
      ["Alpha", "Bravo", "Charlie", "Delta", "Golf"],
    ])
    await closeConflictReview(user, review)
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "true")
    // Nothing was written: the co-lead's item is all that differs.
    expect(
      (await repository.listRoadmapItems("producta")).filter(
        ({ title }) => title.en !== "Golf",
      ),
    ).toEqual(before)
    // The page shows what "Keep mine" would publish.
    expect(titlesUnder("Now")).toEqual([
      "Delta",
      "Alpha",
      "Bravo",
      "Charlie",
      "Golf",
    ])
  })

  it("“Keep mine” keeps the order pending from the current one, and the next publish writes it (S12)", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    addTheirs(repository)
    await publish(user)
    const review = await openConflictReview(user)

    await user.click(
      within(review).getByRole("button", { name: "Keep mine Now: Order" }),
    )

    // Nothing is left to decide: the review offers to publish, focused.
    expect(review).toHaveTextContent(
      "Every change is decided. Publish when you're ready.",
    )
    await expectOpeningFocus(() =>
      within(review).getByRole("button", { name: "Publish changes" }),
    )
    await closeConflictReview(user, review)

    expect(main().queryByRole("alert")).toBeNull()
    expect(main().getByText("Order changed")).toBeInTheDocument()
    const action = main().getByRole("button", { name: "Publish changes" })
    await expectOpeningFocus(() => action)
    await publish(user)
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(
      (await repository.listRoadmapItems("producta"))
        .filter(({ placement }) => placement === "now")
        .map(({ title }) => title.en),
    ).toEqual(["Delta", "Alpha", "Bravo", "Charlie", "Golf"])
  })

  it("“Use theirs” drops the pending order (S12)", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    addTheirs(repository)
    await publish(user)
    const review = await openConflictReview(user)

    await user.click(
      within(review).getByRole("button", { name: "Use theirs Now: Order" }),
    )

    // Dropping the order leaves nothing to publish.
    expect(review).toHaveTextContent(
      "Every change is decided. Nothing is left to publish.",
    )
    await closeConflictReview(user, review)

    expect(main().queryByRole("alert")).toBeNull()
    expect(main().queryByText("Order changed")).toBeNull()
    expect(titlesUnder("Now")).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
      "Delta",
      "Golf",
    ])
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("sits before the field conflicts of the placement's items (S11)", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    const form = await openEditItemDialog(user, "Bravo")
    await user.type(form.getByRole("textbox", { name: "Title" }), " two")
    await confirmItemEdit(user)
    repository.coLead((_list, itemsOf) => {
      const stored = itemsOf("producta")
      const bravo = stored[1]
      if (bravo) bravo.title = { en: "Their Bravo", cy: "" }
      stored.splice(5, 0, item("Golf"))
    })

    await publish(user)

    const review = await openConflictReview(user)
    expect(
      [...review.querySelectorAll(":scope ul > li > p")].map(
        ({ textContent }) => textContent,
      ),
    ).toEqual(["Now: Order", "Bravo two: Title"])
  })

  it("is no conflict for a co-lead's change to another placement or an item's text (S10)", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    repository.coLead((_list, itemsOf) => {
      const stored = itemsOf("producta")
      const bravo = stored[1]
      if (bravo) bravo.title = { en: "Their Bravo", cy: "" }
      stored.push(item("Hotel", "later"))
    })

    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(titlesUnder("Now")).toEqual([
      "Delta",
      "Alpha",
      "Their Bravo",
      "Charlie",
    ])
  })

  describe("deciding an item's placement (S13)", () => {
    /** Echo is moved into Now; a co-lead moves it to Later and adds Golf to Now. */
    async function conflicted(
      user: User,
      repository: InMemoryRoadmapRepository,
    ) {
      await chooseFromMenu(user, "Echo", "Now")
      repository.coLead((_list, itemsOf) => {
        const stored = itemsOf("producta")
        const echo = stored[2]
        if (echo) echo.placement = "later"
        stored.splice(5, 0, item("Golf"))
      })
    }

    it("takes the item out of your order at once, and clears the order conflict when the two orders are then the same", async () => {
      const { user, repository } = await renderPage()
      // Echo joins Now last, then goes above Delta: the one thing that differs.
      await chooseFromMenu(user, "Echo", "Now")
      await chooseFromMenu(user, "Echo", "Up one")
      repository.coLead((_list, itemsOf) => {
        const stored = itemsOf("producta")
        const echo = stored[2]
        if (echo) echo.placement = "later"
        stored.splice(5, 0, item("Golf"))
      })
      await publish(user)
      const review = await openConflictReview(user)
      expect(conflictOf(review, "Now: Order").lists).toEqual([
        ["Alpha", "Bravo", "Charlie", "Echo", "Delta", "Golf"],
        ["Alpha", "Bravo", "Charlie", "Delta", "Golf"],
      ])

      await user.click(
        within(review).getByRole("button", {
          name: "Use theirs Echo: Horizon or section",
        }),
      )
      expect(review).toHaveTextContent(
        "Every change is decided. Nothing is left to publish.",
      )
      await closeConflictReview(user, review)

      expect(main().queryByRole("alert")).toBeNull()
      expect(main().queryByText("Order changed")).toBeNull()
      expect(titlesUnder("Now")).toEqual([
        "Alpha",
        "Bravo",
        "Charlie",
        "Delta",
        "Golf",
      ])
    })

    it("redraws both orders when they still differ", async () => {
      const { user, repository } = await renderPage()
      await chooseFromMenu(user, "Delta", "To the top")
      await conflicted(user, repository)
      await publish(user)
      const review = await openConflictReview(user)
      expect(conflictOf(review, "Now: Order").lists).toEqual([
        ["Delta", "Alpha", "Bravo", "Charlie", "Echo", "Golf"],
        ["Alpha", "Bravo", "Charlie", "Delta", "Golf"],
      ])

      await user.click(
        within(review).getByRole("button", {
          name: "Use theirs Echo: Horizon or section",
        }),
      )

      expect(conflictOf(review, "Now: Order").lists).toEqual([
        ["Delta", "Alpha", "Bravo", "Charlie", "Golf"],
        ["Alpha", "Bravo", "Charlie", "Delta", "Golf"],
      ])
      await closeConflictReview(user, review)
      expect(main().getByText("Order changed")).toBeInTheDocument()
    })
  })
})

describe("In Welsh (D7)", () => {
  it("heads the choices with the position in numerals, and says the move and the tag in Welsh", async () => {
    const { user } = await renderPage({ language: "cy" })

    const menu = await openMoveMenu(user, "Delta", "Symud")
    expect(menu).toHaveTextContent(/^Nawr: 4 o 4/)
    expect(menuChoices(menu).slice(0, 2)).toEqual(["I'r brig", "I fyny un"])
    await user.click(within(menu).getByRole("menuitem", { name: "I'r brig" }))

    expect(main().getByText("Symudwyd i'r brig. 1 o 4.")).toBeInTheDocument()
    expect(main().getByText("Trefn wedi'i newid")).toBeInTheDocument()
    await user.click(
      main().getByRole("button", { name: "Dadwneud y drefn Nawr" }),
    )
    expect(main().getByText("Dadwnaed trefn Nawr")).toBeInTheDocument()
  })
})
