import AxeBuilder from "@axe-core/playwright"
import type { Locator, Page } from "@playwright/test"

import { openEditItemDialog, openEditRoadmapDialog } from "./fixtures/dialogs"
import { tabTo } from "./fixtures/keyboard"
import { boxOf, contentRight, scrollsSideways } from "./fixtures/layout"
import {
  fieldOf,
  linesOf,
  openWithItems,
  withItems,
  words,
} from "./fixtures/long-fields"
import { type Language, useTheme } from "./fixtures/look"
import { jumpTo, shownInStuckRow } from "./fixtures/roadmap-page"
import { expect, test } from "./fixtures/test"

// The compact view of a roadmap's items and the switch to it (STY-067). jsdom lays
// nothing out, so a row's one line, its cuts and where the switch sits are read here,
// at the widths the page has.

test.use({ reducedMotion: "reduce" })

const COPY = {
  en: {
    view: "View",
    cards: "Cards",
    compact: "Compact",
    compactView: "Compact view",
    addItem: "Add an item",
    more: "More",
    show: "Show the rest of",
    later: "Later",
    productName: "Product name",
    done: "Done",
  },
  cy: {
    view: "Golwg",
    cards: "Cardiau",
    compact: "Cryno",
    compactView: "Golwg gryno",
    addItem: "Ychwanegu eitem",
    more: "Mwy",
    show: "Dangos gweddill",
    later: "Hwyrach",
    productName: "Enw'r cynnyrch (Saesneg)",
    done: "Gorffen",
  },
} as const satisfies Record<Language, Record<string, string>>

const LONG_TITLE =
  "Demographics and Identity: the Master Patient Index, the Welsh Demographic Service and WAMS"
const LONG_ITEM_TITLE = `A title longer than any line: ${words(30)}`

const ITEMS = [
  { Title: "Someday", Horizon: "Soon", Description: "Not yet placed." },
  {
    Title: "Far off",
    Horizon: "Sometime after the new financial year, once funded",
    Description: "A horizon written long.",
  },
  { Title: "Short", Description: "What this is, in a sentence." },
  { Title: "No description" },
  { Title: "Long description", Description: words(80), Phase: "Beta" },
  { Title: LONG_ITEM_TITLE, Description: "Never seen on a desktop." },
  { Title: "Long details", Details: `First\n- Second\n${words(40)}\nFourth` },
  ...Array.from({ length: 8 }, (_, at) => ({
    Title: `Later work ${String(at + 1)}`,
    Horizon: "Later",
    Description: words(20),
  })),
  { Title: "Last", Horizon: "Delivered this year", Description: "Last." },
]

function main(page: Page): Locator {
  return page.getByRole("main")
}

function button(page: Page, name: string): Locator {
  return main(page).getByRole("button", { name, exact: true })
}

/** Every item's row or card: a list item headed by its title. */
function itemsOf(page: Page): Locator {
  return main(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3 }) })
}

