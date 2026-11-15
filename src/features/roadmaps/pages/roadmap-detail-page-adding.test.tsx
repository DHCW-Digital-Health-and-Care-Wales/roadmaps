import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { ContractWrite } from "@/domain/roadmap/testing/contract-write"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { AppError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render-with-providers"

import { expectDialogClosed } from "../testing/edit-dialog"
import { holdCall } from "../testing/held-call"
import { holdRefresh } from "../testing/held-refresh"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapItems,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  addItem,
  addItemButtons,
  addItemDialog,
  confirmItemEdit,
  editItemDialog,
  editItemText,
  fillAndAddItem,
  openAddItemDialog,
  openEditItemDialog,
} from "../testing/item-dialog"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const roadmaps: Roadmap[] = [
  createTestRoadmap("producta", "Product A roadmap"),
  createTestRoadmap("productc", "Product C roadmap", { published: false }),
]

const booking = createTestRoadmapItem("Online booking", {
  id: "item-1",
  tags: [{ en: "Patients", cy: "" }],
})
const reminders = createTestRoadmapItem("Text reminders", {
  id: "item-2",
  placement: "next",
})

const CLINIC = "Choose a clinic closer to home"
const CHECK_IN = "Check in from your phone"
const PLACEMENT_HEADINGS = [
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

/** The card of the item headed `title`. */
function card(title: string) {
  const heading = main().getByRole("heading", { level: 3, name: title })
  const item = heading.closest("li")
  if (!item) throw new Error(`No card for ${title}`)
  return within(item)
}

/** The titles of the cards listed under a horizon or section heading. */
function titlesUnder(heading: string) {
  return within(main().getByRole("list", { name: heading }))
    .getAllByRole("heading", { level: 3 })
    .map(({ textContent }) => textContent)
}

interface RenderOptions {
  /** `productc` is not published and has no items. */
  path?: "/roadmaps/producta" | "/roadmaps/productc"
  items?: InMemoryRoadmapItems
  write?: ContractWrite
  language?: Language
  repository?: InMemoryRoadmapRepository
}

async function renderPage({
  path = "/roadmaps/producta",
  items = { producta: [booking, reminders] },
  write,
  language,
  repository = createInMemoryRoadmapRepository(
    roadmaps,
    items,
    write ? { write } : {},
  ),
}: RenderOptions = {}) {
  const user = userEvent.setup()
  const rendered = await renderWithProviders({
    path,
    authState: connected,
    repository,
    ...(language ? { language } : {}),
  })
  // The items are read once a heading follows About's: a placement's, or "No items yet".
  await waitFor(() => {
    expect(main().getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(
      1,
    )
  })
  return { user, repository, ...rendered }
}

async function publish(user: User, action = "Publish changes") {
  await user.click(main().getByRole("button", { name: action }))
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: action,
    }),
  )
}

describe("“Add an item” on a roadmap's page (STY-046 S1)", () => {
  it("is one button with the page's actions, once the roadmap's items are read", async () => {
    await renderPage()

    const buttons = addItemButtons()
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAttribute("aria-disabled", "false")
    // After Refresh, in the row of the page's actions.
    const refresh = main().getByRole("button", { name: "Refresh" })
    expect(buttons[0]?.parentElement).toBe(refresh.parentElement)
  })

  it("is unavailable while the items are read", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, {
      producta: [booking],
    })
    const { held, release, released } = holdCall(
      repository.listRoadmapItems.bind(repository),
    )
    vi.spyOn(repository, "listRoadmapItems").mockImplementation(held)
    const user = userEvent.setup()
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository,
    })
    const button = await main().findByRole("button", { name: "Add an item" })

    expect(button).toHaveAttribute("aria-disabled", "true")
    await user.click(button)
    expect(screen.queryByRole("dialog")).toBeNull()

    await act(async () => {
      release()
      await released
    })
    await main().findByRole("heading", { level: 3, name: "Online booking" })
    expect(button).toHaveAttribute("aria-disabled", "false")
  })

  it("is unavailable while the items can't be read", async () => {
    const user = userEvent.setup()
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository: createInMemoryRoadmapRepository(roadmaps, {
        producta: new AppError("network"),
      }),
    })
    await main().findByText("Couldn't load this roadmap's items")

    const [button] = addItemButtons()
    expect(button).toHaveAttribute("aria-disabled", "true")
    if (button) await user.click(button)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("is unavailable while the organisation list, which the dialog names from, can't be read", async () => {
    const user = userEvent.setup()
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository: createInMemoryRoadmapRepository(
        roadmaps,
        { producta: [booking] },
        { organisations: new AppError("network") },
      ),
    })
    await main().findByText("Couldn't load this roadmap's items")

    const [button] = addItemButtons()
    expect(button).toHaveAttribute("aria-disabled", "true")
    if (button) await user.click(button)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it.each<AuthState>([{ status: "expired" }, { status: "connecting" }])(
    "is unavailable while not connected: $status",
    async (state) => {
      const { user, authClient } = await renderPage()

      act(() => {
        authClient.setState(state)
      })

      const [button] = addItemButtons()
      expect(button).toHaveAttribute("aria-disabled", "true")
      if (button) await user.click(button)
      expect(screen.queryByRole("dialog")).toBeNull()
    },
  )
})

