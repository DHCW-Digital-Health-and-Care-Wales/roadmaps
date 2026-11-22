import type { Locator, Page } from "@playwright/test"

import { EXAMPLE_SPREADSHEET, type FakeTab, withTabRows } from "./fake-sheets"
import { animationsDone } from "./layout"
import { type Language, useLanguage } from "./look"
import { connect, expect } from "./test"

// A roadmap's page as STY-052, STY-053, STY-059, STY-060 and STY-065 shaped it: the
// title with Add an item and More, Edit product details, Refresh and "Unpublish
// roadmap" in More, a publish someone else's changes stopped reviewed in a dialog,
// opened from its notice at the foot, "Product details" a disclosure ending the facts
// line, closed until pressed, and one jump control per width: "Jump to" narrower than
// 768px, the placement links from it. No back link: the header's name leads to the
// list.

const COPY = {
  en: {
    connect: "Connect Google",
    productDetails: "Product details",
    facts: "Roadmap details",
    home: "home",
    jumpTo: "Jump to",
    links: "Horizons and sections",
    more: "More",
    refresh: "Refresh",
    review: "Review the changes",
    refused: "Someone else has changed this roadmap too",
  },
  cy: {
    connect: "Cysylltu â Google",
    productDetails: "Manylion y cynnyrch",
    facts: "Manylion y map trywydd",
    home: "hafan",
    jumpTo: "Neidio i",
    links: "Gorwelion ac adrannau",
    more: "Mwy",
    refresh: "Adnewyddu",
    review: "Adolygu'r newidiadau",
    refused: "Mae rhywun arall wedi newid y map trywydd hwn hefyd",
  },
} as const satisfies Record<Language, Record<string, string>>

/** Goes back to the roadmap list by the header's name, its home link (STY-059 D3). */
export async function goToList(
  page: Page,
  language: Language = "en",
): Promise<void> {
  await page
    .getByRole("banner")
    .getByRole("link", { name: new RegExp(`${COPY[language].home}$`) })
    .click()
}

/** The header's More, which opens the menu. */
export function moreButton(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: COPY[language].more, exact: true })
}

/**
 * Opens More and chooses `item`, returning once the menu has gone: the choice is acted
 * on as it finishes closing.
 */
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

/**
 * Opens the roadmap on the tab `tab` of `spreadsheet`, in `language`, and connects,
 * once the card of its item `lastCard` shows.
 */
export async function openRoadmapIn(
  page: Page,
  sheets: { spreadsheet: readonly FakeTab[] },
  {
    spreadsheet,
    tab,
    lastCard,
    language = "en",
  }: {
    spreadsheet: readonly FakeTab[]
    tab: string
    lastCard: string
    language?: Language | undefined
  },
) {
  sheets.spreadsheet = spreadsheet
  if (language !== "en") await useLanguage(page, language)
  await page.goto(`./#/roadmaps/${tab.toLowerCase()}`)
  await connect(page, COPY[language].connect)
  await expect(
    page.getByRole("heading", { level: 3, name: lastCard }),
  ).toBeVisible()
}

/** Opens Product A, published, or Product C, not published, each with a long page. */
export function openLongRoadmap(
  page: Page,
  sheets: { spreadsheet: readonly FakeTab[] },
  {
    tab = "ProductA",
    language = "en",
  }: { tab?: LongRoadmapTab; language?: Language } = {},
) {
  return openRoadmapIn(page, sheets, {
    spreadsheet: withLongRoadmap(tab),
    tab,
    lastCard: "Planned work 12",
    language,
  })
}

export const LEFT_THE_CONTENT = "focus left the page's content"

/** What `focusClearOfBars` says of bars or a scroll still moving after two seconds. */
const NEVER_SETTLED = "the pinned bars never held still"

/**
 * Whether the bars pinned at the top and the foot of the screen, and the page's scroll,
 * have held still for several frames: a header that has just stuck passes through a
 * frame or two at a height it then leaves (its title changes size as it sticks), and
 * the page follows it. `false` when they are still moving after two seconds.
 */
