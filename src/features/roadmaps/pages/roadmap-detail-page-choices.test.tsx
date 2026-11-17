import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { UNLISTED_FAMILY } from "@/domain/roadmap/roadmap-changes"
import {
  GP_AND_COMMUNITY_SERVICES,
  MEDICINES_AND_DIAGNOSTICS,
  SINGLE_RECORD,
  TEST_CATEGORIES,
  TEST_FAMILIES,
  TESTS_SCANS_AND_RESULTS,
} from "@/domain/roadmap/testing/test-lists"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { holdCall } from "../testing/held-call"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  confirmRoadmapEdit,
  openEditRoadmapDialog,
} from "../testing/roadmap-dialog"
import {
  aboutField,
  closeConflictReview,
  openAbout,
  openConflictReview,
  refreshRoadmap,
} from "../testing/roadmap-page"

const roadmaps: Roadmap[] = [
  createTestRoadmap("producta", "Product A roadmap", {
    familyId: SINGLE_RECORD.id,
    family: SINGLE_RECORD.name,
    colour: SINGLE_RECORD.colour,
    categoryId: GP_AND_COMMUNITY_SERVICES.id,
    category: GP_AND_COMMUNITY_SERVICES.name,
  }),
]

interface Lists {
  families?: Family[] | null
  categories?: Category[] | null
}

function repositoryWith(lists: Lists = {}, listed: Roadmap[] = roadmaps) {
  return createInMemoryRoadmapRepository(
    listed,
    { producta: [createTestRoadmapItem("First item")] },
    { families: TEST_FAMILIES, categories: TEST_CATEGORIES, ...lists },
  )
}

function main() {
  return within(screen.getByRole("main"))
}

async function renderPage(repository: InMemoryRoadmapRepository) {
  const user = userEvent.setup()
  await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
  })
  await main().findByRole("heading", { level: 3, name: "First item" })
  const form = await openEditRoadmapDialog(user)
  return { user, form }
}

type Form = Awaited<ReturnType<typeof renderPage>>["form"]

/** The select named `name`, once its list is read. */
async function select(form: Form, name: string) {
  const control = await form.findByRole("combobox", { name })
  await vi.waitFor(() => {
    expect(control).toBeEnabled()
  })
  return control
}

function optionsOf(select: HTMLElement) {
  return within(select)
    .getAllByRole("option")
    .map((option) => option.textContent)
}

