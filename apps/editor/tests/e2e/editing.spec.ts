import type { Locator, Page } from "@playwright/test"

import { disconnectFromHeader } from "./fixtures/account-menu"
import {
  confirmPublish,
  openEditItemDialog,
  openEditRoadmapDialog,
  publishOnce,
  reviewFooterClose,
} from "./fixtures/dialogs"
import {
  EXAMPLE_LISTS,
  EXAMPLE_SPREADSHEET,
  EXAMPLE_SPREADSHEET_WITH_LISTS,
  type FakeTab,
  withTabRows,
} from "./fixtures/fake-sheets"
import { boxesOf } from "./fixtures/layout"
import {
  productDetailsField,
  goToList,
  openProductDetails,
  openConflictReview,
  refusal,
} from "./fixtures/roadmap-page"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * A Product Lead edits a roadmap's English and publishes it, or saves it when the roadmap
 * is not published (STY-025), against the fake Sheets API: one `batchUpdate` per publish.
 * A co-lead's change made meanwhile is shown, never overwritten (STY-026). A family and
 * category are chosen from their lists (STY-028). An item is moved to another placement,
 * writing its `Horizon` cell and moving its row to last there (STY-031, STY-051), or
 * put elsewhere in its own, which moves rows alone (STY-050). Its
 * organisations are ticked in a field that opens on request (STY-034, STY-038), its tags
 * are added, renamed and removed in another (STY-037), and its details are written as
 * an outline in a third (STY-039).
 */

const ITEM = "Example card with every column"

/** A phone's width, the narrowest the item dialog is shown at. */
const PHONE_WIDTH = 375

/** The card of the item with this title, found by its heading. */
function itemCard(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

async function openRoadmap(page: Page, id: string, firstItem: string) {
  await page.goto(`./#/roadmaps/${id}`)
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 3, name: firstItem }),
  ).toBeVisible()
}

/** Edits an item's English title in the item dialog. */
async function editTitle(page: Page, from: string, to: string) {
  const form = await openEditItemDialog(page, from)
  await form.getByRole("textbox", { name: "Title" }).fill(to)
  await form.getByRole("button", { name: "Done" }).click()
  await expect(itemCard(page, to).getByText("Changed")).toBeVisible()
}

/**
 * Opens the publish (or save) dialog, confirms it and returns once it has gone: its
 * outcome's notice, a success, a refusal or a failure, has focus by then, as the dialog
 * sends focus there as it finishes closing.
 */
async function chooseAndConfirm(page: Page, action: "Publish" | "Save") {
  await page
    .getByRole("main")
    .getByRole("button", { name: `${action} changes` })
    .click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: `${action} changes` }).click()
  await expect(dialog).toBeHidden()
}

test("publishes a roadmap's changes in one write, then shows the published text (S10)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "producta", ITEM)
  await editTitle(page, ITEM, "A clearer first card")
  await expect(
    page.getByRole("main").getByText("1 unpublished change"),
  ).toBeVisible()

  await chooseAndConfirm(page, "Publish")

  await expect(page.getByRole("main").getByRole("status").first()).toHaveText(
    /Changes published\. The public site shows them after its next nightly update\./,
  )
  expect(sheets.writes).toHaveLength(1)
  const productA = sheets.spreadsheet.find(({ title }) => title === "ProductA")
  expect(productA?.rows[1]?.[0]).toBe("A clearer first card")
  await expect(
    itemCard(page, "A clearer first card").getByText("Changed"),
  ).toHaveCount(0)
  await expect(
    page.getByRole("main").getByText(/unpublished change/),
  ).toHaveCount(0)
})

test("saves a roadmap that is not published (S11)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "productc", "Unpublished work")
  await editTitle(page, "Unpublished work", "Work in progress")
  await expect(
    page.getByRole("main").getByText("1 change to save"),
  ).toBeVisible()

  await chooseAndConfirm(page, "Save")

  await expect(page.getByRole("main").getByText("Changes saved")).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
})

test("keeps the changes and says why when a publish fails, writing nothing (S13)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "producta", ITEM)
  await editTitle(page, ITEM, "A clearer first card")
  sheets.failWith(403)

  await chooseAndConfirm(page, "Publish")

  const alert = page.getByRole("main").getByRole("alert")
  await expect(alert).toContainText("Couldn't publish your changes")
  await expect(alert).toContainText("Your changes are kept in this tab.")
  await expect(alert).toBeFocused()
  expect(sheets.writes).toEqual([])
  await expect(
    page.getByRole("main").getByText("1 unpublished change"),
  ).toBeVisible()
})

test("Disconnect asks first, and kept changes wait for the next connection (S14)", async ({
  page,
}) => {
  await openRoadmap(page, "producta", ITEM)
  await editTitle(page, ITEM, "A clearer first card")

  await disconnectFromHeader(page)
  const question = page.getByRole("alertdialog")
  await expect(question).toContainText("Keep your changes?")
  await question
    .getByRole("button", { name: "Keep changes and disconnect" })
    .click()

  await goToList(page)
  await expect(
    page.getByRole("main").getByText("Changes to 1 roadmap are waiting"),
  ).toBeVisible()
  await connect(page)
  const card = page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: "Product A roadmap" }) })
  await expect(card.getByText("Unpublished changes")).toBeVisible()
  await roadmapCards(page).filter({ hasText: "Product A roadmap" }).click()
  await expect(
    itemCard(page, "A clearer first card").getByText("Changed"),
  ).toBeVisible()
  await expect(
    page.getByRole("main").getByText("1 unpublished change"),
  ).toBeVisible()
})

