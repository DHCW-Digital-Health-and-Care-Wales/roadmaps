import type { Locator, Page } from "@playwright/test"

import {
  addItem,
  changeItem,
  editRoadmapButton,
  openAddItemDialog,
  openAddRoadmapDialog,
  openEditItemDialog,
  openEditRoadmapDialog,
} from "./fixtures/dialogs"
import { EXAMPLE_SPREADSHEET_WITH_LISTS } from "./fixtures/fake-sheets"
import { tabTo } from "./fixtures/keyboard"
import { THEMES, tokenColour, useTheme } from "./fixtures/look"
import {
  openLongRoadmap,
  productDetailsDisclosure,
} from "./fixtures/roadmap-page"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

// DHCW's yellow focus indicator (ADR-010). Its contrast in both themes is held by
// src/styles/contrast.test.ts; this checks each control actually shows it, in the
// colours of the focus tokens, read from the stylesheet rather than copied here.

interface FocusColours {
  /** `--focus`: the yellow. */
  focus: string
  /** `--focus-foreground`: the dark text, inner ring and bar. */
  text: string
}

/** The three focus utilities of src/styles/globals.css. */
type Indicator = "fill" | "link" | "ring"

async function focusColours(page: Page): Promise<FocusColours> {
  return {
    focus: await tokenColour(page, "--focus"),
    text: await tokenColour(page, "--focus-foreground"),
  }
}

/**
 * Which focus utility an element's computed style matches, or null. With `ancestors`, the
 * nearest of that many ancestors may carry it instead, as a card's ring does for its
 * stretched title link.
 */
function indicatorOf(
  locator: Locator,
  colours: FocusColours,
  ancestors = 0,
): Promise<Indicator | null> {
  return locator.evaluate(
    (element, { colours: { focus, text }, ancestors }) => {
      let current: Element | null = element
      for (let depth = 0; current && depth <= ancestors; depth += 1) {
        const style = getComputedStyle(current)
        const filled = style.backgroundColor === focus && style.color === text
        // Buttons and links: yellow fill, dark text, a 2px dark bottom bar (focus-fill).
        if (filled && style.boxShadow === `${text} 0px 2px 0px 0px`)
          return "fill"
        // Text links: the same fill with a 4px bar under every line (focus-link).
        if (filled && style.boxShadow === `${text} 0px 4px 0px 0px`)
          return "link"
        // Cards: a 3px yellow outline outside a 2px dark inner ring (focus-ring).
        if (
          `${style.outlineColor} ${style.outlineStyle} ${style.outlineWidth}` ===
            `${focus} solid 3px` &&
          style.boxShadow === `${text} 0px 0px 0px 2px inset`
        )
          return "ring"
        current = current.parentElement
      }
      return null
    },
    { colours, ancestors },
  )
}

/**
 * `locator` has `indicator`, polled because buttons transition into the focus style.
 * `focused` is the element holding focus, when the indicator is drawn by another.
 */
async function expectIndicator(
  locator: Locator,
  colours: FocusColours,
  indicator: Indicator,
  focused = locator,
) {
  await expect(focused).toBeFocused()
  await expect.poll(() => indicatorOf(locator, colours)).toBe(indicator)
}

/**
 * A focused element's place and name, to tell the stops of a tour apart. A text field has
 * no text of its own, so it is named as a person hears it: by its `aria-label`, or the
 * label naming it.
 */
function describeElement(element: Element) {
  const region = element.closest("header, main, footer")?.tagName.toLowerCase()
  const labels = "labels" in element ? [...(element.labels as NodeList)] : []
  const named = element.getAttribute("aria-labelledby")?.split(" ") ?? []
  const name =
    element.getAttribute("aria-label") ??
    [...named.map((id) => document.getElementById(id)), ...labels]
      .map((label) => label?.textContent)
      .join(" ")
  const text = name.trim() || element.textContent.trim()
  return `${region ?? "page"}: ${element.tagName.toLowerCase()} ${text}`
}

/** The links and form controls a keyboard can use. */
const CONTROLS =
  "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)"

/** Appended to a selector: leaves out what it matches that is out of the Tab order. */
const IN_TAB_ORDER = ':not([tabindex="-1"])'

