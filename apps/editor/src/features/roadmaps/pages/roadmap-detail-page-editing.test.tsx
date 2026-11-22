import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type {
  RepositoryReadOptions,
  RoadmapRepository,
} from "@/domain/roadmap/roadmap-repository"
import type { ContractWrite } from "@/domain/roadmap/testing/contract-write"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { disconnectFromHeader } from "@/features/auth/testing/account-menu"
import {
  findReconnectDialog,
  reconnectFromDialog,
} from "@/features/auth/testing/reconnect-dialog"
import type { Language } from "@/i18n"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { cornerClose, expectDialogClosed } from "../testing/edit-dialog"
import { holdCall } from "../testing/held-call"
import { holdRefresh } from "../testing/held-refresh"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapItems,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  confirmItemEdit,
  editItemDialog,
  editItemText,
  openEditItemDialog,
} from "../testing/item-dialog"
import { expectOpeningFocus } from "../testing/opening-focus"
import {
  confirmRoadmapEdit,
  editRoadmapDialog,
  editRoadmapText,
  openEditRoadmapDialog,
} from "../testing/roadmap-dialog"
import {
  closeConflictReview,
  findRefusal,
  goToList,
  moreButton,
  openProductDetails,
  openConflictReview,
  refreshRoadmap,
  reviewFooterClose,
  roadmapFacts,
} from "../testing/roadmap-page"
import { expectWriteHold, refreshHold } from "../testing/write-hold"

const roadmaps: Roadmap[] = [
  createTestRoadmap("producta", "Product A roadmap", {
    statusLabel: { en: "Live", cy: "Byw" },
    vision: { en: "A clear vision.", cy: "" },
  }),
  createTestRoadmap("productb", "Product B roadmap"),
  createTestRoadmap("productc", "Product C roadmap", { published: false }),
]

const first: RoadmapItem = {
  ...createTestRoadmapItem("First item", {
    id: "item-1",
    description: { en: "What it is.", cy: "Beth ydyw." },
    tags: [{ en: "Records", cy: "Cofnodion" }],
  }),
  title: { en: "First item", cy: "Eitem gyntaf" },
}
const second = createTestRoadmapItem("Second item", { id: "item-2" })
const unplaced = createTestRoadmapItem("Unplaced item", {
  id: "item-3",
  placement: null,
  writtenHorizon: "Someday",
})

const roadmapItems: InMemoryRoadmapItems = {
  producta: [first, second, unplaced],
  productb: [createTestRoadmapItem("Product B item")],
  productc: [createTestRoadmapItem("Product C item")],
}

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

/** The row holding a heading and its "Changed" tag. */
function titleRow(heading: HTMLElement) {
  const row = heading.parentElement
  if (!row) throw new Error("The heading has no parent")
  return row
}

/** The list card of the roadmap named `title`, on the main page. */
function listCard(title: string) {
  const link = main().getByRole("link", { name: title })
  const item = link.closest("li")
  if (!item) throw new Error(`No card for ${title}`)
  return within(item)
}

interface RenderOptions {
  path?: string
  authState?: AuthState
  repository?: RoadmapRepository
  write?: ContractWrite
  language?: Language
  waitFor?: string
}

async function renderPage({
  path = "/roadmaps/producta",
  authState = connected,
  repository,
  write,
  language,
  waitFor = "Second item",
}: RenderOptions = {}) {
  const user = userEvent.setup()
  const rendered = await renderWithProviders({
    path,
    authState,
    repository:
      repository ??
      createInMemoryRoadmapRepository(
        roadmaps,
        roadmapItems,
        write ? { write } : {},
      ),
    ...(language ? { language } : {}),
  })
  await main().findByRole("heading", { level: 3, name: waitFor })
  return { user, ...rendered }
}

/** Edits an item's title in the item dialog and confirms it. */
function editTitle(user: User, from: string, to: string) {
  return editItemText(user, from, "Title", to)
}

/** Opens the publish dialog and confirms it. */
async function publish(user: User, action = "Publish changes") {
  await user.click(main().getByRole("button", { name: action }))
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: action,
    }),
  )
}

