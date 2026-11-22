import type { Page } from "@playwright/test"

import {
  EXAMPLE_INDEX_ROWS,
  EXAMPLE_LISTS,
  roadmapRow,
  withRoadmapIndex,
} from "./fixtures/fake-sheets"
import { boxOf } from "./fixtures/layout"
import { useLanguage } from "./fixtures/look"
import {
  productDetailsField,
  goToList,
  openProductDetails,
} from "./fixtures/roadmap-page"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * The example roadmaps' titles as the page lists them: grouped by family (Medicines &
 * Diagnostics, Single Record), then the roadmap with no family; Product C is not published.
 */
const EXAMPLE_TITLES = [
  "Product B roadmap",
  "Product A roadmap",
  "Product C roadmap",
]

const [HEADER = [], , PRODUCT_B = []] = EXAMPLE_INDEX_ROWS

/** A card, with what it shows besides its link: the list item of the link named `name`. */
function card(page: Page, name: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name }) })
}

test("connecting shows the roadmaps the roadmap index lists, grouped by family (S1)", async ({
  page,
  gis,
  sheets,
}) => {
  await page.goto("./")
  await connect(page)

  await expect(
    page.getByRole("heading", { level: 1, name: "Your roadmaps" }),
  ).toBeVisible()
  // Every listed roadmap, Product C (not published) too; no card for any tab.
  await expect(roadmapCards(page)).toHaveText(EXAMPLE_TITLES)
  await expect(page.getByText("3 roadmaps, 1 not published")).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Google connected")
  // Connect went with the welcome page; focus moved to the content, not the body.
  await expect(page.getByRole("main")).toBeFocused()
  expect(gis.tokenRequests).toEqual([
    {
      clientId: expect.stringMatching(/\.apps\.googleusercontent\.com$/),
      scope: "https://www.googleapis.com/auth/spreadsheets",
      prompt: undefined,
    },
  ])
  // The tab list, then the first tab's values, both with the granted token.
  expect(sheets.reads).toEqual(["metadata", "values:Roadmaps"])
  expect(sheets.tokens).toEqual([gis.latestToken, gis.latestToken])
})

test("a roadmap index with no roadmaps shows the empty state (S5)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withRoadmapIndex([HEADER])
  await page.goto("./")
  await connect(page)

  await expect(
    page.getByRole("heading", { name: "No roadmaps yet" }),
  ).toBeVisible()
  await expect(roadmapCards(page)).toHaveCount(0)
})

test("Refresh loads the latest roadmaps", async ({ page, sheets }) => {
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveText(EXAMPLE_TITLES)

  sheets.spreadsheet = withRoadmapIndex([HEADER, PRODUCT_B])
  await page.getByRole("button", { name: "Refresh" }).click()

  await expect(roadmapCards(page)).toHaveText(["Product B roadmap"])
  await expect(page.getByText("1 roadmap", { exact: true })).toBeVisible()
  expect(sheets.reads).toEqual([
    "metadata",
    "values:Roadmaps",
    "metadata",
    "values:Roadmaps",
  ])
})

test("a card opens the address of its public page, and Back returns to the list (S2)", async ({
  page,
  sheets,
}) => {
  await page.goto("./")
  await connect(page)
  await roadmapCards(page).filter({ hasText: "Product A roadmap" }).click()

  await expect(page).toHaveURL(/#\/roadmaps\/producta$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "Now" }),
  ).toBeVisible()
  await expect(page.getByRole("main")).toBeFocused()

  await goToList(page)
  await expect(roadmapCards(page)).toHaveText(EXAMPLE_TITLES)
  await expect(page.getByRole("main")).toBeFocused()
  // The detail page and the list share one cached load; only the items were read anew.
  expect(sheets.reads).toEqual([
    "metadata",
    "values:Roadmaps",
    "metadata",
    "values:Roadmaps",
    "values:ProductA",
  ])
})