describe("The item dialog, adding (STY-046 S2)", () => {
  it("opens empty, with no horizon chosen, Tags, Organisations and Details shut, saying when the item is published", async () => {
    const { user } = await renderPage()

    const form = await openAddItemDialog(user)

    const title = form.getByRole("textbox", { name: "Title" })
    await waitFor(() => {
      expect(title).toHaveFocus()
    })
    for (const name of ["Title", "Description", "Expected outcome", "Phase"]) {
      expect(form.getByRole("textbox", { name })).toHaveValue("")
    }
    const placement = form.getByRole("combobox", { name: "Horizon or section" })
    expect(placement).toHaveValue("")
    expect(placement).toHaveDisplayValue("Choose a horizon or section")
    expect(
      within(placement).getByRole("option", {
        name: "Choose a horizon or section",
      }),
    ).toBeDisabled()
    expect(
      within(placement)
        .getAllByRole("option")
        .map(({ textContent }) => textContent),
    ).toEqual(["Choose a horizon or section", ...PLACEMENT_HEADINGS])
    for (const name of ["Add tags", "Add organisations", "Add details"]) {
      expect(form.getByRole("button", { name })).toHaveAttribute(
        "aria-expanded",
        "false",
      )
    }
    expect(
      form.getByText(
        "It stays unpublished until you choose “Publish changes”.",
      ),
    ).toBeVisible()
    expect(form.getByRole("status")).toBeEmptyDOMElement()
  })

  it("says when it is saved, on a roadmap that isn't published", async () => {
    const { user } = await renderPage({ path: "/roadmaps/productc" })

    const form = await openAddItemDialog(user)

    expect(
      form.getByText("It isn't saved until you choose “Save changes”."),
    ).toBeVisible()
  })

  it("adds nothing with a blank title or no horizon chosen, saying so at each field, focus on the first", async () => {
    const { user } = await renderPage()
    const form = await openAddItemDialog(user)
    const title = form.getByRole("textbox", { name: "Title" })
    const placement = form.getByRole("combobox", { name: "Horizon or section" })

    await user.click(form.getByRole("button", { name: "Add item" }))

    expect(title).toBeInvalid()
    expect(title).toHaveAccessibleDescription("Error: Enter a title")
    expect(placement).toBeInvalid()
    expect(placement).toHaveAccessibleDescription(
      "Error: Choose a horizon or section",
    )
    expect(title).toHaveFocus()

    await user.type(title, CLINIC)
    await user.click(form.getByRole("button", { name: "Add item" }))

    expect(title).toBeValid()
    expect(placement).toBeInvalid()
    expect(placement).toHaveFocus()

    await user.clear(title)
    await user.type(title, "  ")
    await user.selectOptions(placement, "Next")
    await user.click(
      form.getByRole("button", { name: "Add and start another" }),
    )

    expect(title).toBeInvalid()
    expect(placement).toBeValid()
    expect(title).toHaveFocus()
    expect(screen.getByRole("dialog", { name: "Add an item" })).toBeVisible()
    await user.click(form.getByRole("button", { name: "Cancel" }))
    await expectDialogClosed()
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(main().queryByRole("heading", { level: 3, name: CLINIC })).toBeNull()
  })
})

describe("“Add item” (STY-046 S3)", () => {
  it("closes the dialog and shows the item last in its horizon, tagged New, with Edit, Move and Remove, focus on its Edit, nothing written", async () => {
    const { user, repository } = await renderPage()
    const written = vi.spyOn(repository, "publishRoadmapChanges")

    await addItem(user, CLINIC, "Next")

    expect(titlesUnder("Next")).toEqual(["Text reminders", CLINIC])
    const added = card(CLINIC)
    expect(added.getByText("New")).toBeVisible()
    for (const name of ["Edit", "Move", "Remove"]) {
      expect(
        added.getByRole("button", { name: `${name} ${CLINIC}` }),
      ).toBeVisible()
    }
    await waitFor(() => {
      expect(
        added.getByRole("button", { name: `Edit ${CLINIC}` }),
      ).toHaveFocus()
    })
    expect(written).not.toHaveBeenCalled()
    expect(await repository.listRoadmapItems("producta")).toHaveLength(2)
  })

  it("keeps every field given, each trimmed, as an edit's is", async () => {
    const { user } = await renderPage()
    const form = await openAddItemDialog(user)
    await user.type(
      form.getByRole("textbox", { name: "Description" }),
      " Pick where you are seen. ",
    )
    await user.type(
      form.getByRole("textbox", { name: "Expected outcome" }),
      "Shorter journeys",
    )
    await user.type(form.getByRole("textbox", { name: "Phase" }), "Discovery")
    await user.click(form.getByRole("button", { name: "Add organisations" }))
    await user.click(form.getByRole("checkbox", { name: /^Cardiff and Vale/ }))

    await fillAndAddItem(user, `  ${CLINIC} `, "Later")
    await expectDialogClosed()

    const added = card(CLINIC)
    expect(titlesUnder("Later")).toEqual([CLINIC])
    expect(added.getByText("Pick where you are seen.")).toBeVisible()
    expect(added.getByText("Shorter journeys")).toBeVisible()
    expect(added.getByText("Discovery")).toBeVisible()
    expect(added.getByText("Cardiff and Vale")).toBeVisible()
  })

  it("is what Enter in a field does", async () => {
    const { user } = await renderPage()
    const form = await openAddItemDialog(user)
    await user.selectOptions(
      form.getByRole("combobox", { name: "Horizon or section" }),
      "Now",
    )

    await user.type(
      form.getByRole("textbox", { name: "Title" }),
      `${CLINIC}{Enter}`,
    )

    await expectDialogClosed()
    expect(titlesUnder("Now")).toEqual(["Online booking", CLINIC])
  })
})

