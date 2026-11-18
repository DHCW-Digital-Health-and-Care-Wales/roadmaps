import type { Locator, Page } from "@playwright/test"

import type { Language } from "./fixtures/look"
import {
  aboutDisclosure,
  openLongRoadmap,
  roadmapFacts,
} from "./fixtures/roadmap-page"
import { expect, test } from "./fixtures/test"

/**
 * STY-059: a roadmap's page opens on one header block on one left edge: the title, its
 * facts, the Not published tag with Publish roadmap for a roadmap not published, About
 * this roadmap with its Edit, then Add an item, More and "Jump to".
 */

const WIDTHS = [
  ["a phone", 375],
  ["an iPad", 820],
  ["a desktop", 1280],
] as const

const COPY = {
  en: {
    title: { ProductA: "Product A roadmap", ProductC: "Product C roadmap" },
    status: "Status:",
    edit: "Edit About this roadmap",
    addItem: "Add an item",
    more: "More",
    jumpTo: "Jump to",
    notPublished: "Not published",
    publish: "Publish roadmap",
  },
  cy: {
    title: { ProductA: "Product A roadmap", ProductC: "Product C roadmap" },
    status: "Statws:",
    edit: "Golygu Ynglŷn â'r map trywydd hwn",
    addItem: "Ychwanegu eitem",
    more: "Mwy",
    jumpTo: "Neidio i",
    notPublished: "Heb ei gyhoeddi",
    publish: "Cyhoeddi'r map trywydd",
  },
} as const satisfies Record<Language, unknown>

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error("Not laid out")
  return box
}

/**
 * Each control of the header block that passes the layout's right edge, by its text.
 * The row of placement links scrolls within itself, and is STY-060's.
 */
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

for (const language of ["en", "cy"] as const) {
  const copy = COPY[language]
  for (const [device, width] of WIDTHS) {
    test(`opens on one header block on one left edge, top to bottom, on ${device} in ${language} (S1, S7, S8)`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await openLongRoadmap(page, sheets, { language })
      const main = page.getByRole("main")
      const button = (name: string) =>
        main.getByRole("button", { name, exact: true })

      const title = await boxOf(main.getByRole("heading", { level: 1 }))
      const facts = await boxOf(roadmapFacts(page, language))
      const disclosure = await boxOf(aboutDisclosure(page, language))
      const edit = await boxOf(button(copy.edit))
      const add = await boxOf(button(copy.addItem))
      const more = await boxOf(button(copy.more))
      const jumpTo = await boxOf(button(copy.jumpTo))

      // Top to bottom: the title, the facts, About with Edit beside it, the controls.
      expect(facts.y).toBeGreaterThanOrEqual(title.y + title.height)
      expect(disclosure.y).toBeGreaterThanOrEqual(facts.y + facts.height)
      expect(add.y).toBeGreaterThanOrEqual(
        Math.max(disclosure.y + disclosure.height, edit.y + edit.height),
      )
      // One left edge.
      for (const box of [facts, disclosure, add]) expect(box.x).toBe(title.x)
      // Add an item, More, then "Jump to", none wider than its label but "Jump to"
      // below a desktop, which STY-060 shapes.
      expect(more.x).toBeGreaterThan(add.x)
      expect(jumpTo.x > more.x || jumpTo.y > more.y).toBe(true)
      expect(add.height).toBe(40)
      expect(more.height).toBe(40)
      expect(edit.height).toBe(40)
      await expect(
        main.getByRole("link", { name: /Back to|Yn ôl/ }),
      ).toHaveCount(0)
      // Nothing scrolls sideways or passes the right edge.
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBe(0)
      expect(await pastTheRightEdge(page)).toEqual([])
      // The facts: on a phone one to a row, from 640px on one line.
      const items = roadmapFacts(page, language).getByRole("listitem")
      await expect(items.first()).toHaveText(`${copy.status} Beta`)
      const [first, second] = [
        await boxOf(items.nth(0)),
        await boxOf(items.nth(1)),
      ]
      const middle = (box: { y: number; height: number }) =>
        box.y + box.height / 2
      if (width < 640) expect(second.y).toBeGreaterThan(first.y + first.height)
      else expect(Math.abs(middle(second) - middle(first))).toBeLessThan(1)

      // Tab reaches Add an item, More and "Jump to" in that order after Edit.
      await button(copy.edit).focus()
      for (const name of [copy.addItem, copy.more, copy.jumpTo]) {
        await page.keyboard.press("Tab")
        await expect(button(name)).toBeFocused()
      }
    })

    test(`shows Not published and Publish roadmap under the facts, before About, on ${device} in ${language} (S6, S8)`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await openLongRoadmap(page, sheets, { tab: "ProductC", language })
      const main = page.getByRole("main")

      const facts = await boxOf(roadmapFacts(page, language))
      const tag = await boxOf(
        main.getByText(copy.notPublished, { exact: true }),
      )
      const publish = await boxOf(
        main.getByRole("button", { name: copy.publish, exact: true }),
      )
      const disclosure = await boxOf(aboutDisclosure(page, language))
      expect(tag.y).toBeGreaterThanOrEqual(facts.y + facts.height)
      // Beside the tag, or under it where Cymraeg leaves no room on a phone.
      if (publish.y < tag.y + tag.height) {
        expect(publish.x).toBeGreaterThan(tag.x + tag.width)
      } else {
        expect(publish.x).toBe(tag.x)
      }
      expect(publish.height).toBe(40)
      expect(disclosure.y).toBeGreaterThanOrEqual(publish.y + publish.height)
      expect(tag.x).toBe(facts.x)
      expect(await pastTheRightEdge(page)).toEqual([])
    })
  }
}

test("shows the title in the large heading size on a phone, and today's from 640px (S3)", async ({
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

test("reaches About's Edit by Shift+Tab from the stuck row, the block letting go to show it in place (S8, D7)", async ({
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
  // The stuck row holds the title and the controls, not the facts or About.
  await expect(roadmapFacts(page)).not.toBeInViewport()

  await main.getByRole("button", { name: "Add an item" }).focus()
  await page.keyboard.press("Shift+Tab")

  const edit = main.getByRole("button", { name: "Edit About this roadmap" })
  await expect(edit).toBeFocused()
  await expect(stuck).toHaveCount(0)
  await expect(edit).toBeInViewport()
  expect((await boxOf(edit)).height).toBe(40)
})