describe("Editing a roadmap's items (STY-025)", () => {
  it("opens the item dialog prefilled with the item's English, pending edits included, its card as it was behind it (S1)", async () => {
    const { user } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    const form = await openEditItemDialog(user, "First, edited")

    expect(form.getByRole("form", { name: "Edit this item" })).toBeVisible()
    await expectOpeningFocus(() => form.getByRole("textbox", { name: "Title" }))
    expect(form.getByRole("textbox", { name: "Title" })).toHaveValue(
      "First, edited",
    )
    expect(form.getByRole("textbox", { name: "Description" })).toHaveValue(
      "What it is.",
    )
    expect(form.getByRole("textbox", { name: "Expected outcome" })).toHaveValue(
      "",
    )
    expect(form.getByRole("textbox", { name: "Phase" })).toHaveValue("")
    // Its tags show on one line in the form, the Tags field shut (STY-037 S19).
    expect(form.getByText("Records")).toBeInTheDocument()
    // The card stays as it was behind the dialog, out of reach of role queries.
    const heading = screen.getByRole("heading", {
      level: 3,
      name: "First, edited",
      hidden: true,
    })
    const behind = within(heading.closest("li") ?? heading)
    expect(behind.getByText("What it is.")).toBeVisible()
    expect(behind.getByText("Changed")).toBeVisible()
    expect(
      behind.getByRole("button", { name: "Move First, edited", hidden: true }),
    ).toBeVisible()
  })

  it("keeps a confirmed change pending: trimmed, shown, tagged and counted, nothing written (S2)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const write = vi.spyOn(repository, "publishRoadmapChanges")
    const { user } = await renderPage({ repository })

    await editTitle(user, "First item", "  A better first item  ")

    const edited = card("A better first item")
    expect(edited.getByText("Changed")).toBeInTheDocument()
    await waitFor(() => {
      expect(
        edited.getByRole("button", { name: "Edit A better first item" }),
      ).toHaveFocus()
    })
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toBeInTheDocument()
    expect(write).not.toHaveBeenCalled()
  })

  it.each([
    [
      "Cancel",
      (user: User) =>
        user.click(editItemDialog().getByRole("button", { name: "Cancel" })),
    ],
    ["Escape", (user: User) => user.keyboard("{Escape}")],
  ])(
    "%s closes the dialog, dropping what was typed and keeping the edits already pending, with focus back on Edit (S5)",
    async (_how, close) => {
      const { user } = await renderPage()
      await editTitle(user, "Second item", "Second, edited")
      const form = await openEditItemDialog(user, "First item")
      await user.type(form.getByRole("textbox", { name: "Title" }), " more")

      await close(user)

      await expectDialogClosed()
      await waitFor(() => {
        expect(
          main().getByRole("button", { name: "Edit First item" }),
        ).toHaveFocus()
      })
      expect(card("First item").queryByText("Changed")).toBeNull()
      expect(card("Second, edited").getByText("Changed")).toBeInTheDocument()
      expect(main().getByText("1 unpublished change")).toBeInTheDocument()
      const reopened = await openEditItemDialog(user, "First item")
      expect(reopened.getByRole("textbox", { name: "Title" })).toHaveValue(
        "First item",
      )
    },
  )

  it("returns focus to the card's Edit as it closes where the click that opened it left focus elsewhere, as Safari's does (S5)", async () => {
    const { user } = await renderPage()
    const edit = main().getByRole("button", { name: "Edit First item" })

    // A click event alone: Safari doesn't focus a button it clicks.
    fireEvent.click(edit)
    expect(edit).not.toHaveFocus()
    await user.click(editItemDialog().getByRole("button", { name: "Cancel" }))

    await expectDialogClosed()
    await waitFor(() => {
      expect(edit).toHaveFocus()
    })
  })

  it("returns focus to the Edit of the card it was last opened from, whichever card had it before (S5)", async () => {
    const { user } = await renderPage()
    const first = await openEditItemDialog(user, "First item")
    await user.click(first.getByRole("button", { name: "Cancel" }))
    await expectDialogClosed()

    const second = await openEditItemDialog(user, "Second item")
    await user.click(second.getByRole("button", { name: "Cancel" }))
    await expectDialogClosed()

    await waitFor(() => {
      expect(
        main().getByRole("button", { name: "Edit Second item" }),
      ).toHaveFocus()
    })
  })

  it("keeps the dialog and what was typed when the session expires, and Done still keeps the edits (S5)", async () => {
    const { user, authClient } = await renderPage()
    const form = await openEditItemDialog(user, "First item")
    await user.type(form.getByRole("textbox", { name: "Phase" }), "Beta")

    act(() => {
      authClient.setState({ status: "expired" })
    })

    expect(form.getByRole("textbox", { name: "Phase" })).toHaveValue("Beta")
    await confirmItemEdit(user)
    expect(card("First item").getByText("Beta")).toBeInTheDocument()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("requires a title, linking the error to the field, and lets other fields be cleared (S4)", async () => {
    const { user } = await renderPage()

    const form = await openEditItemDialog(user, "First item")
    const title = form.getByRole("textbox", { name: "Title" })
    await user.clear(title)
    await user.type(title, "   ")
    await user.clear(form.getByRole("textbox", { name: "Description" }))
    await user.click(form.getByRole("button", { name: "Done" }))

    expect(title).toHaveAttribute("aria-invalid", "true")
    expect(title).toHaveAccessibleDescription("Error: Enter a title")
    expect(title).toHaveFocus()
    expect(screen.queryByText(/unpublished change/)).toBeNull()

    await user.clear(title)
    await user.type(title, "Titled again")
    await confirmItemEdit(user)

    expect(card("Titled again").queryByText("What it is.")).toBeNull()
    expect(main().getByText("2 unpublished changes")).toBeInTheDocument()
  })

  it("edits an unplaced item like any other (S17)", async () => {
    const { user } = await renderPage()

    await editTitle(user, "Unplaced item", "Placed later")

    expect(card("Placed later").getByText("Changed")).toBeInTheDocument()
  })

  it("undoes one item's changes, and discards all only after asking (S6)", async () => {
    const { user } = await renderPage()
    await editTitle(user, "First item", "First, edited")
    await editTitle(user, "Second item", "Second, edited")
    expect(main().getByText("2 unpublished changes")).toBeInTheDocument()

    await user.click(
      main().getByRole("button", { name: "Undo changes First, edited" }),
    )

    expect(card("First item").queryByText("Changed")).toBeNull()
    await waitFor(() => {
      expect(
        main().getByRole("button", { name: "Edit First item" }),
      ).toHaveFocus()
    })
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()

    await user.click(
      main().getByRole("button", { name: "Discard all changes" }),
    )
    const question = within(
      screen.getByRole("alertdialog", {
        name: "Discard all changes to this roadmap?",
      }),
    )
    await user.click(question.getByRole("button", { name: "Cancel" }))
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()

    await user.click(
      main().getByRole("button", { name: "Discard all changes" }),
    )
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Discard all changes",
      }),
    )

    expect(
      main().getByRole("heading", { level: 3, name: "Second item" }),
    ).toBeInTheDocument()
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(main().queryByText("Changed")).toBeNull()
  })

  it("labels the fields as the English in Welsh, and shows the Welsh tagged (S16)", async () => {
    const { user } = await renderPage({ language: "cy" })

    const form = await openEditItemDialog(user, "Eitem gyntaf", "cy")
    const title = form.getByRole("textbox", { name: "Teitl (Saesneg)" })
    expect(title).toHaveValue("First item")
    await user.clear(title)
    await user.type(title, "First, edited")
    await confirmItemEdit(user, "cy")

    expect(card("Eitem gyntaf").getByText("Wedi newid")).toBeInTheDocument()
  })
})

describe("Editing a roadmap's product details (STY-025)", () => {
  it("edits the roadmap's five fields, tagging the block and the title (S5)", async () => {
    const { user } = await renderPage()

    const form = await openEditRoadmapDialog(user)
    expect(
      form
        .getAllByRole("textbox")
        .map(
          (field) => (field as HTMLInputElement | HTMLTextAreaElement).value,
        ),
    ).toEqual(["Product A roadmap", "Live", "", "A clear vision.", ""])
    await expectOpeningFocus(() =>
      form.getByRole("textbox", { name: "Product name" }),
    )
    await user.clear(form.getByRole("textbox", { name: "Product name" }))
    await user.type(
      form.getByRole("textbox", { name: "Product name" }),
      "Product A, renamed",
    )
    await user.type(
      form.getByRole("textbox", { name: "Product lead" }),
      "Alex Jones",
    )
    await confirmRoadmapEdit(user)

    const heading = main().getByRole("heading", {
      level: 1,
      name: "Product A, renamed",
    })
    expect(within(titleRow(heading)).getByText("Changed")).toBeInTheDocument()
    const details = within(
      main().getByRole("region", { name: "Product details" }),
    )
    expect(details.getByText("Changed")).toBeInTheDocument()
    await waitFor(() => {
      expect(
        details.getByRole("button", { name: "Edit Product details" }),
      ).toHaveFocus()
    })
    expect(
      within(roadmapFacts()).getByText("Product lead: Alex Jones"),
    ).toBeInTheDocument()
    expect(main().getByText("2 unpublished changes")).toBeInTheDocument()
  })

  it("tags only the block when the title is unchanged, and undoes it all", async () => {
    const { user } = await renderPage()

    const form = await openEditRoadmapDialog(user)
    await user.clear(form.getByRole("textbox", { name: "Vision" }))
    await confirmRoadmapEdit(user)

    const heading = main().getByRole("heading", {
      level: 1,
      name: "Product A roadmap",
    })
    expect(within(titleRow(heading)).queryByText("Changed")).toBeNull()
    await openProductDetails(user)
    await user.click(
      main().getByRole("button", { name: "Undo changes Product details" }),
    )
    expect(main().getByText("A clear vision.")).toBeInTheDocument()
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(
      main().getByRole("button", { name: "Edit Product details" }),
    ).toHaveFocus()
  })
})

