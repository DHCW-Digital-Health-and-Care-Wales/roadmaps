import type { Locator, Page } from "@playwright/test"

import { openAddRoadmapDialog, openEditRoadmapDialog } from "./fixtures/dialogs"
import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import {
  EXAMPLE_INDEX_ROWS,
  EXAMPLE_SPREADSHEET_WITH_LISTS,
  withRoadmapIndex,
} from "./fixtures/fake-sheets"
import {
  holdConnectedNotice,
  type Language,
  useLanguage,
} from "./fixtures/look"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

// The structure of the key screens, held as aria snapshots in
// `structure.spec.ts-snapshots/` (STY-018). Run `pnpm test:e2e --update-snapshots` after
// changing a screen's structure on purpose and review the YAML in the PR
// (tests/e2e/AGENTS.md). Only the screens' own content is snapshot: the footer's version
// differs from build to build, and the shell is held by its own snapshots below.

const [HEADER = []] = EXAMPLE_INDEX_ROWS

const CONNECT: Record<Language, string> = {
  en: "Connect Google",
  cy: "Cysylltu â Google",
}

/** The snapshot file of a screen: English by default, `-cy` for Cymraeg. */
function snapshotName(screen: string, language: Language) {
  return `${screen}${language === "en" ? "" : "-cy"}.aria.yml`
}

/**
 * Holds a screen's structure against its snapshot. Links carry the deployment's base path
 * (`/roadmaps-editor/` in CI, `/` locally), so they are first pointed at the site root:
 * one snapshot serves every build.
 */
async function expectStructure(locator: Locator, name: string) {
  await locator.evaluate((root) => {
    for (const link of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      link.setAttribute("href", `/${link.hash}`)
    }
  })
  await expect(locator).toMatchAriaSnapshot({ name })
}

async function connectTo(page: Page, language: Language) {
  await page.goto("./")
  await connect(page, CONNECT[language])
}

/** Connects and keeps the "Connected" notice, which each such screen shows, on screen. */
async function connectAndHold(page: Page, language: Language) {
  await connectTo(page, language)
  await holdConnectedNotice(page)
}

for (const language of ["en", "cy"] as const) {
  test.describe(`in ${language === "en" ? "English" : "Cymraeg"}`, () => {
    test.beforeEach(async ({ page }) => {
      await useLanguage(page, language)
    })

    test("start page, ready", async ({ page }) => {
      await page.goto("./")
      const main = page.getByRole("main")
      await expect(
        main.getByRole("button", { name: CONNECT[language] }),
      ).toBeEnabled()

      await expectStructure(main, snapshotName("start-ready", language))
    })

    test("start page, after an error", async ({ page, gis }) => {
      gis.respondWith({ type: "access-denied" })
      await connectTo(page, language)
      const main = page.getByRole("main")
      await expect(main.getByRole("alert")).toBeVisible()

      await expectStructure(main, snapshotName("start-error", language))
    })

    test("main page, roadmaps", async ({ page }) => {
      await connectAndHold(page, language)
      await expect(roadmapCards(page)).toHaveCount(3)

      await expectStructure(
        page.getByRole("main"),
        snapshotName("main-roadmaps", language),
      )
    })

    test("main page, no roadmaps", async ({ page, sheets }) => {
      sheets.spreadsheet = withRoadmapIndex([HEADER])
      await connectAndHold(page, language)
      const main = page.getByRole("main")
      await expect(main.getByRole("heading", { level: 2 })).toBeVisible()

      await expectStructure(main, snapshotName("main-empty", language))
    })

    test("main page, a failed load", async ({ page, sheets }) => {
      // 403 is not retried, so no back-off to wait out.
      sheets.failWith(403)
      await connectAndHold(page, language)
      const main = page.getByRole("main")
      await expect(main.getByRole("alert")).toBeVisible()

      await expectStructure(main, snapshotName("main-failed", language))
    })

    test("main page, expired with roadmaps", async ({ page, gis }) => {
      // A short session.
      const expiresIn = 300
      gis.respondWith({ type: "grant", expiresIn })
      await page.clock.install()
      await connectTo(page, language)
      await expect(roadmapCards(page)).toHaveCount(3)
      await page.clock.fastForward(sessionMs(expiresIn))
      const main = page.getByRole("main")
      await expect(main.getByRole("alert")).toBeVisible()

      await expectStructure(main, snapshotName("main-expired", language))
    })
  })
}

