import type { Page } from "@playwright/test"

import { sessionMs } from "./fixtures/fake-gis"
import {
  openEditItemDialog,
  publishOnce,
  reconnectDialog,
} from "./fixtures/dialogs"
import type { Language } from "./fixtures/look"
import {
  focusClearOfBars,
  LEFT_THE_CONTENT,
  namesShownInStuckRow,
  openLongRoadmap,
} from "./fixtures/roadmap-page"
import { expect, test } from "./fixtures/test"

/**
 * STY-052: as a roadmap's page scrolls, its header sticks at the top of the screen
 * and its pending changes pin at the foot; a publish's outcome shows there, and
 * nothing pinned hides what has focus. Where the screen is too short, nothing pins.
 */

const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 375, height: 812 }

const COPY = {
  en: {
    edit: "Edit",
    title: "Title",
    done: "Done",
    later: "Later",
  },
  cy: {
    edit: "Golygu",
    title: "Teitl (Saesneg)",
    done: "Gorffen",
    later: "Hwyrach",
  },
} as const satisfies Record<Language, Record<string, string>>

/** Retitles an item, leaving one change pending. */
async function editTitle(page: Page, from: string, language: Language = "en") {
  const copy = COPY[language]
  const form = await openEditItemDialog(page, from, language)
  await form.getByRole("textbox", { name: copy.title }).fill(`${from}, edited`)
  await form.getByRole("button", { name: copy.done }).click()
  await expect(form).toBeHidden()
}

/** Scrolls the placement heading `name` to the top of the page's content. */
async function scrollTo(page: Page, name: string) {
  await page
    .getByRole("heading", { level: 2, name, exact: true })
    .evaluate((heading) => {
      heading.scrollIntoView({ block: "center" })
    })
  await expect(page.locator("[data-stuck]")).toBeVisible()
}

