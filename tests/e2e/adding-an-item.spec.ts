import type { Locator, Page } from "@playwright/test"

import {
  addItem,
  addItemButtons,
  clickOutside,
  editItemButton,
  openAddItemDialog,
  openEditItemDialog,
} from "./fixtures/dialogs"
import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import { withTabItems } from "./fixtures/fake-sheets"
import { useLanguage } from "./fixtures/look"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead adds an item on a roadmap's page (STY-046), against the fake Sheets
 * API: "Add an item" opens the item dialog, empty; "Add item" keeps the item pending,
 * on a card tagged "New", and nothing is written until the roadmap is published or
 * saved. The rules of each field are held in `editing.spec.ts`, through the same form.
 * The journey runs once, at the default size and theme (EPC-011's delivery notes): the
 * accessibility spec and the focus tour open the dialog in both themes. The dialog that
 * asks before a publish lists each new item, marked as new (STY-047).
 */

const CLINIC = "Choose a clinic closer to home"
const CHECK_IN = "Check in from your phone"

const PLACEMENT_HEADINGS = [
  "Recently delivered",
  "Now",
  "Next",
  "Later",
  "Delivered this year",
  "Not doing",
]

async function openRoadmap(
  page: Page,
  roadmap: "producta" | "productc",
  connectName?: string,
) {
  await page.goto(`./#/roadmaps/${roadmap}`)
  await connect(page, connectName)
  // The items are read once a heading follows About's.
  await expect(
    page.getByRole("main").getByRole("heading", { level: 2 }).nth(1),
  ).toBeVisible()
}

/** The item titles in the list under a horizon or section heading. */
function titlesUnder(page: Page, heading: string): Locator {
  return page
    .getByRole("main")
    .getByRole("list", { name: heading, exact: true })
    .getByRole("heading", { level: 3 })
}

/** The card of the item with this title. */
function itemCard(page: Page, title: string): Locator {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

/** The "New" tag on a card, which is named for its item. */
function newTag(card: Locator, title: string, word = "New"): Locator {
  return card.getByText(`${word} ${title}`, { exact: true })
}

/**
 * The lines under "What changes" in the open dialog that asks before a publish: each a
 * name, then what changes of it (STY-047).
 */
function listedChanges(page: Page): Locator {
  return page.getByRole("alertdialog").getByRole("listitem")
}

/** The cells of the rows a publish appended, by the write's last request. */
function appendedRows(write: unknown): string[][] {
  const { requests } = write as {
    requests: {
      appendCells?: {
        rows: { values: { userEnteredValue?: { stringValue?: string } }[] }[]
      }
    }[]
  }
  return requests.flatMap(({ appendCells }) =>
    (appendCells?.rows ?? []).map(({ values }) =>
      values.map(({ userEnteredValue }) => userEnteredValue?.stringValue ?? ""),
    ),
  )
}

test("a Product Lead adds an item in the item dialog, pending until published (S1, S2, S3, S5, S7)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "producta")
  const main = page.getByRole("main")
  await expect(addItemButtons(page)).toHaveCount(1)

  const dialog = await openAddItemDialog(page)
  // Modal: nothing behind it can be reached.
  await expect(page.getByRole("main")).toHaveCount(0)

  // Empty, with no horizon chosen and Tags, Organisations and Details shut.
  for (const name of ["Title", "Description", "Expected outcome", "Phase"]) {
    await expect(dialog.getByRole("textbox", { name })).toHaveValue("")
  }
  const placement = dialog.getByRole("combobox", { name: "Horizon or section" })
  await expect(placement.locator("option:checked")).toHaveText(
    "Choose a horizon or section",
  )
  for (const name of ["Add tags", "Add organisations", "Add details"]) {
    await expect(dialog.getByRole("button", { name })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  }
  await expect(
    dialog.getByText(
      "It stays unpublished until you choose “Publish changes”.",
    ),
  ).toBeVisible()

  // A blank title and no horizon add nothing, each said at its field.
  const title = dialog.getByRole("textbox", { name: "Title" })
  await dialog.getByRole("button", { name: "Add item", exact: true }).click()
  await expect(title).toHaveAccessibleDescription("Error: Enter a title")
  await expect(placement).toHaveAccessibleDescription(
    "Error: Choose a horizon or section",
  )
  await expect(title).toBeFocused()

  await title.fill(CLINIC)
  await dialog
    .getByRole("textbox", { name: "Expected outcome" })
    .fill("Shorter journeys for patients.")
  await placement.selectOption({ label: "Next" })
  await dialog.getByRole("button", { name: "Add item", exact: true }).click()

  // Pending: last in its horizon, tagged, with Edit, Move and Remove, not written.
  await expect(dialog).toBeHidden()
  await expect(titlesUnder(page, "Next")).toHaveText([
    "Card being explored",
    CLINIC,
  ])
  const card = itemCard(page, CLINIC)
  await expect(newTag(card, CLINIC)).toBeVisible()
  await expect(card.getByText("Shorter journeys for patients.")).toBeVisible()
  for (const name of ["Move", "Remove"]) {
    await expect(
      card.getByRole("button", { name: `${name} ${CLINIC}`, exact: true }),
    ).toBeVisible()
  }
  await expect(editItemButton(page, CLINIC)).toBeFocused()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  expect(sheets.writes).toEqual([])

  // Refresh keeps it; the roadmap list marks the roadmap.
  await main.getByRole("button", { name: "Refresh" }).click()
  await expect(newTag(card, CLINIC)).toBeVisible()
  await main.getByRole("link", { name: "Back to roadmaps" }).click()
  await expect(
    main.getByRole("link", { name: "Product A roadmap" }),
  ).toHaveAccessibleDescription(/Unpublished changes/)
  await main.getByRole("link", { name: "Product A roadmap" }).click()
  await expect(newTag(card, CLINIC)).toBeVisible()

  // Publishing writes it in the one write, as a row after the roadmap's last.
  await main.getByRole("button", { name: "Publish changes" }).click()
  await expect(listedChanges(page)).toHaveText([`${CLINIC}New item`])
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish changes" })
    .click()
  await expect(main.getByText(/^Changes published\./)).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
  const [row = []] = appendedRows(sheets.writes[0])
  expect(row).toContain(CLINIC)
  expect(row).toContain("Next")
  expect(row).toContain("Shorter journeys for patients.")

  // Its card stays last in its horizon, no longer new.
  await expect(titlesUnder(page, "Next")).toHaveText([
    "Card being explored",
    CLINIC,
  ])
  await expect(newTag(card, CLINIC)).toHaveCount(0)
  await expect(
    card.getByRole("button", { name: `Remove ${CLINIC}` }),
  ).toHaveCount(0)
  await expect(main.getByText(/unpublished change/)).toHaveCount(0)
})

test("a published new item stays, pending and held, while the roadmap can't be read back (DEF-009 S1, S3)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "producta")
  const main = page.getByRole("main")
  await addItem(page, CLINIC, "Next")
  const readsBack = sheets.failReadsAfterNextWrite(503)

  await main.getByRole("button", { name: "Publish changes" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish changes" })
    .click()

  // The dialog stays until the failing reads have given up.
  await expect(main.getByText(/^Changes published\./)).toBeVisible({
    timeout: 15_000,
  })
  await expect(
    main.getByText("Couldn't refresh this roadmap's items"),
  ).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
  await expect(titlesUnder(page, "Next")).toHaveText([
    "Card being explored",
    CLINIC,
  ])
  const card = itemCard(page, CLINIC)
  await expect(newTag(card, CLINIC)).toBeVisible()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  for (const name of ["Edit", "Move", "Remove"]) {
    await expect(
      card.getByRole("button", { name: `${name} ${CLINIC}`, exact: true }),
    ).toHaveAttribute("aria-disabled", "true")
  }

  // A read that holds it ends it: published, no longer pending.
  readsBack()
  await main.getByRole("button", { name: "Refresh" }).click()
  await expect(newTag(card, CLINIC)).toHaveCount(0)
  await expect(main.getByText(/unpublished change/)).toHaveCount(0)
  await expect(titlesUnder(page, "Next")).toHaveText([
    "Card being explored",
    CLINIC,
  ])
  expect(sheets.writes).toHaveLength(1)
})

test("the publish dialog lists a new item beside an edit; a co-lead's conflict publishes nothing and keeps it (STY-047 S1)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "producta")
  const main = page.getByRole("main")
  const confirmPublish = async () => {
    await main.getByRole("button", { name: "Publish changes" }).click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Publish changes" })
      .click()
  }
  // Only an item with an ID can conflict: a first publish gives every item its ID.
  await addItem(page, CHECK_IN, "Now")
  await confirmPublish()
  await expect(main.getByText(/^Changes published\./)).toBeVisible()
  expect(sheets.writes).toHaveLength(1)

  const EDITED = "Card being explored"
  await addItem(page, CLINIC, "Next")
  const editing = await openEditItemDialog(page, EDITED)
  await editing.getByRole("textbox", { name: "Description" }).fill("Mine.")
  await editing.getByRole("button", { name: "Done" }).click()
  await expect(editing).toBeHidden()
  sheets.coLead("ProductA", EDITED, "Description", "Theirs.")

  // The edit as it is always listed, then the new item, marked as new.
  await main.getByRole("button", { name: "Publish changes" }).click()
  const dialog = page.getByRole("alertdialog", {
    name: "Publish these changes?",
  })
  await expect(dialog.getByRole("heading", { level: 3 })).toHaveText(
    "What changes",
  )
  await expect(listedChanges(page)).toHaveText([
    `${EDITED}Description`,
    `${CLINIC}New item`,
  ])
  await dialog.getByRole("button", { name: "Publish changes" }).click()

  // The conflict publishes nothing; its review names the edit alone, and the new item
  // stays pending.
  const review = main.getByRole("alert")
  await expect(review).toContainText("Someone else has changed text you edited")
  await expect(review).toContainText("Nothing was published.")
  await expect(review.getByRole("listitem")).toHaveCount(1)
  await expect(review.getByRole("listitem")).toContainText(
    `${EDITED}: Description`,
  )
  await expect(review).not.toContainText(CLINIC)
  expect(sheets.writes).toHaveLength(1)
  await expect(newTag(itemCard(page, CLINIC), CLINIC)).toBeVisible()
  await expect(main.getByText("2 unpublished changes")).toBeVisible()

  // Once the edit is decided, the new item is published with the rest.
  await review.getByRole("button", { name: /^Use theirs/ }).click()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  await confirmPublish()
  await expect(main.getByText(/^Changes published\./)).toBeVisible()
  expect(sheets.writes).toHaveLength(2)
  const [row = []] = appendedRows(sheets.writes[1])
  expect(row).toContain(CLINIC)
  await expect(newTag(itemCard(page, CLINIC), CLINIC)).toHaveCount(0)
})

test("“Add and start another” keeps the dialog open; a new item is edited, moved and removed before publishing (S4, S6)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "producta")
  const main = page.getByRole("main")
  const dialog = await openAddItemDialog(page)
  const title = dialog.getByRole("textbox", { name: "Title" })
  const placement = dialog.getByRole("combobox", { name: "Horizon or section" })

  await title.fill(CLINIC)
  await placement.selectOption({ label: "Next" })
  await dialog.getByRole("button", { name: "Add and start another" }).click()

  // Open and empty, the horizon still chosen, focus in the title, saying what was added.
  await expect(dialog.getByRole("status")).toHaveText(`“${CLINIC}” was added.`)
  await expect(title).toHaveValue("")
  await expect(title).toBeFocused()
  await expect(placement.locator("option:checked")).toHaveText("Next")

  // A double click adds one item: the dialog is closing by the second.
  await title.fill(CHECK_IN)
  await dialog.getByRole("button", { name: "Add item", exact: true }).dblclick()
  await expect(dialog).toBeHidden()
  await expect(editItemButton(page, CHECK_IN)).toBeFocused()
  await expect(titlesUnder(page, "Next")).toHaveText([
    "Card being explored",
    CLINIC,
    CHECK_IN,
  ])
  await expect(main.getByText("2 unpublished changes")).toBeVisible()

  // Edit opens the editing form; what it changes is part of the new item.
  const editing = await openEditItemDialog(page, CLINIC)
  await expect(
    editing.getByRole("button", { name: "Add and start another" }),
  ).toHaveCount(0)
  await editing.getByRole("textbox", { name: "Phase" }).fill("Discovery")
  await editing.getByRole("button", { name: "Done" }).click()
  await expect(editing).toBeHidden()
  const card = itemCard(page, CLINIC)
  await expect(card.getByText("Discovery")).toBeVisible()
  await expect(newTag(card, CLINIC)).toBeVisible()
  await expect(card.getByText("Changed")).toHaveCount(0)
  await expect(card.getByRole("button", { name: /^Undo changes/ })).toHaveCount(
    0,
  )

  // Move puts it last in its new horizon, still one change.
  await card
    .getByRole("button", { name: `Move ${CLINIC}`, exact: true })
    .click()
  await page.getByRole("menuitem", { name: "Later" }).click()
  await expect(titlesUnder(page, "Later")).toHaveText([
    "Discovery card",
    "Longer-term idea",
    CLINIC,
  ])
  await expect(main.getByText("2 unpublished changes")).toBeVisible()

  // Remove drops it without asking; focus goes to "Add an item".
  await main.getByRole("button", { name: `Remove ${CLINIC}` }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(
    main.getByRole("heading", { level: 3, name: CLINIC }),
  ).toHaveCount(0)
  await expect(addItemButtons(page)).toBeFocused()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  // No item the roadmap already holds has Remove.
  await expect(main.getByRole("button", { name: /^Remove / })).toHaveCount(1)
  expect(sheets.writes).toEqual([])
})

test("an empty roadmap's panel holds “Add an item”; its first item brings the six headings, and counts when publishing (S8, S10)", async ({
  page,
  sheets,
}) => {
  // Product C is not published.
  sheets.spreadsheet = withTabItems("ProductC")
  await openRoadmap(page, "productc")
  const main = page.getByRole("main")
  const panel = main.locator("[data-slot=empty]")
  await expect(
    panel.getByText("Add what the product is doing now, next and later."),
  ).toBeVisible()

  // From the panel's own button, where focus goes back on Cancel.
  const inPanel = panel.getByRole("button", { name: "Add an item" })
  const dialog = await openAddItemDialog(page, { opener: inPanel })
  await expect(
    dialog.getByText("It isn't saved until you choose “Save changes”."),
  ).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(inPanel).toBeFocused()

  // The first item takes the panel's place, and its button with it: closing the
  // dialog then puts focus on the page's own "Add an item".
  await page.keyboard.press("Enter")
  await dialog.getByRole("textbox", { name: "Title" }).fill(CLINIC)
  await dialog
    .getByRole("combobox", { name: "Horizon or section" })
    .selectOption({ label: "Now" })
  await dialog.getByRole("button", { name: "Add and start another" }).click()
  await expect(dialog.getByRole("status")).not.toBeEmpty()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(addItemButtons(page)).toBeFocused()

  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "About this roadmap",
    ...PLACEMENT_HEADINGS,
  ])
  await expect(titlesUnder(page, "Now")).toHaveText([CLINIC])
  await expect(addItemButtons(page)).toHaveCount(1)
  await expect(main.getByText("1 change to save")).toBeVisible()

  // "Publish roadmap" takes the new item with it, and the public would see it.
  await main.getByRole("button", { name: "Publish roadmap" }).click()
  const question = page.getByRole("alertdialog")
  await expect(question).toHaveAccessibleDescription(
    "It shows on the public site after its next nightly update. Your unsaved change goes public with it.",
  )
  await expect(listedChanges(page)).toHaveText([`${CLINIC}New item`])
  await question.getByRole("button", { name: "Save and publish" }).click()
  await expect(
    main.getByText(/^Changes saved and Product C roadmap published\./),
  ).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
  const [row = []] = appendedRows(sheets.writes[0])
  expect(row).toContain(CLINIC)
  await expect(newTag(itemCard(page, CLINIC), CLINIC)).toHaveCount(0)
})

