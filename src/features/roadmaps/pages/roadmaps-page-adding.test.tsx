import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import {
  GP_AND_COMMUNITY_SERVICES,
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
  type InMemoryRoadmapRepositoryOptions,
} from "../testing/in-memory-roadmap-repository"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const roadmaps: Roadmap[] = [
  createTestRoadmap("outpatient-booking", "Outpatient Booking roadmap", {
    itemsLocation: "Outpatient Booking",
  }),
  createTestRoadmap("patient-summary", "Patient Summary roadmap", {
    itemsLocation: "Patient Summary",
    published: false,
    familyId: SINGLE_RECORD.id,
    family: SINGLE_RECORD.name,
    colour: SINGLE_RECORD.colour,
  }),
]

function repositoryWith(
  options: InMemoryRoadmapRepositoryOptions = {},
  listed: readonly Roadmap[] = roadmaps,
) {
  return createInMemoryRoadmapRepository(
    listed,
    {},
    { families: TEST_FAMILIES, categories: TEST_CATEGORIES, ...options },
  )
}

function main() {
  return within(screen.getByRole("main"))
}

function dialog(name = "Add a roadmap") {
  return within(screen.getByRole("dialog", { name }))
}

async function renderList(
  repository: RoadmapRepository = repositoryWith(),
  language: "en" | "cy" = "en",
) {
  const user = userEvent.setup()
  const rendered = await renderWithProviders({
    authState: connected,
    repository,
    language,
  })
  return { user, ...rendered }
}

/** Opens the dialog from the list's button, once the list has loaded. */
async function openDialog(user: UserEvent) {
  await main().findAllByRole("list")
  await user.click(main().getByRole("button", { name: "Add a roadmap" }))
  return dialog()
}

/**
 * The new roadmap's page, once the dialog has gone and the page behind it can be
 * reached again.
 */
async function findRoadmapPage(name = "Community Nursing roadmap") {
  await screen.findByRole("heading", { level: 1, name })
  return main()
}

/**
 * Chooses `option` in the dialog's `field`, once its list is read. By the option
 * itself: user-event matches text as HTML, where an `&` is written `&amp;`.
 */
async function choose(user: UserEvent, field: string, option: string) {
  const select = dialog().getByRole("combobox", { name: field })
  await user.selectOptions(
    select,
    await within(select).findByRole("option", { name: option }),
  )
}

/** Fills the dialog in as the story's Sam does. */
async function fillIn(user: UserEvent) {
  const form = dialog()
  await user.type(
    form.getByRole("textbox", { name: "Title" }),
    "Community Nursing roadmap",
  )
  await choose(user, "Category", "GP & Community Services")
  await user.type(
    form.getByRole("textbox", { name: "Product lead" }),
    "Sam Evans",
  )
}

function submit(user: UserEvent) {
  return user.click(dialog().getByRole("button", { name: "Add roadmap" }))
}

/** A co-lead removes Patient Summary from the list, which this tab then reads again. */
async function removePatientSummary(
  user: UserEvent,
  repository: InMemoryRoadmapRepository,
) {
  repository.coLead((rows) => {
    rows.splice(
      rows.findIndex(({ id }) => id === "patient-summary"),
      1,
    )
  })
  await user.click(await main().findByRole("button", { name: "Refresh" }))
}

