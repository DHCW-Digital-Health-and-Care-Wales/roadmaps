import type { Page } from "@playwright/test"

import {
  EXAMPLE_INDEX_ROWS,
  EXAMPLE_LISTS,
  EXAMPLE_SPREADSHEET,
  type FakeTab,
  withRoadmapIndex,
} from "./fixtures/fake-sheets"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * A Product Lead edits a roadmap's English and publishes it, or saves it when the roadmap
 * is not published (STY-025), against the fake Sheets API: one `batchUpdate` per publish.
 * A co-lead's change made meanwhile is shown, never overwritten (STY-026). A family and
 * category are chosen from their lists (STY-028).
 */

const ITEM = "Example card with every column"

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

/** Edits an item's English title through its card's form. */
async function editTitle(page: Page, from: string, to: string) {
  const main = page.getByRole("main")
  await main.getByRole("button", { name: `Edit ${from}` }).click()
  const form = main.getByRole("form", { name: from })
  await form.getByRole("textbox", { name: "Title" }).fill(to)
  await form.getByRole("button", { name: "Done" }).click()
  await expect(itemCard(page, to).getByText("Changed")).toBeVisible()
}

/** Opens the publish (or save) dialog and confirms it. */
async function confirmPublish(page: Page, action: "Publish" | "Save") {
  await page
    .getByRole("main")
    .getByRole("button", { name: `${action} changes` })
    .click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: `${action} changes` }).click()
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

  await confirmPublish(page, "Publish")

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

  await confirmPublish(page, "Save")

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

  await confirmPublish(page, "Publish")

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

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Disconnect" })
    .click()
  const question = page.getByRole("alertdialog")
  await expect(question).toContainText("Keep your changes?")
  await question
    .getByRole("button", { name: "Keep changes and disconnect" })
    .click()

  await page
    .getByRole("main")
    .getByRole("link", { name: "Back to roadmaps" })
    .click()
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

  await page
    .getByRole("main")
    .getByRole("button", { name: "Edit Minimal card" })
    .click()
  await expect(
    page.getByRole("main").getByRole("form", { name: "Minimal card" }),
  ).toBeVisible()
  expect(await overflow()).toBe(0)
  const form = page
    .getByRole("main")
    .getByRole("form", { name: "Minimal card" })
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

/** Publishes a first edit, so every item has an ID a later publish can find it by. */
async function publishOnce(page: Page) {
  await editTitle(page, "Minimal card", "A minimal card")
  await confirmPublish(page, "Publish")
  await expect(
    page.getByRole("main").getByText(/^Changes published\./),
  ).toBeVisible()
}

