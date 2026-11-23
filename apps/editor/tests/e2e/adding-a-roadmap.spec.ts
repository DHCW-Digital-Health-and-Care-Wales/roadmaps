import type { Page } from "@playwright/test"

import {
  ADD_ROADMAP,
  addRoadmapButtons,
  addRoadmapDialog,
  cornerClose,
  openAddRoadmapDialog,
  openDialog,
} from "./fixtures/dialogs"
import {
  EXAMPLE_INDEX_ROWS,
  EXAMPLE_SPREADSHEET_WITH_LISTS,
  withRoadmapIndex,
} from "./fixtures/fake-sheets"
import {
  productDetailsField,
  goToList,
  openProductDetails,
  roadmapFacts,
} from "./fixtures/roadmap-page"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * The round trip of adding a roadmap through the fakes, with a first roadmap into an index
 * of only its header. Every rule of the dialog (the short name, a refusal, a failed
 * write, closing, an expired session, Welsh) is held by `roadmaps-page-adding.test.tsx`
 * and the repository contract.
 */

const [HEADER = []] = EXAMPLE_INDEX_ROWS

const ADDED = "Community Nursing roadmap was added. It isn't published yet."

/** The new roadmap's page, once the dialog has gone. */
async function expectNewRoadmapPage(page: Page) {
  const main = page.getByRole("main")
  await expect(
    main.getByRole("heading", { level: 1, name: "Community Nursing roadmap" }),
  ).toBeVisible()
  await expect(addRoadmapDialog(page)).toBeHidden()
  await expect(page).toHaveURL(/#\/roadmaps\/community-nursing$/)
  return main
}

test("a Product Lead adds a roadmap and lands on its page (S1–S3, S5)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
  const dialog = await openAddRoadmapDialog(page, { offersLists: true })
  // Modal: nothing behind it can be reached.
  await expect(page.getByRole("main")).toHaveCount(0)

  const shortName = dialog.getByRole("textbox", { name: "Short name" })
  await dialog
    .getByRole("textbox", { name: "Product name" })
    .fill("Community Nursing roadmap")
  await expect(shortName).toHaveValue("Community Nursing")
  await expect(
    dialog.getByText(
      "Its public address will end “community-nursing”. It can't be changed here later.",
    ),
  ).toBeVisible()
  await expect(dialog.getByRole("combobox", { name: "Family" })).toHaveValue("")
  await dialog
    .getByRole("combobox", { name: "Family" })
    .selectOption({ label: "Medicines & Diagnostics" })
  await dialog
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: "GP & Community Services" })
  await dialog.getByRole("textbox", { name: "Product lead" }).fill("Sam Evans")
  await expect(
    dialog.getByText(
      "It starts not published, with no items. The public site doesn't show it until you publish it.",
    ),
  ).toBeVisible()

  // Working: the fields are held, and the dialog stays, until the write answers.
  const release = sheets.hold()
  const add = dialog.getByRole("button", { name: "Add roadmap" })
  await add.click()
  await expect(add).toHaveAttribute("aria-busy", "true")
  await expect(shortName).toHaveAttribute("readonly", "")
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled()
  await expect(cornerClose(dialog)).toBeDisabled()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeVisible()
  release()

  const main = await expectNewRoadmapPage(page)
  await expect(main).toBeFocused()
  await expect(main.getByText(ADDED)).toBeVisible()
  await expect(main.getByText("Not published")).toBeVisible()
  await expect(
    main.getByRole("button", { name: "Publish roadmap" }),
  ).toBeEnabled()
  const details = await openProductDetails(page)
  await expect(productDetailsField(details, "Family")).toContainText(
    "Medicines & Diagnostics",
  )
  await expect(productDetailsField(details, "Category")).toHaveText(
    "GP & Community Services",
  )
  await expect(roadmapFacts(page)).toContainText("Product lead: Sam Evans")
  await expect(
    main.getByRole("heading", { name: "No items yet" }),
  ).toBeVisible()
  // One write: the roadmap's entry and its empty roadmap together.
  expect(sheets.writes).toHaveLength(1)

  await goToList(page)
  await expect(page.getByText("4 roadmaps, 2 not published")).toBeVisible()
  await expect(
    main
      .getByRole("list", { name: "Medicines & Diagnostics" })
      .getByRole("link", { name: "Community Nursing roadmap" }),
  ).toBeVisible()
  await expect(main.getByText(ADDED)).toBeHidden()

  // Said once: going back to the roadmap's page says nothing.
  await page.goBack()
  await expectNewRoadmapPage(page)
  await expect(main.getByText(ADDED)).toBeHidden()
})

test("the empty list offers Add a roadmap too, and lists the first roadmap (S1, S9)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withRoadmapIndex([HEADER])
  await page.goto("./")
  await connect(page)
  const main = page.getByRole("main")
  await expect(
    main.getByRole("heading", { name: "No roadmaps yet" }),
  ).toBeVisible()
  const offers = addRoadmapButtons(page)
  await expect(offers).toHaveCount(2)

  const dialog = await openDialog(page, offers.last(), ADD_ROADMAP)
  // No family or category list in this spreadsheet: neither can be chosen.
  await expect(
    dialog.getByText("The family can't be changed right now."),
  ).toBeVisible()
  await expect(
    dialog.getByText("The category can't be changed right now."),
  ).toBeVisible()
  await expect(dialog.getByRole("combobox")).toHaveCount(0)
  await dialog
    .getByRole("textbox", { name: "Product name" })
    .fill("Community Nursing roadmap")
  await dialog.getByRole("button", { name: "Add roadmap" }).click()

  await expectNewRoadmapPage(page)
  await goToList(page)
  await expect(roadmapCards(page)).toHaveText(["Community Nursing roadmap"])
  await expect(page.getByText("1 roadmap, 1 not published")).toBeVisible()
})