/**
 * What is out of the Tab order and no stop: an element that takes focus only from a
 * script, such as a notice; the form input behind a custom control (a checkbox's), which
 * is hidden from the page; and the details outline's text fields but the selected one
 * (STY-039 S24), which `expectOutlineKeepsAStop` checks is there. Any other text field
 * out of the Tab order is a stop the tour must reach, so it fails if Tab cannot.
 */
const NOT_A_STOP =
  '[tabindex="-1"]:not(input, select, textarea), input[aria-hidden="true"], li > textarea[tabindex="-1"]'

/** The tab stops `scope` offers, in the order of the page. */
function tabStops(scope: Page | Locator) {
  return scope
    .locator(`:is(${CONTROLS}, [tabindex]):not(${NOT_A_STOP})`)
    .filter({ visible: true })
}

/**
 * A details outline in `scope` keeps its selected text field in the Tab order, the one
 * stop the outline offers (STY-039 S24): `NOT_A_STOP` leaves out the rest, so without
 * this a selected field taken out of reach would pass.
 */
async function expectOutlineKeepsAStop(scope: Page | Locator) {
  const outlines = scope.locator("ul:has(> li > textarea)").filter({
    visible: true,
  })
  for (const outline of await outlines.all()) {
    await expect(
      outline.locator('li > textarea:not([tabindex="-1"])'),
      "the details outline's text field in the Tab order",
    ).toHaveCount(1)
  }
}

/**
 * Tabs until every focusable element of `scope` has had focus, and expects each to show
 * one of the three indicators. The tab stops are those `scope` offers, found first, so a
 * control a tour never reaches fails the test too. `scope` is the page, or an open
 * dialog, which holds focus: the page behind it has no stops.
 */
async function expectEveryStopShowsAnIndicator(
  page: Page,
  scope: Page | Locator = page,
) {
  const colours = await focusColours(page)
  await expectOutlineKeepsAStop(scope)
  const names = await Promise.all(
    (await tabStops(scope).all()).map((stop) => stop.evaluate(describeElement)),
  )
  const expected = new Set(names)
  // Each stop has a name of its own, or a tour ends once the first of two alike has
  // had focus.
  expect(
    names.filter((name, index) => names.indexOf(name) !== index),
    "the stops that share a name with another",
  ).toEqual([])
  expect(expected.size, "the tab stops").toBeGreaterThan(3)

  const visited = new Set<string>()
  for (
    let presses = 0;
    presses < expected.size * 3 && visited.size < expected.size;
    presses += 1
  ) {
    await page.keyboard.press("Tab")
    // Past the last stop focus leaves the page; the next Tab starts again at its top.
    if (await page.evaluate(() => document.activeElement === document.body)) {
      continue
    }
    // Past a dialog's last stop focus rests on its focus guard, which hands it to the
    // first stop a frame later: the guard is no stop, and the first stop is this lap's.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            !document.activeElement?.hasAttribute("data-base-ui-focus-guard"),
        ),
      )
      .toBe(true)
    const focused = page.locator(":focus")
    const stop = await focused.evaluate(describeElement)
    await expect
      .poll(() => indicatorOf(focused, colours, 3), {
        message: `the focus indicator of ${stop}`,
      })
      .not.toBeNull()
    visited.add(stop)
  }
  expect([...visited].sort()).toEqual([...expected].sort())
}

/**
 * Tours a form dialog from its first stop, where focus is as it opens: each stop in turn
 * shows its indicator, the fill on a button and the ring on a field, and Tab from the
 * last comes back to the first, since a dialog holds focus. The stops are the dialog's
 * controls, found first, so one added to its form is toured, and one taken out of the
 * Tab order fails the tour: unlike a page, a form dialog keeps every control in it. A
 * date field is one stop, though Tab goes through its day, month and year.
 */
async function expectDialogTour(page: Page, dialog: Locator) {
  const colours = await focusColours(page)
  // As `tabStops` finds them, but a control stays a stop whatever its `tabindex`.
  const stops = await dialog
    .locator(`:is(${CONTROLS}, [tabindex]${IN_TAB_ORDER})`)
    .filter({ visible: true })
    .all()
  const first = stops.at(0)
  const last = stops.at(-1)
  if (!first || !last) throw new Error("The dialog has no tab stops")
  expect(stops.length, "the dialog's tab stops").toBeGreaterThan(3)
  // Its close button, drawn last, is the tour's last stop: Tab from it wraps to the first
  // field (STY-068 S6).
  await expect(last).toHaveAttribute("data-slot", "dialog-close-button")

  for (const stop of stops) {
    const isButton = await stop.evaluate(
      (element) => element instanceof HTMLButtonElement,
    )
    await expectIndicator(stop, colours, isButton ? "fill" : "ring")
    await tabPast(page, stop)
  }
  await expect(first).toBeFocused()
}

