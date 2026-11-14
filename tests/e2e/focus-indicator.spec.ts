import type { Locator, Page } from "@playwright/test"

import { openAddRoadmapDialog } from "./fixtures/dialogs"
import {
  holdConnectedNotice,
  THEMES,
  tokenColour,
  useTheme,
} from "./fixtures/look"
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

/** A focused element's place and name, to tell the stops of a tour apart. */
function describeElement(element: Element) {
  const region = element.closest("header, main, footer")?.tagName.toLowerCase()
  const name = element.getAttribute("aria-label") ?? element.textContent
  return `${region ?? "page"}: ${element.tagName.toLowerCase()} ${name.trim()}`
}

/** Presses Tab (or Shift+Tab, backwards) until `target` has focus, as a keyboard user would. */
async function tabTo(page: Page, target: Locator, key = "Tab") {
  for (let presses = 0; presses < 20; presses += 1) {
    await page.keyboard.press(key)
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return
    }
  }
  throw new Error("Tabbing never reached the target")
}

/**
 * The tab stops `scope` offers, in the order of the page. A control taken out of the Tab
 * order is no stop: the details outline keeps one of its text fields in it at a time
 * (STY-039 S24).
 */
function tabStops(scope: Page | Locator) {
  return scope
    .locator(
      ':is(a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]):not([tabindex="-1"])',
    )
    .filter({ visible: true })
}

/**
 * Tabs until every focusable element of the page has had focus, and expects each to show
 * one of the three indicators. The tab stops are those the page offers, found first, so a
 * control a tour never reaches fails the test too.
 */
async function expectEveryStopShowsAnIndicator(page: Page) {
  const colours = await focusColours(page)
  const expected = new Set(
    await Promise.all(
      (await tabStops(page).all()).map((stop) =>
        stop.evaluate(describeElement),
      ),
    ),
  )
  expect(expected.size, "the page's tab stops").toBeGreaterThan(3)

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
 * last comes back to the first, since a dialog holds focus. The stops are those the
 * dialog offers, found first, so a control added to its form is toured.
 */
async function expectDialogTour(page: Page, dialog: Locator) {
  const colours = await focusColours(page)
  const stops = await tabStops(dialog).all()
  const [first] = stops
  if (!first) throw new Error("The dialog has no tab stops")
  expect(stops.length, "the dialog's tab stops").toBeGreaterThan(3)

  for (const [index, stop] of stops.entries()) {
    if (index > 0) await page.keyboard.press("Tab")
    const isButton = await stop.evaluate(
      (element) => element instanceof HTMLButtonElement,
    )
    await expectIndicator(stop, colours, isButton ? "fill" : "ring")
  }
  await page.keyboard.press("Tab")
  await expect(first).toBeFocused()
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
      // Held, so the tour's stops include the notice's dismiss button however long it takes.
      await holdConnectedNotice(page)
      await expect(roadmapCards(page)).toHaveCount(3)

      await expectEveryStopShowsAnIndicator(page)
    })

    test("every control on a roadmap's page while editing shows DHCW's focus indicator (STY-025)", async ({
      page,
    }) => {
      const item = "Example card with every column"
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      const main = page.getByRole("main")
      await expect(
        main.getByRole("heading", { level: 3, name: item }),
      ).toBeVisible()
      // Dismissed, so the notice cannot clear itself partway through the tour.
      await main
        .getByRole("note")
        .getByRole("button", { name: "Dismiss message" })
        .click()
      // One change pending (Undo and the publish bar), and a form open.
      await main.getByRole("button", { name: `Edit ${item}` }).click()
      const form = main.getByRole("form", { name: item })
      await form.getByRole("textbox", { name: "Title" }).fill("A clearer card")
      await form.getByRole("button", { name: "Done" }).click()
      await main.getByRole("button", { name: "Edit Minimal card" }).click()
      // Its Organisations field opened, so the tour stops on each checkbox (STY-038).
      const minimal = main.getByRole("form", { name: "Minimal card" })
      await minimal.getByRole("button", { name: "Add organisations" }).click()
      await expect(minimal.getByRole("checkbox")).toHaveCount(12)
      // Another item's Tags field opened, a name being changed, so the tour stops on
      // its rows, its fields and the tags it offers (STY-037).
      const tagged = "Longer-term idea"
      await main.getByRole("button", { name: `Edit ${tagged}` }).click()
      const tags = main.getByRole("form", { name: tagged })
      await tags.getByRole("button", { name: "Change tags" }).click()
      await tags.getByRole("button", { name: "Rename Service Y" }).click()
      await expect(
        tags.getByRole("textbox", { name: "Rename Service Y" }),
      ).toBeFocused()
      // A third item's Details field opened, so the tour stops on the outline's one
      // stop and the buttons under it (STY-039).
      const detailed = "Earlier delivery this year"
      await main.getByRole("button", { name: `Edit ${detailed}` }).click()
      const details = main.getByRole("form", { name: detailed })
      await details.getByRole("button", { name: "Change details" }).click()
      await expect(details.getByRole("textbox").last()).toBeVisible()

      await expectEveryStopShowsAnIndicator(page)
    })

    test("every control in the Add a roadmap dialog shows DHCW's focus indicator (STY-041)", async ({
      page,
      sheets,
    }) => {
      const dialog = await openAddRoadmapDialog(page, { withListsIn: sheets })

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
      await main
        .getByRole("note")
        .getByRole("button", { name: "Dismiss message" })
        .click()
      await main
        .getByRole("button", { name: "Edit About this roadmap" })
        .click()
      await main.getByRole("textbox", { name: "Vision" }).fill("My vision.")
      await main.getByRole("button", { name: "Done" }).click()
      sheets.coLead("Roadmaps", "ProductA", "Vision", "Their vision.")
      await main.getByRole("button", { name: "Publish changes" }).click()
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Publish changes" })
        .click()
      await expect(main.getByRole("alert")).toBeFocused()

      await expectEveryStopShowsAnIndicator(page)
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
      // Held, away from the cards, so no card is hovered either.
      await holdConnectedNotice(page)

      // The "Connected" notice's dismiss button, first in the page.
      const notice = main.getByRole("note")
      await expect(notice).toHaveText("Connected to Google")
      const dismiss = notice.getByRole("button", { name: "Dismiss message" })
      await tabTo(page, dismiss)
      await expectIndicator(dismiss, colours, "fill")

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

      const refresh = main.getByRole("button", { name: "Refresh" })
      await tabTo(page, refresh)
      await expectIndicator(refresh, colours, "fill")

      const card = page.getByRole("link", { name: "Product B roadmap" })
      await expect(roadmapCards(page).first()).toHaveText("Product B roadmap")
      await tabTo(page, card)
      // The stretched title link takes focus; the card around it draws the ring.
      await expectIndicator(
        page
          .getByRole("listitem")
          .filter({ has: card })
          .locator(":scope > div"),
        colours,
        "ring",
        card,
      )

      await page.keyboard.press("Enter")
      const back = main.getByRole("link", { name: "Back to roadmaps" })
      await tabTo(page, back)
      await expectIndicator(back, colours, "link")
    })
  })
}
