import type { Page } from "@playwright/test"

import {
  ADD_ROADMAP,
  addRoadmapButtons,
  addRoadmapDialog,
  clickOutside,
  openAddRoadmapDialog,
  openDialog,
  reconnectButton,
  reconnectDialog,
} from "./fixtures/dialogs"
import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import {
  EXAMPLE_INDEX_ROWS,
  EXAMPLE_SPREADSHEET,
  EXAMPLE_SPREADSHEET_WITH_LISTS,
  withRoadmapIndex,
} from "./fixtures/fake-sheets"
import { useLanguage } from "./fixtures/look"
import { aboutField, openAbout } from "./fixtures/roadmap-page"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

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
    .getByRole("textbox", { name: "Title" })
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
  const about = await openAbout(page)
  await expect(aboutField(about, "Family")).toContainText(
    "Medicines & Diagnostics",
  )
  await expect(aboutField(about, "Category")).toHaveText(
    "GP & Community Services",
  )
  await expect(about.getByText("Sam Evans")).toBeVisible()
  await expect(
    main.getByRole("heading", { name: "No items yet" }),
  ).toBeVisible()
  // One write: the roadmap's entry and its empty roadmap together.
  expect(sheets.writes).toHaveLength(1)

  await main.getByRole("link", { name: "Back to roadmaps" }).click()
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
    .getByRole("textbox", { name: "Title" })
    .fill("Community Nursing roadmap")
  await dialog.getByRole("button", { name: "Add roadmap" }).click()

  await expectNewRoadmapPage(page)
  await main.getByRole("link", { name: "Back to roadmaps" }).click()
  await expect(roadmapCards(page)).toHaveText(["Community Nursing roadmap"])
  await expect(page.getByText("1 roadmap, 1 not published")).toBeVisible()
})

test("Add a roadmap asks to reconnect once the session has expired, then opens the dialog (S1, STY-057)", async ({
  page,
}) => {
  await page.clock.install()
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)
  const add = addRoadmapButtons(page)
  await expect(add).toBeEnabled()

  await page.clock.fastForward(sessionMs())
  await page.keyboard.press("Escape")

  await expect(
    page.getByRole("main").getByText("Your session has expired"),
  ).toBeVisible()
  await expect(add).toBeEnabled()
  await add.click()
  await reconnectButton(page).click()

  await expect(reconnectDialog(page)).toBeHidden()
  await expect(addRoadmapDialog(page)).toBeVisible()
})

test("Cancel and Escape close the dialog and drop what was typed; a click outside does nothing (S8)", async ({
  page,
}) => {
  const dialog = await openAddRoadmapDialog(page)
  const title = dialog.getByRole("textbox", { name: "Title" })
  const open = addRoadmapButtons(page)

  await title.fill("Community Nursing roadmap")
  await clickOutside(page, dialog)
  await expect(dialog).toBeVisible()
  await expect(title).toHaveValue("Community Nursing roadmap")

  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(open).toBeFocused()

  await page.keyboard.press("Enter")
  await expect(title).toBeFocused()
  await expect(title).toHaveValue("")
  await expect(dialog.getByRole("textbox", { name: "Short name" })).toHaveValue(
    "",
  )
  await title.fill("District Nursing roadmap")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(open).toBeFocused()
})

test("a short name in use is said at its field, before sending and by the write (S4, S6)", async ({
  page,
  sheets,
}) => {
  const dialog = await openAddRoadmapDialog(page)
  const title = dialog.getByRole("textbox", { name: "Title" })
  const shortName = dialog.getByRole("textbox", { name: "Short name" })
  const add = dialog.getByRole("button", { name: "Add roadmap" })
  const inUse = dialog.getByText(
    "This short name is already in use. Choose another.",
  )
  const reads = sheets.reads.length

  // Product A's address, which the list as loaded already has: nothing is sent.
  await title.fill("Product a")
  await shortName.fill("PRODUCT-A!")
  await add.click()
  await expect(
    dialog.getByText("Use only letters, numbers, spaces and hyphens"),
  ).toBeVisible()
  await shortName.fill("ProductA")
  await add.click()
  await expect(inUse).toBeVisible()
  await expect(shortName).toBeFocused()
  expect(sheets.reads).toHaveLength(reads)

  // A tab no roadmap lists has the name: only the write can tell.
  await shortName.fill("template")
  await add.click()
  await expect(add).toBeEnabled()
  await expect(inUse).toBeVisible()
  await expect(shortName).toBeFocused()
  await expect(shortName).toHaveAccessibleDescription(/already in use/)
  await expect(title).toHaveValue("Product a")
  expect(sheets.reads.length).toBeGreaterThan(reads)
  expect(sheets.writes).toEqual([])
})

