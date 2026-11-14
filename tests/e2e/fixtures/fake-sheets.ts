import { readFileSync } from "node:fs"
import path from "node:path"

import type { Page, Route } from "@playwright/test"

import {
  applyBatchUpdate,
  TEMPLATE_TAB,
  type GridTab,
} from "../../fixtures/sheets/apply-batch-update"
import { parseCsv } from "../../fixtures/sheets/parse-csv"

import { appConfig } from "./app-config"
import type { FakeGis } from "./fake-gis"

const SPREADSHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets"

/** The partial-response mask of the tab list read, exactly. */
const METADATA_FIELDS =
  "sheets(properties(sheetId,title,index,hidden,gridProperties(rowCount,columnCount,frozenRowCount)))"

/** The query of every values read, exactly (ADR-009, ADR-011). */
const VALUES_QUERY: Readonly<Record<string, string>> = {
  majorDimension: "ROWS",
  valueRenderOption: "FORMATTED_VALUE",
  fields: "values",
}

/**
 * One tab of the fake spreadsheet: its title, whether it is hidden, its cells, and its
 * grid's size, by default just large enough for its cells. Its ID is its place among
 * the tabs times a thousand, unless given, as a tab the app copied has.
 */
export interface FakeTab {
  title: string
  sheetId?: number
  hidden?: boolean
  /** The rows frozen at the top; none unless given. */
  frozenRowCount?: number
  rows: readonly (readonly string[])[]
  rowCount?: number
  columnCount?: number
}

/**
 * A read the app makes: the tab list (`metadata`), the values of the tab with this
 * title (`values:Roadmaps`), or the header row alone of the `Template` tab
 * (`header:Template`). A list load is the tab list, then the first tab's values; a
 * roadmap's items add its own tab's values (ADR-011); adding a roadmap reads the index
 * and the lists, then the `Template`'s header (STY-040).
 */
export type SheetsRead = "metadata" | `values:${string}` | `header:${string}`

const FIXTURES = path.resolve(import.meta.dirname, "../../fixtures/sheets")

function readCsv(file: string): string[][] {
  return parseCsv(readFileSync(path.join(FIXTURES, file), "utf8"))
}

/** The example spreadsheet's roadmap index (`tests/fixtures/sheets/Roadmaps.csv`). */
export const EXAMPLE_INDEX_ROWS: readonly (readonly string[])[] =
  readCsv("Roadmaps.csv")

/**
 * The spreadsheet tests see unless they say otherwise: the example spreadsheet, its
 * roadmap index first, a tab per roadmap, then the `Template` a new roadmap is copied
 * from, its header frozen (`tests/fixtures/sheets/`).
 */
export const EXAMPLE_SPREADSHEET: readonly FakeTab[] = [
  { title: "Roadmaps", rows: EXAMPLE_INDEX_ROWS },
  { title: "ProductA", rows: readCsv("ProductA.csv") },
  { title: "ProductB", rows: readCsv("ProductB.csv") },
  { title: "ProductC", rows: readCsv("ProductC.csv") },
  { title: TEMPLATE_TAB, rows: readCsv("Template.csv"), frozenRowCount: 1 },
]

/**
 * A family and a category list (ADR-013), to add to a spreadsheet: Product A's and B's
 * families, and two categories, the first Product A's.
 */
export const EXAMPLE_LISTS: readonly FakeTab[] = [
  {
    title: "Families",
    rows: [
      ["ID", "Name", "Name (cy)", "Colour"],
      ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12a3c9"],
      [
        "vdkxj63m",
        "Medicines & Diagnostics",
        "Meddyginiaethau a Diagnosteg",
        "#006747",
      ],
    ],
  },
  {
    title: "Categories",
    rows: [
      ["ID", "Name", "Name (cy)"],
      [
        "khzpchkh",
        "GP & Community Services",
        "Meddygon Teulu a Gwasanaethau Cymunedol",
      ],
      ["w7vrv5kn", "Tests, Scans & Results", "Profion, Sganiau a Chanlyniadau"],
    ],
  },
]