/** Edits the roadmap's English vision through "About this roadmap". */
async function editVision(page: Page, to: string) {
  const main = page.getByRole("main")
  await main.getByRole("button", { name: "Edit About this roadmap" }).click()
  await main.getByRole("textbox", { name: "Vision" }).fill(to)
  await main.getByRole("button", { name: "Done" }).click()
  await expect(main.getByText(to)).toBeVisible()
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

    await confirmPublish(page, "Publish")

    const review = page.getByRole("main").getByRole("alert")
    await expect(review).toBeFocused()
    await expect(review).toContainText(
      "Someone else has changed text you edited",
    )
    await expect(review).toContainText("Nothing was published.")
    await expect(review.getByRole("listitem")).toHaveCount(2)
    await expect(review.getByRole("listitem").first()).toContainText(
      /About this roadmap: Vision.*Your change.*My vision\..*Current text.*Their vision\./,
    )
    expect(sheets.writes).toHaveLength(1)
    await expect(
      page.getByRole("main").getByRole("button", { name: "Publish changes" }),
    ).toHaveAttribute("aria-disabled", "true")

    await review
      .getByRole("button", { name: "Keep mine About this roadmap: Vision" })
      .click()
    await expect(
      review.getByRole("button", { name: "Keep mine My first card: Title" }),
    ).toBeFocused()
    await review
      .getByRole("button", { name: "Use theirs My first card: Title" })
      .click()
    const action = page
      .getByRole("main")
      .getByRole("button", { name: "Publish changes" })
    await expect(action).toBeFocused()
    await expect(review).toHaveCount(0)

    await confirmPublish(page, "Publish")

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

  test("removing an item discards only the changes to it, naming it (S5)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    await publishOnce(page)
    await editTitle(page, ITEM, "My first card")
    await editTitle(page, "Discovery card", "My discovery card")
    sheets.coLead("ProductA", "Discovery card", "Title", null)

    await confirmPublish(page, "Publish")

    const review = page.getByRole("main").getByRole("alert")
    await expect(review).toBeFocused()
    await expect(review).toContainText("Some changes couldn't be kept")
    await expect(review).toContainText(
      "Someone else has removed or changed “Discovery card”, so your changes to it couldn't be kept.",
    )
    expect(sheets.writes).toHaveLength(1)
    await expect(
      page.getByRole("main").getByText("1 unpublished change"),
    ).toBeVisible()

    await review.getByRole("button", { name: "Dismiss message" }).click()
    await confirmPublish(page, "Publish")
    await expect(
      page.getByRole("main").getByText(/^Changes published\./),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 3, name: "My first card" }),
    ).toBeVisible()
  })

  test("removing the roadmap from the list discards its changes and says so (S6)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    await editTitle(page, ITEM, "My first card")
    sheets.spreadsheet = withRoadmapIndex(
      EXAMPLE_INDEX_ROWS.filter(([sheet]) => sheet !== "ProductA"),
    )

    await confirmPublish(page, "Publish")

    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { level: 1, name: "Roadmap not found" }),
    ).toBeVisible()
    await expect(
      page
        .getByRole("main")
        .getByText(
          "This roadmap was removed from the list, so your changes to it couldn't be kept.",
        ),
    ).toBeVisible()
    expect(sheets.writes).toEqual([])
    await page
      .getByRole("main")
      .getByRole("link", { name: "Back to roadmaps" })
      .first()
      .click()
    await expect(roadmapCards(page)).toHaveText([
      "Product B roadmap",
      "Product C roadmap",
    ])
    await expect(
      page.getByRole("main").getByText("Unpublished changes"),
    ).toHaveCount(0)
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

  async function editAbout(page: Page) {
    const main = page.getByRole("main")
    await main.getByRole("button", { name: "Edit About this roadmap" }).click()
    return main.getByRole("form", { name: "About this roadmap" })
  }

  test.beforeEach(({ sheets }) => {
    sheets.spreadsheet = [...EXAMPLE_SPREADSHEET, ...EXAMPLE_LISTS]
  })

  test("is chosen from the lists, pending in its colour, then published with its IDs (S1, S2, S3)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const form = await editAbout(page)
    const category = form.getByRole("combobox", { name: "Category" })
    await expect(category.getByRole("option")).toHaveText([
      "No category",
      "GP & Community Services",
      "Tests, Scans & Results",
    ])
    await form
      .getByRole("combobox", { name: "Family" })
      .selectOption("Medicines & Diagnostics")
    await category.selectOption("Tests, Scans & Results")
    await form.getByRole("button", { name: "Done" }).click()

    const main = page.getByRole("main")
    const line = main.getByText("Family: Medicines & Diagnostics")
    await expect(line).toBeVisible()
    await expect(line.locator("xpath=../..").locator("span[style]")).toHaveCSS(
      "background-color",
      "rgb(0, 103, 71)",
    )
    await expect(
      main.getByText("Category: Tests, Scans & Results"),
    ).toBeVisible()
    await expect(main.getByText("2 unpublished changes")).toBeVisible()
    expect(sheets.writes).toEqual([])

    await confirmPublish(page, "Publish")

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
    await expect(line).toBeVisible()
  })

  test("No family blanks its names, keeping the colour (S2)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "productb", "Building the core service")
    const form = await editAbout(page)
    await form
      .getByRole("combobox", { name: "Family" })
      .selectOption("No family")
    await form.getByRole("button", { name: "Done" }).click()

    await confirmPublish(page, "Publish")

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

    await confirmPublish(page, "Publish")

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

  test("a co-lead's move to another family is shown by name, nothing written (S5)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, "producta", ITEM)
    const form = await editAbout(page)
    await form
      .getByRole("combobox", { name: "Family" })
      .selectOption("No family")
    await form.getByRole("button", { name: "Done" }).click()
    sheets.coLead("Roadmaps", "ProductA", "Family", "Medicines & Diagnostics")

    await confirmPublish(page, "Publish")

    const review = page.getByRole("main").getByRole("alert")
    await expect(review).toBeFocused()
    await expect(review.getByRole("listitem")).toContainText(
      /About this roadmap: Family.*Your change.*No family.*Current text.*Medicines & Diagnostics/,
    )
    expect(sheets.writes).toHaveLength(0)
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
    const form = await editAbout(page)

    await expect(form.getByRole("combobox", { name: "Category" })).toBeVisible()
    await expect(form.getByRole("combobox", { name: "Family" })).toHaveCount(0)
    await expect(form.getByText("Single Record")).toBeVisible()
    await expect(
      form.getByText("The family can't be changed right now."),
    ).toBeVisible()
  })
})