function rowOf(page: Page, title: string): Locator {
  return main(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

/** Chooses the compact view by the switch, at any width. */
async function chooseCompact(page: Page, language: Language = "en") {
  const copy = COPY[language]
  const wide = (page.viewportSize()?.width ?? 0) >= 768
  await button(page, wide ? copy.compact : copy.compactView).click()
  await expect(
    main(page).getByRole("button", { name: `${copy.show} Last` }),
  ).toBeVisible()
}

test.describe("a desktop's row (S4)", () => {
  for (const width of [768, 1024, 1280]) {
    test(`is one line at ${String(width)}px: the title, the start of the description cut with an ellipsis, then Move and Edit in view`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await openWithItems(page, sheets, withItems(...ITEMS), "Last")
      await chooseCompact(page)
      const right = await contentRight(page)

      for (const row of await itemsOf(page).all()) {
        const line = await boxOf(row)
        // One line: a row no taller than its controls and padding, flagged or not.
        expect(line.height).toBeLessThanOrEqual(49)
        expect(line.right).toBeLessThanOrEqual(right + 1)
        for (const name of [/^Move /, /^Edit /]) {
          const control = row.getByRole("button", { name })
          await control.scrollIntoViewIfNeeded()
          await expect(control).toBeInViewport({ ratio: 1 })
          expect((await boxOf(control)).right).toBeLessThanOrEqual(line.right)
        }
      }

      const description = rowOf(page, "Long description").locator("p")
      await expect(description).toHaveCSS("text-overflow", "ellipsis")
      expect(
        await description.evaluate((p) => p.scrollWidth > p.clientWidth),
      ).toBe(true)
      await expect(rowOf(page, "No description").locator("p")).toHaveCount(0)

      // A title longer than the line is cut too, and named whole.
      const longTitle = rowOf(page, LONG_ITEM_TITLE).getByRole("heading")
      await expect(longTitle).toHaveCSS("text-overflow", "ellipsis")
      expect(
        await longTitle.evaluate((h3) => h3.scrollWidth > h3.clientWidth),
      ).toBe(true)
      await expect(longTitle).toHaveAccessibleName(LONG_ITEM_TITLE)
      expect(await scrollsSideways(page)).toBe(false)
    })
  }

  test("puts an unplaced item's flag in the line", async ({ page, sheets }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await openWithItems(page, sheets, withItems(...ITEMS), "Last")
    await chooseCompact(page)

    const row = rowOf(page, "Someday")
    const flag = await boxOf(row.getByText("Horizon “Soon” isn't recognised"))
    const title = await boxOf(row.getByRole("heading"))
    expect(
      Math.abs(flag.y + flag.height / 2 - (title.y + title.height / 2)),
    ).toBeLessThan(4)
    expect((await boxOf(row)).height).toBeLessThanOrEqual(49)
  })

  for (const width of [768, 1024]) {
    test(`keeps a flagged row's title in view and its Edit within the list at ${String(width)}px in Cymraeg, a Changed tag beside the flag`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await openWithItems(page, sheets, withItems(...ITEMS), "Last", "cy")
      const form = await openEditItemDialog(page, "Someday", "cy")
      await form
        .getByRole("textbox", { name: "Disgrifiad (Saesneg)" })
        .fill("Changed, and not yet placed.")
      await form.getByRole("button", { name: COPY.cy.done }).click()
      await expect(form).toBeHidden()
      await chooseCompact(page, "cy")

      const row = rowOf(page, "Someday")
      const line = await boxOf(row)
      expect(line.height).toBeLessThanOrEqual(49)
      // The flag gives way, cut, before the title does.
      const title = await boxOf(row.getByRole("heading"))
      expect(title.width).toBeGreaterThan(60)
      const flag = row.getByText("Dydy'r gorwel “Soon” ddim yn cael ei adnabod")
      await expect(flag).toHaveCSS("text-overflow", "ellipsis")
      await expect(row.getByText("Wedi newid")).toBeVisible()
      // Opened, the flag shows whole.
      await row.getByRole("button", { name: "Dangos gweddill Someday" }).click()
      expect(
        await flag.evaluate((text) => text.scrollWidth <= text.clientWidth),
      ).toBe(true)
      await expect(flag).not.toHaveCSS("text-overflow", "ellipsis")
      const edit = await boxOf(
        row.getByRole("button", { name: "Golygu Someday" }),
      )
      expect(edit.right).toBeLessThanOrEqual(line.right)
      expect(await scrollsSideways(page)).toBe(false)
    })
  }
})

test.describe("a phone's row (S5)", () => {
  test("shows the title whole on its lines, no description, the flag under it, Move and Edit as icons at its end", async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openWithItems(page, sheets, withItems(...ITEMS), "Last")
    await chooseCompact(page)

    const row = rowOf(page, LONG_ITEM_TITLE)
    const title = row.getByRole("heading")
    const shown = await title.evaluate((h3) => ({
      lines: Math.round(
        h3.clientHeight / Number.parseFloat(getComputedStyle(h3).lineHeight),
      ),
      cut: h3.scrollWidth > h3.clientWidth,
    }))
    expect(shown.cut).toBe(false)
    expect(shown.lines).toBeGreaterThan(2)
    await expect(row.locator("p")).toHaveCount(0)

    const someday = rowOf(page, "Someday")
    const flag = await boxOf(
      someday.getByText("Horizon “Soon” isn't recognised"),
    )
    expect(flag.y).toBeGreaterThanOrEqual(
      (await boxOf(someday.getByRole("heading"))).bottom,
    )

    for (const each of await itemsOf(page).all()) {
      for (const name of [/^Move /, /^Edit /]) {
        const control = each.getByRole("button", { name })
        await control.scrollIntoViewIfNeeded()
        await expect(control).toBeInViewport({ ratio: 1 })
        expect((await boxOf(control)).width).toBe(32)
      }
    }
    expect(await scrollsSideways(page)).toBe(false)
  })
})