test("Cancel and Escape close the dialog and drop what was typed; a click outside does nothing (S9)", async ({
  page,
}) => {
  await openRoadmap(page, "producta")
  const main = page.getByRole("main")

  const dialog = await openAddItemDialog(page)
  const title = dialog.getByRole("textbox", { name: "Title" })
  await title.fill(CLINIC)
  await clickOutside(page, dialog)
  await expect(dialog).toBeVisible()
  await expect(title).toHaveValue(CLINIC)

  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(addItemButtons(page)).toBeFocused()

  await page.keyboard.press("Enter")
  await expect(title).toBeFocused()
  await expect(title).toHaveValue("")
  await title.fill(CHECK_IN)
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(addItemButtons(page)).toBeFocused()

  await expect(main.getByText(/unpublished change/)).toHaveCount(0)
  await expect(
    main.getByRole("heading", { level: 3, name: CLINIC }),
  ).toHaveCount(0)
})

test("the dialog stays through the session's end, and “Add item” still adds (S9)", async ({
  page,
}) => {
  await page.clock.install()
  await openRoadmap(page, "producta")
  const dialog = await openAddItemDialog(page)
  const title = dialog.getByRole("textbox", { name: "Title" })
  await title.fill(CLINIC)

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

  await page.clock.fastForward(SESSION_WARNING_MS)
  // Said by the page behind, which only its text can reach.
  await expect(page.getByText("Your session has expired")).toBeVisible()
  await expect(title).toHaveValue(CLINIC)
  await dialog
    .getByRole("combobox", { name: "Horizon or section" })
    .selectOption({ label: "Later" })
  await dialog.getByRole("button", { name: "Add item", exact: true }).click()

  await expect(dialog).toBeHidden()
  const main = page.getByRole("main")
  await expect(newTag(itemCard(page, CLINIC), CLINIC)).toBeVisible()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  // Nothing more can be added, or published, until Sam reconnects.
  await expect(addItemButtons(page)).toHaveAttribute("aria-disabled", "true")
  await expect(
    main.getByRole("button", { name: "Publish changes" }),
  ).toHaveAttribute("aria-disabled", "true")
})

