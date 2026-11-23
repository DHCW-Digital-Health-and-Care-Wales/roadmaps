import type { Page } from "@playwright/test"

import { openEditRoadmapDialog } from "./fixtures/dialogs"
import { useLanguage } from "./fixtures/look"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead edits what a roadmap is about in the roadmap dialog (STY-043), against
 * the fake Sheets API: the dialog that adds a roadmap, on every product details field and
 * no short name. What it holds, in English, is held by `roadmap-detail-page-editing.test.tsx`
 * (the fields, pending edits, Cancel, Escape, a session that ends) and
 * `roadmap-detail-page-header.test.tsx` (More's Edit product details); a click outside it
 * by `closing-a-dialog.spec.ts`; and an edit published, with its cells, by
 * `editing.spec.ts`. This is the one run of the dialog in Welsh through the built bundle.
 */

const VISION = "One record for every patient in Wales."

async function openProductA(page: Page, connectName?: string) {
  await page.goto("./#/roadmaps/producta")
  await connect(page, connectName)
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()
}

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