/** Tabs on from `stop`: a date field keeps focus through its day, month and year. */
async function tabPast(page: Page, stop: Locator) {
  for (let presses = 0; presses < 4; presses++) {
    await page.keyboard.press("Tab")
    const left = await stop.evaluate(
      (element) => element !== document.activeElement,
    )
    if (left) return
  }
  throw new Error("Tab did not leave the stop")
}

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await useTheme(page, theme)
    })

    test("every control on the start page shows DHCW's focus indicator", async ({
      page,
    }) => {
      await page.goto("./")
      await expect(
        page.getByRole("main").getByRole("button", { name: "Connect Google" }),
      ).toBeEnabled()

      await expectEveryStopShowsAnIndicator(page)
    })

    test("every control on the main page shows DHCW's focus indicator", async ({
      page,
    }) => {
      await page.goto("./")
      await connect(page)
      await expect(roadmapCards(page)).toHaveCount(3)

      await expectEveryStopShowsAnIndicator(page)
    })

    test("every control on a roadmap's page with a change pending shows DHCW's focus indicator (STY-025)", async ({
      page,
    }) => {
      const item = "Example card with every column"
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await expect(
        main.getByRole("heading", { level: 3, name: item }),
      ).toBeVisible()
      // One change pending: "Undo changes" and the publish bar.
      const form = await openEditItemDialog(page, item)
      await form.getByRole("textbox", { name: "Title" }).fill("A clearer card")
      await form.getByRole("button", { name: "Done" }).click()
      // Gone, so the tour's stops are the page's alone.
      await expect(form).toHaveCount(0)
      await expect(main.getByText("1 unpublished change")).toBeVisible()
      // And one new item: its card's Remove (STY-046).
      await addItem(page, "Choose a clinic closer to home", "Next")
      await expect(main.getByText("2 unpublished changes")).toBeVisible()
      // From the page's top, as the tour's stops are named: no placement link is
      // current yet (STY-053 S3), the links the jump control from 768px (STY-065 S6).
      await page.evaluate(() => {
        window.scrollTo(0, 0)
      })
      await expect(
        main
          .getByRole("navigation", { name: "Horizons and sections" })
          .locator("[aria-current]"),
      ).toHaveCount(0)

      await expectEveryStopShowsAnIndicator(page)
    })

    test("every control on a roadmap not published, its product details open, shows DHCW's focus indicator, the banner's dismiss button and Publish roadmap among them (STY-065)", async ({
      page,
      sheets,
    }) => {
      await openLongRoadmap(page, sheets, { tab: "ProductC" })
      const main = page.getByRole("main")
      const colours = await focusColours(page)

      // The banner's dismiss button, a button, takes the fill; the disclosure, a text
      // control, takes the link's.
      const dismiss = page.getByRole("button", { name: "Dismiss message" })
      // Connecting leaves focus on the content, the banner before it.
      await tabTo(page, dismiss, "Shift+Tab", 40)
      await expectIndicator(dismiss, colours, "fill")
      const disclosure = productDetailsDisclosure(page)
      await tabTo(page, disclosure, "Tab", 60)
      await expectIndicator(disclosure, colours, "link")
      await page.keyboard.press("Enter")
      await expect(disclosure).toHaveAttribute("aria-expanded", "true")
      const edit = editRoadmapButton(page)
      await tabTo(page, edit)
      await expectIndicator(edit, colours, "fill")
      const publish = main.getByRole("button", { name: "Publish roadmap" })
      await tabTo(page, publish)
      await expectIndicator(publish, colours, "fill")

      await page.evaluate(() => {
        window.scrollTo(0, 0)
      })
      await expectEveryStopShowsAnIndicator(page)
    })

    test("every control in the item dialog, its fields shut and then open, shows DHCW's focus indicator (STY-044)", async ({
      page,
    }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const dialog = await openEditItemDialog(page, "Longer-term idea")

      await expectDialogTour(page, dialog)

      // Its Organisations field opened, so the tour stops on each checkbox (STY-038).
      await dialog.getByRole("button", { name: "Change organisations" }).click()
      await expect(dialog.getByRole("checkbox")).toHaveCount(14)
      // Its Details field opened, so the tour stops on the outline's one stop and the
      // buttons under it (STY-039).
      await dialog.getByRole("button", { name: "Add details" }).click()
      await expect(dialog.getByRole("textbox").last()).toBeFocused()
      // Its Tags field opened, a name being changed, so the tour stops on its rows, its
      // fields and the tags it offers (STY-037).
      await dialog.getByRole("button", { name: "Change tags" }).click()
      await dialog.getByRole("button", { name: "Rename Service Y" }).click()
      await expect(
        dialog.getByRole("textbox", { name: "Rename Service Y" }),
      ).toBeFocused()

      await expectEveryStopShowsAnIndicator(page, dialog)
    })

    test("every control in the item dialog, adding, shows DHCW's focus indicator (STY-046)", async ({
      page,
    }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      await expect(
        page.getByRole("heading", { level: 3, name: "Minimal card" }),
      ).toBeVisible()
      const dialog = await openAddItemDialog(page)

      await expectDialogTour(page, dialog)
    })

    test("every control in the Add a roadmap dialog shows DHCW's focus indicator (STY-041)", async ({
      page,
      sheets,
    }) => {
      sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
      const dialog = await openAddRoadmapDialog(page, { offersLists: true })

      await expectDialogTour(page, dialog)
    })

    test("every control in the roadmap dialog, editing product details, shows DHCW's focus indicator (STY-043)", async ({
      page,
      sheets,
    }) => {
      sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const dialog = await openEditRoadmapDialog(page, { offersLists: true })

      await expectDialogTour(page, dialog)
    })

    test("every control in a co-lead's review shows DHCW's focus indicator (STY-026)", async ({
      page,
      sheets,
    }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await expect(
        main.getByRole("heading", { level: 3, name: "Minimal card" }),
      ).toBeVisible()
      const editing = await openEditRoadmapDialog(page)
      await editing.getByRole("textbox", { name: "Vision" }).fill("My vision.")
      await editing.getByRole("button", { name: "Done" }).click()
      sheets.coLead("Roadmaps", "ProductA", "Vision", "Their vision.")
      await main.getByRole("button", { name: "Publish changes" }).click()
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Publish changes" })
        .click()
      await expect(main.getByRole("alert")).toBeFocused()

      await expectEveryStopShowsAnIndicator(page)
    })

    test("the navigation's count takes the fill and keeps it once pressed (STY-063 S8)", async ({
      page,
    }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      await changeItem(page, "producta", "Example card with every column")
      await changeItem(page, "productb", "Building the core service")
      await page.goto("./#/families")
      const colours = await focusColours(page)
      const count = page
        .getByRole("navigation", { name: "Roadmaps" })
        .getByRole("button", { name: "2 roadmaps have unpublished changes" })

      // The count sits before the page's controls, and focus is still in the page
      // after the hash change, so Shift+Tab reaches it.
      await tabTo(page, count, "Shift+Tab")
      await expectIndicator(count, colours, "fill")
      await page.keyboard.press("Enter")

      await expect(count).toHaveAttribute("aria-pressed", "true")
      // The pressed entry's blue gives way to the fill, as the current page's does.
      await expectIndicator(count, colours, "fill")
      await page.keyboard.press("Space")
      await expect(count).toHaveAttribute("aria-pressed", "false")
      await expectIndicator(count, colours, "fill")
    })

    test("each kind of control shows the indicator it is meant to", async ({
      page,
    }) => {
      await page.goto("./")
      const colours = await focusColours(page)
      const banner = page.getByRole("banner")
      const main = page.getByRole("main")
      await expect(
        main.getByRole("button", { name: "Connect Google" }),
      ).toBeEnabled()

      await page.keyboard.press("Tab")
      await expectIndicator(
        page.getByRole("link", { name: "Skip to main content" }),
        colours,
        "fill",
      )
      // The home link holds the white logo on navy, so it takes the ring, not the fill.
      await tabTo(page, banner.getByRole("link"))
      await expectIndicator(banner.getByRole("link"), colours, "ring")

      await connect(page)
      await expect(roadmapCards(page)).toHaveCount(3)
      // No notice follows a connect (STY-056 S1): the header's controls come first.
      await expect(main.getByRole("note")).toHaveCount(0)
      const language = banner.getByRole("button", { name: "Language English" })
      // Connecting moves focus to the main content; the header is behind it.
      await tabTo(page, language, "Shift+Tab")
      await expectIndicator(language, colours, "fill")
      await page.keyboard.press("Enter")
      // The menu opens on the checked item; arrow keys before that are lost.
      await expect(
        page.getByRole("menuitemradio", { name: "English" }),
      ).toBeFocused()
      const welsh = page.getByRole("menuitemradio", { name: "Cymraeg" })
      await page.keyboard.press("ArrowDown")
      await expect(welsh).toBeFocused()
      // Menu items take the fill, as a DHCW link or button does (STY-015 D5).
      await expectIndicator(welsh, colours, "fill")
      await page.keyboard.press("Escape")
      // Focus is back on the button once the menu has closed: Tab from inside the
      // closing menu would go round the whole page to reach the next control.
      await expect(language).toBeFocused()

      const account = banner.getByRole("button", { name: "Account" })
      await tabTo(page, account)
      await expectIndicator(account, colours, "fill")
      await page.keyboard.press("Enter")
      // Named for the theme it switches to.
      const theme = page.getByRole("menuitem", {
        name: /^Switch to (dark|light) theme$/,
      })
      await expect(theme).toBeFocused()
      await expectIndicator(theme, colours, "fill")
      // Then where the forms open (STY-077), and the session's action, Disconnect
      // while connected.
      const editSurface = page.getByRole("menuitem", {
        name: "Edit in a dialog",
      })
      await page.keyboard.press("ArrowDown")
      await expect(editSurface).toBeFocused()
      await expectIndicator(editSurface, colours, "fill")
      const disconnect = page.getByRole("menuitem", { name: "Disconnect" })
      await page.keyboard.press("ArrowDown")
      await expect(disconnect).toBeFocused()
      await expectIndicator(disconnect, colours, "fill")
      await page.keyboard.press("Escape")
      await expect(account).toBeFocused()

      const refresh = main.getByRole("button", { name: "Refresh" })
      await tabTo(page, refresh)
      await expectIndicator(refresh, colours, "fill")

      const card = main.getByRole("link", { name: "Product B roadmap" })
      await expect(roadmapCards(page).first()).toHaveText("Product B roadmap")
      await tabTo(page, card)
      // The stretched title link takes focus; the card around it draws the ring.
      await expectIndicator(
        main
          .getByRole("listitem")
          // Relative to the item: the card's title link.
          .filter({
            has: page.getByRole("link", { name: "Product B roadmap" }),
          })
          .locator(":scope > div"),
        colours,
        "ring",
        card,
      )

      await page.keyboard.press("Enter")
      // The product details' disclosure, a text control, takes the link's (STY-065 S3).
      const disclosure = main.getByRole("button", {
        name: "Product details",
        exact: true,
      })
      await tabTo(page, disclosure)
      await expectIndicator(disclosure, colours, "link")

      // The navigation's links and its fold button take the fill, the current page's
      // link too, its blue giving way (STY-054).
      const navigation = page.getByRole("navigation", { name: "Roadmaps" })
      const current = navigation.getByRole("link", {
        name: "Product B roadmap",
      })
      await expect(current).toHaveAttribute("aria-current", "page")
      await tabTo(page, current, "Shift+Tab")
      await expectIndicator(current, colours, "fill")
      // The family buttons and "Close all" take it too (STY-062 S8).
      const family = navigation.getByRole("button", {
        name: "Medicines & Diagnostics",
      })
      await tabTo(page, family, "Shift+Tab")
      await expectIndicator(family, colours, "fill")
      const closeAll = navigation.getByRole("button", {
        name: "Close all families",
      })
      await tabTo(page, closeAll, "Shift+Tab")
      await expectIndicator(closeAll, colours, "fill")
      const fold = page.getByRole("button", { name: "Fold the navigation" })
      await tabTo(page, fold, "Shift+Tab")
      await expectIndicator(fold, colours, "fill")
    })
  })
}
