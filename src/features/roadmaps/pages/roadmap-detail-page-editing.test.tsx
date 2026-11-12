import { act, screen, within } from "@testing-library/react"
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
import type { Language } from "@/i18n"
import { AppError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render-with-providers"

import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapItems,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

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

/** The card (or form) of the item headed `title`. */
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

/** Edits an item's title from its card and confirms it. */
async function editTitle(user: User, from: string, to: string) {
  await user.click(main().getByRole("button", { name: `Edit ${from}` }))
  const title = main().getByRole("textbox", { name: "Title" })
  await user.clear(title)
  await user.type(title, to)
  await user.click(main().getByRole("button", { name: "Done" }))
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
  it("turns an item's card into a form prefilled with its English, its other fields still shown (S1)", async () => {
    const { user } = await renderPage()

    await user.click(main().getByRole("button", { name: "Edit First item" }))

    const form = within(main().getByRole("form", { name: "First item" }))
    expect(form.getByRole("textbox", { name: "Title" })).toHaveFocus()
    expect(form.getByRole("textbox", { name: "Title" })).toHaveValue(
      "First item",
    )
    expect(form.getByRole("textbox", { name: "Description" })).toHaveValue(
      "What it is.",
    )
    expect(form.getByRole("textbox", { name: "Expected outcome" })).toHaveValue(
      "",
    )
    expect(form.getByRole("textbox", { name: "Phase" })).toHaveValue("")
    // Tags stay on the card, read-only.
    expect(card("First item").getByText("Records")).toBeInTheDocument()
  })

  it("keeps a confirmed change pending: trimmed, shown, tagged and counted, nothing written (S2)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const write = vi.spyOn(repository, "publishRoadmapChanges")
    const { user } = await renderPage({ repository })

    await editTitle(user, "First item", "  A better first item  ")

    const edited = card("A better first item")
    expect(edited.getByText("Changed")).toBeInTheDocument()
    expect(
      edited.getByRole("button", { name: "Edit A better first item" }),
    ).toHaveFocus()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toBeInTheDocument()
    expect(write).not.toHaveBeenCalled()
  })

  it.each(["Cancel", "Escape"])(
    "leaves the item as it was on %s, focus back on Edit (S3)",
    async (how) => {
      const { user } = await renderPage()

      await user.click(main().getByRole("button", { name: "Edit First item" }))
      await user.type(main().getByRole("textbox", { name: "Title" }), " more")
      if (how === "Cancel") {
        await user.click(main().getByRole("button", { name: "Cancel" }))
      } else {
        await user.keyboard("{Escape}")
      }

      expect(main().queryByRole("form")).toBeNull()
      expect(
        main().getByRole("button", { name: "Edit First item" }),
      ).toHaveFocus()
      expect(card("First item").queryByText("Changed")).toBeNull()
      expect(main().queryByText(/unpublished change/)).toBeNull()
    },
  )

  it("requires a title, linking the error to the field, and lets other fields be cleared (S4)", async () => {
    const { user } = await renderPage()

    await user.click(main().getByRole("button", { name: "Edit First item" }))
    const title = main().getByRole("textbox", { name: "Title" })
    await user.clear(title)
    await user.type(title, "   ")
    await user.clear(main().getByRole("textbox", { name: "Description" }))
    await user.click(main().getByRole("button", { name: "Done" }))

    expect(title).toHaveAttribute("aria-invalid", "true")
    expect(title).toHaveAccessibleDescription("Error: Enter a title")
    expect(title).toHaveFocus()
    expect(main().queryByText(/unpublished change/)).toBeNull()

    await user.clear(title)
    await user.type(title, "Titled again")
    await user.click(main().getByRole("button", { name: "Done" }))

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
    expect(
      main().getByRole("button", { name: "Edit First item" }),
    ).toHaveFocus()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()

    await user.click(main().getByRole("button", { name: "Discard all" }))
    const question = within(
      screen.getByRole("alertdialog", {
        name: "Discard all changes to this roadmap?",
      }),
    )
    await user.click(question.getByRole("button", { name: "Cancel" }))
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()

    await user.click(main().getByRole("button", { name: "Discard all" }))
    await user.click(
      screen.getByRole("button", { name: "Discard all changes" }),
    )

    expect(
      main().getByRole("heading", { level: 3, name: "Second item" }),
    ).toBeInTheDocument()
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(main().queryByText("Changed")).toBeNull()
  })

  it("labels the fields as the English in Welsh, and shows the Welsh tagged (S16)", async () => {
    const { user } = await renderPage({ language: "cy" })

    await user.click(
      main().getByRole("button", { name: "Golygu Eitem gyntaf" }),
    )
    const title = main().getByRole("textbox", { name: "Teitl (Saesneg)" })
    expect(title).toHaveValue("First item")
    await user.clear(title)
    await user.type(title, "First, edited")
    await user.click(main().getByRole("button", { name: "Gorffen" }))

    expect(card("Eitem gyntaf").getByText("Wedi newid")).toBeInTheDocument()
  })
})

