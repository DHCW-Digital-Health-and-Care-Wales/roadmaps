import type { Locator, Page } from "@playwright/test"

import { addItem, confirmRemoval, openEditItemDialog } from "./fixtures/dialogs"
import { withTabItems } from "./fixtures/fake-sheets"
import { boxesOf, boxOf, centre, levelWithOrUnder } from "./fixtures/layout"
import { openWithItems, withItems, words } from "./fixtures/long-fields"
import {
  chooseCompact,
  chooseFromMenu,
  itemOf,
  main,
  moveButton,
  openProductA,
} from "./fixtures/moved-items"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-075: an item's tags sit together, and a compact row's keep still as it opens. The
 * moved label shows beside the pending tag, before it: at a card's foot, and on one line
 * in every row. Layout only, which jsdom does not draw: the tags' boxes against the
 * card's foot, the title and each other, and a row's positions closed, opened and
 * closed again, with and without reduced motion.
 */

const PHONE = { width: 375, height: 812 }
const DESKTOP = { width: 1280, height: 900 }
const LONG_TITLE = `A title that wraps onto several lines once its row is opened: ${words(12)}`

/** A tag of the item, by what it says. */
const tagOf = (item: Locator, text: RegExp | string): Locator =>
  item.locator('[data-slot="badge"]').filter({ hasText: text })

const MOVED = /^(Moved|Placed)/

for (const [device, size] of [
  ["a desktop", DESKTOP],
  ["a phone", PHONE],
] as const) {
  test.describe(`a card on ${device} (S1, S2)`, () => {
    test.use({ reducedMotion: "reduce" })

    test("shows “Moved from Now”, then “Changed”, side by side at its foot, before its buttons, nothing under the title", async ({
      page,
    }) => {
      await openProductA(page, size)
      await chooseFromMenu(page, "Minimal card", "Later")
      const card = itemOf(page, "Minimal card")

      const [moved, changed, title, undo, edit, whole, lastField] =
        await boxesOf(
          tagOf(card, "Moved from Now"),
          tagOf(card, "Changed"),
          card.getByRole("heading", { level: 3 }),
          card.getByRole("button", { name: "Undo changes Minimal card" }),
          card.getByRole("button", { name: "Edit Minimal card" }),
          card,
          card.locator("dd").last(),
        )
      // One line, the label first, a gap between them and nothing else.
      expect(Math.abs(centre(moved) - centre(changed))).toBeLessThan(1)
      expect(changed.x - moved.right).toBeGreaterThan(0)
      expect(changed.x - moved.right).toBeLessThan(16)
      // Not under the title: at the foot, below every field the card shows.
      expect(moved.y).toBeGreaterThan(title.bottom)
      expect(moved.y).toBeGreaterThan(lastField.bottom - 1)
      // The buttons follow the tags: on their line, or wrapped under them.
      expect(levelWithOrUnder(moved, undo)).toBe(true)
      expect(edit.bottom).toBeLessThanOrEqual(whole.bottom)
    })
  })
}

test.describe("a card on a desktop, where one run holds what the phone's cannot add (S1, S2)", () => {
  test.use({ reducedMotion: "reduce" })

  test("shows the label alone at its foot for an item moved within its placement", async ({
    page,
  }) => {
    await openProductA(page, DESKTOP)
    await chooseFromMenu(page, "Minimal card", "Down one")
    const card = itemOf(page, "Minimal card")

    await expect(tagOf(card, "Moved down")).toBeVisible()
    await expect(tagOf(card, "Changed")).toHaveCount(0)
    const [moved, move, lastField] = await boxesOf(
      tagOf(card, "Moved down"),
      moveButton(page, "Minimal card"),
      card.locator("dd").last(),
    )
    expect(moved.y).toBeGreaterThan(lastField.bottom - 1)
    expect(levelWithOrUnder(moved, move)).toBe(true)
  })

  test("shows “Removed” alone, and no label, where “Changed” shows", async ({
    page,
  }) => {
    await openProductA(page, DESKTOP)
    await chooseFromMenu(page, "Minimal card", "Down one")
    await confirmRemoval(page, "Minimal card")
    const card = itemOf(page, "Minimal card")

    await expect(tagOf(card, "Removed")).toBeVisible()
    await expect(tagOf(card, MOVED)).toHaveCount(0)
    await expect(tagOf(card, "Changed")).toHaveCount(0)
  })

  test("shows “Moved from Next”, then “New”, for a new item that is marked", async ({
    page,
  }) => {
    await openProductA(page, DESKTOP)
    await addItem(page, "Added item", "Next")
    await chooseFromMenu(page, "Added item", "Later")
    const card = itemOf(page, "Added item")

    await expect(tagOf(card, "Moved from Next")).toBeVisible()
    await expect(tagOf(card, "New")).toBeVisible()
    const [moved, added] = await boxesOf(
      tagOf(card, "Moved from Next"),
      tagOf(card, "New"),
    )
    expect(Math.abs(centre(moved) - centre(added))).toBeLessThan(1)
    expect(moved.right).toBeLessThan(added.x)
  })
})