test("warns before the tab closes only while changes are pending (S8)", async ({
  page,
}) => {
  await openRoadmap(page, "producta", ITEM)
  const dialogs: string[] = []
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type())
    void dialog.dismiss()
  })

  await editTitle(page, ITEM, "A clearer first card")
  await page.close({ runBeforeUnload: true })
  await expect.poll(() => dialogs).toEqual(["beforeunload"])
  // Staying keeps the page, and its change.
  expect(page.isClosed()).toBe(false)
  await expect(
    itemCard(page, "A clearer first card").getByText("Changed"),
  ).toBeVisible()

  await page
    .getByRole("main")
    .getByRole("button", { name: "Undo changes A clearer first card" })
    .click()
  await expect(
    page.getByRole("main").getByText(/unpublished change/),
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByRole("main").getByRole("button", { name: "Connect Google" }),
  ).toBeVisible()
  expect(dialogs).toEqual(["beforeunload"])
})

test("edits an unplaced item on a phone, every form and dialog fitting the width (S17)", async ({
  page,
  sheets,
}) => {
  const tab = sheets.spreadsheet.find(({ title }) => title === "ProductA")
  const horizon = tab?.rows[0]?.indexOf("Horizon") ?? -1
  sheets.spreadsheet = sheets.spreadsheet.map((sheet) =>
    sheet === tab
      ? {
          ...sheet,
          rows: sheet.rows.map((row, index) =>
            index === 2
              ? row.map((cell, i) => (i === horizon ? "Someday" : cell))
              : row,
          ),
        }
      : sheet,
  )
  await page.setViewportSize({ width: 375, height: 800 })
  await openRoadmap(page, "producta", "Minimal card")
  await expect(
    itemCard(page, "Minimal card").getByText(
      "Horizon “Someday” isn't recognised",
    ),
  ).toBeVisible()
  const overflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )

  const form = await openEditItemDialog(page, "Minimal card")
  expect(await overflow()).toBe(0)
  await form.getByRole("textbox", { name: "Title" }).fill("A placed card, soon")
  await form.getByRole("button", { name: "Done" }).click()
  await expect(
    itemCard(page, "A placed card, soon").getByText("Changed"),
  ).toBeVisible()

  await page
    .getByRole("main")
    .getByRole("button", { name: "Publish changes" })
    .click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
  expect(await overflow()).toBe(0)
})

/**
 * Each cell of `title`'s tab that differs from `before`, as "item: column = value" or
 * "header = column", leaving out the IDs every first publish writes.
 */
function changedCells(
  before: readonly FakeTab[],
  after: readonly FakeTab[],
  title: string,
) {
  const tab = (tabs: readonly FakeTab[]) =>
    tabs.find((each) => each.title === title)?.rows ?? []
  const [header = [], ...rows] = tab(after)
  const itemId = header.indexOf("Item ID")
  return [
    ...header.flatMap((cell, c) =>
      c === itemId || cell === (tab(before)[0]?.[c] ?? "")
        ? []
        : [`header = ${cell}`],
    ),
    ...rows.flatMap((row, r) =>
      row.flatMap((cell, c) =>
        c === itemId || cell === (tab(before)[r + 1]?.[c] ?? "")
          ? []
          : [`${row[0] ?? ""}: ${header[c] ?? ""} = ${cell}`],
      ),
    ),
  ]
}

/** Edits the roadmap's English vision in the roadmap dialog, leaving Product details open. */
async function editVision(page: Page, to: string) {
  const dialog = await openEditRoadmapDialog(page)
  await dialog.getByRole("textbox", { name: "Vision" }).fill(to)
  await dialog.getByRole("button", { name: "Done" }).click()
  // The vision shows in Product details once opened, and stays open.
  const details = await openProductDetails(page)
  await expect(details.getByText(to)).toBeVisible()
}

test.describe("a co-lead's change (STY-026)", () => {
  test("is shown beside yours, nothing written, until each field is decided (S1, S2)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    await publishOnce(page)
    await editTitle(page, ITEM, "My first card")
    await editVision(page, "My vision.")
    sheets.coLead("ProductA", ITEM, "Title", "Their first card")
    sheets.coLead("Roadmaps", "ProductA", "Vision", "Their vision.")

    await chooseAndConfirm(page, "Publish")

    const notice = refusal(page)
    await expect(notice).toBeFocused()
    await expect(notice).toContainText(
      "Someone else has changed this roadmap too",
    )
    await expect(notice).toContainText("Nothing was published.")
    expect(sheets.writes).toHaveLength(1)
    await expect(
      page.getByRole("main").getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "true")

    const review = await openConflictReview(page)
    await expect(review.getByRole("listitem")).toHaveCount(2)
    await expect(review.getByRole("listitem").first()).toContainText(
      /Product details: Vision.*Your change.*My vision\..*Current text.*Their vision\./,
    )

    await review
      .getByRole("button", { name: "Keep mine Product details: Vision" })
      .click()
    await expect(
      review.getByRole("button", { name: "Keep mine My first card: Title" }),
    ).toBeFocused()
    await review
      .getByRole("button", { name: "Use theirs My first card: Title" })
      .click()
    await expect(review).toContainText(
      "Every change is decided. Publish when you're ready.",
    )
    await expect(
      review.getByRole("button", { name: "Publish changes" }),
    ).toBeFocused()
    await reviewFooterClose(review).click()
    await expect(review).toBeHidden()
    const action = page
      .getByRole("main")
      .getByRole("button", { name: "Publish changes" })
    await expect(action).toBeFocused()

    await chooseAndConfirm(page, "Publish")

    await expect(
      page.getByRole("main").getByText(/^Changes published\./),
    ).toBeVisible()
    expect(sheets.writes).toHaveLength(2)
    const productA = sheets.spreadsheet.find(
      ({ title }) => title === "ProductA",
    )
    expect(productA?.rows[1]?.[0]).toBe("Their first card")
    await expect(
      page.getByRole("heading", { level: 3, name: "Their first card" }),
    ).toBeVisible()
    await expect(page.getByRole("main").getByText("My vision.")).toBeVisible()
  })
})

