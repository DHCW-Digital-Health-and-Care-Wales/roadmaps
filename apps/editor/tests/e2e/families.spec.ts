import type { Page } from "@playwright/test"

import {
  EXAMPLE_INDEX_ROWS,
  EXAMPLE_LISTS,
  withRoadmapIndex,
  type FakeTab,
} from "./fixtures/fake-sheets"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-029, STY-033: adding a family, and renaming or recolouring one with its roadmaps in
 * one write: the round trip through the fakes, the rows and cells written. What the page
 * lists and refuses is held by `families-page.test.tsx`, and a co-lead's change by it and
 * the repository contract.
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
  // The navigation leads here; the list no longer links to it (STY-058).
  await page
    .getByRole("navigation")
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

test("adds a family as a new Families row, then confirms a rename naming each roadmap and writes the family and its roadmaps at once (S2, S3, S4, S9)", async ({
  page,
  sheets,
}) => {
  const main = await openPage(page)
  const index = tab(sheets, "Roadmaps").rows

  // Adding: one write, a new Families row, no roadmap changed.
  await main.getByRole("button", { name: "Add a family" }).click()
  const add = main.getByRole("form", { name: "Add a family" })
  await add.getByRole("textbox", { name: "Name" }).fill("Screening")
  await add.getByRole("textbox", { name: "Colour" }).fill("#00796B")
  await add.getByRole("button", { name: "Add family" }).click()

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

  // Changing: confirmed first, naming each roadmap, then one write for the family and them.
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
  expect(sheets.writes).toHaveLength(1)

  await form.getByRole("button", { name: "Save changes" }).click()
  await dialog.getByRole("button", { name: "Change family" }).click()

  await expect(main.getByRole("status")).toHaveText(
    "Shared Care Record changed. The public site shows it after its next nightly update.",
  )
  await expect(
    main.getByRole("heading", { level: 3, name: "Shared Care Record" }),
  ).toBeVisible()
  expect(sheets.writes).toHaveLength(2)
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