describe("Editing a roadmap's product details in the roadmap dialog (STY-043)", () => {
  it("opens the roadmap dialog on every product details field and no short name, the page behind it as it was (S1)", async () => {
    const { user } = await renderPage()
    await editRoadmapText(user, "Vision", "A clear vision. Still.")
    await openProductDetails(user)

    const form = await openEditRoadmapDialog(user)

    expect(
      form.getByRole("form", { name: "Edit product details" }),
    ).toBeVisible()
    expect(
      form
        .getAllByRole("textbox")
        .map((field) => (field as HTMLInputElement).labels?.[0]?.textContent),
    ).toEqual([
      "Product name",
      "Status",
      "Product lead",
      "Vision",
      "Service description",
    ])
    // No family or category list here, so each is shown as it is.
    expect(form.getByText("Family")).toBeInTheDocument()
    expect(form.getByText("Category")).toBeInTheDocument()
    expect(form.getByLabelText("Roadmap last updated")).toHaveAttribute(
      "type",
      "date",
    )
    // Its pending edit is what the field opens on.
    expect(form.getByRole("textbox", { name: "Vision" })).toHaveValue(
      "A clear vision. Still.",
    )
    expect(form.queryByRole("textbox", { name: "Short name" })).toBeNull()
    // The page stays as it was behind the dialog, out of reach of role queries.
    const details = screen.getByRole("region", {
      name: "Product details",
      hidden: true,
    })
    expect(within(details).getByText("A clear vision. Still.")).toBeVisible()
    expect(screen.getByText("1 unpublished change")).toBeVisible()
  })

  it.each([
    [
      "Cancel",
      (user: User) =>
        user.click(editRoadmapDialog().getByRole("button", { name: "Cancel" })),
    ],
    ["Escape", (user: User) => user.keyboard("{Escape}")],
  ])(
    "%s closes it, dropping what was typed and keeping the edits already pending, with focus back on Edit (S4)",
    async (_how, close) => {
      const { user } = await renderPage()
      await editRoadmapText(user, "Vision", "A clear vision. Still.")
      const form = await openEditRoadmapDialog(user)
      await user.type(form.getByRole("textbox", { name: "Status" }), ", soon")

      await close(user)

      await expectDialogClosed()
      const edit = main().getByRole("button", {
        name: "Edit Product details",
      })
      await waitFor(() => {
        expect(edit).toHaveFocus()
      })
      await openProductDetails(user)
      expect(main().getByText("A clear vision. Still.")).toBeInTheDocument()
      expect(main().getByText("1 unpublished change")).toBeInTheDocument()
      const reopened = await openEditRoadmapDialog(user)
      expect(reopened.getByRole("textbox", { name: "Status" })).toHaveValue(
        "Live",
      )
    },
  )

  it("returns focus to Edit as it closes where the click that opened it left focus elsewhere, as Safari's does (S4)", async () => {
    const { user } = await renderPage()
    await openProductDetails(user)
    const edit = main().getByRole("button", {
      name: "Edit Product details",
    })

    // A click event alone: Safari doesn't focus a button it clicks.
    fireEvent.click(edit)
    expect(edit).not.toHaveFocus()
    await user.click(
      editRoadmapDialog().getByRole("button", { name: "Cancel" }),
    )

    await expectDialogClosed()
    await waitFor(() => {
      expect(edit).toHaveFocus()
    })
  })

  it("keeps the dialog and what was typed when the session expires, and Done still keeps the edits (S4)", async () => {
    const { user, authClient } = await renderPage()
    const form = await openEditRoadmapDialog(user)
    await user.type(form.getByRole("textbox", { name: "Status" }), ", soon")

    act(() => {
      authClient.setState({ status: "expired" })
    })

    expect(form.getByRole("textbox", { name: "Status" })).toHaveValue(
      "Live, soon",
    )
    await confirmRoadmapEdit(user)
    expect(main().getByText("Live, soon")).toBeInTheDocument()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })
})

describe("Keeping a roadmap's changes (STY-025)", () => {
  it("keeps them across pages and Refresh, marking the roadmap's card (S7)", async () => {
    const { user, router } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    await goToList(user)
    await main().findByRole("link", { name: "Product A roadmap" })
    expect(
      listCard("Product A roadmap").getByText("Unpublished changes"),
    ).toBeInTheDocument()
    expect(
      main().getByRole("link", { name: "Product A roadmap" }),
    ).toHaveAccessibleDescription(/Unpublished changes/)
    expect(
      listCard("Product B roadmap").queryByText("Unpublished changes"),
    ).toBeNull()
    await user.click(main().getByRole("button", { name: "Refresh" }))
    expect(
      listCard("Product A roadmap").getByText("Unpublished changes"),
    ).toBeInTheDocument()

    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "productb" },
      }),
    )
    await main().findByRole("heading", { level: 3, name: "Product B item" })
    expect(main().queryByText(/unpublished change/)).toBeNull()
    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "producta" },
      }),
    )
    await main().findByRole("heading", { level: 3, name: "First, edited" })
    await refreshRoadmap(user)
    expect(
      await main().findByRole("heading", { level: 3, name: "First, edited" }),
    ).toBeInTheDocument()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("keeps them while the session has expired; Publish asks to reconnect, then asks to publish them (S12; STY-057 S1–S3)", async () => {
    const { user, authClient } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    act(() => {
      authClient.setState({ status: "expired" })
    })

    const action = main().getByRole("button", { name: "Publish changes" })
    expect(action).toHaveAttribute("aria-disabled", "false")
    await user.click(action)
    const dialog = await findReconnectDialog()
    expect(dialog).toHaveAccessibleDescription(
      "Reconnect to Google to carry on. Your changes are kept in this tab.",
    )

    await reconnectFromDialog(user)

    const confirm = await screen.findByRole("alertdialog", {
      name: "Publish these changes?",
    })
    expect(within(confirm).getByText("First, edited")).toBeInTheDocument()
  })

  it("keeps them when reconnecting is cancelled, focus back on Publish (STY-057 S4)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const write = vi.spyOn(repository, "publishRoadmapChanges")
    const { user, authClient } = await renderPage({ repository })
    await editTitle(user, "First item", "First, edited")
    act(() => {
      authClient.setState({ status: "expired" })
    })
    const action = main().getByRole("button", { name: "Publish changes" })
    await user.click(action)

    await user.click(
      within(await findReconnectDialog()).getByRole("button", {
        name: "Cancel",
      }),
    )

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(action).toHaveFocus()
    expect(write).not.toHaveBeenCalled()
    expect(card("First, edited").getByText("Changed")).toBeInTheDocument()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("leaves alone a co-lead's change, read while the roadmap dialog was open, to a field it did not change", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const { user } = await renderPage({ repository })
    const { held, release, released } = holdCall(() =>
      Promise.resolve(
        roadmaps.map((roadmap) =>
          roadmap.id === "producta"
            ? { ...roadmap, vision: { en: "A co-lead's vision.", cy: "" } }
            : roadmap,
        ),
      ),
    )
    vi.spyOn(repository, "listRoadmaps").mockImplementation(held)

    // The dialog is modal, so the product details are opened, and the Refresh asked for, before it opens.
    const details = await openProductDetails(user)
    await refreshRoadmap(user)
    const form = await openEditRoadmapDialog(user)
    await user.type(form.getByRole("textbox", { name: "Product name" }), " v2")
    expect(held).toHaveBeenCalled()
    await act(async () => {
      release()
      await released
    })
    await within(details).findByText("A co-lead's vision.")
    await confirmRoadmapEdit(user)

    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(within(details).getByText("A co-lead's vision.")).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 1, name: "Product A roadmap v2" }),
    ).toBeInTheDocument()
  })

  it("closes the dialog of an item without an ID when a read puts another item in its place", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, {
      producta: [
        createTestRoadmapItem("No ID one"),
        createTestRoadmapItem("No ID two"),
      ],
    })
    const { user } = await renderPage({ repository, waitFor: "No ID two" })
    const land = await holdRefresh(user, repository)
    const form = await openEditItemDialog(user, "No ID one")
    await user.type(form.getByRole("textbox", { name: "Phase" }), "Beta")
    repository.coLead((_list, itemsOf) => {
      itemsOf("producta").unshift(
        createTestRoadmapItem("Inserted by a co-lead"),
      )
    })

    await land()

    await expectDialogClosed()
    expect(
      main().getByRole("heading", { level: 3, name: "Inserted by a co-lead" }),
    ).toBeInTheDocument()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("keeps an item's open dialog when a read gives every item its first ID, as a co-lead's first publish does", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, {
      producta: [
        createTestRoadmapItem("No ID one"),
        createTestRoadmapItem("No ID two"),
      ],
    })
    const { user } = await renderPage({ repository, waitFor: "No ID two" })
    const land = await holdRefresh(user, repository)
    const form = await openEditItemDialog(user, "No ID two")
    await user.type(form.getByRole("textbox", { name: "Phase" }), "Beta")
    repository.coLead((_list, itemsOf) => {
      itemsOf("producta").forEach((item, at) => {
        item.id = `item-${String(at + 1)}`
      })
    })

    await land()

    expect(form.getByRole("textbox", { name: "Phase" })).toHaveValue("Beta")
    await confirmItemEdit(user)
    expect(card("No ID two").getByText("Beta")).toBeInTheDocument()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("keeps them when a renewal gives a new session", async () => {
    const { user, authClient } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    act(() => {
      authClient.setState({
        status: "connected",
        expiresAt: Date.now() + 7_200_000,
      })
    })

    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })
})