test.describe("a family and category (STY-028)", () => {
  /** The roadmap index's row for `sheet`, by header. */
  function indexRow(tabs: readonly FakeTab[], sheet: string) {
    const index = tabs.find(({ title }) => title === "Roadmaps")
    const [header = [], ...rows] = index?.rows ?? []
    const row = rows.find((cells) => cells[0] === sheet) ?? []
    return Object.fromEntries(header.map((name, i) => [name, row[i] ?? ""]))
  }

  test.beforeEach(({ sheets }) => {
    sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
  })

  test("is chosen from the lists, pending in its colour, then published with its IDs (S1, S2, S3)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const dialog = await openEditRoadmapDialog(page)
    const category = dialog.getByRole("combobox", { name: "Category" })
    await expect(category.getByRole("option")).toHaveText([
      "No category",
      "GP & Community Services",
      "Tests, Scans & Results",
    ])
    await dialog
      .getByRole("combobox", { name: "Family" })
      .selectOption("Medicines & Diagnostics")
    await category.selectOption("Tests, Scans & Results")
    await dialog.getByRole("button", { name: "Done" }).click()

    const main = page.getByRole("main")
    const details = await openProductDetails(page)
    const family = productDetailsField(details, "Family")
    await expect(family).toContainText("Medicines & Diagnostics")
    await expect(family.locator("span[style]").first()).toHaveCSS(
      "background-color",
      "rgb(0, 103, 71)",
    )
    await expect(productDetailsField(details, "Category")).toHaveText(
      "Tests, Scans & Results",
    )
    await expect(main.getByText("2 unpublished changes")).toBeVisible()
    expect(sheets.writes).toEqual([])

    await chooseAndConfirm(page, "Publish")

    await expect(main.getByText(/^Changes published\./)).toBeVisible()
    expect(sheets.writes).toHaveLength(1)
    expect(indexRow(sheets.spreadsheet, "ProductA")).toMatchObject({
      Family: "Medicines & Diagnostics",
      "Family (cy)": "Meddyginiaethau a Diagnosteg",
      Colour: "#006747",
      "Family ID": "vdkxj63m",
      Category: "Tests, Scans & Results",
      "Category ID": "w7vrv5kn",
    })
    await expect(family).toContainText("Medicines & Diagnostics")
  })

  test("No family blanks its names, keeping the colour (S2)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "productb", "Building the core service")
    const dialog = await openEditRoadmapDialog(page)
    await dialog
      .getByRole("combobox", { name: "Family" })
      .selectOption("No family")
    await dialog.getByRole("button", { name: "Done" }).click()

    await chooseAndConfirm(page, "Publish")

    await expect(
      page.getByRole("main").getByText(/^Changes published\./),
    ).toBeVisible()
    const row = indexRow(sheets.spreadsheet, "ProductB")
    expect(row).toMatchObject({
      Family: "",
      "Family (cy)": "",
      Colour: "#006747",
    })
    // No ID column is added only to stay blank.
    expect(row).not.toHaveProperty("Family ID")
  })

  test("any publish links a family and category named, not yet by ID (S4)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    await editVision(page, "A sharper vision.")

    await chooseAndConfirm(page, "Publish")

    await expect(
      page.getByRole("main").getByText(/^Changes published\./),
    ).toBeVisible()
    expect(indexRow(sheets.spreadsheet, "ProductA")).toMatchObject({
      Vision: "A sharper vision.",
      Family: "Single Record",
      Colour: "#325083",
      "Family ID": "fc29g5b9",
      Category: "GP & Community Services",
      "Category ID": "khzpchkh",
    })
    expect(indexRow(sheets.spreadsheet, "ProductB")).toMatchObject({
      "Family ID": "",
    })
  })

  test("is shown read-only, saying why, when its list is missing (S6)", async ({
    page,
    sheets,
  }) => {
    sheets.spreadsheet = [
      ...EXAMPLE_SPREADSHEET,
      ...EXAMPLE_LISTS.filter(({ title }) => title !== "Families"),
    ]
    await openRoadmap(page, "producta", ITEM)
    const dialog = await openEditRoadmapDialog(page)

    await expect(
      dialog.getByRole("combobox", { name: "Category" }),
    ).toBeVisible()
    await expect(dialog.getByRole("combobox", { name: "Family" })).toHaveCount(
      0,
    )
    await expect(dialog.getByText("Single Record")).toBeVisible()
    await expect(
      dialog.getByText("The family can't be changed right now."),
    ).toBeVisible()
  })
})

