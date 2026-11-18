import type { Locator, Page } from "@playwright/test"

import { openEditItemDialog, openEditRoadmapDialog } from "./fixtures/dialogs"
import { withTabItems } from "./fixtures/fake-sheets"
import { boxOf, scrollsSideways } from "./fixtures/layout"
import type { Language } from "./fixtures/look"
import {
  focusClearOfBars,
  jumpTo,
  LEFT_THE_CONTENT,
  openAbout,
  openLongRoadmap,
  openRoadmapIn,
  placementLinks,
  shownInStuckRow,
} from "./fixtures/roadmap-page"
import { expect, test } from "./fixtures/test"

/**
 * STY-060: a roadmap's page keeps one row of controls, at the top and once scrolled:
 * one jump control per width, "Jump to" below 1024px and the placement links from it;
 * the stuck strip shaped per width; and the pending changes' foot bar on one row.
 */

const COPY = {
  en: {
    addItem: "Add an item",
    more: "More",
    jumpTo: "Jump to",
    links: "Horizons and sections",
    title: "Title",
    done: "Done",
    next: "Next",
    later: "Later",
    longest: "Recently delivered",
    pending: "2 unpublished changes",
    publish: "Publish changes",
    discard: "Discard all changes",
  },
  cy: {
    addItem: "Ychwanegu eitem",
    more: "Mwy",
    jumpTo: "Neidio i",
    links: "Gorwelion ac adrannau",
    title: "Teitl (Saesneg)",
    done: "Gorffen",
    next: "Nesaf",
    later: "Hwyrach",
    longest: "Wedi'u cyflawni'n ddiweddar",
    pending: "2 newid heb eu cyhoeddi",
    publish: "Cyhoeddi'r newidiadau",
    discard: "Gwaredu pob newid",
  },
} as const satisfies Record<Language, Record<string, string>>

const LONG_TITLE =
  "Demographics and Identity: the Master Patient Index, the Welsh Demographic Service and WAMS"

function button(page: Page, name: string): Locator {
  return page.getByRole("main").getByRole("button", { name, exact: true })
}

/** The right edge of the page's content, where a control may run to. */
async function contentRight(page: Page): Promise<number> {
  return page
    .getByRole("main")
    .getByRole("heading", { level: 1 })
    .evaluate((title) => {
      const content = title.closest("[data-slot=page-container]")
      if (!content) throw new Error("No page container")
      const style = getComputedStyle(content)
      return (
        content.getBoundingClientRect().right -
        Number.parseFloat(style.paddingRight)
      )
    })
}

/** Retitles items, leaving a change pending for each. */
async function editItems(
  page: Page,
  titles: readonly string[],
  language: Language = "en",
) {
  for (const from of titles) {
    const form = await openEditItemDialog(page, from, language)
    await form
      .getByRole("textbox", { name: COPY[language].title })
      .fill(`${from}, edited`)
    await form.getByRole("button", { name: COPY[language].done }).click()
    await expect(form).toBeHidden()
  }
}

/**
 * Scrolls the page into the placement `name`, its heading just under the stuck strip,
 * so the jump control names it.
 */
async function scrollInto(page: Page, name: string) {
  const heading = page
    .getByRole("main")
    .getByRole("heading", { level: 2, name, exact: true })
  await heading.evaluate((element) => {
    element.scrollIntoView({ block: "start" })
  })
  await expect(page.locator("[data-stuck]")).toBeVisible()
  // Again, now the strip's height keeps the heading clear of it.
  await heading.evaluate((element) => {
    element.scrollIntoView({ block: "start" })
  })
}

