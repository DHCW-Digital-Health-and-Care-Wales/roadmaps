import type { Page } from "@playwright/test"

import {
  EXAMPLE_INDEX_ROWS,
  EXAMPLE_LISTS,
  withRoadmapIndex,
  type FakeTab,
} from "./fixtures/fake-sheets"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-029, STY-033: the families, categories and organisations page, adding a family, and renaming or
 * recolouring one with its roadmaps in one write.
 */

const [header = []] = EXAMPLE_INDEX_ROWS

/** The example index with Product C (not published) in Single Record too. */
const INDEX_ROWS = EXAMPLE_INDEX_ROWS.map((row) =>
  row[0] === "ProductC"
    ? row.map((cell, column) =>
        header[column] === "Family" ? "Single Record" : cell,
      )
    : row,
)

function tab(sheets: { spreadsheet: readonly FakeTab[] }, title: string) {
  const found = sheets.spreadsheet.find((each) => each.title === title)
  if (!found) throw new Error(`No ${title} tab`)
  return found
}

/** A cell of the roadmap index by its `Sheet` and its column's header. */
function indexCell(
  sheets: { spreadsheet: readonly FakeTab[] },
  sheet: string,
  column: string,
): string | undefined {
  const [names = [], ...rows] = tab(sheets, "Roadmaps").rows
  return rows.find((row) => row[0] === sheet)?.[names.indexOf(column)]
}

async function openPage(page: Page) {
  await page.goto("./")
  await connect(page)
  await page
    .getByRole("main")
    .getByRole("link", { name: "Families, categories and organisations" })
    .click()
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Families, categories and organisations",
    }),
  ).toBeVisible()
  return page.getByRole("main")
}

test.beforeEach(({ sheets }) => {
  sheets.spreadsheet = [...withRoadmapIndex(INDEX_ROWS), ...EXAMPLE_LISTS]
})

test("lists each family with its colour, names and roadmaps, and the categories and organisations read-only (S1)", async ({
  page,
}) => {
  const main = await openPage(page)

  const family = main
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Single Record" }) })
  await expect(family).toContainText("Welsh: Cofnod Sengl")
  await expect(family).toContainText("#12a3c9")
  await expect(family.getByRole("link")).toHaveText([
    "Product A roadmap",
    "Product C roadmap",
  ])
  await expect(family.getByText("Not published")).toHaveCount(1)

  const categories = main.getByRole("region", {
    name: "Categories",
    exact: true,
  })
  await expect(categories.getByRole("listitem")).toHaveText([
    "GP & Community Services",
    "Tests, Scans & Results",
  ])
  await expect(categories.getByRole("button")).toHaveCount(0)

  const organisations = main.getByRole("region", {
    name: "Organisations",
    exact: true,
  })
  const entries = organisations.getByRole("listitem")
  await expect(entries).toHaveCount(14)
  await expect(entries.first()).toHaveText("All Wales (National)")
  await expect(entries.nth(1)).toHaveText(
    "Aneurin Bevan University Health Board (ABUHB)",
  )
  await expect(organisations.getByRole("button")).toHaveCount(0)
})

test("adds a family as a new Families row, changing no roadmap (S2)", async ({
  page,
  sheets,
}) => {
  const main = await openPage(page)
  const index = tab(sheets, "Roadmaps").rows

  await main.getByRole("button", { name: "Add a family" }).click()
  const form = main.getByRole("form", { name: "Add a family" })
  await form.getByRole("textbox", { name: "Name" }).fill("Screening")
  await form.getByRole("textbox", { name: "Colour" }).fill("#00796B")
  await form.getByRole("button", { name: "Add family" }).click()

  await expect(main.getByRole("status")).toHaveText("Screening added")
  await expect(
    main.getByRole("heading", { level: 3, name: "Screening" }),
  ).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
  const rows = tab(sheets, "Families").rows
  expect(rows).toHaveLength(4)
  expect(rows[3]).toEqual([
    expect.stringMatching(/^[a-z0-9]{8}$/),
    "Screening",
    "",
    "#00796b",
  ])
  expect(tab(sheets, "Roadmaps").rows).toEqual(index)
})