test.describe("moving an item (STY-031)", () => {
  /** The cards' titles under a horizon or section heading. */
  function titlesUnder(page: Page, heading: string) {
    return page
      .getByRole("main")
      .getByRole("list", { name: heading, exact: true })
      .getByRole("heading", { level: 3 })
  }

  async function moveWithMenu(page: Page, title: string, to: string) {
    await page
      .getByRole("main")
      .getByRole("button", { name: `Move ${title}`, exact: true })
      .click()
    await page.getByRole("menuitem", { name: to, exact: true }).click()
  }

  test("moves an item from its card, last in its new placement, pending, then publishes its Horizon cell and moves its row (S1, S6; STY-051 S1, S3)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const tab = (tabs: readonly FakeTab[]) =>
      tabs.find(({ title }) => title === "ProductA")?.rows ?? []
    const before = tab(sheets.spreadsheet)

    await moveWithMenu(page, "Discovery card", "Recently delivered")

    // Its row is above the placement's one item's: it shows last all the same.
    await expect(titlesUnder(page, "Recently delivered")).toHaveText([
      "Recently shipped work",
      "Discovery card",
    ])
    await expect(
      itemCard(page, "Discovery card").getByText("Changed"),
    ).toBeVisible()
    await expect(
      page.getByRole("main").getByText("1 unpublished change"),
    ).toBeVisible()
    expect(sheets.writes).toEqual([])

    await chooseAndConfirm(page, "Publish")
    await expect(
      page.getByRole("main").getByText(/^Changes published\./),
    ).toBeVisible()

    // The row went to just after the placement's last, whole: only its Horizon differs.
    const [header = [], ...rows] = tab(sheets.spreadsheet)
    expect(rows.map(([title]) => title)).toEqual([
      "Example card with every column",
      "Minimal card",
      "Card awaiting release",
      "Card being explored",
      "Longer-term idea",
      "Recently shipped work",
      "Discovery card",
      "Earlier delivery this year",
      "Something we are not doing",
    ])
    const itemId = header.indexOf("Item ID")
    const changed = rows.flatMap((row) => {
      const was = before.find(([title]) => title === row[0]) ?? []
      return row.flatMap((cell, c) =>
        c === itemId || cell === (was[c] ?? "")
          ? []
          : [`${row[0] ?? ""}: ${header[c] ?? ""} = ${cell}`],
      )
    })
    expect(changed).toEqual(["Discovery card: Horizon = Recently delivered"])
    expect(sheets.writes).toHaveLength(1)

    await expect(titlesUnder(page, "Recently delivered")).toHaveText([
      "Recently shipped work",
      "Discovery card",
    ])
    await page.reload()
    await connect(page)
    await expect(titlesUnder(page, "Recently delivered")).toHaveText([
      "Recently shipped work",
      "Discovery card",
    ])
  })

  test("says a protected part of the spreadsheet stopped the publish, keeping the move, nothing written (STY-051 S7)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const before = sheets.spreadsheet
    await moveWithMenu(page, "Discovery card", "Recently delivered")
    sheets.refuseProtected()

    await chooseAndConfirm(page, "Publish")

    const alert = page.getByRole("main").getByRole("alert")
    await expect(alert).toContainText("Couldn't publish your changes")
    await expect(alert).toContainText(
      "Part of the spreadsheet is protected, so nothing was changed. Ask its owner to let this account edit it.",
    )
    await expect(alert).toContainText("Your changes are kept in this tab.")
    await expect(
      page.getByRole("main").getByText("1 unpublished change"),
    ).toBeVisible()
    await expect(titlesUnder(page, "Recently delivered")).toHaveText([
      "Recently shipped work",
      "Discovery card",
    ])
    expect(sheets.writes).toEqual([])
    expect(sheets.spreadsheet).toBe(before)

    // The owner lifts the protection: the same changes then publish.
    await chooseAndConfirm(page, "Publish")
    await expect(
      page.getByRole("main").getByText(/^Changes published\./),
    ).toBeVisible()
    expect(sheets.writes).toHaveLength(1)
  })

  test("moves by keyboard on a phone, focus staying on the moved card (S10)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openRoadmap(page, "producta", ITEM)
    const move = page
      .getByRole("main")
      .getByRole("button", { name: "Move Discovery card", exact: true })

    await move.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("menu")).toBeVisible()
    // Past its two choices of position in Later, then "Recently delivered", to "Now".
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Enter")

    await expect(titlesUnder(page, "Now")).toContainText(["Discovery card"])
    await expect(move).toBeFocused()
    await expect(page.getByRole("menu")).toHaveCount(0)
  })
})

