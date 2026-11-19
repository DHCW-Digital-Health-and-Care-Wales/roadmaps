import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  addItem,
  confirmItemEdit,
  editItemText,
  openEditItemDialog,
} from "../testing/item-dialog"
import { confirmRemoval } from "../testing/removal-dialog"
import { moreButton, refreshRoadmap } from "../testing/roadmap-page"
import {
  withoutViewTransitions,
  withViewTransitions,
} from "../testing/view-transitions"

/**
 * The moved mark (STY-071): the item a Product Lead moved last shows an edge and a
 * label saying how it moved, until the next move, an undo that puts it back,
 * publishing, removing it, a read without the move, or leaving the page (S7, S8).
 * Display only: never a pending edit.
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

/** Every label of a moved mark, in either language, as a screen reader reads it. */
const MARK =
  /^(Moved (up|down|to the top|to the bottom|from [^.]+)|Placed|Symudwyd [^.]+|Gosodwyd)$/

/** The titles of the items marked as moved, each with its mark's label. */
function marked() {
  return main()
    .queryAllByText(MARK)
    .map((label) => {
      const title = label.closest("li")?.querySelector("h3")?.textContent
      return [title, label.textContent]
    })
}

/** The titles of the items listed under a horizon or section heading. */
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
  const rendered = await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
    ...(language ? { language } : {}),
  })
  await main().findByRole("heading", { level: 3, name: "Delta" })
  return { user, repository, router: rendered.router }
}

/** Chooses from an item's Move menu: a position, or another placement. */
async function chooseFromMenu(
  user: User,
  title: string,
  choice: string,
  move = "Move",
) {
  await user.click(main().getByRole("button", { name: `${move} ${title}` }))
  const menu = await screen.findByRole("menu")
  await user.click(within(menu).getByRole("menuitem", { name: choice }))
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

async function confirm(user: User, button: string) {
  await user.click(main().getByRole("button", { name: button }))
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: button,
    }),
  )
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("A move within a placement (S1)", () => {
  it.each([
    ["To the top", "Delta", "Moved to the top"],
    ["Up one", "Delta", "Moved up"],
    ["Down one", "Alpha", "Moved down"],
    ["To the bottom", "Alpha", "Moved to the bottom"],
  ])(
    "“%s” marks %s in its new place, labelled “%s”, and no other item",
    async (choice, title, label) => {
      const { user } = await renderPage()
      expect(marked()).toEqual([])

      await chooseFromMenu(user, title, choice)

      expect(marked()).toEqual([[title, label]])
    },
  )
})

describe("A move to another placement (S2, S5)", () => {
  it("marks an item moved from Now to Later by its Move menu “Moved from Now”, tagged Changed as today, and says where it went", async () => {
    const { user } = await renderPage()

    await chooseFromMenu(user, "Alpha", "Later")

    expect(titlesUnder("Later")).toEqual(["Solo", "Alpha"])
    expect(marked()).toEqual([["Alpha", "Moved from Now"]])
    const card = main()
      .getByRole("heading", { level: 3, name: "Alpha" })
      .closest("li")
    expect(card).toHaveTextContent("Changed")
    expect(main().getByText("Moved to Later. 2 of 2.")).toBeInTheDocument()
  })

  it("says where an item moved back to the placement it was read in shows: its place as read", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Alpha", "Later")

    await chooseFromMenu(user, "Alpha", "Now")

    expect(titlesUnder("Now")).toEqual(["Alpha", "Bravo", "Charlie", "Delta"])
    expect(main().getByText("Moved to Now. 1 of 4.")).toBeInTheDocument()
  })

  it("says where an item moved into a placement holding a new item shows: before it (STY-051 S1)", async () => {
    const { user } = await renderPage()
    await addItem(user, "Kilo", "Later")

    await chooseFromMenu(user, "Alpha", "Later")

    expect(titlesUnder("Later")).toEqual(["Solo", "Alpha", "Kilo"])
    expect(main().getByText("Moved to Later. 2 of 3.")).toBeInTheDocument()
  })

  it("marks an item moved by the item dialog the same way, saying nothing new (D11)", async () => {
    const { user } = await renderPage()

    await moveWithDialog(user, "Alpha", "Later")

    expect(marked()).toEqual([["Alpha", "Moved from Now"]])
    expect(main().queryByText(/^Moved to /)).toBeNull()
  })

  it.each(["menu", "dialog"] as const)(
    "labels an unplaced item given a placement by its %s “Placed”",
    async (way) => {
      const { user } = await renderPage()

      if (way === "menu") await chooseFromMenu(user, "Someday", "Now")
      else await moveWithDialog(user, "Someday", "Now")

      expect(marked()).toEqual([["Someday", "Placed"]])
      if (way === "menu") {
        expect(main().getByText("Placed in Now. 5 of 5.")).toBeInTheDocument()
      }
    },
  )

  it("marks an item moved to Not doing from Remove's question, as any move (D2)", async () => {
    const { user } = await renderPage()

    await confirmRemoval(user, "Alpha", { choice: "notDoing" })

    expect(marked()).toEqual([["Alpha", "Moved from Now"]])
  })

  it("keeps a new item's New tag beside its mark", async () => {
    const { user } = await renderPage()
    await addItem(user, "Kilo", "Next")

    await chooseFromMenu(user, "Kilo", "Later")

    expect(marked()).toEqual([["Kilo", "Moved from Next"]])
    const card = main()
      .getByRole("heading", { level: 3, name: "Kilo" })
      .closest("li")
    expect(card).toHaveTextContent("New")
  })
})