describe("Publishing a roadmap's changes (STY-025)", () => {
  it("asks first, listing what changes; Cancel writes nothing (S9)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const write = vi.spyOn(repository, "publishRoadmapChanges")
    const { user } = await renderPage({ repository })
    await editTitle(user, "Second item", "Second, edited")
    const item = await openEditItemDialog(user, "First item")
    await user.clear(item.getByRole("textbox", { name: "Description" }))
    await user.type(item.getByRole("textbox", { name: "Phase" }), "Beta")
    await confirmItemEdit(user)
    const details = await openEditRoadmapDialog(user)
    await user.clear(details.getByRole("textbox", { name: "Vision" }))
    await confirmRoadmapEdit(user)

    await user.click(main().getByRole("button", { name: "Publish changes" }))

    const dialog = within(
      screen.getByRole("alertdialog", { name: "Publish these changes?" }),
    )
    expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription(
      "The public site shows them after its next nightly update.",
    )
    expect(
      within(dialog.getByRole("list"))
        .getAllByRole("listitem")
        .map((each) => each.textContent),
    ).toEqual([
      "Product detailsVision",
      "First itemDescription, Phase",
      "Second, editedTitle",
    ])

    await user.click(dialog.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(write).not.toHaveBeenCalled()
    expect(main().getByText("4 unpublished changes")).toBeInTheDocument()
  })

  it("publishes once, busy until it ends, then confirms and shows the re-read text (S10)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const {
      held: write,
      release,
      released,
    } = holdCall(repository.publishRoadmapChanges.bind(repository))
    const { user } = await renderPage({
      repository: { ...repository, publishRoadmapChanges: write },
    })
    await editTitle(user, "First item", "First, edited")

    await publish(user)
    const confirm = within(screen.getByRole("alertdialog")).getByRole(
      "button",
      { name: "Publish changes" },
    )
    expect(confirm).toHaveAttribute("aria-busy", "true")
    await user.click(confirm)
    await user.keyboard("{Escape}")
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    await act(async () => {
      release()
      await released
    })

    expect(
      await main().findByText(
        "Changes published. The public site shows them after its next nightly update.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(write).toHaveBeenCalledTimes(1)
    expect(write.mock.calls[0]?.[1].items[0]?.fields).toEqual({
      title: { base: "First item", value: "First, edited" },
    })
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(card("First, edited").queryByText("Changed")).toBeNull()
  })

  it("keeps Publish unavailable while a publish is under way, once the session has expired too (STY-057 S5)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const {
      held: write,
      release,
      released,
    } = holdCall(repository.publishRoadmapChanges.bind(repository))
    const { user, authClient } = await renderPage({
      repository: { ...repository, publishRoadmapChanges: write },
    })
    await editTitle(user, "First item", "First, edited")
    await publish(user)
    const dialog = screen.getByRole("alertdialog")

    act(() => {
      authClient.setState({ status: "expired" })
    })

    const confirm = within(dialog).getByRole("button", {
      name: "Publish changes",
    })
    expect(confirm).toHaveAttribute("aria-disabled", "true")
    await user.click(confirm)
    expect(screen.getAllByRole("alertdialog")).toEqual([dialog])
    await act(async () => {
      release()
      await released
    })
    expect(write).toHaveBeenCalledTimes(1)
  })

  it.each([
    [
      "an item",
      "listRoadmapItems",
      (user: User) => editTitle(user, "First item", "First, edited"),
    ],
    [
      "the roadmap",
      "listRoadmaps",
      (user: User) => editRoadmapText(user, "Product lead", "Alex Jones"),
    ],
  ] as const)(
    "holds the app once a publish of %s can't be read back, its changes pending behind, until a Refresh reads them (DEF-015 S1, S3, S5, S6)",
    async (_, read, edit) => {
      const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
      const { user } = await renderPage({ repository })
      await edit(user)
      const reads = vi
        .spyOn(repository, read)
        .mockRejectedValue(new AppError("network"))

      await publish(user)

      const hold = await expectWriteHold("Your changes were published")
      expect(hold).toHaveAccessibleDescription(
        "This page couldn't be updated to show it. Refresh before you carry on.",
      )
      await user.keyboard("{Escape}")
      expect(hold).toBeInTheDocument()
      const page = within(screen.getByRole("main", { hidden: true }))
      expect(page.getByText("1 unpublished change")).toBeInTheDocument()
      expect(page.queryByText(/^Changes published\./)).toBeNull()

      const refresh = within(hold).getByRole("button", { name: "Refresh" })
      await user.click(refresh)
      expect(
        await within(hold).findByText("Couldn't refresh your roadmaps"),
      ).toBeInTheDocument()
      expect(refresh).toHaveFocus()

      reads.mockRestore()
      await refreshHold(user, hold)

      expect(main().getByText(/^Changes published\./)).toBeVisible()
      expect(main().queryByText(/unpublished change/)).toBeNull()
      expect(main().queryByText("Changed")).toBeNull()
    },
  )

  it("holds the app once the organisations can't be read after a publish, until a Refresh reads them (DEF-015 S1, S3)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, edited")
    const reads = vi
      .spyOn(repository, "listOrganisations")
      .mockRejectedValue(new AppError("network"))

    await publish(user)

    const hold = await expectWriteHold("Your changes were published")
    reads.mockRestore()
    await refreshHold(user, hold)

    expect(main().getByText(/^Changes published\./)).toBeVisible()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("publishes an edit made again once the hold has read the last publish, as no conflict with it (DEF-012)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, edited")
    const reads = vi
      .spyOn(repository, "listRoadmapItems")
      .mockRejectedValue(new AppError("network"))
    await publish(user)
    const hold = await expectWriteHold("Your changes were published")
    reads.mockRestore()
    await refreshHold(user, hold)

    await editTitle(user, "First, edited", "First, again")
    await publish(user)

    await vi.waitFor(() => {
      expect(main().getByText(/^Changes published\./)).toBeVisible()
    })
    expect(main().queryByText(/Someone else/)).toBeNull()
    expect(
      (await repository.listRoadmapItems("producta")).map(
        ({ title }) => title.en,
      ),
    ).toEqual(["First, again", "Second item", "Unplaced item"])
  })

  it("saves an unpublished roadmap, saying nothing goes public (S11)", async () => {
    const { user } = await renderPage({
      path: "/roadmaps/productc",
      waitFor: "Product C item",
    })
    await editTitle(user, "Product C item", "Product C, edited")

    expect(main().getByText("1 change to save")).toBeInTheDocument()
    await user.click(main().getByRole("button", { name: "Save changes" }))
    expect(
      screen.getByRole("alertdialog", { name: "Save these changes?" }),
    ).toHaveAccessibleDescription(
      "This roadmap isn't published, so nothing will be public.",
    )
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Save changes",
      }),
    )

    expect(await main().findByText("Changes saved")).toBeInTheDocument()

    await goToList(user)
    await main().findByRole("link", { name: "Product C roadmap" })
    expect(
      listCard("Product C roadmap").queryByText(/Changes to save/),
    ).toBeNull()
  })

  it("marks an unpublished roadmap's card as having changes to save", async () => {
    const { user } = await renderPage({
      path: "/roadmaps/productc",
      waitFor: "Product C item",
    })
    await editTitle(user, "Product C item", "Product C, edited")

    await goToList(user)
    await main().findByRole("link", { name: "Product C roadmap" })

    expect(
      listCard("Product C roadmap").getByText("Changes to save"),
    ).toBeInTheDocument()
  })

  it.each([
    [
      "forbidden",
      "This Google account isn't allowed to change this roadmap. Ask the spreadsheet owner for edit access.",
    ],
    [
      "network",
      "Couldn't connect. Check your internet connection and try again.",
    ],
    ["unknown", "Something went wrong. Please try again."],
  ] as const)(
    "keeps the changes and says why when the write fails (%s), without retrying (S13)",
    async (kind, reason) => {
      const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
      const write = vi
        .spyOn(repository, "publishRoadmapChanges")
        .mockRejectedValue(new AppError(kind, { retryable: true }))
      const { user } = await renderPage({ repository })
      await editTitle(user, "First item", "First, edited")

      await publish(user)

      const notice = await main().findByRole("alert")
      expect(notice).toHaveTextContent("Couldn't publish your changes")
      expect(notice).toHaveTextContent(reason)
      expect(notice).toHaveTextContent("Your changes are kept in this tab.")
      await vi.waitFor(() => {
        expect(notice).toHaveFocus()
      })
      expect(write).toHaveBeenCalledTimes(1)
      expect(main().getByText("1 unpublished change")).toBeInTheDocument()
      expect(card("First, edited").getByText("Changed")).toBeInTheDocument()

      await user.click(
        within(notice).getByRole("button", { name: "Dismiss message" }),
      )
      expect(main().queryByRole("alert")).toBeNull()
    },
  )

  it("expires the session on a 401, keeping the changes (S12)", async () => {
    const { user, authClient } = await renderPage({
      write: { fails: "unauthenticated" },
    })
    await editTitle(user, "First item", "First, edited")

    await publish(user)

    await vi.waitFor(() => {
      expect(authClient.getSnapshot().status).toBe("expired")
    })
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    // Still offered: pressed, it asks to reconnect first (STY-057).
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "false")
  })

  it("holds the app when the answer is lost; Refresh drops what was written, leaving the rest pending (DEF-015 S2, S5)", async () => {
    const { user } = await renderPage({ write: { lost: "partly-applied" } })
    await editTitle(user, "First item", "First, edited")
    await editTitle(user, "Second item", "Second, edited")

    await publish(user)

    const hold = await expectWriteHold("Your changes may have been published")
    expect(hold).toHaveAccessibleDescription(
      "The answer was lost. Refresh to check before you carry on.",
    )
    await refreshHold(user, hold)

    // The second item's title was written; a co-lead wrote over the first's.
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(card("Second, edited").queryByText("Changed")).toBeNull()
    expect(card("First, edited").getByText("Changed")).toBeInTheDocument()
    expect(main().queryByRole("alert")).toBeNull()
    expect(main().queryByText(/^Changes published\./)).toBeNull()
  })

  it("offers Reconnect once the session ends, then reads again once connected (DEF-015 S4)", async () => {
    const { user, authClient } = await renderPage({
      write: { lost: "partly-applied" },
    })
    await editTitle(user, "First item", "First, edited")
    await editTitle(user, "Second item", "Second, edited")
    await publish(user)
    const hold = await expectWriteHold("Your changes may have been published")

    act(() => {
      authClient.setState({ status: "expired" })
    })

    const reconnect = within(hold).getByRole("button", { name: "Reconnect" })
    expect(reconnect).toHaveFocus()
    expect(hold).toHaveAccessibleDescription(
      "The answer was lost. Refresh to check before you carry on. Reconnect to refresh your roadmaps.",
    )
    await user.click(reconnect)

    expect(authClient.connect).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(hold).not.toBeInTheDocument()
    })
  })

  it("keeps holding when the session ends during Refresh (DEF-015 S3)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems, {
      write: { lost: "partly-applied" },
    })
    const { user, authClient } = await renderPage({ repository })
    await editTitle(user, "First item", "First, edited")
    await editTitle(user, "Second item", "Second, edited")
    await publish(user)
    const hold = await expectWriteHold("Your changes may have been published")
    // Reads that never answer, until the session's end cancels them.
    const hang = (options?: RepositoryReadOptions) =>
      new Promise<never>((_, reject) => {
        options?.signal?.addEventListener("abort", () => {
          reject(new Error("Aborted"))
        })
      })
    vi.spyOn(repository, "listRoadmaps").mockImplementation(hang)
    vi.spyOn(repository, "listRoadmapItems").mockImplementation((_, options) =>
      hang(options),
    )

    const refresh = within(hold).getByRole("button", { name: "Refresh" })
    await user.click(refresh)
    await vi.waitFor(() => {
      expect(refresh).toHaveAttribute("aria-busy", "true")
    })
    act(() => {
      authClient.setState({ status: "expired" })
    })

    await vi.waitFor(() => {
      expect(refresh).not.toHaveAttribute("aria-busy", "true")
    })
    // Let Refresh's cancelled reads settle before looking.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(hold).toBeInTheDocument()
    expect(refresh).toHaveAccessibleName("Reconnect")
  })

  it("asks to reconnect when confirmed once the session has expired, then publishes (S12; STY-057)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const write = vi.spyOn(repository, "publishRoadmapChanges")
    const { user, authClient } = await renderPage({ repository })
    await editTitle(user, "First item", "First, edited")
    await user.click(main().getByRole("button", { name: "Publish changes" }))

    act(() => {
      authClient.setState({ status: "expired" })
    })

    const confirm = within(screen.getByRole("alertdialog")).getByRole(
      "button",
      { name: "Publish changes" },
    )
    expect(confirm).toHaveAttribute("aria-disabled", "false")
    await user.click(confirm)
    await findReconnectDialog()
    expect(write).not.toHaveBeenCalled()

    await reconnectFromDialog(user)

    await waitFor(() => {
      expect(write).toHaveBeenCalledOnce()
    })
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
  })
})

