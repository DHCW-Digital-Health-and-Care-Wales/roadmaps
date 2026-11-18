import type { Page } from "@playwright/test"

import {
  clickOutside,
  editRoadmapButton,
  editRoadmapDialog,
  editRoadmapNames,
  openEditRoadmapDialog,
  openEditRoadmapDialogFromMore,
} from "./fixtures/dialogs"
import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import { EXAMPLE_SPREADSHEET_WITH_LISTS } from "./fixtures/fake-sheets"
import { useLanguage } from "./fixtures/look"
import {
  moreButton,
  openProductDetails,
  productDetailsDisclosure,
  productDetailsField,
  roadmapFacts,
} from "./fixtures/roadmap-page"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead edits what a roadmap is about in the roadmap dialog (STY-043), against
 * the fake Sheets API: the dialog that adds a roadmap, on every product details field and no
 * short name. Done keeps the edits pending, and nothing is written until the roadmap is
 * published or saved. The rules of each field are held in `editing.spec.ts` and
 * `last-updated.spec.ts`, through this dialog. The journey runs once, at the
 * default size and theme (EPC-011's delivery notes): the accessibility spec and the
 * focus tour open the dialog in both themes.
 */

const VISION = "One record for every patient in Wales."

async function openProductA(page: Page, connectName?: string) {
  await page.goto("./#/roadmaps/producta")
  await connect(page, connectName)
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()
}

test("a Product Lead edits Product details in the roadmap dialog, the edits pending until published (S1, S2)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
  await openProductA(page)
  const dialog = await openEditRoadmapDialog(page, { offersLists: true })
  // Modal: nothing behind it can be reached.
  await expect(page.getByRole("main")).toHaveCount(0)

  // Every product details field at its value, and no short name.
  await expect(
    dialog.getByRole("textbox", { name: "Product name" }),
  ).toHaveValue("Product A roadmap")
  await expect(dialog.getByRole("textbox", { name: "Status" })).toHaveValue(
    "Beta",
  )
  await expect(
    dialog.getByRole("textbox", { name: "Product lead" }),
  ).toHaveValue("Alex Jones")
  await expect(dialog.getByRole("textbox", { name: "Vision" })).toHaveValue(
    /^A short, ambitious statement/,
  )
  await expect(
    dialog.getByRole("textbox", { name: "Service description" }),
  ).toHaveValue(/^What Product A does/)
  await expect(
    dialog.getByRole("combobox", { name: "Family" }).locator("option:checked"),
  ).toHaveText("Single Record")
  await expect(
    dialog
      .getByRole("combobox", { name: "Category" })
      .locator("option:checked"),
  ).toHaveText("GP & Community Services")
  await expect(dialog.getByLabel("Last updated")).toHaveValue("2026-10-01")
  await expect(dialog.getByRole("textbox", { name: "Short name" })).toHaveCount(
    0,
  )

  await dialog.getByRole("textbox", { name: "Vision" }).fill(VISION)
  await dialog
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: "Tests, Scans & Results" })
  await dialog.getByRole("button", { name: "Done" }).click()

  // Pending: shown, tagged, undoable, not written.
  await expect(dialog).toBeHidden()
  const main = page.getByRole("main")
  await expect(editRoadmapButton(page)).toBeFocused()
  const details = await openProductDetails(page)
  await expect(details.getByText(VISION)).toBeVisible()
  await expect(details.getByText("Changed")).toBeVisible()
  await expect(
    details.getByRole("button", { name: "Undo changes Product details" }),
  ).toBeEnabled()
  await expect(productDetailsField(details, "Category")).toHaveText(
    "Tests, Scans & Results",
  )
  await expect(main.getByText("2 unpublished changes")).toBeVisible()
  expect(sheets.writes).toEqual([])

  // The dialog opens again on the pending edits.
  const reopened = await openEditRoadmapDialog(page, { offersLists: true })
  await expect(reopened.getByRole("textbox", { name: "Vision" })).toHaveValue(
    VISION,
  )
  await expect(
    reopened
      .getByRole("combobox", { name: "Category" })
      .locator("option:checked"),
  ).toHaveText("Tests, Scans & Results")
})

test("Cancel and Escape close the dialog and drop what was typed, keeping the edits already pending; a click outside does nothing (S4)", async ({
  page,
}) => {
  await openProductA(page)
  const first = await openEditRoadmapDialog(page)
  await first.getByRole("textbox", { name: "Vision" }).fill(VISION)
  await first.getByRole("button", { name: "Done" }).click()
  const main = page.getByRole("main")
  await expect(main.getByText("1 unpublished change")).toBeVisible()

  const dialog = await openEditRoadmapDialog(page)
  const status = dialog.getByRole("textbox", { name: "Status" })
  await status.fill("Live")
  await clickOutside(page, dialog)
  await expect(dialog).toBeVisible()
  await expect(status).toHaveValue("Live")

  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(editRoadmapButton(page)).toBeFocused()

  await page.keyboard.press("Enter")
  await expect(
    dialog.getByRole("textbox", { name: "Product name" }),
  ).toBeFocused()
  await expect(status).toHaveValue("Beta")
  await status.fill("Retired")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(editRoadmapButton(page)).toBeFocused()

  await expect(roadmapFacts(page)).toContainText("Status: Beta")
  const details = await openProductDetails(page)
  await expect(details.getByText(VISION)).toBeVisible()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
})