test.describe("reordering a placement's items (STY-050)", () => {
  /** The cards' titles under a horizon or section heading. */
  function titlesUnder(page: Page, heading: string) {
    return page
      .getByRole("main")
      .getByRole("list", { name: heading, exact: true })
      .getByRole("heading", { level: 3 })
  }
  const moveButton = (page: Page, title: string) =>
    page
      .getByRole("main")
      .getByRole("button", { name: `Move ${title}`, exact: true })
  const nowRows = (tabs: readonly FakeTab[]) => {
    const [header = [], ...rows] =
      tabs.find(({ title }) => title === "ProductA")?.rows ?? []
    const horizon = header.indexOf("Horizon")
    return rows.filter((row) => row[horizon] === "Now").map(([title]) => title)
  }
  const LAST = "Card awaiting release"

  for (const [size, width] of [
    ["a desktop", 1280],
    ["a phone", PHONE_WIDTH],
  ] as const) {
    test(`puts an item first from its Move menu on ${size}, pending at the heading, then publishes it as one row move (S1, S2, S3, S6, S7)`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 812 })
      await openRoadmap(page, "producta", ITEM)
      const before = sheets.spreadsheet.find(
        ({ title }) => title === "ProductA",
      )?.rows

      // By keyboard: the menu opens on its first choice, "To the top".
      await moveButton(page, LAST).focus()
      await page.keyboard.press("Enter")
      const menu = page.getByRole("menu")
      await expect(menu).toContainText("In Now: 3 of 3")
      await expect(menu.getByRole("menuitem")).toHaveText([
        "To the top",
        "Up one",
        "Recently delivered",
        "Next",
        "Later",
        "Delivered this year",
        "Not doing",
      ])
      await page.keyboard.press("Enter")

      await expect(titlesUnder(page, "Now")).toHaveText([
        LAST,
        ITEM,
        "Minimal card",
      ])
      await expect(moveButton(page, LAST)).toBeFocused()
      const main = page.getByRole("main")
      await expect(
        main.getByRole("status").filter({ hasText: "Moved to the top" }),
      ).toHaveText("Moved to the top. 1 of 3.")
      await expect(main.getByText("Order changed")).toBeVisible()
      await expect(
        main.getByRole("button", { name: "Undo order Now" }),
      ).toBeVisible()
      await expect(main.getByText("Changed", { exact: true })).toHaveCount(0)
      await expect(main.getByText("1 unpublished change")).toBeVisible()
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true)
      expect(sheets.writes).toEqual([])

      await main.getByRole("button", { name: "Publish changes" }).click()
      const dialog = page.getByRole("alertdialog")
      await expect(dialog.getByRole("listitem")).toHaveText([
        "NowOrder changed",
      ])
      await confirmPublish(page)

      // One row moved, whole; beside it only the Item ID any publish gives each row.
      expect(sheets.writes).toHaveLength(1)
      const { requests } = sheets.writes[0] as {
        requests: Record<string, unknown>[]
      }
      expect(
        requests
          .map((request) => Object.keys(request)[0])
          .filter(
            (kind) => kind !== "updateCells" && kind !== "appendDimension",
          ),
      ).toEqual(["moveDimension"])
      const [header = [], ...rows] =
        sheets.spreadsheet.find(({ title }) => title === "ProductA")?.rows ?? []
      expect(rows.map(([title]) => title)).toEqual([
        LAST,
        ITEM,
        "Minimal card",
        "Card being explored",
        "Discovery card",
        "Longer-term idea",
        "Recently shipped work",
        "Earlier delivery this year",
        "Something we are not doing",
      ])
      const itemId = header.indexOf("Item ID")
      for (const row of rows) {
        const was = before?.find(([title]) => title === row[0]) ?? []
        expect(row.filter((_, column) => column !== itemId)).toEqual(
          was.slice(0, row.length).filter((_, column) => column !== itemId),
        )
      }
      await expect(main.getByText("Order changed")).toHaveCount(0)

      await page.reload()
      await connect(page)
      await expect(titlesUnder(page, "Now")).toHaveText([
        LAST,
        ITEM,
        "Minimal card",
      ])
    })

    test(`shows a co-lead's change to the placement's items beside your order on ${size}, nothing written until it is decided (S10, S11, S12)`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 812 })
      await openRoadmap(page, "producta", ITEM)
      await publishOnce(page)
      const main = page.getByRole("main")
      await moveButton(page, LAST).click()
      await page.getByRole("menuitem", { name: "To the top" }).click()
      await expect(main.getByText("Order changed")).toBeVisible()
      // A co-lead moves an item into Now meanwhile.
      sheets.coLead("ProductA", "Card being explored", "Horizon", "Now")

      await chooseAndConfirm(page, "Publish")

      const notice = refusal(page)
      await expect(notice).toBeFocused()
      await expect(notice).toContainText(
        "Someone else has changed this roadmap too",
      )
      await expect(notice).toContainText("Nothing was published.")
      const review = await openConflictReview(page)
      await expect(review).toContainText(
        "Choose which to keep for each, then publish again.",
      )
      const conflict = review.getByRole("listitem").filter({
        has: page.getByText("Now: Order", { exact: true }),
      })
      await expect(conflict.getByRole("term")).toHaveText([
        "Your order",
        "Current order",
      ])
      const [yours, theirs] = [
        conflict.getByRole("definition").nth(0),
        conflict.getByRole("definition").nth(1),
      ]
      await expect(yours.getByRole("listitem")).toHaveText([
        LAST,
        ITEM,
        "A minimal card",
        "Card being explored",
      ])
      await expect(theirs.getByRole("listitem")).toHaveText([
        ITEM,
        "A minimal card",
        LAST,
        "Card being explored",
      ])
      // Side by side on a desktop, stacked on a phone, nothing scrolling sideways.
      const [yoursBox, theirsBox] = await boxesOf(yours, theirs)
      if (width === PHONE_WIDTH) {
        expect(theirsBox.y).toBeGreaterThan(yoursBox.bottom)
      } else {
        expect(theirsBox.x).toBeGreaterThan(yoursBox.right)
      }
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true)
      expect(sheets.writes).toHaveLength(1)
      // The decision and the second publish are the same at either width: the desktop's
      // run holds them, this one only the phone's layout.
      if (width === PHONE_WIDTH) return

      await review.getByRole("button", { name: "Keep mine Now: Order" }).click()
      await expect(review).toContainText(
        "Every change is decided. Publish when you're ready.",
      )
      await reviewFooterClose(review).click()
      await expect(review).toBeHidden()
      const publishAgain = main.getByRole("button", { name: "Publish changes" })
      await expect(publishAgain).toBeFocused()
      await expect(publishAgain).not.toHaveAttribute("aria-disabled", "true")
      await expect(main.getByText("Order changed")).toBeVisible()

      await chooseAndConfirm(page, "Publish")
      await expect(main.getByText(/^Changes published\./)).toBeVisible()
      expect(sheets.writes).toHaveLength(2)
      expect(nowRows(sheets.spreadsheet)).toEqual([
        LAST,
        ITEM,
        "A minimal card",
        "Card being explored",
      ])
      await expect(titlesUnder(page, "Now")).toHaveText([
        LAST,
        ITEM,
        "A minimal card",
        "Card being explored",
      ])
    })
  }
})

