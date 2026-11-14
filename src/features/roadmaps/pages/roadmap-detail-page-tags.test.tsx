import {
  type BoundFunctions,
  type queries,
  screen,
  within,
} from "@testing-library/react"
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

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

const tagged = (...tags: string[]) => tags.map((en) => ({ en, cy: "" }))

/** S3's roadmap: the others carry Patients (3), Appointments (2), Clinic staff (2), Waiting lists (1). */
const items: RoadmapItem[] = [
  createTestRoadmapItem("Video clinics", {
    id: "item-1",
    tags: tagged("Patients", "Video consultations"),
  }),
  createTestRoadmapItem("Online booking", {
    id: "item-2",
    tags: tagged("Patients", "Appointments"),
  }),
  createTestRoadmapItem("Reminders", {
    id: "item-3",
    tags: tagged("Patients", "Clinic staff"),
  }),
  createTestRoadmapItem("Waiting list", {
    id: "item-4",
    tags: tagged("Patients", "Waiting lists", "Appointments"),
  }),
  createTestRoadmapItem("Rotas", {
    id: "item-5",
    tags: tagged("Clinic staff"),
  }),
  createTestRoadmapItem("New idea", { id: "item-6" }),
]

type User = ReturnType<typeof userEvent.setup>
type Within = BoundFunctions<typeof queries>

function main() {
  return within(screen.getByRole("main"))
}

/** The card (or form) of the item headed `title`. */
function card(title: string) {
  const heading = main().getByRole("heading", { level: 3, name: title })
  const item = heading.closest("li")
  if (!item) throw new Error(`No card for ${title}`)
  return item
}

/** The item's tags as its card's Tags line shows them, or `null` with no line. */
function tagsLineOf(title: string) {
  return (
    within(card(title)).queryByText("Tags", { selector: "dt" })
      ?.nextElementSibling?.textContent ?? null
  )
}

async function renderPage({
  shown = items,
  repository = createInMemoryRoadmapRepository(roadmaps, { producta: shown }),
  language,
}: {
  shown?: RoadmapItem[]
  repository?: InMemoryRoadmapRepository
  language?: Language
} = {}) {
  const user = userEvent.setup()
  await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
    ...(language ? { language } : {}),
  })
  const [first] = shown
  if (!first) throw new Error("The page needs an item")
  await main().findByRole("heading", { level: 3, name: first.title.en })
  return { user, repository }
}

/** Opens the item's form, its Tags field still shut. */
async function openForm(user: User, title: string) {
  await user.click(main().getByRole("button", { name: `Edit ${title}` }))
  return within(main().getByRole("form", { name: title }))
}

/** Opens the item's form and its Tags field: the form, and the field's group. */
async function openTags(user: User, title: string) {
  const form = await openForm(user, title)
  await user.click(form.getByRole("button", { name: /^(Change|Add) tags$/ }))
  return { form, field: within(form.getByRole("group", { name: "Tags" })) }
}

/** The tags the open field shows, in order. */
function rowsOf(field: Within) {
  const list = field.queryByRole("list", { name: "Tags on this item" })
  return list
    ? within(list)
        .getAllByRole("listitem")
        .map((row) => row.firstElementChild?.textContent ?? "")
    : []
}

/** The tags the open field offers, in order, by their buttons' names. */
function offeredBy(field: Within) {
  const list = field.queryByRole("list", {
    name: "Used elsewhere in this roadmap",
  })
  return list
    ? within(list)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label"))
    : []
}

async function addTag(user: User, field: Within, text: string) {
  await user.type(field.getByRole("textbox", { name: "Add a tag" }), text)
  await user.click(field.getByRole("button", { name: "Add tag" }))
}

async function done(user: User, form: Within) {
  await user.click(form.getByRole("button", { name: "Done" }))
}

async function publish(user: User) {
  await user.click(main().getByRole("button", { name: "Publish changes" }))
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Publish changes",
    }),
  )
}

