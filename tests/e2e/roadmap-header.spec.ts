import type { Locator, Page } from "@playwright/test"

import { EXAMPLE_SPREADSHEET } from "./fixtures/fake-sheets"
import { boxOf, contentRight, scrollsSideways } from "./fixtures/layout"
import type { Language } from "./fixtures/look"
import {
  jumpTo,
  moreButton,
  openLongRoadmap,
  openRoadmapIn,
  placementLinks,
  productDetailsDisclosure,
  roadmapFacts,
} from "./fixtures/roadmap-page"
import { expect, test } from "./fixtures/test"

/**
 * STY-065: a roadmap's page opens on three rows: the title with Add an item and More,
 * one line of facts ending in "Product details", then the jump control; a roadmap not
 * published adds one notice with Publish roadmap under the facts. From 768px the switch
 * of views (STY-067 S1), Add an item and More end the title's row and the placement
 * links are the jump control; narrower, More is "…" at the end of the title's row and
 * Add an item shares a row with "Jump to" and "Compact view" (STY-067 S2).
 */

const WIDTHS = [
  ["a phone", 375],
  ["an iPad", 820],
  ["a desktop", 1280],
] as const

/** The widths the Welsh page is checked at, as the validation table sets (S10). */
const WELSH_WIDTHS = [375, 640, 768, 820, 1024, 1280] as const

const COPY = {
  en: {
    status: "Status:",
    productDetails: "Product details",
    edit: "Edit Product details",
    addItem: "Add an item",
    more: "More",
    jumpTo: "Jump to",
    view: "View",
    cards: "Cards",
    compact: "Compact",
    compactView: "Compact view",
    notPublished: "Not published",
    notPublishedNote: "The public site doesn't show this roadmap.",
    publish: "Publish roadmap",
  },
  cy: {
    status: "Statws:",
    productDetails: "Manylion y cynnyrch",
    edit: "Golygu Manylion y cynnyrch",
    addItem: "Ychwanegu eitem",
    more: "Mwy",
    jumpTo: "Neidio i",
    view: "Golwg",
    cards: "Cardiau",
    compact: "Cryno",
    compactView: "Golwg gryno",
    notPublished: "Heb ei gyhoeddi",
    notPublishedNote:
      "Dydy'r wefan gyhoeddus ddim yn dangos y map trywydd hwn.",
    publish: "Cyhoeddi'r map trywydd",
  },
} as const satisfies Record<Language, Record<string, string>>

/** Each control of the header block that passes the layout's right edge, by its text. */
function pastTheRightEdge(page: Page): Promise<string[]> {
  return page
    .locator("[data-slot=sticky-header]")
    .locator("button, a")
    .evaluateAll((controls) =>
      controls
        .filter((control) => {
          const box = control.getBoundingClientRect()
          return (
            box.width > 0 &&
            box.right > document.documentElement.clientWidth + 0.5
          )
        })
        .map((control) => control.textContent),
    )
}

/** Presses Tab from `from` and expects each of `order` to take focus in turn. */
async function expectTabOrder(page: Page, from: Locator, order: Locator[]) {
  await from.focus()
  for (const control of order) {
    await page.keyboard.press("Tab")
    await expect(control).toBeFocused()
  }
}