test("a deep link survives a reload (S2)", async ({ page, gis }) => {
  await page.goto("./#/roadmaps/producta")
  const main = page.getByRole("main")
  await expect(
    main.getByText("Connect Google to view this roadmap."),
  ).toBeVisible()
  await connect(page)
  await expect(
    main.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()

  await page.reload()

  // The token lived in memory only, so the reloaded page asks to connect again.
  await expect(page).toHaveURL(/#\/roadmaps\/producta$/)
  await expect(
    main.getByText("Connect Google to view this roadmap."),
  ).toBeVisible()
  await connect(page)
  await expect(
    main.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()
  expect(gis.tokenRequests).toHaveLength(2)
})

test("a worksheet id is not a roadmap address (S2)", async ({ page }) => {
  await page.goto("./#/roadmaps/0")
  await connect(page)

  await expect(
    page.getByRole("heading", { level: 1, name: "Roadmap not found" }),
  ).toBeVisible()
})

test("cards sit under their product family, each showing the roadmap's information (S1, S2, S4)", async ({
  page,
}) => {
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)

  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Medicines & Diagnostics",
    "Single Record",
    "No product family",
  ])
  const single = main.getByRole("list", { name: "Single Record" })
  await expect(single.getByRole("link")).toHaveCount(1)

  const productA = card(page, "Product A roadmap")
  await expect(productA).toContainText("GP & Community Services")
  await expect(productA).toContainText("Beta")
  await expect(productA).toContainText("Product lead: Alex Jones")
  await expect(productA).toContainText("Updated 1 October 2026")
  await expect(productA).not.toContainText("Not published")

  const productC = card(page, "Product C roadmap")
  await expect(productC).toContainText("Not published")
  await expect(productC).toContainText("Product lead: Sam Evans")
  // Product B has no category and no product lead: nothing is shown in their place.
  await expect(card(page, "Product B roadmap")).not.toContainText(/lead|other/i)
})

test("the cards show Welsh content and copy in Cymraeg (S5)", async ({
  page,
}) => {
  await useLanguage(page, "cy")
  await page.goto("./")
  await page
    .getByRole("main")
    .getByRole("button", { name: "Cysylltu â Google" })
    .click()

  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Meddyginiaethau a Diagnosteg",
    "Single Record",
    "Dim teulu cynnyrch",
  ])
  await expect(main.getByText("3 map trywydd, 1 heb ei gyhoeddi")).toBeVisible()
  const productB = card(page, "Trywydd Cynnyrch B")
  await expect(productB).toContainText("Alffa")
  await expect(productB).toContainText("Diweddarwyd 15 Medi 2026")
  await expect(card(page, "Product A roadmap")).toContainText(
    "Arweinydd cynnyrch: Alex Jones",
  )
  await expect(card(page, "Product C roadmap")).toContainText("Heb ei gyhoeddi")
})

test("a language switch re-sorts the groups and titles (S8)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withRoadmapIndex([
    HEADER,
    roadmapRow({
      Sheet: "one",
      Enabled: "Yes",
      Title: "Zebra",
      Family: "Single Record",
    }),
    roadmapRow({
      Sheet: "two",
      Enabled: "Yes",
      Title: "éclair",
      Family: " single record",
    }),
    roadmapRow({
      Sheet: "three",
      Enabled: "Yes",
      Title: "Product 10 roadmap",
      Family: "Single Récord",
    }),
    roadmapRow({
      Sheet: "four",
      Enabled: "Yes",
      Title: "Alpha",
      "Title (cy)": "Ysgol",
      Family: "Alpha family",
      "Family (cy)": "Teulu Ysgol",
    }),
  ])
  await page.goto("./")
  await connect(page)

  const main = page.getByRole("main")
  // Three spellings are one family; titles sort as people read them.
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Alpha family",
    "Single Record",
  ])
  await expect(
    main.getByRole("list", { name: "Single Record" }).getByRole("link"),
  ).toHaveText(["éclair", "Product 10 roadmap", "Zebra"])

  await page.getByRole("button", { name: "Language English" }).click()
  await page.getByRole("menuitemradio", { name: "Cymraeg" }).click()

  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Single Record",
    "Teulu Ysgol",
  ])
})

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test("long free text wraps within its card, with no horizontal scroll (S7)", async ({
    page,
    sheets,
  }) => {
    sheets.spreadsheet = withRoadmapIndex([
      HEADER,
      roadmapRow({
        Sheet: "long",
        Enabled: "No",
        Title: "A roadmap with a very long title that goes on and on and on",
        Family: "A family name that is long enough to need more than one line",
        "Status label":
          "In private beta with selected health boards and partner organisations",
        "Service description": "Words ".repeat(80),
        "Product Lead": "Alexandria Montgomery-Featherstonehaugh and Sam Evans",
      }),
      roadmapRow({
        Sheet: "unbroken",
        Enabled: "Yes",
        Title: "Unbroken",
        "Status label": "Supercalifragilisticexpialidocious".repeat(3),
      }),
    ])
    await page.goto("./")
    await connect(page)
    await expect(roadmapCards(page)).toHaveCount(2)

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const [badge, box] = await Promise.all([
      page.getByText(/^In private beta/).boundingBox(),
      card(page, "A roadmap with a very long title").boundingBox(),
    ])
    expect(badge?.width).toBeLessThanOrEqual(box?.width ?? 0)
  })
})

