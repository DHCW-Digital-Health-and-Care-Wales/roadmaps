import type { Page } from "@playwright/test"

import { appConfig } from "./fixtures/app-config"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * The fake's side of a publish (STY-023 S11), until a screen publishes (STY-025): the
 * page sends a `batchUpdate` as the repository does and reads the result back.
 */

const SPREADSHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${appConfig.spreadsheetId}`

/** Sends a request from the page, as the app's client does; resolves to its status. */
function sendFromPage(
  page: Page,
  {
    method,
    path,
    token,
    body,
  }: { method: string; path: string; token: string; body?: unknown },
): Promise<number> {
  return page.evaluate(
    async ({ url, method, token, body }) => {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      return response.status
    },
    { url: `${SPREADSHEET_URL}${path}`, method, token, body },
  )
}

/** A text cell of the roadmap index (sheetId 0) at this 0-based row and column. */
function indexCell(rowIndex: number, columnIndex: number, stringValue: string) {
  return {
    updateCells: {
      start: { sheetId: 0, rowIndex, columnIndex },
      rows: [{ values: [{ userEnteredValue: { stringValue } }] }],
      fields: "userEnteredValue",
    },
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)
})

test("applies a batchUpdate, so later reads see it, and records it", async ({
  page,
  gis,
  sheets,
}) => {
  const token = gis.latestToken ?? ""
  // The index's Title column is its third (Roadmaps.csv).
  const body = { requests: [indexCell(1, 2, "Product A, renamed")] }

  const status = await sendFromPage(page, {
    method: "POST",
    path: ":batchUpdate",
    token,
    body,
  })

  expect(status).toBe(200)
  expect(sheets.writes).toEqual([body])
  expect(sheets.spreadsheet[0]?.rows[1]?.[2]).toBe("Product A, renamed")
  await page.getByRole("button", { name: "Refresh" }).click()
  await expect(
    roadmapCards(page).filter({ hasText: "Product A, renamed" }),
  ).toHaveCount(1)
})

test("records a write the editor must never make as a violation", async ({
  page,
  gis,
  sheets,
}) => {
  const token = gis.latestToken ?? ""

  // `Last updated` is the index's seventh column; a number is not text.
  await sendFromPage(page, {
    method: "POST",
    path: ":batchUpdate",
    token,
    body: { requests: [indexCell(1, 6, "2026-11-12")] },
  })
  await sendFromPage(page, {
    method: "POST",
    path: ":batchUpdate",
    token,
    body: {
      requests: [
        {
          updateCells: {
            ...indexCell(1, 2, "").updateCells,
            rows: [{ values: [{ userEnteredValue: { formulaValue: "=1" } }] }],
          },
        },
      ],
    },
  })
  await sendFromPage(page, { method: "PUT", path: "", token })

  expect(sheets.violations.splice(0)).toEqual([
    expect.stringContaining("Last updated"),
    expect.stringContaining("written as"),
    expect.stringContaining("PUT"),
  ])
})
