import type { Page } from "@playwright/test"

import { EXAMPLE_INDEX_ROWS, withRoadmapIndex } from "./fixtures/fake-sheets"
import { type Language, useLanguage } from "./fixtures/look"
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

test.beforeEach(async ({ page }) => {
  // Fixed time: the "Connected" notice stays until the clock moves, and a countdown
  // reads the same every run.
  await page.clock.install()
})

async function connectTo(page: Page, language: Language) {
  await page.goto("./")
  await connect(page, CONNECT[language])
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

      await expect(main).toMatchAriaSnapshot({
        name: snapshotName("start-ready", language),
      })
    })

    test("start page, after an error", async ({ page, gis }) => {
      gis.respondWith({ type: "access-denied" })
      await connectTo(page, language)
      const main = page.getByRole("main")
      await expect(main.getByRole("alert")).toBeVisible()

      await expect(main).toMatchAriaSnapshot({
        name: snapshotName("start-error", language),
      })
    })

    test("main page, roadmaps", async ({ page }) => {
      await connectTo(page, language)
      await expect(roadmapCards(page)).toHaveCount(3)

      await expect(page.getByRole("main")).toMatchAriaSnapshot({
        name: snapshotName("main-roadmaps", language),
      })
    })

    test("main page, no roadmaps", async ({ page, sheets }) => {
      sheets.spreadsheet = withRoadmapIndex([HEADER])
      await connectTo(page, language)
      const main = page.getByRole("main")
      await expect(main.getByRole("heading", { level: 2 })).toBeVisible()

      await expect(main).toMatchAriaSnapshot({
        name: snapshotName("main-empty", language),
      })
    })

    test("main page, a failed load", async ({ page, sheets }) => {
      // 403 is not retried, so no back-off to wait out.
      sheets.failWith(403)
      await connectTo(page, language)
      const main = page.getByRole("main")
      await expect(main.getByRole("alert")).toBeVisible()

      await expect(main).toMatchAriaSnapshot({
        name: snapshotName("main-failed", language),
      })
    })

    test("main page, expired with roadmaps", async ({ page, gis }) => {
      // Usable for four minutes (the app stops 60 s before Google's expiry).
      gis.respondWith({ type: "grant", expiresIn: 300 })
      await connectTo(page, language)
      await expect(roadmapCards(page)).toHaveCount(3)
      await page.clock.fastForward("04:00")
      const main = page.getByRole("main")
      await expect(main.getByRole("alert")).toBeVisible()

      await expect(main).toMatchAriaSnapshot({
        name: snapshotName("main-expired", language),
      })
    })
  })
}

test("a roadmap's detail page", async ({ page }) => {
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()

  await expect(page.getByRole("main")).toMatchAriaSnapshot({
    name: "detail.aria.yml",
  })
})

test("the not-found page", async ({ page }) => {
  await page.goto("./#/nowhere")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page not found",
  )

  await expect(page.getByRole("main")).toMatchAriaSnapshot({
    name: "not-found.aria.yml",
  })
})

test("the language menu, open", async ({ page }) => {
  await page.goto("./")
  await page.getByRole("button", { name: "Language English" }).click()
  const menu = page.getByRole("menu")
  await expect(menu).toBeVisible()

  await expect(menu).toMatchAriaSnapshot({ name: "language-menu.aria.yml" })
})

test("the session warning", async ({ page }) => {
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)
  // The fake's 3599 s grant less the app's 60 s margin, less the two minutes' warning.
  await page.clock.fastForward((3599 - 60 - 120) * 1000)
  const warning = page.getByRole("alertdialog")
  await expect(warning).toBeVisible()

  await expect(warning).toMatchAriaSnapshot({
    name: "session-warning.aria.yml",
  })
})

test.describe("the shell", () => {
  test("signed out and connected, in English and Cymraeg", async ({ page }) => {
    await page.goto("./")
    const header = page.getByRole("banner")
    await expect(header.getByRole("status")).toHaveText("Not connected")
    await expect(header).toMatchAriaSnapshot({ name: "header.aria.yml" })
    await expect(page.locator("[data-slot=phase-banner]")).toMatchAriaSnapshot({
      name: "phase-banner.aria.yml",
    })

    await connect(page)
    await expect(roadmapCards(page)).toHaveCount(3)
    await expect(header).toMatchAriaSnapshot({
      name: "header-connected.aria.yml",
    })

    await page.getByRole("button", { name: "Language English" }).click()
    await page.getByRole("menuitemradio", { name: "Cymraeg" }).click()
    await expect(header.getByRole("status")).toHaveText(
      "Wedi cysylltu â Google",
    )
    await expect(header).toMatchAriaSnapshot({
      name: "header-connected-cy.aria.yml",
    })
  })
})