for (const language of ["en", "cy"] as const) {
  const copy = COPY[language]
  for (const [device, width] of WIDTHS) {
    const tablet = width >= 768
    test(`opens on the title with its controls, the facts line, then the jump control, on ${device} in ${language} (S1, S6, S7)`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await openLongRoadmap(page, sheets, { language })
      const main = page.getByRole("main")
      const button = (name: string) =>
        main.getByRole("button", { name, exact: true })

      const heading = main.getByRole("heading", { level: 1 })
      const title = await boxOf(heading)
      // The title's row: the heading with the tags that may follow it.
      const titleRow = await boxOf(heading.locator(".."))
      const add = await boxOf(button(copy.addItem))
      const more = await boxOf(button(copy.more))
      const facts = await boxOf(roadmapFacts(page, language))
      const right = await contentRight(page)

      // Row 1: More ends the title's row at every width; from 768px Add an item is
      // beside it, narrower it is under the facts.
      expect(more.y).toBeGreaterThanOrEqual(titleRow.y - 0.5)
      expect(more.y).toBeLessThan(titleRow.bottom)
      expect(more.height).toBe(40)
      expect(add.height).toBe(40)
      // Row 2: the facts, under the title, with nothing between them.
      expect(facts.y).toBeGreaterThanOrEqual(title.bottom)
      expect(facts.y - title.bottom).toBeLessThanOrEqual(16)
      expect(facts.x).toBe(title.x)
      // No Edit button, tag or Publish row among them.
      await expect(main.getByRole("button", { name: copy.edit })).toHaveCount(0)
      await expect(main.locator("[data-slot=badge]")).toHaveCount(0)
      await expect(
        main.getByRole("button", { name: copy.publish, exact: true }),
      ).toHaveCount(0)

      if (tablet) {
        // The switch, Add an item and More end the title's row, at the content's right
        // edge (STY-067 S1).
        const view = await boxOf(main.getByRole("group", { name: copy.view }))
        expect(view.y).toBe(add.y)
        expect(view.right).toBeLessThanOrEqual(add.x)
        expect(add.y).toBeGreaterThanOrEqual(titleRow.y - 0.5)
        expect(add.y).toBeLessThan(titleRow.bottom)
        expect(more.x).toBeGreaterThan(add.right)
        expect(Math.abs(more.right - right)).toBeLessThan(1)
        // The placement links, the only jump control, under the facts and starting
        // on the page's left edge.
        const links = placementLinks(page, language)
        await expect(links).toBeVisible()
        await expect(jumpTo(page, language)).toHaveCount(0)
        const nav = await boxOf(links)
        expect(nav.y).toBeGreaterThanOrEqual(facts.bottom)
        expect(nav.x).toBe(title.x)
        await expect(links.getByRole("link")).toHaveCount(6)
        expect(add.y).toBe(more.y)
      } else {
        // "…" with its chevron, named More, at the end of the title's row.
        await expect(button(copy.more).locator("svg")).toHaveCount(2)
        expect(more.width).toBeLessThan(70)
        expect(Math.abs(more.right - right)).toBeLessThan(1)
        // Add an item, Jump to and Compact view share a row under the facts, Compact
        // view at its end (STY-067 S2).
        const jump = await boxOf(jumpTo(page, language))
        const toggle = await boxOf(button(copy.compactView))
        await expect(placementLinks(page, language)).toHaveCount(0)
        expect(add.y).toBeGreaterThanOrEqual(facts.bottom)
        expect(jump.y).toBe(add.y)
        expect(jump.x).toBeGreaterThan(add.right)
        expect(jump.height).toBe(40)
        expect(toggle.y).toBe(add.y)
        expect(toggle.x).toBeGreaterThan(jump.right)
        expect(Math.abs(toggle.right - right)).toBeLessThan(1)
        // Add an item as wide as its label, short of the row's two-thirds, and the
        // rest left to Jump to.
        expect(add.width).toBeLessThan(((right - title.x) * 2) / 3)
        expect(add.x).toBe(title.x)
      }
      expect(await scrollsSideways(page)).toBe(false)
      expect(await pastTheRightEdge(page)).toEqual([])
    })
  }
}

test("reads the facts as plain text on one line from 768px, wrapping on a phone (S1, S2)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 820, height: 800 })
  await openLongRoadmap(page, sheets)
  const facts = roadmapFacts(page)
  const items = facts.getByRole("listitem")

  await expect(items).toHaveText([
    "Status: Beta",
    "Product lead: Alex Jones",
    "Updated 1 October 2026",
    "Product details",
  ])
  // Plain text: the status label is not a tag, and no item is a link or a tag.
  await expect(facts.locator("[data-slot=badge]")).toHaveCount(0)
  await expect(facts.getByRole("link")).toHaveCount(0)
  await expect(facts.getByRole("button")).toHaveText("Product details")
  const middle = async (item: Locator) => {
    const box = await boxOf(item)
    return box.y + box.height / 2
  }
  const first = await middle(items.first())
  for (const item of await items.all()) {
    expect(Math.abs((await middle(item)) - first)).toBeLessThan(2)
  }

  await page.setViewportSize({ width: 375, height: 800 })

  // Wrapped between its items, onto two lines: the middles of items on a line agree
  // to a pixel, and the lines are further apart than that.
  const lines: number[] = []
  for (const item of await items.all()) {
    const level = await middle(item)
    if (!lines.some((line) => Math.abs(line - level) < 2)) lines.push(level)
  }
  expect(lines).toHaveLength(2)
  expect(await scrollsSideways(page)).toBe(false)
})

