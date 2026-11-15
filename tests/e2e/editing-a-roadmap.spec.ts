import type { Page } from "@playwright/test"

import {
  clickOutside,
  editRoadmapButton,
  openEditRoadmapDialog,
} from "./fixtures/dialogs"
import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import { EXAMPLE_SPREADSHEET_WITH_LISTS } from "./fixtures/fake-sheets"
import { useLanguage } from "./fixtures/look"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead edits what a roadmap is about in the roadmap dialog (STY-043), against
 * the fake Sheets API: the dialog that adds a roadmap, on every About field and no
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

test("a Product Lead edits About in the roadmap dialog, the edits pending until published (S1, S2)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
  await openProductA(page)
  const dialog = await openEditRoadmapDialog(page, { offersLists: true })
  // Modal: nothing behind it can be reached.
  await expect(page.getByRole("main")).toHaveCount(0)

  // Every About field at its value, and no short name.
  await expect(dialog.getByRole("textbox", { name: "Title" })).toHaveValue(
    "Product A roadmap",
  )
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
  const about = main.getByRole("region", { name: "About this roadmap" })
  await expect(editRoadmapButton(page)).toBeFocused()
  await expect(about.getByText(VISION)).toBeVisible()
  await expect(about.getByText("Changed")).toBeVisible()
  await expect(
    about.getByRole("button", { name: "Undo changes About this roadmap" }),
  ).toBeEnabled()
  await expect(main.getByText("Category: Tests, Scans & Results")).toBeVisible()
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
  await expect(dialog.getByRole("textbox", { name: "Title" })).toBeFocused()
  await expect(status).toHaveValue("Beta")
  await status.fill("Retired")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(editRoadmapButton(page)).toBeFocused()

  const about = main.getByRole("region", { name: "About this roadmap" })
  await expect(about.getByText("Beta")).toBeVisible()
  await expect(about.getByText(VISION)).toBeVisible()
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
  await expect(main.getByText(VISION)).toBeVisible()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  await expect(
    main.getByRole("button", { name: "Publish changes" }),
  ).toHaveAttribute("aria-disabled", "true")
})

test("editing About in Welsh (S5)", async ({ page }) => {
  await useLanguage(page, "cy")
  await openProductA(page, "Cysylltu â Google")
  const main = page.getByRole("main")

  const dialog = await openEditRoadmapDialog(page, { language: "cy" })
  const title = dialog.getByRole("textbox", { name: "Teitl (Saesneg)" })
  await title.fill("")
  await dialog.getByRole("button", { name: "Gorffen" }).click()
  await expect(title).toHaveAccessibleDescription("Gwall: Rhowch deitl")
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