describe("Editing what a roadmap is about (STY-025)", () => {
  it("edits the roadmap's five fields, tagging the block and the title (S5)", async () => {
    const { user } = await renderPage()

    await user.click(
      main().getByRole("button", { name: "Edit About this roadmap" }),
    )
    const form = within(
      main().getByRole("form", { name: "About this roadmap" }),
    )
    expect(
      form
        .getAllByRole("textbox")
        .map(
          (field) => (field as HTMLInputElement | HTMLTextAreaElement).value,
        ),
    ).toEqual(["Product A roadmap", "Live", "", "A clear vision.", ""])
    expect(form.getByRole("textbox", { name: "Title" })).toHaveFocus()
    await user.clear(form.getByRole("textbox", { name: "Title" }))
    await user.type(
      form.getByRole("textbox", { name: "Title" }),
      "Product A, renamed",
    )
    await user.type(
      form.getByRole("textbox", { name: "Product lead" }),
      "Alex Jones",
    )
    await user.click(form.getByRole("button", { name: "Done" }))

    const heading = main().getByRole("heading", {
      level: 1,
      name: "Product A, renamed",
    })
    expect(within(titleRow(heading)).getByText("Changed")).toBeInTheDocument()
    const about = within(
      main().getByRole("region", { name: "About this roadmap" }),
    )
    expect(about.getByText("Alex Jones")).toBeInTheDocument()
    expect(about.getByText("Changed")).toBeInTheDocument()
    expect(
      about.getByRole("button", { name: "Edit About this roadmap" }),
    ).toHaveFocus()
    expect(main().getByText("2 unpublished changes")).toBeInTheDocument()
  })

  it("tags only the block when the title is unchanged, and undoes it all", async () => {
    const { user } = await renderPage()

    await user.click(
      main().getByRole("button", { name: "Edit About this roadmap" }),
    )
    await user.clear(main().getByRole("textbox", { name: "Vision" }))
    await user.click(main().getByRole("button", { name: "Done" }))

    const heading = main().getByRole("heading", {
      level: 1,
      name: "Product A roadmap",
    })
    expect(within(titleRow(heading)).queryByText("Changed")).toBeNull()
    await user.click(
      main().getByRole("button", { name: "Undo changes About this roadmap" }),
    )
    expect(main().getByText("A clear vision.")).toBeInTheDocument()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })
})

