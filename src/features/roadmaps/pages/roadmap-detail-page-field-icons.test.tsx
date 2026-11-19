import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { TEST_ORGANISATIONS } from "@/domain/roadmap/testing/test-organisations"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { DESKTOP_WIDTH, TABLET_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { ITEMS_VIEW_STORAGE_KEY } from "../hooks/use-items-view"
import { fieldTerm } from "../testing/field-term"
import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import {
  confirmItemEdit,
  openAddItemDialog,
  openEditItemDialog,
} from "../testing/item-dialog"
import { confirmRemoval } from "../testing/removal-dialog"
import { openConflictReview } from "../testing/roadmap-page"

// STY-079: the tag icon before "Tags" and the building-complex icon before
// "Organisations", wherever the editor names them, and nowhere else. The icons are
// read by the class lucide gives each, and each must be hidden from assistive
// technology (S9): every name below is read as it was.

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

const tagged = (...tags: string[]) => tags.map((en) => ({ en, cy: "" }))

const items: RoadmapItem[] = [
  createTestRoadmapItem("Video clinics", {
    id: "item-1",
    description: { en: "Clinics by video.", cy: "" },
    tags: tagged("Patients"),
    organisationIds: ["cavuhb"],
  }),
  createTestRoadmapItem("Plain item", { id: "item-2", placement: "later" }),
  {
    ...createTestRoadmapItem("Welsh tagged", {
      id: "item-3",
      hasWelshTags: true,
      tags: [{ en: "Patients", cy: "Cleifion" }],
      organisationIds: ["sbuhb"],
    }),
    title: { en: "Welsh tagged", cy: "Wedi'i dagio" },
  },
]

/** The icons drawn inside `element`, by what each is, each hidden from assistive technology. */
function iconsIn(element: Element | null | undefined) {
  if (!element) throw new Error("No element to read the icons of")
  return Array.from(element.querySelectorAll("svg")).map((icon) => {
    expect(icon).toHaveAttribute("aria-hidden", "true")
    if (icon.classList.contains("lucide-tag")) return "tag"
    if (icon.classList.contains("lucide-building-complex")) return "building"
    return "other"
  })
}

function main() {
  return within(screen.getByRole("main"))
}

function item(title: string) {
  const li = main()
    .getByRole("heading", { level: 3, name: title })
    .closest("li")
  if (!li) throw new Error(`No item for ${title}`)
  return li
}

async function renderPage({
  language,
  compact = false,
}: { language?: Language; compact?: boolean } = {}) {
  if (compact) localStorage.setItem(ITEMS_VIEW_STORAGE_KEY, "compact")
  matchMediaQueries(TABLET_WIDTH, DESKTOP_WIDTH)
  const repository = createInMemoryRoadmapRepository(
    roadmaps,
    { producta: items },
    { families: [], categories: [], organisations: TEST_ORGANISATIONS },
  )
  const user = userEvent.setup()
  await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
    ...(language ? { language } : {}),
  })
  await main().findByRole("heading", { level: 3, name: "Video clinics" })
  return { user, repository }
}

async function publish(user: ReturnType<typeof userEvent.setup>) {
  await user.click(main().getByRole("button", { name: "Publish changes" }))
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Publish changes",
    }),
  )
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("a card (S1)", () => {
  it("shows the tag icon before Tags and the building icon before Organisations, and no other label an icon", async () => {
    await renderPage()
    const card = item("Video clinics")

    const tags = fieldTerm(card, "Tags")
    const organisations = fieldTerm(card, "Organisations")
    expect(tags && iconsIn(tags)).toEqual(["tag"])
    expect(organisations && iconsIn(organisations)).toEqual(["building"])
    // The icon comes before the word.
    const drawn = tags?.innerHTML ?? ""
    expect(drawn.indexOf("<svg")).toBeGreaterThanOrEqual(0)
    expect(drawn.indexOf("<svg")).toBeLessThan(drawn.indexOf(">Tags<"))
    expect(iconsIn(fieldTerm(card, "Description"))).toEqual([])
  })

  it("shows no label, and so no icon, for what the item lacks", async () => {
    await renderPage()
    const card = item("Plain item")

    expect(fieldTerm(card, "Tags")).toBeNull()
    expect(fieldTerm(card, "Organisations")).toBeNull()
    expect(card.querySelector("svg.lucide-tag")).toBeNull()
    expect(card.querySelector("svg.lucide-building-complex")).toBeNull()
  })

  it("leaves the words as they were for assistive technology (S9)", async () => {
    await renderPage()
    const card = item("Video clinics")

    expect(fieldTerm(card, "Tags")?.textContent).toBe("Tags")
    expect(fieldTerm(card, "Organisations")?.textContent).toBe("Organisations")
  })
})

