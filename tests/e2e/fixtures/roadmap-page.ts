import type { Locator, Page } from "@playwright/test"

import { EXAMPLE_SPREADSHEET, type FakeTab, withTabRows } from "./fake-sheets"
import { type Language, useLanguage } from "./look"
import { connect, expect } from "./test"

// A roadmap's page as STY-052 and STY-053 shaped it: Refresh and "Unpublish roadmap" in
// the title row's More, a publish someone else's changes stopped reviewed in a dialog,
// opened from its notice at the foot, and "About this roadmap" folded to one line.

const COPY = {
  en: {
    connect: "Connect Google",
    showMore: "Show more",
    about: "About this roadmap",
    more: "More",
    refresh: "Refresh",
    review: "Review the changes",
    refused: "Someone else has changed this roadmap too",
  },
  cy: {
    connect: "Cysylltu â Google",
    showMore: "Dangos mwy",
    about: "Ynglŷn â'r map trywydd hwn",
    more: "Mwy",
    refresh: "Adnewyddu",
    review: "Adolygu'r newidiadau",
    refused: "Mae rhywun arall wedi newid y map trywydd hwn hefyd",
  },
} as const satisfies Record<Language, Record<string, string>>

/** The title row's More, which opens the menu. */
export function moreButton(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: COPY[language].more, exact: true })
}

/** Opens More and chooses `item`. */
export async function chooseFromMore(
  page: Page,
  item: string,
  language: Language = "en",
): Promise<void> {
  await moreButton(page, language).click()
  await page.getByRole("menu").getByRole("menuitem", { name: item }).click()
  await expect(page.getByRole("menu")).toBeHidden()
}

/** Reads the roadmap's page again, from More. */
export function refreshRoadmap(
  page: Page,
  language: Language = "en",
): Promise<void> {
  return chooseFromMore(page, COPY[language].refresh, language)
}

/** The notice at the foot saying a publish was refused, while a field is undecided. */
export function refusal(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("alert")
    .filter({ hasText: COPY[language].refused })
}

/** The review of a refused publish, open or not. */
export function conflictReview(page: Page, language: Language = "en"): Locator {
  return page.getByRole("dialog", { name: COPY[language].refused })
}

/**
 * Opens the review from the refusal notice's "Review the changes" and returns it, once
 * focus is in it.
 */
export async function openConflictReview(
  page: Page,
  language: Language = "en",
): Promise<Locator> {
  await refusal(page, language)
    .getByRole("button", { name: COPY[language].review })
    .click()
  const review = conflictReview(page, language)
  await expect(review.getByRole("button").first()).toBeFocused()
  return review
}

/** A roadmap's tab: Product A is published, Product C is not. */
export type LongRoadmapTab = "ProductA" | "ProductC"

/**
 * The example spreadsheet with a dozen more items on the roadmap tab `tab`, "Planned
 * work 1" to "Planned work 12", so its page runs to several screens.
 */
export function withLongRoadmap(tab: LongRoadmapTab): readonly FakeTab[] {
  const roadmap = EXAMPLE_SPREADSHEET.find(({ title }) => title === tab)
  const [header = [], ...rows] = roadmap?.rows ?? []
  const horizons = ["Now", "Next", "Later", "Delivered this year"]
  const extra = Array.from({ length: 12 }, (_, index) =>
    header.map((name) => {
      if (name === "Title") return `Planned work ${String(index + 1)}`
      if (name === "Horizon") return horizons[index % horizons.length] ?? ""
      if (name === "Description") return "What this work is, in a sentence."
      return ""
    }),
  )
  return withTabRows(tab, [header, ...rows, ...extra])
}

/** Opens Product A, published, or Product C, not published, each with a long page. */
export async function openLongRoadmap(
  page: Page,
  sheets: { spreadsheet: readonly FakeTab[] },
  {
    tab = "ProductA",
    language = "en",
  }: { tab?: LongRoadmapTab; language?: Language } = {},
) {
  sheets.spreadsheet = withLongRoadmap(tab)
  if (language !== "en") await useLanguage(page, language)
  await page.goto(`./#/roadmaps/${tab.toLowerCase()}`)
  await connect(page, COPY[language].connect)
  await expect(
    page.getByRole("heading", { level: 3, name: "Planned work 12" }),
  ).toBeVisible()
}

export const LEFT_THE_CONTENT = "focus left the page's content"

/**
 * What hides the focused control in the page's content, if anything: it should be wholly
 * in view between the bars pinned at the top and the foot of the screen, or in one of
 * them. Read once the bars have settled after the scroll that focusing caused.
 */
export async function focusClearOfBars(page: Page): Promise<string | null> {
  await page.evaluate(
    () =>
      new Promise((settled) => {
        requestAnimationFrame(() => requestAnimationFrame(settled))
      }),
  )
  return page.evaluate((leftTheContent) => {
    const focused = document.activeElement
    if (!(focused instanceof HTMLElement) || !focused.closest("main")) {
      return leftTheContent
    }
    const header = document.querySelector("[data-stuck]")
    const foot = document.querySelector("[data-pinned]")
    if (header?.contains(focused) || foot?.contains(focused)) return null
    const box = focused.getBoundingClientRect()
    const top = header?.getBoundingClientRect().bottom ?? 0
    // With nothing pending, the foot is there but empty, with no box.
    const footBox = foot?.getBoundingClientRect()
    const bottom =
      footBox && footBox.height > 0 ? footBox.top : window.innerHeight
    const clear = box.top >= top - 0.5 && box.bottom <= bottom + 0.5
    const name = focused.getAttribute("aria-label") ?? focused.textContent
    return clear
      ? null
      : `${name} at ${String(box.top)}–${String(box.bottom)}, between ${String(top)} and ${String(bottom)}`
  }, LEFT_THE_CONTENT)
}

/** "About this roadmap", in the page's content. */
export function about(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("region", { name: COPY[language].about })
}

/** Opens "About this roadmap" with its "Show more", and returns it, its fields shown. */
export async function openAbout(
  page: Page,
  language: Language = "en",
): Promise<Locator> {
  const region = about(page, language)
  await region.getByRole("button", { name: COPY[language].showMore }).click()
  return region
}

/** What the opened About shows under `term`. */
export function aboutField(region: Locator, term: string): Locator {
  return region
    .getByRole("term")
    .filter({ hasText: term })
    .locator("xpath=following-sibling::dd[1]")
}
