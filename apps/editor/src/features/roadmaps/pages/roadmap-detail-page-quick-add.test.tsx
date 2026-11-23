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

import { cornerClose, expectDialogClosed } from "../testing/edit-dialog"
import { holdCall } from "../testing/held-call"
import { holdRefresh } from "../testing/held-refresh"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapItems,
} from "../testing/in-memory-roadmap-repository"
import { addItemDialog, editItemDialog } from "../testing/item-dialog"
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
const CHECK_IN = "Check in from your phone"
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
  await expectOpeningFocus(() => field(placement))
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
  it("opens in its place, focused, named for its placement, with “Add more details”, Add and Cancel and no placeholder (S2; STY-081 S1)", async () => {
    const { user } = await renderPage()

    const input = await openField(user, "Next")

    expect(input).not.toHaveAttribute("placeholder")
    expect(queryField("Now")).toBeNull()
    const entry = input.closest("li")
    if (!entry) throw new Error("The field is in no list item")
    expect(
      within(entry)
        .getAllByRole("button")
        .map(
          (button) => button.getAttribute("aria-label") ?? button.textContent,
        ),
    ).toEqual(["Add more details", "Add", "Cancel"])
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

      await user.type(field("Next"), `${CHECK_IN}{Enter}`)
      expect(titlesUnder("Next")).toEqual([
        "See your waiting time",
        HEARING,
        CHECK_IN,
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

  it("stays open as Tab goes to its own buttons, and drops what was typed as Tab leaves it (S5)", async () => {
    const { user } = await renderPage()
    const input = await openField(user, "Next")
    await user.type(input, HEARING)

    await user.tab()
    expect(moreDetails()).toHaveFocus()
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
    await user.tab()
    expect(main().getByRole("button", { name: "Add" })).toHaveFocus()
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

  it("stays open, with what was typed, when the page takes focus itself, as the session warning does (S5)", async () => {
    const { user } = await renderPage()
    const input = await openField(user, "Next")
    await user.type(input, HEARING)

    act(() => {
      main().getByRole("button", { name: "More" }).focus()
    })
    // A leave waits a task: let one pass.
    await act(() => new Promise((resolve) => setTimeout(resolve)))

    expect(field("Next")).toHaveValue(HEARING)
    act(() => {
      field("Next").focus()
    })
    await user.keyboard("{Enter}")
    expect(titlesUnder("Next")).toEqual(["See your waiting time", HEARING])
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

describe("An empty placement (S1, S6)", () => {
  it("offers its first item in words, and a title typed there is tidied and added under it", async () => {
    const { user } = await renderPage()
    const first = quickAdd("Not doing")
    expect(within(first).getByText("Add the first item")).toBeVisible()
    expect(main().queryByText("No items", { exact: true })).toBeNull()

    await user.click(first)
    await user.keyboard("{Enter}")
    await expectOpeningFocus(() => field("Not doing"))
    await user.type(field("Not doing"), "  Paper   letters {Enter}")

    expect(titlesUnder("Not doing")).toEqual(["Paper letters"])
  })
})

describe("“Add more details” says what it does on hover", () => {
  it("shows its name as a tooltip", async () => {
    const { user } = await renderPage()
    await openField(user, "Next")

    await user.hover(main().getByRole("button", { name: "Add more details" }))

    // Base UI gives a tooltip no role: it is found by its slot.
    expect(
      await screen.findByText("Add more details", {
        selector: "[data-slot=tooltip-content]",
      }),
    ).toBeVisible()
  })
})

describe("While a publish or a read is under way (S9)", () => {
  it("adds pending items while a publish of the roadmap is under way, the page left and come back to, by title and in the dialog, which stay pending once it settles (STY-081 S5)", async () => {
    const { user, repository, router } = await renderPage()
    // The list, then back: so the page can be left and come back to by history.
    await act(() => router.navigate({ to: "/" }))
    act(() => {
      router.history.back()
    })
    await main().findByRole("heading", { level: 3, name: "Online booking" })
    const { held, release, released } = holdCall(
      repository.publishRoadmapChanges.bind(repository),
    )
    vi.spyOn(repository, "publishRoadmapChanges").mockImplementation(held)
    await user.type(await openField(user, "Now"), "First new item{Enter}")
    await user.keyboard("{Escape}")
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )
    expect(held).toHaveBeenCalled()

    // The publish dialog is modal while it writes: Forward to the list leaves the
    // page, Back returns to it, the publish still under way.
    act(() => {
      router.history.forward()
    })
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          level: 3,
          name: "Online booking",
          hidden: true,
        }),
      ).toBeNull()
    })
    act(() => {
      router.history.back()
    })
    await main().findByRole("heading", { level: 3, name: "Online booking" })
    expect(screen.queryByRole("alertdialog")).toBeNull()
    await user.type(await openField(user, "Next"), `${HEARING}{Enter}`)
    expect(titlesUnder("Next")).toEqual(["See your waiting time", HEARING])
    // "Add more details" opens the dialog meanwhile, and adds there (STY-081 S5).
    await user.type(field("Next"), CHECK_IN)
    await user.click(moreDetails())
    await user.click(addItemDialog().getByRole("button", { name: "Add item" }))
    await expectDialogClosed()
    expect(titlesUnder("Next")).toEqual([
      "See your waiting time",
      HEARING,
      CHECK_IN,
    ])

    await act(async () => {
      release()
      await released
    })
    expect(await main().findByText(/^Changes published\./)).toBeVisible()
    expect(main().getByText("2 unpublished changes")).toBeVisible()
    expect(titlesUnder("Next")).toEqual([
      "See your waiting time",
      HEARING,
      CHECK_IN,
    ])
  })

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
    await expectOpeningFocus(() => input)
    expect(main().getByRole("button", { name: "Canslo" })).toBeVisible()

    await user.type(input, HEARING)
    await user.click(main().getByRole("button", { name: "Ychwanegu" }))

    expect(said(`Ychwanegwyd “${HEARING}” o dan Nesaf.`)).toBeDefined()
  })
})