describe("an opened compact row (S2)", () => {
  it("shows them as a card does, and the closed row no labels", async () => {
    const { user } = await renderPage({ compact: true })
    const row = item("Video clinics")
    expect(row.querySelector("dl")).toBeNull()

    await user.click(
      main().getByRole("button", { name: "Show the rest of Video clinics" }),
    )

    expect(iconsIn(row.querySelector("dl"))).toEqual(["tag", "building"])
  })
})

describe("the item form (S3, S4)", () => {
  it("shows them before Tags and Organisations, shut and open, the buttons named as they were", async () => {
    const { user } = await renderPage()
    const form = await openEditItemDialog(user, "Plain item")

    expect(iconsIn(form.getByText("Tags").parentElement)).toEqual(["tag"])
    expect(iconsIn(form.getByText("Organisations").parentElement)).toEqual([
      "building",
    ])
    await user.click(form.getByRole("button", { name: "Add tags" }))
    await user.click(form.getByRole("button", { name: "Add organisations" }))

    expect(form.getByRole("group", { name: "Tags" })).toBeVisible()
    expect(form.getByRole("group", { name: "Organisations" })).toBeVisible()
    expect(iconsIn(form.getByText("Tags").parentElement)).toEqual(["tag"])
    // No other label has one.
    expect(iconsIn(form.getByText("Title"))).toEqual([])
    expect(iconsIn(form.getByText("Details").parentElement)).toEqual([])
  })

  it("shows the Add form's the same", async () => {
    const { user } = await renderPage()
    const form = await openAddItemDialog(user)

    expect(iconsIn(form.getByText("Tags").parentElement)).toEqual(["tag"])
    expect(iconsIn(form.getByText("Organisations").parentElement)).toEqual([
      "building",
    ])
  })

  it("shows the locked Tags of an item with Welsh tags its icon, the note as it was", async () => {
    const { user } = await renderPage()
    const form = await openEditItemDialog(user, "Welsh tagged")

    const label = form.getByText("Tags").parentElement
    expect(iconsIn(label)).toEqual(["tag"])
    expect(
      form.getByText(
        "These tags have Welsh versions, so they can't be changed here yet.",
      ),
    ).toBeVisible()
  })
})

describe("the review of a refused publish (S5, S6)", () => {
  it("puts the icon in the first conflict's target line, and none in the hidden words of the buttons", async () => {
    const { user, repository } = await renderPage()
    const form = await openEditItemDialog(user, "Video clinics")
    await user.click(form.getByRole("button", { name: "Change tags" }))
    await user.type(form.getByRole("textbox", { name: "Add a tag" }), "Carers")
    await user.click(form.getByRole("button", { name: "Add tag" }))
    await user.click(form.getByRole("button", { name: "Change organisations" }))
    await user.click(
      form.getByRole("checkbox", { name: "Swansea Bay (SBUHB)" }),
    )
    await confirmItemEdit(user)
    repository.coLead((_roadmaps, itemsOf) => {
      const clinics = itemsOf("producta")[0]
      if (clinics) {
        clinics.tags = tagged("Their tag")
        clinics.organisationIds = ["bcuhb"]
      }
    })

    await publish(user)
    const review = await openConflictReview(user)

    const [tags, organisations] = within(review)
      .getAllByRole("listitem")
      .map((conflict) => conflict.querySelector(":scope > p"))
    expect(tags).toHaveTextContent("Video clinics: Tags")
    expect(tags && iconsIn(tags)).toEqual(["tag"])
    expect(organisations).toHaveTextContent("Video clinics: Organisations")
    expect(organisations && iconsIn(organisations)).toEqual(["building"])
    const keep = within(review).getByRole("button", {
      name: "Keep mine Video clinics: Tags",
    })
    expect(iconsIn(keep)).toEqual([])
    expect(
      within(review).getByRole("button", {
        name: "Use theirs Video clinics: Organisations",
      }),
    ).toBeVisible()
  })

  it("puts them before the labels of a removal's Current text, and no other", async () => {
    const { user, repository } = await renderPage()
    await confirmRemoval(user, "Video clinics")
    repository.coLead((_roadmaps, itemsOf) => {
      const clinics = itemsOf("producta")[0]
      if (clinics) {
        clinics.description = { en: "Their reason", cy: "" }
        clinics.tags = tagged("Their tag")
        clinics.organisationIds = ["bcuhb"]
      }
    })

    await publish(user)
    const review = await openConflictReview(user)

    const labels = within(review).getAllByRole("term")
    expect(labels.map(({ textContent }) => textContent)).toEqual([
      "Your change",
      "Current text",
      "Description",
      "Tags",
      "Organisations",
    ])
    expect(labels.map((label) => iconsIn(label))).toEqual([
      [],
      [],
      [],
      ["tag"],
      ["building"],
    ])
  })
})