describe("Choosing a roadmap's family and category (STY-028)", () => {
  it("offers the families and No family, and keeps a choice pending in its colour, writing nothing (S1)", async () => {
    const repository = repositoryWith()
    const write = vi.spyOn(repository, "publishRoadmapChanges")
    const { user, form } = await renderPage(repository)

    const family = await select(form, "Family")
    expect(family).toHaveValue(SINGLE_RECORD.id)
    expect(optionsOf(family)).toEqual([
      "No family",
      "Single Record",
      "Medicines & Diagnostics",
    ])
    await user.selectOptions(family, MEDICINES_AND_DIAGNOSTICS.id)
    await confirmRoadmapEdit(user)

    const shownFamily = aboutField(await openAbout(user), "Family")
    expect(shownFamily).toHaveTextContent("Medicines & Diagnostics")
    // The family's swatch sits before its name.
    expect(shownFamily?.firstElementChild).toHaveStyle({
      backgroundColor: MEDICINES_AND_DIAGNOSTICS.colour,
    })
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(write).not.toHaveBeenCalled()
  })

  it("opens on a family the list doesn't have, offered as not listed and left by Done (STY-043 S3)", async () => {
    const legacy = createTestRoadmap("producta", "Product A roadmap", {
      family: { en: "Legacy family", cy: "" },
      familyNotListed: true,
    })
    const { user, form } = await renderPage(repositoryWith({}, [legacy]))

    const family = await select(form, "Family")
    expect(family).toHaveValue(UNLISTED_FAMILY)
    expect(optionsOf(family)).toEqual([
      "No family",
      "Legacy family (not listed)",
      "Single Record",
      "Medicines & Diagnostics",
    ])
    await confirmRoadmapEdit(user)

    expect(aboutField(await openAbout(user), "Family")).toHaveTextContent(
      "Legacy family",
    )
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("keeps the not listed family the form opened on when a co-lead's listed family is read while it is open (DEF-005 S1)", async () => {
    const legacy = createTestRoadmap("producta", "Product A roadmap", {
      family: { en: "Legacy family", cy: "" },
      familyNotListed: true,
    })
    const repository = repositoryWith({}, [legacy])
    const user = userEvent.setup()
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository,
    })
    await main().findByRole("heading", { level: 3, name: "First item" })
    const { held, release, released } = holdCall(() =>
      Promise.resolve([
        createTestRoadmap("producta", "Product A roadmap", {
          familyId: SINGLE_RECORD.id,
          family: SINGLE_RECORD.name,
          colour: SINGLE_RECORD.colour,
        }),
      ]),
    )
    vi.spyOn(repository, "listRoadmaps").mockImplementation(held)

    // The dialog is modal, so About is opened, and the Refresh asked for, before it opens.
    const about = await openAbout(user)
    await refreshRoadmap(user)
    const form = await openEditRoadmapDialog(user)
    const family = await select(form, "Family")
    expect(family).toHaveValue(UNLISTED_FAMILY)
    await act(async () => {
      release()
      await released
    })
    await vi.waitFor(() => {
      expect(aboutField(about, "Family")).toHaveTextContent("Single Record")
    })

    expect(family).toHaveValue(UNLISTED_FAMILY)
    expect(optionsOf(family)).toContain("Legacy family (not listed)")
    await confirmRoadmapEdit(user)
    expect(aboutField(await openAbout(user), "Family")).toHaveTextContent(
      "Single Record",
    )
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("offers the lists a Refresh asked for, read again while the dialog is open", async () => {
    const repository = repositoryWith()
    // `renderPage` opens the dialog: once it has read the lists, it is closed again.
    const { user, form } = await renderPage(repository)
    await select(form, "Family")
    await user.click(form.getByRole("button", { name: "Cancel" }))
    await main().findByRole("button", { name: "More" })
    const workforce: Family = {
      id: "x7k2m9qp",
      name: { en: "Workforce", cy: "Gweithlu" },
      colour: "#5f3d8a",
    }
    const { held, release } = holdCall(() =>
      Promise.resolve([...TEST_FAMILIES, workforce]),
    )
    vi.spyOn(repository, "listFamilies").mockImplementation(held)

    // The dialog is modal, so a Refresh is asked for before it opens.
    await refreshRoadmap(user)
    const reopened = await openEditRoadmapDialog(user)
    const family = reopened.getByRole("combobox", { name: "Family" })
    expect(family).toBeEnabled()
    expect(optionsOf(family)).not.toContain("Workforce")
    release()

    await vi.waitFor(() => {
      expect(optionsOf(family)).toContain("Workforce")
    })
  })

  it("offers the categories in the list's order after No category; nothing can be typed (S3)", async () => {
    const { user, form } = await renderPage(repositoryWith())

    const category = await select(form, "Category")
    expect(optionsOf(category)).toEqual([
      "No category",
      "GP & Community Services",
      "Tests, Scans & Results",
    ])
    expect(form.queryByRole("textbox", { name: "Category" })).toBeNull()
    await user.selectOptions(category, "No category")
    await confirmRoadmapEdit(user)

    expect(aboutField(await openAbout(user), "Category")).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("publishes the chosen family, and shows it as read again (S2)", async () => {
    const repository = repositoryWith()
    const { user, form } = await renderPage(repository)

    await user.selectOptions(
      await select(form, "Family"),
      MEDICINES_AND_DIAGNOSTICS.id,
    )
    await confirmRoadmapEdit(user)
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )

    await vi.waitFor(() => {
      expect(main().queryByText(/unpublished change/)).toBeNull()
    })
    expect(aboutField(await openAbout(user), "Family")).toHaveTextContent(
      "Medicines & Diagnostics",
    )
  })

  it("holds the family at its value while the list is read", async () => {
    const repository = repositoryWith()
    const { held, release } = holdCall(repository.listFamilies.bind(repository))
    vi.spyOn(repository, "listFamilies").mockImplementation(held)
    const { form } = await renderPage(repository)

    const family = form.getByRole("combobox", { name: "Family" })
    expect(family).toBeDisabled()
    expect(optionsOf(family)).toEqual(["Single Record"])
    release()
    await vi.waitFor(() => {
      expect(family).toBeEnabled()
    })
  })

  it.each([
    {
      missing: "families",
      field: "Family",
      other: "Category",
      name: "Single Record",
      notice: "The family can't be changed right now.",
    },
    {
      missing: "categories",
      field: "Category",
      other: "Family",
      name: "GP & Community Services",
      notice: "The category can't be changed right now.",
    },
  ] as const)(
    "shows the $field read-only, saying why, when there's no $missing list (S6)",
    async ({ missing, field, other, name, notice }) => {
      const { form } = await renderPage(repositoryWith({ [missing]: null }))

      await select(form, other)
      expect(form.queryByRole("combobox", { name: field })).toBeNull()
      expect(form.getByText(name)).toBeInTheDocument()
      expect(form.getByText(notice)).toBeInTheDocument()
    },
  )

  it("shows a co-lead's move to another family by name (S5)", async () => {
    const repository = repositoryWith()
    const { user, form } = await renderPage(repository)
    await user.selectOptions(await select(form, "Family"), "No family")
    await confirmRoadmapEdit(user)
    repository.coLead((list) => {
      const roadmap = list.find(({ id }) => id === "producta")
      if (!roadmap) throw new Error("No Product A")
      Object.assign(roadmap, {
        familyId: MEDICINES_AND_DIAGNOSTICS.id,
        family: MEDICINES_AND_DIAGNOSTICS.name,
        colour: MEDICINES_AND_DIAGNOSTICS.colour,
      })
    })

    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )

    const review = await openConflictReview(user)
    expect(
      within(review)
        .getAllByRole("definition")
        .map((each) => each.textContent),
    ).toEqual(["No family", "Medicines & Diagnostics"])
  })

  it("shows their family and category after Use theirs, even if the roadmap couldn't be read again (S5)", async () => {
    const repository = repositoryWith()
    const { user, form } = await renderPage(repository)
    await user.selectOptions(await select(form, "Family"), "No family")
    await user.selectOptions(await select(form, "Category"), "No category")
    await confirmRoadmapEdit(user)
    repository.coLead((list) => {
      const roadmap = list.find(({ id }) => id === "producta")
      if (!roadmap) throw new Error("No Product A")
      Object.assign(roadmap, {
        familyId: MEDICINES_AND_DIAGNOSTICS.id,
        family: MEDICINES_AND_DIAGNOSTICS.name,
        colour: MEDICINES_AND_DIAGNOSTICS.colour,
        categoryId: TESTS_SCANS_AND_RESULTS.id,
        category: TESTS_SCANS_AND_RESULTS.name,
      })
    })
    vi.spyOn(repository, "listRoadmaps").mockRejectedValue(
      new AppError("forbidden"),
    )

    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )
    await main().findByText("Couldn't refresh your roadmaps")
    const review = await openConflictReview(user)
    for (const name of ["Family", "Category"]) {
      await user.click(
        within(review).getByRole("button", {
          name: `Use theirs About this roadmap: ${name}`,
        }),
      )
    }
    await closeConflictReview(user, review)

    const about = await openAbout(user)
    expect(aboutField(about, "Family")).toHaveTextContent(
      "Medicines & Diagnostics",
    )
    expect(aboutField(about, "Category")).toHaveTextContent(
      "Tests, Scans & Results",
    )
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })
})