describe("Keeping a roadmap's changes (STY-025)", () => {
  it("keeps them across pages and Refresh, marking the roadmap's card (S7)", async () => {
    const { user, router } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    await user.click(main().getByRole("link", { name: "Back to roadmaps" }))
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
    await user.click(main().getByRole("button", { name: "Refresh" }))
    expect(
      await main().findByRole("heading", { level: 3, name: "First, edited" }),
    ).toBeInTheDocument()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("keeps them, and holds Publish, while the session has expired (S12)", async () => {
    const { user, authClient } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    act(() => {
      authClient.setState({ status: "expired" })
    })

    const action = main().getByRole("button", { name: "Publish changes" })
    expect(action).toHaveAttribute("aria-disabled", "true")
    await user.click(action)
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(card("First, edited").getByText("Changed")).toBeInTheDocument()

    act(() => {
      authClient.setState({
        status: "connected",
        expiresAt: Date.now() + 3_600_000,
      })
    })
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "false")
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("leaves alone a co-lead's change, read while a form was open, to a field it did not change", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems)
    const { user } = await renderPage({ repository })
    await user.click(
      main().getByRole("button", { name: "Edit About this roadmap" }),
    )
    await user.type(main().getByRole("textbox", { name: "Title" }), " v2")

    const read = vi
      .spyOn(repository, "listRoadmaps")
      .mockResolvedValue(
        roadmaps.map((roadmap) =>
          roadmap.id === "producta"
            ? { ...roadmap, vision: { en: "A co-lead's vision.", cy: "" } }
            : roadmap,
        ),
      )
    await user.click(main().getByRole("button", { name: "Refresh" }))
    await vi.waitFor(() => {
      expect(read).toHaveBeenCalled()
    })
    await user.click(main().getByRole("button", { name: "Done" }))

    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(await main().findByText("A co-lead's vision.")).toBeInTheDocument()
  })

  it("closes the form of an item without an ID when a read puts another item in its place", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, {
      producta: [
        createTestRoadmapItem("No ID one"),
        createTestRoadmapItem("No ID two"),
      ],
    })
    const { user } = await renderPage({ repository, waitFor: "No ID two" })
    await user.click(main().getByRole("button", { name: "Edit No ID one" }))
    await user.type(main().getByRole("textbox", { name: "Phase" }), "Beta")

    vi.spyOn(repository, "listRoadmapItems").mockResolvedValue([
      createTestRoadmapItem("Inserted by a co-lead"),
      createTestRoadmapItem("No ID one"),
      createTestRoadmapItem("No ID two"),
    ])
    await user.click(main().getByRole("button", { name: "Refresh" }))

    await main().findByRole("heading", {
      level: 3,
      name: "Inserted by a co-lead",
    })
    expect(main().queryByRole("form")).toBeNull()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("keeps another item's open form when publishing gives every item an ID", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, {
      producta: [
        createTestRoadmapItem("No ID one"),
        createTestRoadmapItem("No ID two"),
      ],
    })
    const { user } = await renderPage({ repository, waitFor: "No ID two" })
    await editTitle(user, "No ID one", "One, edited")
    await user.click(main().getByRole("button", { name: "Edit No ID two" }))
    await user.type(main().getByRole("textbox", { name: "Phase" }), "Beta")

    await publish(user)
    await main().findByText(/^Changes published\./)

    expect(main().getByRole("textbox", { name: "Phase" })).toHaveValue("Beta")
    await user.click(main().getByRole("button", { name: "Done" }))
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
    await user.click(main().getByRole("button", { name: "Edit First item" }))
    await user.clear(main().getByRole("textbox", { name: "Description" }))
    await user.type(main().getByRole("textbox", { name: "Phase" }), "Beta")
    await user.click(main().getByRole("button", { name: "Done" }))
    await user.click(
      main().getByRole("button", { name: "Edit About this roadmap" }),
    )
    await user.clear(main().getByRole("textbox", { name: "Vision" }))
    await user.click(main().getByRole("button", { name: "Done" }))

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
      "About this roadmapVision",
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
    const real = repository.publishRoadmapChanges.bind(repository)
    let release: (() => void) | undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const write = vi
      .spyOn(repository, "publishRoadmapChanges")
      .mockImplementation(async (...args) => {
        await held
        return real(...args)
      })
    const { user } = await renderPage({ repository })
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
      release?.()
      await held
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

    await user.click(main().getByRole("link", { name: "Back to roadmaps" }))
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

    await user.click(main().getByRole("link", { name: "Back to roadmaps" }))
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
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "true")
  })

  it("says an unconfirmed write may have landed; Refresh clears the notice and drops what was written (S18)", async () => {
    const { user } = await renderPage({ write: { lost: "partly-applied" } })
    await editTitle(user, "First item", "First, edited")
    await editTitle(user, "Second item", "Second, edited")

    await publish(user)

    const notice = await main().findByRole("alert")
    expect(notice).toHaveTextContent("Your changes may have been published")
    // The second item's title was written; a co-lead wrote over the first's.
    await main().findByText("1 unpublished change")
    expect(card("Second, edited").queryByText("Changed")).toBeNull()
    expect(card("First, edited").getByText("Changed")).toBeInTheDocument()

    await user.click(main().getByRole("button", { name: "Refresh" }))

    await vi.waitFor(() => {
      expect(main().queryByRole("alert")).toBeNull()
    })
  })

  it("keeps saying a write may have landed while Refresh cannot read the roadmap (S18)", async () => {
    const { user } = await renderPage({ write: { lost: "reread-fails" } })
    await editTitle(user, "First item", "First, edited")

    await publish(user)
    // The dialog stays until the failing re-reads have given up.
    await vi.waitFor(() => {
      expect(
        main().getByText("Your changes may have been published"),
      ).toBeInTheDocument()
    })

    const refresh = main().getByRole("button", { name: "Refresh" })
    await user.click(refresh)

    await vi.waitFor(() => {
      expect(refresh).not.toHaveAttribute("aria-busy", "true")
    })
    expect(
      main().getByText("Your changes may have been published"),
    ).toBeInTheDocument()
  })

  it("lets nothing drop a change that may have been published until Refresh reads the roadmap (S18)", async () => {
    const { user } = await renderPage({ write: { lost: "reread-fails" } })
    await editTitle(user, "First item", "First, edited")

    await publish(user)
    const notice = await vi.waitFor(() =>
      main()
        .getByText("Your changes may have been published")
        .closest("[role]"),
    )

    expect(notice).not.toBeNull()
    expect(
      within(notice as HTMLElement).queryByRole("button", {
        name: "Dismiss message",
      }),
    ).toBeNull()
    // The dialog stays until the failing re-reads have given up.
    const discard = await main().findByRole("button", { name: "Discard all" })
    const undo = main().getByRole("button", {
      name: "Undo changes First, edited",
    })
    expect(discard).toHaveAttribute("data-disabled")
    expect(undo).toHaveAttribute("data-disabled")
    await user.click(discard)
    await user.click(undo)
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("keeps saying a write may have landed when the session ends during Refresh (S18)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems, {
      write: { lost: "partly-applied" },
    })
    const { user, authClient } = await renderPage({ repository })
    await editTitle(user, "First item", "First, edited")
    await editTitle(user, "Second item", "Second, edited")
    await publish(user)
    expect(await main().findByRole("alert")).toHaveTextContent(
      "Your changes may have been published",
    )
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

    const refresh = main().getByRole("button", { name: "Refresh" })
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
    // The session's own alert shows too.
    expect(
      main().getByText("Your changes may have been published"),
    ).toBeInTheDocument()
  })

  it("cannot publish from an open dialog once the session has expired (S12)", async () => {
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
    expect(confirm).toHaveAttribute("aria-disabled", "true")
    await user.click(confirm)
    expect(write).not.toHaveBeenCalled()
  })
})