test("a roadmap's detail page", async ({ page }) => {
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await holdConnectedNotice(page)
  await expect(
    page.getByRole("heading", {
      level: 3,
      name: "Example card with every column",
    }),
  ).toBeVisible()

  await expectStructure(page.getByRole("main"), "detail.aria.yml")
})

test.describe("editing a roadmap (STY-025)", () => {
  const ITEM = "Example card with every column"

  /** Opens Product A with its "Connected" notice dismissed, then edits the item's title. */
  async function openWithAChange(page: Page) {
    await page.goto("./#/roadmaps/producta")
    await connect(page)
    const main = page.getByRole("main")
    await expect(
      main.getByRole("heading", { level: 3, name: ITEM }),
    ).toBeVisible()
    await main
      .getByRole("note")
      .getByRole("button", { name: "Dismiss message" })
      .click()
    await main.getByRole("button", { name: `Edit ${ITEM}` }).click()
    const form = main.getByRole("form", { name: ITEM })
    await form.getByRole("textbox", { name: "Title" }).fill("A clearer card")
    await form.getByRole("button", { name: "Done" }).click()
    return main
  }

  test("the forms, a changed card and the publish bar", async ({ page }) => {
    const main = await openWithAChange(page)
    const card = main
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "A clearer card" }) })
    await expectStructure(card, "edit-item-changed.aria.yml")
    await expectStructure(
      main
        .getByRole("status")
        .filter({ hasText: "1 unpublished change" })
        .locator(".."),
      "edit-publish-bar.aria.yml",
    )

    await main.getByRole("button", { name: "Edit A clearer card" }).click()
    const itemForm = main.getByRole("form", { name: "A clearer card" })
    await itemForm.getByRole("textbox", { name: "Title" }).fill("")
    await itemForm.getByRole("button", { name: "Done" }).click()
    await expect(itemForm.getByText("Enter a title")).toBeVisible()
    await expectStructure(itemForm, "edit-item-form-error.aria.yml")
    // Its Organisations field, shut in the form above, opened (STY-038).
    await itemForm.getByRole("button", { name: "Change organisations" }).click()
    await expect(
      itemForm.getByRole("checkbox", { name: "All Wales (National)" }),
    ).toBeFocused()
    await expectStructure(itemForm, "edit-item-form-organisations.aria.yml")
    await itemForm.getByRole("button", { name: "Cancel" }).click()

    // An item's Tags field opened, one tag removed (STY-037).
    await main.getByRole("button", { name: "Edit Longer-term idea" }).click()
    const tagsForm = main.getByRole("form", { name: "Longer-term idea" })
    await tagsForm.getByRole("button", { name: "Change tags" }).click()
    await tagsForm.getByRole("button", { name: "Remove Service Y" }).click()
    await expect(
      tagsForm.getByRole("button", { name: "Remove Service Z" }),
    ).toBeFocused()
    await expectStructure(tagsForm, "edit-item-form-tags.aria.yml")
    await tagsForm.getByRole("button", { name: "Cancel" }).click()

    // An item's Details field opened, one detail nested and then removed (STY-039).
    const detailed = "Earlier delivery this year"
    await main.getByRole("button", { name: `Edit ${detailed}` }).click()
    const detailsForm = main.getByRole("form", { name: detailed })
    await detailsForm.getByRole("button", { name: "Change details" }).click()
    await detailsForm.getByRole("textbox").last().click()
    await detailsForm
      .getByRole("button", { name: "Move in Another thing it included" })
      .click()
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await page.keyboard.type("A third")
    await detailsForm.getByRole("button", { name: "Remove A third" }).click()
    await expect(
      detailsForm.getByRole("button", { name: "Undo removing A third" }),
    ).toBeVisible()
    await expectStructure(detailsForm, "edit-item-form-details.aria.yml")
    await detailsForm.getByRole("button", { name: "Cancel" }).click()

    await expectStructure(
      await openEditRoadmapDialog(page),
      "edit-roadmap-dialog.aria.yml",
    )
  })

  test("an item's Move menu (STY-031)", async ({ page }) => {
    const main = await openWithAChange(page)
    await main.getByRole("button", { name: "Move A clearer card" }).click()

    const menu = page.getByRole("menu")
    await expect(menu).toBeVisible()
    await expectStructure(menu, "edit-move-menu.aria.yml")
  })

  test("the publish dialog, then the published notice", async ({ page }) => {
    const main = await openWithAChange(page)
    await main.getByRole("button", { name: "Publish changes" }).click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    await expectStructure(dialog, "edit-publish-dialog.aria.yml")

    await dialog.getByRole("button", { name: "Publish changes" }).click()
    const notice = main
      .getByRole("status")
      .filter({ hasText: "Changes published" })
    await expect(notice).toBeVisible()
    // Hovered, so it does not clear itself before the snapshot.
    await notice.hover()
    await expectStructure(notice, "edit-published.aria.yml")
  })

  test("a failed publish", async ({ page, sheets }) => {
    const main = await openWithAChange(page)
    sheets.failWith(403)
    await main.getByRole("button", { name: "Publish changes" }).click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Publish changes" })
      .click()
    const alert = main.getByRole("alert")
    await expect(alert).toBeVisible()

    await expectStructure(alert, "edit-publish-failed.aria.yml")
  })

  test("a co-lead's change to review, and an item that couldn't be kept (STY-026)", async ({
    page,
    sheets,
  }) => {
    const main = await openWithAChange(page)
    const editing = await openEditRoadmapDialog(page)
    await editing.getByRole("textbox", { name: "Vision" }).fill("My vision.")
    await editing.getByRole("button", { name: "Done" }).click()
    sheets.coLead("Roadmaps", "ProductA", "Vision", "Their vision.")
    // The edited item has no ID yet, so a new title leaves it unmatched.
    sheets.coLead("ProductA", ITEM, "Title", "Their card")
    await main.getByRole("button", { name: "Publish changes" }).click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Publish changes" })
      .click()
    const review = main.getByRole("alert")
    await expect(review).toBeFocused()

    await expectStructure(review, "edit-conflict-review.aria.yml")
  })

  test("Disconnect's question, then the start page's waiting note", async ({
    page,
  }) => {
    const main = await openWithAChange(page)
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Disconnect" })
      .click()
    const question = page.getByRole("alertdialog")
    await expect(question).toBeVisible()
    await expectStructure(question, "edit-disconnect-question.aria.yml")

    await question
      .getByRole("button", { name: "Keep changes and disconnect" })
      .click()
    await main.getByRole("link", { name: "Back to roadmaps" }).click()
    await expect(
      main.getByText("Changes to 1 roadmap are waiting"),
    ).toBeVisible()
    await expectStructure(main, "edit-start-waiting.aria.yml")
  })
})