for (const [device, size] of [
  ["a desktop", DESKTOP],
  ["a phone", PHONE],
] as const) {
  test(`keeps the title, Add an item, the pending count, Publish and Discard in view on ${device} (S1, S2)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize(size)
    await openLongRoadmap(page, sheets)
    const main = page.getByRole("main")
    await expect(main.getByText(/unpublished change/)).toHaveCount(0)
    await editTitle(page, "Planned work 3")

    await scrollTo(page, "Later")

    await expect(
      main.getByRole("heading", { level: 1, name: "Product A roadmap" }),
    ).toBeInViewport()
    await expect(
      main.getByRole("button", { name: "Add an item" }),
    ).toBeInViewport()
    await expect(main.getByText("1 unpublished change")).toBeInViewport()
    await expect(
      main.getByRole("button", { name: "Publish changes" }),
    ).toBeInViewport()
    await expect(
      main.getByRole("button", { name: "Discard all changes" }),
    ).toBeInViewport()

    // Edit product details, Refresh and Unpublish roadmap are a press away, in More
    // (S1, D6, STY-065 S5).
    await main.getByRole("button", { name: "More", exact: true }).click()
    const menu = page.getByRole("menu")
    await expect(menu.getByRole("menuitem")).toHaveText([
      "Edit product details",
      "Refresh",
      "Unpublish roadmap",
    ])
  })
}

test("counts a change made far down the page at once, focus following the card clear of the bars (S3, S5)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)
  await scrollTo(page, "Later")
  const main = page.getByRole("main")

  await main.getByRole("button", { name: "Move Planned work 3" }).click()
  await page.getByRole("menuitem", { name: "Next" }).click()

  await expect(main.getByText("1 unpublished change")).toBeInViewport()
  await expect(
    main.getByRole("button", { name: "Move Planned work 3" }),
  ).toBeFocused()
  expect(await focusClearOfBars(page)).toBeNull()
})

test("shows a publish's outcome at the foot, where it was published from, focus on it (S4)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)
  await editTitle(page, "Planned work 3")
  await scrollTo(page, "Later")
  const later = page.getByRole("heading", { level: 2, name: "Later" })
  const before = await later.boundingBox()
  const main = page.getByRole("main")

  await main.getByRole("button", { name: "Publish changes" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish changes" })
    .click()

  const outcome = main
    .getByRole("status")
    .filter({ hasText: /^Changes published\./ })
  await expect(outcome).toBeFocused()
  await expect(outcome).toBeInViewport()
  await expect(main.getByText(/unpublished change/)).toHaveCount(0)
  // The page did not jump.
  expect((await later.boundingBox())?.y).toBe(before?.y)
})

test("stacks a failed publish's notice above the bar, which stays (S4, D14)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)
  await editTitle(page, "Planned work 3")
  await scrollTo(page, "Later")
  const main = page.getByRole("main")
  sheets.failWith(403)

  await main.getByRole("button", { name: "Publish changes" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish changes" })
    .click()

  const failure = main
    .getByRole("alert")
    .filter({ hasText: "Couldn't publish your changes" })
  await expect(failure).toBeFocused()
  await expect(failure).toBeInViewport()
  await expect(main.getByText("1 unpublished change")).toBeInViewport()
  await expect(
    main.getByRole("button", { name: "Publish changes" }),
  ).toBeInViewport()
})

test("keeps every control focused by Tab, forwards and backwards, clear of the bars (S5)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openLongRoadmap(page, sheets)
  await editTitle(page, "Planned work 3")
  await scrollTo(page, "Next")
  await page
    .getByRole("main")
    .getByRole("button", { name: "Move Planned work 2" })
    .focus()

  // Down through Later, then back up to the top of the page's content.
  const hidden: string[] = []
  let stops = 0
  const tour = async (key: string, presses: number) => {
    for (let press = 0; press < presses; press++) {
      await page.keyboard.press(key)
      const problem = await focusClearOfBars(page)
      if (problem === LEFT_THE_CONTENT) return
      stops++
      if (problem) hidden.push(`${key}: ${problem}`)
    }
  }
  await tour("Tab", 20)
  await tour("Shift+Tab", 200)
  // The tour crossed the page, under both bars.
  expect(stops).toBeGreaterThan(40)
  expect(hidden).toEqual([])
})

/**
 * Puts the control named `name` behind the bar at `edge`, still on the screen, and
 * focuses the control next to it in the Tab order, on the side `key` comes from: the
 * press then lands on a control the browser need not scroll to, but for the bar.
 */
async function behindTheBar(
  page: Page,
  name: string,
  edge: "top" | "bottom",
  key: "Tab" | "Shift+Tab",
) {
  await page.evaluate(
    ({ name, edge, key }) => {
      const stops = [...document.querySelectorAll<HTMLElement>("main button")]
      const index = stops.findIndex(
        (stop) =>
          stop.getAttribute("aria-label") === name ||
          stop.textContent.trim() === name,
      )
      const target = stops[index]
      const from = stops[key === "Tab" ? index - 1 : index + 1]
      if (!target || !from) throw new Error(`No ${name}, or nothing beside it`)
      const box = target.getBoundingClientRect()
      window.scrollBy(
        0,
        edge === "top" ? box.top - 4 : box.bottom - window.innerHeight + 4,
      )
      from.focus({ preventScroll: true })
    },
    { name, edge, key },
  )
  await expect(page.locator("[data-stuck]")).toBeVisible()
}

for (const [edge, key] of [
  ["top", "Shift+Tab"],
  ["bottom", "Tab"],
] as const) {
  test(`scrolls a control reached by ${key} out from behind the bar at the ${edge} (S5, D18)`, async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize(DESKTOP)
    await openLongRoadmap(page, sheets)
    await editTitle(page, "Planned work 3")
    await scrollTo(page, "Later")
    await behindTheBar(page, "Move Planned work 7", edge, key)

    await page.keyboard.press(key)

    await expect(
      page
        .getByRole("main")
        .getByRole("button", { name: "Move Planned work 7" }),
    ).toBeFocused()
    expect(await focusClearOfBars(page)).toBeNull()
  })
}

test("moves Publish roadmap into More once the row sticks, at every width, where on a phone Add an item and More are icons (D18, STY-059 S6, D7, STY-060 D2)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(PHONE)
  await openLongRoadmap(page, sheets, { tab: "ProductC" })
  const main = page.getByRole("main")
  const publishRoadmap = main.getByRole("button", { name: "Publish roadmap" })
  const addItem = main.getByRole("button", { name: "Add an item" })
  const more = main.getByRole("button", { name: "More", exact: true })
  const menuItems = page.getByRole("menu").getByRole("menuitem")
  await expect(publishRoadmap).toBeVisible()
  await more.click()
  // The Not published notice holds Publish roadmap at the top (STY-065 S4).
  await expect(menuItems).toHaveText(["Edit product details", "Refresh"])
  await page.keyboard.press("Escape")

  await scrollTo(page, "Later")

  expect(await namesShownInStuckRow(page)).not.toContain("Publish roadmap")
  await expect(addItem).toBeInViewport()
  await expect(addItem).toHaveCSS("width", "40px")
  // An ellipsis and a chevron, its label hidden (STY-060 D2, D5).
  expect((await more.boundingBox())?.width).toBeLessThan(70)
  await more.click()
  await expect(menuItems).toHaveText([
    "Edit product details",
    "Refresh",
    "Publish roadmap",
  ])
  await page.keyboard.press("Escape")

  await page.setViewportSize(DESKTOP)

  await expect(page.locator("[data-stuck]")).toBeVisible()
  expect(await namesShownInStuckRow(page)).not.toContain("Publish roadmap")
  await expect(addItem).toHaveText("Add an item")
  expect((await more.boundingBox())?.width).toBeGreaterThan(70)
  await more.click()
  await expect(menuItems).toHaveText([
    "Edit product details",
    "Refresh",
    "Publish roadmap",
  ])
})

test("keeps the count, Publish and Discard in view under a notice too long for the room at the foot of a phone (D14)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(PHONE)
  await openLongRoadmap(page, sheets)
  await publishOnce(page)
  const removed = [1, 2, 3, 4, 5, 6].map(
    (each) => `Planned work ${String(each)}`,
  )
  for (const title of [...removed, "Planned work 7"])
    await editTitle(page, title)
  for (const title of removed) sheets.coLead("ProductA", title, "Title", null)
  const main = page.getByRole("main")

  await main.getByRole("button", { name: "Publish changes" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish changes" })
    .click()

  const notice = main
    .getByRole("alert")
    .filter({ hasText: "Some changes couldn't be kept" })
  await expect(notice).toBeFocused()
  await expect(notice.getByText(/^Someone else has removed/)).toHaveCount(6)
  for (const control of [
    main.getByText("1 unpublished change"),
    main.getByRole("button", { name: "Publish changes" }),
    main.getByRole("button", { name: "Discard all changes" }),
  ]) {
    await expect(control).toBeInViewport({ ratio: 1 })
  }
  // The notices scroll inside the foot, the bar below them.
  expect(
    await notice.evaluate((each) => {
      const region = each.closest("[data-slot=pinned-notices]")
      return region !== null && region.scrollHeight > region.clientHeight
    }),
  ).toBe(true)
})

test("pins nothing on a screen too short to spare it, as at 400% zoom, with no sideways scroll (S6)", async ({
  page,
  sheets,
}) => {
  // 1280×800 at 400% zoom.
  await page.setViewportSize({ width: 320, height: 200 })
  await openLongRoadmap(page, sheets)
  await editTitle(page, "Planned work 3")

  await page
    .getByRole("heading", { level: 2, name: "Later" })
    .evaluate((heading) => {
      heading.scrollIntoView({ block: "start" })
    })

  const main = page.getByRole("main")
  await expect(page.locator("[data-stuck]")).toHaveCount(0)
  await expect(page.locator("[data-pinned]")).toHaveCount(0)
  await expect(
    main.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).not.toBeInViewport()
  await expect(main.getByText("1 unpublished change")).not.toBeInViewport()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test("fits the pinned controls in Cymraeg on a 375px phone, cutting no label (S7)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(PHONE)
  await openLongRoadmap(page, sheets, { language: "cy" })
  await editTitle(page, "Planned work 3", "cy")

  await scrollTo(page, COPY.cy.later)

  const main = page.getByRole("main")
  const controls = [
    main.getByRole("button", { name: "Mwy", exact: true }),
    main.getByRole("button", { name: "Ychwanegu eitem" }),
    main.getByRole("button", { name: "Cyhoeddi'r newidiadau" }),
    main.getByRole("button", { name: "Gwaredu pob newid" }),
  ]
  for (const control of controls) {
    await expect(control).toBeInViewport({ ratio: 1 })
    expect(
      await control.evaluate((each) => each.scrollWidth <= each.clientWidth),
    ).toBe(true)
  }
  await expect(main.getByText("1 newid heb ei gyhoeddi")).toBeInViewport()
  // Stuck, the title is cut with an ellipsis after two lines, its name kept (STY-060
  // S3).
  const title = main.getByRole("heading", {
    level: 1,
    name: "Product A roadmap",
  })
  await expect(title).toHaveCSS("-webkit-line-clamp", "2")
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test("keeps the count and Publish in view once the session has expired, Publish asking to reconnect (S8)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await page.clock.install()
  await openLongRoadmap(page, sheets)
  await editTitle(page, "Planned work 3")
  await page.clock.fastForward(sessionMs())
  // The session warning closes as the session ends, and the page says it has.
  await page.keyboard.press("Escape")
  const main = page.getByRole("main")
  await expect(main.getByText("Your session has expired")).toBeVisible()

  await scrollTo(page, "Later")

  await expect(main.getByText("1 unpublished change")).toBeInViewport()
  const publish = main.getByRole("button", { name: "Publish changes" })
  await expect(publish).toBeInViewport()
  await publish.click()
  await expect(reconnectDialog(page)).toBeVisible()
})