describe("Disconnecting with pending changes (STY-025)", () => {
  it("disconnects at once when nothing is pending", async () => {
    const { user, authClient } = await renderPage()

    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Disconnect",
      }),
    )

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(authClient.disconnect).toHaveBeenCalledTimes(1)
  })

  it("asks first; Cancel stays connected (S14)", async () => {
    const { user, authClient } = await renderPage()
    await editTitle(user, "First item", "First, edited")

    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Disconnect",
      }),
    )
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

    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Disconnect",
      }),
    )
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

    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Disconnect",
      }),
    )
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

  async function editVision(user: User, to: string) {
    await user.click(
      main().getByRole("button", { name: "Edit About this roadmap" }),
    )
    const vision = main().getByRole("textbox", { name: "Vision" })
    await user.clear(vision)
    await user.type(vision, to)
    await user.click(main().getByRole("button", { name: "Done" }))
  }

  /** The review, once the publish it follows has ended. */
  async function review() {
    const notice = await main().findByRole("alert")
    await vi.waitFor(() => {
      expect(notice).toHaveFocus()
    })
    return notice
  }

  it("writes nothing and shows each field a co-lead changed, theirs beside yours (S1)", async () => {
    const repository = coLeadRepository()
    const write = vi.spyOn(repository, "publishRoadmapChanges")
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)

    await publish(user)

    const notice = await review()
    expect(notice).toHaveTextContent("Someone else has changed text you edited")
    expect(notice).toHaveTextContent(
      /Nothing was published\.Choose which text to keep for each, then publish again\./,
    )
    const conflicts = within(notice)
      .getAllByRole("listitem")
      .map((each) => within(each))
    expect(
      conflicts.map(
        (each) => each.getByText(/: /, { selector: "p" }).textContent,
      ),
    ).toEqual(["About this roadmap: Vision", "First, mine: Title"])
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
      within(notice).getByRole("button", {
        name: "Keep mine First, mine: Title",
      }),
    ).toBeInTheDocument()
    expect(
      within(notice).getByRole("button", {
        name: "Use theirs About this roadmap: Vision",
      }),
    ).toBeInTheDocument()
    expect(
      within(notice).queryByRole("button", { name: "Dismiss message" }),
    ).toBeNull()
    expect(write).toHaveBeenCalledTimes(1)
    expect(main().getByText("2 unpublished changes")).toBeInTheDocument()
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "true")
  })

  it("keeps mine or uses theirs, field by field, moving focus on to the next and then to Publish (S2, S3)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editTitle(user, "First item", "First, mine")
    await editVision(user, "My vision.")
    changeBoth(repository)
    await publish(user)
    const notice = await review()

    await user.click(
      within(notice).getByRole("button", {
        name: "Keep mine About this roadmap: Vision",
      }),
    )
    expect(
      within(notice).getByRole("button", {
        name: "Keep mine First, mine: Title",
      }),
    ).toHaveFocus()
    await user.click(
      within(notice).getByRole("button", {
        name: "Use theirs First, mine: Title",
      }),
    )

    const action = main().getByRole("button", { name: "Publish changes" })
    expect(action).toHaveFocus()
    expect(action).toHaveAttribute("aria-disabled", "false")
    expect(main().queryByRole("alert")).toBeNull()
    expect(card("First, theirs").queryByText("Changed")).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(main().getByText("My vision.")).toBeInTheDocument()

    await publish(user)
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(main().getByText("My vision.")).toBeInTheDocument()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("stops again for a co-lead's change made after Keep mine (S3)", async () => {
    const repository = coLeadRepository()
    const { user } = await renderPage({ repository })
    await editVision(user, "My vision.")
    changeBoth(repository)
    await publish(user)
    await user.click(
      within(await review()).getByRole("button", {
        name: "Keep mine About this roadmap: Vision",
      }),
    )
    repository.coLead((list) => {
      const roadmap = list.find(({ id }) => id === "producta")
      if (roadmap) roadmap.vision = { en: "Their second vision.", cy: "" }
    })

    await publish(user)

    const notice = await review()
    expect(
      within(notice)
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
    expect(main().getByText("Their vision.")).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 3, name: "First, theirs" }),
    ).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 3, name: "Second, mine" }),
    ).toBeInTheDocument()
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

    const notice = await review()
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
    [
      "a Refresh",
      (user: User) =>
        user.click(main().getByRole("button", { name: "Refresh" })),
    ],
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
})
