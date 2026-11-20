import type { Page } from "@playwright/test"

import { disconnectFromHeader } from "./fixtures/account-menu"
import { changeItem, openEditItemDialog } from "./fixtures/dialogs"
import { settledBoxes } from "./fixtures/layout"
import { tokenColour } from "./fixtures/look"
import { openLongRoadmap } from "./fixtures/roadmap-page"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-055: which roadmaps have unpublished changes, from any page. The shell's navigation
 * marks each with a dot and says how many under "All roadmaps", leading to them (D1); a
 * rail keeps both (D3); on a phone the menu button carries a dot and says how many (D4);
 * and Disconnect's question names the roadmaps, each a link (D2).
 */

const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 375, height: 812 }

const navigation = (page: Page) =>
  page.getByRole("navigation", { name: "Roadmaps" })

const A_ITEM = "Example card with every column"
const B_ITEM = "Building the core service"

/** Two roadmaps with changes, then the families page, connected. */
async function twoChangedThenFamilies(page: Page) {
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await changeItem(page, "producta", A_ITEM)
  await changeItem(page, "productb", B_ITEM)
  await page.goto("./#/families")
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toBeVisible()
}

// With two roadmaps changed the count is a button that shows only them (STY-063).
const count = (page: Page) =>
  navigation(page).getByRole("button", {
    name: "2 roadmaps have unpublished changes",
  })

test.describe("on a desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP)
  })

  test("shows no count while nothing is pending (S3)", async ({ page }) => {
    await page.goto("./#/families")
    await connect(page)

    await expect(
      navigation(page).getByRole("link", { name: "Product A roadmap" }),
    ).toBeVisible()
    await expect(navigation(page).getByText(/unpublished changes/)).toHaveCount(
      0,
    )
  })

  test("says on the families page how many roadmaps have unpublished changes, and marks each with a dot (S1, D1)", async ({
    page,
  }) => {
    await twoChangedThenFamilies(page)

    await expect(count(page)).toBeVisible()
    const withDot = navigation(page).getByRole("link", {
      name: "Product A roadmap, unpublished changes",
    })
    await expect(withDot).toBeVisible()
    await expect(
      navigation(page).getByRole("link", {
        name: "Product B roadmap, unpublished changes",
      }),
    ).toBeVisible()
    await expect(
      navigation(page).getByRole("link", { name: "Product C roadmap" }),
    ).toBeVisible()
    // The dot is DHCW's yellow on the navy navigation.
    await expect(withDot.locator("[data-slot=unpublished-dot]")).toHaveCSS(
      "background-color",
      await tokenColour(page, "--focus"),
    )
  })

  test("keeps the dot in view while its entry is focused, dark on the yellow focus fill (D1)", async ({
    page,
  }) => {
    await twoChangedThenFamilies(page)
    const entry = navigation(page).getByRole("link", {
      name: "Product A roadmap, unpublished changes",
    })

    // Reached by the keyboard, as `:focus-visible` needs: a script's focus() alone is not.
    await entry.focus()
    await page.keyboard.press("Shift+Tab")
    await page.keyboard.press("Tab")

    await expect(entry).toBeFocused()
    await expect(entry.locator("[data-slot=unpublished-dot]")).toHaveCSS(
      "background-color",
      await tokenColour(page, "--focus-foreground"),
    )
  })

  test("leads from the count to the one roadmap with changes, and is text on its page (S2, STY-063 S5)", async ({
    page,
  }) => {
    await page.goto("./#/roadmaps/producta")
    await connect(page)
    await changeItem(page, "productb", B_ITEM)
    await page.goto("./#/families")
    const lead = navigation(page).getByRole("link", {
      name: "1 roadmap has unpublished changes",
    })

    await lead.click()

    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { level: 1, name: "Product B roadmap" }),
    ).toBeVisible()
    await expect(page.getByRole("main")).toBeFocused()
    await expect(
      navigation(page).getByText("1 roadmap has unpublished changes"),
    ).toBeVisible()
    await expect(lead).toBeHidden()
  })

  test("keeps the count and the dots when the navigation is folded to a rail (D3)", async ({
    page,
  }) => {
    await twoChangedThenFamilies(page)

    await page.getByRole("button", { name: "Fold the navigation" }).click()

    await expect(count(page).locator("[aria-hidden]")).toHaveText("2")
    await expect(
      navigation(page).getByRole("link", {
        name: "PA Product A roadmap, unpublished changes",
      }),
    ).toBeVisible()
    await expect(
      navigation(page).getByRole("link", { name: "PC Product C roadmap" }),
    ).toBeVisible()
  })

  test("drops the count as the changes are published or discarded (S3)", async ({
    page,
  }) => {
    await page.goto("./#/roadmaps/producta")
    await connect(page)
    await changeItem(page, "producta", A_ITEM)
    // On the one roadmap with changes, the count has nowhere else to lead.
    const one = navigation(page).getByText("1 roadmap has unpublished changes")
    await expect(one).toBeVisible()

    await page
      .getByRole("main")
      .getByRole("button", { name: "Discard all changes" })
      .click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Discard all changes" })
      .click()

    await expect(one).toBeHidden()
    // Nothing shows; the shell tells a screen reader that none is left.
    const said = page.locator("[aria-live=polite]", {
      hasText: "No roadmaps have unpublished changes",
    })
    await expect(said).toBeAttached()
    await expect(said).toHaveClass(/sr-only/)
    await expect(
      navigation(page).getByRole("link", { name: /unpublished changes/ }),
    ).toHaveCount(0)
  })

  test("names the roadmaps in Disconnect's question, each a link to it (D2)", async ({
    page,
  }) => {
    await twoChangedThenFamilies(page)

    await disconnectFromHeader(page)
    const question = page.getByRole("alertdialog")
    await expect(
      question.getByRole("list", {
        name: "2 roadmaps have unpublished changes",
      }),
    ).toBeVisible()
    await question.getByRole("link", { name: "Product B roadmap" }).click()

    await expect(question).toBeHidden()
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { level: 1, name: "Product B roadmap" }),
    ).toBeVisible()
    await expect(page.getByRole("main")).toBeFocused()
    // Still connected, and the changes are still there.
    await expect(page.getByRole("banner").getByRole("status")).toHaveText(
      "Google connected",
    )
    await expect(count(page)).toBeVisible()
  })
})