describe("Editing an item's tags (STY-037)", () => {
  it("starts shut, both tags on one line beside Change tags, with no editor and no Tags line on the card (S19)", async () => {
    const { user } = await renderPage()
    expect(tagsLineOf("Video clinics")).toBe("Patients, Video consultations")

    const form = await openForm(user, "Video clinics")

    const line = form.getAllByRole("list")[0]
    expect(line).toHaveTextContent("PatientsVideo consultations")
    expect(form.getByRole("button", { name: "Change tags" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(form.queryByRole("group", { name: "Tags" })).toBeNull()
    expect(form.queryByRole("textbox", { name: "Add a tag" })).toBeNull()
    expect(tagsLineOf("Video clinics")).toBeNull()
  })

  it("reads No tags beside Add tags for an item with none (S19)", async () => {
    const { user } = await renderPage()

    const form = await openForm(user, "New idea")

    expect(form.getByText("No tags")).toBeVisible()
    expect(form.getByRole("button", { name: "Add tags" })).toBeVisible()
  })

  it("opens the editor in place, focus in Add a tag, each tag with a Rename and a Remove named for it (S1, S19)", async () => {
    const { user } = await renderPage()

    const { form, field } = await openTags(user, "Video clinics")

    expect(field.getByRole("textbox", { name: "Add a tag" })).toHaveFocus()
    expect(form.getByRole("button", { name: "Close tags" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    expect(rowsOf(field)).toEqual(["Patients", "Video consultations"])
    for (const name of [
      "Rename Patients",
      "Remove Patients",
      "Rename Video consultations",
      "Remove Video consultations",
    ]) {
      expect(field.getByRole("button", { name })).toBeVisible()
    }
  })

  it("is Welsh on the Welsh interface, the tags staying English (S1)", async () => {
    const { user } = await renderPage({ language: "cy" })

    await user.click(
      main().getByRole("button", { name: "Golygu Video clinics" }),
    )
    const form = within(main().getByRole("form", { name: "Video clinics" }))
    await user.click(form.getByRole("button", { name: "Newid tagiau" }))
    const field = within(form.getByRole("group", { name: "Tagiau (Saesneg)" }))

    expect(field.getByRole("textbox", { name: "Ychwanegu tag" })).toHaveFocus()
    expect(
      field.getByRole("button", { name: "Ailenwi Patients" }),
    ).toBeVisible()
    expect(field.getByRole("button", { name: "Tynnu Patients" })).toBeVisible()
    expect(
      field.getByRole("button", {
        name: "Ychwanegu Appointments, ar 2 eitem arall",
      }),
    ).toBeVisible()
    expect(form.getByRole("button", { name: "Cau tagiau" })).toBeVisible()
  })

  it("keeps an added tag pending, on the card and in the publish dialog, writing nothing until published (S2, S12)", async () => {
    const { user, repository } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")

    await addTag(user, field, "Carers")
    expect(field.getByRole("status")).toHaveTextContent("Added Carers.")
    await done(user, form)

    expect(tagsLineOf("Video clinics")).toBe(
      "Patients, Video consultations, Carers",
    )
    expect(within(card("Video clinics")).getByText("Changed")).toBeVisible()
    expect((await repository.listRoadmapItems("producta"))[0]?.tags).toEqual(
      tagged("Patients", "Video consultations"),
    )

    await user.click(main().getByRole("button", { name: "Publish changes" }))
    const dialog = within(screen.getByRole("alertdialog"))
    expect(dialog.getByRole("listitem")).toHaveTextContent(
      /Video clinics.*Tags/,
    )
    await user.click(dialog.getByRole("button", { name: "Publish changes" }))

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect((await repository.listRoadmapItems("producta"))[0]?.tags).toEqual(
      tagged("Patients", "Video consultations", "Carers"),
    )
    expect(within(card("Video clinics")).queryByText("Changed")).toBeNull()
  })

  it("offers the roadmap's other tags, most used first then alphabetical, without the item's own (S3, S18)", async () => {
    const { user } = await renderPage()

    const { field } = await openTags(user, "Video clinics")

    expect(field.getByText("Used elsewhere in this roadmap")).toBeVisible()
    expect(offeredBy(field)).toEqual([
      "Add Appointments, on 2 other items",
      "Add Clinic staff, on 2 other items",
      "Add Waiting lists, on 1 other item",
    ])
  })

  it("narrows the offered tags as Add a tag is typed in, adds a chosen one and says when none matches (S3, S18)", async () => {
    const { user } = await renderPage()
    const { field } = await openTags(user, "Video clinics")
    const input = field.getByRole("textbox", { name: "Add a tag" })

    await user.type(input, "wai")
    expect(offeredBy(field)).toEqual(["Add Waiting lists, on 1 other item"])
    await user.clear(input)
    await user.type(input, "zzz")
    expect(offeredBy(field)).toEqual([])
    expect(field.getByText("No other tag matches “zzz”.")).toBeVisible()
    await user.clear(input)
    await user.click(
      field.getByRole("button", { name: "Add Clinic staff, on 2 other items" }),
    )

    expect(rowsOf(field)).toEqual([
      "Patients",
      "Video consultations",
      "Clinic staff",
    ])
    expect(offeredBy(field)).toEqual([
      "Add Appointments, on 2 other items",
      "Add Waiting lists, on 1 other item",
    ])
    // Focus takes the place of the tag chosen: the next one offered.
    expect(
      field.getByRole("button", { name: "Add Waiting lists, on 1 other item" }),
    ).toHaveFocus()
  })

  it("offers another item's pending tags as the page shows them (S3)", async () => {
    const { user } = await renderPage()
    const other = await openTags(user, "New idea")
    await addTag(user, other.field, "Self-service")
    await done(user, other.form)

    const { field } = await openTags(user, "Video clinics")

    expect(offeredBy(field)).toContain("Add Self-service, on 1 other item")
  })

  it.each(["Patients", "patients"])(
    "adds no tag the item has, typed as %s, and says the item has it (S4)",
    async (typed) => {
      const { user } = await renderPage()
      const { field } = await openTags(user, "Video clinics")

      await addTag(user, field, typed)

      expect(rowsOf(field)).toEqual(["Patients", "Video consultations"])
      expect(field.getByRole("status")).toHaveTextContent(
        "“Patients” is already on this item.",
      )
      expect(field.getByRole("status")).toBeVisible()
    },
  )

  it("removes a tag, offering it again while other items carry it (S5)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")

    await user.click(field.getByRole("button", { name: "Remove Patients" }))

    expect(field.getByRole("status")).toHaveTextContent("Removed “Patients”.")
    expect(offeredBy(field)[0]).toBe("Add Patients, on 3 other items")
    await done(user, form)
    expect(tagsLineOf("Video clinics")).toBe("Video consultations")
    expect(within(card("Video clinics")).getByText("Changed")).toBeVisible()
  })

  it("shows no Tags line for an item with every tag removed (S5)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Rotas")

    await user.click(field.getByRole("button", { name: "Remove Clinic staff" }))
    expect(rowsOf(field)).toEqual([])
    // None is left, so focus is on the control for adding (S11).
    expect(field.getByRole("textbox", { name: "Add a tag" })).toHaveFocus()
    await done(user, form)

    expect(tagsLineOf("Rotas")).toBeNull()
    expect(within(card("Rotas")).getByText("Changed")).toBeVisible()
  })

  it("puts a removed tag back in its place on Undo (S17)", async () => {
    const { user } = await renderPage()
    const { field } = await openTags(user, "Video clinics")
    await user.click(field.getByRole("button", { name: "Remove Patients" }))

    await user.click(
      field.getByRole("button", { name: "Undo removing Patients" }),
    )

    expect(rowsOf(field)).toEqual(["Patients", "Video consultations"])
    expect(field.getByRole("status")).toHaveTextContent("Put back “Patients”.")
    expect(field.queryByRole("button", { name: /^Undo/ })).toBeNull()
    expect(field.getByRole("button", { name: "Remove Patients" })).toHaveFocus()
  })

  it("renames a tag in its place, on this item only (S6, S15)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Online booking")

    await user.click(field.getByRole("button", { name: "Rename Patients" }))
    const name = field.getByRole("textbox", { name: "Rename Patients" })
    expect(name).toHaveFocus()
    expect(name).toHaveValue("Patients")
    expect(field.getByRole("button", { name: "Update Patients" })).toBeVisible()
    expect(
      field.getByRole("button", { name: "Cancel renaming Patients" }),
    ).toBeVisible()
    await user.clear(name)
    await user.type(name, "Carers{Enter}")

    // Enter kept the name without confirming the form.
    expect(rowsOf(field)).toEqual(["Carers", "Appointments"])
    expect(field.getByRole("button", { name: "Rename Carers" })).toHaveFocus()
    await done(user, form)
    expect(tagsLineOf("Online booking")).toBe("Carers, Appointments")
    expect(tagsLineOf("Reminders")).toBe("Patients, Clinic staff")
  })

  it("keeps the old name on Escape or Cancel, the form staying open, and the new one on Update (S15)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")
    const rename = async (typed: string) => {
      await user.click(
        field.getByRole("button", { name: "Rename Video consultations" }),
      )
      const name = field.getByRole("textbox", {
        name: "Rename Video consultations",
      })
      await user.clear(name)
      await user.type(name, typed)
    }

    await rename("Video calls{Escape}")
    expect(form.getByRole("button", { name: "Done" })).toBeVisible()
    expect(rowsOf(field)).toEqual(["Patients", "Video consultations"])
    expect(
      field.getByRole("button", { name: "Rename Video consultations" }),
    ).toHaveFocus()

    await rename("Video calls")
    await user.click(
      field.getByRole("button", {
        name: "Cancel renaming Video consultations",
      }),
    )
    expect(rowsOf(field)).toEqual(["Patients", "Video consultations"])

    await rename("Video appointments")
    await user.click(
      field.getByRole("button", { name: "Update Video consultations" }),
    )
    expect(rowsOf(field)).toEqual(["Patients", "Video appointments"])
  })

  it("leaves a tag once when another is renamed to it (S6)", async () => {
    const { user } = await renderPage()
    const { field } = await openTags(user, "Video clinics")

    await user.click(
      field.getByRole("button", { name: "Rename Video consultations" }),
    )
    const name = field.getByRole("textbox", {
      name: "Rename Video consultations",
    })
    await user.clear(name)
    await user.type(name, "patients{Enter}")

    expect(rowsOf(field)).toEqual(["Patients"])
    expect(field.getByRole("status")).toHaveTextContent(
      "“Patients” is already on this item, so “Video consultations” was removed.",
    )
  })

  it("keeps a name still being changed when the form is confirmed (S15)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")
    await user.click(
      field.getByRole("button", { name: "Rename Video consultations" }),
    )
    const name = field.getByRole("textbox", {
      name: "Rename Video consultations",
    })
    await user.clear(name)
    await user.type(name, "Video appointments")

    await done(user, form)

    expect(tagsLineOf("Video clinics")).toBe("Patients, Video appointments")
  })

  it("keeps a name still being changed when another control of the field is used (S15)", async () => {
    const { user } = await renderPage()
    const { field } = await openTags(user, "Video clinics")
    await user.click(
      field.getByRole("button", { name: "Rename Video consultations" }),
    )
    const name = field.getByRole("textbox", {
      name: "Rename Video consultations",
    })
    await user.clear(name)
    await user.type(name, "Video appointments")

    await user.click(field.getByRole("button", { name: "Remove Patients" }))

    expect(rowsOf(field)).toEqual(["Video appointments"])
  })

  it("ends a tag at a comma as it is typed, and at a pasted line break, each trimmed (S7)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "New idea")
    const input = field.getByRole("textbox", { name: "Add a tag" })

    await user.type(input, " Carers , Clinic staff{Enter}")
    expect(rowsOf(field)).toEqual(["Carers", "Clinic staff"])
    expect(input).toHaveValue("")
    await user.click(input)
    await user.paste("Waiting lists\n Appointments ,")

    expect(rowsOf(field)).toEqual([
      "Carers",
      "Clinic staff",
      "Waiting lists",
      "Appointments",
    ])
    await done(user, form)
    expect(tagsLineOf("New idea")).toBe(
      "Carers, Clinic staff, Waiting lists, Appointments",
    )
  })

  it("counts text typed but not yet added when the form is confirmed (S8)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")

    await user.type(field.getByRole("textbox", { name: "Add a tag" }), "Carers")
    await done(user, form)

    expect(tagsLineOf("Video clinics")).toBe(
      "Patients, Video consultations, Carers",
    )
  })

  it("shuts keeping a name still being changed and text typed but not added, the line showing the tags as changed (S19)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")
    await user.click(
      field.getByRole("button", { name: "Rename Video consultations" }),
    )
    const name = field.getByRole("textbox", {
      name: "Rename Video consultations",
    })
    await user.clear(name)
    await user.type(name, "Video appointments")
    await user.type(field.getByRole("textbox", { name: "Add a tag" }), "Carers")

    await user.click(form.getByRole("button", { name: "Close tags" }))

    expect(form.getByRole("button", { name: "Change tags" })).toHaveFocus()
    expect(form.getAllByRole("list")[0]).toHaveTextContent(
      "PatientsVideo appointmentsCarers",
    )
    await vi.waitFor(() => {
      expect(form.queryByRole("group", { name: "Tags" })).toBeNull()
    })
    // Opened again, nothing is half done.
    await user.click(form.getByRole("button", { name: "Change tags" }))
    const again = within(form.getByRole("group", { name: "Tags" }))
    expect(rowsOf(again)).toEqual(["Patients", "Video appointments", "Carers"])
    expect(again.getByRole("textbox", { name: "Add a tag" })).toHaveValue("")
    await user.click(form.getByRole("button", { name: "Close tags" }))
    await done(user, form)

    expect(tagsLineOf("Video clinics")).toBe(
      "Patients, Video appointments, Carers",
    )
  })

  it("leaves the tags as they were on Cancel, with nothing pending (S9)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")
    await addTag(user, field, "Carers")
    await user.click(field.getByRole("button", { name: "Remove Patients" }))

    await user.click(form.getByRole("button", { name: "Cancel" }))

    expect(tagsLineOf("Video clinics")).toBe("Patients, Video consultations")
    expect(main().queryByText("Changed")).toBeNull()
  })

  it("shows the tags as read on Undo changes (S9)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")
    await addTag(user, field, "Carers")
    await done(user, form)

    await user.click(
      main().getByRole("button", { name: "Undo changes Video clinics" }),
    )

    expect(tagsLineOf("Video clinics")).toBe("Patients, Video consultations")
    expect(main().queryByText("Changed")).toBeNull()
  })

  it("is no change when a tag is added and removed again (S9)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")
    await addTag(user, field, "Carers")
    await user.click(field.getByRole("button", { name: "Remove Carers" }))

    await done(user, form)

    expect(main().queryByText("Changed")).toBeNull()
  })

  it("holds no tags and offers none on a roadmap whose items have none, and still takes a typed tag (S10)", async () => {
    const bare = [
      createTestRoadmapItem("New idea", { id: "item-1" }),
      createTestRoadmapItem("Another", { id: "item-2" }),
    ]
    const { user } = await renderPage({ shown: bare })

    const { form, field } = await openTags(user, "New idea")

    expect(rowsOf(field)).toEqual([])
    expect(field.queryByText("Used elsewhere in this roadmap")).toBeNull()
    expect(offeredBy(field)).toEqual([])
    await addTag(user, field, "Carers")
    await done(user, form)
    expect(tagsLineOf("New idea")).toBe("Carers")
  })

  it("offers an item with no tags every tag the roadmap's other items carry (S10)", async () => {
    const { user } = await renderPage()

    const { field } = await openTags(user, "New idea")

    expect(offeredBy(field)).toEqual([
      "Add Patients, on 4 other items",
      "Add Appointments, on 2 other items",
      "Add Clinic staff, on 2 other items",
      "Add Video consultations, on 1 other item",
      "Add Waiting lists, on 1 other item",
    ])
  })

  it("adds, chooses, renames and removes by keyboard alone, focus staying in the field (S11)", async () => {
    const { user } = await renderPage()
    const form = await openForm(user, "Video clinics")
    form.getByRole("button", { name: "Change tags" }).focus()
    await user.keyboard("{Enter}")
    const field = within(form.getByRole("group", { name: "Tags" }))
    expect(field.getByRole("textbox", { name: "Add a tag" })).toHaveFocus()

    await user.keyboard("Carers{Enter}")
    expect(rowsOf(field)).toEqual(["Patients", "Video consultations", "Carers"])
    expect(field.getByRole("textbox", { name: "Add a tag" })).toHaveFocus()

    // Add tag, then the first tag offered.
    await user.tab()
    await user.tab()
    expect(
      field.getByRole("button", { name: "Add Appointments, on 2 other items" }),
    ).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(rowsOf(field)).toContain("Appointments")

    field.getByRole("button", { name: "Rename Patients" }).focus()
    await user.keyboard("{Enter}")
    await user.keyboard("People{Enter}")
    expect(rowsOf(field)[0]).toBe("People")
    expect(field.getByRole("button", { name: "Rename People" })).toHaveFocus()

    await user.tab()
    expect(field.getByRole("button", { name: "Remove People" })).toHaveFocus()
    await user.keyboard("{Enter}")
    // Focus is on the next tag's control.
    expect(
      field.getByRole("button", { name: "Remove Video consultations" }),
    ).toHaveFocus()
    expect(field.getByRole("status")).toHaveTextContent("Removed “People”.")
    expect(form.getByRole("button", { name: "Done" })).toBeVisible()
  })

  it("adds a typed tag in the spelling the roadmap's other items use, and says so (S21)", async () => {
    const { user } = await renderPage()
    const { field } = await openTags(user, "Video clinics")

    await addTag(user, field, "clinic staff")

    expect(rowsOf(field)).toEqual([
      "Patients",
      "Video consultations",
      "Clinic staff",
    ])
    expect(field.getByRole("status")).toHaveTextContent(
      "Added as “Clinic staff”, as other items spell it.",
    )
  })

  it("shows a co-lead's different tags beside yours, to keep or use (S13)", async () => {
    const { user, repository } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")
    await addTag(user, field, "Carers")
    await done(user, form)
    repository.coLead((_list, itemsOf) => {
      const clinics = itemsOf("producta")[0]
      if (clinics) clinics.tags = tagged("Video consultations", "Patients")
    })

    await publish(user)

    const review = await main().findByRole("alert")
    const conflict = within(within(review).getByRole("listitem"))
    expect(conflict.getByText(/: /, { selector: "p" })).toHaveTextContent(
      "Video clinics: Tags",
    )
    expect(
      conflict.getAllByRole("definition").map(({ textContent }) => textContent),
    ).toEqual([
      "Patients, Video consultations, Carers",
      "Video consultations, Patients",
    ])
    expect((await repository.listRoadmapItems("producta"))[0]?.tags).toEqual(
      tagged("Video consultations", "Patients"),
    )
    await user.click(
      conflict.getByRole("button", { name: "Keep mine Video clinics: Tags" }),
    )
    expect(tagsLineOf("Video clinics")).toBe(
      "Patients, Video consultations, Carers",
    )
    await publish(user)
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect((await repository.listRoadmapItems("producta"))[0]?.tags).toEqual(
      tagged("Patients", "Video consultations", "Carers"),
    )
  })

  it("publishes over a co-lead's same tags in the same order, and Refresh drops a change the data source holds (S13)", async () => {
    const { user, repository } = await renderPage()
    const { form, field } = await openTags(user, "Video clinics")
    await addTag(user, field, "Carers")
    await done(user, form)
    repository.coLead((_list, itemsOf) => {
      const clinics = itemsOf("producta")[0]
      if (clinics) {
        clinics.tags = tagged("Patients", "Video consultations", "Carers")
      }
    })

    await user.click(main().getByRole("button", { name: "Refresh" }))

    await vi.waitFor(() => {
      expect(within(card("Video clinics")).queryByText("Changed")).toBeNull()
    })
    expect(tagsLineOf("Video clinics")).toBe(
      "Patients, Video consultations, Carers",
    )
  })
})

