import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  confirmRoadmapEdit,
  editRoadmapDialog,
  editRoadmapText,
  openEditRoadmapDialog,
} from "../testing/roadmap-dialog"
import {
  chooseFromMore,
  openAbout,
  openConflictReview,
} from "../testing/roadmap-page"

const productA = createTestRoadmap("producta", "Product A roadmap", {
  statusLabel: { en: "Beta", cy: "" },
  lastUpdated: "2026-10-02",
})
const draft = createTestRoadmap("productc", "Product C roadmap", {
  published: false,
})
const items = {
  producta: [createTestRoadmapItem("First item", { id: "item-1" })],
  productc: [createTestRoadmapItem("Draft item", { id: "item-2" })],
}

type User = ReturnType<typeof userEvent.setup>

function main() {
  return within(screen.getByRole("main"))
}

function about() {
  return within(main().getByRole("region", { name: /^(About|Ynglŷn)/ }))
}

async function renderPage({
  roadmaps = [productA, draft],
  path = "/roadmaps/producta",
  language,
}: { roadmaps?: Roadmap[]; path?: string; language?: Language } = {}) {
  const user = userEvent.setup()
  const repository = createInMemoryRoadmapRepository(roadmaps, items)
  await renderWithProviders({
    path,
    authState: connected,
    repository,
    ...(language ? { language } : {}),
  })
  await main().findByRole("heading", { level: 3 })
  return { user, repository }
}

/** Opens the roadmap dialog and gives its date field. */
async function openDateField(user: User) {
  const form = await openEditRoadmapDialog(user)
  return form.getByLabelText("Last updated")
}

/** Presses the open dialog's button named `name`: a Done it refuses, or Today. */
function pressInDialog(user: User, name: string) {
  return user.click(editRoadmapDialog().getByRole("button", { name }))
}

/** Sets the date field as the browser's date input does once a date is picked. */
function pick(field: HTMLElement, date: string) {
  fireEvent.change(field, { target: { value: date } })
}

/** The date the data source now holds for the roadmap. */
async function writtenDate(repository: InMemoryRoadmapRepository, id: string) {
  const roadmaps = await repository.listRoadmaps()
  return roadmaps.find((roadmap) => roadmap.id === id)?.lastUpdated
}