describe("“Add and start another” (STY-046 S4)", () => {
  it("adds the item and keeps the dialog open and empty, the horizon still chosen, focus in the title, saying what was added", async () => {
    const { user } = await renderPage()
    await openAddItemDialog(user)

    await fillAndAddItem(user, CLINIC, "Next", { another: true })

    const form = addItemDialog()
    const title = form.getByRole("textbox", { name: "Title" })
    await waitFor(() => {
      expect(title).toHaveFocus()
    })
    expect(title).toHaveValue("")
    expect(
      form.getByRole("combobox", { name: "Horizon or section" }),
    ).toHaveValue("next")
    expect(form.getByRole("status")).toHaveTextContent(`“${CLINIC}” was added.`)

    await fillAndAddItem(user, CHECK_IN, "Next")
    await expectDialogClosed()

    expect(titlesUnder("Next")).toEqual(["Text reminders", CLINIC, CHECK_IN])
    expect(main().getByText("2 unpublished changes")).toBeVisible()
    await waitFor(() => {
      expect(
        main().getByRole("button", { name: `Edit ${CHECK_IN}` }),
      ).toHaveFocus()
    })
  })

  it("starts each next form shut and without the last one's tags, organisations or details", async () => {
    const { user } = await renderPage()
    const first = await openAddItemDialog(user)
    await user.click(first.getByRole("button", { name: "Add tags" }))
    await user.type(first.getByRole("textbox", { name: "Add a tag" }), "Carers")
    await user.click(first.getByRole("button", { name: "Add tag" }))
    await user.click(first.getByRole("button", { name: "Add organisations" }))
    await user.click(first.getByRole("checkbox", { name: /^Cardiff and Vale/ }))
    await user.click(first.getByRole("button", { name: "Add details" }))
    await user.keyboard("Outpatients")

    await fillAndAddItem(user, CLINIC, "Next", { another: true })

    const form = addItemDialog()
    await waitFor(() => {
      expect(form.getByRole("status")).not.toBeEmptyDOMElement()
    })
    for (const [button, none] of [
      ["Add tags", "No tags"],
      ["Add organisations", "No organisations"],
      ["Add details", "No details"],
    ] as const) {
      expect(form.getByRole("button", { name: button })).toHaveAttribute(
        "aria-expanded",
        "false",
      )
      expect(form.getByText(none)).toBeVisible()
    }
    await user.click(form.getByRole("button", { name: "Cancel" }))
    await expectDialogClosed()
    // The one added kept its own.
    const added = card(CLINIC)
    expect(added.getByText("Carers")).toBeVisible()
    expect(added.getByText("Cardiff and Vale")).toBeVisible()
    expect(added.getByText("Outpatients")).toBeVisible()
  })

  it("keeps what was added when the dialog is then cancelled, focus back on “Add an item”", async () => {
    const { user } = await renderPage()
    await openAddItemDialog(user)
    await fillAndAddItem(user, CLINIC, "Next", { another: true })
    await user.type(
      addItemDialog().getByRole("textbox", { name: "Title" }),
      "Half typed",
    )

    await user.click(addItemDialog().getByRole("button", { name: "Cancel" }))

    await expectDialogClosed()
    await waitFor(() => {
      expect(addItemButtons()[0]).toHaveFocus()
    })
    expect(titlesUnder("Next")).toEqual(["Text reminders", CLINIC])
    expect(main().getByText("1 unpublished change")).toBeVisible()
  })

  it("shows only when adding, never when editing", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Next")

    for (const title of ["Online booking", CLINIC]) {
      const form = await openEditItemDialog(user, title)
      expect(form.getByRole("button", { name: "Done" })).toBeVisible()
      expect(
        form.queryByRole("button", { name: "Add and start another" }),
      ).toBeNull()
      expect(form.queryByRole("button", { name: "Add item" })).toBeNull()
      expect(form.queryByText(/until you choose/)).toBeNull()
      await user.click(form.getByRole("button", { name: "Cancel" }))
      await expectDialogClosed()
    }
  })
})

describe("A new item is one pending change (STY-046 S5)", () => {
  function leave() {
    const event = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  }

  it("is counted on the roadmap's page and marked on the list, and leaving or disconnecting asks first", async () => {
    const { user, authClient } = await renderPage()
    expect(leave()).toBe(false)

    await addItem(user, CLINIC, "Next")

    expect(main().getByText("1 unpublished change")).toBeVisible()
    expect(leave()).toBe(true)
    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Disconnect",
      }),
    )
    await user.click(
      within(
        screen.getByRole("alertdialog", { name: "Keep your changes?" }),
      ).getByRole("button", { name: "Cancel" }),
    )
    expect(authClient.disconnect).not.toHaveBeenCalled()

    await user.click(main().getByRole("link", { name: "Back to roadmaps" }))
    const link = await main().findByRole("link", { name: "Product A roadmap" })
    expect(link).toHaveAccessibleDescription(/Unpublished changes/)
  })

  it("is one change to save on a roadmap that isn't published", async () => {
    const { user } = await renderPage({ path: "/roadmaps/productc" })

    await addItem(user, CLINIC, "Now")

    expect(main().getByText("1 change to save")).toBeVisible()
  })

  it("is kept by Refresh, and dropped with the rest by “Discard all”", async () => {
    const { user, repository } = await renderPage()
    await addItem(user, CLINIC, "Next")

    const letGo = await holdRefresh(user, repository)
    await letGo()

    expect(titlesUnder("Next")).toEqual(["Text reminders", CLINIC])
    expect(card(CLINIC).getByText("New")).toBeVisible()

    await user.click(main().getByRole("button", { name: "Discard all" }))
    await user.click(
      screen.getByRole("button", { name: "Discard all changes" }),
    )

    await waitFor(() => {
      expect(
        main().queryByRole("heading", { level: 3, name: CLINIC }),
      ).toBeNull()
    })
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(titlesUnder("Next")).toEqual(["Text reminders"])
  })
})

