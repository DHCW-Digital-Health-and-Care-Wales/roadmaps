import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { renderWithProviders } from "@/test/render-with-providers"

import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  confirmItemEdit,
  editItemDialog,
  openEditItemDialog,
} from "../testing/item-dialog"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

const items: RoadmapItem[] = [
  createTestRoadmapItem("Online booking", {
    id: "item-1",
    organisationIds: ["cavuhb"],
  }),
  createTestRoadmapItem("Typo", {
    id: "item-2",
    organisationIds: ["cavuhb"],
    unknownOrganisationCodes: ["CAVHB"],
  }),
  createTestRoadmapItem("Video clinics", {
    id: "item-3",
    organisationIds: ["sbuhb", "cavuhb"],
  }),
  createTestRoadmapItem("New idea", { id: "item-4" }),
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

/** The item's organisations as its card shows them, or `null` for none. */
function organisationsOf(title: string) {
  return (
    within(card(title)).queryByText("Organisations", { selector: "dt" })
      ?.nextElementSibling?.textContent ?? null
  )
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
  await main().findByRole("heading", { level: 3, name: "Typo" })
  return { user, repository }
}

/** Opens the item dialog and its Organisations field, and returns the field's group. */
async function openOrganisations(user: User, title: string) {
  const form = await openEditItemDialog(user, title)
  await user.click(
    form.getByRole("button", { name: /^(Change|Add) organisations$/ }),
  )
  return within(form.getByRole("group", { name: "Organisations" }))
}

/** Ticks or unticks each named checkbox in the item dialog, then confirms it. */
async function choose(user: User, title: string, toggle: readonly string[]) {
  const group = await openOrganisations(user, title)
  for (const name of toggle) {
    await user.click(group.getByRole("checkbox", { name }))
  }
  await confirmItemEdit(user)
}

async function publish(user: User) {
  await user.click(main().getByRole("button", { name: "Publish changes" }))
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Publish changes",
    }),
  )
}