/**
 * The example spreadsheet with a family and a category list (ADR-013), and a fourth
 * roadmap whose family the list doesn't have. Product A's own colour and empty Welsh
 * family differ from Single Record's, so it is out of step; Product B's cells match.
 */
function withLists() {
  return [
    ...withRoadmapIndex([
      ...EXAMPLE_INDEX_ROWS,
      roadmapRow({
        Sheet: "ProductD",
        Enabled: "Yes",
        Title: "Product D roadmap",
        Family: "Single Recrod",
      }),
    ]),
    ...EXAMPLE_LISTS,
  ]
}

test("families and categories come from their lists, flagging a roadmap out of step with them (STY-027 S2, S4, S5, S8)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withLists()
  await page.goto("./")
  await connect(page)

  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Medicines & Diagnostics",
    "Single Record",
    "Single Recrod",
    "No product family",
  ])
  expect([...sheets.reads].sort()).toEqual(
    [
      "metadata",
      "values:Categories",
      "values:Families",
      "values:Roadmaps",
    ].sort(),
  )

  const productA = card(page, "Product A roadmap")
  await expect(productA).toContainText("Doesn't match its family or category")
  // The family's colour, not the row's own.
  await expect(productA.locator("span[style]")).toHaveCSS(
    "background-color",
    "rgb(18, 163, 201)",
  )
  await expect(card(page, "Product D roadmap")).toContainText(
    "Family isn't listed",
  )
  for (const name of ["Product B roadmap", "Product C roadmap"]) {
    await expect(card(page, name)).not.toContainText(/match|listed/)
  }

  await productA.getByRole("link").click()
  await expect(
    main.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()
  await expect(
    main.getByText("Doesn't match its family or category"),
  ).toBeVisible()
  // The lists' values, which the row's cells differ from (S4).
  const details = await openProductDetails(page)
  await expect(productDetailsField(details, "Family")).toContainText(
    "Single Record",
  )
  await expect(productDetailsField(details, "Category")).toHaveText(
    "GP & Community Services",
  )
})

test("a family and category read their Welsh names from the lists (STY-027 S5)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withLists()
  await useLanguage(page, "cy")
  await page.goto("./")
  await page
    .getByRole("main")
    .getByRole("button", { name: "Cysylltu â Google" })
    .click()

  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Cofnod Sengl",
    "Meddyginiaethau a Diagnosteg",
    "Single Recrod",
    "Dim teulu cynnyrch",
  ])
  const productA = card(page, "Product A roadmap")
  await expect(productA).toContainText(
    "Meddygon Teulu a Gwasanaethau Cymunedol",
  )
  await expect(productA).toContainText("Yn wahanol i'w deulu neu gategori")
  await expect(card(page, "Product D roadmap")).toContainText(
    "Teulu heb ei restru",
  )
})

test("makes a roadmap out of step match its lists, telling a published one first (STY-030 S1, S2, S3, S4)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withLists()
  await page.goto("./")
  await connect(page)
  const main = page.getByRole("main")

  // Not fixable here: its family isn't in the list (S3).
  await card(page, "Product D roadmap").getByRole("link").click()
  await expect(
    main.getByRole("heading", { level: 1, name: "Product D roadmap" }),
  ).toBeVisible()
  await expect(main.getByText("Family isn't listed")).toBeVisible()
  await expect(main.getByRole("button", { name: /Make it match/ })).toHaveCount(
    0,
  )
  await page.goBack()

  await card(page, "Product A roadmap").getByRole("link").click()
  await main.getByRole("button", { name: /Make it match/ }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText("The public site shows the change after")
  expect(sheets.writes).toEqual([])

  await dialog.getByRole("button", { name: "Make it match" }).click()

  // The items' own status line, which says where a reordered item went, is there too.
  await expect(
    main.getByRole("status").filter({ hasText: "now matches" }),
  ).toContainText(
    "Product A roadmap now matches its family and category. The public site shows it after its next nightly update.",
  )
  await expect(
    main.getByText("Doesn't match its family or category"),
  ).toHaveCount(0)
  expect(sheets.writes).toHaveLength(1)
  const index = sheets.spreadsheet.find(({ title }) => title === "Roadmaps")
  const [names = [], productA = []] = index?.rows ?? []
  expect(productA[names.indexOf("Colour")]).toBe("#12a3c9")
  expect(productA[names.indexOf("Family (cy)")]).toBe("Cofnod Sengl")
})