for (const language of ["en", "cy"] as const) {
  const copy = COPY[language]
  for (const width of [375, 640, 768, 820, 1024, 1280]) {
    const desktop = width >= 1024
    test(`shows one jump control at ${String(width)}px in ${language}, the same at the top and once stuck (S1)`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await openLongRoadmap(page, sheets, { language })
      const strip = page.locator("[data-stuck]")

      if (desktop) {
        await expect(placementLinks(page, language)).toBeVisible()
        await expect(jumpTo(page, language)).toHaveCount(0)
        // Under Add an item and More.
        const more = await boxOf(button(page, copy.more))
        expect(
          (await boxOf(placementLinks(page, language))).y,
        ).toBeGreaterThanOrEqual(more.bottom)
      } else {
        await expect(jumpTo(page, language)).toBeVisible()
        await expect(placementLinks(page, language)).toHaveCount(0)
      }

      await scrollInto(page, copy.next)

      if (desktop) {
        const shown = strip.getByRole("navigation", { name: copy.links })
        await expect(shown).toBeInViewport({ ratio: 1 })
        await expect(shown.getByRole("link")).toHaveCount(6)
        // The current placement marked, with its count.
        await expect(
          shown.getByRole("link", { name: new RegExp(`^${copy.next},`) }),
        ).toHaveAttribute("aria-current", "location")
        await expect(jumpTo(page, language)).toHaveCount(0)
        // Each in view, wrapping onto another line where the six do not fit.
        for (const link of await shown.getByRole("link").all()) {
          await expect(link).toBeInViewport({ ratio: 1 })
        }
      } else {
        await expect(
          strip.getByRole("button", {
            name: `${copy.jumpTo}: ${copy.next}`,
          }),
        ).toBeInViewport({ ratio: 1 })
        await expect(placementLinks(page, language)).toHaveCount(0)
      }
      for (const control of await shownInStuckRow(page)) {
        await expect(control).toBeInViewport({ ratio: 1 })
      }
      expect(await scrollsSideways(page)).toBe(false)
    })
  }
}

test("puts Add an item and More on a phone's row, each its label's width, and Jump to across the row below (S2)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await openLongRoadmap(page, sheets)

  const add = await boxOf(button(page, "Add an item"))
  const more = await boxOf(button(page, "More"))
  const jump = await boxOf(jumpTo(page))
  expect(more.y).toBe(add.y)
  expect(more.x).toBeGreaterThan(add.right)
  // Each as wide as its label: together well short of the row.
  expect(more.right).toBeLessThan((await contentRight(page)) - 60)
  expect(jump.y).toBeGreaterThanOrEqual(add.bottom)
  expect(jump.x).toBe(add.x)
  expect(Math.abs(jump.right - (await contentRight(page)))).toBeLessThan(1)
})