describe("What the Tags field keeps (STY-037, review round 1)", () => {
  it("pastes a list over the text selected in Add a tag, and into text at the caret (S7)", async () => {
    const { user } = await renderPage()
    const { field } = await openTags(user, "New idea")
    const input = field.getByRole<HTMLInputElement>("textbox", {
      name: "Add a tag",
    })

    await user.type(input, "Wrong")
    input.setSelectionRange(0, 5)
    await user.paste("Carers, Clinic staff")
    expect(rowsOf(field)).toEqual(["Carers", "Clinic staff"])

    await user.type(input, "lists")
    input.setSelectionRange(0, 0)
    await user.paste("Appointments, Waiting ")
    expect(rowsOf(field)).toEqual([
      "Carers",
      "Clinic staff",
      "Appointments",
      "Waiting lists",
    ])
  })

  it("says what was added beside what was refused, when a list holds both (S11)", async () => {
    const { user } = await renderPage()
    const { field } = await openTags(user, "Video clinics")

    await user.click(field.getByRole("textbox", { name: "Add a tag" }))
    await user.paste("Carers, Patients")

    expect(rowsOf(field)).toEqual(["Patients", "Video consultations", "Carers"])
    expect(field.getByRole("status")).toHaveTextContent(
      "Added Carers. “Patients” is already on this item.",
    )
  })

  it.each(["shut", "open"])(
    "keeps typed text in the spelling another item has taken since, the field %s when the form is confirmed (S19, S21)",
    async (state) => {
      const { user } = await renderPage()
      const { form, field } = await openTags(user, "Video clinics")
      await user.type(
        field.getByRole("textbox", { name: "Add a tag" }),
        "carers",
      )
      const other = await openTags(user, "New idea")
      await addTag(user, other.field, "Carers")
      await done(user, other.form)

      if (state === "shut") {
        await user.click(form.getByRole("button", { name: "Close tags" }))
        expect(form.getAllByRole("list")[0]).toHaveTextContent(
          "PatientsVideo consultationsCarers",
        )
      }
      await done(user, form)

      expect(tagsLineOf("Video clinics")).toBe(
        "Patients, Video consultations, Carers",
      )
    },
  )

  it("leaves a name opened for renaming, and not changed, as it was read", async () => {
    const spaced = [
      createTestRoadmapItem("Spaced", {
        id: "item-1",
        tags: tagged("Clinic  staff"),
      }),
    ]
    const { user } = await renderPage({ shown: spaced })
    const { form, field } = await openTags(user, "Spaced")

    await user.click(field.getByRole("button", { name: "Rename Clinic staff" }))
    await done(user, form)

    expect(main().queryByText("Changed")).toBeNull()
  })
})