describe("The page scrolls to the moved item (S4)", () => {
  it("as focus comes to it after a move within its list, the first move's included", async () => {
    const { user } = await renderPage()
    const scrolled = vi.spyOn(Element.prototype, "scrollIntoView")

    await chooseFromMenu(user, "Delta", "To the top")
    // Two frames on, once the menu has let go of the page.
    for (let frame = 0; frame < 3; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }

    const delta = main()
      .getByRole("heading", { level: 3, name: "Delta" })
      .closest("li")
    expect(scrolled.mock.contexts).toContain(delta)
  })
})

describe("The page scrolls to an item that travelled (STY-072)", () => {
  afterEach(withoutViewTransitions)

  it("though focus came back to its Move before the move was drawn", async () => {
    // A browser that draws the move a while after it was chosen, as a view transition
    // does: the menu has handed focus back to Move by then.
    withViewTransitions()
    const { user } = await renderPage()
    const scrolled = vi.spyOn(Element.prototype, "scrollIntoView")
    const move = main().getByRole("button", { name: "Move Delta" })

    await chooseFromMenu(user, "Delta", "To the top")
    await waitFor(() => {
      expect(move).toHaveFocus()
    })
    await waitFor(() => {
      expect(marked()).toEqual([["Delta", "Moved to the top"]])
    })
    for (let frame = 0; frame < 3; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }

    expect(titlesUnder("Now")[0]).toBe("Delta")
    expect(scrolled.mock.contexts).toContain(move.closest("li"))
  })
})

describe("One mark (S6)", () => {
  it("goes to the item moved next", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "Up one")

    await chooseFromMenu(user, "Foxtrot", "Up one")

    expect(marked()).toEqual([["Foxtrot", "Moved up"]])
  })

  it("is labelled for the last move of the same item, even one back where it was read", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "Up one")

    await chooseFromMenu(user, "Delta", "Down one")

    expect(titlesUnder("Now")).toEqual(["Alpha", "Bravo", "Charlie", "Delta"])
    expect(marked()).toEqual([["Delta", "Moved down"]])

    await chooseFromMenu(user, "Delta", "Later")
    await chooseFromMenu(user, "Delta", "Now")

    expect(marked()).toEqual([["Delta", "Moved from Later"]])
  })
})