test("confirms a rename naming each roadmap, then writes the family and its roadmaps at once (S3, S4, S9)", async ({
  page,
  sheets,
}) => {
  const main = await openPage(page)

  await main.getByRole("button", { name: "Change Single Record" }).click()
  const form = main.getByRole("form", { name: "Change Single Record" })
  await form.getByRole("textbox", { name: "Name" }).fill("Shared Care Record")
  await form.getByRole("textbox", { name: "Colour" }).fill("#00796b")
  await form.getByRole("button", { name: "Save changes" }).click()

  const dialog = page.getByRole("alertdialog", {
    name: "Change Single Record on its roadmaps?",
  })
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Product A roadmap Published",
    "Product C roadmap",
  ])
  await expect(dialog).toContainText("after its next nightly update")
  await expect(dialog).not.toContainText("Welsh")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  expect(sheets.writes).toEqual([])

  await form.getByRole("button", { name: "Save changes" }).click()
  await dialog.getByRole("button", { name: "Change family" }).click()

  await expect(main.getByRole("status")).toHaveText(
    "Shared Care Record changed. The public site shows it after its next nightly update.",
  )
  await expect(
    main.getByRole("heading", { level: 3, name: "Shared Care Record" }),
  ).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
  expect(tab(sheets, "Families").rows[1]).toEqual([
    "fc29g5b9",
    "Shared Care Record",
    "Cofnod Sengl",
    "#00796b",
  ])
  for (const sheet of ["ProductA", "ProductC"]) {
    expect(indexCell(sheets, sheet, "Family ID")).toBe("fc29g5b9")
    expect(indexCell(sheets, sheet, "Family")).toBe("Shared Care Record")
    expect(indexCell(sheets, sheet, "Family (cy)")).toBe("Cofnod Sengl")
    expect(indexCell(sheets, sheet, "Colour")).toBe("#00796b")
  }
  expect(indexCell(sheets, "ProductB", "Family")).toBe(
    "Medicines & Diagnostics",
  )
})

test("refuses a change a co-lead made first, showing their value beside it (S5)", async ({
  page,
  sheets,
}) => {
  const main = await openPage(page)

  await main.getByRole("button", { name: "Change Single Record" }).click()
  sheets.coLead("Families", "fc29g5b9", "Colour", "#ff0000")
  const form = main.getByRole("form", { name: "Change Single Record" })
  await form.getByRole("textbox", { name: "Colour" }).fill("#00796b")
  await form.getByRole("button", { name: "Save changes" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Change family" })
    .click()

  const review = main.getByRole("alert")
  await expect(review).toContainText("Someone else has changed this family")
  await expect(review).toContainText("#00796b")
  await expect(review).toContainText("#ff0000")
  await expect(review).toBeFocused()
  expect(sheets.writes).toEqual([])
})

test("says what is wrong with the input, and writes nothing (S6)", async ({
  page,
  sheets,
}) => {
  const main = await openPage(page)

  await main.getByRole("button", { name: "Add a family" }).click()
  const form = main.getByRole("form", { name: "Add a family" })
  const name = form.getByRole("textbox", { name: "Name" })
  const colour = form.getByRole("textbox", { name: "Colour" })
  await colour.fill("teal")
  await form.getByRole("button", { name: "Add family" }).click()
  await expect(name).toHaveAccessibleDescription("Error: Enter a name")
  await expect(colour).toHaveAccessibleDescription(
    "A hex colour, like #00796b. Error: Enter a colour like #00796b",
  )

  await name.fill("  single-RECORD! ")
  await colour.fill("#00796b")
  await form.getByRole("button", { name: "Add family" }).click()
  await expect(name).toHaveAccessibleDescription(
    "Error: Another family has this name",
  )
  expect(sheets.writes).toEqual([])
})

test("offers nothing to change without a Families tab (S7)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = sheets.spreadsheet.filter(
    ({ title }) => title !== "Families",
  )
  const main = await openPage(page)

  await expect(main).toContainText("Families can't be changed right now")
  await expect(main.getByRole("button", { name: /Change|Add/ })).toHaveCount(0)
})

test("asks again when a roadmap joined the family since the confirmation (S8)", async ({
  page,
  sheets,
}) => {
  const main = await openPage(page)

  await main.getByRole("button", { name: "Change Single Record" }).click()
  const form = main.getByRole("form", { name: "Change Single Record" })
  await form.getByRole("textbox", { name: "Colour" }).fill("#00796b")
  await form.getByRole("button", { name: "Save changes" }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog.getByRole("listitem")).toHaveCount(2)
  sheets.coLead("Roadmaps", "ProductB", "Family", "Single Record")
  await dialog.getByRole("button", { name: "Change family" }).click()

  await expect(dialog).toContainText(
    "The roadmaps in this family have changed. Check them again.",
  )
  await expect(dialog.getByRole("listitem")).toHaveText([
    "Product A roadmap Published",
    "Product B roadmap Published",
    "Product C roadmap",
  ])
  expect(sheets.writes).toEqual([])

  await dialog.getByRole("button", { name: "Change family" }).click()
  await expect(main.getByRole("status")).toContainText("Single Record changed")
  expect(sheets.writes).toHaveLength(1)
  expect(indexCell(sheets, "ProductB", "Colour")).toBe("#00796b")
})
