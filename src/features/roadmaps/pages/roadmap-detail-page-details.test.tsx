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

type Pair = [text: string, level: number]
const detailed = (...lines: Pair[]) =>
  lines.map(([en, level]) => ({ text: { en, cy: "" }, level }))

const FOLLOW_UP = "Follow-up appointments in three specialties"
const IN_PERSON = "First appointments stay in person"
/** S1's details. */
const S1: Pair[] = [
  [FOLLOW_UP, 0],
  ["Dermatology", 1],
  ["Rheumatology", 1],
  [IN_PERSON, 0],
]
const VIDEO = "Video appointments"

const items: RoadmapItem[] = [
  createTestRoadmapItem(VIDEO, { id: "item-1", details: detailed(...S1) }),
  createTestRoadmapItem("Bare", { id: "item-2" }),
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

/** A nested list as pairs of text and level, in order. */
function pairsOf(list: Element | null | undefined): Pair[] {
  if (!list) return []
  return [...list.querySelectorAll("li")].map((entry) => {
    let level = 0
    for (
      let up = entry.parentElement;
      up && up !== list;
      up = up.parentElement
    ) {
      if (up.tagName === "UL") level += 1
    }
    return [entry.firstChild?.textContent ?? "", level]
  })
}

/** The item's details as its card's Details list shows them; none with no list. */
function cardDetails(title: string): Pair[] {
  const label = within(card(title)).queryByText("Details", { selector: "dt" })
  return pairsOf(label?.nextElementSibling?.querySelector("ul"))
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

/** Opens the item's form, its Details field still shut. */
async function openForm(user: User, title: string) {
  await user.click(main().getByRole("button", { name: `Edit ${title}` }))
  return within(main().getByRole("form", { name: title }))
}

/** Opens the item's form and its Details field: the form, and the field's group. */
async function openDetails(user: User, title = VIDEO) {
  const form = await openForm(user, title)
  await user.click(form.getByRole("button", { name: /^(Change|Add) details$/ }))
  return { form, field: within(form.getByRole("group", { name: "Details" })) }
}

/** The details the form shows while the field is shut or read-only: its last list. */
function shutList(form: Within) {
  const lists = form.getAllByRole("list")
  return lists
    .filter(
      (list) => !lists.some((other) => other !== list && other.contains(list)),
    )
    .at(-1)
}

const boxes = (field: Within) =>
  field.getAllByRole<HTMLTextAreaElement>("textbox")

/** The open field's details as pairs of text and level, read from each one's name. */
function written(field: Within): Pair[] {
  const all = boxes(field)
  const levelOf = (box: HTMLTextAreaElement): number => {
    const parent = /nested under “(.*)”$/.exec(
      box.getAttribute("aria-label") ?? "",
    )?.[1]
    if (parent === undefined) return 0
    const above = all
      .slice(0, all.indexOf(box))
      .findLast(({ value }) => value === parent)
    return above ? levelOf(above) + 1 : 1
  }
  return all.map((box) => [box.value, levelOf(box)])
}

/** The detail's text field, by its text. */
function box(field: Within, text: string) {
  const found = boxes(field).find(({ value }) => value === text)
  if (!found) throw new Error(`No detail ${text}`)
  return found
}

/** Puts the caret in the detail at `at`, by default at its end. */
async function caretIn(
  user: User,
  field: Within,
  text: string,
  at = text.length,
) {
  const target = box(field, text)
  await user.click(target)
  target.setSelectionRange(at, at)
  return target
}

/** The review's first conflict: its own list item, which holds the details' lists. */
function firstConflict(review: HTMLElement) {
  const [conflict] = within(review).getAllByRole("listitem")
  if (!conflict) throw new Error("The review shows no conflict")
  return within(conflict)
}

const status = (field: Within) => field.getByRole("status").textContent

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

const storedDetails = async (
  repository: InMemoryRoadmapRepository,
  index = 0,
) =>
  (await repository.listRoadmapItems("producta"))[index]?.details.map(
    ({ text, level }): Pair => [text.en, level],
  )

describe("Editing an item's details (STY-039)", () => {
  it("starts shut, the details as the card lists them beside Change details, with no editor and no Details list on the card (S17)", async () => {
    const { user } = await renderPage()
    expect(cardDetails(VIDEO)).toEqual(S1)

    const form = await openForm(user, VIDEO)

    expect(pairsOf(shutList(form))).toEqual(S1)
    expect(
      form.getByRole("button", { name: "Change details" }),
    ).toHaveAttribute("aria-expanded", "false")
    expect(form.queryByRole("group", { name: "Details" })).toBeNull()
    expect(form.queryByRole("textbox", { name: /^Detail / })).toBeNull()
    expect(cardDetails(VIDEO)).toEqual([])
  })

  it("reads No details beside Add details for an item with none, which holds one empty detail at the top level to write in (S12, S17)", async () => {
    const { user } = await renderPage()

    const form = await openForm(user, "Bare")
    expect(form.getByText("No details")).toBeVisible()
    await user.click(form.getByRole("button", { name: "Add details" }))
    const field = within(form.getByRole("group", { name: "Details" }))

    const only = field.getByRole("textbox", {
      name: "Detail 1 of 1, top level",
    })
    expect(only).toHaveFocus()
    await user.keyboard("Evening clinics")
    await done(user, form)

    expect(cardDetails("Bare")).toEqual([["Evening clinics", 0]])
  })

  it("opens the outline in place, focus in it, each detail in order at its level, named with its place (S1, S24)", async () => {
    const { user } = await renderPage()

    const { form, field } = await openDetails(user)

    expect(written(field)).toEqual(S1)
    expect(boxes(field).map((each) => each.getAttribute("aria-label"))).toEqual(
      [
        "Detail 1 of 4, top level",
        `Detail 2 of 4, nested under “${FOLLOW_UP}”`,
        `Detail 3 of 4, nested under “${FOLLOW_UP}”`,
        "Detail 4 of 4, top level",
      ],
    )
    expect(box(field, FOLLOW_UP)).toHaveFocus()
    expect(form.getByRole("button", { name: "Close details" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    expect(
      within(field.getByRole("group", { name: "The detail selected" }))
        .getAllByRole("button")
        .map(({ textContent }) => textContent),
    ).toEqual(
      ["Move out", "Move in", "Move up", "Move down", "Remove"].map(
        (word) => `${word} ${FOLLOW_UP}`,
      ),
    )
  })

  it("is Welsh on the Welsh interface, the details staying English (S1)", async () => {
    const { user } = await renderPage({ language: "cy" })
    await user.click(main().getByRole("button", { name: `Golygu ${VIDEO}` }))
    const form = within(main().getByRole("form", { name: VIDEO }))

    await user.click(form.getByRole("button", { name: "Newid manylion" }))
    const field = within(
      form.getByRole("group", { name: "Manylion (Saesneg)" }),
    )

    expect(boxes(field).map(({ value }) => value)).toEqual(
      S1.map(([text]) => text),
    )
    expect(
      field.getByRole("textbox", { name: "Manylyn 1 o 4, lefel uchaf" }),
    ).toBeVisible()
    expect(
      field.getByRole("button", { name: `Symud i mewn ${FOLLOW_UP}` }),
    ).toBeVisible()
    await user.click(
      field.getByRole("button", { name: `Symud allan ${FOLLOW_UP}` }),
    )
    expect(status(field)).toBe("Mae eisoes ar y lefel uchaf.")
  })

  it("keeps an added detail pending, on the card and in the publish dialog, writing nothing until published (S2, S14)", async () => {
    const { user, repository } = await renderPage()
    const { form, field } = await openDetails(user)
    const ADDED = "A test call before the first video appointment"

    await caretIn(user, field, IN_PERSON)
    await user.keyboard(`{Enter}${ADDED}`)
    await done(user, form)

    expect(cardDetails(VIDEO)).toEqual([...S1, [ADDED, 0]])
    expect(within(card(VIDEO)).getByText("Changed")).toBeVisible()
    expect(await storedDetails(repository)).toEqual(S1)
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    const dialog = within(screen.getByRole("alertdialog"))
    expect(dialog.getByRole("listitem")).toHaveTextContent(`${VIDEO}Details`)
    await user.click(dialog.getByRole("button", { name: "Publish changes" }))

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(await storedDetails(repository)).toEqual([...S1, [ADDED, 0]])
  })

  it("nests a detail under the one above it, to the third level, and says why where it can't (S3)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, "Dermatology")
    await user.keyboard("{Enter}Adult clinics first")
    await user.click(
      field.getByRole("button", { name: "Move in Adult clinics first" }),
    )

    expect(written(field)[2]).toEqual(["Adult clinics first", 2])
    expect(status(field)).toBe("Moved in, under “Dermatology”.")
    // Already under the detail above, which is at the third level.
    const moveIn = field.getByRole("button", {
      name: "Move in Adult clinics first",
    })
    expect(moveIn).toHaveAttribute("aria-disabled", "true")
    await user.click(moveIn)
    expect(status(field)).toBe("It is already nested under the detail above.")
    expect(field.getByRole("status")).toBeVisible()
    // The first detail has nothing to nest under.
    await caretIn(user, field, FOLLOW_UP)
    await user.click(
      field.getByRole("button", { name: `Move in ${FOLLOW_UP}` }),
    )
    expect(status(field)).toBe(
      "The first detail has nothing above it to nest under.",
    )
    // Rheumatology could nest under Adult clinics first only at a fourth level.
    await caretIn(user, field, "Rheumatology")
    await user.click(
      field.getByRole("button", { name: "Move in Rheumatology" }),
    )
    await user.click(
      field.getByRole("button", { name: "Move in Rheumatology" }),
    )
    expect(written(field)[3]).toEqual(["Rheumatology", 2])
    expect(status(field)).toBe(
      "A list has three levels, so this can't go deeper.",
    )
    await caretIn(user, field, "Dermatology")
    await user.click(field.getByRole("button", { name: "Move in Dermatology" }))
    expect(status(field)).toBe("It is already nested under the detail above.")

    await done(user, form)
    expect(cardDetails(VIDEO)).toEqual([
      [FOLLOW_UP, 0],
      ["Dermatology", 1],
      ["Adult clinics first", 2],
      ["Rheumatology", 2],
      [IN_PERSON, 0],
    ])
  })

  it("offers no fourth level: a detail whose nested details are at the third can't go deeper (S3)", async () => {
    const { user } = await renderPage({
      shown: [
        createTestRoadmapItem(VIDEO, {
          id: "item-1",
          details: detailed(["One", 0], ["Two", 1], ["Three", 1], ["Four", 2]),
        }),
      ],
    })
    const { field } = await openDetails(user)

    await caretIn(user, field, "Three")
    await user.click(field.getByRole("button", { name: "Move in Three" }))

    expect(status(field)).toBe(
      "A list has three levels, so this can't go deeper.",
    )
    expect(written(field)[2]).toEqual(["Three", 1])
  })

  it("moves a nested detail back out (S4)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, "Rheumatology")
    await user.click(
      field.getByRole("button", { name: "Move out Rheumatology" }),
    )
    await done(user, form)

    expect(cardDetails(VIDEO)).toEqual([
      [FOLLOW_UP, 0],
      ["Dermatology", 1],
      ["Rheumatology", 0],
      [IN_PERSON, 0],
    ])
  })

  it("keeps a detail's place and level when its text changes, and removes one whose text is cleared, those nested under it moving up (S5, D20)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, "Rheumatology")
    await user.keyboard(" and pain clinics")
    await user.clear(box(field, FOLLOW_UP))
    await done(user, form)

    expect(cardDetails(VIDEO)).toEqual([
      ["Dermatology", 0],
      ["Rheumatology and pain clinics", 0],
      [IN_PERSON, 0],
    ])
  })

  it("removes a detail alone, and shows no Details for an item with every detail removed (S6)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, IN_PERSON)
    await user.click(field.getByRole("button", { name: `Remove ${IN_PERSON}` }))
    expect(written(field)).toEqual(S1.slice(0, 3))
    await done(user, form)
    expect(cardDetails(VIDEO)).toEqual(S1.slice(0, 3))
    expect(within(card(VIDEO)).getByText("Changed")).toBeVisible()

    const again = await openDetails(user)
    for (const text of [FOLLOW_UP, "Dermatology", "Rheumatology"]) {
      await user.click(
        again.field.getByRole("button", { name: `Remove ${text}` }),
      )
    }
    expect(written(again.field)).toEqual([["", 0]])
    expect(boxes(again.field)[0]).toHaveFocus()
    await user.click(
      again.field.getByRole("button", { name: "Remove the empty detail" }),
    )
    expect(status(again.field)).toBe("There is no detail to remove.")
    await done(user, again.form)

    expect(cardDetails(VIDEO)).toEqual([])
    expect(
      within(card(VIDEO)).queryByText("Details", { selector: "dt" }),
    ).toBeNull()
  })

  it("moves a detail up or down past the one at its level, with those nested under it (S7, S23)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, IN_PERSON)
    await user.click(
      field.getByRole("button", { name: `Move up ${IN_PERSON}` }),
    )
    expect(status(field)).toBe("Moved up.")
    await user.click(
      field.getByRole("button", { name: `Move up ${IN_PERSON}` }),
    )
    expect(status(field)).toBe("It is already the first at its level.")
    await done(user, form)

    expect(cardDetails(VIDEO)).toEqual([[IN_PERSON, 0], ...S1.slice(0, 3)])
  })

  it("makes a detail of each pasted line, nested by its hyphens and trimmed, a blank line none (S8)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user, "Bare")

    await user.click(boxes(field)[0] as HTMLElement)
    await user.paste("  Evening clinics \n- Tuesdays\n\n-  Thursdays  ")

    expect(written(field)).toEqual([
      ["Evening clinics", 0],
      ["Tuesdays", 1],
      ["Thursdays", 1],
    ])
    expect(status(field)).toBe("Added 3 details.")
    expect(box(field, "Thursdays")).toHaveFocus()
    await done(user, form)
    expect(cardDetails("Bare")).toEqual([
      ["Evening clinics", 0],
      ["Tuesdays", 1],
      ["Thursdays", 1],
    ])
  })

  it("puts pasted lines after a detail that holds text and those nested under it (D22)", async () => {
    const { user } = await renderPage()
    const { field } = await openDetails(user)

    await caretIn(user, field, FOLLOW_UP)
    await user.paste("Paediatrics\n- Under 16s")

    expect(written(field)).toEqual([
      ...S1.slice(0, 3),
      ["Paediatrics", 0],
      ["Under 16s", 1],
      [IN_PERSON, 0],
    ])
  })

  it("nests a detail for each hyphen typed or pasted before its text, which never holds one (S9, D21)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, "Rheumatology")
    await user.keyboard("{Enter}-Pain clinics")
    expect(written(field)[3]).toEqual(["Pain clinics", 2])
    expect(box(field, "Pain clinics")).toHaveFocus()

    await caretIn(user, field, IN_PERSON)
    await user.keyboard("{Enter}")
    await user.paste("- -5 degrees")
    expect(written(field).at(-1)).toEqual(["5 degrees", 1])
    expect(status(field)).toBe("It is already nested under the detail above.")

    await done(user, form)
    expect(cardDetails(VIDEO).slice(3)).toEqual([
      ["Pain clinics", 2],
      [IN_PERSON, 0],
      ["5 degrees", 1],
    ])
  })

  it("leaves the details as they were on Cancel, with nothing pending (S11)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, "Rheumatology")
    await user.keyboard("{Enter}Diabetes")
    await user.click(field.getByRole("button", { name: "Move out Diabetes" }))
    await user.click(field.getByRole("button", { name: "Move up Diabetes" }))
    await user.click(field.getByRole("button", { name: "Remove Diabetes" }))
    await user.click(form.getByRole("button", { name: "Cancel" }))

    expect(cardDetails(VIDEO)).toEqual(S1)
    expect(main().queryByText("Changed")).toBeNull()
  })

  it("shows the details as read on Undo changes (S11)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)
    await caretIn(user, field, IN_PERSON)
    await user.click(field.getByRole("button", { name: `Remove ${IN_PERSON}` }))
    await done(user, form)

    await user.click(
      main().getByRole("button", { name: `Undo changes ${VIDEO}` }),
    )

    expect(cardDetails(VIDEO)).toEqual(S1)
    expect(main().queryByText("Changed")).toBeNull()
  })

  it("is no change when a detail is added and removed again (S11)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, IN_PERSON)
    await user.keyboard("{Enter}Diabetes")
    await user.click(field.getByRole("button", { name: "Remove Diabetes" }))
    await done(user, form)

    expect(main().queryByText("Changed")).toBeNull()
  })

  it("shuts keeping text typed, the list showing the details as changed, and Done keeps them with the field shut (S10, S17)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, IN_PERSON)
    await user.keyboard("{Enter}Evening clinics{Enter}")
    const close = form.getByRole("button", { name: "Close details" })
    await user.click(close)
    await vi.waitFor(() => {
      expect(form.queryByRole("group", { name: "Details" })).toBeNull()
    })

    expect(form.getByRole("button", { name: "Change details" })).toHaveFocus()
    expect(pairsOf(shutList(form))).toEqual([...S1, ["Evening clinics", 0]])
    await done(user, form)
    expect(cardDetails(VIDEO)).toEqual([...S1, ["Evening clinics", 0]])
  })

  it("does everything by keyboard alone, the Tab key always moving on, each change announced and focus staying in the field (S13)", async () => {
    const { user } = await renderPage()
    const { field } = await openDetails(user)
    const button = (word: string, detail: string) =>
      field.getByRole("button", { name: `${word} ${detail}` })

    // Add, after the first detail's nested ones: at the end of the last.
    await user.click(box(field, IN_PERSON))
    await user.keyboard("{Enter}")
    expect(status(field)).toBe("New detail at the top level.")
    await user.keyboard("Evening clinics")
    // Tab moves to the buttons: it never nests the detail.
    await user.tab()
    expect(button("Move out", "Evening clinics")).toHaveFocus()
    expect(written(field).at(-1)).toEqual(["Evening clinics", 0])
    await user.tab()
    expect(button("Move in", "Evening clinics")).toHaveFocus()
    // Nest it, then move it out, focus staying on each button.
    await user.keyboard("{Enter}")
    expect(written(field).at(-1)).toEqual(["Evening clinics", 1])
    expect(status(field)).toBe(`Moved in, under “${IN_PERSON}”.`)
    expect(button("Move in", "Evening clinics")).toHaveFocus()
    await user.tab({ shift: true })
    await user.keyboard(" ")
    expect(status(field)).toBe("Moved out, to the top level.")
    expect(button("Move out", "Evening clinics")).toHaveFocus()
    // A refusal is announced too.
    await user.keyboard(" ")
    expect(status(field)).toBe("It is already at the top level.")
    // Move it up.
    await user.tab()
    await user.tab()
    await user.keyboard("{Enter}")
    expect(status(field)).toBe("Moved up.")
    expect(button("Move up", "Evening clinics")).toHaveFocus()
    expect(written(field).slice(3)).toEqual([
      ["Evening clinics", 0],
      [IN_PERSON, 0],
    ])
    // Change its text: Shift+Tab back to the list's one stop.
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(box(field, "Evening clinics")).toHaveFocus()
    await user.keyboard("{End} on Tuesdays")
    // Remove it: focus goes to the text of the detail now in its place.
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    expect(button("Remove", "Evening clinics on Tuesdays")).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(status(field)).toBe("Removed “Evening clinics on Tuesdays”.")
    expect(box(field, IN_PERSON)).toHaveFocus()
    expect(written(field)).toEqual(S1)
    // The last detail removed: focus goes to the one before.
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.keyboard("{Enter}")
    expect(box(field, "Rheumatology")).toHaveFocus()
  })

  it("starts the next detail on Enter, at this one's level, splits one at the caret, and joins those nested at the end of a detail that has some (S21, D16)", async () => {
    const { user } = await renderPage()
    const { field } = await openDetails(user)

    await caretIn(user, field, "Rheumatology")
    await user.keyboard("{Enter}")
    expect(status(field)).toBe(`New detail under “${FOLLOW_UP}”.`)
    await user.keyboard("Adult clinics first")
    expect(written(field)[3]).toEqual(["Adult clinics first", 1])
    expect(box(field, "Adult clinics first")).toHaveFocus()

    await caretIn(user, field, "Adult clinics first", 13)
    await user.keyboard("{Enter}")
    expect(written(field).slice(3, 5)).toEqual([
      ["Adult clinics", 1],
      ["first", 1],
    ])
    expect(box(field, "first")).toHaveFocus()
    expect(box(field, "first").selectionStart).toBe(0)

    await caretIn(user, field, FOLLOW_UP)
    await user.keyboard("{Enter}Cardiology")
    expect(written(field).slice(0, 3)).toEqual([
      [FOLLOW_UP, 0],
      ["Cardiology", 1],
      ["Dermatology", 1],
    ])
  })

  it("names a detail nested under one with no text by the empty detail", async () => {
    const { user } = await renderPage()
    const { field } = await openDetails(user)

    // An empty detail after Dermatology, then Rheumatology nested under it.
    await caretIn(user, field, "Dermatology")
    await user.keyboard("{Enter}")
    await caretIn(user, field, "Rheumatology")
    await user.click(
      field.getByRole("button", { name: "Move in Rheumatology" }),
    )

    expect(status(field)).toBe("Moved in, under “the empty detail”.")
    expect(
      field.getByRole("textbox", {
        name: "Detail 4 of 5, nested under “the empty detail”",
      }),
    ).toHaveValue("Rheumatology")
  })

  it("moves an empty nested detail out on Enter, and does nothing in an empty top-level one (S21, D17)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, "Rheumatology")
    await user.keyboard("{Enter}{Enter}")
    expect(written(field)[3]).toEqual(["", 0])
    expect(status(field)).toBe("Moved out, to the top level.")
    await user.keyboard("{Enter}")

    expect(written(field)).toHaveLength(5)
    expect(written(field)[3]).toEqual(["", 0])
    // Enter never confirms the form from a detail.
    expect(form.getByRole("button", { name: "Done" })).toBeVisible()
  })

  it("moves a nested detail out on Backspace at its start, joins a top-level one to the detail above, and does nothing in the first (S22)", async () => {
    const { user } = await renderPage({
      shown: [
        createTestRoadmapItem(VIDEO, {
          id: "item-1",
          details: detailed(
            [FOLLOW_UP, 0],
            ["Rheumatology", 1],
            ["In person", 0],
            ["First appointments", 1],
          ),
        }),
      ],
    })
    const { field } = await openDetails(user)

    await caretIn(user, field, "Rheumatology", 0)
    await user.keyboard("{Backspace}")
    expect(written(field)[1]).toEqual(["Rheumatology", 0])
    expect(status(field)).toBe("Moved out, to the top level.")

    await caretIn(user, field, "In person", 0)
    await user.keyboard("{Backspace}")
    expect(written(field)).toEqual([
      [FOLLOW_UP, 0],
      ["RheumatologyIn person", 0],
      ["First appointments", 1],
    ])
    const joined = box(field, "RheumatologyIn person")
    expect(joined).toHaveFocus()
    expect(joined.selectionStart).toBe("Rheumatology".length)
    expect(status(field)).toBe("Joined to the detail above.")

    await caretIn(user, field, FOLLOW_UP, 0)
    await user.keyboard("{Backspace}")
    expect(written(field)[0]).toEqual([FOLLOW_UP, 0])

    // A detail with no text is removed that way.
    await caretIn(user, field, FOLLOW_UP)
    await user.keyboard("{Enter}{Backspace}")
    expect(written(field)).toHaveLength(3)
    expect(status(field)).toBe("Removed the empty detail.")
    expect(box(field, FOLLOW_UP)).toHaveFocus()
  })

  it("puts the caret back in the detail's text after a move chosen with a pointer, and marks the detail the buttons act on (S23)", async () => {
    const { user } = await renderPage()
    const { field } = await openDetails(user)

    const rheumatology = await caretIn(user, field, "Rheumatology", 5)
    expect(rheumatology.closest("li")).toHaveClass("bg-muted")
    expect(box(field, "Dermatology").closest("li")).not.toHaveClass("bg-muted")
    await user.click(
      field.getByRole("button", { name: "Move up Rheumatology" }),
    )

    expect(written(field).slice(1, 3)).toEqual([
      ["Rheumatology", 1],
      ["Dermatology", 1],
    ])
    expect(box(field, "Rheumatology")).toHaveFocus()
    expect(box(field, "Rheumatology").selectionStart).toBe(5)
    // A refusal by pointer goes back to the text too.
    await user.click(
      field.getByRole("button", { name: "Move up Rheumatology" }),
    )
    expect(status(field)).toBe("It is already the first at its level.")
    expect(box(field, "Rheumatology")).toHaveFocus()
  })

  it("is one stop for the Tab key, in the detail last written in, and the arrows move between details at a detail's start and end (S24)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    expect(boxes(field).map(({ tabIndex }) => tabIndex)).toEqual([
      0, -1, -1, -1,
    ])
    await caretIn(user, field, "Dermatology")
    await user.keyboard("{ArrowDown}")
    expect(box(field, "Rheumatology")).toHaveFocus()
    expect(box(field, "Rheumatology").selectionStart).toBe(0)
    await user.keyboard("{ArrowUp}")
    expect(box(field, "Dermatology")).toHaveFocus()
    expect(box(field, "Dermatology").selectionStart).toBe(11)
    await user.keyboard("{ArrowUp}")
    expect(box(field, "Dermatology")).toHaveFocus()

    expect(boxes(field).map(({ tabIndex }) => tabIndex)).toEqual([
      -1, 0, -1, -1,
    ])
    await user.tab()
    expect(
      field.getByRole("button", { name: "Move out Dermatology" }),
    ).toHaveFocus()
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(form.getByRole("button", { name: "Close details" })).toHaveFocus()
  })

  it("puts a removed detail back in its place on Undo, with those nested under it as they were (S25)", async () => {
    const { user } = await renderPage()
    const { form, field } = await openDetails(user)

    await caretIn(user, field, FOLLOW_UP)
    await user.click(field.getByRole("button", { name: `Remove ${FOLLOW_UP}` }))

    expect(written(field)).toEqual([
      ["Dermatology", 0],
      ["Rheumatology", 0],
      [IN_PERSON, 0],
    ])
    expect(status(field)).toBe(
      `Removed “${FOLLOW_UP}”. The 2 details under it moved up a level.`,
    )
    expect(box(field, "Dermatology")).toHaveFocus()
    await user.click(
      field.getByRole("button", { name: `Undo removing ${FOLLOW_UP}` }),
    )

    expect(written(field)).toEqual(S1)
    expect(status(field)).toBe(`Put back “${FOLLOW_UP}”.`)
    expect(box(field, FOLLOW_UP)).toHaveFocus()
    expect(field.queryByRole("button", { name: /^Undo/ })).toBeNull()
    await done(user, form)
    expect(main().queryByText("Changed")).toBeNull()
  })

  it("shows a co-lead's different details beside yours, each nested as it will read, to keep or use (S15)", async () => {
    const { user, repository } = await renderPage()
    const { form, field } = await openDetails(user)
    await caretIn(user, field, "Dermatology")
    await user.keyboard("{Enter}-Adult clinics first")
    await done(user, form)
    const THEIRS: Pair[] = [
      [FOLLOW_UP, 0],
      ["Diabetes", 1],
    ]
    repository.coLead((_list, itemsOf) => {
      const video = itemsOf("producta")[0]
      if (video) video.details = detailed(...THEIRS)
    })

    await publish(user)

    const review = await main().findByRole("alert")
    const conflict = firstConflict(review)
    expect(conflict.getByText(/: /, { selector: "p" })).toHaveTextContent(
      `${VIDEO}: Details`,
    )
    const MINE: Pair[] = [
      [FOLLOW_UP, 0],
      ["Dermatology", 1],
      ["Adult clinics first", 2],
      ["Rheumatology", 1],
      [IN_PERSON, 0],
    ]
    expect(
      conflict
        .getAllByRole("definition")
        .map((value) => pairsOf(value.querySelector("ul"))),
    ).toEqual([MINE, THEIRS])
    expect(await storedDetails(repository)).toEqual(THEIRS)
    await user.click(
      conflict.getByRole("button", { name: `Keep mine ${VIDEO}: Details` }),
    )
    expect(cardDetails(VIDEO)).toEqual(MINE)
    await publish(user)
    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(await storedDetails(repository)).toEqual(MINE)
  })

  it("takes a co-lead's details that show as the same list as no conflict, and Refresh drops a change the data source holds (S15)", async () => {
    const { user, repository } = await renderPage()
    const { form, field } = await openDetails(user)
    await caretIn(user, field, IN_PERSON)
    await user.click(field.getByRole("button", { name: `Remove ${IN_PERSON}` }))
    await done(user, form)
    // The same list, every line a hyphen deeper.
    repository.coLead((_list, itemsOf) => {
      const video = itemsOf("producta")[0]
      if (video) {
        video.details = detailed(
          [FOLLOW_UP, 1],
          ["Dermatology", 2],
          ["Rheumatology", 2],
        )
      }
    })

    await user.click(main().getByRole("button", { name: "Refresh" }))

    await vi.waitFor(() => {
      expect(within(card(VIDEO)).queryByText("Changed")).toBeNull()
    })
    expect(cardDetails(VIDEO)).toEqual(S1.slice(0, 3))
  })
})