describe("An item with Welsh tags (STY-037 S20, S22)", () => {
  const NOTICE =
    "These tags have Welsh versions, so they can't be changed here yet."
  const welshItems: RoadmapItem[] = [
    createTestRoadmapItem("Paired", {
      id: "item-1",
      tags: [
        { en: "Patients", cy: "Cleifion" },
        { en: "Carers", cy: "Gofalwyr" },
      ],
      hasWelshTags: true,
    }),
    // One Welsh entry for two tags: none shows, and the cell holds it all the same.
    createTestRoadmapItem("Unpaired", {
      id: "item-2",
      tags: tagged("Patients", "Carers"),
      hasWelshTags: true,
    }),
    createTestRoadmapItem("English only", {
      id: "item-3",
      tags: tagged("Patients"),
    }),
  ]

  it.each(["Paired", "Unpaired"])(
    "shows the tags of %s with no button to change them, and says why (S20)",
    async (title) => {
      const { user } = await renderPage({ shown: welshItems })

      const form = await openForm(user, title)

      expect(form.getByText("Tags")).toBeVisible()
      expect(form.getAllByRole("list")[0]).toHaveTextContent("PatientsCarers")
      expect(form.getByText(NOTICE)).toBeVisible()
      expect(form.queryByRole("button", { name: /tags$/ })).toBeNull()
      expect(tagsLineOf(title)).toBeNull()
    },
  )

  it("shows them in Welsh, as the card does, on the Welsh interface (S20)", async () => {
    const { user } = await renderPage({ shown: welshItems, language: "cy" })

    await user.click(main().getByRole("button", { name: "Golygu Paired" }))
    const form = within(main().getByRole("form", { name: "Paired" }))

    expect(form.getAllByRole("list")[0]).toHaveTextContent("CleifionGofalwyr")
    expect(
      form.getByText(
        "Mae fersiynau Cymraeg o'r tagiau hyn, felly does dim modd eu newid yma eto.",
      ),
    ).toBeVisible()
    expect(form.queryByRole("button", { name: /tagiau$/ })).toBeNull()
  })

  it("edits and publishes the item's other fields, leaving its tags as they are (S20)", async () => {
    const { user, repository } = await renderPage({ shown: welshItems })
    const form = await openForm(user, "Paired")

    await user.type(form.getByRole("textbox", { name: "Phase" }), "Beta")
    await done(user, form)
    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    const [paired] = await repository.listRoadmapItems("producta")
    expect(paired).toMatchObject({
      phase: { en: "Beta", cy: "" },
      tags: welshItems[0]?.tags,
      hasWelshTags: true,
    })
  })

  it("keeps no tag change made in a form whose item gains Welsh tags while it is open (S20)", async () => {
    const { user, repository } = await renderPage({ shown: welshItems })
    const { form, field } = await openTags(user, "English only")
    await addTag(user, field, "Carers")
    repository.coLead((_list, itemsOf) => {
      const item = itemsOf("producta")[2]
      if (!item) return
      item.tags = [{ en: "Patients", cy: "Cleifion" }]
      item.hasWelshTags = true
    })

    await user.click(main().getByRole("button", { name: "Refresh" }))
    expect(await form.findByText(NOTICE)).toBeVisible()
    expect(form.queryByRole("button", { name: /tags$/ })).toBeNull()
    await done(user, form)

    expect(main().queryByText("Changed")).toBeNull()
    expect(tagsLineOf("English only")).toBe("Patients")
  })

  it("refuses a tag change to an item that has gained Welsh tags: it can be discarded, not kept (S22)", async () => {
    const { user, repository } = await renderPage({ shown: welshItems })
    const { form, field } = await openTags(user, "English only")
    await addTag(user, field, "Carers")
    await done(user, form)
    repository.coLead((_list, itemsOf) => {
      const item = itemsOf("producta")[2]
      if (!item) return
      item.tags = [{ en: "Patients", cy: "Cleifion" }]
      item.hasWelshTags = true
    })

    await publish(user)

    const review = await main().findByRole("alert")
    const conflict = within(within(review).getByRole("listitem"))
    expect(conflict.getByText(/: /, { selector: "p" })).toHaveTextContent(
      "English only: Tags",
    )
    expect(
      conflict.getByText(
        "These tags now have Welsh versions, so they can't be changed here yet.",
      ),
    ).toBeVisible()
    expect(conflict.queryByRole("button", { name: /^Keep mine/ })).toBeNull()
    expect(conflict.queryByRole("button", { name: /^Use theirs/ })).toBeNull()
    expect(within(review).queryByText(/^Choose which text/)).toBeNull()
    expect(
      main().getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "true")
    expect((await repository.listRoadmapItems("producta"))[2]?.tags).toEqual([
      { en: "Patients", cy: "Cleifion" },
    ])

    await user.click(
      conflict.getByRole("button", {
        name: "Discard my change English only: Tags",
      }),
    )

    expect(main().queryByRole("alert")).toBeNull()
    expect(main().queryByText("Changed")).toBeNull()
    expect(tagsLineOf("English only")).toBe("Patients")
    // Its tags can no longer be changed here.
    const again = await openForm(user, "English only")
    expect(again.getByText(NOTICE)).toBeVisible()
    expect(again.queryByRole("button", { name: /tags$/ })).toBeNull()
  })
})