export function barsHeldStill(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const STILL_FRAMES = 5
        const MAX_FRAMES = 120
        const place = () => {
          const header = document.querySelector("[data-stuck]")
          const foot = document.querySelector("[data-pinned]")
          return [
            window.scrollY,
            header?.getBoundingClientRect().bottom ?? 0,
            foot?.getBoundingClientRect().top ?? 0,
          ].join()
        }
        let last = place()
        let still = 0
        let frames = 0
        const frame = () => {
          const now = place()
          still = now === last ? still + 1 : 0
          last = now
          frames += 1
          if (still >= STILL_FRAMES) resolve(true)
          else if (frames >= MAX_FRAMES) resolve(false)
          else requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }),
  )
}

/**
 * What hides the focused control in the page's content, if anything: it should be wholly
 * in view between the bars pinned at the top and the foot of the screen, or in one of
 * them. Read once the bars have held still after the scroll that focusing caused
 * (`barsHeldStill`); bars still moving after two seconds are reported as such, not read.
 */
export async function focusClearOfBars(page: Page): Promise<string | null> {
  const settled = await barsHeldStill(page)
  // Bars that never hold still are a fault of their own, not a frame to read.
  if (!settled) return NEVER_SETTLED
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

/**
 * The header's "Jump to", the jump control narrower than a tablet (768px), whatever
 * placement it names (STY-065 S7).
 */
export function jumpTo(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: new RegExp(`^${COPY[language].jumpTo}`) })
}

/** The row of placement links, the jump control from a tablet's width (STY-065 S6). */
export function placementLinks(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("navigation", { name: COPY[language].links })
}

/** "Product details", in the page's content. */
export function productDetails(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("region", { name: COPY[language].productDetails })
}

/** The disclosure that ends the facts line and opens and closes "Product details" (STY-065 S3). */
export function productDetailsDisclosure(
  page: Page,
  language: Language = "en",
): Locator {
  return productDetails(page, language).getByRole("button", {
    name: COPY[language].productDetails,
    exact: true,
  })
}

/**
 * Opens "Product details" by its disclosure, unless it is open already, and returns
 * it, its fields shown.
 */
export async function openProductDetails(
  page: Page,
  language: Language = "en",
): Promise<Locator> {
  const disclosure = productDetailsDisclosure(page, language)
  if ((await disclosure.getAttribute("aria-expanded")) !== "true") {
    await disclosure.click()
  }
  await expect(disclosure).toHaveAttribute("aria-expanded", "true")
  return productDetails(page, language)
}

/** The roadmap's facts under its title, "Roadmap details" (STY-065 S2). */
export function roadmapFacts(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("list", { name: COPY[language].facts, exact: true })
}

/** What the opened "Product details" shows under `term`. */
export function productDetailsField(region: Locator, term: string): Locator {
  return region
    .getByRole("term")
    .filter({ hasText: term })
    .locator("xpath=following-sibling::dd[1]")
}

/**
 * The buttons the stuck row shows, each the element its centre hits: not those of the
 * parts it leaves out of sight, the facts, the Not published notice and the product
 * details (STY-059). Read once the row has stuck, its bars have held still and nothing
 * animates, a closing menu over it included.
 */
export async function shownInStuckRow(page: Page): Promise<Locator[]> {
  const buttons = page.locator("[data-stuck]").getByRole("button")
  return (await readStuckRow(page)).map(({ index }) => buttons.nth(index))
}

/** The names of the buttons the stuck row shows (`shownInStuckRow`). */
export async function namesShownInStuckRow(page: Page): Promise<string[]> {
  return (await readStuckRow(page)).map(({ name }) => name)
}

/** Each button the stuck row shows, by its place among the row's buttons and its text. */
async function readStuckRow(
  page: Page,
): Promise<{ index: number; name: string }[]> {
  const row = page.locator("[data-stuck]")
  await expect(row).toBeVisible()
  if (!(await barsHeldStill(page))) throw new Error(NEVER_SETTLED)
  await animationsDone(page)
  return row.getByRole("button").evaluateAll((all) =>
    all.flatMap((button, index) => {
      const box = button.getBoundingClientRect()
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      )
      return hit !== null && button.contains(hit)
        ? [{ index, name: button.textContent.trim() }]
        : []
    }),
  )
}
