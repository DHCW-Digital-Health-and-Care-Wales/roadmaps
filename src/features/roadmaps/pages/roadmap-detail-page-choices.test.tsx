import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import type { Roadmap } from "@/domain/roadmap/roadmap"
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
import { renderWithProviders } from "@/test/render-with-providers"

import { holdCall } from "../testing/held-call"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

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

function repositoryWith(lists: Lists = {}) {
  return createInMemoryRoadmapRepository(
    roadmaps,
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
  await user.click(
    main().getByRole("button", { name: "Edit About this roadmap" }),
  )
  const form = within(main().getByRole("form", { name: "About this roadmap" }))
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
    await user.click(form.getByRole("button", { name: "Done" }))

    const line = main().getByText("Family: Medicines & Diagnostics")
    // The family line's swatch sits before its text.
    expect(line.parentElement?.previousElementSibling).toHaveStyle({
      backgroundColor: MEDICINES_AND_DIAGNOSTICS.colour,
    })
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(write).not.toHaveBeenCalled()
  })

  it("reads the lists again on Refresh while About is open", async () => {
    const repository = repositoryWith()
    const { user, form } = await renderPage(repository)
    await select(form, "Family")
    const workforce: Family = {
      id: "x7k2m9qp",
      name: { en: "Workforce", cy: "Gweithlu" },
      colour: "#5f3d8a",
    }
    vi.spyOn(repository, "listFamilies").mockResolvedValue([
      ...TEST_FAMILIES,
      workforce,
    ])

    await user.click(main().getByRole("button", { name: "Refresh" }))

    await vi.waitFor(async () => {
      expect(optionsOf(await select(form, "Family"))).toContain("Workforce")
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
    await user.click(form.getByRole("button", { name: "Done" }))

    expect(main().queryByText(/^Category:/)).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
  })

  it("publishes the chosen family, and shows it as read again (S2)", async () => {
    const repository = repositoryWith()
    const { user, form } = await renderPage(repository)

    await user.selectOptions(
      await select(form, "Family"),
      MEDICINES_AND_DIAGNOSTICS.id,
    )
    await user.click(form.getByRole("button", { name: "Done" }))
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )

    await vi.waitFor(() => {
      expect(main().queryByText(/unpublished change/)).toBeNull()
    })
    expect(
      main().getByText("Family: Medicines & Diagnostics"),
    ).toBeInTheDocument()
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
    await user.click(form.getByRole("button", { name: "Done" }))
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

    const notice = await main().findByRole("alert")
    expect(
      within(notice)
        .getAllByRole("definition")
        .map((each) => each.textContent),
    ).toEqual(["No family", "Medicines & Diagnostics"])
  })

  it("shows their family and category after Use theirs, even if the roadmap couldn't be read again (S5)", async () => {
    const repository = repositoryWith()
    const { user, form } = await renderPage(repository)
    await user.selectOptions(await select(form, "Family"), "No family")
    await user.selectOptions(await select(form, "Category"), "No category")
    await user.click(form.getByRole("button", { name: "Done" }))
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
    const notice = main()
      .getAllByRole("alert")
      .find((each) => each.textContent.includes("Someone else"))
    if (!notice) throw new Error("No review")
    for (const name of ["Family", "Category"]) {
      await user.click(
        within(notice).getByRole("button", {
          name: `Use theirs About this roadmap: ${name}`,
        }),
      )
    }

    expect(
      main().getByText("Family: Medicines & Diagnostics"),
    ).toBeInTheDocument()
    expect(
      main().getByText("Category: Tests, Scans & Results"),
    ).toBeInTheDocument()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })
})