describe("What keeps the mark (S7)", () => {
  it("is kept through a switch to Compact and back", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "Up one")

    await user.click(main().getByRole("button", { name: "Compact view" }))
    await main().findByRole("button", { name: "Show the rest of Delta" })

    expect(marked()).toEqual([["Delta", "Moved up"]])

    await user.click(
      main().getByRole("button", { name: "Show the rest of Delta" }),
    )
    await user.click(
      main().getByRole("button", { name: "Hide the rest of Delta" }),
    )
    expect(marked()).toEqual([["Delta", "Moved up"]])

    await user.click(main().getByRole("button", { name: "Compact view" }))
    await main().findByRole("button", { name: "Edit Delta" })
    expect(marked()).toEqual([["Delta", "Moved up"]])
  })

  it("is kept through edits to the item's fields and another's", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Alpha", "Later")

    await editItemText(user, "Bravo", "Title", "Bravo two")
    await editItemText(user, "Alpha", "Title", "Alpha two")

    expect(marked()).toEqual([["Alpha two", "Moved from Now"]])
  })

  it("is kept by a Refresh that leaves the move pending", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    repository.coLead((_list, itemsOf) => {
      itemsOf("producta").push(item("Golf", "next"))
    })

    await refreshRoadmap(user)

    await main().findByRole("heading", { level: 3, name: "Golf" })
    expect(marked()).toEqual([["Delta", "Moved to the top"]])
  })

  it("is kept by “Undo order” on another placement", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Foxtrot", "Up one")
    await chooseFromMenu(user, "Delta", "Up one")

    await user.click(main().getByRole("button", { name: "Undo order Next" }))

    expect(marked()).toEqual([["Delta", "Moved up"]])
  })

  it("is kept by “Undo changes” on an item moved only within its placement, which leaves the order (D12)", async () => {
    const { user } = await renderPage()
    await editItemText(user, "Delta", "Title", "Delta two")
    await chooseFromMenu(user, "Delta two", "Up one")

    await user.click(
      main().getByRole("button", { name: "Undo changes Delta two" }),
    )

    expect(titlesUnder("Now")).toEqual(["Alpha", "Bravo", "Delta", "Charlie"])
    expect(marked()).toEqual([["Delta", "Moved up"]])
  })

  it("is kept when another item, new, is removed from before it, its move still pending (D17)", async () => {
    const { user } = await renderPage()
    await addItem(user, "Kilo", "Later")
    await addItem(user, "Lima", "Next")
    await chooseFromMenu(user, "Lima", "Later")
    expect(titlesUnder("Later")).toEqual(["Solo", "Kilo", "Lima"])

    await confirmRemoval(user, "Kilo")

    expect(titlesUnder("Later")).toEqual(["Solo", "Lima"])
    expect(marked()).toEqual([["Lima", "Moved from Next"]])
  })

  it("is kept by a refused publish (D12)", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Delta", "Up one")
    // A co-lead reorders Now too, so the publish stops for a review.
    repository.coLead((_list, itemsOf) => {
      const stored = itemsOf("producta")
      const [alpha] = stored.splice(0, 1)
      if (alpha) stored.push(alpha)
    })

    await confirm(user, "Publish changes")

    await main().findByText(/Someone else has changed this roadmap too/)
    expect(marked()).toEqual([["Delta", "Moved up"]])
  })
})

describe("A failed publish (D12)", () => {
  it("keeps the mark, the move still pending", async () => {
    const { user, repository } = await renderPage()
    vi.spyOn(repository, "publishRoadmapChanges").mockRejectedValue(
      new AppError("network"),
    )
    await chooseFromMenu(user, "Delta", "Up one")

    await confirm(user, "Publish changes")

    await waitFor(() => {
      expect(
        main().getByRole("button", { name: "Publish changes" }),
      ).not.toHaveAttribute("aria-disabled", "true")
    })
    expect(main().getByText("Order changed")).toBeInTheDocument()
    expect(marked()).toEqual([["Delta", "Moved up"]])
  })
})