for (const language of ["en", "cy"] as const) {
  test(`reads the status as text, leaving out what a roadmap has not, in ${language} (S2)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    // Product B has a status and a date, but no product lead.
    await openRoadmapIn(page, sheets, {
      spreadsheet: EXAMPLE_SPREADSHEET,
      tab: "ProductB",
      lastCard: "Integration with another system",
      language,
    })
    const items = roadmapFacts(page, language).getByRole("listitem")
    const copy = COPY[language]
    await expect(items).toHaveCount(3)
    await expect(items.nth(0)).toHaveText(
      language === "en" ? "Status: Alpha" : "Statws: Alffa",
    )
    await expect(items.nth(1)).toHaveText(
      language === "en" ? "Updated 15 September 2026" : /^Diweddarwyd 15 /,
    )
    await expect(items.nth(2)).toHaveText(copy.productDetails)
    await expect(
      roadmapFacts(page, language).locator("[data-slot=badge]"),
    ).toHaveCount(0)
  })
}

test("shows Not published as one notice under the facts, with a 40px Publish roadmap at its end, on a desktop and under its text on a phone, in English (S4)", async ({
  page,
  sheets,
}) => {
  const copy = COPY.en
  await page.setViewportSize({ width: 1280, height: 800 })
  await openLongRoadmap(page, sheets, { tab: "ProductC" })
  const main = page.getByRole("main")
  const publish = main.getByRole("button", { name: copy.publish, exact: true })
  const notice = main
    .getByText(copy.notPublishedNote)
    .locator("xpath=ancestor::div[1]")

  // No tag beside a button: the notice's title and note, and the button.
  await expect(main.locator("[data-slot=badge]")).toHaveCount(0)
  await expect(main.getByText(copy.notPublished, { exact: true })).toHaveCount(
    1,
  )
  await expect(notice).toContainText(copy.notPublished)
  const facts = await boxOf(roadmapFacts(page))
  const wide = await boxOf(notice)
  const button = await boxOf(publish)
  expect(wide.y).toBeGreaterThanOrEqual(facts.bottom)
  expect(button.height).toBe(40)
  // At the notice's end, level with its text.
  const note = await boxOf(main.getByText(copy.notPublishedNote))
  expect(button.x).toBeGreaterThan(note.right)
  expect(button.y).toBeLessThan(wide.bottom)
  expect(Math.abs(button.right - wide.right)).toBeLessThanOrEqual(13)
  expect(wide.x).toBe(facts.x)

  await page.setViewportSize({ width: 375, height: 800 })

  // Under its text.
  const phoneNote = await boxOf(main.getByText(copy.notPublishedNote))
  const phoneButton = await boxOf(publish)
  expect(phoneButton.y).toBeGreaterThanOrEqual(phoneNote.bottom)
  expect(phoneButton.height).toBe(40)
  expect(await scrollsSideways(page)).toBe(false)
})

test("publishes the roadmap from its notice, the outcome at the foot and the notice gone (S4)", async ({
  page,
  sheets,
}) => {
  await openLongRoadmap(page, sheets, { tab: "ProductC" })
  const main = page.getByRole("main")
  await expect(main.getByText("Not published", { exact: true })).toBeVisible()

  await main.getByRole("button", { name: "Publish roadmap" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish roadmap" })
    .click()

  await expect(
    main.getByText(/^Product C roadmap is published\./),
  ).toBeVisible()
  await expect(main.getByText("Not published", { exact: true })).toHaveCount(0)
  await expect(
    main.getByRole("button", { name: "Publish roadmap" }),
  ).toHaveCount(0)
  expect(sheets.writes).toHaveLength(1)
})

for (const [device, width] of WIDTHS) {
  test(`reaches the controls in the order they are drawn, on ${device} (S10, D8)`, async ({
    page,
    sheets,
  }) => {
    const copy = COPY.en
    await page.setViewportSize({ width, height: 800 })
    await openLongRoadmap(page, sheets, { tab: "ProductC" })
    const main = page.getByRole("main")
    const button = (name: string) =>
      main.getByRole("button", { name, exact: true })
    const heading = main.getByRole("heading", { level: 1 })

    if (width >= 768) {
      // The switch, Add an item, More, Product details, Publish roadmap, then the
      // placement links (STY-067 S13).
      await expectTabOrder(page, heading, [
        button(copy.cards),
        button(copy.compact),
        button(copy.addItem),
        button(copy.more),
        productDetailsDisclosure(page),
        button(copy.publish),
        placementLinks(page).getByRole("link").first(),
      ])
    } else {
      // Where More is drawn beside the title, it is reached after Add an item.
      await expectTabOrder(page, heading, [
        productDetailsDisclosure(page),
        button(copy.publish),
        button(copy.addItem),
        button(copy.more),
        jumpTo(page),
        button(copy.compactView),
      ])
    }
  })
}

for (const width of WELSH_WIDTHS) {
  for (const tab of ["ProductA", "ProductC"] as const) {
    test(`fits ${String(width)}px in Cymraeg for ${tab === "ProductA" ? "a roadmap published" : "one not published"}, nothing passing the right edge or scrolling sideways (S10)`, async ({
      page,
      sheets,
    }) => {
      const copy = COPY.cy
      await page.setViewportSize({ width, height: 800 })
      await openLongRoadmap(page, sheets, { tab, language: "cy" })
      const main = page.getByRole("main")

      expect(await pastTheRightEdge(page)).toEqual([])
      expect(await scrollsSideways(page)).toBe(false)
      // Every control reached and named.
      await expect(
        main.getByRole("button", { name: copy.addItem, exact: true }),
      ).toBeVisible()
      await expect(moreButton(page, "cy")).toBeVisible()
      await expect(productDetailsDisclosure(page, "cy")).toBeVisible()
      if (tab === "ProductC") {
        await expect(
          main.getByRole("button", { name: copy.publish, exact: true }),
        ).toBeVisible()
      }
      if (width >= 768) {
        await expect(placementLinks(page, "cy")).toBeVisible()
      } else {
        await expect(jumpTo(page, "cy")).toBeVisible()
      }

      // Open, the details and the notice still fit.
      await productDetailsDisclosure(page, "cy").click()
      expect(await pastTheRightEdge(page)).toEqual([])
      expect(await scrollsSideways(page)).toBe(false)
      await expect(main.getByRole("button", { name: copy.edit })).toBeVisible()
    })
  }
}

for (const language of ["en", "cy"] as const) {
  for (const tab of ["ProductA", "ProductC"] as const) {
    test(`keeps the first placement on the first screen at 1280×800 for ${tab} in ${language} (S10, STY-053 S6)`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await openLongRoadmap(page, sheets, { tab, language })
      // The page's first level-2 heading is Product details'; the first placement's
      // follows it.
      const first = page
        .getByRole("main")
        .getByRole("heading", { level: 2 })
        .nth(1)
      expect((await boxOf(first)).y).toBeLessThan(800)
    })
  }
}

test("shows the title in the large heading size on a phone, and today's from 640px (STY-059 S3)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await openLongRoadmap(page, sheets)
  const title = page.getByRole("main").getByRole("heading", { level: 1 })
  const phone = await title.evaluate((h1) => getComputedStyle(h1).fontSize)

  await page.setViewportSize({ width: 640, height: 800 })

  await expect(title).not.toHaveCSS("font-size", phone)
  const wider = await title.evaluate((h1) => getComputedStyle(h1).fontSize)
  expect(Number.parseFloat(wider)).toBeGreaterThan(Number.parseFloat(phone))
})

for (const [control, from, to] of [
  ["Product details", 375, 820],
  ["Add an item", 375, 820],
  ["Add an item", 820, 375],
  ["More", 820, 375],
] as const) {
  test(`keeps focus on ${control} as the window goes from ${String(from)}px to ${String(to)}px and the block changes its order (D8)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width: from, height: 800 })
    await openLongRoadmap(page, sheets)
    const focused = page
      .getByRole("main")
      .getByRole("button", { name: control, exact: true })
    await focused.focus()
    await expect(focused).toBeFocused()

    await page.setViewportSize({ width: to, height: 800 })

    // The row of links stands in for "Jump to" from 768px: the layout has changed.
    await expect(placementLinks(page)).toHaveCount(to >= 768 ? 1 : 0)
    await expect(focused).toBeFocused()
  })
}