test("a spreadsheet with no template says who can put it right, keeping what was typed (S7)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = EXAMPLE_SPREADSHEET.filter(
    ({ title }) => title !== "Template",
  )
  const dialog = await openAddRoadmapDialog(page)
  await dialog
    .getByRole("textbox", { name: "Title" })
    .fill("Community Nursing roadmap")

  await dialog.getByRole("button", { name: "Add roadmap" }).click()

  const alert = dialog.getByRole("alert")
  await expect(alert).toContainText("Couldn't add the roadmap")
  await expect(alert).toContainText(
    "The template for new roadmaps is missing or isn't in the expected format in the spreadsheet. Ask the spreadsheet owner to check it.",
  )
  await expect(dialog.getByRole("textbox", { name: "Title" })).toHaveValue(
    "Community Nursing roadmap",
  )
  await expect(dialog.getByRole("textbox", { name: "Short name" })).toHaveValue(
    "Community Nursing",
  )
  expect(sheets.writes).toEqual([])
})

test.describe("an expired session (S11)", () => {
  test("the dialog stays through the session warning; “Add roadmap” then asks to reconnect and adds what was typed (STY-057)", async ({
    page,
    gis,
  }) => {
    await page.clock.install()
    const dialog = await openAddRoadmapDialog(page)
    const title = dialog.getByRole("textbox", { name: "Title" })
    await title.fill("Community Nursing roadmap")

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
    await expect(dialog).toBeVisible()
    await expect(title).toHaveValue("Community Nursing roadmap")

    await page.clock.fastForward(SESSION_WARNING_MS)
    // Said by the page behind, which only its text can reach.
    await expect(page.getByText("Your session has expired")).toBeVisible()
    const add = dialog.getByRole("button", { name: "Add roadmap" })
    await expect(add).toBeEnabled()
    await add.click()
    // The header's and the page's Reconnect are behind the dialogs, out of reach.
    const reconnect = page.getByRole("button", { name: "Reconnect" })
    await expect(reconnect).toHaveCount(1)
    await expect(reconnectButton(page)).toBeFocused()

    const requests = gis.tokenRequests.length
    await reconnect.click()

    expect(gis.tokenRequests).toHaveLength(requests + 1)
    await expectNewRoadmapPage(page)
  })

  test("a write the session ended under says so, and adds once reconnected", async ({
    page,
    sheets,
  }) => {
    const dialog = await openAddRoadmapDialog(page)
    await dialog
      .getByRole("textbox", { name: "Title" })
      .fill("Community Nursing roadmap")
    const add = dialog.getByRole("button", { name: "Add roadmap" })

    sheets.failWith(401)
    await add.click()

    await expect(dialog.getByRole("alert")).toContainText(
      "Your session expired before it could be added. Try again.",
    )
    await expect(dialog.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Community Nursing roadmap",
    )

    await add.click()
    await reconnectButton(page).click()
    const main = await expectNewRoadmapPage(page)
    await expect(main.getByText(ADDED)).toBeVisible()
    expect(sheets.writes).toHaveLength(1)
  })
})

test("adding a roadmap in Welsh (S10)", async ({ page, sheets }) => {
  sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
  await useLanguage(page, "cy")
  await page.goto("./")
  await connect(page, "Cysylltu â Google")
  await expect(roadmapCards(page)).toHaveCount(3)
  const main = page.getByRole("main")

  const dialog = await openDialog(
    page,
    main.getByRole("button", { name: "Ychwanegu map trywydd" }),
    { title: "Ychwanegu map trywydd", firstField: "Teitl (Saesneg)" },
  )
  await dialog.getByRole("button", { name: "Ychwanegu'r map trywydd" }).click()
  await expect(dialog.getByText("Rhowch deitl")).toBeVisible()
  await expect(dialog.getByText("Rhowch enw byr")).toBeVisible()

  const title = dialog.getByRole("textbox", { name: "Teitl (Saesneg)" })
  await expect(title).toBeFocused()
  // An English title: only its final "roadmap" is dropped.
  await title.fill("Community Nursing roadmap")
  await expect(dialog.getByRole("textbox", { name: "Enw byr" })).toHaveValue(
    "Community Nursing",
  )
  await expect(
    dialog.getByText(
      "Bydd ei gyfeiriad cyhoeddus yn gorffen â “community-nursing”. Does dim modd ei newid yma wedyn.",
    ),
  ).toBeVisible()
  await dialog
    .getByRole("combobox", { name: "Teulu" })
    .selectOption({ label: "Meddyginiaethau a Diagnosteg" })
  await expect(
    dialog.getByText(
      "Mae'n dechrau heb ei gyhoeddi, heb eitemau. Fydd y wefan gyhoeddus ddim yn ei ddangos nes i chi ei gyhoeddi.",
    ),
  ).toBeVisible()
  await dialog.getByRole("button", { name: "Ychwanegu'r map trywydd" }).click()

  await expect(
    main.getByText(
      "Cafodd Community Nursing roadmap ei ychwanegu. Dydy e ddim wedi'i gyhoeddi eto.",
    ),
  ).toBeVisible()
})