test("adding an item in Welsh (S9, STY-047 S2)", async ({ page }) => {
  await useLanguage(page, "cy")
  await openRoadmap(page, "producta", "Cysylltu â Google")
  const main = page.getByRole("main")

  const dialog = await openAddItemDialog(page, { language: "cy" })
  const title = dialog.getByRole("textbox", { name: "Teitl (Saesneg)" })
  const placement = dialog.getByRole("combobox", { name: "Gorwel neu adran" })
  await expect(
    dialog.getByText(
      "Bydd yn aros heb ei chyhoeddi nes i chi ddewis “Cyhoeddi'r newidiadau”.",
    ),
  ).toBeVisible()
  await dialog
    .getByRole("button", { name: "Ychwanegu a dechrau un arall" })
    .click()
  await expect(title).toHaveAccessibleDescription("Gwall: Rhowch deitl")
  await expect(placement).toHaveAccessibleDescription(
    "Gwall: Dewiswch orwel neu adran",
  )

  await title.fill(CLINIC)
  await placement.selectOption({ label: "Nesaf" })
  await dialog
    .getByRole("button", { name: "Ychwanegu a dechrau un arall" })
    .click()
  await expect(dialog.getByRole("status")).toHaveText(
    `Ychwanegwyd “${CLINIC}”.`,
  )
  await dialog.getByRole("button", { name: "Canslo" }).click()
  await expect(dialog).toBeHidden()

  const card = itemCard(page, CLINIC)
  await expect(newTag(card, CLINIC, "Newydd")).toBeVisible()
  await expect(
    card.getByRole("button", { name: `Tynnu ${CLINIC}` }),
  ).toBeVisible()
  await expect(main.getByText("1 newid heb ei gyhoeddi")).toBeVisible()

  // The publish dialog marks it as new, in Welsh (STY-047 S2).
  await main.getByRole("button", { name: "Cyhoeddi'r newidiadau" }).click()
  await expect(
    page.getByRole("alertdialog").getByRole("heading", { level: 3 }),
  ).toHaveText("Beth sy'n newid")
  await expect(listedChanges(page)).toHaveText([`${CLINIC}Eitem newydd`])
})