describe("What clears the mark (S8)", () => {
  it("is cleared by “Undo order” on the item's placement", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "Up one")
    expect(marked()).toEqual([["Delta", "Moved up"]])

    await user.click(main().getByRole("button", { name: "Undo order Now" }))

    expect(marked()).toEqual([])
  })

  it("is cleared by “Undo order” on the placement an item was moved into, though it stays last there (D12)", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Echo", "Later")
    await chooseFromMenu(user, "Echo", "Up one")
    await chooseFromMenu(user, "Alpha", "Later")
    expect(marked()).toEqual([["Alpha", "Moved from Now"]])

    await user.click(main().getByRole("button", { name: "Undo order Later" }))

    expect(titlesUnder("Later")).toEqual(["Solo", "Echo", "Alpha"])
    expect(marked()).toEqual([])
  })

  it("is cleared by “Undo changes” that puts the item back where it was", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Alpha", "Later")
    expect(marked()).toEqual([["Alpha", "Moved from Now"]])

    await user.click(main().getByRole("button", { name: "Undo changes Alpha" }))

    expect(titlesUnder("Now")).toContain("Alpha")
    expect(marked()).toEqual([])
  })

  it("is cleared by “Undo changes” that puts the item back into a placement whose order is pending", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    await chooseFromMenu(user, "Alpha", "Later")
    expect(marked()).toEqual([["Alpha", "Moved from Now"]])

    await user.click(main().getByRole("button", { name: "Undo changes Alpha" }))

    expect(titlesUnder("Now")).toContain("Alpha")
    expect(marked()).toEqual([])
  })

  it("is cleared by “Discard all”", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "Up one")
    expect(marked()).toEqual([["Delta", "Moved up"]])

    await confirm(user, "Discard all changes")

    expect(marked()).toEqual([])
  })

  it("is cleared by “Discard all” that puts an item moved back to its placement where it was read", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    await chooseFromMenu(user, "Alpha", "Later")
    await chooseFromMenu(user, "Alpha", "Now")
    expect(titlesUnder("Now")).toEqual(["Delta", "Bravo", "Charlie", "Alpha"])
    expect(marked()).toEqual([["Alpha", "Moved from Later"]])
    // Read again, the order still puts Alpha last: its move is still pending (S7).
    await refreshRoadmap(user)
    await vi.waitFor(() => {
      expect(moreButton()).not.toHaveAttribute("aria-busy", "true")
    })
    expect(marked()).toEqual([["Alpha", "Moved from Later"]])

    await confirm(user, "Discard all changes")

    expect(titlesUnder("Now")).toEqual(["Alpha", "Bravo", "Charlie", "Delta"])
    expect(marked()).toEqual([])
  })

  it("is cleared by a Refresh after a move that came to no change (D9, D17)", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "Up one")
    await chooseFromMenu(user, "Delta", "Down one")
    expect(marked()).toEqual([["Delta", "Moved down"]])

    await refreshRoadmap(user)

    await waitFor(() => {
      expect(marked()).toEqual([])
    })
  })

  it("is cleared by a Refresh after a move within a placement that came to no change, though the item's move there is still pending", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Delta", "Later")
    await chooseFromMenu(user, "Alpha", "Later")
    await chooseFromMenu(user, "Alpha", "Up one")
    await chooseFromMenu(user, "Alpha", "Down one")
    expect(marked()).toEqual([["Alpha", "Moved down"]])

    await refreshRoadmap(user)

    await waitFor(() => {
      expect(marked()).toEqual([])
    })
  })

  it("is cleared by a Refresh that finds the item gone", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Alpha", "Later")
    repository.coLead((_list, itemsOf) => {
      itemsOf("producta").splice(0, 1)
    })

    await refreshRoadmap(user)

    await waitFor(() => {
      expect(
        main().queryByRole("heading", { level: 3, name: "Alpha" }),
      ).toBeNull()
    })
    expect(marked()).toEqual([])
  })

  it("is cleared by “Publish roadmap” on a roadmap not published, after a move that came to no change", async () => {
    const draft = createTestRoadmap("producta", "Product A roadmap", {
      published: false,
    })
    const { user } = await renderPage({
      repository: createInMemoryRoadmapRepository([draft], {
        producta: items,
      }),
    })
    await chooseFromMenu(user, "Delta", "Up one")
    await chooseFromMenu(user, "Delta", "Down one")
    expect(marked()).toEqual([["Delta", "Moved down"]])

    await user.click(main().getByRole("button", { name: "Publish roadmap" }))
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Publish roadmap",
      }),
    )

    await main().findByText(/^Product A roadmap is published\./)
    await waitFor(() => {
      expect(marked()).toEqual([])
    })
  })

  it("is cleared by a successful publish", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Alpha", "Later")
    expect(marked()).toEqual([["Alpha", "Moved from Now"]])

    await confirm(user, "Publish changes")

    await main().findByText(/^Changes published\./)
    await waitFor(() => {
      expect(marked()).toEqual([])
    })
  })

  it("is cleared by removing the item, and not brought back by undoing that", async () => {
    const { user } = await renderPage()
    await chooseFromMenu(user, "Alpha", "Later")
    expect(marked()).toEqual([["Alpha", "Moved from Now"]])

    await confirmRemoval(user, "Alpha")

    expect(marked()).toEqual([])
    await user.click(main().getByRole("button", { name: "Undo removal Alpha" }))
    expect(marked()).toEqual([])
  })

  it("is cleared by a Refresh that reads the move already made", async () => {
    const { user, repository } = await renderPage()
    await chooseFromMenu(user, "Delta", "To the top")
    expect(marked()).toEqual([["Delta", "Moved to the top"]])
    // A co-lead puts Delta first too: the order is no longer pending.
    repository.coLead((_list, itemsOf) => {
      const stored = itemsOf("producta")
      const [delta] = stored.splice(4, 1)
      if (delta) stored.unshift(delta)
    })

    await refreshRoadmap(user)

    await waitFor(() => {
      expect(main().queryByText("Order changed")).toBeNull()
    })
    expect(marked()).toEqual([])
  })

  it("is cleared by leaving the page", async () => {
    const { user, router } = await renderPage()
    await chooseFromMenu(user, "Delta", "Up one")
    expect(marked()).toEqual([["Delta", "Moved up"]])

    await act(() => router.navigate({ to: "/" }))
    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "producta" },
      }),
    )

    await main().findByRole("heading", { level: 3, name: "Delta" })
    expect(main().getByText("Order changed")).toBeInTheDocument()
    expect(marked()).toEqual([])
  })
})

describe("The mark in Welsh (S9)", () => {
  it("reads in Welsh, and says a move to another placement in Welsh", async () => {
    const { user } = await renderPage({ language: "cy" })

    await chooseFromMenu(user, "Alpha", "Hwyrach", "Symud")

    expect(marked()).toEqual([["Alpha", "Symudwyd o Nawr"]])
    expect(main().getByText("Symudwyd i Hwyrach. 2 o 2.")).toBeInTheDocument()
  })
})
