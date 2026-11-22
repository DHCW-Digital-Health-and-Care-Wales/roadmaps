import AxeBuilder from "@axe-core/playwright"
import type { Locator, Page } from "@playwright/test"

import { openEditItemDialog } from "./fixtures/dialogs"
import { boxOf, boxesOf, scrollsSideways } from "./fixtures/layout"
import {
  cardOf,
  fieldOf,
  linesOf,
  openWithItems,
  THREE_LINES_WIDE,
  withItems,
  words,
} from "./fixtures/long-fields"
import { useTheme } from "./fixtures/look"
import { expect, test } from "./fixtures/test"

// A card cuts a field that runs past three lines (STY-066). jsdom lays nothing out, so
// the cut as drawn is read here, at the widths the page has.

test.use({ reducedMotion: "reduce" })

const LONG = words(60)

const ITEMS = [
  { Title: "Short", Description: "What this is, in a sentence." },
  { Title: "Long description", Description: LONG },
  { Title: "Long outcome", Description: "Short.", Outcome: LONG },
  {
    Title: "Breaks",
    Description: "Line one\nLine two\nLine three",
  },
  { Title: "Width", Description: THREE_LINES_WIDE },
  // Four lines, the cut falls between two details; the third line's detail is whole.
  { Title: "Between", Details: "First\n- Second\n-- Third\nFourth" },
  // The cut falls within the second detail, which wraps onto several lines.
  { Title: "Within", Details: `First\n${LONG}\nThird` },
  { Title: "One long detail", Details: LONG },
  { Title: "Three lines", Details: "First\n- Second\n-- Third" },
  { Title: "Last", Description: "Last." },
]

/** The cut of each detail's text in `field`, as the browser has it: its lines, or none. */
function detailClamps(field: Locator): Promise<string[]> {
  return field.evaluate((dd) =>
    [...dd.querySelectorAll("li > div")].map(
      (text) => getComputedStyle(text).webkitLineClamp,
    ),
  )
}

function showMore(card: Locator, of?: string): Locator {
  return card.getByRole("button", {
    name: new RegExp(`^Show more ${of ?? ""}`),
  })
}

for (const [width, height] of [
  [1280, 900],
  [375, 812],
] as const) {
  test.describe(`at ${String(width)}px`, () => {
    test.beforeEach(async ({ page, sheets }) => {
      await page.setViewportSize({ width, height })
      await openWithItems(page, sheets, withItems(...ITEMS), "Last")
    })

    test("a long description shows three lines, then opens in place and shuts (S1, S4, S9)", async ({
      page,
    }) => {
      const card = cardOf(page, "Long description")
      const field = fieldOf(card, "Description")
      const more = showMore(card, "of the description of Long description")

      await expect(more).toBeVisible()
      await expect(more).toHaveAttribute("aria-expanded", "false")
      expect((await linesOf(field)).shown).toBe(3)
      expect((await linesOf(field)).whole).toBeGreaterThan(3)
      expect(
        await field.evaluate(
          (dd) => getComputedStyle(dd.firstElementChild ?? dd).webkitLineClamp,
        ),
      ).toBe("3")
      expect(await scrollsSideways(page)).toBe(false)

      const before = await boxOf(field)
      await more.focus()
      await page.keyboard.press("Enter")
      const less = card.getByRole("button", {
        name: "Show less of the description of Long description",
      })
      await expect(less).toBeFocused()
      await expect(less).toHaveAttribute("aria-expanded", "true")
      const { shown, whole } = await linesOf(field)
      expect(shown).toBe(whole)
      expect((await boxOf(field)).height).toBeGreaterThan(before.height)

      await page.keyboard.press("Enter")
      await expect(more).toBeFocused()
      expect((await linesOf(field)).shown).toBe(3)
    })

    test("a long expected outcome is cut on its own (S2)", async ({ page }) => {
      const card = cardOf(page, "Long outcome")
      await expect(card.getByRole("button", { name: /^Show/ })).toHaveCount(1)
      await expect(
        showMore(card, "of the expected outcome of Long outcome"),
      ).toBeVisible()
      expect((await linesOf(fieldOf(card, "Expected outcome"))).shown).toBe(3)
      expect((await linesOf(fieldOf(card, "Description"))).shown).toBe(1)
    })

    test("a short field shows whole, with its line breaks (S5)", async ({
      page,
    }) => {
      const card = cardOf(page, "Breaks")
      await expect(card.getByRole("button", { name: /Show/ })).toHaveCount(0)
      expect(await linesOf(fieldOf(card, "Description"))).toEqual({
        shown: 3,
        whole: 3,
      })
      await expect(
        cardOf(page, "Three lines").getByRole("button", { name: /Show/ }),
      ).toHaveCount(0)
    })

    test("a list of details is cut at its third line, between details with no ellipsis (S3)", async ({
      page,
    }) => {
      const card = cardOf(page, "Between")
      const field = fieldOf(card, "Details")
      await expect(showMore(card, "of the details of Between")).toBeVisible()
      expect((await linesOf(field)).shown).toBe(3)
      expect(await detailClamps(field)).toEqual([
        "none",
        "none",
        "none",
        "none",
      ])
      // The fourth is cut away by the list's height, below the field's third line.
      const [fourth, list] = await boxesOf(
        field.getByText("Fourth"),
        field.locator(":scope > div"),
      )
      expect(fourth.y).toBeGreaterThanOrEqual(list.bottom - 1)
    })

    test("a detail the cut falls within ends in an ellipsis on the third line (S3)", async ({
      page,
    }) => {
      const card = cardOf(page, "Within")
      const field = fieldOf(card, "Details")
      expect((await linesOf(field)).shown).toBe(3)
      expect(await detailClamps(field)).toEqual(["none", "2", "none"])
    })

    test("one detail that wraps past three lines is cut within itself (S3)", async ({
      page,
    }) => {
      const field = fieldOf(cardOf(page, "One long detail"), "Details")
      expect((await linesOf(field)).shown).toBe(3)
      expect(await detailClamps(field)).toEqual(["3"])
    })

    test("a list opens whole and cuts again (S4)", async ({ page }) => {
      const card = cardOf(page, "Within")
      const field = fieldOf(card, "Details")
      await showMore(card).click()
      expect(await detailClamps(field)).toEqual(["none", "none", "none"])
      const { shown, whole } = await linesOf(field)
      expect(shown).toBe(whole)
      await card.getByRole("button", { name: /^Show less/ }).click()
      expect((await linesOf(field)).shown).toBe(3)
    })

    test("names each control for its field and item (S6)", async ({ page }) => {
      const names = await page
        .getByRole("main")
        .getByRole("button", { name: /^Show more/ })
        .evaluateAll((buttons) => buttons.map((b) => b.textContent.trim()))
      expect(names.length).toBeGreaterThan(4)
      expect(new Set(names).size).toBe(names.length)
    })
  })
}