for (const language of ["en", "cy"] as const) {
  test(`puts Add an item, More and Jump to on one row on an iPad, Jump to growing to the edge, in ${language} (S2)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width: 820, height: 1180 })
    await openLongRoadmap(page, sheets, { language })
    const copy = COPY[language]

    const add = await boxOf(button(page, copy.addItem))
    const more = await boxOf(button(page, copy.more))
    const jump = await boxOf(jumpTo(page, language))
    expect(more.y).toBe(add.y)
    expect(jump.y).toBe(add.y)
    expect(jump.x).toBeGreaterThan(more.right)
    expect(Math.abs(jump.right - (await contentRight(page)))).toBeLessThan(1)
    expect(jump.height).toBe(40)
  })
}

test("keeps a phone's top to the screen's width with About open on a long address (S2)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openLongRoadmap(page, sheets)
  const dialog = await openEditRoadmapDialog(page)
  await dialog
    .getByRole("textbox", { name: "Vision" })
    .fill(
      "See https://digitalhealth.wales/our-services/national-data-resource/roadmap-and-releases",
    )
  await dialog.getByRole("button", { name: "Done" }).click()
  await expect(dialog).toBeHidden()

  await openAbout(page)

  await jumpTo(page).scrollIntoViewIfNeeded()
  await expect(jumpTo(page)).toBeInViewport({ ratio: 1 })
  expect(await scrollsSideways(page)).toBe(false)
})

test("keeps a 360px phone's top to the screen's width in Cymraeg, Jump to naming the unplaced items (S2, S5)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openRoadmapIn(page, sheets, {
    spreadsheet: withTabItems(
      "ProductA",
      ["Leaflets in plain language", "Soon"],
      ["Now item", "Now"],
      ["Later item", "Later"],
    ),
    tab: "ProductA",
    lastCard: "Later item",
    language: "cy",
  })

  await jumpTo(page, "cy").click()
  await page
    .getByRole("menuitem", { name: /^Ddim ar y map trywydd cyhoeddus,/ })
    .click()

  const jump = jumpTo(page, "cy")
  await expect(jump).toHaveAccessibleName(
    "Neidio i: Ddim ar y map trywydd cyhoeddus",
  )
  await expect(jump).toBeInViewport({ ratio: 1 })
  expect(await scrollsSideways(page)).toBe(false)
})

test("shapes a phone's stuck strip as two rows: the menu button and the title cut after two lines, then +, … and Jump to (S3)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openLongRoadmap(page, sheets)
  const dialog = await openEditRoadmapDialog(page)
  await dialog.getByRole("textbox", { name: "Title" }).fill(LONG_TITLE)
  await dialog.getByRole("button", { name: "Done" }).click()
  await expect(dialog).toBeHidden()
  await editItems(page, ["Planned work 2"])
  await expect(
    page.getByRole("main").getByText("2 unpublished changes"),
  ).toBeVisible()

  await scrollInto(page, "Next")

  const strip = page.locator("[data-stuck]")
  const menuButton = await boxOf(strip.getByRole("button", { name: /^Menu/ }))
  const titleHeading = strip.getByRole("heading", { level: 1 })
  await expect(titleHeading).toHaveAccessibleName(LONG_TITLE)
  const title = await boxOf(titleHeading)
  // Row one: the menu button, then the title, cut after two lines with an ellipsis.
  expect(title.x).toBeGreaterThan(menuButton.right)
  expect(title.y).toBeLessThan(menuButton.bottom)
  await expect(titleHeading).toHaveCSS("-webkit-line-clamp", "2")
  const lines = await titleHeading.evaluate((h1) => ({
    cut: h1.scrollHeight > h1.clientHeight,
    lines: h1.clientHeight / Number.parseFloat(getComputedStyle(h1).lineHeight),
  }))
  expect(lines.cut).toBe(true)
  expect(Math.round(lines.lines)).toBe(2)

  // Row two: +, … with its chevron, then "Jump to: Next" to the right edge.
  const addButton = strip.getByRole("button", { name: "Add an item" })
  const moreButton = strip.getByRole("button", { name: "More", exact: true })
  const jumpButton = strip.getByRole("button", { name: "Jump to: Next" })
  const [add, more, jump] = [
    await boxOf(addButton),
    await boxOf(moreButton),
    await boxOf(jumpButton),
  ]
  expect(add.y).toBeGreaterThanOrEqual(
    Math.max(title.bottom, menuButton.bottom),
  )
  for (const box of [add, more, jump]) {
    expect(box.height).toBe(40)
    expect(box.y).toBe(add.y)
  }
  expect(add.width).toBe(40)
  expect(add.x).toBe(menuButton.x)
  // Icons alone: no visible label, an ellipsis and a chevron.
  await expect(moreButton.locator("svg")).toHaveCount(2)
  expect(more.width).toBeLessThan(70)
  expect(more.x).toBeGreaterThan(add.right)
  expect(jump.x).toBeGreaterThan(more.right)
  expect(Math.abs(jump.right - (await contentRight(page)))).toBeLessThan(1)
  expect(await scrollsSideways(page)).toBe(false)
})

test("shapes an iPad's stuck strip as the phone's two rows, Add an item and More labelled (S4)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openLongRoadmap(page, sheets)

  await scrollInto(page, "Next")

  const strip = page.locator("[data-stuck]")
  const title = await boxOf(strip.getByRole("heading", { level: 1 }))
  const addButton = strip.getByRole("button", { name: "Add an item" })
  const moreButton = strip.getByRole("button", { name: "More", exact: true })
  await expect(addButton).toHaveText("Add an item")
  await expect(moreButton).toHaveText("More")
  const [add, more, jump] = [
    await boxOf(addButton),
    await boxOf(moreButton),
    await boxOf(strip.getByRole("button", { name: "Jump to: Next" })),
  ]
  expect(add.y).toBeGreaterThanOrEqual(title.bottom)
  expect(more.y).toBe(add.y)
  expect(jump.y).toBe(add.y)
  expect(add.width).toBeGreaterThan(100)
  expect(Math.abs(jump.right - (await contentRight(page)))).toBeLessThan(1)
})

test("shapes a desktop's stuck strip as the title with Add an item and More on its right, then the links (S4, D4)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openLongRoadmap(page, sheets)
  // At the top, Add an item and More start the row, on the left.
  const titleAtTop = await boxOf(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  )
  expect((await boxOf(button(page, "Add an item"))).x).toBe(titleAtTop.x)

  await scrollInto(page, "Next")

  const strip = page.locator("[data-stuck]")
  const title = await boxOf(strip.getByRole("heading", { level: 1 }))
  const add = await boxOf(strip.getByRole("button", { name: "Add an item" }))
  const more = await boxOf(
    strip.getByRole("button", { name: "More", exact: true }),
  )
  const row = await boxOf(
    strip.getByRole("navigation", { name: COPY.en.links }),
  )
  expect(add.x).toBeGreaterThan(title.right)
  expect(more.x).toBeGreaterThan(add.right)
  expect(Math.abs(more.right - (await contentRight(page)))).toBeLessThan(1)
  // One row: the title's middle level with the buttons'.
  const middle = (box: { y: number; height: number }) => box.y + box.height / 2
  expect(Math.abs(middle(title) - middle(add))).toBeLessThan(1)
  expect(row.y).toBeGreaterThanOrEqual(Math.max(title.bottom, add.bottom))
  // On the title's left edge: the navigation is beside the page, so no menu button.
  expect(row.x).toBe(title.x)
  await expect(strip.getByRole("link", { name: /^Next,/ })).toHaveAttribute(
    "aria-current",
    "location",
  )
})

test("keeps a stuck Jump to on one line in Cymraeg on a phone, the longest placement's name cut but whole in its name and the list (S5)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openLongRoadmap(page, sheets, { language: "cy" })
  const name = COPY.cy.longest

  // Into it, with the strip stuck: under the header's place, the first placement's
  // heading cannot sit just below the strip, so scroll a little past it.
  await page
    .getByRole("main")
    .getByRole("heading", { level: 2, name, exact: true })
    .evaluate((heading) => {
      heading.scrollIntoView({ block: "start" })
      window.scrollBy(0, 40)
    })
  await expect(page.locator("[data-stuck]")).toBeVisible()

  const strip = page.locator("[data-stuck]")
  const jump = strip.getByRole("button", { name: `Neidio i: ${name}` })
  await expect(jump).toBeInViewport({ ratio: 1 })
  expect((await boxOf(jump)).height).toBe(40)
  // Its label cut with an ellipsis.
  const label = jump.locator("span").first()
  await expect(label).toHaveCSS("text-overflow", "ellipsis")
  expect(
    await label.evaluate((span) => span.scrollWidth > span.clientWidth),
  ).toBe(true)

  await jump.click()
  const item = page
    .getByRole("menu")
    .getByRole("menuitem", { name: new RegExp(`^${name},`) })
  await expect(item).toContainText(name)
  await expect(item).toBeInViewport({ ratio: 1 })
  expect(await scrollsSideways(page)).toBe(false)
})

for (const language of ["en", "cy"] as const) {
  const copy = COPY[language]
  for (const width of [375, 820, 1280]) {
    test(`puts the count, Publish and Discard on one row at ${String(width)}px in ${language} (S6)`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await openLongRoadmap(page, sheets, { language })
      await editItems(page, ["Planned work 1", "Planned work 2"], language)
      await scrollInto(page, copy.next)

      const foot = page.locator("[data-pinned]")
      const countText = foot.getByText(copy.pending, { exact: true })
      const publishButton = foot.getByRole("button", { name: copy.publish })
      const discardButton = foot.getByRole("button", { name: copy.discard })
      const [count, publish, discard] = [
        await boxOf(countText),
        await boxOf(publishButton),
        await boxOf(discardButton),
      ]
      expect(discard.y).toBe(publish.y)
      expect(publish.x).toBeGreaterThan(count.right)
      expect(discard.x).toBeGreaterThan(publish.right)
      // The count beside them, on two lines at most.
      expect(count.y).toBeLessThan(publish.bottom)
      expect(count.bottom).toBeGreaterThan(publish.y)
      const lineHeight = await countText.evaluate((text) =>
        Number.parseFloat(getComputedStyle(text).lineHeight),
      )
      expect(count.height).toBeLessThanOrEqual(2 * lineHeight + 0.5)
      for (const control of [countText, publishButton, discardButton]) {
        await expect(control).toBeInViewport({ ratio: 1 })
      }
      // On a phone, Publish shows no icon.
      if (width < 640) await expect(publishButton.locator("svg")).toBeHidden()
      else await expect(publishButton.locator("svg")).toBeVisible()
      expect(await scrollsSideways(page)).toBe(false)
    })
  }
}

test("keeps Save, for a roadmap not published, on the phone's one row, its name unchanged (S6)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openLongRoadmap(page, sheets, { tab: "ProductC" })
  await editItems(page, ["Planned work 1", "Planned work 2"])
  await scrollInto(page, "Next")

  const foot = page.locator("[data-pinned]")
  const save = foot.getByRole("button", { name: "Save changes" })
  await expect(save).toHaveText("Save")
  const [count, saveBox, discard] = [
    await boxOf(foot.getByText("2 changes to save")),
    await boxOf(save),
    await boxOf(foot.getByRole("button", { name: "Discard all changes" })),
  ]
  expect(discard.y).toBe(saveBox.y)
  // The count beside them, not above.
  expect(saveBox.x).toBeGreaterThan(count.right)
  expect(count.y).toBeLessThan(saveBox.bottom)
  expect(count.bottom).toBeGreaterThan(saveBox.y)
})

for (const [device, size] of [
  ["a phone", { width: 375, height: 812 }],
  ["an iPad", { width: 820, height: 1180 }],
  ["a desktop", { width: 1280, height: 800 }],
] as const) {
  test(`keeps the heading jumped to and each control tabbed to clear of the strip and the foot bar on ${device} (S7)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize(size)
    await openLongRoadmap(page, sheets)
    await editItems(page, ["Planned work 1", "Planned work 2"])

    if (size.width >= 1024) {
      await placementLinks(page)
        .getByRole("link", { name: /^Later,/ })
        .click()
    } else {
      await jumpTo(page).click()
      await page.getByRole("menuitem", { name: /^Later,/ }).click()
    }

    await expect(
      page.getByRole("main").getByRole("heading", { level: 2, name: "Later" }),
    ).toBeFocused()
    expect(await focusClearOfBars(page)).toBeNull()
    const hidden: string[] = []
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let press = 0; press < 12; press++) {
        await page.keyboard.press(key)
        const problem = await focusClearOfBars(page)
        if (problem === LEFT_THE_CONTENT) break
        if (problem) hidden.push(`${key}: ${problem}`)
      }
    }
    expect(hidden).toEqual([])
  })
}

test("pins nothing below 500px of height, a phone on its side (S7)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 812, height: 375 })
  await openLongRoadmap(page, sheets)
  await editItems(page, ["Planned work 1", "Planned work 2"])

  await page
    .getByRole("main")
    .getByRole("heading", { level: 2, name: "Later" })
    .evaluate((heading) => {
      heading.scrollIntoView({ block: "start" })
    })

  await expect(page.locator("[data-stuck]")).toHaveCount(0)
  await expect(page.locator("[data-pinned]")).toHaveCount(0)
  expect(await scrollsSideways(page)).toBe(false)
})