test.describe("the Organisations field opens on request (STY-038)", () => {
  /** Opens the item's form, its Organisations field still shut. */
  async function openForm(page: Page, title: string) {
    const form = await openEditItemDialog(page, title)
    await expect(form).toBeVisible()
    return form
  }

  test("starts shut naming what is chosen, opens in place, and shuts keeping the ticks (S1, S2, S3)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const form = await openForm(page, ITEM)

    await expect(form.getByText("Cardiff and Vale, Swansea Bay")).toBeVisible()
    await expect(form.getByRole("checkbox")).toHaveCount(0)
    const change = form.getByRole("button", { name: "Change organisations" })
    await expect(change).toHaveAttribute("aria-expanded", "false")

    await change.click()
    const group = form.getByRole("group", { name: "Organisations" })
    await expect(group.getByRole("checkbox")).toHaveCount(14)
    await expect(
      group.getByRole("checkbox", { name: "All Wales (National)" }),
    ).toBeFocused()
    await expect(group.getByRole("checkbox", { checked: true })).toHaveCount(2)
    const close = form.getByRole("button", { name: "Close organisations" })
    await expect(close).toHaveAttribute("aria-expanded", "true")
    await expect(form.getByText("Cardiff and Vale, Swansea Bay")).toHaveCount(0)

    await group.getByRole("checkbox", { name: "Powys (PTHB)" }).click()
    await close.click()
    await expect(
      form.getByText("Cardiff and Vale, Powys, Swansea Bay"),
    ).toBeVisible()
    await expect(form.getByRole("checkbox")).toHaveCount(0)
    await expect(change).toBeFocused()
    // Nothing is pending until the form is confirmed.
    await expect(
      page.getByRole("main").getByRole("button", { name: "Publish changes" }),
    ).toHaveCount(0)
    expect(sheets.writes).toEqual([])
  })

  test("Done keeps a choice made in a field shut again, and publishes it (S4)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const form = await openForm(page, ITEM)
    await form.getByRole("button", { name: "Change organisations" }).click()
    await form.getByRole("checkbox", { name: "Powys (PTHB)" }).click()
    await form.getByRole("button", { name: "Close organisations" }).click()

    await form.getByRole("button", { name: "Done" }).click()

    await expect(
      itemCard(page, ITEM).getByText("Cardiff and Vale, Powys, Swansea Bay"),
    ).toBeVisible()
    await expect(itemCard(page, ITEM).getByText("Changed")).toBeVisible()
    await chooseAndConfirm(page, "Publish")
    await expect(
      page.getByRole("main").getByText(/^Changes published\./),
    ).toBeVisible()
    const organisations = sheets.spreadsheet
      .find(({ title }) => title === "ProductA")
      ?.rows.find(([title]) => title === ITEM)?.[6]
    expect(organisations).toBe("CAVUHB, PTHB, SBUHB")
  })

  test("an item with none reads No organisations beside Add, and an unknown code is named while shut (S1, S5)", async ({
    page,
    sheets,
  }) => {
    sheets.coLead("ProductA", "Minimal card", "Organisations", "CAVUHB, CAVHB")
    await openRoadmap(page, "producta", ITEM)

    const empty = await openForm(page, "Something we are not doing")
    await expect(empty.getByText("No organisations")).toBeVisible()
    await expect(
      empty.getByRole("button", { name: "Add organisations" }),
    ).toHaveAttribute("aria-expanded", "false")
    await empty.getByRole("button", { name: "Cancel" }).click()

    const typo = await openForm(page, "Minimal card")
    const notice = typo.getByText(
      "CAVHB isn't recognised. Changing the organisations will remove it.",
    )
    await expect(notice).toBeVisible()
    await expect(
      typo.getByText("Cardiff and Vale", { exact: true }),
    ).toBeVisible()
    await expect(typo.getByRole("checkbox")).toHaveCount(0)
    await typo.getByRole("button", { name: "Change organisations" }).click()
    await expect(notice).toBeVisible()
    await expect(
      typo.getByRole("group", { name: "Organisations" }),
    ).toHaveAccessibleDescription(
      "CAVHB isn't recognised. Changing the organisations will remove it.",
    )
  })

  test("Cancel leaves the choice, and the form opens shut again (S6)", async ({
    page,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const form = await openForm(page, ITEM)
    await form.getByRole("button", { name: "Change organisations" }).click()
    await form.getByRole("checkbox", { name: "Powys (PTHB)" }).click()
    await form.getByRole("button", { name: "Cancel" }).click()
    await expect(
      itemCard(page, ITEM).getByText("Cardiff and Vale, Swansea Bay"),
    ).toBeVisible()

    const again = await openForm(page, ITEM)

    await expect(again.getByText("Cardiff and Vale, Swansea Bay")).toBeVisible()
    await expect(again.getByRole("checkbox")).toHaveCount(0)
    await again.getByRole("button", { name: "Change organisations" }).click()
    await expect(
      again.getByRole("checkbox", { name: "Powys (PTHB)" }),
    ).not.toBeChecked()
  })

  test("opens, ticks and shuts by keyboard on a phone, nothing scrolling sideways (S7)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openRoadmap(page, "producta", ITEM)
    const form = await openForm(page, ITEM)
    const sideways = () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )

    await form.getByRole("combobox", { name: "Horizon or section" }).focus()
    await page.keyboard.press("Tab")
    const change = form.getByRole("button", { name: "Change organisations" })
    await expect(change).toBeFocused()
    expect(await sideways()).toBe(0)

    await page.keyboard.press("Enter")
    const first = form.getByRole("checkbox", { name: "All Wales (National)" })
    await expect(first).toBeFocused()
    await page.keyboard.press("Space")
    await expect(first).toBeChecked()
    expect(await sideways()).toBe(0)

    await page.keyboard.press("Shift+Tab")
    await expect(
      form.getByRole("button", { name: "Close organisations" }),
    ).toBeFocused()
    await page.keyboard.press("Space")
    await expect(change).toBeFocused()
    await expect(
      form.getByText("All Wales, Cardiff and Vale, Swansea Bay"),
    ).toBeVisible()
    // The form is still open: no key confirmed or cancelled it.
    await expect(form.getByRole("button", { name: "Done" })).toBeVisible()
  })
})

