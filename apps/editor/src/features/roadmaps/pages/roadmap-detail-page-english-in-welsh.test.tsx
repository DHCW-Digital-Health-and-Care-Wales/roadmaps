import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { DESKTOP_WIDTH, TABLET_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { confirmRemoval } from "../testing/removal-dialog"

// English shown in place of empty Welsh, marked `lang="en"` where the page shows it
// (STY-098). Which content is marked, and how a sentence carries the mark, are held by
// `shown-content.test.ts` and `content-text.test.tsx`; these hold that the page's
// views, its navigation and a dialog naming an item show content through them.

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

const items: RoadmapItem[] = [
  createTestRoadmapItem("First now", {
    id: "item-1",
    description: { en: "What the first is.", cy: "" },
  }),
  {
    ...createTestRoadmapItem("Online booking", { id: "item-2" }),
    title: { en: "Online booking", cy: "Archebu ar-lein" },
  },
]

function main() {
  return within(screen.getByRole("main"))
}

/** What `container` marks with a `lang` of its own, as `lang: text`. */
function marked(container: HTMLElement): string[] {
  return [...container.querySelectorAll("[lang]")].map(
    (element) =>
      `${element.getAttribute("lang") ?? ""}: ${element.textContent}`,
  )
}

async function renderPage(language: Language) {
  matchMediaQueries(TABLET_WIDTH, DESKTOP_WIDTH)
  const user = userEvent.setup()
  await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository: createInMemoryRoadmapRepository(roadmaps, { producta: items }),
    language,
  })
  await main().findByRole("heading", { level: 3, name: "First now" })
  return { user }
}

afterEach(() => {
  localStorage.clear()
})

describe("in Welsh, English shown in place of Welsh (S1)", () => {
  it("is marked on the roadmap's page, its cards and the navigation", async () => {
    await renderPage("cy")

    expect(marked(screen.getByRole("main"))).toEqual([
      "en: Product A roadmap",
      "en: First now",
      "en: What the first is.",
    ])
    expect(
      main().getByRole("heading", { level: 3, name: "Archebu ar-lein" }),
    ).not.toHaveAttribute("lang")
    const navigation = screen.getByRole("navigation", {
      name: "Mapiau trywydd",
    })
    expect(marked(navigation)).toEqual(["en: Product A roadmap"])
  })

  it("is marked in the compact view", async () => {
    const { user } = await renderPage("cy")

    await user.click(main().getByRole("button", { name: "Cryno" }))

    const row = main()
      .getByRole("heading", { level: 3, name: "First now" })
      .closest("li")
    if (!row) throw new Error("No row for First now")
    expect(marked(row)).toEqual(["en: First now", "en: What the first is."])
  })

  it("is marked alone in the Welsh question that names it, its button's name unmarked (S2, S3)", async () => {
    const { user } = await renderPage("cy")

    // A button's name can't mark part of itself: it holds the English as it is.
    await user.click(main().getByRole("button", { name: "Tynnu First now" }))

    const dialog = await screen.findByRole("dialog", {
      name: "Tynnu “First now”?",
    })
    expect(marked(dialog)).toEqual(["en: First now"])
  })
})

describe("in Welsh, the navigation's words for unpublished changes (S1, S2)", () => {
  it("keep the English title marked in their Welsh sentence", async () => {
    const { user } = await renderPage("cy")

    await confirmRemoval(user, "First now", { language: "cy" })

    // The entry's shown title is hidden then: these words name it to a screen reader.
    const navigation = screen.getByRole("navigation", {
      name: "Mapiau trywydd",
    })
    const spoken = await within(navigation).findByText(
      /^, newidiadau heb eu cyhoeddi$/,
    )
    expect(spoken).toHaveTextContent(
      "Product A roadmap, newidiadau heb eu cyhoeddi",
    )
    expect(marked(spoken)).toEqual(["en: Product A roadmap"])
  })
})

describe("in English (S1)", () => {
  it("marks nothing", async () => {
    await renderPage("en")

    expect(marked(screen.getByRole("main"))).toEqual([])
    expect(
      marked(screen.getByRole("navigation", { name: "Roadmaps" })),
    ).toEqual([])
  })
})
