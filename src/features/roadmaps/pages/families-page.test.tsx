import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import type { FamilyOutcome } from "@/domain/roadmap/family-changes"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { AppError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const records: Family = {
  id: "fc29g5b9",
  name: { en: "Single Record", cy: "Cofnod Sengl" },
  colour: "#12a3c9",
}
const screening: Family = {
  id: "vdkxj63m",
  name: { en: "Screening", cy: "" },
  colour: "#006747",
}
const families = [records, screening]

const categories: Category[] = [
  { id: "b2tqsxzm", name: { en: "Patient records", cy: "Cofnodion cleifion" } },
  { id: "khzpchkh", name: { en: "Clinical systems", cy: "Systemau clinigol" } },
]

function member(id: string, title: string, published: boolean): Roadmap {
  return createTestRoadmap(id, title, {
    published,
    familyId: records.id,
    family: records.name,
    colour: records.colour,
  })
}

const roadmaps: Roadmap[] = [
  member("producta", "Product A roadmap", true),
  member("productb", "Product B roadmap", false),
  createTestRoadmap("productc", "Product C roadmap"),
]

function repositoryWith(
  overrides: Partial<RoadmapRepository> = {},
  lists: { families?: Family[] | null } = {},
) {
  return {
    ...createInMemoryRoadmapRepository(
      roadmaps,
      {},
      {
        families,
        categories,
        ...lists,
      },
    ),
    ...overrides,
  }
}

function main() {
  return within(screen.getByRole("main"))
}

async function renderPage(
  repository: RoadmapRepository = repositoryWith(),
  authState: AuthState = connected,
) {
  const user = userEvent.setup()
  await renderWithProviders({ path: "/families", authState, repository })
  return { user }
}

async function openChange(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await main().findByRole("button", { name: "Change Single Record" }),
  )
  return within(main().getByRole("form", { name: "Change Single Record" }))
}

