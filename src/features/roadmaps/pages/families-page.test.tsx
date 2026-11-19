import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Family } from "@/domain/roadmap/family"
import type { FamilyOutcome } from "@/domain/roadmap/family-changes"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import {
  MEDICINES_AND_DIAGNOSTICS,
  SINGLE_RECORD,
  TEST_CATEGORIES,
  TEST_FAMILIES,
} from "@/domain/roadmap/testing/test-lists"
import { TEST_ORGANISATIONS } from "@/domain/roadmap/testing/test-organisations"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import {
  findReconnectDialog,
  reconnectFromDialog,
} from "@/features/auth/testing/reconnect-dialog"
import { AppError } from "@/lib/errors"
import { DESKTOP_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { holdCall } from "../testing/held-call"
import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { expectWriteHold, refreshHold } from "../testing/write-hold"

function member(id: string, title: string, published: boolean): Roadmap {
  return createTestRoadmap(id, title, {
    published,
    familyId: SINGLE_RECORD.id,
    family: SINGLE_RECORD.name,
    colour: SINGLE_RECORD.colour,
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
  organisations: readonly Organisation[] = TEST_ORGANISATIONS,
) {
  return {
    ...createInMemoryRoadmapRepository(
      roadmaps,
      {},
      {
        families: TEST_FAMILIES,
        categories: TEST_CATEGORIES,
        organisations,
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
  language: "en" | "cy" = "en",
) {
  const user = userEvent.setup()
  const { authClient } = await renderWithProviders({
    path: "/families",
    authState,
    repository,
    language,
  })
  return { user, authClient }
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
    ).toEqual(["GP & Community Services", "Tests, Scans & Results"])
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

  it("holds the app once a family added isn't read back, until a Refresh reads it (DEF-015 S1, S3)", async () => {
    const repository = repositoryWith()
    const { user } = await renderPage(repository)
    await user.click(
      await main().findByRole("button", { name: "Add a family" }),
    )
    const form = within(main().getByRole("form", { name: "Add a family" }))
    await user.type(form.getByLabelText("Name"), "Dental")
    await user.type(form.getByLabelText("Colour"), "#00796B")
    const reads = vi
      .spyOn(repository, "listFamilies")
      .mockRejectedValue(new AppError("network"))

    await user.click(form.getByRole("button", { name: "Add family" }))

    const hold = await expectWriteHold("The family was saved")
    reads.mockRestore()
    await refreshHold(user, hold)
    expect(main().getByRole("status")).toHaveTextContent("Dental added")
    expect(
      main().getByRole("heading", { level: 3, name: "Dental" }),
    ).toBeInTheDocument()
  })

  it("closes the form, holding the app, when the answer is lost (DEF-015 S2)", async () => {
    const addFamily = vi
      .fn<RoadmapRepository["addFamily"]>()
      .mockResolvedValue({ status: "unconfirmed" })
    const { user } = await renderPage(repositoryWith({ addFamily }))
    await user.click(
      await main().findByRole("button", { name: "Add a family" }),
    )
    const form = within(main().getByRole("form", { name: "Add a family" }))
    await user.type(form.getByLabelText("Name"), "Dental")
    await user.type(form.getByLabelText("Colour"), "#00796B")

    await user.click(form.getByRole("button", { name: "Add family" }))

    const hold = await expectWriteHold("The family may have been saved")
    await refreshHold(user, hold)
    expect(main().queryByRole("form", { name: "Add a family" })).toBeNull()
    expect(main().queryByRole("status")).toBeNull()
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

  it("asks to reconnect when a family is added after the session has expired, then adds it (STY-057)", async () => {
    const addFamily = vi.fn<RoadmapRepository["addFamily"]>()
    const repository = repositoryWith()
    addFamily.mockImplementation(repository.addFamily.bind(repository))
    const { user, authClient } = await renderPage({ ...repository, addFamily })
    await user.click(
      await main().findByRole("button", { name: "Add a family" }),
    )
    const form = within(main().getByRole("form", { name: "Add a family" }))
    await user.type(form.getByLabelText("Name"), "Dental")
    await user.type(form.getByLabelText("Colour"), "#00796B")
    act(() => {
      authClient.setState({ status: "expired" })
    })

    const add = form.getByRole("button", { name: "Add family" })
    expect(add).toHaveAttribute("aria-disabled", "false")
    await user.click(add)
    await findReconnectDialog()
    expect(addFamily).not.toHaveBeenCalled()
    await reconnectFromDialog(user)

    expect(await main().findByRole("status")).toHaveTextContent("Dental added")
    expect(addFamily).toHaveBeenCalledOnce()
  })

  it("asks to reconnect when a change is confirmed after the session has expired, then saves it (STY-057)", async () => {
    const { user, authClient } = await renderPage()
    const form = await openChange(user)
    await user.clear(form.getByLabelText("Name"))
    await user.type(form.getByLabelText("Name"), "Shared Care Record")
    await user.click(form.getByRole("button", { name: "Save changes" }))
    const confirm = await screen.findByRole("button", {
      name: "Change family",
    })
    act(() => {
      authClient.setState({ status: "expired" })
    })

    await user.click(confirm)
    await reconnectFromDialog(user)

    expect(await main().findByRole("status")).toHaveTextContent(
      "Shared Care Record changed.",
    )
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
            base: SINGLE_RECORD.colour,
            pending: "#00796b",
            current: "#ff0000",
          },
        ],
      },
      { status: "saved", family: { ...SINGLE_RECORD, colour: "#ff0000" } },
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
      family: { ...SINGLE_RECORD, colour: "#ff0000" },
      changes: { name: "Records" },
      members: ["producta", "productb"],
    })
  })

  it("asks again with the roadmaps a re-read found (S8)", async () => {
    const outcomes: FamilyOutcome[] = [
      { status: "members-changed", members: roadmaps.slice(0, 1) },
      { status: "saved", family: { ...SINGLE_RECORD, colour: "#00796b" } },
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
    const roadmapsReread = holdCall(base.listRoadmaps.bind(base))
    const repository = repositoryWith({
      changeFamily: () => {
        written = true
        return Promise.resolve({ status: "family-not-found" })
      },
      listFamilies: () => {
        if (!written) return Promise.resolve([...TEST_FAMILIES])
        familiesReread = true
        return Promise.resolve([SINGLE_RECORD])
      },
      listRoadmaps: (options) =>
        written ? roadmapsReread.held(options) : base.listRoadmaps(options),
    })
    const { user } = await renderPage(repository)

    await user.click(
      await main().findByRole("button", {
        name: "Change Medicines & Diagnostics",
      }),
    )
    const form = within(
      main().getByRole("form", { name: "Change Medicines & Diagnostics" }),
    )
    await user.clear(form.getByLabelText("Colour"))
    await user.type(form.getByLabelText("Colour"), "#00796b")
    await user.click(form.getByRole("button", { name: "Save changes" }))
    await waitFor(() => {
      expect(familiesReread).toBe(true)
      expect(roadmapsReread.held).toHaveBeenCalled()
    })
    expect(form.getByLabelText("Colour")).toHaveValue("#00796b")
    roadmapsReread.release()

    expect(await main().findByRole("alert")).toHaveTextContent(
      "This family is no longer listed, so your change wasn't saved.",
    )
    expect(
      main().queryByRole("button", { name: "Change Medicines & Diagnostics" }),
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
      await main().findByRole("button", {
        name: "Change Medicines & Diagnostics",
      }),
    )
    const form = within(
      main().getByRole("form", { name: "Change Medicines & Diagnostics" }),
    )
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
    await user.type(form.getByLabelText("Colour"), "ff")
    expect(form.getByLabelText("Colour")).toHaveValue("#00796b")
    write.resolve?.({ status: "saved", family: MEDICINES_AND_DIAGNOSTICS })
    expect(await main().findByRole("status")).toHaveTextContent(
      "Medicines & Diagnostics changed",
    )
    expect(main().getByRole("button", { name: "Add a family" })).toBeEnabled()
  })

  it("keeps an open form but offers no other when the family list goes (S7)", async () => {
    const base = repositoryWith()
    let listGone = false
    const { user } = await renderPage(
      repositoryWith({
        listFamilies: (options) =>
          listGone ? Promise.resolve(null) : base.listFamilies(options),
      }),
    )

    const form = await openChange(user)
    await user.clear(form.getByLabelText("Colour"))
    await user.type(form.getByLabelText("Colour"), "#00796b")
    listGone = true
    await user.click(main().getByRole("button", { name: "Refresh" }))

    expect(
      await main().findByText("Families can't be changed right now"),
    ).toBeInTheDocument()
    expect(form.getByLabelText("Colour")).toHaveValue("#00796b")
    expect(form.getByRole("button", { name: "Save changes" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    expect(
      main().getByRole("button", { name: "Change Medicines & Diagnostics" }),
    ).toBeDisabled()
    expect(main().getByRole("button", { name: "Add a family" })).toBeDisabled()
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

  it("asks to connect when nothing has loaded, with nothing to refresh", async () => {
    await renderPage(repositoryWith(), { status: "ready" })

    expect(
      await main().findByText(
        "Connect Google to view the families, categories and organisations.",
      ),
    ).toBeInTheDocument()
    expect(
      main().queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument()
  })

  it("is linked from the navigation, not from the roadmap list (STY-058 S2)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    await renderWithProviders({
      authState: connected,
      repository: repositoryWith(),
    })
    const user = userEvent.setup()
    const name = "Families, categories and organisations"

    expect(
      await main().findByRole("heading", { level: 1, name: "Your roadmaps" }),
    ).toBeInTheDocument()
    expect(main().queryByRole("link", { name })).not.toBeInTheDocument()

    await user.click(
      within(screen.getByRole("navigation")).getByRole("link", { name }),
    )

    expect(
      await main().findByRole("heading", { level: 1, name }),
    ).toBeInTheDocument()
  })

  it("starts with its title, with no back link (STY-058 S4)", async () => {
    await renderPage()

    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Families, categories and organisations",
      }),
    ).toBeInTheDocument()
    expect(
      main().queryByRole("link", { name: "Back to roadmaps" }),
    ).not.toBeInTheDocument()
  })
})

describe("FamiliesPage organisations (STY-033)", () => {
  async function organisationsSection({
    language,
    repository = repositoryWith(),
  }: { language?: "en" | "cy"; repository?: RoadmapRepository } = {}) {
    await renderPage(repository, connected, language)
    const heading = await main().findByRole("heading", {
      level: 2,
      name: language === "cy" ? "Sefydliadau" : "Organisations",
    })
    const section = heading.closest("section")
    if (section === null) throw new Error("No organisations section")
    return within(section)
  }

  it("lists each by full name and code, All Wales first, then by name, read-only (S2)", async () => {
    const section = await organisationsSection()

    expect(
      section.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "All Wales (National)",
      "Betsi Cadwaladr University Health Board (BCUHB)",
      "Cardiff and Vale University Health Board (CAVUHB)",
      "Health Education and Improvement Wales (HEIW)",
      "Hywel Dda University Health Board (HDUHB)",
      "Public Health Wales (PHW)",
      "Swansea Bay University Health Board (SBUHB)",
    ])
    expect(section.getByText(/can't be changed here/)).toBeInTheDocument()
    expect(section.queryByRole("button")).not.toBeInTheDocument()
    expect(section.queryByRole("textbox")).not.toBeInTheDocument()
    expect(section.queryByRole("checkbox")).not.toBeInTheDocument()
    const headings = main()
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(["Families", "Categories", "Organisations"])
  })

  it("draws the building icon before its heading, hidden from assistive technology, and no other heading an icon (STY-079 S8, S9)", async () => {
    await organisationsSection()

    const headings = main().getAllByRole("heading", { level: 2 })
    expect(
      headings.map((heading) => [
        heading.textContent,
        Array.from(heading.querySelectorAll("svg")).map((icon) => [
          icon.getAttribute("aria-hidden"),
          icon.classList.contains("lucide-building-complex"),
        ]),
      ]),
    ).toEqual([
      ["Families", []],
      ["Categories", []],
      ["Organisations", [["true", true]]],
    ])
  })

  it("shows the Welsh full names, sorted as Welsh (S3)", async () => {
    const section = await organisationsSection({ language: "cy" })

    expect(
      section.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "Cymru gyfan (National)",
      "Addysg a Gwella Iechyd Cymru (HEIW)",
      "Bwrdd Iechyd Prifysgol Bae Abertawe (SBUHB)",
      "Bwrdd Iechyd Prifysgol Betsi Cadwaladr (BCUHB)",
      "Bwrdd Iechyd Prifysgol Caerdydd a’r Fro (CAVUHB)",
      "Bwrdd Iechyd Prifysgol Hywel Dda (HDUHB)",
      "Iechyd Cyhoeddus Cymru (PHW)",
    ])
  })

  it("says none are listed when the list is empty (S4)", async () => {
    const section = await organisationsSection({
      repository: repositoryWith({}, {}, []),
    })
    expect(
      section.getByText("No organisations are listed."),
    ).toBeInTheDocument()
    expect(section.queryByRole("listitem")).not.toBeInTheDocument()
  })

  it("shows the page's loading state until the organisations are read (S5)", async () => {
    const base = repositoryWith()
    const read = holdCall(base.listOrganisations.bind(base))
    await renderPage(repositoryWith({ listOrganisations: read.held }))

    expect(await main().findByRole("status")).toHaveTextContent(
      "Loading families, categories and organisations…",
    )
    expect(
      main().queryByRole("heading", { level: 2, name: "Families" }),
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(read.held).toHaveBeenCalled()
    })
    read.release()
    expect(
      await main().findByRole("heading", { level: 2, name: "Organisations" }),
    ).toBeInTheDocument()
  })

  it("shows the page's failure state, and Refresh reads again (S5)", async () => {
    const base = repositoryWith()
    let failing = true
    const { user } = await renderPage(
      repositoryWith({
        listOrganisations: (options) =>
          failing
            ? Promise.reject(new AppError("network"))
            : base.listOrganisations(options),
      }),
    )

    expect(await main().findByRole("alert")).toHaveTextContent(
      "Couldn't load the families, categories and organisations",
    )
    failing = false
    await user.click(main().getByRole("button", { name: "Refresh" }))
    expect(
      await main().findByRole("heading", { level: 2, name: "Organisations" }),
    ).toBeInTheDocument()
  })
})
