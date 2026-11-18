import type { Locator, Page } from "@playwright/test"

import { EXAMPLE_SPREADSHEET, type FakeTab, withTabRows } from "./fake-sheets"
import { type Language, useLanguage } from "./look"
import { connect, expect } from "./test"

// A roadmap page whose items have long fields, for the cut after three lines (STY-066).

const WORDS =
  "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split(
    " ",
  )

/** `count` words of running text, each word different enough to wrap as text does. */
export function words(count: number): string {
  return Array.from(
    { length: count },
    (_, at) => `${WORDS[at % WORDS.length] ?? ""}ish`,
  ).join(" ")
}

/**
 * A description of three lines on a card at 1280px beside the open navigation, and four
 * once the navigation is folded, its cards narrower, or on a phone.
 */
export const THREE_LINES_WIDE = words(18)

/** Product A's tab with these items: each cell by header name, `Horizon` Now unless given. */
export function withItems(
  ...items: readonly Record<string, string>[]
): FakeTab[] {
  const roadmap = EXAMPLE_SPREADSHEET.find(({ title }) => title === "ProductA")
  const [header = []] = roadmap?.rows ?? []
  return withTabRows("ProductA", [
    header,
    ...items.map((item) =>
      header.map((name) =>
        name === "Horizon" ? (item.Horizon ?? "Now") : (item[name] ?? ""),
      ),
    ),
  ])
}

/** Opens Product A with `spreadsheet`, in `language`, once the item titled `last` shows. */
export async function openWithItems(
  page: Page,
  sheets: { spreadsheet: readonly FakeTab[] },
  spreadsheet: readonly FakeTab[],
  last: string,
  language: Language = "en",
): Promise<void> {
  sheets.spreadsheet = spreadsheet
  if (language !== "en") await useLanguage(page, language)
  await page.goto("./#/roadmaps/producta")
  await connect(
    page,
    language === "en" ? "Connect Google" : "Cysylltu â Google",
  )
  await expect(
    page.getByRole("main").getByRole("heading", { level: 3, name: last }),
  ).toBeVisible()
}

/** The card of the item titled `title`. */
export function cardOf(page: Page, title: string): Locator {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

/** What a card shows under the label `term`. */
export function fieldOf(card: Locator, term: string): Locator {
  return card
    .getByRole("term")
    .filter({ hasText: term })
    .locator("xpath=following-sibling::dd[1]")
}

/**
 * How many lines tall `field`'s content is as shown now, and how many it is shown whole
 * (its `scrollHeight`), by the line height of the text.
 */
export function linesOf(
  field: Locator,
): Promise<{ shown: number; whole: number }> {
  return field.evaluate((dd) => {
    const lineHeight = Number.parseFloat(getComputedStyle(dd).lineHeight)
    const inner = dd.firstElementChild as HTMLElement
    return {
      shown: Math.round(inner.getBoundingClientRect().height / lineHeight),
      whole: Math.round(inner.scrollHeight / lineHeight),
    }
  })
}
