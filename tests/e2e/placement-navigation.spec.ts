import type { Locator, Page } from "@playwright/test"

import { openEditItemDialog } from "./fixtures/dialogs"
import { type FakeTab, withTabItems } from "./fixtures/fake-sheets"
import { tabTo } from "./fixtures/keyboard"
import type { Language } from "./fixtures/look"
import {
  about,
  focusClearOfBars,
  openLongRoadmap,
  openRoadmapIn,
} from "./fixtures/roadmap-page"
import { expect, test } from "./fixtures/test"

/**
 * STY-053: a roadmap's page reaches any placement from "Jump to" in its title row, or
 * from a row of links under "About this roadmap", each with its count and pending mark;
 * the page marks which placement it is in; and "About this roadmap" folds to one line.
 */

const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 375, height: 812 }

const COPY = {
  en: {
    jumpTo: "Jump to",
    links: "Horizons and sections",
    later: "Later",
  },
  cy: {
    jumpTo: "Neidio i",
    links: "Gorwelion ac adrannau",
    later: "Hwyrach",
  },
} as const satisfies Record<Language, Record<string, string>>

/** The title row's "Jump to", whatever placement it names. */
function jumpTo(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: new RegExp(`^${COPY[language].jumpTo}`) })
}

/** The row of links under "About this roadmap". */
function links(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("navigation", { name: COPY[language].links })
}

function placementHeading(page: Page, name: string): Locator {
  return page
    .getByRole("main")
    .getByRole("heading", { level: 2, name, exact: true })
}

/** Chooses `target` from "Jump to", by the start of its name. */
async function jumpFromMenu(
  page: Page,
  target: string,
  language: Language = "en",
) {
  await jumpTo(page, language).click()
  await page
    .getByRole("menu")
    .getByRole("menuitem", { name: new RegExp(`^${target},`) })
    .click()
  await expect(page.getByRole("menu")).toBeHidden()
}

/** A small roadmap: one unplaced item, seven in Now, two in Next, one in Later. */
function openSmallRoadmap(
  page: Page,
  sheets: { spreadsheet: readonly FakeTab[] },
  language: Language = "en",
) {
  return openRoadmapIn(page, sheets, {
    spreadsheet: withTabItems(
      "ProductA",
      ["Leaflets in plain language", "Soon"],
      ...Array.from({ length: 7 }, (_, index): [string, string] => [
        `Now item ${String(index + 1)}`,
        "Now",
      ]),
      ["Next item 1", "Next"],
      ["Next item 2", "Next"],
      ["Later item", "Later"],
    ),
    tab: "ProductA",
    lastCard: "Later item",
    language,
  })
}

/** The top of `locator`'s box, in the viewport. */
async function topOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (!box) throw new Error("Not laid out")
  return box.y
}