describe("Disconnecting with pending changes (STY-025)", () => {
  it("disconnects at once when nothing is pending", async () => {
    const { user, authClient } = await renderPage()

    await disconnectFromHeader(user)

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(authClient.disconnect).toHaveBeenCalledTimes(1)
  })

  it("asks first; Cancel stays connected (S14)", async () => {
    const { user, authClient } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    await disconnectFromHeader(user)
    const question = within(
      screen.getByRole("alertdialog", { name: "Keep your changes?" }),
    )
    await user.click(question.getByRole("button", { name: "Cancel" }))

    expect(authClient.disconnect).not.toHaveBeenCalled()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("keeps the changes for the next connection, saying so on the start page (S14)", async () => {
    const { user, authClient, router } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    await disconnectFromHeader(user)
    await user.click(
      screen.getByRole("button", { name: "Keep changes and disconnect" }),
    )

    expect(authClient.disconnect).toHaveBeenCalledTimes(1)
    await act(() => router.navigate({ to: "/" }))
    const waiting = (
      await main().findByText("Changes to 1 roadmap are waiting")
    ).closest("[role=note]")
    expect(waiting).toHaveTextContent(
      "Connect Google to publish or save them. Closing or reloading this tab loses them.",
    )

    await user.click(main().getByRole("button", { name: "Connect Google" }))
    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "producta" },
      }),
    )
    await main().findByRole("heading", { level: 3, name: "First, edited" })
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("discards the changes, then disconnects (S14)", async () => {
    const { user, authClient, router } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    await disconnectFromHeader(user)
    await user.click(
      screen.getByRole("button", { name: "Discard changes and disconnect" }),
    )

    expect(authClient.disconnect).toHaveBeenCalledTimes(1)
    await act(() => router.navigate({ to: "/" }))
    await main().findByRole("button", { name: "Connect Google" })
    expect(main().queryByText(/are waiting/)).toBeNull()
  })
})

