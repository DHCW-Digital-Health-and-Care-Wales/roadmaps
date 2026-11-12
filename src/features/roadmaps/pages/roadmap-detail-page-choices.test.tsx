import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { renderWithProviders } from "@/test/render-with-providers"

import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const records: Family = {
  id: "fc29g5b9",
  name: { en: "Single Record", cy: "Cofnod Sengl" },
  colour: "#12a3c9",
}
const medicines: Family = {
  id: "vdkxj63m",
  name: { en: "Medicines & Diagnostics", cy: "Meddyginiaethau a Diagnosteg" },
  colour: "#006747",
}
const families = [records, medicines]

const categories: Category[] = [
  { id: "b2tqsxzm", name: { en: "Patient records", cy: "Cofnodion cleifion" } },
  { id: "khzpchkh", name: { en: "Clinical systems", cy: "Systemau clinigol" } },
]

const roadmaps: Roadmap[] = [
  createTestRoadmap("producta", "Product A roadmap", {
    familyId: records.id,
    family: records.name,
    colour: records.colour,
    categoryId: "khzpchkh",
    category: { en: "Clinical systems", cy: "Systemau clinigol" },
  }),
]

type Lists = { families?: Family[] | null; categories?: Category[] | null }

function repositoryWith(lists: Lists = {}) {
  return createInMemoryRoadmapRepository(
    roadmaps,
    { producta: [createTestRoadmapItem("First item")] },
    { families, categories, ...lists },
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

    const family = await form.findByRole("combobox", { name: "Family" })
    expect(family).toHaveValue(records.id)
    expect(optionsOf(family)).toEqual([
      "No family",
      "Single Record",
      "Medicines & Diagnostics",
    ])
    await user.selectOptions(family, medicines.id)
    await user.click(form.getByRole("button", { name: "Done" }))

    const line = main().getByText("Family: Medicines & Diagnostics")
    // The family line's swatch sits before its text.
    expect(line.parentElement?.previousElementSibling).toHaveStyle({
      backgroundColor: medicines.colour,
    })
    expect(main().getByText("1 unpublished change")).toBeInTheDocument()
    expect(write).not.toHaveBeenCalled()
  })

  it("offers the categories in the list's order after No category; nothing can be typed (S3)", async () => {
    const { user, form } = await renderPage(repositoryWith())

    const category = await form.findByRole("combobox", { name: "Category" })
    expect(optionsOf(category)).toEqual([
      "No category",
      "Patient records",
      "Clinical systems",
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
      await form.findByRole("combobox", { name: "Family" }),
      medicines.id,
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

  it("shows the family read-only, saying why, when there's no family list (S6)", async () => {
    const { form } = await renderPage(repositoryWith({ families: null }))

    await form.findByRole("combobox", { name: "Category" })
    expect(form.queryByRole("combobox", { name: "Family" })).toBeNull()
    expect(form.getByText("Single Record")).toBeInTheDocument()
    expect(
      form.getByText("The family can't be changed right now."),
    ).toBeInTheDocument()
  })

  it("shows a co-lead's move to another family by name (S5)", async () => {
    const repository = repositoryWith()
    const { user, form } = await renderPage(repository)
    await user.selectOptions(
      await form.findByRole("combobox", { name: "Family" }),
      "No family",
    )
    await user.click(form.getByRole("button", { name: "Done" }))
    repository.coLead((list) => {
      const roadmap = list.find(({ id }) => id === "producta")
      if (!roadmap) throw new Error("No Product A")
      Object.assign(roadmap, {
        familyId: medicines.id,
        family: medicines.name,
        colour: medicines.colour,
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
})