describe("A new item before it is published (STY-046 S6)", () => {
  it("is edited in the dialog's editing form, and what changes is part of it: still one change, never “Changed” or “Undo changes”", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Next")

    const form = await openEditItemDialog(user, CLINIC)
    const title = form.getByRole("textbox", { name: "Title" })
    expect(title).toHaveValue(CLINIC)
    const placement = form.getByRole("combobox", { name: "Horizon or section" })
    expect(placement).toHaveValue("next")
    expect(
      within(placement).queryByRole("option", {
        name: "Choose a horizon or section",
      }),
    ).toBeNull()
    await user.clear(title)
    await user.type(title, "Choose a clinic near you")
    await user.selectOptions(placement, "Later")
    await confirmItemEdit(user)

    expect(titlesUnder("Later")).toEqual(["Choose a clinic near you"])
    const edited = card("Choose a clinic near you")
    expect(edited.getByText("New")).toBeVisible()
    expect(edited.queryByText("Changed")).toBeNull()
    expect(edited.queryByRole("button", { name: /^Undo changes/ })).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeVisible()
    await waitFor(() => {
      expect(
        edited.getByRole("button", { name: "Edit Choose a clinic near you" }),
      ).toHaveFocus()
    })
  })

  it("can't be left without a title by an edit", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Next")
    const form = await openEditItemDialog(user, CLINIC)
    const title = form.getByRole("textbox", { name: "Title" })

    await user.clear(title)
    await user.click(form.getByRole("button", { name: "Done" }))

    expect(title).toHaveAccessibleDescription("Error: Enter a title")
    expect(editItemDialog().getByRole("button", { name: "Done" })).toBeVisible()
  })

  it("is moved by its Move menu, still one change, focus staying on Move", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Next")

    await user.click(main().getByRole("button", { name: `Move ${CLINIC}` }))
    expect(
      (await screen.findAllByRole("menuitem")).map(
        ({ textContent }) => textContent,
      ),
    ).toEqual(PLACEMENT_HEADINGS.filter((each) => each !== "Next"))
    await user.click(screen.getByRole("menuitem", { name: "Now" }))

    await waitFor(() => {
      expect(titlesUnder("Now")).toEqual(["Online booking", CLINIC])
    })
    expect(titlesUnder("Next")).toEqual(["Text reminders"])
    expect(card(CLINIC).getByText("New")).toBeVisible()
    expect(card(CLINIC).queryByText("Changed")).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeVisible()
    await waitFor(() => {
      expect(
        main().getByRole("button", { name: `Move ${CLINIC}` }),
      ).toHaveFocus()
    })
  })

  it("is dropped by Remove without asking, focus going to “Add an item”; no item the roadmap holds has Remove", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Next")
    await addItem(user, CHECK_IN, "Next")
    expect(
      main().queryByRole("button", { name: "Remove Online booking" }),
    ).toBeNull()
    expect(main().getAllByRole("button", { name: /^Remove / })).toHaveLength(2)

    await user.click(main().getByRole("button", { name: `Remove ${CLINIC}` }))

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(titlesUnder("Next")).toEqual(["Text reminders", CHECK_IN])
    expect(addItemButtons()[0]).toHaveFocus()
    expect(main().getByText("1 unpublished change")).toBeVisible()

    await user.click(main().getByRole("button", { name: `Remove ${CHECK_IN}` }))

    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(addItemButtons()[0]).toHaveFocus()
  })
})