describe("adding a roadmap from the list (STY-041)", () => {
  describe("the action (S1)", () => {
    it("sits with Refresh once the list has loaded", async () => {
      await renderList()
      await main().findAllByRole("list")

      expect(
        main().getByRole("button", { name: "Add a roadmap" }),
      ).toBeEnabled()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("is offered by the empty list too, and either button opens the dialog", async () => {
      const { user } = await renderList(repositoryWith({}, []))
      await main().findByRole("heading", { name: "No roadmaps yet" })

      // The one beside Refresh, then the panel's own.
      const [, inPanel, ...others] = main().getAllByRole("button", {
        name: "Add a roadmap",
      })
      if (!inPanel) throw new Error("The empty list offers no button")
      expect(others).toEqual([])
      await user.click(inPanel)

      expect(dialog().getByRole("textbox", { name: "Title" })).toHaveFocus()
    })

    it("is unavailable, though focusable, while the session has expired", async () => {
      const { user, authClient } = await renderList()
      await main().findAllByRole("list")
      act(() => {
        authClient.setState({ status: "expired" })
      })

      const button = main().getByRole("button", { name: "Add a roadmap" })
      expect(button).toHaveAttribute("aria-disabled", "true")
      button.focus()
      expect(button).toHaveFocus()
      await user.click(button)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("asks a title and a short name, and offers a family, a category and a product lead (S2)", async () => {
    const { user } = await renderList()

    const form = await openDialog(user)

    const title = form.getByRole("textbox", { name: "Title" })
    expect(title).toHaveFocus()
    expect(title).toBeRequired()
    expect(title).toHaveAccessibleDescription("The name the public site shows.")
    expect(form.getByRole("textbox", { name: "Short name" })).toBeRequired()
    const family = form.getByRole("combobox", { name: "Family" })
    expect(family).toHaveDisplayValue("No family")
    expect(
      within(family)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["No family", "Single Record", "Medicines & Diagnostics"])
    const category = form.getByRole("combobox", { name: "Category" })
    expect(category).toHaveDisplayValue("No category")
    expect(category).not.toBeRequired()
    expect(
      form.getByRole("textbox", { name: "Product lead" }),
    ).not.toBeRequired()
    expect(
      form.getByText(
        "It starts not published, with no items. The public site doesn't show it until you publish it.",
      ),
    ).toBeInTheDocument()
  })

  describe("the short name (S3)", () => {
    it("is suggested from the title, with the address it gives", async () => {
      const { user } = await renderList()
      const form = await openDialog(user)
      const shortName = form.getByRole("textbox", { name: "Short name" })
      expect(shortName).toHaveAccessibleDescription(
        "It ends the roadmap's public address. It can't be changed here later.",
      )

      await user.type(
        form.getByRole("textbox", { name: "Title" }),
        "Community Nursing roadmap",
      )

      expect(shortName).toHaveValue("Community Nursing")
      expect(shortName).toHaveAccessibleDescription(
        "Its public address will end “community-nursing”. It can't be changed here later.",
      )
    })

    it("no longer follows the title once it is changed", async () => {
      const { user } = await renderList()
      const form = await openDialog(user)
      const title = form.getByRole("textbox", { name: "Title" })
      const shortName = form.getByRole("textbox", { name: "Short name" })
      await user.type(title, "Community Nursing roadmap")

      await user.type(shortName, " Pilot")
      await user.clear(title)
      await user.type(title, "District Nursing roadmap")

      expect(shortName).toHaveValue("Community Nursing Pilot")
      expect(shortName).toHaveAccessibleDescription(
        "Its public address will end “community-nursing-pilot”. It can't be changed here later.",
      )
    })
  })

  describe("a field that can't be sent (S4)", () => {
    it("says what is wrong with each, linked to it, and focuses the first", async () => {
      const repository = repositoryWith()
      const addRoadmap = vi.spyOn(repository, "addRoadmap")
      const { user } = await renderList(repository)
      const form = await openDialog(user)
      await user.type(
        form.getByRole("textbox", { name: "Short name" }),
        "Community Nursing (Pilot) / 2027",
      )

      await submit(user)

      const title = form.getByRole("textbox", { name: "Title" })
      expect(title).toHaveFocus()
      expect(title).toBeInvalid()
      expect(title).toHaveAccessibleDescription(
        "The name the public site shows. Error: Enter a title",
      )
      const shortName = form.getByRole("textbox", { name: "Short name" })
      expect(shortName).toBeInvalid()
      expect(shortName).toHaveAccessibleDescription(
        /Error: Use only letters, numbers, spaces and hyphens$/,
      )
      expect(addRoadmap).not.toHaveBeenCalled()
    })

    it.each([
      ["   ", "Enter a short name"],
      ["ß", "Include a letter from a to z, or a number"],
      ["Nursing ".repeat(13), "Use 100 characters or fewer"],
    ])("refuses the short name %j", async (typed, message) => {
      const { user } = await renderList()
      const form = await openDialog(user)
      await user.type(form.getByRole("textbox", { name: "Title" }), "Nursing")
      const shortName = form.getByRole("textbox", { name: "Short name" })
      await user.clear(shortName)
      await user.type(shortName, typed)

      await submit(user)

      expect(shortName).toHaveFocus()
      expect(shortName).toHaveAccessibleDescription(
        new RegExp(`Error: ${message}$`),
      )
    })

    it("refuses a short name whose address a listed roadmap has, sending nothing", async () => {
      const repository = repositoryWith()
      const addRoadmap = vi.spyOn(repository, "addRoadmap")
      const { user } = await renderList(repository)
      const form = await openDialog(user)
      await user.type(
        form.getByRole("textbox", { name: "Title" }),
        "Outpatient booking",
      )

      await submit(user)

      const shortName = form.getByRole("textbox", { name: "Short name" })
      expect(shortName).toHaveFocus()
      expect(shortName).toHaveAccessibleDescription(
        /Error: This short name is already in use\. Choose another\.$/,
      )
      expect(addRoadmap).not.toHaveBeenCalled()
    })

    it("drops a field's message once it can be sent", async () => {
      const { user } = await renderList()
      const form = await openDialog(user)
      await submit(user)
      const title = form.getByRole("textbox", { name: "Title" })
      expect(title).toBeInvalid()

      await user.type(title, "Community Nursing roadmap")
      await submit(user)

      await findRoadmapPage()
    })
  })

  describe("adding (S5)", () => {
    it("shows it is working, holding the fields, until the write answers", async () => {
      const repository = repositoryWith()
      const { held: addRoadmap, release } = holdCall(
        repository.addRoadmap.bind(repository),
      )
      const { user } = await renderList({ ...repository, addRoadmap })
      const form = await openDialog(user)
      await fillIn(user)

      await submit(user)

      const button = form.getByRole("button", { name: "Add roadmap" })
      expect(button).toHaveAttribute("aria-busy", "true")
      expect(button).toHaveAttribute("aria-disabled", "true")
      expect(form.getByRole("textbox", { name: "Title" })).toHaveAttribute(
        "readonly",
      )
      expect(form.getByRole("textbox", { name: "Short name" })).toHaveAttribute(
        "readonly",
      )
      expect(form.getByRole("combobox", { name: "Family" })).toBeDisabled()
      expect(form.getByRole("combobox", { name: "Category" })).toBeDisabled()
      expect(form.getByRole("button", { name: "Cancel" })).toBeDisabled()
      // Neither a second click nor Escape gets past the write.
      await user.click(button)
      await user.keyboard("{Escape}")
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(addRoadmap).toHaveBeenCalledExactlyOnceWith({
        title: "Community Nursing roadmap",
        shortName: "Community Nursing",
        familyId: null,
        categoryId: GP_AND_COMMUNITY_SERVICES.id,
        productLead: "Sam Evans",
      })

      release()
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })
    })

    it("opens the new roadmap, with a notice that it was added and isn't published", async () => {
      const { user, router } = await renderList()
      await openDialog(user)
      await fillIn(user)
      await choose(user, "Family", "Medicines & Diagnostics")

      await submit(user)

      await findRoadmapPage()
      expect(router.state.location.pathname).toBe("/roadmaps/community-nursing")
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(main().getByRole("status")).toHaveTextContent(
        "Community Nursing roadmap was added. It isn't published yet.",
      )
      expect(main().getByText("Not published")).toBeInTheDocument()
      expect(
        main().getByRole("button", { name: "Publish roadmap" }),
      ).toBeInTheDocument()
      const about = within(
        main().getByRole("region", { name: "About this roadmap" }),
      )
      expect(about.getByText("Sam Evans")).toBeInTheDocument()
      expect(
        main().getByText("Family: Medicines & Diagnostics"),
      ).toBeInTheDocument()
      expect(
        main().getByText("Category: GP & Community Services"),
      ).toBeInTheDocument()
      expect(
        await main().findByRole("heading", { name: "No items yet" }),
      ).toBeInTheDocument()
    })

    it("lists it under its family, with both counts one higher", async () => {
      const { user } = await renderList()
      await main().findByText("2 roadmaps, 1 not published")
      await openDialog(user)
      await fillIn(user)
      await submit(user)
      await findRoadmapPage()

      await user.click(main().getByRole("link", { name: "Back to roadmaps" }))

      expect(
        await main().findByText("3 roadmaps, 2 not published"),
      ).toBeInTheDocument()
      const ungrouped = within(
        main().getByRole("list", { name: "No product family" }),
      )
      expect(
        ungrouped.getByRole("link", { name: "Community Nursing roadmap" }),
      ).toBeInTheDocument()
    })

    it("says the notice once: not after it is dismissed, nor on a later visit", async () => {
      const { user, router } = await renderList()
      await openDialog(user)
      await fillIn(user)
      await submit(user)
      const notice = (await findRoadmapPage()).getByRole("status")
      expect(notice).toHaveTextContent(/was added/)

      await user.click(
        within(notice).getByRole("button", { name: "Dismiss message" }),
      )

      expect(main().queryByText(/was added/)).not.toBeInTheDocument()
      expect(router.state.location.pathname).toBe("/roadmaps/community-nursing")
      await user.click(main().getByRole("link", { name: "Back to roadmaps" }))
      await user.click(
        await main().findByRole("link", { name: "Community Nursing roadmap" }),
      )
      await findRoadmapPage()
      expect(main().queryByText(/was added/)).not.toBeInTheDocument()
    })

    it("says nothing on going back to the page, though the notice was never dismissed", async () => {
      const { user, router } = await renderList()
      await openDialog(user)
      await fillIn(user)
      await submit(user)
      expect((await findRoadmapPage()).getByRole("status")).toHaveTextContent(
        /was added/,
      )

      await user.click(main().getByRole("link", { name: "Back to roadmaps" }))
      await main().findAllByRole("list")
      act(() => {
        router.history.back()
      })

      await findRoadmapPage()
      expect(router.state.location.pathname).toBe("/roadmaps/community-nursing")
      expect(main().queryByText(/was added/)).not.toBeInTheDocument()
    })

    it("ends the notice when the roadmap is published, for good", async () => {
      const { user } = await renderList()
      await openDialog(user)
      await fillIn(user)
      await submit(user)
      await findRoadmapPage()

      await user.click(main().getByRole("button", { name: "Publish roadmap" }))
      await user.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: "Publish roadmap",
        }),
      )
      await user.click(
        await main().findByRole("button", { name: "Unpublish roadmap" }),
      )
      await user.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: "Unpublish roadmap",
        }),
      )

      await main().findByRole("button", { name: "Publish roadmap" })
      expect(main().getByText("Not published")).toBeInTheDocument()
      expect(main().queryByText(/was added/)).not.toBeInTheDocument()
    })

    it("opens a roadmap this tab had found removed, added again, though the list can't be read again", async () => {
      const repository = repositoryWith()
      const listRoadmaps = vi.spyOn(repository, "listRoadmaps")
      const { user } = await renderList(repository)
      // A change pending on a roadmap a co-lead then removes: this tab remembers it gone.
      await user.click(
        await main().findByRole("link", { name: "Patient Summary roadmap" }),
      )
      await user.click(
        await main().findByRole("button", { name: "Edit About this roadmap" }),
      )
      const about = within(
        main().getByRole("form", { name: "About this roadmap" }),
      )
      await user.type(about.getByRole("textbox", { name: "Title" }), " draft")
      await user.click(about.getByRole("button", { name: "Done" }))
      await removePatientSummary(user, repository)
      await main().findByText(
        "This roadmap was removed from the list, so your changes to it couldn't be kept.",
      )
      const [back] = main().getAllByRole("link", { name: "Back to roadmaps" })
      if (!back) throw new Error("No way back to the list")
      await user.click(back)
      listRoadmaps.mockRejectedValue(new AppError("forbidden"))

      await openDialog(user)
      await user.type(
        dialog().getByRole("textbox", { name: "Title" }),
        "Patient Summary roadmap",
      )
      await submit(user)

      const page = await findRoadmapPage("Patient Summary roadmap")
      expect(page.getByText(/was added/)).toBeInTheDocument()
      expect(page.queryByText("Roadmap not found")).not.toBeInTheDocument()
    })

    it("shows no items of a removed roadmap whose address the new one takes, though they were just read", async () => {
      const repository = repositoryWith()
      const listRoadmapItems = vi
        .fn<RoadmapRepository["listRoadmapItems"]>()
        .mockResolvedValueOnce([createTestRoadmapItem("Shared summary view")])
        .mockResolvedValue([])
      const { user } = await renderList({ ...repository, listRoadmapItems })
      await user.click(
        await main().findByRole("link", { name: "Patient Summary roadmap" }),
      )
      await main().findByRole("heading", { name: "Shared summary view" })
      await user.click(main().getByRole("link", { name: "Back to roadmaps" }))
      await removePatientSummary(user, repository)
      await main().findByText("1 roadmap")

      await openDialog(user)
      await user.type(
        dialog().getByRole("textbox", { name: "Title" }),
        "Patient Summary roadmap",
      )
      await submit(user)

      const page = await findRoadmapPage("Patient Summary roadmap")
      expect(
        await page.findByRole("heading", { name: "No items yet" }),
      ).toBeInTheDocument()
      expect(
        page.queryByRole("heading", { name: "Shared summary view" }),
      ).not.toBeInTheDocument()
    })
  })

  describe("a refusal from the write (S6)", () => {
    it("says a short name a co-lead took meanwhile is in use, keeping what was typed", async () => {
      const repository = repositoryWith()
      const { user } = await renderList(repository)
      const form = await openDialog(user)
      await fillIn(user)
      repository.coLead((rows) => {
        rows.push(
          createTestRoadmap("community-nursing", "Nursing in the community"),
        )
      })

      await submit(user)

      const shortName = form.getByRole("textbox", { name: "Short name" })
      await waitFor(() => {
        expect(shortName).toHaveFocus()
      })
      expect(shortName).toHaveAccessibleDescription(
        /Error: This short name is already in use\. Choose another\.$/,
      )
      expect(shortName).toHaveValue("Community Nursing")
      expect(form.getByRole("textbox", { name: "Title" })).toHaveValue(
        "Community Nursing roadmap",
      )
      expect(
        form.getByRole("combobox", { name: "Category" }),
      ).toHaveDisplayValue("GP & Community Services")
      expect(form.getByRole("textbox", { name: "Product lead" })).toHaveValue(
        "Sam Evans",
      )
      expect(form.getByRole("button", { name: "Add roadmap" })).toBeEnabled()
    })

    it("says a family and a category that have gone are no longer listed, offering the lists as they now are", async () => {
      const inMemory = repositoryWith()
      const listFamilies = vi
        .fn<RoadmapRepository["listFamilies"]>()
        .mockResolvedValueOnce([...TEST_FAMILIES])
        .mockResolvedValue([SINGLE_RECORD])
      const listCategories = vi
        .fn<RoadmapRepository["listCategories"]>()
        .mockResolvedValueOnce([...TEST_CATEGORIES])
        .mockResolvedValue([TESTS_SCANS_AND_RESULTS])
      const addRoadmap = vi
        .fn<RoadmapRepository["addRoadmap"]>()
        .mockResolvedValue({
          status: "choice-not-listed",
          fields: ["familyId", "categoryId"],
        })
      const { user } = await renderList({
        ...inMemory,
        listFamilies,
        listCategories,
        addRoadmap,
      })
      const form = await openDialog(user)
      await fillIn(user)
      await choose(user, "Family", "Medicines & Diagnostics")

      await submit(user)

      const family = form.getByRole("combobox", { name: "Family" })
      await waitFor(() => {
        expect(family).toHaveFocus()
      })
      expect(family).toHaveAccessibleDescription(
        "Error: This family is no longer listed. Choose another.",
      )
      expect(family).toHaveDisplayValue("No family")
      const category = form.getByRole("combobox", { name: "Category" })
      expect(category).toHaveAccessibleDescription(
        "Error: This category is no longer listed. Choose another.",
      )
      expect(category).toHaveDisplayValue("No category")
      await waitFor(() => {
        expect(
          within(family)
            .getAllByRole("option")
            .map((option) => option.textContent),
        ).toEqual(["No family", "Single Record"])
      })
      expect(
        within(category)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["No category", "Tests, Scans & Results"])
      expect(form.getByRole("textbox", { name: "Title" })).toHaveValue(
        "Community Nursing roadmap",
      )
    })
  })

  describe("a choice the lists no longer offer (S6)", () => {
    it("says so at a field whose whole list has gone, which takes focus in place of its select", async () => {
      const listFamilies = vi
        .fn<RoadmapRepository["listFamilies"]>()
        .mockResolvedValueOnce([...TEST_FAMILIES])
        .mockResolvedValue(null)
      const addRoadmap = vi
        .fn<RoadmapRepository["addRoadmap"]>()
        .mockResolvedValue({
          status: "choice-not-listed",
          fields: ["familyId"],
        })
      const { user } = await renderList({
        ...repositoryWith(),
        listFamilies,
        addRoadmap,
      })
      const form = await openDialog(user)
      await fillIn(user)
      await choose(user, "Family", "Medicines & Diagnostics")

      await submit(user)

      const family = await form.findByRole("group", { name: "Family" })
      await waitFor(() => {
        expect(family).toHaveFocus()
      })
      expect(family).toHaveAccessibleDescription(
        "Error: This family is no longer listed. Choose another.",
      )
      expect(within(family).getByText("No family")).toBeInTheDocument()
      expect(
        within(family).getByText("The family can't be changed right now."),
      ).toBeInTheDocument()
      expect(
        form.queryByRole("combobox", { name: "Family" }),
      ).not.toBeInTheDocument()
      expect(
        form.getByRole("combobox", { name: "Category" }),
      ).toHaveDisplayValue("GP & Community Services")
    })

    it("puts a family a list read again no longer has back to none, saying so, and sends none", async () => {
      const inMemory = repositoryWith()
      const listFamilies = vi
        .fn<RoadmapRepository["listFamilies"]>()
        .mockResolvedValueOnce([...TEST_FAMILIES])
        .mockResolvedValue([SINGLE_RECORD])
      const addRoadmap = vi.spyOn(inMemory, "addRoadmap")
      const { user, authClient } = await renderList({
        ...inMemory,
        listFamilies,
        addRoadmap,
      })
      const form = await openDialog(user)
      await fillIn(user)
      await choose(user, "Family", "Medicines & Diagnostics")

      // The lists are read again once reconnected.
      act(() => {
        authClient.setState({ status: "expired" })
      })
      await user.click(form.getByRole("button", { name: "Reconnect" }))

      const family = form.getByRole("combobox", { name: "Family" })
      await waitFor(() => {
        expect(family).toHaveAccessibleDescription(
          "Error: This family is no longer listed. Choose another.",
        )
      })
      expect(family).toHaveDisplayValue("No family")
      expect(
        within(family)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["No family", "Single Record"])
      expect(form.getByRole("textbox", { name: "Title" })).toHaveValue(
        "Community Nursing roadmap",
      )
      await submit(user)
      await findRoadmapPage()
      expect(addRoadmap).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          familyId: null,
          categoryId: GP_AND_COMMUNITY_SERVICES.id,
        }),
        // The hook passes no options.
      )
    })
  })

  describe("a write that failed (S7)", () => {
    it.each([
      [
        "no usable template",
        { noStartingPoint: true },
        "The template for new roadmaps is missing or isn't in the expected format in the spreadsheet. Ask the spreadsheet owner to check it.",
      ],
      [
        "a refused write",
        { write: { fails: "forbidden" } },
        "This Google account isn't allowed to add roadmaps. Ask the spreadsheet owner for edit access.",
      ],
      [
        "an unsent write",
        { write: { lost: "not-applied" } },
        "Couldn't connect. Check your internet connection and try again.",
      ],
    ] satisfies [string, InMemoryRoadmapRepositoryOptions, string][])(
      "says why for %s, keeping what was typed",
      async (_case, options, message) => {
        const { user } = await renderList(repositoryWith(options))
        const form = await openDialog(user)
        await fillIn(user)

        await submit(user)

        const alert = within(await form.findByRole("alert"))
        expect(alert.getByText("Couldn't add the roadmap")).toBeInTheDocument()
        expect(alert.getByText(message)).toBeInTheDocument()
        expect(form.getByRole("textbox", { name: "Title" })).toHaveValue(
          "Community Nursing roadmap",
        )
        expect(form.getByRole("textbox", { name: "Short name" })).toHaveValue(
          "Community Nursing",
        )
        expect(form.getByRole("button", { name: "Add roadmap" })).toBeEnabled()
      },
    )

    it("says a rate-limited write can be tried again", async () => {
      const addRoadmap = vi
        .fn<RoadmapRepository["addRoadmap"]>()
        .mockRejectedValue(new AppError("rate-limited"))
      const { user } = await renderList({ ...repositoryWith(), addRoadmap })
      const form = await openDialog(user)
      await fillIn(user)

      await submit(user)

      expect(
        await form.findByText(
          "Too many requests right now. Wait a moment and try again.",
        ),
      ).toBeInTheDocument()
      // A write is never retried by itself.
      expect(addRoadmap).toHaveBeenCalledOnce()
    })

    it("says a write that may have been applied may have added it, and to refresh the list", async () => {
      const { user } = await renderList(
        repositoryWith({ write: { lost: "reread-fails" } }),
      )
      const form = await openDialog(user)
      await fillIn(user)

      await submit(user)

      const alert = within(await form.findByRole("alert"))
      expect(
        alert.getByText("The roadmap may have been added"),
      ).toBeInTheDocument()
      expect(
        alert.getByText(
          "The answer was lost. Cancel, then refresh your roadmaps to check before adding it again.",
        ),
      ).toBeInTheDocument()
      expect(form.getByRole("textbox", { name: "Title" })).toHaveValue(
        "Community Nursing roadmap",
      )
    })

    it("drops the failure when the next attempt starts", async () => {
      const inMemory = repositoryWith()
      const addRoadmap = vi
        .fn<RoadmapRepository["addRoadmap"]>()
        .mockRejectedValueOnce(new AppError("network"))
        .mockImplementation((input, options) =>
          inMemory.addRoadmap(input, options),
        )
      const { user } = await renderList({ ...inMemory, addRoadmap })
      const form = await openDialog(user)
      await fillIn(user)
      await submit(user)
      await form.findByRole("alert")

      await submit(user)

      await findRoadmapPage()
    })
  })

  describe("closing (S8)", () => {
    it.each([
      [
        "Cancel",
        (user: UserEvent) =>
          user.click(dialog().getByRole("button", { name: "Cancel" })),
      ],
      ["Escape", (user: UserEvent) => user.keyboard("{Escape}")],
    ])(
      "%s closes it, drops what was typed and returns focus to Add a roadmap",
      async (_how, close) => {
        const { user } = await renderList()
        await openDialog(user)
        await fillIn(user)

        await close(user)

        await waitFor(() => {
          expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        })
        const button = main().getByRole("button", { name: "Add a roadmap" })
        await waitFor(() => {
          expect(button).toHaveFocus()
        })
        await user.click(button)
        expect(dialog().getByRole("textbox", { name: "Title" })).toHaveValue("")
        expect(
          dialog().getByRole("textbox", { name: "Product lead" }),
        ).toHaveValue("")
        expect(
          dialog().getByRole("combobox", { name: "Category" }),
        ).toHaveDisplayValue("No category")
      },
    )
  })

  describe("no list to choose from (S9)", () => {
    it("says a family can't be chosen without a usable family list, and adds without it", async () => {
      const repository = repositoryWith({ families: null })
      const addRoadmap = vi.spyOn(repository, "addRoadmap")
      const { user } = await renderList(repository)
      const form = await openDialog(user)

      expect(
        await form.findByText("The family can't be changed right now."),
      ).toBeInTheDocument()
      expect(
        form.queryByRole("combobox", { name: "Family" }),
      ).not.toBeInTheDocument()
      expect(form.getByText("No family")).toBeInTheDocument()
      await fillIn(user)
      await submit(user)

      await findRoadmapPage()
      expect(addRoadmap).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          familyId: null,
          categoryId: GP_AND_COMMUNITY_SERVICES.id,
        }),
      )
    })

    it("says a category can't be chosen when its list can't be read", async () => {
      const listCategories = vi
        .fn<RoadmapRepository["listCategories"]>()
        .mockRejectedValue(new AppError("invalid-data"))
      const { user } = await renderList({ ...repositoryWith(), listCategories })
      const form = await openDialog(user)

      expect(
        await form.findByText("The category can't be changed right now."),
      ).toBeInTheDocument()
      expect(form.getByText("No category")).toBeInTheDocument()
      expect(form.getByRole("combobox", { name: "Family" })).toBeEnabled()
    })
  })

  it("is in Welsh, and still drops only a final “roadmap” from the title (S10)", async () => {
    const { user } = await renderList(repositoryWith(), "cy")
    await main().findAllByRole("list")
    await user.click(
      main().getByRole("button", { name: "Ychwanegu map trywydd" }),
    )
    const form = dialog("Ychwanegu map trywydd")

    await user.type(
      form.getByRole("textbox", { name: "Teitl (Saesneg)" }),
      "Map trywydd Nyrsio Cymunedol roadmap",
    )

    const shortName = form.getByRole("textbox", { name: "Enw byr" })
    expect(shortName).toHaveValue("Map trywydd Nyrsio Cymunedol")
    expect(shortName).toHaveAccessibleDescription(
      "Bydd ei gyfeiriad cyhoeddus yn gorffen â “map-trywydd-nyrsio-cymunedol”. Does dim modd ei newid yma wedyn.",
    )
    expect(form.getByRole("combobox", { name: "Teulu" })).toHaveDisplayValue(
      "Dim teulu",
    )
    expect(
      form.getByRole("button", { name: "Ychwanegu'r map trywydd" }),
    ).toBeEnabled()
    await user.click(
      form.getByRole("button", { name: "Ychwanegu'r map trywydd" }),
    )
    const page = await findRoadmapPage("Map trywydd Nyrsio Cymunedol roadmap")
    expect(
      page.getByText(
        "Cafodd Map trywydd Nyrsio Cymunedol roadmap ei ychwanegu. Dydy e ddim wedi'i gyhoeddi eto.",
      ),
    ).toBeInTheDocument()
  })

  describe("an expired session (S11)", () => {
    it("offers Reconnect inside the dialog, keeping what was typed", async () => {
      const { user, authClient } = await renderList()
      const form = await openDialog(user)
      await fillIn(user)

      act(() => {
        authClient.setState({ status: "expired" })
      })

      const alert = within(form.getByRole("alert"))
      expect(alert.getByText("Your session has expired")).toBeInTheDocument()
      expect(
        alert.getByText(
          "Reconnect to Google to add the roadmap. What you've typed is kept.",
        ),
      ).toBeInTheDocument()
      const add = form.getByRole("button", { name: "Add roadmap" })
      expect(add).toHaveAttribute("aria-disabled", "true")
      await user.click(add)
      expect(form.getByRole("textbox", { name: "Title" })).not.toBeInvalid()

      await user.click(alert.getByRole("button", { name: "Reconnect" }))

      expect(authClient.connect).toHaveBeenCalledOnce()
      expect(form.queryByRole("alert")).not.toBeInTheDocument()
      expect(form.getByRole("textbox", { name: "Title" })).toHaveValue(
        "Community Nursing roadmap",
      )
      expect(form.getByRole("textbox", { name: "Product lead" })).toHaveValue(
        "Sam Evans",
      )
      expect(add).toBeEnabled()
    })

    it("says why a Reconnect that Google's window stopped didn't work", async () => {
      const { user, authClient } = await renderList()
      const form = await openDialog(user)

      act(() => {
        authClient.setState({ status: "expired", lastError: "popup-blocked" })
      })

      expect(
        within(form.getByRole("alert")).getByText(
          "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
        ),
      ).toBeInTheDocument()
    })

    it("ends the session when the write is refused for it, then adds once reconnected", async () => {
      const inMemory = repositoryWith()
      const addRoadmap = vi
        .fn<RoadmapRepository["addRoadmap"]>()
        .mockRejectedValueOnce(new AppError("unauthenticated"))
        .mockImplementation((input, options) =>
          inMemory.addRoadmap(input, options),
        )
      const { user, authClient } = await renderList({ ...inMemory, addRoadmap })
      const form = await openDialog(user)
      await fillIn(user)

      await submit(user)

      const alert = within(await form.findByRole("alert"))
      expect(alert.getByText("Your session has expired")).toBeInTheDocument()
      expect(authClient.reportUnauthenticated).toHaveBeenCalledOnce()
      await user.click(alert.getByRole("button", { name: "Reconnect" }))
      expect(
        within(form.getByRole("alert")).getByText(
          "Your session expired before it could be added. Try again.",
        ),
      ).toBeInTheDocument()

      await submit(user)

      await findRoadmapPage()
    })
  })
})