describe("Setting when a roadmap was last updated (STY-036)", () => {
  beforeEach(() => {
    // Just after midnight on 13 November in Tokyo, still the 12th in UTC (D11).
    vi.stubEnv("TZ", "Asia/Tokyo")
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-11-12T15:30:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("shows the date in the About block as the list card does (S1)", async () => {
    const { user } = await renderPage()

    await openAbout(user)
    expect(about().getByText("Last updated")).toBeInTheDocument()
    expect(about().getByText("2 October 2026")).toBeInTheDocument()
  })

  it("shows that a roadmap has no date (S1)", async () => {
    const { user } = await renderPage({ path: "/roadmaps/productc" })

    await openAbout(user)
    expect(about().getByText("Last updated")).toBeInTheDocument()
    expect(about().getByText("No date")).toBeInTheDocument()
  })

  it("keeps a picked date pending, tagged and listed, writing nothing (S2)", async () => {
    const { user, repository } = await renderPage()
    const write = vi.spyOn(repository, "publishRoadmapChanges")

    const field = await openDateField(user)
    expect(field).toHaveAttribute("type", "date")
    expect(field).toHaveValue("2026-10-02")
    pick(field, "2026-11-10")
    expect(field).toHaveValue("2026-11-10")
    await confirmRoadmapEdit(user)

    await openAbout(user)
    expect(about().getByText("10 November 2026")).toBeInTheDocument()
    expect(about().getByText("Changed")).toBeInTheDocument()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    expect(
      within(screen.getByRole("alertdialog")).getByRole("listitem"),
    ).toHaveTextContent("About this roadmapLast updated")
    expect(write).not.toHaveBeenCalled()
  })

  it("fills today's date by the browser's clock with Today, and offers no later one (S3, S4)", async () => {
    const { user } = await renderPage()

    const field = await openDateField(user)
    expect(field).toHaveAttribute("max", "2026-11-13")
    await pressInDialog(user, "Today")

    expect(field).toHaveValue("2026-11-13")
  })

  it("takes the new day for Today and the limit when the form is left open past midnight", async () => {
    const { user } = await renderPage()
    const field = await openDateField(user)

    // 00:01 on 14 November in Tokyo.
    vi.setSystemTime(new Date("2026-11-13T15:01:00Z"))
    fireEvent.focus(field)
    expect(field).toHaveAttribute("max", "2026-11-14")
    pick(field, "2026-11-14")
    await confirmRoadmapEdit(user)
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()

    const reopened = await openDateField(user)
    await pressInDialog(user, "Today")
    expect(reopened).toHaveValue("2026-11-14")
  })

  it("refuses a date after today with a message, until it is fixed (S4)", async () => {
    const { user } = await renderPage()

    const field = await openDateField(user)
    pick(field, "2026-11-20")
    await pressInDialog(user, "Done")

    expect(field).toHaveAccessibleDescription(
      "Error: Enter today's date or an earlier one",
    )
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(field).toHaveFocus()
    // By its text: the page is out of reach of role queries behind the dialog.
    expect(screen.queryByText(/unpublished change/)).toBeNull()

    pick(field, "2026-11-13")
    await confirmRoadmapEdit(user)
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("leaves a date already after today, unchanged, to publish other fields", async () => {
    const { user } = await renderPage({
      roadmaps: [{ ...productA, lastUpdated: "2027-01-01" }, draft],
    })

    await editRoadmapText(user, "Status", "Live")

    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("refuses a date the browser can't read, such as one half typed, rather than clear it", async () => {
    const { user } = await renderPage()

    const field = await openDateField(user)
    pick(field, "")
    Object.defineProperty(field, "validity", {
      value: { badInput: true },
    })
    await pressInDialog(user, "Done")

    expect(field).toHaveAccessibleDescription(
      "Error: Enter a real date, or clear the field",
    )
    expect(editRoadmapDialog().getByLabelText("Last updated")).toBe(field)
    expect(screen.queryByText(/unpublished change/)).toBeNull()
  })

  it("clears the date, publishing an empty date (S5)", async () => {
    const { user, repository } = await renderPage()

    pick(await openDateField(user), "")
    await confirmRoadmapEdit(user)
    await openAbout(user)
    expect(about().getByText("No date")).toBeInTheDocument()
    await publish(user, "Publish changes")

    await vi.waitFor(async () => {
      expect(await writtenDate(repository, "producta")).toBeNull()
    })
  })

  describe("Mark as updated today (S6, S7)", () => {
    function editStatus(user: User, to = "Live") {
      return editRoadmapText(user, "Status", to)
    }

    function tickBox() {
      return within(screen.getByRole("alertdialog")).queryByRole("checkbox", {
        name: "Mark as updated today",
      })
    }

    it.each([
      ["Publish changes", "/roadmaps/producta", "producta"],
      ["Save changes", "/roadmaps/productc", "productc"],
    ])(
      "offers it on %s, unticked, writing today's date only when ticked",
      async (action, path, id) => {
        const { user, repository } = await renderPage({ path })
        const before = await writtenDate(repository, id)
        await editStatus(user)

        await user.click(main().getByRole("button", { name: action }))
        expect(tickBox()).not.toBeChecked()
        await user.click(
          within(screen.getByRole("alertdialog")).getByRole("button", {
            name: action,
          }),
        )
        await vi.waitFor(() => {
          expect(main().queryByText(/to save|unpublished/)).toBeNull()
        })
        expect(await writtenDate(repository, id)).toBe(before)

        await editStatus(user, "Retired")
        await user.click(main().getByRole("button", { name: action }))
        const box = tickBox()
        if (!box) throw new Error("No tick box")
        await user.click(box)
        await user.click(
          within(screen.getByRole("alertdialog")).getByRole("button", {
            name: action,
          }),
        )
        await vi.waitFor(async () => {
          expect(await writtenDate(repository, id)).toBe("2026-11-13")
        })
      },
    )

    it.each([
      ["with no unsaved edits", false, "Publish roadmap"],
      ["with unsaved edits", true, "Save and publish"],
    ])(
      "offers it on Publish roadmap %s, writing today's date with it (D10)",
      async (_case, edited, confirm) => {
        const { user, repository } = await renderPage({
          path: "/roadmaps/productc",
        })
        if (edited) await editStatus(user)

        await user.click(
          main().getByRole("button", { name: "Publish roadmap" }),
        )
        const box = tickBox()
        expect(box).not.toBeChecked()
        if (!box) throw new Error("No tick box")
        await user.click(box)
        await user.click(
          within(screen.getByRole("alertdialog")).getByRole("button", {
            name: confirm,
          }),
        )

        await vi.waitFor(async () => {
          const [, written] = await repository.listRoadmaps()
          expect(written).toMatchObject({
            published: true,
            lastUpdated: "2026-11-13",
          })
        })
      },
    )

    it("isn't offered on Unpublish roadmap", async () => {
      const { user } = await renderPage()

      await chooseFromMore(user, "Unpublish roadmap")

      await screen.findByRole("alertdialog")
      expect(tickBox()).toBeNull()
    })

    it("isn't offered while a date is pending, which is published instead (S7)", async () => {
      const { user, repository } = await renderPage()
      pick(await openDateField(user), "2026-11-10")
      await confirmRoadmapEdit(user)

      await user.click(main().getByRole("button", { name: "Publish changes" }))
      expect(tickBox()).toBeNull()
      await user.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: "Publish changes",
        }),
      )

      await vi.waitFor(async () => {
        expect(await writtenDate(repository, "producta")).toBe("2026-11-10")
      })
    })
  })

  it("shows a co-lead's date beside yours in the review, as dates (S9)", async () => {
    const { user, repository } = await renderPage()
    pick(await openDateField(user), "2026-11-10")
    await confirmRoadmapEdit(user)
    repository.coLead((list) => {
      const roadmap = list.find(({ id }) => id === "producta")
      if (roadmap) roadmap.lastUpdated = "2026-11-01"
    })

    await publish(user, "Publish changes")

    const review = await openConflictReview(user)
    expect(within(review).getByText(/: /, { selector: "p" })).toHaveTextContent(
      "About this roadmap: Last updated",
    )
    expect(
      within(review)
        .getAllByRole("definition")
        .map((each) => each.textContent),
    ).toEqual(["10 November 2026", "1 November 2026"])
    expect(
      within(review).getByRole("button", {
        name: "Keep mine About this roadmap: Last updated",
      }),
    ).toBeInTheDocument()
  })

  it("is in Welsh, the field, Today, the tick box and the messages (S10)", async () => {
    const { user } = await renderPage({
      path: "/roadmaps/productc",
      language: "cy",
    })

    await openAbout(user)
    expect(about().queryByText("Diweddarwyd ddiwethaf")).toBeInTheDocument()
    expect(about().queryByText("Dim dyddiad")).toBeInTheDocument()
    await user.click(
      main().getByRole("button", { name: "Cyhoeddi'r map trywydd" }),
    )
    expect(
      within(screen.getByRole("alertdialog")).getByRole("checkbox", {
        name: "Nodi ei fod wedi'i ddiweddaru heddiw",
      }),
    ).not.toBeChecked()
    await user.keyboard("{Escape}")

    const form = await openEditRoadmapDialog(user, "cy")
    const field = form.getByLabelText("Diweddarwyd ddiwethaf")
    pick(field, "2026-11-20")
    await user.click(form.getByRole("button", { name: "Gorffen" }))
    expect(field).toHaveAccessibleDescription(
      "Gwall: Rhowch ddyddiad heddiw neu un cynharach",
    )
    await user.click(form.getByRole("button", { name: "Heddiw" }))
    expect(field).toHaveValue("2026-11-13")
  })
})

/** Opens the publish dialog and confirms it. */
async function publish(user: User, action: string) {
  await user.click(main().getByRole("button", { name: action }))
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: action,
    }),
  )
}