describe("Publishing a new item (STY-046 S7)", () => {
  it("writes it: its card shows without New, last in its horizon, and the notice confirms the publish", async () => {
    const { user, repository } = await renderPage()
    await addItem(user, CLINIC, "Next")

    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeVisible()
    expect(titlesUnder("Next")).toEqual(["Text reminders", CLINIC])
    const published = card(CLINIC)
    expect(published.queryByText("New")).toBeNull()
    expect(
      published.queryByRole("button", { name: `Remove ${CLINIC}` }),
    ).toBeNull()
    expect(
      published.getByRole("button", { name: `Edit ${CLINIC}` }),
    ).toBeVisible()
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(
      (await repository.listRoadmapItems("producta")).map(
        ({ title, placement }) => [title.en, placement],
      ),
    ).toEqual([
      ["Online booking", "now"],
      ["Text reminders", "next"],
      [CLINIC, "next"],
    ])
  })

  it("is saved by “Save changes” on a roadmap that isn't published", async () => {
    const { user, repository } = await renderPage({
      path: "/roadmaps/productc",
    })
    await addItem(user, CLINIC, "Later")

    await publish(user, "Save changes")

    expect(await main().findByText("Changes saved")).toBeVisible()
    expect(titlesUnder("Later")).toEqual([CLINIC])
    expect(card(CLINIC).queryByText("New")).toBeNull()
    expect(main().queryByText(/change to save/)).toBeNull()
    expect(
      (await repository.listRoadmapItems("productc")).map(
        ({ title, placement }) => [title.en, placement],
      ),
    ).toEqual([[CLINIC, "later"]])
  })

  it("holds its Edit, Move and Remove while a publish of the roadmap is under way", async () => {
    const { user, repository } = await renderPage()
    const { held, release, released } = holdCall(
      repository.publishRoadmapChanges.bind(repository),
    )
    vi.spyOn(repository, "publishRoadmapChanges").mockImplementation(held)
    await addItem(user, CLINIC, "Next")

    await publish(user)

    // The publish dialog stays, modal, until the write answers.
    for (const name of ["Edit", "Move", "Remove"]) {
      expect(
        screen.getByRole("button", { name: `${name} ${CLINIC}`, hidden: true }),
      ).toHaveAttribute("aria-disabled", "true")
    }
    expect(
      screen.getByRole("button", { name: "Edit Online booking", hidden: true }),
    ).toHaveAttribute("aria-disabled", "false")

    await act(async () => {
      release()
      await released
    })
    expect(await main().findByText(/^Changes published\./)).toBeVisible()
  })

  it("holds them through “Save and publish” too", async () => {
    const { user, repository } = await renderPage({
      path: "/roadmaps/productc",
    })
    const { held, release, released } = holdCall(
      repository.setRoadmapPublished.bind(repository),
    )
    vi.spyOn(repository, "setRoadmapPublished").mockImplementation(held)
    await addItem(user, CLINIC, "Now")

    await user.click(main().getByRole("button", { name: "Publish roadmap" }))
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Save and publish",
      }),
    )

    for (const name of ["Edit", "Move", "Remove"]) {
      expect(
        screen.getByRole("button", { name: `${name} ${CLINIC}`, hidden: true }),
      ).toHaveAttribute("aria-disabled", "true")
    }
    await act(async () => {
      release()
      await released
    })
    expect(
      await main().findByText(
        /^Changes saved and Product C roadmap published\./,
      ),
    ).toBeVisible()
  })

  it("holds them after a publish whose answer was lost, until a Refresh reads the roadmap", async () => {
    const { user, repository } = await renderPage()
    // The answer is lost and nothing was written: the Refresh that follows finds no item.
    vi.spyOn(repository, "publishRoadmapChanges").mockResolvedValue({
      status: "unconfirmed",
    })
    await addItem(user, CLINIC, "Next")

    await publish(user)

    await screen.findByText("Your changes may have been published")
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull()
    })
    for (const name of ["Edit", "Move", "Remove"]) {
      const button = main().getByRole("button", { name: `${name} ${CLINIC}` })
      expect(button).toHaveAttribute("aria-disabled", "true")
      await user.click(button)
    }
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.queryByRole("menu")).toBeNull()
    expect(card(CLINIC).getByText("New")).toBeVisible()

    await user.click(main().getByRole("button", { name: "Refresh" }))

    await waitFor(() => {
      expect(
        main().queryByText("Your changes may have been published"),
      ).toBeNull()
    })
    for (const name of ["Edit", "Move", "Remove"]) {
      expect(
        main().getByRole("button", { name: `${name} ${CLINIC}` }),
      ).toHaveAttribute("aria-disabled", "false")
    }
    expect(card(CLINIC).getByText("New")).toBeVisible()
    expect(main().getByText("1 unpublished change")).toBeVisible()
  })
})

/** What the open publish dialog lists under its heading named `heading`, line by line. */
function listedChanges(heading = "What changes") {
  const dialog = within(screen.getByRole("alertdialog"))
  expect(dialog.getByRole("heading", { name: heading })).toBeVisible()
  return within(dialog.getByRole("list"))
    .getAllByRole("listitem")
    .map(({ textContent }) => textContent)
}