for (const [device, size] of [
  ["a desktop", DESKTOP],
  ["a phone", PHONE],
] as const) {
  test(`jumps to Later from "Jump to", its heading under the title row, focused, the address unchanged, on ${device} (S1, D8)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize(size)
    await openLongRoadmap(page, sheets)
    const address = page.url()

    await jumpFromMenu(page, "Later")

    const later = placementHeading(page, "Later")
    await expect(later).toBeFocused()
    expect(await focusClearOfBars(page)).toBeNull()
    // Under the title row, not further down: Later's items are in view under it.
    const row = page.locator("[data-stuck]")
    const rowBottom = await row.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    expect(Math.abs((await topOf(later)) - rowBottom)).toBeLessThanOrEqual(1)
    await expect(
      page.getByRole("list", { name: "Later" }).getByRole("listitem").first(),
    ).toBeInViewport()
    await expect(jumpTo(page)).toHaveAccessibleName("Jump to: Later")
    expect(page.url()).toBe(address)
  })
}

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" })

  test("jumps to a heading clear of the title row, as it sticks for the first time (S1)", async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize(DESKTOP)
    await openLongRoadmap(page, sheets)

    await links(page)
      .getByRole("link", { name: /^Later,/ })
      .click()

    await expect(placementHeading(page, "Later")).toBeFocused()
    expect(await focusClearOfBars(page)).toBeNull()
  })
})

test("jumps from the links under About, and from a heading jumped to, on to the next (S1)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)

  await links(page)
    .getByRole("link", { name: /^Next,/ })
    .click()
  await expect(placementHeading(page, "Next")).toBeFocused()
  expect(await focusClearOfBars(page)).toBeNull()

  await jumpFromMenu(page, "Delivered this year")
  await expect(placementHeading(page, "Delivered this year")).toBeFocused()
  expect(await focusClearOfBars(page)).toBeNull()
})

test("shows each placement's count and marks those with pending changes (S2)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openSmallRoadmap(page, sheets)
  const form = await openEditItemDialog(page, "Now item 3")
  await form.getByRole("textbox", { name: "Title" }).fill("Now item three")
  await form.getByRole("button", { name: "Done" }).click()
  await expect(form).toBeHidden()

  const now = links(page).getByRole("link", { name: /^Now,/ })
  await expect(now).toHaveAccessibleName("Now, 7 items, unpublished changes")
  await expect(now).toContainText("7")
  await expect(
    links(page).getByRole("link", { name: /^Next,/ }),
  ).toHaveAccessibleName("Next, 2 items")

  await jumpTo(page).click()
  await expect(
    page.getByRole("menu").getByRole("menuitem", { name: /^Now,/ }),
  ).toHaveAccessibleName("Now, 7 items, unpublished changes")
})

test("marks the placement the page is in, to sight and to a screen reader, and none at the top (S3, D8)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)
  await expect(jumpTo(page)).toHaveAccessibleName("Jump to")

  // Scrolled by hand: Next's heading just under the title row, as it sticks.
  await placementHeading(page, "Next").evaluate((heading) => {
    heading.scrollIntoView({ block: "start" })
  })
  await expect(jumpTo(page)).toHaveAccessibleName("Jump to: Next")
  await jumpTo(page).click()
  await expect(
    page.getByRole("menu").getByRole("menuitem", { name: /^Next,/ }),
  ).toHaveAttribute("aria-current", "location")
  await page.keyboard.press("Escape")

  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  await expect(jumpTo(page)).toHaveAccessibleName("Jump to")
  await expect(
    links(page).getByRole("link", { name: /^Next,/ }),
  ).not.toHaveAttribute("aria-current")
})

test("reaches the unplaced items, and an empty placement, which says it has none (S4, S5)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openSmallRoadmap(page, sheets)
  const unplaced = links(page).getByRole("link").first()
  await expect(unplaced).toHaveAccessibleName(
    "Not on the public roadmap, 1 item",
  )

  await unplaced.click()
  await expect(
    placementHeading(page, "Not on the public roadmap"),
  ).toBeFocused()

  await jumpFromMenu(page, "Not doing")
  await expect(placementHeading(page, "Not doing")).toBeFocused()
  await expect(
    page.getByRole("main").getByText("No items", { exact: true }).last(),
  ).toBeInViewport()
  await expect(jumpTo(page)).toHaveAccessibleName("Jump to: Not doing")
})

test("folds About to one line, so the first placement starts on the first screen at 1280×800 (S6)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)

  const region = about(page)
  await expect(region).toContainText("Product lead: Alex Jones")
  await expect(region.getByRole("term")).toHaveCount(0)
  // One line: its heading, facts and buttons in a single row at 1280px.
  expect((await region.boundingBox())?.height).toBeLessThan(80)
  expect(
    await topOf(placementHeading(page, "Recently delivered")),
  ).toBeLessThan(DESKTOP.height)
})

test("is used by keyboard alone, in Cymraeg on a 375px phone, with no sideways scroll (S7)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(PHONE)
  await openSmallRoadmap(page, sheets, "cy")

  await tabTo(page, jumpTo(page, "cy"), "Tab", 40)
  await page.keyboard.press("Enter")
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitem")).toHaveCount(7)
  // From the first item, the unplaced items', down to Later, the fifth.
  await expect(menu.getByRole("menuitem").first()).toBeFocused()
  for (let down = 0; down < 4; down += 1) await page.keyboard.press("ArrowDown")
  await expect(
    menu.getByRole("menuitem", { name: new RegExp(`^${COPY.cy.later},`) }),
  ).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(placementHeading(page, COPY.cy.later)).toBeFocused()
  await expect(jumpTo(page, "cy")).toHaveAccessibleName("Neidio i: Hwyrach")

  for (const link of await links(page, "cy").getByRole("link").all()) {
    await expect(link).toHaveAccessibleName(/^.+, (dim eitemau|\d+ .*eitem)/)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  // The links scroll inside their row; Tab brings each into view. Backwards from the
  // heading jumped to, the last link is reached before the rest.
  const notDoing = links(page, "cy").getByRole("link").last()
  await tabTo(page, notDoing, "Shift+Tab", 40)
  await expect(notDoing).toBeInViewport()
  await page.keyboard.press("Enter")
  await expect(placementHeading(page, "Ddim yn bwrw ymlaen")).toBeFocused()
})

for (const { width, language, placement, publish } of [
  {
    width: 768,
    language: "cy",
    placement: "Wedi'u cyflawni'n ddiweddar",
    publish: "Cyhoeddi'r map trywydd",
  },
  {
    width: 640,
    language: "cy",
    placement: "Wedi'u cyflawni'n ddiweddar",
    publish: "Cyhoeddi'r map trywydd",
  },
  {
    width: 640,
    language: "en",
    placement: "Delivered this year",
    publish: "Publish roadmap",
  },
] as const) {
  test(`keeps every control of the stuck row on screen at ${String(width)}px, in ${language}, for a roadmap not published (S7)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width, height: 1024 })
    await openLongRoadmap(page, sheets, { tab: "ProductC", language })

    // A long placement name, so "Jump to" is at its widest.
    await jumpFromMenu(page, placement, language)
    await expect(jumpTo(page, language)).toHaveAccessibleName(
      `${COPY[language].jumpTo}: ${placement}`,
    )
    const row = page.locator("[data-stuck]")
    await expect(row.getByRole("button", { name: publish })).toBeVisible()

    for (const control of await row.getByRole("button").all()) {
      await expect(control).toBeInViewport({ ratio: 1 })
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true)
  })
}
