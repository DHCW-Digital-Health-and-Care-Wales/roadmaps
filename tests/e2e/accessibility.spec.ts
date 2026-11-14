import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

import { openAddRoadmapDialog } from "./fixtures/dialogs"
import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import {
  EXAMPLE_INDEX_ROWS,
  EXAMPLE_SPREADSHEET_WITH_LISTS,
  roadmapRow,
  withRoadmapIndex,
  withTabItems,
} from "./fixtures/fake-sheets"
import { useLanguage, useTheme } from "./fixtures/look"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

const [header = []] = EXAMPLE_INDEX_ROWS

/** WCAG 2.2 A and AA rules. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

type Theme = "light" | "dark"

async function expectNoAxeViolations(
  page: Page,
  theme: Theme,
  { only }: { only?: string } = {},
) {
  const html = page.locator("html")
  await (theme === "dark"
    ? expect(html).toHaveClass(/\bdark\b/)
    : expect(html).not.toHaveClass(/\bdark\b/))
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS)
  if (only) builder = builder.include(only)
  const { violations } = await builder.analyze()
  const summary = violations.map(({ id, nodes }) => ({
    id,
    targets: nodes.map(({ target }) => target.join(" ")),
  }))
  expect(summary).toEqual([])
}

// Still, so contrast is checked on settled colours rather than mid-animation.
test.use({ reducedMotion: "reduce" })

for (const theme of ["light", "dark"] satisfies Theme[]) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await useTheme(page, theme)
    })

    test("landing page", async ({ page }) => {
      await page.goto("./")
      await expect(page.getByRole("status")).toHaveText("Not connected")
      await expectNoAxeViolations(page, theme)
    })

    test("roadmaps", async ({ page }) => {
      await page.goto("./")
      await connect(page)
      await expect(roadmapCards(page)).toHaveCount(3)
      await expectNoAxeViolations(page, theme)
    })

    test("roadmaps with very light, very dark and no colours (S6)", async ({
      page,
      sheets,
    }) => {
      const row = (sheet: string, colour: string) =>
        roadmapRow({
          Sheet: sheet,
          Enabled: "Yes",
          Title: `Roadmap ${sheet}`,
          Category: "Urgent & Emergency Care",
          Family: "Colours",
          "Status label": "Beta",
          "Last updated": "2026-10-01",
          Colour: colour,
          "Service description": "What it does and who it helps.",
          "Product Lead": "Alex Jones",
        })
      sheets.spreadsheet = withRoadmapIndex([
        header,
        row("light", "#ffffff"),
        row("dark", "#000000"),
        row("none", ""),
      ])
      await page.goto("./")
      await connect(page)
      await expect(roadmapCards(page)).toHaveCount(3)
      await expectNoAxeViolations(page, theme)
    })

    test("roadmap detail", async ({ page }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      // The title comes from the list before the items arrive: wait for an item.
      await expect(
        page.getByRole("heading", {
          level: 3,
          name: "Example card with every column",
        }),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    for (const [language, connectName, itemTitle] of [
      ["en", "Connect Google", "Example card with every column"],
      ["cy", "Cysylltu â Google", "Cerdyn enghreifftiol gyda phob colofn"],
    ] as const) {
      test(`a roadmap's page on a phone in ${language} (STY-021 S11)`, async ({
        page,
      }) => {
        await useLanguage(page, language)
        await page.setViewportSize({ width: 375, height: 800 })
        await page.goto("./#/roadmaps/producta")
        await connect(page, connectName)
        await expect(
          page.getByRole("heading", { level: 3, name: itemTitle }),
        ).toBeVisible()

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        expect(overflow).toBe(0)
        const levels = await page
          .getByRole("main")
          .getByRole("heading")
          .evaluateAll((headings) =>
            headings.map((heading) => Number(heading.tagName.slice(1))),
          )
        expect(levels[0]).toBe(1)
        // Each heading is at most one level below the one before it.
        expect(
          levels.filter((level, index) => level - (levels[index - 1] ?? 0) > 1),
        ).toEqual([])
        expect(new Set(levels)).toEqual(new Set([1, 2, 3]))
        // The page's own content: the narrow header's home link fails 2.5.3 in English
        // on every page (DEF-002).
        await expectNoAxeViolations(page, theme, { only: "main" })
      })
    }

    test("editing a roadmap, then publishing it (STY-025)", async ({
      page,
    }) => {
      const item = "Example card with every column"
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      await expect(
        page.getByRole("heading", { level: 3, name: item }),
      ).toBeVisible()
      const main = page.getByRole("main")

      // A form open with a field in error.
      await main.getByRole("button", { name: `Edit ${item}` }).click()
      const form = main.getByRole("form", { name: item })
      await form.getByRole("textbox", { name: "Title" }).fill("")
      await form.getByRole("button", { name: "Done" }).click()
      await expect(form.getByText("Enter a title")).toBeVisible()
      await expectNoAxeViolations(page, theme)

      // A pending change: the marker, the publish bar and the roadmap's form.
      await form.getByRole("textbox", { name: "Title" }).fill("A clearer card")
      await form.getByRole("button", { name: "Done" }).click()
      await main
        .getByRole("button", { name: "Edit About this roadmap" })
        .click()
      await expect(main.getByRole("form")).toBeVisible()
      await expectNoAxeViolations(page, theme)
      await main.getByRole("form").getByRole("button", { name: "Done" }).click()

      await main.getByRole("button", { name: "Publish changes" }).click()
      const dialog = page.getByRole("alertdialog")
      await expect(dialog).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await dialog.getByRole("button", { name: "Publish changes" }).click()
      await expect(main.getByText(/Changes published/)).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("publishing a roadmap: its dialog, a refusal, then the published notice (STY-035)", async ({
      page,
      sheets,
    }) => {
      const rows = EXAMPLE_INDEX_ROWS.map((row) => [...row])
      const productC = rows.find((row) => row[0] === "ProductC")
      if (productC) productC[header.indexOf("Colour")] = "#9a8"
      sheets.spreadsheet = withRoadmapIndex(rows)
      await page.goto("./#/roadmaps/productc")
      await connect(page)
      const main = page.getByRole("main")

      await main.getByRole("button", { name: "Publish roadmap" }).click()
      const dialog = page.getByRole("alertdialog")
      await expect(dialog).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await dialog.getByRole("button", { name: "Publish roadmap" }).click()
      await expect(main.getByRole("alert")).toContainText("3 digits")
      await expectNoAxeViolations(page, theme)

      if (productC) productC[header.indexOf("Colour")] = "#99aa88"
      sheets.spreadsheet = withRoadmapIndex(rows)
      await main.getByRole("button", { name: "Publish roadmap" }).click()
      await dialog.getByRole("button", { name: "Publish roadmap" }).click()
      await expect(main.getByText(/is published\./)).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("an empty roadmap on a phone in Cymraeg, then its publish dialog saying so (STY-042)", async ({
      page,
      sheets,
    }) => {
      await useLanguage(page, "cy")
      await page.setViewportSize({ width: 375, height: 800 })
      sheets.spreadsheet = withTabItems("ProductC")
      await page.goto("./#/roadmaps/productc")
      await connect(page, "Cysylltu â Google")
      const main = page.getByRole("main")
      await expect(
        main.getByRole("heading", { name: "Dim eitemau eto" }),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme, { only: "main" })

      await main.getByRole("button", { name: "Cyhoeddi'r map trywydd" }).click()
      const dialog = page.getByRole("alertdialog")
      await expect(dialog).toContainText(
        "Bydd y wefan gyhoeddus yn ei ddangos heb eitemau.",
      )
      await expectNoAxeViolations(page, theme, { only: "[role=alertdialog]" })
    })

    test("an item's Move menu, then the moved item and an unplaced item's form (STY-031)", async ({
      page,
      sheets,
    }) => {
      sheets.coLead("ProductA", "Minimal card", "Horizon", "Soon")
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await main.getByRole("button", { name: "Move Discovery card" }).click()
      await expect(page.getByRole("menu")).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await page.getByRole("menuitem", { name: "Recently delivered" }).click()
      await expect(page.getByRole("menu")).toHaveCount(0)
      await expectNoAxeViolations(page, theme)

      await main.getByRole("button", { name: "Edit Minimal card" }).click()
      await expect(
        main.getByRole("combobox", { name: "Horizon or section" }),
      ).toHaveValue("")
      await expectNoAxeViolations(page, theme)
    })

    test("an item's organisations, shut then open with an unknown code named, then the changed card (STY-034, STY-038)", async ({
      page,
      sheets,
    }) => {
      sheets.coLead(
        "ProductA",
        "Minimal card",
        "Organisations",
        "CAVUHB, CAVHB",
      )
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await main.getByRole("button", { name: "Edit Minimal card" }).click()
      // The field starts shut, the unknown code named (STY-038 S5, S7).
      const form = main.getByRole("form", { name: "Minimal card" })
      await expect(form.getByText(/CAVHB isn't recognised/)).toBeVisible()
      await expect(form.getByText("Cardiff and Vale")).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await form.getByRole("button", { name: "Change organisations" }).click()
      const group = form.getByRole("group", { name: "Organisations" })
      await expect(group).toHaveAccessibleDescription(/CAVHB isn't recognised/)
      await group.getByRole("checkbox", { name: "Powys (PTHB)" }).click()
      await expectNoAxeViolations(page, theme)

      await main.getByRole("form").getByRole("button", { name: "Done" }).click()
      await expect(main.getByText("Cardiff and Vale, Powys")).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("an item's tags: shut, open, a rename, a removal with Undo, a refusal, then the changed card (STY-037)", async ({
      page,
    }) => {
      const title = "Longer-term idea"
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await main.getByRole("button", { name: `Edit ${title}` }).click()
      const form = main.getByRole("form", { name: title })
      await expect(
        form.getByRole("button", { name: "Change tags" }),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await form.getByRole("button", { name: "Change tags" }).click()
      const field = form.getByRole("group", { name: "Tags" })
      await expect(
        field.getByRole("textbox", { name: "Add a tag" }),
      ).toBeFocused()
      await expectNoAxeViolations(page, theme)

      await field.getByRole("button", { name: "Rename Service Z" }).click()
      await expect(
        field.getByRole("textbox", { name: "Rename Service Z" }),
      ).toBeFocused()
      await expectNoAxeViolations(page, theme)

      await field.getByRole("button", { name: "Remove Service Y" }).click()
      await expect(
        field.getByRole("button", { name: "Undo removing Service Y" }),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await field.getByRole("textbox", { name: "Add a tag" }).fill("service z")
      await page.keyboard.press("Enter")
      await expect(field.getByRole("status")).toHaveText(
        "“Service Z” is already on this item.",
      )
      await field.getByRole("textbox", { name: "Add a tag" }).fill("zzz")
      await expect(field.getByText("No other tag matches “zzz”.")).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await form.getByRole("button", { name: "Done" }).click()
      await expect(main.getByText("Service Z, zzz")).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("an item with no tags, and one whose Welsh tags can't be changed (STY-037)", async ({
      page,
    }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await main.getByRole("button", { name: "Edit Minimal card" }).click()
      const empty = main.getByRole("form", { name: "Minimal card" })
      await expect(empty.getByText("No tags")).toBeVisible()
      await empty.getByRole("button", { name: "Add tags" }).click()
      await expect(
        empty.getByRole("button", { name: "Add Service X, on 2 other items" }),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)
      await empty.getByRole("button", { name: "Cancel" }).click()

      const item = "Example card with every column"
      await main.getByRole("button", { name: `Edit ${item}` }).click()
      await expect(
        main
          .getByRole("form", { name: item })
          .getByText(/^These tags have Welsh versions/),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("an item's details: shut, open, nested, a refusal, a removal with Undo, then the changed card (STY-039)", async ({
      page,
    }) => {
      const title = "Earlier delivery this year"
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await main.getByRole("button", { name: `Edit ${title}` }).click()
      const form = main.getByRole("form", { name: title })
      await expect(
        form.getByRole("button", { name: "Change details" }),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await form.getByRole("button", { name: "Change details" }).click()
      const field = form.getByRole("group", { name: "Details" })
      await expect(field.getByRole("textbox").first()).toBeFocused()
      await expectNoAxeViolations(page, theme)

      // A third level, by a hyphen typed at the start of each new detail.
      await page.keyboard.press("End")
      await page.keyboard.press("Enter")
      await page.keyboard.type("-Nested")
      await page.keyboard.press("Enter")
      await page.keyboard.type("-Third level")
      await expect(
        field.getByRole("textbox", {
          name: "Detail 3 of 4, nested under “Nested”",
        }),
      ).toBeFocused()
      await expectNoAxeViolations(page, theme)

      // A refusal: `aria-disabled` holds Playwright back, not the button.
      await field
        .getByRole("button", { name: "Move in Third level" })
        .click({ force: true })
      await expect(field.getByRole("status")).toHaveText(
        "It is already nested under the detail above.",
      )
      await expectNoAxeViolations(page, theme)

      await field.getByRole("button", { name: "Remove Third level" }).click()
      await expect(
        field.getByRole("button", { name: "Undo removing Third level" }),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await form.getByRole("button", { name: "Done" }).click()
      await expect(main.getByText("Nested", { exact: true })).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("an item with no details, and one whose Welsh details can't be changed (STY-039)", async ({
      page,
    }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await main.getByRole("button", { name: "Edit Minimal card" }).click()
      const empty = main.getByRole("form", { name: "Minimal card" })
      await expect(empty.getByText("No details")).toBeVisible()
      await empty.getByRole("button", { name: "Add details" }).click()
      await expect(
        empty.getByRole("textbox", { name: "Detail 1 of 1, top level" }),
      ).toBeFocused()
      await expectNoAxeViolations(page, theme)
      await empty.getByRole("button", { name: "Cancel" }).click()

      const item = "Example card with every column"
      await main.getByRole("button", { name: `Edit ${item}` }).click()
      await expect(
        main
          .getByRole("form", { name: item })
          .getByText(/^These details have Welsh versions/),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("an item with no organisations, its field shut then open (STY-038)", async ({
      page,
    }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await main
        .getByRole("button", { name: "Edit Something we are not doing" })
        .click()
      const form = main.getByRole("form", {
        name: "Something we are not doing",
      })
      await expect(form.getByText("No organisations")).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await form.getByRole("button", { name: "Add organisations" }).click()
      await expect(
        form.getByRole("checkbox", { name: "All Wales (National)" }),
      ).toBeFocused()
      await expectNoAxeViolations(page, theme)
    })

    test("choosing a family, then its pending colour (STY-028)", async ({
      page,
      sheets,
    }) => {
      sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await main
        .getByRole("button", { name: "Edit About this roadmap" })
        .click()
      const family = main.getByRole("combobox", { name: "Family" })
      await family.selectOption("Medicines & Diagnostics")
      await expectNoAxeViolations(page, theme)

      await main.getByRole("form").getByRole("button", { name: "Done" }).click()
      await expect(
        main.getByText("Family: Medicines & Diagnostics"),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("families, a family's form, then its confirmation (STY-029)", async ({
      page,
      sheets,
    }) => {
      sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
      await page.goto("./#/families")
      await connect(page)
      const main = page.getByRole("main")
      const change = main.getByRole("button", { name: "Change Single Record" })
      await expect(change).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await change.click()
      const form = main.getByRole("form", { name: "Change Single Record" })
      await form.getByRole("textbox", { name: "Name" }).fill("")
      await form.getByRole("textbox", { name: "Colour" }).fill("#00796b")
      await form.getByRole("button", { name: "Save changes" }).click()
      await expect(form.getByText("Enter a name")).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await form
        .getByRole("textbox", { name: "Name" })
        .fill("Shared Care Record")
      await form.getByRole("button", { name: "Save changes" }).click()
      await expect(page.getByRole("alertdialog")).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("adding a roadmap: the dialog open, refused, failed and expired, then the new roadmap's notice (STY-041)", async ({
      page,
      sheets,
    }) => {
      const dialog = await openAddRoadmapDialog(page, { withListsIn: sheets })
      const title = dialog.getByRole("textbox", { name: "Title" })
      const shortName = dialog.getByRole("textbox", { name: "Short name" })
      const add = dialog.getByRole("button", { name: "Add roadmap" })
      // Every attempt reads the list again, behind the dialog: a check waits for
      // that to end, or it reads Refresh's colours as they change.
      const listRead = () =>
        expect(
          page.getByRole("button", { name: "Refresh", includeHidden: true }),
        ).not.toHaveAttribute("aria-disabled", "true")
      await expectNoAxeViolations(page, theme)

      // Refused: a blank title, and a short name a tab already has.
      await shortName.fill("Families")
      await add.click()
      await expect(dialog.getByText("Enter a title")).toBeVisible()
      await title.fill("Community Nursing roadmap")
      await add.click()
      await expect(
        dialog.getByText("This short name is already in use. Choose another."),
      ).toBeVisible()
      await listRead()
      await expectNoAxeViolations(page, theme)

      // Failed, then expired with Reconnect in the dialog.
      await shortName.fill("Community Nursing")
      sheets.failWith(403)
      await add.click()
      await expect(dialog.getByRole("alert")).toContainText(
        "Couldn't add the roadmap",
      )
      await listRead()
      await expectNoAxeViolations(page, theme)
      sheets.failWith(401)
      await add.click()
      await expect(dialog.getByRole("alert")).toContainText(
        "Your session has expired",
      )
      await expectNoAxeViolations(page, theme)

      await dialog.getByRole("button", { name: "Reconnect" }).click()
      await expect(add).toBeEnabled()
      await add.click()
      const main = page.getByRole("main")
      await expect(
        main.getByText(
          "Community Nursing roadmap was added. It isn't published yet.",
        ),
      ).toBeVisible()
      await expect(
        main.getByRole("heading", { name: "No items yet" }),
      ).toBeVisible()
      await listRead()
      await expectNoAxeViolations(page, theme)
    })

    test("disconnecting with changes pending, then the waiting note (STY-025)", async ({
      page,
    }) => {
      const item = "Example card with every column"
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await main.getByRole("button", { name: `Edit ${item}` }).click()
      const form = main.getByRole("form", { name: item })
      await form.getByRole("textbox", { name: "Title" }).fill("A clearer card")
      await form.getByRole("button", { name: "Done" }).click()

      await page
        .getByRole("banner")
        .getByRole("button", { name: "Disconnect" })
        .click()
      const question = page.getByRole("alertdialog")
      await expect(question).toBeVisible()
      await expectNoAxeViolations(page, theme)

      await question
        .getByRole("button", { name: "Keep changes and disconnect" })
        .click()
      await main.getByRole("link", { name: "Back to roadmaps" }).click()
      await expect(
        main.getByText("Changes to 1 roadmap are waiting"),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("a co-lead's change to review, in Cymraeg on a phone, by keyboard (STY-026)", async ({
      page,
      sheets,
    }) => {
      await useLanguage(page, "cy")
      await page.setViewportSize({ width: 375, height: 800 })
      await page.goto("./#/roadmaps/producta")
      await connect(page, "Cysylltu â Google")
      const main = page.getByRole("main")
      const about = "Ynglŷn â'r map trywydd hwn"
      await main.getByRole("button", { name: `Golygu ${about}` }).click()
      await main
        .getByRole("textbox", { name: "Gweledigaeth (Saesneg)" })
        .fill("My vision.")
      await main.getByRole("button", { name: "Gorffen" }).click()
      sheets.coLead("Roadmaps", "ProductA", "Vision", "Their vision.")
      await main.getByRole("button", { name: "Cyhoeddi'r newidiadau" }).click()
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Cyhoeddi'r newidiadau" })
        .click()

      const review = main.getByRole("alert")
      await expect(review).toBeFocused()
      await expect(review).toContainText(
        "Mae rhywun arall wedi newid testun a olygoch chi",
      )
      // The two values are told apart by their labels, not by colour.
      await expect(review.getByRole("term")).toHaveText([
        "Eich newid",
        "Testun presennol",
      ])
      await expect(review.getByRole("definition")).toHaveText([
        "My vision.",
        "Their vision.",
      ])
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
      // The narrow header's home link fails 2.5.3 in English only (DEF-002), but the
      // review is the page's own content.
      await expectNoAxeViolations(page, theme, { only: "main" })

      await page.keyboard.press("Tab")
      await expect(
        review.getByRole("button", {
          name: `Cadw fy un i ${about}: Gweledigaeth (Saesneg)`,
        }),
      ).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(
        main.getByRole("button", { name: "Cyhoeddi'r newidiadau" }),
      ).toBeFocused()
      await expect(review).toHaveCount(0)
    })

    test("session warning, then a failed renewal", async ({ page, gis }) => {
      await page.clock.install()
      await page.goto("./")
      await connect(page)
      await expect(roadmapCards(page)).toHaveCount(3)
      await page.clock.fastForward(sessionMs() - SESSION_WARNING_MS)
      const warning = page.getByRole("alertdialog")
      await expect(warning).toBeVisible()
      await expectNoAxeViolations(page, theme)

      gis.respondWith({ type: "popup-blocked" })
      await warning.getByRole("button", { name: "Stay connected" }).click()
      await expect(page.getByRole("main").getByRole("alert")).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("connection failure callout", async ({ page, gis }) => {
      gis.respondWith({ type: "access-denied" })
      await page.goto("./")
      await connect(page)
      await expect(page.getByRole("main").getByRole("alert")).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("load error", async ({ page, sheets }) => {
      sheets.failWith(403)
      await page.goto("./")
      await connect(page)
      await expect(page.getByRole("alert")).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })
  })
}