for (const [width, height] of [
  [1280, 900],
  [375, 812],
] as const) {
  test(`opens a row in place at ${String(width)}px, its long fields cut after three lines (S6, S7)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width, height })
    await openWithItems(page, sheets, withItems(...ITEMS), "Last")
    await chooseCompact(page)

    await button(page, "Show the rest of Long description").click()
    const row = rowOf(page, "Long description")
    await expect(
      button(page, "Hide the rest of Long description"),
    ).toHaveAttribute("aria-expanded", "true")
    const description = fieldOf(row, "Description")
    expect((await linesOf(description)).shown).toBe(3)
    await row
      .getByRole("button", {
        name: "Show more of the description of Long description",
      })
      .click()
    expect((await linesOf(description)).shown).toBeGreaterThan(3)
    // A short field shows whole, with no control.
    await expect(fieldOf(row, "Phase")).toHaveText("Beta")

    await button(page, "Show the rest of Long details").click()
    const details = rowOf(page, "Long details")
    await expect(
      details.getByRole("button", {
        name: "Show more of the details of Long details",
      }),
    ).toBeVisible()
    // On a desktop the title of an opened row shows whole.
    const title = rowOf(page, LONG_ITEM_TITLE).getByRole("heading")
    await button(page, `Show the rest of ${LONG_ITEM_TITLE}`).click()
    expect(await title.evaluate((h3) => h3.scrollWidth > h3.clientWidth)).toBe(
      false,
    )
    expect(await scrollsSideways(page)).toBe(false)
  })
}

/**
 * Presses where `target` is drawn, as a pointer does. A row's text sits under the
 * chevron's stretch, so a locator's own click, which waits for the text to receive the
 * press, would never land: `force` presses its centre without waiting for the text to
 * receive the press, or to hold still. Playwright scrolls only to the nearest edge, which can
 * leave the target under the stuck header. So the target is brought to the middle and
 * left until two frames draw it in one place, as the header changes height with the
 * scroll.
 */
async function pressOn(target: Locator) {
  await target.evaluate(async (element) => {
    element.scrollIntoView({ block: "center" })
    let drawn = ""
    for (let frame = 0; frame < 60; frame += 1) {
      await new Promise((frameReady) => requestAnimationFrame(frameReady))
      const now = JSON.stringify(element.getBoundingClientRect())
      if (now === drawn) return
      drawn = now
    }
    throw new Error("Never drawn in one place")
  })
  await target.click({ force: true })
}

/**
 * Slows the page's CPU, as a busy run of the whole suite does, so a press that races
 * the page's own settling loses more often (DEF-020).
 */
async function loadTheCpu(page: Page) {
  const session = await page.context().newCDPSession(page)
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 })
}

/** A row's chevron, whatever its name says it will do. */
function rowChevron(row: Locator): Locator {
  return row.getByRole("button", { name: /^(Show|Hide) the rest of/ })
}

for (const [width, height] of [
  [1280, 900],
  [375, 812],
] as const) {
  test(`opens and closes a row by a press on its line at ${String(width)}px (STY-069)`, async ({
    page,
    sheets,
  }) => {
    await loadTheCpu(page)
    await page.setViewportSize({ width, height })
    await openWithItems(page, sheets, withItems(...ITEMS), "Last")
    await chooseCompact(page)
    const row = rowOf(page, "Short")
    const chevron = rowChevron(row)

    await expect(chevron).toHaveCSS("cursor", "pointer")
    await pressOn(row.getByRole("heading"))
    await expect(chevron).toHaveAttribute("aria-expanded", "true")
    // The opened row's fields are below the line, outside the stretch.
    await pressOn(fieldOf(row, "Description"))
    await expect(chevron).toHaveAttribute("aria-expanded", "true")
    await pressOn(row.getByRole("heading"))
    await expect(chevron).toHaveAttribute("aria-expanded", "false")

    if (width >= 768) {
      // The start of the description opens the row too.
      await pressOn(row.locator("p"))
      await expect(chevron).toHaveAttribute("aria-expanded", "true")
      await pressOn(row.getByRole("heading"))
      await expect(chevron).toHaveAttribute("aria-expanded", "false")
    }

    // An unplaced item's flag is under the stretch too.
    const flagged = rowOf(page, "Someday")
    await pressOn(flagged.getByText(/isn't recognised/))
    await expect(rowChevron(flagged)).toHaveAttribute("aria-expanded", "true")
  })

  test(`leaves a row as it is when Move or Edit is pressed at ${String(width)}px (STY-069)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width, height })
    await openWithItems(page, sheets, withItems(...ITEMS), "Last")
    await chooseCompact(page)
    const row = rowOf(page, "Short")

    // Plain clicks: each waits for its button to receive the press, which it would not
    // do beneath the stretch.
    await row.getByRole("button", { name: /^Move / }).click()
    await expect(rowChevron(row)).toHaveAttribute("aria-expanded", "false")
    await page.keyboard.press("Escape")

    await row.getByRole("button", { name: /^Edit / }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(rowChevron(row)).toHaveAttribute("aria-expanded", "false")
  })
}