describe("The publish dialog names the new items (STY-047 S1)", () => {
  const idea = createTestRoadmapItem("Longer-term idea", {
    id: "item-9",
    placement: "later",
  })

  it("lists a new item by its title, marked as new, after the edited item as it is listed", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Next")
    await editItemText(user, "Online booking", "Description", "Book online.")

    await user.click(main().getByRole("button", { name: "Publish changes" }))

    expect(listedChanges()).toEqual([
      "Online bookingDescription",
      `${CLINIC}New item`,
    ])
  })

  it("lists new items alone, in the order added, which they are written in", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Later")
    await addItem(user, CHECK_IN, "Now")

    await user.click(main().getByRole("button", { name: "Publish changes" }))

    expect(listedChanges()).toEqual([
      `${CLINIC}New item`,
      `${CHECK_IN}New item`,
    ])
  })

  it("lists it for “Save changes” too, on a roadmap that isn't published", async () => {
    const { user } = await renderPage({ path: "/roadmaps/productc" })
    await addItem(user, CLINIC, "Later")

    await user.click(main().getByRole("button", { name: "Save changes" }))

    expect(
      screen.getByRole("alertdialog", { name: "Save these changes?" }),
    ).toBeVisible()
    expect(listedChanges()).toEqual([`${CLINIC}New item`])
  })

  it("lists it in the question that offers “Save and publish”, under how many changes go public", async () => {
    const { user } = await renderPage({
      path: "/roadmaps/productc",
      items: { productc: [idea] },
    })
    await addItem(user, CLINIC, "Next")
    await editItemText(user, "Longer-term idea", "Description", "Mine.")

    await user.click(main().getByRole("button", { name: "Publish roadmap" }))

    const question = screen.getByRole("alertdialog", {
      name: "Publish Product C roadmap?",
    })
    expect(question).toHaveAccessibleDescription(
      "It shows on the public site after its next nightly update. Your 2 unsaved changes go public with it.",
    )
    expect(listedChanges()).toEqual([
      "Longer-term ideaDescription",
      `${CLINIC}New item`,
    ])
    expect(
      within(question).getByRole("button", { name: "Save and publish" }),
    ).toBeVisible()
  })

  it("names a new item by the title it has now, once, whatever was edited of it", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Next")
    await editItemText(user, CLINIC, "Title", CHECK_IN)
    await editItemText(user, CHECK_IN, "Phase", "Discovery")

    await user.click(main().getByRole("button", { name: "Publish changes" }))

    expect(listedChanges()).toEqual([`${CHECK_IN}New item`])
  })

  it.each([
    {
      path: "/roadmaps/producta",
      edited: "Online booking",
      choose: ["Publish changes", "Publish changes"],
      nothing: "Nothing was published.",
      pending: "2 unpublished changes",
    },
    {
      path: "/roadmaps/productc",
      edited: "Longer-term idea",
      choose: ["Save changes", "Save changes"],
      nothing: "Nothing was saved.",
      pending: "2 changes to save",
    },
    {
      path: "/roadmaps/productc",
      edited: "Longer-term idea",
      choose: ["Publish roadmap", "Save and publish"],
      nothing: "Nothing was saved.",
      pending: "2 changes to save",
    },
  ] as const)(
    "a conflict in the edit publishes nothing through “$choose.1”, keeps the new item pending, and its review never lists it",
    async ({ path, edited, choose: [opener, confirm], nothing, pending }) => {
      const { user, repository } = await renderPage({
        path,
        items: { producta: [booking, reminders], productc: [idea] },
      })
      const roadmapId = path === "/roadmaps/producta" ? "producta" : "productc"
      const titlesHeld = async () =>
        (await repository.listRoadmapItems(roadmapId)).map(
          ({ title }) => title.en,
        )
      const held = await titlesHeld()
      await addItem(user, CLINIC, "Next")
      await editItemText(user, edited, "Description", "Mine.")
      repository.coLead((_roadmaps, itemsOf) => {
        const item = itemsOf(roadmapId).find(({ title }) => title.en === edited)
        if (!item) throw new Error(`No item titled ${edited}`)
        item.description = { en: "Theirs.", cy: "" }
      })

      await user.click(main().getByRole("button", { name: opener }))
      await user.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: confirm,
        }),
      )

      const review = await main().findByRole("alert")
      expect(review).toHaveTextContent(
        "Someone else has changed text you edited",
      )
      expect(review).toHaveTextContent(nothing)
      expect(
        within(review)
          .getAllByRole("listitem")
          .map(
            (each) =>
              within(each).getByText(/: /, { selector: "p" }).textContent,
          ),
      ).toEqual([`${edited}: Description`])
      expect(review).not.toHaveTextContent(CLINIC)
      // Nothing was written, and the new item is still pending, on its card.
      expect(await titlesHeld()).toEqual(held)
      expect(card(CLINIC).getByText("New")).toBeVisible()
      expect(main().getByText(pending)).toBeVisible()
    },
  )
})

describe("The publish dialog's new items, in Welsh and to assistive technology (STY-047 S2)", () => {
  it("marks a new item in Welsh, in the line that holds its title", async () => {
    const { user } = await renderPage({ language: "cy" })
    await addItem(user, CLINIC, "Nesaf", "cy")

    await user.click(
      main().getByRole("button", { name: "Cyhoeddi'r newidiadau" }),
    )

    expect(listedChanges("Beth sy'n newid")).toEqual([`${CLINIC}Eitem newydd`])
  })

  it("gives the marker in the list item its title is in, so the two are read together", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Next")

    await user.click(main().getByRole("button", { name: "Publish changes" }))

    const marker = within(screen.getByRole("alertdialog")).getByText("New item")
    expect(marker.closest("li")).toHaveTextContent(CLINIC)
  })
})

describe("An empty roadmap (STY-046 S8)", () => {
  it("says what to add in its panel, which holds “Add an item”, with no word of the spreadsheet", async () => {
    const { user } = await renderPage({ path: "/roadmaps/productc" })

    const heading = main().getByRole("heading", {
      level: 2,
      name: "No items yet",
    })
    const panel = heading.closest('[data-slot="empty"]')
    if (!(panel instanceof HTMLElement)) throw new Error("No panel")
    expect(
      within(panel).getByText(
        "Add what the product is doing now, next and later.",
      ),
    ).toBeVisible()
    expect(main().queryByText(/spreadsheet/i)).toBeNull()
    const inPanel = within(panel).getByRole("button", { name: "Add an item" })
    expect(addItemButtons()).toHaveLength(2)

    await user.click(inPanel)
    const form = addItemDialog()
    await waitFor(() => {
      expect(form.getByRole("textbox", { name: "Title" })).toHaveFocus()
    })
    await user.click(form.getByRole("button", { name: "Cancel" }))
    await expectDialogClosed()
    await waitFor(() => {
      expect(
        within(panel).getByRole("button", { name: "Add an item" }),
      ).toHaveFocus()
    })
  })

  it("shows the six headings once it has an item, pending or not, and the panel again once it has none", async () => {
    const { user } = await renderPage({ path: "/roadmaps/productc" })
    const [, inPanel] = addItemButtons()
    if (!inPanel) throw new Error("The panel has no Add an item")
    await user.click(inPanel)

    await fillAndAddItem(user, CLINIC, "Later")
    await expectDialogClosed()

    expect(
      main()
        .getAllByRole("heading", { level: 2 })
        .map(({ textContent }) => textContent),
    ).toEqual(["About this roadmap", ...PLACEMENT_HEADINGS])
    expect(titlesUnder("Later")).toEqual([CLINIC])
    expect(addItemButtons()).toHaveLength(1)
    await waitFor(() => {
      expect(
        main().getByRole("button", { name: `Edit ${CLINIC}` }),
      ).toHaveFocus()
    })

    await user.click(main().getByRole("button", { name: `Remove ${CLINIC}` }))

    expect(
      main().getByRole("heading", { level: 2, name: "No items yet" }),
    ).toBeVisible()
    expect(addItemButtons()[0]).toHaveFocus()
  })
})