test.describe("the top of the roadmap list (STY-058)", () => {
  const WIDTHS = [375, 640, 820, 1024, 1280] as const

  // A class a button gains or loses at 640px takes its transition's time to arrive otherwise.
  test.use({ reducedMotion: "reduce" })

  /** The 3 roadmaps, 1 not published: title, count, then Add a roadmap and Refresh. */
  async function openList(page: Page, width: number) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto("./")
    await connect(page)
    await expect(roadmapCards(page)).toHaveText(EXAMPLE_TITLES)
    const main = page.getByRole("main")
    const heading = main.getByRole("heading", { level: 1 })
    const count = main.getByText("3 roadmaps, 1 not published")
    const add = main.getByRole("button", { name: "Add a roadmap" })
    const refresh = main.getByRole("button", { name: "Refresh" })
    return { main, heading, count, add, refresh }
  }

  for (const width of WIDTHS) {
    test(`stacks the title, the count and one row of actions on one left edge at ${String(width)}px (S1, S2)`, async ({
      page,
    }) => {
      const { main, heading, count, add, refresh } = await openList(page, width)

      const [h, c, a, r, first] = await Promise.all([
        boxOf(heading),
        boxOf(count),
        boxOf(add),
        boxOf(refresh),
        boxOf(main.getByRole("heading", { level: 2 }).first()),
      ])
      // A column: title, count, the row of actions, then the first family's heading.
      expect(c.y).toBeGreaterThanOrEqual(h.y + h.height)
      expect(a.y).toBeGreaterThanOrEqual(c.y + c.height)
      expect(first.y).toBeGreaterThanOrEqual(a.y + a.height)
      // One left edge.
      expect(c.x).toBeCloseTo(h.x, 0)
      expect(a.x).toBeCloseTo(h.x, 0)
      expect(first.x).toBeCloseTo(h.x, 0)
      // Add a roadmap then Refresh, on one row, both 40px high.
      expect(r.x).toBeGreaterThan(a.x + a.width)
      expect(r.y).toBeCloseTo(a.y, 0)
      expect(a.height).toBeCloseTo(40, 0)
      expect(r.height).toBeCloseTo(40, 0)
      // Add a roadmap is as wide as its label, never the page's.
      expect(a.width).toBeLessThan(260)
    })
  }

  test("Refresh is a 40px icon button named Refresh on a phone, labelled from 640px (S3)", async ({
    page,
  }) => {
    const phone = await openList(page, 375)
    const icon = await phone.refresh.boundingBox()
    expect(icon?.width).toBeCloseTo(40, 0)
    expect(icon?.height).toBeCloseTo(40, 0)
    await expect(phone.refresh).toHaveAccessibleName("Refresh")
    // Neither the filler nor the families link is under the title.
    await expect(
      phone.main.getByText("Every roadmap, published or not."),
    ).toHaveCount(0)
    await expect(
      phone.main.getByRole("link", {
        name: "Families, categories and organisations",
      }),
    ).toHaveCount(0)
    // The label is there for assistive technology, not drawn.
    const label = await phone.refresh.getByText("Refresh").boundingBox()
    expect(label?.width ?? 0).toBeLessThanOrEqual(1)

    await page.setViewportSize({ width: 640, height: 800 })
    const labelled = await phone.refresh.boundingBox()
    expect(labelled?.width).toBeGreaterThan(70)
    expect(
      (await phone.refresh.getByText("Refresh").boundingBox())?.width ?? 0,
    ).toBeGreaterThan(40)
    await expect(phone.refresh).toHaveAccessibleName("Refresh")
    await expect(phone.refresh).toHaveText("Refresh")
  })

  test("in Cymraeg at 375px the actions fit on one row with no sideways scroll, and Tab goes Add, Refresh, the first roadmap (S5)", async ({
    page,
  }) => {
    await useLanguage(page, "cy")
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto("./")
    await connect(page, "Cysylltu â Google")
    const main = page.getByRole("main")
    const add = main.getByRole("button", { name: "Ychwanegu map trywydd" })
    const refresh = main.getByRole("button", { name: "Adnewyddu" })
    await expect(add).toBeVisible()

    const [a, r] = await Promise.all([add.boundingBox(), refresh.boundingBox()])
    expect(r?.y).toBeCloseTo(a?.y ?? NaN, 0)
    expect((r?.x ?? 0) + (r?.width ?? 0)).toBeLessThanOrEqual(375)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0)

    await add.focus()
    await page.keyboard.press("Tab")
    await expect(refresh).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(roadmapCards(page).first()).toBeFocused()
  })
})