test.describe("on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE)
  })

  const horizontalOverflow = (page: Page) =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )

  test("carries a dot on the menu button and says how many, and the drawer shows the dots and the count (D4)", async ({
    page,
  }) => {
    await twoChangedThenFamilies(page)

    const menu = page.getByRole("banner").getByRole("button", {
      name: "Menu, 2 roadmaps have unpublished changes",
    })
    await expect(menu).toBeVisible()
    await expect(menu.locator("[data-slot=unpublished-dot]")).toHaveCSS(
      "background-color",
      await tokenColour(page, "--focus"),
    )
    await menu.click()

    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible()
    await expect(count(page)).toBeVisible()
    await expect(
      navigation(page).getByRole("link", {
        name: "Product A roadmap, unpublished changes",
      }),
    ).toBeVisible()
  })

  test("carries the dot on the button in a roadmap's sticky strip too (D4)", async ({
    page,
    sheets,
  }) => {
    await openLongRoadmap(page, sheets)
    const form = await openEditItemDialog(page, "Planned work 3")
    await form
      .getByRole("textbox", { name: "Title" })
      .fill("Planned work 3, edited")
    await form.getByRole("button", { name: "Done" }).click()
    await expect(form).toBeHidden()
    await page
      .getByRole("heading", { level: 2, name: "Later", exact: true })
      .evaluate((heading) => {
        heading.scrollIntoView({ block: "center" })
      })

    const strip = page.locator("[data-stuck]")
    await expect(
      strip.getByRole("button", {
        name: "Menu, 1 roadmap has unpublished changes",
      }),
    ).toBeVisible()
  })

  test("fits in Cymraeg: the menu button says how many, and nothing scrolls sideways (D4)", async ({
    page,
  }) => {
    await twoChangedThenFamilies(page)

    await page.getByRole("button", { name: /^Language/ }).click()
    await page.getByRole("menuitemradio", { name: "Cymraeg" }).click()

    const menu = page.getByRole("banner").getByRole("button", {
      name: "Dewislen, 2 fap trywydd â newidiadau heb eu cyhoeddi",
    })
    await expect(menu).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
    await menu.click()
    const drawer = page.getByRole("dialog", { name: "Dewislen" })
    await expect(drawer).toBeVisible()
    const entry = drawer.getByRole("button", {
      name: "2 fap trywydd â newidiadau heb eu cyhoeddi",
    })
    await expect(entry).toBeVisible()
    const [box, link] = await settledBoxes(drawer, entry)
    expect(link.right).toBeLessThanOrEqual(box.right)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})