describe("Details written another way (STY-039 S20)", () => {
  const written20 = [
    createTestRoadmapItem("Hyphens", {
      id: "item-1",
      details: detailed(["One", 1], ["Two", 2], ["Three", 1]),
    }),
    createTestRoadmapItem("Skipped", {
      id: "item-2",
      details: detailed(["One", 0], ["Two", 2]),
    }),
    createTestRoadmapItem("Deep", {
      id: "item-3",
      details: detailed(["One", 0], ["Two", 1], ["Three", 2], ["Four", 3]),
    }),
    createTestRoadmapItem("Cold", {
      id: "item-4",
      details: detailed(["Storage", 0], ["-5 degrees", 1]),
    }),
  ]

  it.each([
    [
      "Hyphens",
      [
        ["One", 0],
        ["Two", 1],
        ["Three", 0],
      ],
    ],
    [
      "Skipped",
      [
        ["One", 0],
        ["Two", 1],
      ],
    ],
    [
      "Deep",
      [
        ["One", 0],
        ["Two", 1],
        ["Three", 2],
        ["Four", 2],
      ],
    ],
    [
      "Cold",
      [
        ["Storage", 0],
        ["5 degrees", 1],
      ],
    ],
  ] satisfies [string, Pair[]][])(
    "shows %s at the levels the card shows them, and confirming without a change is no pending edit",
    async (title, shown) => {
      const { user } = await renderPage({ shown: written20 })

      const { form, field } = await openDetails(user, title)
      expect(written(field)).toEqual(shown)
      await done(user, form)

      expect(main().queryByText("Changed")).toBeNull()
    },
  )

  it.each(["Deep", "Cold"])(
    "shows %s as the card lists them until the field is first opened, then at the levels it will write (S17, D12)",
    async (title) => {
      const { user } = await renderPage({ shown: written20 })
      const listed = cardDetails(title)

      const form = await openForm(user, title)
      expect(pairsOf(shutList(form))).toEqual(listed)

      await user.click(form.getByRole("button", { name: "Change details" }))
      await user.click(form.getByRole("button", { name: "Close details" }))
      await vi.waitFor(() => {
        expect(form.queryByRole("group", { name: "Details" })).toBeNull()
      })
      expect(pairsOf(shutList(form))).not.toEqual(listed)
    },
  )

  it("writes the details at the levels shown once they change, without a hyphen read after the nesting", async () => {
    const { user, repository } = await renderPage({ shown: written20 })
    const { form, field } = await openDetails(user, "Cold")

    await caretIn(user, field, "5 degrees")
    await user.keyboard("{Enter}Checked daily")
    await done(user, form)
    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    expect(await storedDetails(repository, 3)).toEqual([
      ["Storage", 0],
      ["5 degrees", 1],
      ["Checked daily", 1],
    ])
  })
})