describe("Leaving the tab with pending changes (S8)", () => {
  function leave() {
    const event = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  }

  it("asks only while changes are pending", async () => {
    const { user } = await renderPage()
    expect(leave()).toBe(false)

    await editTitle(user, "First item", "First, edited")
    expect(leave()).toBe(true)

    await user.click(
      main().getByRole("button", { name: "Undo changes First, edited" }),
    )
    expect(leave()).toBe(false)
  })
})

describe("A co-lead's changes (STY-026)", () => {
  function coLeadRepository(items: InMemoryRoadmapItems = roadmapItems) {
    return createInMemoryRoadmapRepository(roadmaps, items)
  }

  /** The co-lead's changes to Product A's vision and its first item's title. */
  function changeBoth(repository: InMemoryRoadmapRepository) {
    repository.coLead((list, itemsOf) => {
      const roadmap = list.find(({ id }) => id === "producta")
      const [item] = itemsOf("producta")
      if (!roadmap || !item) throw new Error("No Product A")
      roadmap.vision = { en: "Their vision.", cy: "" }
      item.title = { ...item.title, en: "First, theirs" }
    })
  }

  /** Every later read of the roadmap and its items fails. */
  function failReads(repository: InMemoryRoadmapRepository) {
    vi.spyOn(repository, "listRoadmaps").mockRejectedValue(
      new AppError("forbidden"),
    )
    vi.spyOn(repository, "listRoadmapItems").mockRejectedValue(
      new AppError("forbidden"),
    )
  }

  function editVision(user: User, to: string) {
    return editRoadmapText(user, "Vision", to)
  }

  /** The notice at the foot, once the publish it follows has ended, focus on it. */
  async function refusal() {
    const notice = await findRefusal()
    await vi.waitFor(() => {
      expect(notice).toHaveFocus()
    })
    return notice
  }

  /** The review, opened from the notice once the publish it follows has ended. */
  async function review(user: User) {
    await refusal()
    return openConflictReview(user)
  }

  it("writes nothing and shows each field a co-lead changed, theirs beside yours (S1)", async () => {
    const repository = coLeadRepository()
    const write = vi.spyOn(repository, "publishRoadmapChanges")
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)

    await publish(user)

    const notice = await refusal()
    expect(notice).toHaveTextContent(
      "Someone else has changed this roadmap tooNothing was published.Review the changes",
    )
    expect(
      within(notice).queryByRole("button", { name: "Dismiss message" }),
    ).toBeNull()
    expect(write).toHaveBeenCalledTimes(1)
    expect(main().getByText("2 unpublished changes")).toBeInTheDocument()
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "true")

    const dialog = await openConflictReview(user)
    expect(dialog).toHaveAccessibleDescription(
      "Nothing was published. Choose which to keep for each, then publish again.",
    )
    expect(
      within(dialog).getByRole("button", {
        name: "Keep mine Product details: Vision",
      }),
    ).toHaveFocus()
    const conflicts = within(dialog)
      .getAllByRole("listitem")
      .map((each) => within(each))
    expect(
      conflicts.map(
        (each) => each.getByText(/: /, { selector: "p" }).textContent,
      ),
    ).toEqual(["Product details: Vision", "First, mine: Title"])
    const [vision, title] = conflicts
    expect(
      vision?.getAllByRole("definition").map((each) => each.textContent),
    ).toEqual(["My vision.", "Their vision."])
    expect(title?.getAllByRole("term").map((each) => each.textContent)).toEqual(
      ["Your change", "Current text"],
    )
    expect(
      title?.getAllByRole("definition").map((each) => each.textContent),
    ).toEqual(["First, mine", "First, theirs"])
    expect(
      within(dialog).getByRole("button", {
        name: "Keep mine First, mine: Title",
      }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", {
        name: "Use theirs Product details: Vision",
      }),
    ).toBeInTheDocument()
  })

  it("closed with a field undecided, keeps the notice and Publish unavailable, focus back on Review the changes (D18)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)
    await publish(user)
    const dialog = await review(user)
    await user.click(
      within(dialog).getByRole("button", {
        name: "Keep mine Product details: Vision",
      }),
    )

    await closeConflictReview(user, dialog)

    const notice = await findRefusal()
    expect(
      within(notice).getByRole("button", { name: "Review the changes" }),
    ).toHaveFocus()
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "true")
    const reopened = await openConflictReview(user)
    expect(within(reopened).getAllByRole("listitem")).toHaveLength(1)
  })

  it("closes from the review's corner close button as its Close does, focus back on Review the changes (STY-068 S7)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)
    await publish(user)
    const dialog = await review(user)

    await user.click(cornerClose(dialog))
    await expectDialogClosed()

    const notice = await findRefusal()
    expect(
      within(notice).getByRole("button", { name: "Review the changes" }),
    ).toHaveFocus()
  })

  it("keeps mine or uses theirs, field by field, moving focus on to the next and then to Publish (S2, S3)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)
    await publish(user)
    const dialog = await review(user)

    await user.click(
      within(dialog).getByRole("button", {
        name: "Keep mine Product details: Vision",
      }),
    )
    expect(
      within(dialog).getByRole("button", {
        name: "Keep mine First, mine: Title",
      }),
    ).toHaveFocus()
    await user.click(
      within(dialog).getByRole("button", {
        name: "Use theirs First, mine: Title",
      }),
    )

    // Every field decided, changes left: the review says so, Publish focused (D16).
    expect(dialog).toHaveTextContent(
      "Every change is decided. Publish when you're ready.",
    )
    expect(
      within(dialog).getByRole("button", { name: "Publish changes" }),
    ).toHaveFocus()
    await closeConflictReview(user, dialog)
    const action = main().getByRole("button", { name: "Publish changes" })
    await expectOpeningFocus(() => action)
    expect(action).toHaveAttribute("aria-disabled", "false")
    expect(main().queryByRole("alert")).toBeNull()
    expect(card("First, theirs").queryByText("Changed")).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(
      within(await openProductDetails(user)).getByText("My vision."),
    ).toBeInTheDocument()

    await publish(user)
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(
      within(await openProductDetails(user)).getByText("My vision."),
    ).toBeInTheDocument()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("shows their text after Use theirs, even if the roadmap couldn't be read again (S2)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)
    failReads(repository)

    await publish(user)

    expect(
      await main().findByText("Couldn't refresh your roadmaps"),
    ).toBeInTheDocument()
    const dialog = await openConflictReview(user)
    for (const name of [
      "Use theirs Product details: Vision",
      "Use theirs First, mine: Title",
    ]) {
      await user.click(within(dialog).getByRole("button", { name }))
    }
    // Nothing left: Close alone, and focus then on the roadmap's title (D22).
    expect(dialog).toHaveTextContent(
      "Every change is decided. Nothing is left to publish.",
    )
    expect(within(dialog).getAllByRole("button")).toEqual([
      reviewFooterClose(dialog),
      cornerClose(dialog),
    ])
    await closeConflictReview(user, dialog)
    await expectOpeningFocus(() =>
      main().getByRole("heading", { level: 1, name: "Product A roadmap" }),
    )

    expect(
      within(await openProductDetails(user)).getByText("Their vision."),
    ).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 3, name: "First, theirs" }),
    ).toBeInTheDocument()
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(
      main().getByText("Couldn't refresh your roadmaps"),
    ).toBeInTheDocument()
  })

  it("shows the text the publish found after Use theirs, not a co-lead's earlier text (S2)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)
    await refreshRoadmap(user)
    await vi.waitFor(() => {
      expect(moreButton()).not.toHaveAttribute("aria-busy", "true")
    })
    repository.coLead((list, itemsOf) => {
      const roadmap = list.find(({ id }) => id === "producta")
      const [item] = itemsOf("producta")
      if (!roadmap || !item) throw new Error("No Product A")
      roadmap.vision = { en: "Their later vision.", cy: "" }
      item.title = { ...item.title, en: "First, theirs later" }
    })
    failReads(repository)

    await publish(user)
    await main().findByText("Couldn't refresh your roadmaps")
    const dialog = await openConflictReview(user)
    for (const name of [
      "Use theirs Product details: Vision",
      "Use theirs First, mine: Title",
    ]) {
      await user.click(within(dialog).getByRole("button", { name }))
    }
    await closeConflictReview(user, dialog)

    expect(
      within(await openProductDetails(user)).getByText("Their later vision."),
    ).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 3, name: "First, theirs later" }),
    ).toBeInTheDocument()
  })

  it("does not reopen a decided conflict when the field is edited again (S2)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editVision(user, "My vision.")
    changeBoth(repository)
    await publish(user)
    const dialog = await review(user)
    await user.click(
      within(dialog).getByRole("button", {
        name: "Use theirs Product details: Vision",
      }),
    )
    await closeConflictReview(user, dialog)
    repository.coLead((list) => {
      const roadmap = list.find(({ id }) => id === "producta")
      if (roadmap) roadmap.vision = { en: "Their second vision.", cy: "" }
    })
    await refreshRoadmap(user)
    await within(await openProductDetails(user)).findByText(
      "Their second vision.",
    )

    await editVision(user, "My later vision.")

    expect(main().queryByRole("alert")).toBeNull()
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "false")
    await publish(user)
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(
      within(await openProductDetails(user)).getByText("My later vision."),
    ).toBeInTheDocument()
  })

  it("stops again for a co-lead's change made after Keep mine (S3)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editVision(user, "My vision.")
    changeBoth(repository)
    await publish(user)
    const first = await review(user)
    await user.click(
      within(first).getByRole("button", {
        name: "Keep mine Product details: Vision",
      }),
    )
    await closeConflictReview(user, first)
    repository.coLead((list) => {
      const roadmap = list.find(({ id }) => id === "producta")
      if (roadmap) roadmap.vision = { en: "Their second vision.", cy: "" }
    })

    await publish(user)

    const dialog = await review(user)
    expect(
      within(dialog)
        .getAllByRole("definition")
        .map((each) => each.textContent),
    ).toEqual(["My vision.", "Their second vision."])
  })

  it("publishes over a co-lead's change to a field not edited, and shows it after (S4)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "Second item", "Second, mine")
    changeBoth(repository)

    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(
      within(await openProductDetails(user)).getByText("Their vision."),
    ).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 3, name: "First, theirs" }),
    ).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 3, name: "Second, mine" }),
    ).toBeInTheDocument()
  })

  it("goes from the review's Publish changes to the publish confirmation, whose Cancel returns focus to the foot's Publish (STY-052 D16)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)
    await publish(user)
    const dialog = await review(user)
    for (const name of [
      "Keep mine Product details: Vision",
      "Use theirs First, mine: Title",
    ]) {
      await user.click(within(dialog).getByRole("button", { name }))
    }

    await user.click(
      within(dialog).getByRole("button", { name: "Publish changes" }),
    )

    const confirm = await screen.findByRole("alertdialog", {
      name: "Publish these changes?",
    })
    expect(dialog).not.toBeInTheDocument()
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }))
    await expectOpeningFocus(() =>
      main().getByRole("button", { name: "Publish changes" }),
    )
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("lists the items a co-lead removed once every field is decided, then keeps them at the foot, Publish available (STY-052 D17)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editTitle(user, "Second item", "Second, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)
    repository.coLead((_, itemsOf) => {
      itemsOf("producta").splice(1, 1)
    })
    await publish(user)
    const dialog = await review(user)
    // Named once every field is decided, not before.
    expect(dialog).not.toHaveTextContent("“Second item”")

    for (const name of [
      "Use theirs Product details: Vision",
      "Keep mine First, mine: Title",
    ]) {
      await user.click(within(dialog).getByRole("button", { name }))
    }

    expect(dialog).toHaveAccessibleName("Some changes couldn't be kept")
    expect(dialog).toHaveTextContent(
      "Someone else has removed or changed “Second item”, so your changes to it couldn't be kept.Your other changes are kept in this tab.Every change is decided. Publish when you're ready.",
    )
    expect(
      within(dialog).getByRole("button", { name: "Publish changes" }),
    ).toHaveFocus()
    await closeConflictReview(user, dialog)
    const action = main().getByRole("button", { name: "Publish changes" })
    await expectOpeningFocus(() => action)
    expect(action).toHaveAttribute("aria-disabled", "false")
    const notice = await findRefusal()
    expect(notice).toHaveTextContent(
      "Some changes couldn't be keptNothing was published.Someone else has removed or changed “Second item”, so your changes to it couldn't be kept.Your other changes are kept in this tab.",
    )
    await user.click(
      within(notice).getByRole("button", { name: "Dismiss message" }),
    )
    expect(main().queryByRole("alert")).toBeNull()
  })

  it("says nothing is left once every change is decided away, then keeps the removed items at the foot, focus on the title (STY-052 D22, D23)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editTitle(user, "Second item", "Second, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)
    repository.coLead((_, itemsOf) => {
      itemsOf("producta").splice(1, 1)
    })
    await publish(user)
    const dialog = await review(user)

    for (const name of [
      "Use theirs Product details: Vision",
      "Use theirs First, mine: Title",
    ]) {
      await user.click(within(dialog).getByRole("button", { name }))
    }

    expect(dialog).toHaveTextContent(
      "Someone else has removed or changed “Second item”, so your changes to it couldn't be kept.Every change is decided. Nothing is left to publish.",
    )
    const close = reviewFooterClose(dialog)
    expect(within(dialog).getAllByRole("button")).toEqual([
      close,
      cornerClose(dialog),
    ])
    expect(close).toHaveFocus()
    await closeConflictReview(user, dialog)
    await expectOpeningFocus(() =>
      main().getByRole("heading", { level: 1, name: "Product A roadmap" }),
    )
    expect(main().queryByText(/unpublished change/)).toBeNull()
    const notice = await findRefusal()
    expect(notice).toHaveTextContent("Some changes couldn't be kept")
    expect(notice).toHaveTextContent("“Second item”")
    expect(notice).not.toHaveTextContent("Your other changes are kept")
  })

  it("discards the changes to items a co-lead removed, naming each, and keeps the rest (S5)", async () => {
    const repository = coLeadRepository({
      producta: [first, second, createTestRoadmapItem("No ID item")],
    })
    const { user } = await renderPage({ repository, waitFor: "No ID item" })
    await editTitle(user, "First item", "First, mine")
    await editTitle(user, "Second item", "Second, mine")
    await editTitle(user, "No ID item", "No ID, mine")
    repository.coLead((_, itemsOf) => {
      // The second item is deleted, so the third moves into its place.
      itemsOf("producta").splice(1, 1)
    })

    await publish(user)

    // Nothing to decide: the notice names what was lost, until dismissed (D17).
    const notice = await refusal()
    expect(notice).toHaveTextContent("Some changes couldn't be kept")
    expect(notice).toHaveTextContent("Nothing was published.")
    expect(notice).toHaveTextContent(
      "Someone else has removed or changed “Second item”, so your changes to it couldn't be kept.",
    )
    expect(notice).toHaveTextContent(
      "Someone else has removed or changed “No ID item”, so your changes to it couldn't be kept.",
    )
    expect(notice).toHaveTextContent("Your other changes are kept in this tab.")
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(card("No ID item").queryByText("Changed")).toBeNull()

    await user.click(
      within(notice).getByRole("button", { name: "Dismiss message" }),
    )
    await publish(user)
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 3, name: "First, mine" }),
    ).toBeInTheDocument()
  })

  it.each([
    ["a publish", (user: User) => publish(user)],
    ["a Refresh", (user: User) => refreshRoadmap(user)],
  ])(
    "discards the changes to a roadmap removed from the list, found by %s (S6)",
    async (_, find) => {
      const repository = coLeadRepository()
      const { user } = await renderPage({ repository })
      await editTitle(user, "First item", "First, mine")
      repository.coLead((list) => {
        list.splice(
          list.findIndex(({ id }) => id === "producta"),
          1,
        )
      })

      await find(user)

      expect(
        await main().findByRole("heading", {
          level: 1,
          name: "Roadmap not found",
        }),
      ).toBeInTheDocument()
      expect(
        main().getByText(
          "This roadmap was removed from the list, so your changes to it couldn't be kept.",
        ),
      ).toBeInTheDocument()
      const [back] = main().getAllByRole("link", { name: "Back to roadmaps" })
      if (!back) throw new Error("No link back")
      await user.click(back)
      await main().findByRole("link", { name: "Product B roadmap" })
      expect(main().queryByText("Unpublished changes")).toBeNull()
    },
  )

  it("keeps a removed roadmap removed when another roadmap's refusal shows its text (DEF-003)", async () => {
    const repository = coLeadRepository()
    const { user, router } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    repository.coLead((list) => {
      list.splice(
        list.findIndex(({ id }) => id === "producta"),
        1,
      )
    })
    vi.spyOn(repository, "listRoadmaps").mockRejectedValue(
      new AppError("forbidden"),
    )
    await publish(user)
    await main().findByRole("heading", { level: 1, name: "Roadmap not found" })

    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "productb" },
      }),
    )
    await main().findByRole("heading", { level: 3, name: "Product B item" })
    await editVision(user, "My vision.")
    repository.coLead((list) => {
      const roadmap = list.find(({ id }) => id === "productb")
      if (!roadmap) throw new Error("No Product B")
      roadmap.vision = { en: "Their vision.", cy: "" }
    })
    await publish(user)
    await main().findByText("Someone else has changed this roadmap too")

    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "producta" },
      }),
    )
    expect(
      await main().findByText(
        "This roadmap was removed from the list, so your changes to it couldn't be kept.",
      ),
    ).toBeInTheDocument()
  })

  it("says a roadmap a publish found removed is gone, even if the list couldn't be read again (S6)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    repository.coLead((list) => {
      list.splice(
        list.findIndex(({ id }) => id === "producta"),
        1,
      )
    })
    vi.spyOn(repository, "listRoadmaps").mockRejectedValue(
      new AppError("forbidden"),
    )

    await publish(user)

    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Roadmap not found",
      }),
    ).toBeInTheDocument()
    expect(
      main().getByText(
        "This roadmap was removed from the list, so your changes to it couldn't be kept.",
      ),
    ).toBeInTheDocument()
  })
})