test("keeps the placement the page was in at the top as the view changes, focus on the switch (S3)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openWithItems(page, sheets, withItems(...ITEMS), "Last")
  const later = main(page).getByRole("heading", { level: 2, name: "Later" })
  await later.evaluate((heading) => {
    heading.scrollIntoView({ block: "start" })
  })
  await expect(page.locator("[data-stuck]")).toBeVisible()
  await later.evaluate((heading) => {
    heading.scrollIntoView({ block: "start" })
  })
  await page.mouse.wheel(0, 200)
  await expect(
    page.locator("[data-stuck]").getByRole("link", { name: /^Later,/ }),
  ).toHaveAttribute("aria-current", "location")

  const strip = page.locator("[data-stuck]")
  await strip.getByRole("button", { name: "Compact", exact: true }).click()

  const compact = strip.getByRole("button", { name: "Compact", exact: true })
  await expect(compact).toBeFocused()
  await expect(compact).toHaveAttribute("aria-pressed", "true")
  await expect(later).toBeInViewport()
  const top = (await boxOf(strip)).bottom
  expect(Math.abs((await boxOf(later)).y - top)).toBeLessThan(4)

  await strip.getByRole("button", { name: "Cards", exact: true }).click()
  await expect(later).toBeInViewport()
  expect(Math.abs((await boxOf(later)).y - top)).toBeLessThan(4)
})

test("leaves the page where it is when the view in use is pressed, as the stuck header later changes height (S3)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openWithItems(page, sheets, withItems(...ITEMS), "Last")
  const heading = (name: string) =>
    main(page).getByRole("heading", { level: 2, name, exact: true })
  await heading("Later").evaluate((element) => {
    element.scrollIntoView({ block: "start" })
  })
  const strip = page.locator("[data-stuck]")
  await expect(strip).toBeVisible()
  await strip.getByRole("button", { name: "Cards", exact: true }).click()

  // Back up the page, the strip still stuck.
  await page.evaluate(() => {
    window.scrollBy(0, -300)
  })
  await expect(strip).toBeVisible()
  // Narrower, the stuck links wrap onto another line and the strip grows.
  const tall = (await boxOf(strip)).height
  await page.setViewportSize({ width: 820, height: 900 })
  await expect.poll(async () => (await boxOf(strip)).height).not.toBe(tall)

  // Later stays where the scroll left it, not pulled back under the strip.
  await expect
    .poll(
      async () =>
        (await boxOf(heading("Later"))).y - (await boxOf(strip)).bottom,
    )
    .toBeGreaterThan(100)
})

test("remembers the view on another roadmap and after a reload (S11)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openWithItems(page, sheets, withItems(...ITEMS), "Last")
  await chooseCompact(page)

  await page.reload()
  await main(page).getByRole("button", { name: "Connect Google" }).click()
  await expect(button(page, "Show the rest of Last")).toBeVisible()
  await expect(button(page, "Compact")).toHaveAttribute("aria-pressed", "true")

  await page.getByRole("link", { name: "Product B roadmap" }).click()
  await expect(
    main(page)
      .getByRole("button", { name: /^Show the rest of / })
      .first(),
  ).toBeVisible()
  await expect(button(page, "Compact")).toHaveAttribute("aria-pressed", "true")
})