test("the Add a roadmap dialog, refused (STY-041)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
  const dialog = await openAddRoadmapDialog(page, { offersLists: true })
  await dialog.getByRole("textbox", { name: "Short name" }).fill("ProductA")
  await dialog.getByRole("button", { name: "Add roadmap" }).click()
  await expect(dialog.getByText("Enter a title")).toBeVisible()

  await expectStructure(dialog, "add-roadmap-dialog.aria.yml")
})

test("the not-found page", async ({ page }) => {
  await page.goto("./#/nowhere")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page not found",
  )

  await expectStructure(page.getByRole("main"), "not-found.aria.yml")
})

test("the language menu, open", async ({ page }) => {
  await page.goto("./")
  await page.getByRole("button", { name: "Language English" }).click()
  const menu = page.getByRole("menu")
  await expect(menu).toBeVisible()

  await expectStructure(menu, "language-menu.aria.yml")
})

test("the session warning", async ({ page, gis }) => {
  // A short session: 30 s into its warning the countdown reads "1 minute and N seconds"
  // however long the test takes.
  const expiresIn = 600
  gis.respondWith({ type: "grant", expiresIn })
  await page.clock.install()
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)
  await page.clock.fastForward(
    sessionMs(expiresIn) - SESSION_WARNING_MS + 30_000,
  )
  const warning = page.getByRole("alertdialog")
  await expect(warning).toBeVisible()

  await expectStructure(warning, "session-warning.aria.yml")
})

test.describe("the shell", () => {
  test("signed out and connected, in English and Cymraeg", async ({ page }) => {
    await page.goto("./")
    const header = page.getByRole("banner")
    await expect(header.getByRole("status")).toHaveText("Not connected")
    await expectStructure(header, "header.aria.yml")
    // The phase banner is no landmark, so it has no role to find it by.
    await expectStructure(
      page.locator("[data-slot=phase-banner]"),
      "phase-banner.aria.yml",
    )

    await connect(page)
    await expect(roadmapCards(page)).toHaveCount(3)
    await expectStructure(header, "header-connected.aria.yml")

    await page.getByRole("button", { name: "Language English" }).click()
    await page.getByRole("menuitemradio", { name: "Cymraeg" }).click()
    await expect(header.getByRole("status")).toHaveText(
      "Wedi cysylltu â Google",
    )
    await expectStructure(header, "header-connected-cy.aria.yml")
  })
})