// "Add more details" (STY-081): the field's expand button opens the item dialog with
// the title typed so far and the field's placement.

const TYPED = " Book a  hearing test "
const TIDIED = "Book a hearing test"

function moreDetails() {
  return main().getByRole("button", { name: "Add more details" })
}

/** Opens Next's field, types `typed` and chooses "Add more details". */
async function expand(user: User, typed = TYPED) {
  const input = await openField(user, "Next")
  if (typed) await user.type(input, typed)
  await user.click(moreDetails())
  return addItemDialog()
}

/** Expects Next's field open, focused, holding `typed` with the cursor at its end. */
async function expectFieldBack(typed: string) {
  await expectOpeningFocus(() => field("Next"))
  const input = field("Next")
  expect(input).toHaveValue(typed)
  if (!(input instanceof HTMLInputElement)) throw new Error("No input")
  expect([input.selectionStart, input.selectionEnd]).toEqual([
    typed.length,
    typed.length,
  ])
}

const CLOSINGS = [
  [
    "Cancel",
    (user: User) =>
      user.click(addItemDialog().getByRole("button", { name: "Cancel" })),
  ],
  ["Escape", (user: User) => user.keyboard("{Escape}")],
  [
    "the corner's Close",
    (user: User) => user.click(cornerClose(screen.getByRole("dialog"))),
  ],
] as const

describe("“Add more details” (STY-081 S1, S2)", () => {
  it("is at the field's end, between the title and Add in the tab order (S1)", async () => {
    const { user } = await renderPage()
    const input = await openField(user, "Next")

    expect(moreDetails()).toBeVisible()
    await user.tab()
    expect(moreDetails()).toHaveFocus()
    await user.tab()
    expect(main().getByRole("button", { name: "Add" })).toHaveFocus()
    expect(input).toBeVisible()
  })

  it("opens the item dialog's adding form with the title tidied, Next chosen, every other field empty and focus at the title's end (S2)", async () => {
    const { user } = await renderPage()

    const dialog = await expand(user)

    const title = dialog.getByRole("textbox", { name: "Title" })
    expect(title).toHaveValue(TIDIED)
    expect(
      dialog.getByRole("combobox", { name: "Horizon or section" }),
    ).toHaveValue("next")
    for (const name of ["Description", "Expected outcome", "Phase"]) {
      expect(dialog.getByRole("textbox", { name })).toHaveValue("")
    }
    for (const none of ["No tags", "No organisations", "No details"]) {
      expect(dialog.getByText(none)).toBeVisible()
    }
    await expectOpeningFocus(() => title)
    if (!(title instanceof HTMLInputElement)) throw new Error("No input")
    expect([title.selectionStart, title.selectionEnd]).toEqual([
      TIDIED.length,
      TIDIED.length,
    ])
  })

  it("opens with an empty title and Next chosen when nothing is typed (S2)", async () => {
    const { user } = await renderPage()

    const dialog = await expand(user, "")

    expect(dialog.getByRole("textbox", { name: "Title" })).toHaveValue("")
    expect(
      dialog.getByRole("combobox", { name: "Horizon or section" }),
    ).toHaveValue("next")
  })
})