test("the dialog stays through the session warning and the session's end, and Done still keeps the edits (S4)", async ({
  page,
}) => {
  await page.clock.install()
  await openProductA(page)
  const dialog = await openEditRoadmapDialog(page)
  const vision = dialog.getByRole("textbox", { name: "Vision" })
  await vision.fill(VISION)

  // The warning opens over the dialog; leaving it leaves the dialog as it was.
  await page.clock.fastForward(sessionMs() - SESSION_WARNING_MS)
  const warning = page.getByRole("alertdialog", {
    name: "Your session is about to end",
  })
  await expect(
    warning.getByRole("button", { name: "Stay connected" }),
  ).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(warning).toBeHidden()
  await expect(vision).toHaveValue(VISION)

  await page.clock.fastForward(SESSION_WARNING_MS)
  // Said by the page behind, which only its text can reach.
  await expect(page.getByText("Your session has expired")).toBeVisible()
  await expect(vision).toHaveValue(VISION)
  await dialog.getByRole("button", { name: "Done" }).click()

  await expect(dialog).toBeHidden()
  const main = page.getByRole("main")
  await expect((await openProductDetails(page)).getByText(VISION)).toBeVisible()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  // Still on offer: it asks to reconnect first (STY-057).
  await expect(
    main.getByRole("button", { name: "Publish changes" }),
  ).toBeEnabled()
})

test("editing Product details in Welsh (S5)", async ({ page }) => {
  await useLanguage(page, "cy")
  await openProductA(page, "Cysylltu â Google")
  const main = page.getByRole("main")

  const dialog = await openEditRoadmapDialog(page, { language: "cy" })
  const title = dialog.getByRole("textbox", {
    name: "Enw'r cynnyrch (Saesneg)",
  })
  await title.fill("")
  await dialog.getByRole("button", { name: "Gorffen" }).click()
  await expect(title).toHaveAccessibleDescription(
    "Gwall: Rhowch enw'r cynnyrch",
  )
  await expect(title).toBeFocused()

  await title.fill("Product A, renamed")
  await dialog
    .getByRole("textbox", { name: "Gweledigaeth (Saesneg)" })
    .fill(VISION)
  await dialog.getByRole("button", { name: "Gorffen" }).click()

  await expect(dialog).toBeHidden()
  await expect(
    main.getByRole("heading", { level: 1, name: "Product A, renamed" }),
  ).toBeVisible()
  await expect(main.getByText("2 newid heb eu cyhoeddi")).toBeVisible()
})

test("More lists Edit product details first, which opens the roadmap dialog with the details closed, focus returning to More (STY-065 S5)", async ({
  page,
}) => {
  await openProductA(page)
  const more = moreButton(page)

  await more.click()
  await expect(page.getByRole("menu").getByRole("menuitem")).toHaveText([
    "Edit product details",
    "Refresh",
    "Unpublish roadmap",
  ])
  await page.keyboard.press("Escape")
  await expect(page.getByRole("menu")).toBeHidden()

  const dialog = await openEditRoadmapDialogFromMore(page)
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(more).toBeFocused()
  await expect(productDetailsDisclosure(page)).toHaveAttribute(
    "aria-expanded",
    "false",
  )
  // The details stayed as they were: closed, so Edit is not on the page.
  await expect(editRoadmapButton(page)).toHaveCount(0)
})

test("More's Edit product details opens the dialog with the details open too, edits made there pending as from Edit (STY-065 S5)", async ({
  page,
}) => {
  await openProductA(page)
  await openProductDetails(page)

  const dialog = await openEditRoadmapDialogFromMore(page)
  await dialog.getByRole("textbox", { name: "Vision" }).fill(VISION)
  await dialog.getByRole("button", { name: "Done" }).click()

  await expect(dialog).toBeHidden()
  await expect(moreButton(page)).toBeFocused()
  await expect(
    page.getByRole("main").getByText("1 unpublished change"),
  ).toBeVisible()
  await expect(productDetailsDisclosure(page)).toHaveAttribute(
    "aria-expanded",
    "true",
  )
})

for (const language of ["en", "cy"] as const) {
  test(`the roadmap dialog is headed for the product details, its first and last fields naming the roadmap, in ${language} (STY-065 S9)`, async ({
    page,
  }) => {
    if (language === "cy") await useLanguage(page, "cy")
    await openProductA(
      page,
      language === "cy" ? "Cysylltu â Google" : undefined,
    )
    const names = editRoadmapNames(language)

    const dialog = await openEditRoadmapDialog(page, { language })

    await expect(
      dialog.getByRole("heading", { name: names.title, level: 2 }),
    ).toBeVisible()
    await expect(editRoadmapDialog(page, language)).toBeVisible()
    const fields = dialog.getByRole("textbox")
    await expect(fields.first()).toHaveAccessibleName(names.firstField)
    await expect(
      dialog.getByLabel(names.lastField, { exact: true }),
    ).toBeVisible()
    // The field is the roadmap's, not the item dialog's own "Title".
    await expect(
      dialog.getByRole("textbox", {
        name: language === "en" ? "Title" : "Teitl (Saesneg)",
        exact: true,
      }),
    ).toHaveCount(0)
  })
}