describe("A roadmap's product details open in place (STY-065 S3)", () => {
  const productDetailsRegion = () =>
    within(main().getByRole("region", { name: "Product details" }))

  it("shows no Edit while the details are closed, and ends the open details in it, after the fields", async () => {
    const { user } = await renderPage()

    expect(
      main().queryByRole("button", { name: "Edit Product details" }),
    ).toBeNull()
    const details = await openProductDetails(user)

    const edit = within(details).getByRole("button", {
      name: "Edit Product details",
    })
    const lastField = within(details).getAllByRole("definition").at(-1)
    expect(lastField?.compareDocumentPosition(edit)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(roadmapFacts()).not.toContainElement(edit)
  })

  it("opens the roadmap dialog headed Edit product details from Edit, and takes focus back to Edit as it closes", async () => {
    const { user } = await renderPage()
    const details = await openProductDetails(user)
    const edit = within(details).getByRole("button", {
      name: "Edit Product details",
    })

    await user.click(edit)

    expect(
      await screen.findByRole("dialog", { name: "Edit product details" }),
    ).toBeVisible()
    await user.click(
      editRoadmapDialog().getByRole("button", { name: "Cancel" }),
    )
    await expectDialogClosed()
    await waitFor(() => {
      expect(edit).toHaveFocus()
    })
  })

  it("tags a pending change beside the disclosure while closed, with no Undo changes or Edit", async () => {
    const { user } = await renderPage()
    await editRoadmapText(user, "Vision", "A clear vision. Still.")
    const disclosure = main().getByRole("button", { name: "Product details" })

    // Editing left the details open.
    await user.click(disclosure)

    expect(disclosure).toHaveAttribute("aria-expanded", "false")
    expect(within(roadmapFacts()).getByText("Changed")).toBeVisible()
    expect(main().queryByRole("button", { name: /^Undo changes/ })).toBeNull()
    expect(
      main().queryByRole("button", { name: "Edit Product details" }),
    ).toBeNull()
  })

  it("shows Changed, Undo changes and Edit together once the details with a pending change are open", async () => {
    const { user } = await renderPage()
    await editRoadmapText(user, "Vision", "A clear vision. Still.")

    await openProductDetails(user)

    const details = productDetailsRegion()
    expect(details.getAllByText("Changed")).toHaveLength(1)
    expect(
      details.getByRole("button", { name: "Undo changes Product details" }),
    ).toBeVisible()
    expect(
      details.getByRole("button", { name: "Edit Product details" }),
    ).toBeVisible()
    // The disclosure's own tag goes while open.
    expect(within(roadmapFacts()).queryByText("Changed")).toBeNull()
  })

  it("names the disclosure and Edit in Welsh (ADR-008)", async () => {
    const { user } = await renderPage({ language: "cy" })

    const details = await openProductDetails(user)

    expect(
      within(details).getByRole("button", {
        name: "Golygu Manylion y cynnyrch",
      }),
    ).toBeVisible()
  })
})