describe("Adding in the dialog (STY-081 S3, S7)", () => {
  it("adds the item with everything written, last in the placement chosen, tagged New; the dialog and the field close, focus on its Edit (S3)", async () => {
    const { user } = await renderPage()
    const dialog = await expand(user)
    await user.type(
      dialog.getByRole("textbox", { name: "Description" }),
      "Choose a time that suits you.",
    )
    await user.selectOptions(
      dialog.getByRole("combobox", { name: "Horizon or section" }),
      "Later",
    )

    await user.click(dialog.getByRole("button", { name: "Add item" }))

    await expectDialogClosed()
    expect(titlesUnder("Later")).toEqual([TIDIED])
    expect(titlesUnder("Next")).toEqual(["See your waiting time"])
    const card = main()
      .getByRole("heading", { level: 3, name: TIDIED })
      .closest("li")
    if (!card) throw new Error("No card")
    expect(within(card).getByText("New")).toBeVisible()
    const edit = main().getByRole("button", { name: `Edit ${TIDIED}` })
    await waitFor(() => {
      expect(edit).toHaveFocus()
    })
    expect(queryField("Next")).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeVisible()
    await user.click(edit)
    expect(
      editItemDialog().getByRole("textbox", { name: "Description" }),
    ).toHaveValue("Choose a time that suits you.")
  })

  it("keeps the title as typed when it is added unchanged, last in Next (S3)", async () => {
    const { user } = await renderPage()
    const dialog = await expand(user)

    await user.click(dialog.getByRole("button", { name: "Add item" }))

    await expectDialogClosed()
    expect(titlesUnder("Next")).toEqual(["See your waiting time", TIDIED])
  })

  it.each(CLOSINGS)(
    "ends the run on %s after “Add and start another”: the field stays closed, focus on Next's “Add an item” (S7)",
    async (_how, close) => {
      const { user } = await renderPage()
      const dialog = await expand(user)
      await user.click(
        dialog.getByRole("button", { name: "Add and start another" }),
      )
      await waitFor(() => {
        expect(addItemDialog().getByRole("status")).not.toBeEmptyDOMElement()
      })

      await close(user)

      await expectDialogClosed()
      await waitFor(() => {
        expect(quickAdd("Next")).toHaveFocus()
      })
      expect(queryField("Next")).toBeNull()
      expect(titlesUnder("Next")).toEqual(["See your waiting time", TIDIED])
    },
  )
})

describe("Closing the dialog having added nothing (STY-081 S4)", () => {
  it.each(CLOSINGS)(
    "%s adds nothing and brings Next's field back, the title as typed, focused, the cursor at its end",
    async (_how, close) => {
      const { user } = await renderPage()
      const input = await openField(user, "Next")
      await user.type(input, TYPED)
      // The cursor elsewhere in the title as it is expanded.
      await user.keyboard("{Home}")
      await user.click(moreDetails())
      await user.type(
        addItemDialog().getByRole("textbox", { name: "Description" }),
        "Dropped",
      )

      await close(user)

      await expectDialogClosed()
      await expectFieldBack(TYPED)
      expect(titlesUnder("Next")).toEqual(["See your waiting time"])
      expect(main().queryByText(/unpublished change/)).toBeNull()
    },
  )

  it("does nothing on a click outside the dialog", async () => {
    const { user } = await renderPage()
    await expand(user)

    await user.click(document.body)

    expect(addItemDialog().getByRole("textbox", { name: "Title" })).toHaveValue(
      TIDIED,
    )
  })

  it("brings the field back, with its title, over a read that lands while the dialog is open", async () => {
    const { user, repository } = await renderPage()
    const release = await holdRefresh(user, repository)
    await expand(user)

    await release()
    await user.keyboard("{Escape}")

    await expectDialogClosed()
    await expectFieldBack(TYPED)
  })

  it("can be expanded again, and Enter in the field back adds the title as quick add does", async () => {
    const { user } = await renderPage()
    await expand(user)
    await user.keyboard("{Escape}")
    await expectFieldBack(TYPED)

    await user.keyboard("{Enter}")

    expect(titlesUnder("Next")).toEqual(["See your waiting time", TIDIED])
    expect(field("Next")).toHaveValue("")
  })
})

describe("While the session has expired (STY-081 S5)", () => {
  it("opens the dialog without asking to reconnect, and adds there", async () => {
    const { user, authClient } = await renderPage()
    act(() => {
      authClient.setState({ status: "expired" })
    })

    const dialog = await expand(user)
    await user.click(dialog.getByRole("button", { name: "Add item" }))

    await expectDialogClosed()
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(titlesUnder("Next")).toEqual(["See your waiting time", TIDIED])
  })
})

describe("In Welsh (STY-081 S6)", () => {
  it("names the button, and the dialog it opens is the Welsh adding form", async () => {
    const { user } = await renderPage({ language: "cy" })
    await user.click(
      main().getByRole("button", { name: "Ychwanegu eitem o dan Nesaf" }),
    )
    await user.type(
      main().getByRole("textbox", { name: "Teitl eitem newydd o dan Nesaf" }),
      TYPED,
    )

    await user.click(
      main().getByRole("button", { name: "Ychwanegu rhagor o fanylion" }),
    )

    const dialog = addItemDialog("cy")
    expect(
      dialog.getByRole("textbox", { name: "Teitl (Saesneg)" }),
    ).toHaveValue(TIDIED)
    expect(
      dialog.getByRole("combobox", { name: "Gorwel neu adran" }),
    ).toHaveValue("next")
  })
})

describe("The publish dialog flags what quick add makes (STY-082 S1)", () => {
  it("marks an item added by title alone, as new and with only a title, as an item added in the item dialog with a title alone is", async () => {
    const { user } = await renderPage()
    await user.click(quickAdd("Next"))
    await user.type(field("Next"), HEARING)
    await user.keyboard("{Enter}")

    await user.click(main().getByRole("button", { name: "Publish changes" }))

    const dialog = within(screen.getByRole("alertdialog"))
    expect(
      dialog.getAllByRole("listitem").map(({ textContent }) => textContent),
    ).toEqual([`${HEARING}New item, title only`])
  })
})