test.describe("a narrow card (S2)", () => {
  test.use({ reducedMotion: "reduce" })

  test("wraps the second tag under the first, with nothing between them, where one line can't hold both", async ({
    page,
  }) => {
    await openProductA(page, { width: 320, height: 800 })
    await chooseFromMenu(page, "Minimal card", "Later")
    // The card's room narrowed to less than the two tags need.
    const card = itemOf(page, "Minimal card")
    await card.evaluate((element) => {
      element.style.width = "180px"
    })

    await expect(tagOf(card, "Changed")).toBeVisible()
    const [moved, changed] = await boxesOf(
      tagOf(card, "Moved from Now"),
      tagOf(card, "Changed"),
    )
    expect(changed.y).toBeGreaterThan(moved.bottom - 1)
    expect(Math.abs(changed.x - moved.x)).toBeLessThan(1)
    expect(changed.y - moved.bottom).toBeLessThan(12)
  })
})

test.describe("a phone's compact row (S3)", () => {
  test.use({ reducedMotion: "reduce" })

  test("shows the label and “Changed” on one line under the title, closed and opened", async ({
    page,
  }) => {
    await openProductA(page, PHONE)
    await chooseCompact(page)
    await chooseFromMenu(page, "Minimal card", "Later")
    const row = itemOf(page, "Minimal card")

    for (const state of ["closed", "opened"]) {
      if (state === "opened") {
        await row.getByRole("button", { name: /^Show/ }).click()
        await expect(row.getByRole("button", { name: /^Hide/ })).toBeVisible()
      }
      const [moved, changed, title] = await boxesOf(
        tagOf(row, MOVED),
        tagOf(row, "Changed"),
        row.getByRole("heading", { level: 3 }),
      )
      expect(Math.abs(centre(moved) - centre(changed))).toBeLessThan(1)
      expect(moved.x).toBeLessThan(changed.x)
      expect(moved.y).toBeGreaterThan(title.bottom - 1)
      expect(Math.abs(moved.x - title.x)).toBeLessThan(1)
    }
  })

  test("keeps an unplaced item's flag on its own line, above the tags", async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize(PHONE)
    await openWithItems(
      page,
      sheets,
      withItems({
        Title: "Someday",
        Horizon: "Soon",
        Description: "Unplaced.",
      }),
      "Someday",
    )
    const form = await openEditItemDialog(page, "Someday")
    await form
      .getByRole("textbox", { name: "Description", exact: true })
      .fill("Changed, and not yet placed.")
    await form.getByRole("button", { name: "Done" }).click()
    await expect(form).toBeHidden()
    await chooseCompact(page)
    const row = itemOf(page, "Someday")

    const [flag, changed] = await boxesOf(
      tagOf(row, /isn't recognised/),
      tagOf(row, "Changed"),
    )
    expect(changed.y).toBeGreaterThan(flag.bottom - 1)
  })
})

/**
 * Where a row's parts sit, from the row's top, to a tenth of a pixel, all read at once:
 * the page may be scrolling to the item meanwhile.
 */
async function placesIn(page: Page, row: Locator, title: string) {
  const parts = {
    chevron: row.getByRole("button", { name: /^(Show|Hide)/ }),
    title: row.getByRole("heading", { level: 3 }),
    moved: tagOf(row, MOVED),
    pending: tagOf(row, /^(Changed|New|Removed)/),
    flag: tagOf(row, /recognised|horizon/i),
    move: moveButton(page, title),
    edit: row.getByRole("button", { name: `Edit ${title}` }),
  }
  const names = Object.keys(parts) as (keyof typeof parts)[]
  const handles = await Promise.all([
    row.elementHandle(),
    ...names.map(async (name) =>
      (await parts[name].count()) === 0 ? null : parts[name].elementHandle(),
    ),
  ])
  const tops = await page.evaluate(
    ([rowElement, ...elements]) =>
      elements.map((element) =>
        element && rowElement
          ? Math.round(
              (element.getBoundingClientRect().y -
                rowElement.getBoundingClientRect().y) *
                10,
            ) / 10
          : null,
      ),
    handles,
  )
  return Object.fromEntries(names.map((name, at) => [name, tops[at]]))
}