describe("Choosing an item's organisations (STY-034)", () => {
  it("offers a checkbox per organisation, short name and code, All Wales first, the item's ticked (S1)", async () => {
    const { user } = await renderPage()

    const group = await openOrganisations(user, "Online booking")

    const names = [
      "All Wales (National)",
      "Betsi Cadwaladr (BCUHB)",
      "Cardiff and Vale (CAVUHB)",
      "Health Education and Improvement Wales (HEIW)",
      "Hywel Dda (HDUHB)",
      "Public Health Wales (PHW)",
      "Swansea Bay (SBUHB)",
    ]
    const boxes = group.getAllByRole("checkbox")
    expect(boxes).toHaveLength(names.length)
    boxes.forEach((box, index) => {
      expect(box).toHaveAccessibleName(names[index])
    })
    const ticked = group.getAllByRole("checkbox", { checked: true })
    expect(ticked).toHaveLength(1)
    expect(ticked[0]).toHaveAccessibleName("Cardiff and Vale (CAVUHB)")
  })

  it("labels the group in Welsh, the short names staying English (S1)", async () => {
    const { user } = await renderPage({ language: "cy" })

    const form = await openEditItemDialog(user, "Typo", "cy")
    await user.click(form.getByRole("button", { name: "Newid sefydliadau" }))
    const group = within(form.getByRole("group", { name: "Sefydliadau" }))
    expect(
      group.getByRole("checkbox", { name: "Cardiff and Vale (CAVUHB)" }),
    ).toBeChecked()
  })

  it("keeps a choice pending, shown on the card and listed in the publish dialog (S2)", async () => {
    const { user, repository } = await renderPage()
    const write = vi.spyOn(repository, "publishRoadmapChanges")

    await choose(user, "Online booking", ["Swansea Bay (SBUHB)"])

    expect(organisationsOf("Online booking")).toBe(
      "Cardiff and Vale, Swansea Bay",
    )
    expect(within(card("Online booking")).getByText("Changed")).toBeVisible()
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    expect(
      within(screen.getByRole("alertdialog")).getByRole("listitem"),
    ).toHaveTextContent(/^Online booking\s*Organisations$/)
    expect(write).not.toHaveBeenCalled()
  })

  it("accepts All Wales beside another, and none, no tick clearing another (S3)", async () => {
    const { user } = await renderPage()

    await choose(user, "Online booking", [
      "All Wales (National)",
      "Hywel Dda (HDUHB)",
    ])
    expect(organisationsOf("Online booking")).toBe(
      "All Wales, Cardiff and Vale, Hywel Dda",
    )

    await choose(user, "Online booking", [
      "All Wales (National)",
      "Cardiff and Vale (CAVUHB)",
      "Hywel Dda (HDUHB)",
    ])
    expect(organisationsOf("Online booking")).toBeNull()
    expect(within(card("Online booking")).getByText("Changed")).toBeVisible()
  })

  it("names an unknown code in the form, saying a change removes it (S4)", async () => {
    const { user } = await renderPage()

    await openOrganisations(user, "Typo")

    // The notice sits above the group, where it shows while the field is shut (STY-038).
    const form = editItemDialog()
    expect(
      form.getByRole("group", { name: "Organisations" }),
    ).toHaveAccessibleDescription(
      "CAVHB isn't recognised. Changing the organisations will remove it.",
    )
    expect(
      form.getByText(
        "CAVHB isn't recognised. Changing the organisations will remove it.",
      ),
    ).toBeVisible()
  })

  it("names every unknown code, as a list (S4)", async () => {
    const { user } = await renderPage({
      repository: createInMemoryRoadmapRepository(roadmaps, {
        producta: [
          createTestRoadmapItem("Typo", {
            unknownOrganisationCodes: ["CAVHB", "Mars", "SBHB"],
          }),
        ],
      }),
    })

    await openOrganisations(user, "Typo")

    expect(
      editItemDialog().getByText(
        "CAVHB, Mars, SBHB aren't recognised. Changing the organisations will remove them.",
      ),
    ).toBeVisible()
  })

  it("says nothing of unknown codes for an item with none (S4)", async () => {
    const { user } = await renderPage()

    await openOrganisations(user, "Online booking")

    expect(editItemDialog().queryByText(/isn't recognised/)).toBeNull()
  })

  it("publishes the chosen set, dropping an unknown code, and leaves it on other edits (S4, S5)", async () => {
    const { user, repository } = await renderPage()

    await choose(user, "Typo", [
      "All Wales (National)",
      "Cardiff and Vale (CAVUHB)",
      "Swansea Bay (SBUHB)",
    ])
    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    const [booking, typo] = await repository.listRoadmapItems("producta")
    expect(typo?.organisationIds).toEqual(["national", "sbuhb"])
    expect(typo?.unknownOrganisationCodes).toEqual([])
    expect(booking?.organisationIds).toEqual(["cavuhb"])
    expect(organisationsOf("Typo")).toBe("All Wales, Swansea Bay")
    expect(within(card("Typo")).queryByText("Changed")).toBeNull()
  })

  it("shows a co-lead's other set by short names beside yours, to keep or use (S7)", async () => {
    const { user, repository } = await renderPage()
    await choose(user, "Online booking", ["Swansea Bay (SBUHB)"])
    repository.coLead((_list, itemsOf) => {
      const booking = itemsOf("producta")[0]
      if (booking) booking.organisationIds = ["hduhb"]
    })

    await publish(user)

    const review = await main().findByRole("alert")
    const conflict = within(within(review).getByRole("listitem"))
    expect(conflict.getByText(/: /, { selector: "p" })).toHaveTextContent(
      "Online booking: Organisations",
    )
    expect(
      conflict.getAllByRole("definition").map(({ textContent }) => textContent),
    ).toEqual(["Cardiff and Vale, Swansea Bay", "Hywel Dda"])
    await user.click(
      conflict.getByRole("button", {
        name: "Use theirs Online booking: Organisations",
      }),
    )
    expect(organisationsOf("Online booking")).toBe("Hywel Dda")
  })

  it("drops a pending choice that Refresh finds a co-lead already made (S8)", async () => {
    const { user, repository } = await renderPage()
    await choose(user, "Online booking", ["Swansea Bay (SBUHB)"])
    repository.coLead((_list, itemsOf) => {
      const booking = itemsOf("producta")[0]
      if (booking) booking.organisationIds = ["sbuhb", "cavuhb"]
    })

    await user.click(main().getByRole("button", { name: "Refresh" }))

    await vi.waitFor(() => {
      expect(within(card("Online booking")).queryByText("Changed")).toBeNull()
    })
    expect(organisationsOf("Online booking")).toBe(
      "Cardiff and Vale, Swansea Bay",
    )
  })
})

describe("The Organisations field opens on request (STY-038)", () => {
  const NOTICE =
    "CAVHB isn't recognised. Changing the organisations will remove it."

  /** Whether anything on the page, behind the dialog, is pending. */
  function pending() {
    return (
      screen.queryByText("Changed") !== null ||
      screen.queryByRole("button", {
        name: "Publish changes",
        hidden: true,
      }) !== null
    )
  }

  it("starts shut, naming the chosen by short name beside Change organisations, with no checkboxes (S1)", async () => {
    const { user } = await renderPage()

    const form = await openEditItemDialog(user, "Video clinics")

    expect(form.getByText("Organisations")).toBeVisible()
    expect(form.getByText("Cardiff and Vale, Swansea Bay")).toBeVisible()
    expect(
      form.getByRole("button", { name: "Change organisations" }),
    ).toHaveAttribute("aria-expanded", "false")
    expect(form.queryAllByRole("checkbox")).toEqual([])
    expect(form.queryByRole("group")).toBeNull()
  })

  it("names All Wales first, then the others alphabetically (S1)", async () => {
    const { user } = await renderPage({
      repository: createInMemoryRoadmapRepository(roadmaps, {
        producta: [
          createTestRoadmapItem("Typo", {
            organisationIds: ["sbuhb", "national", "bcuhb"],
          }),
        ],
      }),
    })

    const form = await openEditItemDialog(user, "Typo")

    expect(
      form.getByText("All Wales, Betsi Cadwaladr, Swansea Bay"),
    ).toBeVisible()
  })

  it("reads No organisations beside Add organisations for an item with none (S1)", async () => {
    const { user } = await renderPage()

    const form = await openEditItemDialog(user, "New idea")

    expect(form.getByText("No organisations")).toBeVisible()
    expect(
      form.getByRole("button", { name: "Add organisations" }),
    ).toHaveAttribute("aria-expanded", "false")
    expect(form.queryAllByRole("checkbox")).toEqual([])
  })

  it("opens the checkboxes in place, the item's ticked, focus on the first (S2)", async () => {
    const { user } = await renderPage()
    const form = await openEditItemDialog(user, "Video clinics")

    await user.click(form.getByRole("button", { name: "Change organisations" }))

    const group = within(form.getByRole("group", { name: "Organisations" }))
    const boxes = group.getAllByRole("checkbox")
    expect(boxes).toHaveLength(7)
    expect(boxes[0]).toHaveAccessibleName("All Wales (National)")
    expect(boxes[0]).toHaveFocus()
    expect(
      group
        .getAllByRole("checkbox", { checked: true })
        .map((box) => box.closest("label")?.textContent),
    ).toEqual(["Cardiff and Vale (CAVUHB)", "Swansea Bay (SBUHB)"])
    expect(
      form.getByRole("button", { name: "Close organisations" }),
    ).toHaveAttribute("aria-expanded", "true")
    // The label shows once, and the line of what is chosen gives way to the checkboxes.
    expect(form.getAllByText("Organisations")).toHaveLength(1)
    expect(form.queryByText("Cardiff and Vale, Swansea Bay")).toBeNull()
  })

  it("shuts keeping the ticks, focus on the button, nothing pending yet (S3)", async () => {
    const { user } = await renderPage()
    const group = await openOrganisations(user, "Video clinics")
    await user.click(group.getByRole("checkbox", { name: "Hywel Dda (HDUHB)" }))
    const form = editItemDialog()

    await user.click(form.getByRole("button", { name: "Close organisations" }))

    expect(
      form.getByText("Cardiff and Vale, Hywel Dda, Swansea Bay"),
    ).toBeVisible()
    const button = form.getByRole("button", { name: "Change organisations" })
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute("aria-expanded", "false")
    await vi.waitFor(() => {
      expect(form.queryAllByRole("checkbox")).toEqual([])
    })
    expect(pending()).toBe(false)
  })

  it("moves focus to the button on shutting, where pressing a button does not focus it (S3)", async () => {
    const { user } = await renderPage()
    const group = await openOrganisations(user, "Video clinics")
    expect(
      group.getByRole("checkbox", { name: "All Wales (National)" }),
    ).toHaveFocus()
    const form = editItemDialog()

    // A click that leaves focus where it was, as Safari's does on a button.
    fireEvent.click(form.getByRole("button", { name: "Close organisations" }))

    const button = form.getByRole("button", { name: "Change organisations" })
    expect(button).toHaveFocus()
    await vi.waitFor(() => {
      expect(form.queryAllByRole("checkbox")).toEqual([])
    })
    expect(button).toHaveFocus()
  })

  it("shows the ticks again when the field is opened a second time (S3)", async () => {
    const { user } = await renderPage()
    const group = await openOrganisations(user, "Video clinics")
    await user.click(group.getByRole("checkbox", { name: "Hywel Dda (HDUHB)" }))
    const form = editItemDialog()
    await user.click(form.getByRole("button", { name: "Close organisations" }))

    await user.click(form.getByRole("button", { name: "Change organisations" }))

    expect(
      form
        .getAllByRole("checkbox", { checked: true })
        .map((box) => box.closest("label")?.textContent),
    ).toEqual([
      "Cardiff and Vale (CAVUHB)",
      "Hywel Dda (HDUHB)",
      "Swansea Bay (SBUHB)",
    ])
  })

  it.each(["open", "shut"] as const)(
    "keeps the choice on Done with the field %s (S4)",
    async (state) => {
      const { user } = await renderPage()
      const group = await openOrganisations(user, "Video clinics")
      await user.click(
        group.getByRole("checkbox", { name: "Hywel Dda (HDUHB)" }),
      )
      const form = editItemDialog()
      if (state === "shut") {
        await user.click(
          form.getByRole("button", { name: "Close organisations" }),
        )
      }

      await confirmItemEdit(user)

      expect(organisationsOf("Video clinics")).toBe(
        "Cardiff and Vale, Hywel Dda, Swansea Bay",
      )
      expect(within(card("Video clinics")).getByText("Changed")).toBeVisible()
    },
  )

  it("adds the first organisation of an item with none (S1, S4)", async () => {
    const { user } = await renderPage()
    const form = await openEditItemDialog(user, "New idea")
    await user.click(form.getByRole("button", { name: "Add organisations" }))
    await user.click(
      form.getByRole("checkbox", { name: "All Wales (National)" }),
    )

    await user.click(form.getByRole("button", { name: "Close organisations" }))

    expect(form.getByText("All Wales")).toBeVisible()
    expect(
      form.getByRole("button", { name: "Change organisations" }),
    ).toHaveFocus()
    expect(form.queryByText("No organisations")).toBeNull()
  })

  it("names an unknown code while the field is shut, and open too (S5)", async () => {
    const { user } = await renderPage()

    const form = await openEditItemDialog(user, "Typo")

    expect(form.getByText(NOTICE)).toBeVisible()
    expect(form.queryAllByRole("checkbox")).toEqual([])
    const button = form.getByRole("button", { name: "Change organisations" })
    expect(button).toHaveAccessibleDescription(NOTICE)

    await user.click(button)

    expect(form.getByText(NOTICE)).toBeVisible()
    expect(
      form.getByRole("group", { name: "Organisations" }),
    ).toHaveAccessibleDescription(NOTICE)
  })

  it("leaves the choice on Cancel, and opens shut again (S6)", async () => {
    const { user } = await renderPage()
    const group = await openOrganisations(user, "Video clinics")
    await user.click(group.getByRole("checkbox", { name: "Hywel Dda (HDUHB)" }))
    await user.click(editItemDialog().getByRole("button", { name: "Cancel" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(organisationsOf("Video clinics")).toBe(
      "Cardiff and Vale, Swansea Bay",
    )
    expect(pending()).toBe(false)

    const form = await openEditItemDialog(user, "Video clinics")

    expect(form.getByText("Cardiff and Vale, Swansea Bay")).toBeVisible()
    expect(form.queryAllByRole("checkbox")).toEqual([])
    await user.click(form.getByRole("button", { name: "Change organisations" }))
    expect(
      form.getByRole("checkbox", { name: "Hywel Dda (HDUHB)" }),
    ).not.toBeChecked()
  })

  it("opens shut again after Done, too (S6)", async () => {
    const { user } = await renderPage()
    await choose(user, "Video clinics", ["Hywel Dda (HDUHB)"])

    const form = await openEditItemDialog(user, "Video clinics")

    expect(
      form.getByText("Cardiff and Vale, Hywel Dda, Swansea Bay"),
    ).toBeVisible()
    expect(form.queryAllByRole("checkbox")).toEqual([])
  })

  it("opens, ticks and shuts by keyboard alone (S7)", async () => {
    const { user } = await renderPage()
    const form = await openEditItemDialog(user, "Video clinics")
    const button = () =>
      form.getByRole("button", { name: /^(Change|Close) organisations$/ })

    button().focus()
    await user.keyboard("{Enter}")
    expect(
      form.getByRole("checkbox", { name: "All Wales (National)" }),
    ).toHaveFocus()
    await user.keyboard(" ")
    expect(
      form.getByRole("checkbox", { name: "All Wales (National)" }),
    ).toBeChecked()
    await user.tab({ shift: true })
    expect(button()).toHaveFocus()
    expect(button()).toHaveAccessibleName("Close organisations")
    await user.keyboard("{Enter}")

    expect(button()).toHaveFocus()
    expect(button()).toHaveAccessibleName("Change organisations")
    expect(
      form.getByText("All Wales, Cardiff and Vale, Swansea Bay"),
    ).toBeVisible()
    // The form is still open: neither key confirmed or cancelled it.
    expect(form.getByRole("button", { name: "Done" })).toBeVisible()
  })

  it("is Welsh on the Welsh interface, the short names staying English (S7)", async () => {
    const { user } = await renderPage({ language: "cy" })

    const form = await openEditItemDialog(user, "Video clinics", "cy")
    expect(form.getByText("Sefydliadau")).toBeVisible()
    expect(form.getByText("Cardiff and Vale, Swansea Bay")).toBeVisible()
    await user.click(form.getByRole("button", { name: "Newid sefydliadau" }))
    expect(form.getByRole("group", { name: "Sefydliadau" })).toBeVisible()
    await user.click(form.getByRole("button", { name: "Cau sefydliadau" }))
    await user.click(form.getByRole("button", { name: "Canslo" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    const empty = await openEditItemDialog(user, "New idea", "cy")
    expect(empty.getByText("Dim sefydliadau")).toBeVisible()
    expect(
      empty.getByRole("button", { name: "Ychwanegu sefydliadau" }),
    ).toBeVisible()
  })
})