test.describe("the switch beside a long title (S1, S2, S13)", () => {
  for (const language of ["en", "cy"] as const) {
    const copy = COPY[language]
    for (const width of [375, 640, 768, 1024, 1280]) {
      const tablet = width >= 768
      test(`sits ${tablet ? "before Add an item" : "after Jump to"} at ${String(width)}px in ${language}, at the top and once stuck`, async ({
        page,
        sheets,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await openWithItems(page, sheets, withItems(...ITEMS), "Last", language)
        const dialog = await openEditRoadmapDialog(page, { language })
        await dialog
          .getByRole("textbox", { name: copy.productName })
          .fill(LONG_TITLE)
        await dialog.getByRole("button", { name: copy.done }).click()
        await expect(dialog).toBeHidden()

        const check = async (within: Locator) => {
          if (tablet) {
            const group = within.getByRole("group", { name: copy.view })
            const add = await boxOf(
              within.getByRole("button", { name: copy.addItem }),
            )
            const more = await boxOf(
              within.getByRole("button", { name: copy.more, exact: true }),
            )
            for (const name of [copy.cards, copy.compact]) {
              const part = group.getByRole("button", { name, exact: true })
              await expect(part).toBeInViewport({ ratio: 1 })
              const box = await boxOf(part)
              expect(box.right).toBeLessThanOrEqual(add.x)
              expect(box.y).toBe(add.y)
            }
            expect(
              Math.abs(more.right - (await contentRight(page))),
            ).toBeLessThan(1)
          } else {
            const toggle = within.getByRole("button", {
              name: copy.compactView,
              exact: true,
            })
            await toggle.scrollIntoViewIfNeeded()
            await expect(toggle).toBeInViewport({ ratio: 1 })
            const box = await boxOf(toggle)
            const jump = await boxOf(jumpTo(page, language))
            expect(box.x).toBeGreaterThan(jump.right)
            expect(box.y).toBe(jump.y)
            expect(
              Math.abs(box.right - (await contentRight(page))),
            ).toBeLessThan(1)
          }
          expect(await scrollsSideways(page)).toBe(false)
        }

        await check(main(page))
        await chooseCompact(page, language)
        await check(main(page))

        const heading = main(page).getByRole("heading", {
          level: 2,
          name: copy.later,
          exact: true,
        })
        await heading.evaluate((element) => {
          element.scrollIntoView({ block: "start" })
        })
        const strip = page.locator("[data-stuck]")
        await expect(strip).toBeVisible()
        await check(strip)
        for (const control of await shownInStuckRow(page)) {
          await expect(control).toBeInViewport({ ratio: 1 })
        }
      })
    }
  }
})

test.describe("the keyboard (S13)", () => {
  test("reaches the switch before Add an item from 768px, and a row's chevron, Move and Edit in order", async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await openWithItems(page, sheets, withItems(...ITEMS), "Last")
    await main(page).getByRole("heading", { level: 1 }).focus()

    await tabTo(page, button(page, "Cards"))
    await page.keyboard.press("Tab")
    await expect(button(page, "Compact")).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(button(page, "Compact")).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await page.keyboard.press("Tab")
    await expect(button(page, "Add an item")).toBeFocused()

    const row = rowOf(page, "Short")
    await tabTo(
      page,
      row.getByRole("button", { name: "Show the rest of Short" }),
      "Tab",
      40,
    )
    await page.keyboard.press("Enter")
    await expect(
      row.getByRole("button", { name: "Hide the rest of Short" }),
    ).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(
      row.getByRole("button", { name: "Move Short", exact: true }),
    ).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(row.getByRole("button", { name: "Edit Short" })).toBeFocused()

    const headings = await main(page)
      .getByRole("heading")
      .evaluateAll((all) => all.map((heading) => heading.tagName))
    expect(headings[0]).toBe("H1")
    expect(headings.filter((tag) => tag === "H4")).toEqual([])
  })
})

// WCAG 2.2 AA in the compact view, a row opened, in each theme, at each width.
for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 375]) {
    test(`has no axe violation in the compact view in the ${theme} theme at ${String(width)}px (S13)`, async ({
      page,
      sheets,
    }) => {
      await useTheme(page, theme)
      await page.setViewportSize({ width, height: 900 })
      await openWithItems(page, sheets, withItems(...ITEMS), "Last")
      await chooseCompact(page)
      await button(page, "Show the rest of Long description").click()

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(violations.map(({ id }) => id)).toEqual([])
    })
  }
}