/**
 * One row of the roadmap index, in the example header's column order, from the cells to
 * set by header name (the rest blank): `roadmapRow({ Sheet: "x", Colour: "#ffffff" })`.
 */
export function roadmapRow(cells: Readonly<Record<string, string>>): string[] {
  const [header = []] = EXAMPLE_INDEX_ROWS
  const unknown = Object.keys(cells).filter((name) => !header.includes(name))
  if (unknown.length > 0) {
    throw new Error(`Not columns of the example index: ${unknown.join(", ")}`)
  }
  return header.map((name) => cells[name] ?? "")
}

/** The example spreadsheet with its roadmap index's rows replaced. */
export function withRoadmapIndex(
  rows: readonly (readonly string[])[],
): FakeTab[] {
  const [index, ...tabs] = EXAMPLE_SPREADSHEET
  return [{ title: index?.title ?? "Roadmaps", rows }, ...tabs]
}

/** The example spreadsheet with the rows of its tab named `title` replaced. */
export function withTabRows(title: string, rows: FakeTab["rows"]): FakeTab[] {
  return EXAMPLE_SPREADSHEET.map((tab) =>
    tab.title === title ? { ...tab, rows } : tab,
  )
}

/**
 * The example spreadsheet with its roadmap tab named `title` holding its header, then
 * a row for each of `items`, its `Title` and `Horizon` (the rest blank): with no
 * items, a roadmap that has none.
 */
export function withTabItems(
  title: string,
  ...items: [title: string, horizon: string][]
): FakeTab[] {
  const [header = []] =
    EXAMPLE_SPREADSHEET.find((tab) => tab.title === title)?.rows ?? []
  return withTabRows(title, [
    header,
    ...items.map(([itemTitle, horizon]) =>
      header.map((name) =>
        name === "Title" ? itemTitle : name === "Horizon" ? horizon : "",
      ),
    ),
  ])
}

/** A request the fake answers: the tab list, one tab's values or header row, or a write. */
type SheetsRequest =
  | { kind: "metadata" }
  | { kind: "values" | "header"; tab: FakeTab }
  | { kind: "batchUpdate" }

/** Google's canonical status names, for its JSON error envelope. */
const STATUS_NAMES: Readonly<Record<number, string>> = {
  400: "INVALID_ARGUMENT",
  401: "UNAUTHENTICATED",
  403: "PERMISSION_DENIED",
  404: "NOT_FOUND",
  429: "RESOURCE_EXHAUSTED",
  500: "INTERNAL",
  503: "UNAVAILABLE",
}

/**
 * The Google Sheets API, faked: answers the configured spreadsheet's tab list and any of
 * its tabs' values, applies a `batchUpdate` all or nothing, and checks every request the
 * way the real API would (method, path, query, bearer token). Reading a tab that does not
 * exist is a violation too, as the app checks the tab list first; so is reading the
 * `Template` tab beyond its header row, or any other tab's header alone; and so is a
 * write the editor must never make (`applyBatchUpdate`: the `Template` but as the source
 * of a copy, Welsh, `Last updated` but as `YYYY-MM-DD`, a value other than text, an
 * unchanged cell).
 */
export class FakeSheets {
  /** The bearer token of every request, in order (`null` without one). */
  readonly tokens: (string | null)[] = []
  /** The reads answered or failed, in order. */
  readonly reads: SheetsRead[] = []
  /** The body of every `batchUpdate` applied, in order. */
  readonly writes: unknown[] = []
  /** Requests the real API would reject; the fixture fails the test if there are any. */
  readonly violations: string[] = []
  /** What the spreadsheet holds; replace it to change what later reads see. */
  spreadsheet: readonly FakeTab[] = EXAMPLE_SPREADSHEET

  readonly #failures: number[] = []
  readonly #gis: FakeGis
  #held: Promise<void> | undefined

  constructor(gis: FakeGis) {
    this.#gis = gis
  }