/** Opens `row`, closes it, and expects each part where it was when closed. */
async function expectStill(page: Page, row: Locator, title: string) {
  // The move is drawn (a view transition may delay it): its tag is on the row.
  await expect(tagOf(row, /^(Changed|New|Removed)/)).toBeVisible()
  const closed = await placesIn(page, row, title)
  expect(closed.pending).not.toBeNull()
  await row.getByRole("button", { name: /^Show/ }).click()
  await expect(row.getByRole("button", { name: /^Hide/ })).toBeVisible()
  await expect.poll(() => placesIn(page, row, title)).toEqual(closed)
  await row.getByRole("button", { name: /^Hide/ }).click()
  await expect(row.getByRole("button", { name: /^Show/ })).toBeVisible()
  await expect.poll(() => placesIn(page, row, title)).toEqual(closed)
  return closed
}

for (const motion of ["reduce", "no-preference"] as const) {
  test.describe(`a desktop's compact row, reducedMotion ${motion} (S4)`, () => {
    test.use({ reducedMotion: motion })

    test("keeps the label and “Changed” at the height they have closed, level with the line, as it opens and closes", async ({
      page,
    }) => {
      await openProductA(page, DESKTOP)
      await chooseCompact(page)
      await chooseFromMenu(page, "Minimal card", "Later")
      const row = itemOf(page, "Minimal card")
      await expect(tagOf(row, MOVED)).toBeVisible()

      const closed = await expectStill(page, row, "Minimal card")
      // Centred on the line's 32px, as the row has them closed.
      const [moved, line] = await boxesOf(
        tagOf(row, MOVED),
        row.getByRole("button", { name: /^Hide|^Show/ }),
      )
      expect(Math.abs(centre(moved) - centre(line))).toBeLessThan(1)
      expect(closed.moved).toBe(closed.pending)
    })
  })
}

test.describe("a desktop's compact row, reducedMotion reduce (S4)", () => {
  test.use({ reducedMotion: "reduce" })

  test("keeps them still when the title wraps onto more lines opened", async ({
    page,
    sheets,
  }) => {
    sheets.spreadsheet = withTabItems(
      "ProductA",
      [LONG_TITLE, "Now"],
      ["Other", "Now"],
      ["Later one", "Later"],
    )
    await page.setViewportSize(DESKTOP)
    await page.goto("./#/roadmaps/producta")
    await connect(page)
    await expect(
      main(page).getByRole("heading", { level: 3, name: LONG_TITLE }),
    ).toBeVisible()
    await chooseCompact(page)
    await chooseFromMenu(page, LONG_TITLE, "Later")
    const row = itemOf(page, LONG_TITLE)
    // The move has landed: until then the row is the one it leaves.
    await expect(tagOf(row, "Moved from Now")).toBeVisible()
    const closedHeight = (await boxOf(row)).height

    await expectStill(page, row, LONG_TITLE)
    await row.getByRole("button", { name: /^Show/ }).click()
    await expect(row.getByRole("button", { name: /^Hide/ })).toBeVisible()
    // The title did wrap: the line grew.
    expect((await boxOf(row)).height).toBeGreaterThan(closedHeight + 20)
  })

  test("keeps a “New” tag still, and “Removed”, which has no label", async ({
    page,
  }) => {
    await openProductA(page, DESKTOP)
    await chooseCompact(page)
    await addItem(page, "Added item", "Later")
    const added = itemOf(page, "Added item")
    await expectStill(page, added, "Added item")

    // Remove is at the foot of the opened row.
    const removed = itemOf(page, "Minimal card")
    await removed.getByRole("button", { name: /^Show/ }).click()
    await confirmRemoval(page, "Minimal card")
    // The row opens as focus goes to its "Undo removal": close it, to compare.
    await removed.getByRole("button", { name: /^Hide/ }).click()
    await expect(tagOf(removed, "Removed")).toBeVisible()
    await expect(tagOf(removed, MOVED)).toHaveCount(0)
    const closed = await expectStill(page, removed, "Minimal card")
    expect(closed.moved).toBeNull()
  })

  test("starts an unplaced item's flag at the height it has closed, though opened it may wrap, and keeps “Changed” still beside it", async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 })
    await openWithItems(
      page,
      sheets,
      withItems({
        Title: "Someday",
        Horizon: "Sometime after the new financial year, once funded",
        Description: "Not yet placed.",
      }),
      "Someday",
    )
    const form = await openEditItemDialog(page, "Someday")
    await form
      .getByRole("textbox", { name: "Description", exact: true })
      .fill("Changed, and not yet placed.")
    await form.getByRole("button", { name: "Done" }).click()
    await expect(form).toBeHidden()
    await chooseCompact(page)
    const row = itemOf(page, "Someday")

    const closed = await expectStill(page, row, "Someday")
    expect(closed.flag).not.toBeNull()
  })
})