describe("Closing the adding form, Welsh and assistive technology (STY-046 S9)", () => {
  it.each([
    [
      "Cancel",
      (user: User) =>
        user.click(addItemDialog().getByRole("button", { name: "Cancel" })),
    ],
    ["Escape", (user: User) => user.keyboard("{Escape}")],
  ])(
    "%s closes the dialog, dropping what was typed, with focus back on “Add an item”",
    async (_how, close) => {
      const { user } = await renderPage()
      const form = await openAddItemDialog(user)
      await user.type(form.getByRole("textbox", { name: "Title" }), CLINIC)

      await close(user)

      await expectDialogClosed()
      await waitFor(() => {
        expect(addItemButtons()[0]).toHaveFocus()
      })
      expect(main().queryByText(/unpublished change/)).toBeNull()
      const reopened = await openAddItemDialog(user)
      expect(reopened.getByRole("textbox", { name: "Title" })).toHaveValue("")
    },
  )

  it.each([
    [
      "Cancel",
      (user: User) =>
        user.click(addItemDialog().getByRole("button", { name: "Cancel" })),
    ],
    ["Escape", (user: User) => user.keyboard("{Escape}")],
  ])(
    "%s puts focus on the page's “Add an item” once the first item has taken the place of the panel the dialog opened from",
    async (_how, close) => {
      const { user } = await renderPage({ path: "/roadmaps/productc" })
      const [, inPanel] = addItemButtons()
      if (!inPanel) throw new Error("The panel has no Add an item")
      await user.click(inPanel)
      await fillAndAddItem(user, CLINIC, "Now", { another: true })
      await waitFor(() => {
        expect(addItemDialog().getByRole("status")).not.toBeEmptyDOMElement()
      })

      await close(user)

      await expectDialogClosed()
      expect(addItemButtons()).toHaveLength(1)
      await waitFor(() => {
        expect(addItemButtons()[0]).toHaveFocus()
      })
    },
  )

  it.each([
    [
      "Cancel",
      (user: User) =>
        user.click(addItemDialog().getByRole("button", { name: "Cancel" })),
    ],
    ["Escape", (user: User) => user.keyboard("{Escape}")],
  ])(
    "%s puts focus on the page's “Add an item” once a read has put a co-lead's item in the place of the panel the dialog opened from",
    async (_how, close) => {
      const { user, repository } = await renderPage({
        path: "/roadmaps/productc",
      })
      const letGo = await holdRefresh(user, repository)
      const [, inPanel] = addItemButtons()
      if (!inPanel) throw new Error("The panel has no Add an item")
      await user.click(inPanel)
      await user.type(
        addItemDialog().getByRole("textbox", { name: "Title" }),
        CLINIC,
      )

      repository.coLead((_roadmaps, itemsOf) => {
        itemsOf("productc").push(createTestRoadmapItem("A co-lead's item"))
      })
      await letGo()
      expect(
        addItemDialog().getByRole("textbox", { name: "Title" }),
      ).toHaveValue(CLINIC)
      await close(user)

      await expectDialogClosed()
      expect(addItemButtons()).toHaveLength(1)
      await waitFor(() => {
        expect(addItemButtons()[0]).toHaveFocus()
      })
    },
  )

  it("keeps the dialog and what was typed when the session expires, and “Add item” still adds", async () => {
    const { user, authClient } = await renderPage()
    const form = await openAddItemDialog(user)
    await user.type(form.getByRole("textbox", { name: "Title" }), CLINIC)

    act(() => {
      authClient.setState({ status: "expired" })
    })

    expect(addItemDialog().getByRole("textbox", { name: "Title" })).toHaveValue(
      CLINIC,
    )
    await user.selectOptions(
      addItemDialog().getByRole("combobox", { name: "Horizon or section" }),
      "Next",
    )
    await user.click(addItemDialog().getByRole("button", { name: "Add item" }))
    await expectDialogClosed()

    expect(titlesUnder("Next")).toEqual(["Text reminders", CLINIC])
    expect(main().getByText("1 unpublished change")).toBeVisible()
  })

  it("keeps the dialog and what was typed over a read that lands while it is open", async () => {
    const { user, repository } = await renderPage()
    const letGo = await holdRefresh(user, repository)
    const form = await openAddItemDialog(user)
    await user.type(form.getByRole("textbox", { name: "Title" }), CLINIC)

    repository.coLead((_roadmaps, itemsOf) => {
      itemsOf("producta").reverse()
    })
    await letGo()

    expect(addItemDialog().getByRole("textbox", { name: "Title" })).toHaveValue(
      CLINIC,
    )
    await user.selectOptions(
      addItemDialog().getByRole("combobox", { name: "Horizon or section" }),
      "Next",
    )
    await user.click(addItemDialog().getByRole("button", { name: "Add item" }))
    await expectDialogClosed()
    expect(titlesUnder("Next")).toEqual(["Text reminders", CLINIC])
  })

  it("is Welsh on the Welsh interface: the button, the dialog, what it says, the tag and Remove", async () => {
    const { user } = await renderPage({ language: "cy" })

    const form = await openAddItemDialog(user, "cy")
    expect(
      form.getByText(
        "Bydd yn aros heb ei chyhoeddi nes i chi ddewis “Cyhoeddi'r newidiadau”.",
      ),
    ).toBeVisible()
    const placement = form.getByRole("combobox", { name: "Gorwel neu adran" })
    expect(placement).toHaveDisplayValue("Dewiswch orwel neu adran")
    await user.click(
      form.getByRole("button", { name: "Ychwanegu a dechrau un arall" }),
    )
    expect(
      form.getByRole("textbox", { name: "Teitl (Saesneg)" }),
    ).toHaveAccessibleDescription("Gwall: Rhowch deitl")
    expect(placement).toHaveAccessibleDescription(
      "Gwall: Dewiswch orwel neu adran",
    )

    await fillAndAddItem(user, CLINIC, "Nesaf", {
      another: true,
      language: "cy",
    })
    await waitFor(() => {
      expect(addItemDialog("cy").getByRole("status")).toHaveTextContent(
        `Ychwanegwyd “${CLINIC}”.`,
      )
    })
    await user.click(
      addItemDialog("cy").getByRole("button", { name: "Canslo" }),
    )
    await expectDialogClosed()

    const added = card(CLINIC)
    expect(added.getByText("Newydd")).toBeVisible()
    expect(added.getByRole("button", { name: `Tynnu ${CLINIC}` })).toBeVisible()
  })

  it("says when it is saved in Welsh, on a roadmap that isn't published", async () => {
    const { user } = await renderPage({
      path: "/roadmaps/productc",
      language: "cy",
    })

    const form = await openAddItemDialog(user, "cy")

    expect(
      form.getByText(
        "Fydd hi ddim yn cael ei chadw nes i chi ddewis “Cadw'r newidiadau”.",
      ),
    ).toBeVisible()
  })

  it("names the New tag and Remove for their item", async () => {
    const { user } = await renderPage()
    await addItem(user, CLINIC, "Next")

    const added = card(CLINIC)
    expect(added.getByText("New")).toHaveTextContent(`New ${CLINIC}`)
    expect(
      added.getByRole("button", { name: `Remove ${CLINIC}` }),
    ).toHaveTextContent(`Remove ${CLINIC}`)
  })
})