test.describe("editing an item's tags (STY-037)", () => {
  /** An item with tags and no Welsh ones; the roadmap's other items carry Service X. */
  const TAGGED = "Longer-term idea"

  /** Opens the item's form and its Tags field: the form, and the field's group. */
  async function openTags(page: Page, title: string) {
    const form = await openEditItemDialog(page, title)
    await form.getByRole("button", { name: /^(Change|Add) tags$/ }).click()
    const field = form.getByRole("group", { name: "Tags" })
    await expect(
      field.getByRole("textbox", { name: "Add a tag" }),
    ).toBeFocused()
    return { form, field }
  }

  /** The tags the open field shows, in order. */
  const rows = (field: Locator) =>
    field.getByRole("list", { name: "Tags on this item" }).getByRole("listitem")

  const sideways = (page: Page) =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )

  test("adds a Labels column to a roadmap with none, and an empty cell for no tags (S12)", async ({
    page,
    sheets,
  }) => {
    sheets.spreadsheet = withTabRows("ProductC", [
      ["Title", "Horizon"],
      ["Unpublished work", "Now"],
    ])
    await openRoadmap(page, "productc", "Unpublished work")
    const before = sheets.spreadsheet
    const { form, field } = await openTags(page, "Unpublished work")
    // No other item has a tag, so none is offered (S10).
    await expect(field.getByText("Used elsewhere in this roadmap")).toHaveCount(
      0,
    )

    await field
      .getByRole("textbox", { name: "Add a tag" })
      .fill("Patients, Carers")
    await form.getByRole("button", { name: "Done" }).click()
    await chooseAndConfirm(page, "Save")
    await expect(
      page.getByRole("main").getByText("Changes saved"),
    ).toBeVisible()

    expect(changedCells(before, sheets.spreadsheet, "ProductC")).toEqual([
      "header = Labels",
      "Unpublished work: Labels = Patients, Carers",
    ])

    const again = await openTags(page, "Unpublished work")
    await again.field.getByRole("button", { name: "Remove Patients" }).click()
    await again.field.getByRole("button", { name: "Remove Carers" }).click()
    await again.form.getByRole("button", { name: "Done" }).click()
    await chooseAndConfirm(page, "Save")
    await expect.poll(() => sheets.writes.length).toBe(2)
    expect(changedCells(before, sheets.spreadsheet, "ProductC")).toEqual([
      "header = Labels",
    ])
  })

  test("on a phone, the rows' buttons are icons beside a long tag, which wraps, and nothing scrolls sideways (S14, S16)", async ({
    page,
    sheets,
  }) => {
    const long = "A tag that runs to forty characters long"
    sheets.coLead("ProductA", TAGGED, "Labels", `Service Y, ${long}`)
    await page.setViewportSize({ width: PHONE_WIDTH, height: 812 })
    await openRoadmap(page, "producta", ITEM)
    const { form, field } = await openTags(page, TAGGED)

    const [short, wrapped] = await rows(field).all()
    if (!short || !wrapped) throw new Error("The item has two tags")
    for (const row of [short, wrapped]) {
      const [tag, ...icons] = await boxesOf(
        row.locator("span").first(),
        ...(await row.getByRole("button").all()),
      )
      for (const box of icons) {
        // An icon, square, on its tag's row and inside the page.
        expect(box.width).toBe(box.height)
        expect(box.y).toBeLessThan(tag.bottom)
        expect(box.right).toBeLessThanOrEqual(PHONE_WIDTH)
      }
    }
    await expect(
      wrapped.getByRole("button", { name: `Rename ${long}` }),
    ).toBeVisible()
    await expect(
      short.getByRole("button", { name: "Remove Service Y" }),
    ).toHaveAttribute("title", "Remove")
    const [shortBox, wrappedBox] = await boxesOf(
      short.locator("span").first(),
      wrapped.locator("span").first(),
    )
    expect(wrappedBox.height).toBeGreaterThan(shortBox.height)
    expect(await sideways(page)).toBe(0)

    // A rename keeps the icons, and its field and buttons fit too.
    await short.getByRole("button", { name: "Rename Service Y" }).click()
    await expect(
      field.getByRole("button", { name: "Update Service Y" }),
    ).toHaveAttribute("title", "Update")
    expect(await sideways(page)).toBe(0)
    await page.keyboard.press("Escape")
    await expect(form.getByRole("button", { name: "Done" })).toBeVisible()
  })

  test("the rows' buttons show words where every tag fits beside them (S16)", async ({
    page,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const { field } = await openTags(page, TAGGED)

    const rename = field.getByRole("button", { name: "Rename Service Y" })
    await expect(rename).toHaveText("Rename Service Y")
    await expect(rename).not.toHaveAttribute("title")
    await expect(rename.locator("svg")).toHaveCount(0)
  })
})