  /** Fails the next requests, read or write, with these HTTP statuses, one each. */
  failWith(...statuses: number[]): void {
    this.#failures.push(...statuses)
  }

  /**
   * A co-lead's edit straight to the spreadsheet, seen by later reads: the cell under
   * `header` in the row of `tab` whose first cell is `key` (an item's title, or a
   * roadmap's `Sheet`), or that whole row deleted when `value` is `null`.
   */
  coLead(tab: string, key: string, header: string, value: string | null): void {
    this.spreadsheet = this.spreadsheet.map((sheet) => {
      if (sheet.title !== tab) return sheet
      const column = sheet.rows[0]?.indexOf(header) ?? -1
      if (column < 0) throw new Error(`No ${header} column in ${tab}`)
      if (!sheet.rows.some((row) => row[0] === key)) {
        throw new Error(`No ${key} row in ${tab}`)
      }
      return {
        ...sheet,
        rows: sheet.rows.flatMap((row) => {
          if (row[0] !== key) return [row]
          if (value === null) return []
          return [row.map((cell, i) => (i === column ? value : cell))]
        }),
      }
    })
  }

  /** Holds back replies until the returned `release` is called, to observe loading. */
  hold(): () => void {
    let resolve: () => void = () => undefined
    this.#held = new Promise<void>((done) => {
      resolve = done
    })
    return () => {
      this.#held = undefined
      resolve()
    }
  }

  async install(page: Page): Promise<void> {
    await page.route(`${SPREADSHEETS_URL}/**`, (route) => this.#handle(route))
  }

  async #handle(route: Route): Promise<void> {
    const request = route.request()
    const url = new URL(request.url())
    const authorization = await request.headerValue("authorization")
    const token = /^Bearer (\S+)$/.exec(authorization ?? "")?.[1] ?? null
    this.tokens.push(token)

    const read = this.#requestOf(request.method(), url)
    if ("status" in read) {
      return this.#reject(route, read.status, read.detail)
    }
    const query = {
      metadata: { fields: METADATA_FIELDS },
      values: VALUES_QUERY,
      header: VALUES_QUERY,
      batchUpdate: {},
    }[read.kind]
    if (!hasQuery(url, query)) {
      return this.#reject(route, 400, `query ${url.search}`)
    }
    if (!token || !this.#gis.accepts(token)) {
      return this.#reject(route, 401, `Authorization: ${authorization ?? "-"}`)
    }

    await this.#held
    if (read.kind !== "batchUpdate") {
      this.reads.push(
        read.kind === "metadata"
          ? "metadata"
          : `${read.kind}:${read.tab.title}`,
      )
    }
    const failure = this.#failures.shift()
    if (failure !== undefined) {
      return fulfil(route, failure, errorBody(failure))
    }
    if (read.kind === "batchUpdate") {
      return this.#write(route, request.postDataJSON())
    }
    if (read.kind === "metadata") {
      return fulfil(route, 200, {
        // The `fields` mask: only these properties. Google omits `0` and `false`.
        sheets: this.#grids().map(
          (
            { sheetId, title, hidden, rowCount, columnCount, frozenRowCount },
            index,
          ) => ({
            properties: {
              sheetId,
              title,
              ...(index > 0 && { index }),
              ...(hidden && { hidden }),
              gridProperties: {
                rowCount,
                columnCount,
                ...(frozenRowCount && { frozenRowCount }),
              },
            },
          }),
        ),
      })
    }
    const rows = trimRows(
      read.kind === "header" ? read.tab.rows.slice(0, 1) : read.tab.rows,
    )
    // Google omits `values` for a tab with no cells.
    return fulfil(route, 200, rows.length > 0 ? { values: rows } : {})
  }

  /** Applies a `batchUpdate` all or nothing, as Google does, recording what it must not hold. */
  #write(route: Route, body: unknown): Promise<void> {
    const result = applyBatchUpdate(this.#grids(), body)
    this.violations.push(...result.violations)
    if ("error" in result) {
      this.violations.push(`batchUpdate rejected: ${result.error}`)
      return fulfil(route, 400, errorBody(400))
    }
    this.writes.push(body)
    this.spreadsheet = result.tabs
    return fulfil(route, 200, {
      spreadsheetId: appConfig.spreadsheetId,
      replies: [],
    })
  }

  /** The spreadsheet's tabs as grids a write addresses, by `sheetId`. */
  #grids(): GridTab[] {
    return this.spreadsheet.map(
      ({ sheetId, rows, rowCount, columnCount, ...tab }, i) => ({
        ...tab,
        sheetId: sheetId ?? i * 1_000,
        rows: rows.map((row) => [...row]),
        rowCount: rowCount ?? Math.max(1, rows.length),
        columnCount:
          columnCount ?? Math.max(1, ...rows.map((row) => row.length)),
      }),
    )
  }

  /** Which request this is, or how the real API (or the app's contract) rejects it. */
  #requestOf(
    method: string,
    url: URL,
  ): SheetsRequest | { status: number; detail: string } {
    const spreadsheetPath = `/v4/spreadsheets/${appConfig.spreadsheetId}`
    const valuesPrefix = `${spreadsheetPath}/values/`
    if (method === "GET" && url.pathname === spreadsheetPath) {
      return { kind: "metadata" }
    }
    if (
      method === "POST" &&
      url.pathname === `${spreadsheetPath}:batchUpdate`
    ) {
      return { kind: "batchUpdate" }
    }
    if (method !== "GET" || !url.pathname.startsWith(valuesPrefix)) {
      return { status: 404, detail: `${method} ${url.pathname}` }
    }
    const range = decodeURIComponent(url.pathname.slice(valuesPrefix.length))
    // A whole tab, its title quoted with any quote doubled, as one path segment; or,
    // for the `Template` alone, its header row. An index named `Template` is read
    // whole, as any index is.
    const quoted = (tab: FakeTab) => `'${tab.title.replaceAll("'", "''")}'`
    const headerOnly = (tab: FakeTab) =>
      tab.title === TEMPLATE_TAB && tab !== this.spreadsheet[0]
    for (const tab of this.spreadsheet) {
      if (headerOnly(tab) && range === `${quoted(tab)}!1:1`) {
        return { kind: "header", tab }
      }
      if (!headerOnly(tab) && range === quoted(tab)) {
        return { kind: "values", tab }
      }
    }
    return { status: 400, detail: `values of ${range}, not a tab's to read` }
  }

  #reject(route: Route, status: number, detail: string): Promise<void> {
    this.violations.push(`Unexpected Sheets request (${detail})`)
    return fulfil(route, status, errorBody(status))
  }
}

/** Whether the URL's query is exactly these parameters, in any order. */
function hasQuery(
  url: URL,
  expected: Readonly<Record<string, string>>,
): boolean {
  const query = [...url.searchParams]
  return (
    query.length === Object.keys(expected).length &&
    query.every(([name, value]) => expected[name] === value)
  )
}

/** The rows as Google sends them: trailing blank cells and rows dropped. */
function trimRows(rows: readonly (readonly string[])[]): string[][] {
  const trimmed = rows.map((row) => {
    const cells = [...row]
    while (cells.at(-1) === "") cells.pop()
    return cells
  })
  while (trimmed.at(-1)?.length === 0) trimmed.pop()
  return trimmed
}

function errorBody(code: number) {
  return {
    error: {
      code,
      message: `Fake Sheets API error ${String(code)}`,
      status: STATUS_NAMES[code] ?? "UNKNOWN",
    },
  }
}

async function fulfil(
  route: Route,
  status: number,
  json: unknown,
): Promise<void> {
  const origin = await route.request().headerValue("origin")
  await route.fulfill({
    status,
    json,
    // Cross-origin, like the real API.
    headers: { "access-control-allow-origin": origin ?? "*", vary: "Origin" },
  })
}
