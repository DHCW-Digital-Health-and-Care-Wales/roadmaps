import type { Locator, Page } from "@playwright/test"

import { openEditItemDialog } from "./fixtures/dialogs"
import { type FakeTab, withTabItems } from "./fixtures/fake-sheets"
import { tabTo } from "./fixtures/keyboard"
import { scrollsSideways } from "./fixtures/layout"
import type { Language } from "./fixtures/look"
import {
  productDetails,
  focusClearOfBars,
  jumpTo,
  openLongRoadmap,
  openRoadmapIn,
  placementLinks,
  shownInStuckRow,
} from "./fixtures/roadmap-page"
import { expect, test } from "./fixtures/test"

/**
 * STY-053: a roadmap's page reaches any placement from its header, by "Jump to"
 * narrower than a tablet or a row of links from one (768px, STY-065 S6, S7), each with
 * its count and pending mark; the page marks which placement it is in; and "Product
 * details" folds to one line.
 */

const DESKTOP = { width: 1280, height: 800 }
const IPAD = { width: 820, height: 1180 }
const PHONE = { width: 375, height: 812 }

const COPY = {
  en: {
    jumpTo: "Jump to",
    more: "More",
    later: "Later",
  },
  cy: {
    jumpTo: "Neidio i",
    more: "Mwy",
    later: "Hwyrach",
  },
} as const satisfies Record<Language, Record<string, string>>

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
  ["an iPad", IPAD],
  ["a phone", PHONE],
] as const) {
  // The links from 768px, "Jump to" narrower (STY-065 S6, S7, D7).
  const tablet = size.width >= 768
  test(`jumps to Later from ${tablet ? "its link" : '"Jump to"'}, its heading under the stuck row, focused, the address unchanged, on ${device} (S1, D8, STY-065 D7)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize(size)
    await openLongRoadmap(page, sheets)
    const address = page.url()

    if (tablet) {
      await placementLinks(page)
        .getByRole("link", { name: /^Later,/ })
        .click()
    } else {
      await jumpFromMenu(page, "Later")
    }

    const later = placementHeading(page, "Later")
    await expect(later).toBeFocused()
    expect(await focusClearOfBars(page)).toBeNull()
    // Under the stuck row, not further down: Later's items are in view under it.
    const row = page.locator("[data-stuck]")
    const rowBottom = await row.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    expect(Math.abs((await topOf(later)) - rowBottom)).toBeLessThanOrEqual(1)
    await expect(
      page.getByRole("list", { name: "Later" }).getByRole("listitem").first(),
    ).toBeInViewport()
    if (tablet) {
      await expect(row.getByRole("link", { name: /^Later,/ })).toHaveAttribute(
        "aria-current",
        "location",
      )
    } else {
      await expect(jumpTo(page)).toHaveAccessibleName("Jump to: Later")
    }
    expect(page.url()).toBe(address)
  })
}

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" })

  test("jumps to a heading clear of the stuck row, as it sticks for the first time (S1)", async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize(DESKTOP)
    await openLongRoadmap(page, sheets)

    await placementLinks(page)
      .getByRole("link", { name: /^Later,/ })
      .click()

    await expect(placementHeading(page, "Later")).toBeFocused()
    expect(await focusClearOfBars(page)).toBeNull()
  })
})

test("jumps from the links at the top, and from the stuck row's links on to the next (S1, STY-060 S1)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)

  await placementLinks(page)
    .getByRole("link", { name: /^Next,/ })
    .click()
  await expect(placementHeading(page, "Next")).toBeFocused()
  expect(await focusClearOfBars(page)).toBeNull()

  await page
    .locator("[data-stuck]")
    .getByRole("link", { name: /^Delivered this year,/ })
    .click()
  await expect(placementHeading(page, "Delivered this year")).toBeFocused()
  expect(await focusClearOfBars(page)).toBeNull()
})

/** Retitles `title`'s item, leaving a change pending where it stands. */
async function retitle(page: Page, title: string) {
  const form = await openEditItemDialog(page, title)
  await form.getByRole("textbox", { name: "Title" }).fill(`${title} edited`)
  await form.getByRole("button", { name: "Done" }).click()
  await expect(form).toBeHidden()
}

test("shows each placement's count in the links and marks those with pending changes (S2)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openSmallRoadmap(page, sheets)
  await retitle(page, "Now item 3")

  const now = placementLinks(page).getByRole("link", { name: /^Now,/ })
  await expect(now).toHaveAccessibleName("Now, 7 items, unpublished changes")
  await expect(now).toContainText("7")
  await expect(
    placementLinks(page).getByRole("link", { name: /^Next,/ }),
  ).toHaveAccessibleName("Next, 2 items")
})

test("shows each placement's count in Jump to and marks those with pending changes (S2)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(PHONE)
  await openSmallRoadmap(page, sheets)
  await retitle(page, "Now item 3")

  await jumpTo(page).click()
  const menu = page.getByRole("menu")
  await expect(
    menu.getByRole("menuitem", { name: /^Now,/ }),
  ).toHaveAccessibleName("Now, 7 items, unpublished changes")
  await expect(menu.getByRole("menuitem", { name: /^Now,/ })).toContainText("7")
  await expect(
    menu.getByRole("menuitem", { name: /^Next,/ }),
  ).toHaveAccessibleName("Next, 2 items")
})

for (const motion of ["reduce", "no-preference"] as const) {
  test.describe(`the open menu, reducedMotion ${motion}`, () => {
    test.use({ reducedMotion: motion })

    test("lines up the open menu's names, counts and dots whatever is edited, on a phone (STY-084 S1, S3)", async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize(PHONE)
      await openSmallRoadmap(page, sheets)
      await retitle(page, "Next item 1")
      await retitle(page, "Later item")

      await jumpTo(page).click()
      const items = page.getByRole("menu").getByRole("menuitem")
      await expect(items).toHaveCount(7)
      // Each row's name, count and dot's place, by their left and right edges; the dot's
      // place is kept hidden on the rows with nothing pending.
      const edges = await items.evaluateAll((rows) =>
        rows.map((row) => {
          const dot = row.querySelector('[data-slot="unpublished-dot"]')
          const spans = [...row.querySelectorAll("span:not(.sr-only)")]
          const name = spans.find((span) => /\D/.test(span.textContent))
          const count = spans.find((span) => /^\d+$/.test(span.textContent))
          if (!dot || !count || !name) throw new Error("A row lacks a mark")
          return {
            name: name.getBoundingClientRect().left,
            count: count.getBoundingClientRect().right,
            dot: dot.getBoundingClientRect().left,
          }
        }),
      )
      expect(edges).toHaveLength(7)
      for (const column of ["name", "count", "dot"] as const) {
        const [first, ...rest] = edges.map((row) => row[column])
        for (const edge of rest) expect(edge).toBeCloseTo(first ?? 0, 1)
      }
    })
  })
}

test("marks the placement the page is in, in Jump to, and none at the top (S3, D8)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(PHONE)
  await openLongRoadmap(page, sheets)
  await expect(jumpTo(page)).toHaveAccessibleName("Jump to")

  // Scrolled by hand: Next's heading just under the stuck row, as it sticks.
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
})

test("marks the placement the page is in, in the links, and none at the top (S3, D8)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)
  const next = placementLinks(page).getByRole("link", { name: /^Next,/ })
  await expect(next).not.toHaveAttribute("aria-current")

  // Scrolled by hand: Next's heading just under the stuck row, as it sticks.
  await placementHeading(page, "Next").evaluate((heading) => {
    heading.scrollIntoView({ block: "start" })
  })
  await expect(next).toHaveAttribute("aria-current", "location")
  await expect(next).toHaveCSS("font-weight", "700")

  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  await expect(next).not.toHaveAttribute("aria-current")
})

test("reaches the unplaced items, and an empty placement, which offers its first item (S4, S5, STY-080 S1)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openSmallRoadmap(page, sheets)
  const unplaced = placementLinks(page).getByRole("link").first()
  await expect(unplaced).toHaveAccessibleName(
    "Not on the public roadmap, 1 item",
  )

  await unplaced.click()
  await expect(
    placementHeading(page, "Not on the public roadmap"),
  ).toBeFocused()

  await placementLinks(page)
    .getByRole("link", { name: /^Not doing,/ })
    .click()
  await expect(placementHeading(page, "Not doing")).toBeFocused()
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Add the first item to Not doing" }),
  ).toBeInViewport()
  await expect(
    placementLinks(page).getByRole("link", { name: /^Not doing,/ }),
  ).toHaveAttribute("aria-current", "location")
})

test("keeps Product details closed, so the first placement starts on the first screen at 1280×800 (S6, STY-059 S8, STY-065 S10)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)

  const region = productDetails(page)
  await expect(region.getByRole("term")).toHaveCount(0)
  // One line: the facts ending in its disclosure, at 1280px.
  expect((await region.boundingBox())?.height).toBeLessThan(50)
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

  // "Jump to" alone: no row of links on a phone (STY-060 S1).
  await expect(placementLinks(page, "cy")).toHaveCount(0)
  expect(await scrollsSideways(page)).toBe(false)
})

// The longest name but the first placement's, which sits too close under the header
// for a jump to it to stick the row; S5 of STY-060 holds the first in the strip.
for (const { width, language, placement, publish } of [
  {
    width: 768,
    language: "cy",
    placement: "Wedi'u cyflawni eleni",
    publish: "Cyhoeddi'r map trywydd",
  },
  {
    width: 640,
    language: "cy",
    placement: "Wedi'u cyflawni eleni",
    publish: "Cyhoeddi'r map trywydd",
  },
  {
    width: 640,
    language: "en",
    placement: "Delivered this year",
    publish: "Publish roadmap",
  },
] as const) {
  test(`keeps every control of the stuck row on screen at ${String(width)}px, in ${language}, for a roadmap not published (S7, STY-065 S6, S10)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width, height: 1024 })
    await openLongRoadmap(page, sheets, { tab: "ProductC", language })
    const row = page.locator("[data-stuck]")

    // A long placement name, so "Jump to" is at its widest; from 768px the link.
    if (width >= 768) {
      await placementLinks(page, language)
        .getByRole("link", { name: new RegExp(`^${placement},`) })
        .click()
      await expect(
        row.getByRole("link", { name: new RegExp(`^${placement},`) }),
      ).toHaveAttribute("aria-current", "location")
      await expect(jumpTo(page, language)).toHaveCount(0)
    } else {
      await jumpFromMenu(page, placement, language)
      await expect(jumpTo(page, language)).toHaveAccessibleName(
        `${COPY[language].jumpTo}: ${placement}`,
      )
    }
    const shown = await shownInStuckRow(page)
    // Once stuck, More holds it (STY-059 D7).
    const names = await Promise.all(shown.map((button) => button.innerText()))
    expect(names).toContain(COPY[language].more)
    expect(names).not.toContain(publish)
    await row
      .getByRole("button", { name: COPY[language].more, exact: true })
      .click()
    await expect(
      page.getByRole("menu").getByRole("menuitem", { name: publish }),
    ).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("menu")).toBeHidden()

    // The stuck row is `position: fixed`: a control past its edge never widens the
    // page, so the `scrollWidth` check below passes over it.
    for (const control of shown) {
      await expect(control, await control.innerText()).toBeInViewport({
        ratio: 1,
      })
    }
    expect(await scrollsSideways(page)).toBe(false)
  })
}
