import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { holdRefresh } from "../testing/held-refresh"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapItems,
} from "../testing/in-memory-roadmap-repository"
import { editItemDialog } from "../testing/item-dialog"
import { expectOpeningFocus } from "../testing/opening-focus"

// Quick add (STY-080): each placement ends with "Add an item", which opens a title
// field in its place.

const roadmaps: Roadmap[] = [createTestRoadmap("producta", "Product A roadmap")]

const booking = createTestRoadmapItem("Online booking", { id: "item-1" })
const waiting = createTestRoadmapItem("See your waiting time", {
  id: "item-2",
  placement: "next",
})
const unplaced = createTestRoadmapItem("Someday", {
  id: "item-3",
  placement: null,
  writtenHorizon: "Soon",
})

const HEARING = "Book a hearing test online"
const PLACEMENTS = [
  "Recently delivered",
  "Now",
  "Next",
  "Later",
  "Delivered this year",
  "Not doing",
]

type User = ReturnType<typeof userEvent.setup>

function main() {
  return within(screen.getByRole("main"))
}

/** The list of the placement headed `heading`. */
function listOf(heading: string) {
  return within(main().getByRole("list", { name: heading }))
}

function titlesUnder(heading: string) {
  return listOf(heading)
    .queryAllByRole("heading", { level: 3 })
    .map(({ textContent }) => textContent)
}

function quickAdd(placement: string) {
  return main().getByRole("button", {
    name: new RegExp(`^Add (an|the first) item to ${placement}$`),
  })
}

function field(placement: string) {
  return main().getByRole("textbox", {
    name: `Title of a new item in ${placement}`,
  })
}

function queryField(placement: string) {
  return main().queryByRole("textbox", {
    name: `Title of a new item in ${placement}`,
  })
}

/** The status message that says `text`, among the page's. */
function said(text: string) {
  return main()
    .getAllByRole("status")
    .find((status) => status.textContent === text)
}

async function renderPage({
  items = { producta: [booking, waiting] },
  language,
  authState = connected,
}: {
  items?: InMemoryRoadmapItems
  language?: Language
  authState?: AuthState
} = {}) {
  const user = userEvent.setup()
  const repository = createInMemoryRoadmapRepository(roadmaps, items)
  const rendered = await renderWithProviders({
    path: "/roadmaps/producta",
    authState,
    repository,
    ...(language ? { language } : {}),
  })
  await main().findAllByRole("heading", { level: 3 })
  return { user, repository, ...rendered }
}

async function openField(user: User, placement: string) {
  await user.click(quickAdd(placement))
  await expectOpeningFocus(field(placement))
  return field(placement)
}

describe("Every placement ends with “Add an item” (S1)", () => {
  it.each(["cards", "compact"])(
    "ends each of the six placements, in the %s view, “Add the first item” where it has none, in place of “No items”",
    async (view) => {
      const { user } = await renderPage({
        items: { producta: [unplaced, booking, waiting] },
      })
      if (view === "compact") {
        await user.click(main().getByRole("button", { name: "Compact view" }))
      }

      for (const placement of PLACEMENTS) {
        const items = listOf(placement).getAllByRole("listitem")
        const last = items.at(-1)
        const name =
          placement === "Now" || placement === "Next"
            ? `Add an item to ${placement}`
            : `Add the first item to ${placement}`
        expect(last && within(last).getByRole("button")).toHaveAccessibleName(
          name,
        )
      }
      expect(main().queryByText("No items")).toBeNull()
      // A new item needs a placement: the unplaced items have none.
      expect(
        listOf("Not on the public roadmap").queryByRole("button", {
          name: /^Add /,
        }),
      ).toBeNull()
      expect(main().getAllByRole("button", { name: /^Add / })).toHaveLength(7)
    },
  )

  it("is not there before the items are read, and the page's “Add an item” stays (S8, D6)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, {
      producta: [booking],
    })
    vi.spyOn(repository, "listRoadmapItems").mockImplementation(
      () => new Promise(() => undefined),
    )
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository,
    })
    await main().findByRole("button", { name: "Add an item" })

    expect(main().queryByRole("button", { name: /^Add .* to / })).toBeNull()
  })
})