test.describe("editing an item's details (STY-039)", () => {
  /** An item with two details, both top-level, and no Welsh ones. */
  const DETAILED = "Earlier delivery this year"
  const FIRST = "What it included"
  const SECOND = "Another thing it included"

  /** Opens the item's form and its Details field: the form, and the field's group. */
  async function openDetails(page: Page, title: string) {
    const form = await openEditItemDialog(page, title)
    await form.getByRole("button", { name: /^(Change|Add) details$/ }).click()
    const field = form.getByRole("group", { name: "Details" })
    await expect(field.getByRole("textbox").first()).toBeFocused()
    return { form, field }
  }

  /** The texts the open field holds, in order. */
  const texts = (field: Locator) =>
    field
      .getByRole("textbox")
      .evaluateAll((boxes) =>
        boxes.map((box) => (box as HTMLTextAreaElement).value),
      )

  /** The detail's text field as the list now stands, by its text. */
  async function detail(field: Locator, text: string) {
    const index = (await texts(field)).indexOf(text)
    if (index < 0) throw new Error(`No detail ${text}`)
    return field.getByRole("textbox").nth(index)
  }

  /**
   * Chooses a button that can't act: it says so with `aria-disabled`, which Playwright
   * waits out, though it can still be chosen (S23).
   */
  const chooseRefused = (button: Locator) => button.click({ force: true })

  const sideways = (page: Page) =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )

  test("details written another way show as the public site shows them, and are written only once they change (S20)", async ({
    page,
    sheets,
  }) => {
    sheets.coLead(
      "ProductA",
      DETAILED,
      "Details",
      "- One\n--- Two\n- -5 degrees\n- Three",
    )
    await openRoadmap(page, "producta", ITEM)
    const before = sheets.spreadsheet
    const { form, field } = await openDetails(page, DETAILED)

    await expect(
      field.getByRole("textbox", { name: "Detail 2 of 4, nested under “One”" }),
    ).toHaveValue("Two")
    expect(await texts(field)).toEqual(["One", "Two", "5 degrees", "Three"])
    await form.getByRole("button", { name: "Done" }).click()
    await expect(itemCard(page, DETAILED).getByText("Changed")).toHaveCount(0)

    const again = await openDetails(page, DETAILED)
    await (await detail(again.field, "Three")).click()
    await again.field.getByRole("button", { name: "Remove Three" }).click()
    await again.form.getByRole("button", { name: "Done" }).click()
    await chooseAndConfirm(page, "Publish")
    await expect(
      page.getByRole("main").getByText(/^Changes published\./),
    ).toBeVisible()
    expect(changedCells(before, sheets.spreadsheet, "ProductA")).toEqual([
      `${DETAILED}: Details = One\n- Two\n5 degrees`,
    ])
  })

  test("on a phone, a long detail at the third level wraps, every control can be reached and nothing scrolls sideways (S16)", async ({
    page,
    sheets,
  }) => {
    const long =
      "Adult clinics first, with the children's clinics to follow once they are settled"
    expect(long).toHaveLength(80)
    sheets.coLead(
      "ProductA",
      DETAILED,
      "Details",
      `${FIRST}\n- ${SECOND}\n-- ${long}`,
    )
    await page.setViewportSize({ width: PHONE_WIDTH, height: 812 })
    await openRoadmap(page, "producta", ITEM)
    const { field } = await openDetails(page, DETAILED)

    const longDetail = await detail(field, long)
    const [shortBox, longBox] = await boxesOf(
      await detail(field, FIRST),
      longDetail,
    )
    // Wrapped over several lines, all of it on show, inside the page.
    expect(longBox.height).toBeGreaterThan(shortBox.height * 2)
    expect(
      await longDetail.evaluate((box) => box.scrollHeight <= box.clientHeight),
    ).toBe(true)
    expect(longBox.right).toBeLessThanOrEqual(PHONE_WIDTH)
    expect(await sideways(page)).toBe(0)

    await longDetail.click()
    const buttons = field
      .getByRole("group", { name: "The detail selected" })
      .getByRole("button")
    await expect(buttons).toHaveCount(5)
    for (const box of await boxesOf(...(await buttons.all()))) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(PHONE_WIDTH)
    }
    await expect(
      field.getByRole("button", { name: `Move down ${long}` }),
    ).toHaveAttribute("title", "Move down")
    // A refusal fits too.
    await chooseRefused(field.getByRole("button", { name: `Move in ${long}` }))
    await expect(field.getByRole("status")).toHaveText(
      "It is already nested under the detail above.",
    )
    expect(await sideways(page)).toBe(0)
  })
})

test.describe("an item's tags, organisations and details together (STY-034, STY-037, STY-039)", () => {
  /** An item with details and an organisation, and no tags. */
  const DETAILED = "Earlier delivery this year"

  test("are pending together, then published as three cells of the item's row, nothing else written (S2, S5, S13)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const before = sheets.spreadsheet
    const form = await openEditItemDialog(page, DETAILED)

    await form.getByRole("button", { name: "Add tags" }).click()
    await form
      .getByRole("textbox", { name: "Add a tag" })
      .fill("Patients, Carers")
    await form.getByRole("button", { name: "Change organisations" }).click()
    await form.getByRole("checkbox", { name: "Powys (PTHB)" }).click()
    await form.getByRole("button", { name: "Change details" }).click()
    const details = form.getByRole("group", { name: "Details" })
    // Enter at the end of the first detail starts the next, and a hyphen nests it.
    await details.getByRole("textbox").first().focus()
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await page.keyboard.type("-Added line")
    await form.getByRole("button", { name: "Done" }).click()

    await expect(itemCard(page, DETAILED).getByText("Changed")).toBeVisible()
    expect(sheets.writes).toEqual([])

    await chooseAndConfirm(page, "Publish")

    await expect(
      page.getByRole("main").getByText(/^Changes published\./),
    ).toBeVisible()
    expect(sheets.writes).toHaveLength(1)
    expect(changedCells(before, sheets.spreadsheet, "ProductA")).toEqual([
      `${DETAILED}: Labels = Patients, Carers`,
      `${DETAILED}: Organisations = National, PTHB`,
      `${DETAILED}: Details = What it included\n- Added line\nAnother thing it included`,
    ])
  })
})