describe("FamiliesPage (STY-029)", () => {
  it("lists each family with its names and roadmaps, and the categories (S1)", async () => {
    await renderPage()

    const family = (
      await main().findByRole("heading", { level: 3, name: "Single Record" })
    ).closest("li")
    if (family === null) throw new Error("No family entry")
    const entry = within(family)
    expect(entry.getByText("Welsh: Cofnod Sengl")).toBeInTheDocument()
    expect(
      entry.getByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()
    expect(
      entry.getByRole("link", { name: "Product B roadmap" }),
    ).toBeInTheDocument()
    expect(entry.getAllByText("Not published")).toHaveLength(1)
    expect(main().getByText("No Welsh name")).toBeInTheDocument()
    expect(main().getByText("No roadmaps")).toBeInTheDocument()

    const list = main()
      .getByRole("heading", { level: 2, name: "Categories" })
      .closest("section")
    if (list === null) throw new Error("No categories section")
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Patient records", "Clinical systems"])
    expect(within(list).queryByRole("button")).not.toBeInTheDocument()
  })

  it("adds a family, and shows it without a reload (S2)", async () => {
    const { user } = await renderPage()

    await user.click(
      await main().findByRole("button", { name: "Add a family" }),
    )
    const form = within(main().getByRole("form", { name: "Add a family" }))
    await user.type(form.getByLabelText("Name"), "Dental")
    await user.type(form.getByLabelText("Colour"), "#00796B")
    await user.click(form.getByRole("button", { name: "Add family" }))

    expect(await main().findByRole("status")).toHaveTextContent("Dental added")
    expect(main().getByRole("status")).toHaveFocus()
    expect(
      await main().findByRole("heading", { level: 3, name: "Dental" }),
    ).toBeInTheDocument()
    expect(main().getByText("#00796b")).toBeInTheDocument()
  })

  it("says what is wrong with each field, and writes nothing (S6)", async () => {
    const addFamily = vi.fn<RoadmapRepository["addFamily"]>()
    const { user } = await renderPage(repositoryWith({ addFamily }))

    await user.click(
      await main().findByRole("button", { name: "Add a family" }),
    )
    const form = within(main().getByRole("form", { name: "Add a family" }))
    await user.type(form.getByLabelText("Colour"), "teal")
    await user.click(form.getByRole("button", { name: "Add family" }))

    const name = form.getByLabelText("Name")
    expect(name).toHaveAccessibleDescription("Error: Enter a name")
    expect(name).toHaveFocus()
    expect(form.getByLabelText("Colour")).toHaveAccessibleDescription(
      "A hex colour, like #00796b. Error: Enter a colour like #00796b",
    )

    await user.type(name, "  single-record ")
    await user.clear(form.getByLabelText("Colour"))
    await user.type(form.getByLabelText("Colour"), "#00796b")
    await user.click(form.getByRole("button", { name: "Add family" }))
    expect(name).toHaveAccessibleDescription(
      "Error: Another family has this name",
    )
    expect(addFamily).not.toHaveBeenCalled()
  })

  it("names each roadmap and marks the published ones before a change (S3, S9)", async () => {
    const changeFamily = vi.fn<RoadmapRepository["changeFamily"]>()
    const { user } = await renderPage(repositoryWith({ changeFamily }))

    const form = await openChange(user)
    await user.clear(form.getByLabelText("Name"))
    await user.type(form.getByLabelText("Name"), "Shared Care Record")
    await user.click(form.getByRole("button", { name: "Save changes" }))

    const dialog = await screen.findByRole("alertdialog", {
      name: "Change Single Record on its roadmaps?",
    })
    expect(dialog).toHaveTextContent("This changes all 2 roadmaps:")
    const items = within(dialog).getAllByRole("listitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "Product A roadmap Published",
      "Product B roadmap",
    ])
    expect(dialog).toHaveTextContent("after its next nightly update")
    expect(dialog).not.toHaveTextContent(/Welsh/)

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(changeFamily).not.toHaveBeenCalled()
  })

  it("renames a family and its roadmaps at once, keeping its Welsh name (S4, S9)", async () => {
    const { user } = await renderPage()

    const form = await openChange(user)
    await user.clear(form.getByLabelText("Name"))
    await user.type(form.getByLabelText("Name"), "Shared Care Record")
    await user.clear(form.getByLabelText("Colour"))
    await user.type(form.getByLabelText("Colour"), "#00796b")
    await user.click(form.getByRole("button", { name: "Save changes" }))
    await user.click(
      await screen.findByRole("button", { name: "Change family" }),
    )

    expect(await main().findByRole("status")).toHaveTextContent(
      "Shared Care Record changed. The public site shows it after its next nightly update.",
    )
    const entry = (
      await main().findByRole("heading", {
        level: 3,
        name: "Shared Care Record",
      })
    ).closest("li")
    if (entry === null) throw new Error("No family entry")
    expect(within(entry).getByText("Welsh: Cofnod Sengl")).toBeInTheDocument()
    expect(within(entry).getByText("#00796b")).toBeInTheDocument()
  })

  it("closes without writing when nothing changed", async () => {
    const changeFamily = vi.fn<RoadmapRepository["changeFamily"]>()
    const { user } = await renderPage(repositoryWith({ changeFamily }))

    const form = await openChange(user)
    await user.click(form.getByRole("button", { name: "Save changes" }))

    expect(
      main().getByRole("button", { name: "Change Single Record" }),
    ).toHaveFocus()
    expect(changeFamily).not.toHaveBeenCalled()
  })

  it("shows a co-lead's value beside the Product Lead's, and saves again after a choice (S5)", async () => {
    const outcomes: FamilyOutcome[] = [
      {
        status: "refused",
        conflicts: [
          {
            field: "colour",
            base: "#12a3c9",
            pending: "#00796b",
            current: "#ff0000",
          },
        ],
      },
      { status: "saved", family: { ...records, colour: "#ff0000" } },
    ]
    const changeFamily = vi.fn<RoadmapRepository["changeFamily"]>(() =>
      Promise.resolve(outcomes.shift() ?? { status: "family-not-found" }),
    )
    const { user } = await renderPage(repositoryWith({ changeFamily }))

    const form = await openChange(user)
    await user.clear(form.getByLabelText("Colour"))
    await user.type(form.getByLabelText("Colour"), "#00796b")
    await user.click(form.getByRole("button", { name: "Save changes" }))
    await user.click(
      await screen.findByRole("button", { name: "Change family" }),
    )

    const review = await main().findByRole("alert")
    expect(review).toHaveTextContent("Someone else has changed this family")
    await waitFor(() => {
      expect(review).toHaveFocus()
    })
    expect(within(review).getByText("#00796b")).toBeInTheDocument()
    expect(within(review).getByText("#ff0000")).toBeInTheDocument()
    await user.click(
      within(review).getByRole("button", { name: "Use theirs Colour" }),
    )
    expect(form.getByLabelText("Colour")).toHaveValue("#ff0000")

    await user.clear(form.getByLabelText("Name"))
    await user.type(form.getByLabelText("Name"), "Records")
    await user.click(form.getByRole("button", { name: "Save changes" }))
    await user.click(
      await screen.findByRole("button", { name: "Change family" }),
    )

    await main().findByRole("status")
    expect(changeFamily).toHaveBeenLastCalledWith({
      family: { ...records, colour: "#ff0000" },
      changes: { name: "Records" },
      members: ["producta", "productb"],
    })
  })

  it("asks again with the roadmaps a re-read found (S8)", async () => {
    const outcomes: FamilyOutcome[] = [
      { status: "members-changed", members: roadmaps.slice(0, 1) },
      { status: "saved", family: { ...records, colour: "#00796b" } },
    ]
    const changeFamily = vi.fn<RoadmapRepository["changeFamily"]>(() =>
      Promise.resolve(outcomes.shift() ?? { status: "family-not-found" }),
    )
    const { user } = await renderPage(repositoryWith({ changeFamily }))

    const form = await openChange(user)
    await user.clear(form.getByLabelText("Colour"))
    await user.type(form.getByLabelText("Colour"), "#00796b")
    await user.click(form.getByRole("button", { name: "Save changes" }))
    await user.click(
      await screen.findByRole("button", { name: "Change family" }),
    )

    const dialog = await screen.findByRole("alertdialog")
    await within(dialog).findByText(
      "The roadmaps in this family have changed. Check them again.",
    )
    expect(dialog).toHaveTextContent("This changes 1 roadmap:")
    await user.click(
      within(dialog).getByRole("button", { name: "Change family" }),
    )

    await main().findByRole("status")
    expect(changeFamily).toHaveBeenLastCalledWith(
      expect.objectContaining({ members: ["producta"] }),
    )
  })

  it("keeps what was typed when the write fails", async () => {
    const addFamily = vi.fn<RoadmapRepository["addFamily"]>(() =>
      Promise.reject(new AppError("forbidden")),
    )
    const { user } = await renderPage(repositoryWith({ addFamily }))

    await user.click(
      await main().findByRole("button", { name: "Add a family" }),
    )
    const form = within(main().getByRole("form", { name: "Add a family" }))
    await user.type(form.getByLabelText("Name"), "Dental")
    await user.type(form.getByLabelText("Colour"), "#00796b")
    await user.click(form.getByRole("button", { name: "Add family" }))

    expect(await main().findByRole("alert")).toHaveTextContent(
      "Couldn't add the family",
    )
    expect(form.getByLabelText("Name")).toHaveValue("Dental")
  })

  it("says the family is gone when a co-lead deleted it, though the list refreshes first", async () => {
    const base = repositoryWith()
    let written = false
    let familiesReread = false
    const roadmapsReread: { release?: () => void } = {}
    const repository = repositoryWith({
      changeFamily: () => {
        written = true
        return Promise.resolve({ status: "family-not-found" })
      },
      listFamilies: () => {
        if (!written) return Promise.resolve(families)
        familiesReread = true
        return Promise.resolve([records])
      },
      listRoadmaps: (options) =>
        written
          ? new Promise((resolve) => {
              roadmapsReread.release = () => {
                resolve(base.listRoadmaps(options))
              }
            })
          : base.listRoadmaps(options),
    })
    const { user } = await renderPage(repository)

    await user.click(
      await main().findByRole("button", { name: "Change Screening" }),
    )
    const form = within(main().getByRole("form", { name: "Change Screening" }))
    await user.clear(form.getByLabelText("Colour"))
    await user.type(form.getByLabelText("Colour"), "#00796b")
    await user.click(form.getByRole("button", { name: "Save changes" }))
    await waitFor(() => {
      expect(familiesReread && roadmapsReread.release !== undefined).toBe(true)
    })
    expect(form.getByLabelText("Colour")).toHaveValue("#00796b")
    roadmapsReread.release?.()

    expect(await main().findByRole("alert")).toHaveTextContent(
      "This family is no longer listed, so your change wasn't saved.",
    )
    expect(
      main().queryByRole("button", { name: "Change Screening" }),
    ).not.toBeInTheDocument()
  })

  it("offers no other form while a family write is under way", async () => {
    const write: { resolve?: (outcome: FamilyOutcome) => void } = {}
    const changeFamily = vi.fn<RoadmapRepository["changeFamily"]>(
      () =>
        new Promise((resolve) => {
          write.resolve = resolve
        }),
    )
    const { user } = await renderPage(repositoryWith({ changeFamily }))

    await user.click(
      await main().findByRole("button", { name: "Change Screening" }),
    )
    const form = within(main().getByRole("form", { name: "Change Screening" }))
    await user.clear(form.getByLabelText("Colour"))
    await user.type(form.getByLabelText("Colour"), "#00796b")
    await user.click(form.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(
        main().getByRole("button", { name: "Add a family" }),
      ).toBeDisabled()
    })
    expect(
      main().getByRole("button", { name: "Change Single Record" }),
    ).toBeDisabled()
    write.resolve?.({ status: "saved", family: screening })
    expect(await main().findByRole("status")).toHaveTextContent(
      "Screening changed",
    )
    expect(main().getByRole("button", { name: "Add a family" })).toBeEnabled()
  })

  it("offers nothing to change without a family list (S7)", async () => {
    await renderPage(repositoryWith({}, { families: null }))

    expect(
      await main().findByText("Families can't be changed right now"),
    ).toBeInTheDocument()
    expect(
      main().queryByRole("button", { name: /Add a family|Change/ }),
    ).not.toBeInTheDocument()
  })

  it("asks to connect when nothing has loaded", async () => {
    await renderPage(repositoryWith(), { status: "ready" })

    expect(
      await main().findByText(
        "Connect Google to view the families and categories.",
      ),
    ).toBeInTheDocument()
  })

  it("is linked from the roadmap list", async () => {
    const { user } = await renderWithProviders({
      authState: connected,
      repository: repositoryWith(),
    }).then(() => ({ user: userEvent.setup() }))

    await user.click(
      await main().findByRole("link", { name: "Families and categories" }),
    )

    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Families and categories",
      }),
    ).toBeInTheDocument()
  })
})