describe("Publishing an empty roadmap with a new item (STY-046 S10)", () => {
  it("offers “Save and publish” for it, and doesn't say the public site will show no items", async () => {
    const { user, repository } = await renderPage({
      path: "/roadmaps/productc",
    })
    await addItem(user, CLINIC, "Now")

    await user.click(main().getByRole("button", { name: "Publish roadmap" }))
    const dialog = await screen.findByRole("alertdialog")

    expect(dialog).toHaveAccessibleDescription(
      "It shows on the public site after its next nightly update. Your unsaved change goes public with it.",
    )
    await user.click(
      within(dialog).getByRole("button", { name: "Save and publish" }),
    )
    expect(
      await main().findByText(
        /^Changes saved and Product C roadmap published\./,
      ),
    ).toBeVisible()
    expect(
      (await repository.listRoadmapItems("productc")).map(
        ({ title }) => title.en,
      ),
    ).toEqual([CLINIC])
    expect(card(CLINIC).queryByText("New")).toBeNull()
  })
})

describe("Tags are offered both ways (STY-046 S11)", () => {
  /** The tags the dialog's open Tags field offers, by their buttons' names. */
  function offered(form: ReturnType<typeof addItemDialog>) {
    return within(
      form.getByRole("list", { name: "Used elsewhere in this roadmap" }),
    )
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"))
  }

  it("offers a new item the roadmap's tags, and the roadmap's other items the new item's", async () => {
    const { user } = await renderPage()
    const form = await openAddItemDialog(user)
    await user.click(form.getByRole("button", { name: "Add tags" }))

    expect(offered(form)).toEqual(["Add Patients, on 1 other item"])
    await user.type(form.getByRole("textbox", { name: "Add a tag" }), "Carers")
    await user.click(form.getByRole("button", { name: "Add tag" }))
    await fillAndAddItem(user, CLINIC, "Next", { another: true })

    // The next new item is offered the last one's too.
    const next = addItemDialog()
    await user.click(next.getByRole("button", { name: "Add tags" }))
    expect(offered(next)).toEqual([
      "Add Carers, on 1 other item",
      "Add Patients, on 1 other item",
    ])
    await user.click(next.getByRole("button", { name: "Cancel" }))
    await expectDialogClosed()

    const booked = await openEditItemDialog(user, "Online booking")
    await user.click(booked.getByRole("button", { name: "Change tags" }))
    expect(offered(booked)).toEqual(["Add Carers, on 1 other item"])
    await user.click(booked.getByRole("button", { name: "Cancel" }))
    await expectDialogClosed()

    // And a new item, edited, the others' but not its own.
    const added = await openEditItemDialog(user, CLINIC)
    await user.click(added.getByRole("button", { name: "Change tags" }))
    expect(offered(added)).toEqual(["Add Patients, on 1 other item"])
  })
})