test("the cut follows the card's width: the window and the navigation's fold (S7)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openWithItems(page, sheets, withItems(...ITEMS), "Last")
  const card = cardOf(page, "Width")
  const control = card.getByRole("button", { name: /^Show more/ })
  const field = fieldOf(card, "Description")

  // Three lines beside the open navigation: shown whole.
  await expect(control).toHaveCount(0)
  expect(await linesOf(field)).toEqual({ shown: 3, whole: 3 })

  // Folded, the page has more room for its cards' columns, so each is narrower.
  await page.getByRole("button", { name: "Fold the navigation" }).click()
  await expect(control).toBeVisible()
  expect((await linesOf(field)).shown).toBe(3)
  expect((await linesOf(field)).whole).toBeGreaterThan(3)
  await page.getByRole("button", { name: "Open the navigation" }).click()
  await expect(control).toHaveCount(0)

  // A phone's card: four lines or more.
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(control).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(control).toHaveCount(0)
})

test("a field stays open until it is shut, however the page is resized (D7)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openWithItems(page, sheets, withItems(...ITEMS), "Last")
  const card = cardOf(page, "Long description")
  await showMore(card).click()
  await page.setViewportSize({ width: 375, height: 812 })
  const field = fieldOf(card, "Description")
  await expect(card.getByRole("button", { name: /^Show less/ })).toBeVisible()
  const { shown, whole } = await linesOf(field)
  expect(shown).toBe(whole)
})

test("keeps focus on Show less when a resize lets the field fit (S4, D7)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openWithItems(page, sheets, withItems(...ITEMS), "Last")
  const card = cardOf(page, "Width")
  await card.getByRole("button", { name: /^Show more/ }).click()
  const less = card.getByRole("button", { name: /^Show less/ })
  await expect(less).toBeFocused()

  await page.setViewportSize({ width: 1280, height: 900 })
  // The field now fits: a frame to measure it, a frame for the page to draw again.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve)
        })
      }),
  )
  expect(await linesOf(fieldOf(card, "Description"))).toEqual({
    shown: 3,
    whole: 3,
  })
  await expect(less).toBeFocused()
})

test("a pending change to a description is cut as it is, with its Changed tag (S8)", async ({
  page,
  sheets,
}) => {
  await openWithItems(page, sheets, withItems(...ITEMS), "Last")
  const form = await openEditItemDialog(page, "Short")
  await form.getByRole("textbox", { name: "Description" }).fill(LONG)
  await form.getByRole("button", { name: "Done" }).click()
  await expect(form).toBeHidden()

  const card = cardOf(page, "Short")
  await expect(card.getByText("Changed")).toBeVisible()
  await expect(showMore(card, "of the description of Short")).toBeVisible()
  expect((await linesOf(fieldOf(card, "Description"))).shown).toBe(3)
})

test.describe("in Welsh at 375px", () => {
  test("says Dangos mwy and Dangos llai, and nothing scrolls sideways (S9)", async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openWithItems(
      page,
      sheets,
      withItems(
        {
          Title: "Long description",
          Description: LONG,
          "Title (cy)": "Disgrifiad hir",
          "Description (cy)": LONG,
        },
        { Title: "Last", "Title (cy)": "Olaf", Description: "Last." },
      ),
      "Olaf",
      "cy",
    )
    const card = cardOf(page, "Disgrifiad hir")
    await card
      .getByRole("button", {
        name: "Dangos mwy o'r disgrifiad ar gyfer Disgrifiad hir",
      })
      .click()
    await expect(
      card.getByRole("button", {
        name: "Dangos llai o'r disgrifiad ar gyfer Disgrifiad hir",
      }),
    ).toBeVisible()
    expect(await scrollsSideways(page)).toBe(false)
  })
})

// WCAG 2.2 AA, cut and open, in each theme, at each width.
for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 375]) {
    test(`has no axe violation in the ${theme} theme at ${String(width)}px (S9)`, async ({
      page,
      sheets,
    }) => {
      await useTheme(page, theme)
      await page.setViewportSize({ width, height: 900 })
      await openWithItems(page, sheets, withItems(...ITEMS), "Last")
      const expectNone = async (page: Page) => {
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze()
        expect(violations.map(({ id }) => id)).toEqual([])
      }
      await expectNone(page)
      const more = page
        .getByRole("main")
        .getByRole("button", { name: /^Show more/ })
      while ((await more.count()) > 0) await more.first().click()
      await expectNone(page)
    })
  }
}