test("reaches Product details by Shift+Tab from the stuck row's links, the block letting go to show it in place (STY-059 S8, D7, STY-065 D8)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openLongRoadmap(page, sheets)
  const main = page.getByRole("main")
  await main
    .getByRole("heading", { level: 2, name: "Later", exact: true })
    .evaluate((heading) => {
      heading.scrollIntoView({ block: "center" })
    })
  const stuck = page.locator("[data-stuck]")
  await expect(stuck).toBeVisible()
  // The stuck row holds the title, the controls and the links, not the facts.
  await expect(roadmapFacts(page)).not.toBeInViewport()

  await stuck.getByRole("link").first().focus()
  await page.keyboard.press("Shift+Tab")

  const disclosure = productDetailsDisclosure(page)
  await expect(disclosure).toBeFocused()
  await expect(stuck).toHaveCount(0)
  await expect(disclosure).toBeInViewport()
})

test("tabs on from the stuck row's menu button to the switch, then Add an item, the row staying stuck (STY-059 S7, STY-067 S13)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 820, height: 800 })
  await openLongRoadmap(page, sheets, { tab: "ProductC" })
  const main = page.getByRole("main")
  await main
    .getByRole("heading", { level: 2, name: "Later", exact: true })
    .evaluate((heading) => {
      heading.scrollIntoView({ block: "center" })
    })
  const stuck = page.locator("[data-stuck]")
  await expect(stuck).toBeVisible()
  const top = await page.evaluate(() => window.scrollY)

  await stuck.getByRole("button", { name: "Menu", exact: true }).focus()
  await page.keyboard.press("Tab")

  await expect(
    main.getByRole("button", { name: "Cards", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Tab")
  await page.keyboard.press("Tab")
  await expect(main.getByRole("button", { name: "Add an item" })).toBeFocused()
  await expect(stuck).toBeVisible()
  expect(await page.evaluate(() => window.scrollY)).toBe(top)
})