describe("What changes (S7)", () => {
  it("lists the changed fields in order, an icon before Tags and Organisations and none before Title", async () => {
    const { user } = await renderPage()
    const form = await openEditItemDialog(user, "Video clinics")
    await user.type(form.getByRole("textbox", { name: "Title" }), "!")
    await user.click(form.getByRole("button", { name: "Change tags" }))
    await user.type(form.getByRole("textbox", { name: "Add a tag" }), "Carers")
    await user.click(form.getByRole("button", { name: "Add tag" }))
    await user.click(form.getByRole("button", { name: "Change organisations" }))
    await user.click(
      form.getByRole("checkbox", { name: "Swansea Bay (SBUHB)" }),
    )
    await confirmItemEdit(user)

    await user.click(main().getByRole("button", { name: "Publish changes" }))

    const line = within(screen.getByRole("alertdialog"))
      .getAllByRole("listitem")
      .find((each) => each.textContent.startsWith("Video clinics"))
    expect(line?.textContent).toBe("Video clinics!Title, Tags, Organisations")
    const fields = line?.lastElementChild
    expect(iconsIn(fields)).toEqual(["tag", "building"])
  })
})

describe("the Welsh interface (S11)", () => {
  it("shows the same icons before each Welsh label, the refusal's line reading in Welsh", async () => {
    const { user, repository } = await renderPage({ language: "cy" })
    const card = item("Video clinics")
    expect(fieldTerm(card, "Tagiau")).not.toBeNull()
    expect(iconsIn(fieldTerm(card, "Tagiau"))).toEqual(["tag"])
    expect(iconsIn(fieldTerm(card, "Sefydliadau"))).toEqual(["building"])

    const form = await openEditItemDialog(user, "Video clinics", "cy")
    expect(iconsIn(form.getByText("Tagiau (Saesneg)").parentElement)).toEqual([
      "tag",
    ])
    await user.click(
      form.getByRole("button", { name: /^(Newid|Ychwanegu) tagiau$/ }),
    )
    await user.type(
      form.getByRole("textbox", { name: "Ychwanegu tag" }),
      "Gofalwyr",
    )
    await user.click(form.getByRole("button", { name: "Ychwanegu tag" }))
    await confirmItemEdit(user, "cy")
    repository.coLead((_roadmaps, itemsOf) => {
      const clinics = itemsOf("producta")[0]
      if (clinics) clinics.tags = tagged("Eu tag")
    })
    await user.click(main().getByRole("button", { name: /^Cyhoeddi/ }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /^Cyhoeddi/,
      }),
    )
    await user.click(
      await main().findByRole("button", { name: "Adolygu'r newidiadau" }),
    )
    const review = await screen.findByRole("dialog", {
      name: "Mae rhywun arall wedi newid y map trywydd hwn hefyd",
    })
    const line = within(review)
      .getAllByRole("listitem")[0]
      ?.querySelector(":scope > p")
    expect(line).toHaveTextContent("Video clinics: Tagiau (Saesneg)")
    expect(line && iconsIn(line)).toEqual(["tag"])
  })
})