describe("Its field (S2–S6)", () => {
  it("opens in its place, focused, named for its placement, with Add and Cancel and no placeholder (S2)", async () => {
    const { user } = await renderPage()

    const input = await openField(user, "Next")

    expect(input).not.toHaveAttribute("placeholder")
    expect(queryField("Now")).toBeNull()
    const entry = input.closest("li")
    if (!entry) throw new Error("The field is in no list item")
    expect(
      within(entry)
        .getAllByRole("button")
        .map(({ textContent }) => textContent),
    ).toEqual(["Add", "Cancel"])
    expect(main().queryByRole("button", { name: /to Next$/ })).toBeNull()
  })

  it.each(["Enter", "Add"])(
    "adds the title last in its placement, tagged New, pending, on %s, and opens a fresh field for the next (S3)",
    async (how) => {
      const { user, repository } = await renderPage()
      const published = vi.spyOn(repository, "publishRoadmapChanges")
      const input = await openField(user, "Next")

      await user.type(input, HEARING)
      if (how === "Enter") await user.keyboard("{Enter}")
      else await user.click(main().getByRole("button", { name: "Add" }))

      expect(titlesUnder("Next")).toEqual(["See your waiting time", HEARING])
      const card = main()
        .getByRole("heading", { level: 3, name: HEARING })
        .closest("li")
      if (!card) throw new Error("No card")
      expect(within(card).getByText("New")).toBeVisible()
      expect(main().getByText("1 unpublished change")).toBeVisible()
      expect(field("Next")).toHaveValue("")
      expect(field("Next")).toHaveFocus()
      expect(said(`“${HEARING}” was added to Next.`)).toBeDefined()
      expect(published).not.toHaveBeenCalled()

      await user.type(field("Next"), "Check in from your phone{Enter}")
      expect(titlesUnder("Next")).toEqual([
        "See your waiting time",
        HEARING,
        "Check in from your phone",
      ])
      expect(main().getByText("2 unpublished changes")).toBeVisible()
    },
  )

  it.each(["Escape", "Cancel"])(
    "drops what was typed on %s, and “Add an item” is back, focused (S4)",
    async (how) => {
      const { user } = await renderPage()
      const input = await openField(user, "Next")

      await user.type(input, HEARING)
      if (how === "Escape") await user.keyboard("{Escape}")
      else await user.click(main().getByRole("button", { name: "Cancel" }))

      await waitFor(() => {
        expect(quickAdd("Next")).toHaveFocus()
      })
      expect(queryField("Next")).toBeNull()
      expect(titlesUnder("Next")).toEqual(["See your waiting time"])
      expect(main().queryByText(/unpublished change/)).toBeNull()
    },
  )

  it("stays open as Tab goes to its own Add and Cancel, and drops what was typed as Tab leaves it (S5)", async () => {
    const { user } = await renderPage()
    const input = await openField(user, "Next")
    await user.type(input, HEARING)

    await user.tab()
    expect(main().getByRole("button", { name: "Add" })).toHaveFocus()
    await user.tab()
    expect(main().getByRole("button", { name: "Cancel" })).toHaveFocus()
    expect(field("Next")).toHaveValue(HEARING)

    await user.tab()
    await waitFor(() => {
      expect(queryField("Next")).toBeNull()
    })
    expect(quickAdd("Next")).toBeVisible()
    expect(titlesUnder("Next")).toEqual(["See your waiting time"])
  })

  it("puts focus back in the title after Add chosen by keyboard (S3)", async () => {
    const { user } = await renderPage()
    const input = await openField(user, "Next")
    await user.type(input, HEARING)

    await user.tab()
    await user.keyboard("{Enter}")

    expect(titlesUnder("Next")).toEqual(["See your waiting time", HEARING])
    expect(field("Next")).toHaveFocus()
    expect(field("Next")).toHaveValue("")
  })

  it("drops what was typed when a click lands elsewhere (S5)", async () => {
    const { user } = await renderPage()
    const input = await openField(user, "Next")
    await user.type(input, HEARING)

    await user.click(main().getByRole("heading", { level: 1 }))

    await waitFor(() => {
      expect(queryField("Next")).toBeNull()
    })
    expect(titlesUnder("Next")).toEqual(["See your waiting time"])
  })

  it("adds nothing for an empty title or spaces, staying open; runs spaces together; adds a repeated title as typed (S6)", async () => {
    const { user } = await renderPage()
    const input = await openField(user, "Next")

    await user.keyboard("{Enter}")
    await user.type(input, "   {Enter}")
    expect(titlesUnder("Next")).toEqual(["See your waiting time"])
    expect(field("Next")).toHaveFocus()

    await user.clear(field("Next"))
    await user.type(field("Next"), "  see   your waiting time {Enter}")
    expect(titlesUnder("Next")).toEqual([
      "See your waiting time",
      "see your waiting time",
    ])
  })
})

describe("While a publish or a read is under way (S9)", () => {
  it("keeps an open field, and what was typed in it, as the items are read again", async () => {
    const { user, repository } = await renderPage()
    const release = await holdRefresh(user, repository)
    const input = await openField(user, "Next")
    await user.type(input, HEARING)

    await release()

    expect(field("Next")).toHaveValue(HEARING)
    expect(field("Next")).toHaveFocus()
  })
})

describe("While the session has expired (S10)", () => {
  it("opens the field and adds pending items without asking to reconnect (S10)", async () => {
    const { user, authClient } = await renderPage()
    act(() => {
      authClient.setState({ status: "expired" })
    })

    const input = await openField(user, "Next")
    await user.type(input, `${HEARING}{Enter}`)

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(titlesUnder("Next")).toEqual(["See your waiting time", HEARING])
  })
})

describe("A quick-added item (S12)", () => {
  it("is a new item like any other: Edit opens the dialog on its title alone, in its placement", async () => {
    const { user } = await renderPage()
    const input = await openField(user, "Next")
    await user.type(input, `${HEARING}{Enter}`)
    await user.keyboard("{Escape}")

    await user.click(main().getByRole("button", { name: `Edit ${HEARING}` }))

    const dialog = editItemDialog()
    expect(dialog.getByRole("textbox", { name: "Title" })).toHaveValue(HEARING)
    expect(dialog.getByRole("textbox", { name: "Description" })).toHaveValue("")
    expect(
      dialog.getByRole("combobox", { name: "Horizon or section" }),
    ).toHaveValue("next")
  })
})

describe("In Welsh (S13)", () => {
  it("names the control, its field and its buttons, and says what was added", async () => {
    const { user } = await renderPage({ language: "cy" })

    await user.click(
      main().getByRole("button", { name: "Ychwanegu eitem o dan Nesaf" }),
    )
    expect(
      main().getByRole("button", {
        name: "Ychwanegu'r eitem gyntaf o dan Ddim yn bwrw ymlaen",
      }),
    ).toBeVisible()
    const input = main().getByRole("textbox", {
      name: "Teitl eitem newydd o dan Nesaf",
    })
    await expectOpeningFocus(input)
    expect(main().getByRole("button", { name: "Canslo" })).toBeVisible()

    await user.type(input, HEARING)
    await user.click(main().getByRole("button", { name: "Ychwanegu" }))

    expect(said(`Ychwanegwyd “${HEARING}” o dan Nesaf.`)).toBeDefined()
  })
})
