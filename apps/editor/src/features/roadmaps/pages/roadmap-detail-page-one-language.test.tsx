import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { TEST_ORGANISATIONS } from "@/domain/roadmap/testing/test-organisations"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { confirmItemEdit, openEditItemDialog } from "../testing/item-dialog"
import { marked } from "../testing/marked"
import { confirmRemoval } from "../testing/removal-dialog"
import { editRoadmapText } from "../testing/roadmap-dialog"
import { openConflictReview } from "../testing/roadmap-page"

// Text the editor shows in one language whatever the interface's is marked where the
// two differ (DEF-033 S1): organisations' short names, the English being edited, and
// a conflict's English values and Welsh. `shown-content.test.ts` holds the rule; these
// hold that each place shows its text through it.

const roadmaps = [
  createTestRoadmap("producta", "Product A roadmap", {
    vision: { en: "A clear vision.", cy: "" },
    productLead: "Alex Jones",
  }),
]

const detail = (en: string) => ({ text: { en, cy: "" }, level: 0 })

/** Its Welsh title leaves only text in one language to mark. */
const booking: RoadmapItem = {
  ...createTestRoadmapItem("Online booking", {
    id: "item-1",
    tags: [{ en: "Patients", cy: "" }],
    organisationIds: ["national"],
    details: [detail("Book by phone")],
  }),
  title: { en: "Online booking", cy: "Archebu ar-lein" },
}

const other = createTestRoadmapItem("Reminders", {
  id: "item-2",
  tags: [{ en: "Clinics", cy: "" }],
})

function main() {
  return within(screen.getByRole("main"))
}

async function renderPage(language: Language, items: RoadmapItem[]) {
  const user = userEvent.setup()
  const repository = createInMemoryRoadmapRepository(
    roadmaps,
    { producta: items },
    { organisations: TEST_ORGANISATIONS },
  )
  const rendered = await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
    language,
  })
  await main().findByRole("heading", { level: 3, name: "Reminders" })
  return { user, repository, ...rendered }
}

afterEach(() => {
  localStorage.clear()
})

describe("In Welsh, an item's text in English alone (DEF-033 S1)", () => {
  it("marks its organisations' short names on its card", async () => {
    await renderPage("cy", [booking, other])

    const card = main()
      .getByRole("heading", { level: 3, name: "Archebu ar-lein" })
      .closest("li")
    if (!card) throw new Error("No card")
    expect(marked(card)).toContain("en: All Wales")
  })

  it("marks the tags, organisations and details its form shows, shut and open", async () => {
    const { user } = await renderPage("cy", [booking, other])
    const form = await openEditItemDialog(user, "Archebu ar-lein", "cy")
    const dialog = screen.getByRole("dialog")

    expect(marked(dialog)).toEqual([
      "en: Patients",
      "en: All Wales",
      "en: Book by phone",
    ])

    await user.click(form.getByRole("button", { name: "Newid sefydliadau" }))
    expect(marked(dialog)).toEqual(
      expect.arrayContaining([
        "en: All Wales (National)",
        "en: Swansea Bay (SBUHB)",
      ]),
    )

    await user.click(form.getByRole("button", { name: "Newid tagiau" }))
    // The tag's row, then the other items' tag offered under the field.
    expect(marked(dialog)).toEqual(
      expect.arrayContaining(["en: Patients", "en: Clinics"]),
    )
  })

  it("marks nothing in the English interface", async () => {
    const { user } = await renderPage("en", [booking, other])
    const form = await openEditItemDialog(user, "Online booking")
    await user.click(form.getByRole("button", { name: "Change organisations" }))
    await user.click(form.getByRole("button", { name: "Change tags" }))

    expect(marked(screen.getByRole("dialog"))).toEqual([])
    expect(marked(screen.getByRole("main", { hidden: true }))).toEqual([])
  })
})

describe("A conflict's text in one language (DEF-033 S1)", () => {
  const fax = createTestRoadmapItem("Fax referrals", {
    id: "item-3",
    description: { en: "Fax still works", cy: "" },
    expectedOutcome: { en: "Fewer faxes", cy: "Llai o ffacsys" },
  })

  /**
   * A publish refused over each kind of value: the roadmap's text and product lead,
   * an item's text, placement, organisations and details, and a removed item whose
   * Welsh a co-lead changed. Reviewed in English.
   */
  async function refusedPublish() {
    const rendered = await renderPage("en", [other, fax])
    const { user, repository } = rendered
    await editRoadmapText(user, "Vision", "My vision.")
    await editRoadmapText(user, "Product lead", "Sam Evans")
    const form = await openEditItemDialog(user, "Reminders")
    await user.selectOptions(
      form.getByRole("combobox", { name: "Horizon or section" }),
      "next",
    )
    await user.click(form.getByRole("button", { name: "Add organisations" }))
    await user.click(
      form.getByRole("checkbox", { name: "All Wales (National)" }),
    )
    await user.click(form.getByRole("button", { name: "Add details" }))
    await user.keyboard("My detail")
    await user.type(form.getByRole("textbox", { name: "Phase" }), "Alpha")
    await confirmItemEdit(user)
    await confirmRemoval(user, "Fax referrals")
    repository.coLead((all, itemsOf) => {
      const roadmap = all.find(({ id }) => id === "producta")
      if (roadmap) {
        roadmap.vision = { en: "Their vision.", cy: "" }
        roadmap.productLead = "Jo Bloggs"
      }
      for (const item of itemsOf("producta")) {
        if (item.id === "item-2") {
          item.placement = "not-doing"
          item.organisationIds = ["sbuhb"]
          item.details = [detail("Their detail")]
          item.phase = { en: "Beta", cy: "" }
        } else {
          item.description = {
            en: "Fax still works",
            cy: "Mae ffacs yn gweithio",
          }
          item.expectedOutcome = { en: "Fewer faxes", cy: "" }
        }
      }
    })
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )
    const review = await openConflictReview(user)
    return { ...rendered, review }
  }

  /** What each conflict's values mark, without the lead-ins that name an item. */
  const markedValues = (review: HTMLElement) =>
    [...review.querySelectorAll("dd")]
      // A removal's "Current text" holds a list of its own: read its entries alone.
      .filter((each) => each.querySelector("dd") === null)
      .flatMap(marked)

  it("is marked where it differs from the interface: its English values in Welsh, a removed item's Welsh in English", async () => {
    const { review, i18n } = await refusedPublish()

    expect(markedValues(review)).toEqual(["cy: Mae ffacs yn gweithio"])

    await act(() => i18n.changeLanguage("cy"))

    // The placements, the product leads' names and "No text" are not marked.
    expect(markedValues(review)).toEqual([
      "en: My vision.",
      "en: Their vision.",
      "en: Alpha",
      "en: Beta",
      "en: All Wales",
      "en: Swansea Bay",
      "en: My detail",
      "en: Their detail",
      "en: Fax still works",
      "en: Fewer faxes",
    ])
    expect(review).toHaveTextContent("Yn Gymraeg: ")
  })
})