describe("An item with Welsh details (STY-039 S18, S19)", () => {
  const NOTICE =
    "These details have Welsh versions, so they can't be changed here yet."
  const welshItems = [
    createTestRoadmapItem("Paired", {
      id: "item-1",
      details: [
        { text: { en: "Follow-up", cy: "Dilynol" }, level: 0 },
        { text: { en: "Dermatology", cy: "Dermatoleg" }, level: 1 },
      ],
      hasWelshDetails: true,
    }),
    createTestRoadmapItem("Unpaired", {
      id: "item-2",
      details: detailed(["Follow-up", 0]),
      hasWelshDetails: true,
    }),
    createTestRoadmapItem("English only", {
      id: "item-3",
      details: detailed(["Follow-up", 0]),
    }),
    createTestRoadmapItem("Welsh alone", {
      id: "item-4",
      hasWelshDetails: true,
    }),
  ]

  it.each(["Paired", "Unpaired"])(
    "shows the details of %s with no button to change them, and says why",
    async (title) => {
      const { user } = await renderPage({ shown: welshItems })

      const form = await openForm(user, title)

      expect(form.getByText(NOTICE)).toBeVisible()
      expect(form.queryByRole("button", { name: /details$/ })).toBeNull()
      expect(pairsOf(shutList(form))[0]).toEqual(["Follow-up", 0])
    },
  )

  it("shows them in Welsh on the Welsh interface, as the card does, and No details where only the Welsh cell holds anything", async () => {
    const { user } = await renderPage({ shown: welshItems, language: "cy" })
    await user.click(main().getByRole("button", { name: "Golygu Paired" }))
    const form = within(main().getByRole("form", { name: "Paired" }))

    expect(pairsOf(shutList(form))).toEqual([
      ["Dilynol", 0],
      ["Dermatoleg", 1],
    ])
    await user.click(form.getByRole("button", { name: "Canslo" }))
    await user.click(main().getByRole("button", { name: "Golygu Welsh alone" }))
    expect(
      within(main().getByRole("form", { name: "Welsh alone" })).getByText(
        "Dim manylion",
      ),
    ).toBeVisible()
  })

  it("edits and publishes the item's other fields, leaving its details as they are (S18)", async () => {
    const { user, repository } = await renderPage({ shown: welshItems })
    const form = await openForm(user, "Paired")

    await user.type(form.getByRole("textbox", { name: "Phase" }), "Beta")
    await done(user, form)
    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    const [paired] = await repository.listRoadmapItems("producta")
    expect(paired).toMatchObject({
      phase: { en: "Beta", cy: "" },
      details: welshItems[0]?.details,
      hasWelshDetails: true,
    })
  })

  it("keeps no change of details made in a form whose item gains Welsh details while it is open (S18)", async () => {
    const { user, repository } = await renderPage({ shown: welshItems })
    const { form, field } = await openDetails(user, "English only")
    await caretIn(user, field, "Follow-up")
    await user.keyboard("{Enter}Diabetes")
    repository.coLead((_list, itemsOf) => {
      const item = itemsOf("producta")[2]
      if (!item) return
      item.details = [{ text: { en: "Follow-up", cy: "Dilynol" }, level: 0 }]
      item.hasWelshDetails = true
    })

    await user.click(main().getByRole("button", { name: "Refresh" }))
    expect(await form.findByText(NOTICE)).toBeVisible()
    await done(user, form)

    expect(main().queryByText("Changed")).toBeNull()
  })

  it("refuses a change of details to an item that has gained Welsh details: it can be discarded, not kept (S19)", async () => {
    const { user, repository } = await renderPage({ shown: welshItems })
    const { form, field } = await openDetails(user, "English only")
    await caretIn(user, field, "Follow-up")
    await user.keyboard("{Enter}Diabetes")
    await done(user, form)
    const theirs = [{ text: { en: "Follow-up", cy: "Dilynol" }, level: 0 }]
    repository.coLead((_list, itemsOf) => {
      const item = itemsOf("producta")[2]
      if (!item) return
      item.details = theirs
      item.hasWelshDetails = true
    })

    await publish(user)

    const review = await main().findByRole("alert")
    const conflict = firstConflict(review)
    expect(conflict.getByText(/: /, { selector: "p" })).toHaveTextContent(
      "English only: Details",
    )
    expect(
      conflict.getByText(
        "These details now have Welsh versions, so they can't be changed here yet.",
      ),
    ).toBeVisible()
    expect(conflict.queryByRole("button", { name: /^Keep mine/ })).toBeNull()
    expect(conflict.queryByRole("button", { name: /^Use theirs/ })).toBeNull()
    expect(within(review).queryByText(/^Choose which text/)).toBeNull()
    expect((await repository.listRoadmapItems("producta"))[2]?.details).toEqual(
      theirs,
    )

    await user.click(
      conflict.getByRole("button", {
        name: "Discard my change English only: Details",
      }),
    )

    expect(main().queryByRole("alert")).toBeNull()
    expect(main().queryByText("Changed")).toBeNull()
    expect(cardDetails("English only")).toEqual([["Follow-up", 0]])
    // Its details can no longer be changed here.
    const again = await openForm(user, "English only")
    expect(again.getByText(NOTICE)).toBeVisible()
  })
})
