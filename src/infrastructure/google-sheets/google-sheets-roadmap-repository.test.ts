import { HttpResponse } from "msw"
import { http } from "msw/http"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import { dropPublishedNewItems } from "@/domain/roadmap/new-item"
import type { NewRoadmapInput } from "@/domain/roadmap/new-roadmap"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { orderedItem } from "@/domain/roadmap/placement-order"
import {
  markedUpdated,
  NO_CHANGES,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { CO_LEAD_VALUE } from "@/domain/roadmap/testing/contract-write"
import { categoriesOf, familiesOf } from "@/domain/roadmap/testing/linked-lists"
import {
  addingItems,
  NEW_CLINIC,
  NEW_LETTERS,
} from "@/domain/roadmap/testing/test-new-item"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import {
  type ContractOptions,
  describeRoadmapRepositoryContract,
} from "@/domain/roadmap/testing/roadmap-repository-contract"
import { AppError } from "@/lib/errors"
import { server } from "@/test/msw-server"

import productACsv from "../../../tests/fixtures/sheets/ProductA.csv?raw"
import productBCsv from "../../../tests/fixtures/sheets/ProductB.csv?raw"
import productCCsv from "../../../tests/fixtures/sheets/ProductC.csv?raw"
import roadmapsCsv from "../../../tests/fixtures/sheets/Roadmaps.csv?raw"
import {
  applyBatchUpdate,
  TEMPLATE_TAB,
  type BatchUpdateBody,
  type GridTab,
} from "../../../tests/fixtures/sheets/apply-batch-update"
import { parseCsv } from "../../../tests/fixtures/sheets/parse-csv"
import { GoogleSheetsRoadmapRepository } from "./google-sheets-roadmap-repository"
import { parseRoadmapIndex } from "./roadmap-index-parser"
import { parseRoadmapTab } from "./roadmap-tab-parser"
import { createSheetsClient, type SheetsClient } from "./sheets-client"

/** IDs the next publishes are given, in turn, before random ones. */
const nextItemIds = vi.hoisted((): string[] => [])
vi.mock("@/domain/roadmap/item-id", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/domain/roadmap/item-id")>()
  return {
    ...actual,
    createItemId: () => nextItemIds.shift() ?? actual.createItemId(),
  }
})

const SPREADSHEET_ID = "spreadsheet-1"
const ENDPOINT = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
const VALUES_ENDPOINT = `${ENDPOINT}/values/*`
// A RegExp, as MSW would read `:batchUpdate` in a path as a parameter.
const BATCH_UPDATE_ENDPOINT = new RegExp(
  `^${ENDPOINT.replaceAll(".", "\\.")}:batchUpdate$`,
)
const METADATA_FIELDS =
  "sheets(properties(sheetId,title,index,hidden,gridProperties(rowCount,columnCount,frozenRowCount)))"
const VALUES_PARAMS = [
  ["majorDimension", "ROWS"],
  ["valueRenderOption", "FORMATTED_VALUE"],
  ["fields", "values"],
]

/** The example spreadsheet's roadmap index (`tests/fixtures/sheets/Roadmaps.csv`). */
const EXAMPLE_ROWS = parseCsv(roadmapsCsv)

/** The example spreadsheet's roadmap tabs' rows, by tab title. */
const EXAMPLE_TAB_ROWS: Readonly<Record<string, string[][]>> = {
  ProductA: parseCsv(productACsv),
  ProductB: parseCsv(productBCsv),
  ProductC: parseCsv(productCCsv),
}

interface Tab {
  title: string
  index?: number
  hidden?: boolean
}

/** The example spreadsheet's tabs, the roadmap index first. */
const EXAMPLE_TABS: readonly Tab[] = [
  { title: "Roadmaps" },
  { title: "ProductA", index: 1 },
  { title: "ProductB", index: 2 },
  { title: "ProductC", index: 3 },
]

/** The metadata response for these tabs: Google omits a `0` index and `false` hidden. */
function metadataFor(tabs: readonly Tab[]) {
  return {
    sheets: tabs.map((tab, i) => ({ properties: { sheetId: i * 10, ...tab } })),
  }
}

interface Spreadsheet {
  tabs?: readonly Tab[]
  /** The values response of any tab `tabValues` leaves out: the roadmap index's. */
  values?: unknown
  /** The values response of each roadmap tab, by tab title. */
  tabValues?: Readonly<Record<string, unknown>>
}

/** Serves every read over HTTP; records each request. */
function serveSpreadsheet({
  tabs = EXAMPLE_TABS,
  values = { values: EXAMPLE_ROWS },
  tabValues = Object.fromEntries(
    Object.entries(EXAMPLE_TAB_ROWS).map(([title, rows]) => [
      title,
      { values: rows },
    ]),
  ),
}: Spreadsheet = {}) {
  const requests: Request[] = []
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      requests.push(request)
      return HttpResponse.json(metadataFor(tabs))
    }),
    http.get(VALUES_ENDPOINT, ({ request }) => {
      requests.push(request)
      const title = tabTitleOf(request)
      const response = Object.hasOwn(tabValues, title)
        ? tabValues[title]
        : values
      return HttpResponse.json(response as Record<string, unknown>)
    }),
  )
  return requests
}

/** A values request's range for a tab's header row alone, after its quoted title. */
const HEADER_ROW = "!1:1"

/** The range a values request reads, in A1 notation. */
function rangeOf(request: Request): string {
  return decodeURIComponent(
    new URL(request.url).pathname.split("/values/")[1] ?? "",
  )
}

/** The title of the tab a values request reads, all of it or its header row, unquoted. */
function tabTitleOf(request: Request): string {
  const range = rangeOf(request)
  const quoted = range.endsWith(HEADER_ROW)
    ? range.slice(0, -HEADER_ROW.length)
    : range
  return quoted.slice(1, -1).replaceAll("''", "'")
}

/** A repository over the real client, talking to MSW. */
function httpRepository(getAccessToken = (): string | null => "token-123") {
  return new GoogleSheetsRoadmapRepository({
    client: createSheetsClient({ getAccessToken }),
    spreadsheetId: SPREADSHEET_ID,
  })
}

/** A repository over a stub client that answers each read in turn. */
function stubRepository(metadata: unknown, ...values: unknown[]) {
  const getJson = vi
    .fn<SheetsClient["getJson"]>()
    .mockResolvedValueOnce(metadata)
  for (const response of values) getJson.mockResolvedValueOnce(response)
  const repository = new GoogleSheetsRoadmapRepository({
    client: { getJson, postJson: vi.fn<SheetsClient["postJson"]>() },
    spreadsheetId: SPREADSHEET_ID,
  })
  return { repository, getJson }
}

/** The values path of the tab with this title, as Google expects it. */
function valuesPath(title: string): string {
  return `/v4/spreadsheets/${SPREADSHEET_ID}/values/${title}`
}

/** A roadmap index holding exactly these roadmaps, one row each, its tab named by the id. */
function indexRowsFor(roadmaps: readonly Roadmap[]): string[][] {
  const text = (value: { en: string; cy: string } | null) => [
    value?.en ?? "",
    value?.cy ?? "",
  ]
  return [
    [
      "Sheet",
      "Enabled",
      "Category",
      "Product Lead",
      "Last updated",
      "Colour",
      "Title",
      "Title (cy)",
      "Family",
      "Family (cy)",
      "Status label",
      "Status label (cy)",
      "Vision",
      "Vision (cy)",
      "Service description",
      "Service description (cy)",
      "Family ID",
      "Category ID",
    ],
    ...roadmaps.map((roadmap) => [
      roadmap.id,
      roadmap.published ? "Yes" : "No",
      roadmap.category?.en ?? "",
      roadmap.productLead ?? "",
      roadmap.lastUpdated ?? "",
      roadmap.colour ?? "",
      ...text(roadmap.title),
      ...text(roadmap.family),
      ...text(roadmap.statusLabel),
      ...text(roadmap.vision),
      ...text(roadmap.serviceDescription),
      roadmap.familyId ?? "",
      roadmap.categoryId ?? "",
    ]),
  ]
}

/** A `Families` tab holding exactly these families (ADR-013). */
function familyRowsFor(families: readonly Family[]): string[][] {
  return [
    ["ID", "Name", "Name (cy)", "Colour"],
    ...families.map(({ id, name, colour }) => [id, name.en, name.cy, colour]),
  ]
}

/** A `Categories` tab holding exactly these categories (ADR-013). */
function categoryRowsFor(categories: readonly Category[]): string[][] {
  return [
    ["ID", "Name", "Name (cy)"],
    ...categories.map(({ id, name }) => [id, name.en, name.cy]),
  ]
}

/** The English, then the Welsh, of each text column of a roadmap tab. */
const ITEM_TEXT_COLUMNS = [
  ["Title", (item: RoadmapItem) => item.title],
  ["Description", (item: RoadmapItem) => item.description],
  ["Outcome", (item: RoadmapItem) => item.expectedOutcome],
  ["Phase", (item: RoadmapItem) => item.phase],
] as const

/** A roadmap tab holding exactly these items, one row each, in the public site's format. */
function tabRowsFor(items: readonly RoadmapItem[]): string[][] {
  /** Entries joined by `separator`, or blank when every entry is. */
  const join = (entries: readonly string[], separator: string) =>
    entries.every((entry) => entry === "") ? "" : entries.join(separator)
  const nest = (level: number, text: string) =>
    level === 0 ? text : `${"-".repeat(level)} ${text}`
  const language = (lang: keyof LocalisedText) => (item: RoadmapItem) => [
    ...ITEM_TEXT_COLUMNS.map(([, read]) => read(item)?.[lang] ?? ""),
    join(
      item.tags.map((tag) => tag[lang]),
      ", ",
    ) ||
      // Welsh tags that show nowhere: a cell that holds something all the same.
      (lang === "cy" && item.hasWelshTags ? "-" : ""),
    // No cell for details with no text in this language, whatever their nesting.
    (item.details.every(({ text }) => text[lang] === "")
      ? ""
      : item.details
          .map(({ text, level }) => nest(level, text[lang]))
          .join("\n")) ||
      // Welsh details that show nowhere, as for tags.
      (lang === "cy" && item.hasWelshDetails ? "-" : ""),
  ]
  const textHeaders = [
    ...ITEM_TEXT_COLUMNS.map(([header]) => header),
    "Labels",
    "Details",
  ]
  return [
    [
      "Item ID",
      ...textHeaders,
      ...textHeaders.map((header) => `${header} (cy)`),
      "Horizon",
      "Organisations",
    ],
    ...items.map((item) => [
      item.id ?? "",
      ...language("en")(item),
      ...language("cy")(item),
      item.placement ?? item.writtenHorizon ?? "",
      [
        ...item.organisationIds.map((id) => id.toUpperCase()),
        ...item.unknownOrganisationCodes,
      ].join(", "),
    ]),
  ]
}

/**
 * What the stateful fake recorded that the editor must never do: a write `applyBatchUpdate`
 * refuses (STY-023 S11), or the `Template` tab read beyond its header row (STY-040 D1).
 */
const sheetViolations: string[] = []

afterEach(() => {
  nextItemIds.length = 0
  const violations = sheetViolations.splice(0)
  expect(violations).toEqual([])
})

/** A tab as the stateful fake holds it: its rows and grid, and its place in the tab list. */
type FakeTab = GridTab & { index?: number }

/** A tab whose grid is exactly as wide and tall as its rows. */
function gridTab(
  title: string,
  rows: string[][],
  sheetId: number,
  index?: number,
): FakeTab {
  return {
    title,
    sheetId,
    rows,
    rowCount: Math.max(1, rows.length),
    columnCount: Math.max(1, ...rows.map((row) => row.length)),
    ...(index === undefined ? {} : { index }),
  }
}

/**
 * A `Template` tab: a roadmap tab's header, its columns renamed as `renamed` says, over
 * two example rows and two spare ones, the header frozen.
 */
function templateTab(
  sheetId: number,
  index: number,
  renamed: Readonly<Record<string, string>> = {},
): FakeTab {
  const [header = []] = tabRowsFor([])
  const example = (title: string) =>
    header.map((column) =>
      column === "Title" ? title : column === "Horizon" ? "Now" : "",
    )
  return {
    ...gridTab(
      TEMPLATE_TAB,
      [
        header.map((column) => renamed[column] ?? column),
        example("An example item"),
        example("Another example"),
      ],
      sheetId,
      index,
    ),
    rowCount: 5,
    frozenRowCount: 1,
  }
}

/** Rows as the values API answers them: trailing blank cells and rows dropped. */
function trimRows(rows: readonly (readonly string[])[]): string[][] {
  const trimmed = rows.map((row) => {
    let end = row.length
    while (end > 0 && row[end - 1] === "") end--
    return row.slice(0, end)
  })
  while (trimmed.length > 0 && trimmed.at(-1)?.length === 0) trimmed.pop()
  return trimmed
}

/**
 * Serves a spreadsheet that publishing changes, as Google does: reads give the tabs as
 * they now are and a `batchUpdate` applies all or nothing (`applyBatchUpdate`).
 */
function serveStatefulSpreadsheet(
  initial: readonly FakeTab[],
  {
    write,
    beforeWrite,
  }: Pick<ContractOptions, "write"> & {
    /** A co-lead's change, made after the reads and before the write lands. */
    beforeWrite?: (tabs: FakeTab[]) => FakeTab[]
  } = {},
) {
  let tabs: FakeTab[] = [...initial]
  let readsFail = false
  const requests: Request[] = []
  const bodies: unknown[] = []
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      requests.push(request)
      if (readsFail) return HttpResponse.json({}, { status: 500 })
      return HttpResponse.json({
        sheets: tabs.map(
          ({
            sheetId,
            title,
            index,
            hidden,
            rowCount,
            columnCount,
            frozenRowCount,
          }) => ({
            properties: {
              sheetId,
              title,
              ...(index ? { index } : {}),
              ...(hidden ? { hidden } : {}),
              gridProperties: {
                rowCount,
                columnCount,
                ...(frozenRowCount ? { frozenRowCount } : {}),
              },
            },
          }),
        ),
      })
    }),
    http.get(VALUES_ENDPOINT, ({ request }) => {
      requests.push(request)
      if (readsFail) return HttpResponse.json({}, { status: 500 })
      const tab = tabs.find(({ title }) => title === tabTitleOf(request))
      if (tab === undefined) return HttpResponse.json({}, { status: 400 })
      const headerOnly = rangeOf(request).endsWith(HEADER_ROW)
      // An index named `Template` is read whole, to refuse every write (ADR-012).
      if (tab.title === TEMPLATE_TAB && tab.index && !headerOnly) {
        sheetViolations.push("The Template tab read beyond its header row")
      }
      return HttpResponse.json({
        values: trimRows(headerOnly ? tab.rows.slice(0, 1) : tab.rows),
      })
    }),
    http.post(BATCH_UPDATE_ENDPOINT, async ({ request }) => {
      requests.push(request)
      const body: unknown = await request.json()
      bodies.push(body)
      if (write !== undefined && "fails" in write) {
        const status = write.fails === "forbidden" ? 403 : 401
        return HttpResponse.json({}, { status })
      }
      if (beforeWrite) tabs = beforeWrite(tabs)
      if (write?.lost === "not-applied") return HttpResponse.error()
      const result = applyBatchUpdate(tabs, body)
      sheetViolations.push(...result.violations)
      if ("error" in result) return HttpResponse.json({}, { status: 400 })
      const lastIndex = Math.max(0, ...tabs.map(({ index }) => index ?? 0))
      tabs = result.tabs.map((tab) => {
        const known = tabs.find(({ sheetId }) => sheetId === tab.sheetId)
        // A tab the write copied goes after the last tab.
        return known ? { ...known, ...tab } : { ...tab, index: lastIndex + 1 }
      })
      if (write === undefined) return HttpResponse.json({})
      if (write.lost === "partly-applied") overwriteFirstValue(tabs, body)
      if (write.lost === "reread-fails") readsFail = true
      return HttpResponse.error()
    }),
  )
  return {
    requests,
    /** Each `batchUpdate` body sent. */
    bodies,
    /** The tabs as they now are. */
    tabs: () => tabs,
  }
}

/** A co-lead's change, after the write, to the first value it wrote below a header. */
function overwriteFirstValue(tabs: readonly FakeTab[], body: unknown) {
  const { requests } = body as BatchUpdateBody
  for (const request of requests) {
    if (!("updateCells" in request) || !("start" in request.updateCells)) {
      continue
    }
    const { sheetId, rowIndex, columnIndex } = request.updateCells.start
    const row = tabs.find((tab) => tab.sheetId === sheetId)?.rows[rowIndex]
    if (rowIndex > 0 && row !== undefined) {
      row[columnIndex] = CO_LEAD_VALUE
      return
    }
  }
}

/** Every cell that differs between two spreadsheets, as `tab!R1C1 value`. */
function changedCells(
  before: readonly FakeTab[],
  after: readonly FakeTab[],
): string[] {
  return after.flatMap((tab, t) =>
    tab.rows.flatMap((row, r) =>
      row.flatMap((value, c) =>
        (before[t]?.rows[r]?.[c] ?? "") === value
          ? []
          : [`${tab.title}!R${String(r + 1)}C${String(c + 1)} ${value}`],
      ),
    ),
  )
}

describeRoadmapRepositoryContract("GoogleSheetsRoadmapRepository", {
  withRoadmaps(
    roadmaps,
    items = {},
    {
      write,
      unreadableItems = [],
      families = familiesOf(roadmaps),
      categories = categoriesOf(roadmaps),
      twins = [],
      syncFaults = {},
      noStartingPoint = false,
      otherNames = [],
    } = {},
  ) {
    const lastIndex = roadmaps.length
    const indexRows = indexRowsFor([...roadmaps, ...twins])
    const colourAt = indexRows[0]?.indexOf("Colour") ?? -1
    for (const row of indexRows.slice(1)) {
      const [id = ""] = row
      // `#aabbcc` written as the `#abc` it expands from.
      if (syncFaults[id]?.includes("short-colour")) {
        const [, r, , g, , b] = row[colourAt] ?? ""
        row[colourAt] = `#${r ?? ""}${g ?? ""}${b ?? ""}`
      }
    }
    /** The roadmap's tab, its header without the columns its faults remove. */
    const tabRows = (id: string) => {
      const [header = [], ...rows] = tabRowsFor(items[id] ?? [])
      const renamed: Readonly<Record<string, string>> = {
        ...(syncFaults[id]?.includes("no-title-column") && { Title: "Name" }),
        ...(syncFaults[id]?.includes("no-horizon-column") && {
          Horizon: "When",
        }),
      }
      return [header.map((cell) => renamed[cell] ?? cell), ...rows]
    }
    serveStatefulSpreadsheet(
      [
        gridTab("Roadmaps", indexRows, 0),
        ...roadmaps.flatMap(({ id }, i) =>
          unreadableItems.includes(id)
            ? []
            : [gridTab(id, tabRows(id), (i + 1) * 10, i + 1)],
        ),
        ...(families === null
          ? []
          : [gridTab("Families", familyRowsFor(families), 1, lastIndex + 1)]),
        ...(categories === null
          ? []
          : [
              gridTab(
                "Categories",
                categoryRowsFor(categories),
                2,
                lastIndex + 2,
              ),
            ]),
        ...(noStartingPoint ? [] : [templateTab(3, lastIndex + 3)]),
        ...otherNames.map((name, i) =>
          gridTab(name, [["Anything"]], 4 + i, lastIndex + 4 + i),
        ),
      ],
      { write },
    )
    return httpRepository()
  },
  failing() {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({}, { status: 500 })))
    return httpRepository()
  },
})

describe("GoogleSheetsRoadmapRepository", () => {
  describe("what it reads", () => {
    it("reads the tab list, then the first tab's formatted values, with exact parameters", async () => {
      const requests = serveSpreadsheet()

      await httpRepository().listRoadmaps()

      const [metadata, values] = requests.map(({ url }) => new URL(url))
      expect(requests).toHaveLength(2)
      expect(metadata?.origin).toBe("https://sheets.googleapis.com")
      expect(metadata?.pathname).toBe(`/v4/spreadsheets/${SPREADSHEET_ID}`)
      expect([...(metadata?.searchParams ?? [])]).toEqual([
        ["fields", METADATA_FIELDS],
      ])
      expect(values?.origin).toBe("https://sheets.googleapis.com")
      expect(values?.pathname).toBe(valuesPath("'Roadmaps'"))
      expect([...(values?.searchParams ?? [])]).toEqual(VALUES_PARAMS)
      for (const request of requests) {
        expect(request.headers.get("Authorization")).toBe("Bearer token-123")
      }
    })

    it("passes the abort signal to both reads", async () => {
      const { repository, getJson } = stubRepository(
        metadataFor(EXAMPLE_TABS),
        { values: EXAMPLE_ROWS },
      )
      const { signal } = new AbortController()

      await repository.listRoadmaps({ signal })

      expect(getJson.mock.calls).toEqual([
        [
          `/${SPREADSHEET_ID}`,
          { searchParams: { fields: METADATA_FIELDS }, signal },
        ],
        [
          `/${SPREADSHEET_ID}/values/'Roadmaps'`,
          {
            searchParams: {
              majorDimension: "ROWS",
              valueRenderOption: "FORMATTED_VALUE",
              fields: "values",
            },
            signal,
          },
        ],
      ])
    })

    it("does not start the second read once the load is cancelled (S6)", async () => {
      const controller = new AbortController()
      const reason = new DOMException("Superseded", "AbortError")
      const requests: Request[] = []
      server.use(
        http.get(ENDPOINT, ({ request }) => {
          requests.push(request)
          controller.abort(reason)
          return HttpResponse.json(metadataFor(EXAMPLE_TABS))
        }),
        http.get(VALUES_ENDPOINT, ({ request }) => {
          requests.push(request)
          return HttpResponse.json({ values: EXAMPLE_ROWS })
        }),
      )

      await expect(
        httpRepository().listRoadmaps({ signal: controller.signal }),
      ).rejects.toBe(reason)
      expect(requests).toHaveLength(1)
    })
  })

  describe("the family and category lists (STY-027)", () => {
    const LIST_TABS: readonly Tab[] = [
      ...EXAMPLE_TABS,
      { title: "Families", index: 4 },
      { title: "Categories", index: 5, hidden: true },
    ]
    const FAMILY_ROWS = [
      ["ID", "Name", "Name (cy)", "Colour"],
      ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12A3C9"],
    ]
    const CATEGORY_ROWS = [
      ["ID", "Name", "Name (cy)"],
      ["khzpchkh", "GP & Community Services", "Meddygon Teulu"],
    ]
    const serveLists = (tabs = LIST_TABS) =>
      serveSpreadsheet({
        tabs,
        tabValues: {
          Families: { values: FAMILY_ROWS },
          Categories: { values: CATEGORY_ROWS },
        },
      })

    it("reads both list tabs alongside the index, and links each roadmap to them (S2, S5)", async () => {
      const requests = serveLists()

      const [productA] = await httpRepository().listRoadmaps()

      expect(requests.map((request) => tabTitleOf(request)).sort()).toEqual(
        ["", "Categories", "Families", "Roadmaps"].sort(),
      )
      for (const request of requests.slice(1)) {
        expect([...new URL(request.url).searchParams]).toEqual(VALUES_PARAMS)
      }
      expect(productA).toMatchObject({
        family: { en: "Single Record", cy: "Cofnod Sengl" },
        familyId: "fc29g5b9",
        colour: "#12a3c9",
        category: { en: "GP & Community Services", cy: "Meddygon Teulu" },
        categoryId: "khzpchkh",
        outOfStep: true,
      })
    })

    it("lists each from the tab list and its own tab only", async () => {
      const requests = serveLists()

      await expect(httpRepository().listFamilies()).resolves.toStrictEqual([
        {
          id: "fc29g5b9",
          name: { en: "Single Record", cy: "Cofnod Sengl" },
          colour: "#12a3c9",
        },
      ])
      await expect(httpRepository().listCategories()).resolves.toStrictEqual([
        {
          id: "khzpchkh",
          name: { en: "GP & Community Services", cy: "Meddygon Teulu" },
        },
      ])
      expect(requests.map((request) => tabTitleOf(request))).toEqual([
        "",
        "Families",
        "",
        "Categories",
      ])
    })

    it("serves the built-in organisations, by short name, without a request (S2)", async () => {
      const requests = serveLists()

      const organisations = await httpRepository().listOrganisations()

      expect(requests).toEqual([])
      expect(
        organisations.map(({ id, code, shortName }) => [id, code, shortName]),
      ).toEqual([
        ["national", "National", "All Wales"],
        ["abuhb", "ABUHB", "Aneurin Bevan"],
        ["bcuhb", "BCUHB", "Betsi Cadwaladr"],
        ["cavuhb", "CAVUHB", "Cardiff and Vale"],
        ["ctmuhb", "CTMUHB", "Cwm Taf Morgannwg"],
        ["hduhb", "HDUHB", "Hywel Dda"],
        ["pthb", "PTHB", "Powys"],
        ["sbuhb", "SBUHB", "Swansea Bay"],
        ["vunhst", "VUNHST", "Velindre"],
        ["wast", "WAST", "Welsh Ambulance"],
        ["phw", "PHW", "Public Health Wales"],
        ["heiw", "HEIW", "Health Education and Improvement Wales"],
        ["dhcw", "DHCW", "Digital Health and Care Wales"],
        ["pi", "P&I", "Performance and Improvement"],
      ])
      expect(
        organisations.filter(({ national }) => national).map(({ id }) => id),
      ).toEqual(["national"])
      expect(organisations[0]?.name).toEqual({
        en: "All Wales",
        cy: "Cymru gyfan",
      })
      expect(organisations[3]?.name).toEqual({
        en: "Cardiff and Vale University Health Board",
        cy: "Bwrdd Iechyd Prifysgol Caerdydd a’r Fro",
      })
    })

    it("reads no list from a missing tab, or from the first tab (S6)", async () => {
      const requests = serveLists([
        { title: "Families" },
        ...EXAMPLE_TABS.slice(1),
      ])

      await expect(httpRepository().listFamilies()).resolves.toBeNull()
      await expect(httpRepository().listCategories()).resolves.toBeNull()
      expect(requests.map((request) => tabTitleOf(request))).toEqual(["", ""])
    })
  })

  describe("the listed roadmaps (S1)", () => {
    it("lists the example roadmap index's roadmaps in row order, published or not", async () => {
      serveSpreadsheet()

      const roadmaps = await httpRepository().listRoadmaps()

      expect(
        roadmaps.map(({ id, title, published }) => [id, title.en, published]),
      ).toEqual([
        ["producta", "Product A roadmap", true],
        ["productb", "Product B roadmap", true],
        ["productc", "Product C roadmap", false],
      ])
      expect(roadmaps).toStrictEqual(
        parseRoadmapIndex(EXAMPLE_ROWS).entries.map(({ roadmap }) => roadmap),
      )
    })

    it("lists no tab as a roadmap, not even the list's own", async () => {
      serveSpreadsheet({
        tabs: [{ title: "Roadmaps" }, { title: "Scratch", index: 1 }],
        values: { values: [["Sheet", "Enabled"]] },
      })

      await expect(httpRepository().listRoadmaps()).resolves.toEqual([])
    })
  })

  describe("which tab is the list (S3)", () => {
    it("reads the tab with the lowest index, whatever the response order or its name", async () => {
      const requests = serveSpreadsheet({
        tabs: [
          { title: "ProductA", index: 1 },
          { title: "Index" },
          { title: "ProductB", index: 2 },
        ],
      })

      const roadmaps = await httpRepository().listRoadmaps()

      expect(new URL(requests[1]?.url ?? "").pathname).toBe(
        valuesPath("'Index'"),
      )
      expect(roadmaps).toHaveLength(3)
    })

    it("reads the first tab even when it is hidden", async () => {
      const requests = serveSpreadsheet({
        tabs: [
          { title: "Index", index: 0, hidden: true },
          { title: "ProductA", index: 1 },
        ],
      })

      await httpRepository().listRoadmaps()

      expect(new URL(requests[1]?.url ?? "").pathname).toBe(
        valuesPath("'Index'"),
      )
    })

    it.each([
      ["a space", "Roadmap index", "'Roadmap%20index'"],
      ["an apostrophe", "Dai's roadmaps", "'Dai''s%20roadmaps'"],
      ["a slash and a hash", "Now/Next #1", "'Now%2FNext%20%231'"],
    ])("quotes a tab title with %s", async (_, title, path) => {
      const requests = serveSpreadsheet({ tabs: [{ title }] })

      await httpRepository().listRoadmaps()

      expect(new URL(requests[1]?.url ?? "").pathname).toBe(valuesPath(path))
    })

    it("fails with invalid-data, without reading values, when the spreadsheet has no tabs", async () => {
      const requests = serveSpreadsheet({ tabs: [] })

      await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
        kind: "invalid-data",
        retryable: false,
      })
      expect(requests).toHaveLength(1)
    })
  })

  describe("a roadmap whose tab is missing (S4)", () => {
    it("is listed like the others", async () => {
      serveSpreadsheet({
        tabs: [{ title: "Roadmaps" }, { title: "ProductA", index: 1 }],
      })

      const roadmaps = await httpRepository().listRoadmaps()

      expect(roadmaps.map(({ id }) => id)).toEqual([
        "producta",
        "productb",
        "productc",
      ])
    })
  })

  describe("an unreadable list (S5)", () => {
    it.each([
      ["an empty first tab", {}],
      ["a first tab with no rows", { values: [] }],
      [
        "a header with no Sheet column",
        {
          values: [
            ["Title", "Enabled"],
            ["Product A roadmap", "Yes"],
          ],
        },
      ],
    ])("fails with invalid-data, not retryable, for %s", async (_, values) => {
      serveSpreadsheet({ values })

      await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
        kind: "invalid-data",
        retryable: false,
      })
    })

    it("lists nothing, without failing, for a header with no rows", async () => {
      serveSpreadsheet({ values: { values: [EXAMPLE_ROWS[0]] } })

      await expect(httpRepository().listRoadmaps()).resolves.toEqual([])
    })
  })

  describe("failures (S6)", () => {
    const googleError = (status: number) =>
      HttpResponse.json(
        { error: { code: status, status: "ERROR", message: "Failed" } },
        { status },
      )

    it.each([
      [401, "unauthenticated", false],
      [403, "forbidden", false],
      [404, "not-found", false],
      [429, "rate-limited", true],
      [500, "unknown", true],
      [503, "unknown", true],
    ])(
      "maps HTTP %i from either read to %s (retryable: %s)",
      async (status, kind, retryable) => {
        server.use(http.get(ENDPOINT, () => googleError(status)))
        await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
          kind,
          retryable,
          status,
        })

        serveSpreadsheet()
        server.use(http.get(VALUES_ENDPOINT, () => googleError(status)))
        await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
          kind,
          retryable,
          status,
        })
      },
    )

    it("maps a network failure of either read to a retryable network error", async () => {
      server.use(http.get(ENDPOINT, () => HttpResponse.error()))
      await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
        kind: "network",
        retryable: true,
      })

      serveSpreadsheet()
      server.use(http.get(VALUES_ENDPOINT, () => HttpResponse.error()))
      await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
        kind: "network",
        retryable: true,
      })
    })

    it.each([
      [
        "metadata",
        { sheets: [{ properties: { title: "A" } }] },
        { values: [] },
      ],
      ["values", metadataFor(EXAMPLE_TABS), { values: [["Sheet"], [7]] }],
    ])(
      "rejects a malformed %s response as invalid-response",
      async (_, metadata, values) => {
        const { repository } = stubRepository(metadata, values)

        await expect(repository.listRoadmaps()).rejects.toMatchObject({
          kind: "invalid-response",
        })
      },
    )

    it("propagates client failures unchanged", async () => {
      const failure = new AppError("forbidden", { status: 403 })
      const repository = new GoogleSheetsRoadmapRepository({
        client: {
          getJson: () => Promise.reject(failure),
          postJson: () => Promise.reject(failure),
        },
        spreadsheetId: SPREADSHEET_ID,
      })

      await expect(repository.listRoadmaps()).rejects.toBe(failure)
    })
  })
  describe("a roadmap's items", () => {
    const itemsOf = (roadmapId: string, signal?: AbortSignal) =>
      httpRepository().listRoadmapItems(roadmapId, { signal })

    it("reads the tab list, the index, then the roadmap's own tab, with the list's parameters and token (S1)", async () => {
      const requests = serveSpreadsheet()

      const items = await itemsOf("producta")

      expect(items).toHaveLength(9)
      expect(items).toStrictEqual(
        parseRoadmapTab(EXAMPLE_TAB_ROWS.ProductA ?? []).items,
      )
      const urls = requests.map(({ url }) => new URL(url))
      expect(urls.map(({ pathname }) => pathname)).toEqual([
        `/v4/spreadsheets/${SPREADSHEET_ID}`,
        valuesPath("'Roadmaps'"),
        valuesPath("'ProductA'"),
      ])
      expect([...(urls[0]?.searchParams ?? [])]).toEqual([
        ["fields", METADATA_FIELDS],
      ])
      for (const url of urls.slice(1)) {
        expect([...url.searchParams]).toEqual(VALUES_PARAMS)
      }
      for (const request of requests) {
        expect(request.headers.get("Authorization")).toBe("Bearer token-123")
      }
    })

    it("passes the abort signal to all three reads", async () => {
      const { repository, getJson } = stubRepository(
        metadataFor(EXAMPLE_TABS),
        { values: EXAMPLE_ROWS },
        { values: EXAMPLE_TAB_ROWS.ProductB },
      )
      const { signal } = new AbortController()

      await repository.listRoadmapItems("productb", { signal })

      expect(
        getJson.mock.calls.map(([path, options]) => [path, options?.signal]),
      ).toEqual([
        [`/${SPREADSHEET_ID}`, signal],
        [`/${SPREADSHEET_ID}/values/'Roadmaps'`, signal],
        [`/${SPREADSHEET_ID}/values/'ProductB'`, signal],
      ])
    })

    it("reads an unpublished roadmap's items too (S2)", async () => {
      serveSpreadsheet()

      const items = await itemsOf("productc")

      expect(items).toHaveLength(1)
      expect(items[0]?.organisationIds).toEqual([])
    })

    it("fails with not-found, not retryable, for an id the index does not list, after reading only the list (S3)", async () => {
      const requests = serveSpreadsheet()

      await expect(itemsOf("0")).rejects.toMatchObject({
        kind: "not-found",
        retryable: false,
      })
      expect(requests).toHaveLength(2)
    })

    describe("a missing or unreadable tab (S4)", () => {
      // ProductA's tab has no Title column; ProductB's tab does not exist.
      const brokenSpreadsheet = () =>
        serveSpreadsheet({
          tabs: [{ title: "Roadmaps" }, { title: "ProductA", index: 1 }],
          values: { values: EXAMPLE_ROWS.slice(0, 3) },
          tabValues: { ProductA: { values: [["Horizon"], ["Now"]] } },
        })

      it("fails with invalid-data, not retryable, without requesting a tab that does not exist", async () => {
        const requests = brokenSpreadsheet()

        await expect(itemsOf("productb")).rejects.toMatchObject({
          kind: "invalid-data",
          retryable: false,
        })
        expect(requests).toHaveLength(2)
      })

      it("fails with invalid-data, not retryable, for a tab with no Title column", async () => {
        brokenSpreadsheet()

        await expect(itemsOf("producta")).rejects.toMatchObject({
          kind: "invalid-data",
          retryable: false,
        })
      })

      it("fails with invalid-data for an empty tab", async () => {
        serveSpreadsheet({ tabValues: { ProductA: {} } })

        await expect(itemsOf("producta")).rejects.toMatchObject({
          kind: "invalid-data",
        })
      })

      it("still lists both roadmaps", async () => {
        brokenSpreadsheet()

        const roadmaps = await httpRepository().listRoadmaps()

        expect(roadmaps.map(({ id }) => id)).toEqual(["producta", "productb"])
      })
    })

    describe("which tab (S5)", () => {
      it("reads a tab whose title needs quoting, the quote doubled, as one encoded segment", async () => {
        const title = `Product's "B" & co`
        const [header = []] = EXAMPLE_ROWS
        const requests = serveSpreadsheet({
          tabs: [{ title: "Roadmaps" }, { title, index: 1 }],
          values: {
            values: [
              header,
              header.map((name) => (name === "Sheet" ? title : "")),
            ],
          },
          tabValues: { [title]: { values: EXAMPLE_TAB_ROWS.ProductC } },
        })
        const [roadmap] = await httpRepository().listRoadmaps()

        const items = await itemsOf(roadmap?.id ?? "")

        expect(items).toHaveLength(1)
        expect(new URL(requests.at(-1)?.url ?? "").pathname).toBe(
          valuesPath("'Product''s%20%22B%22%20%26%20co'"),
        )
      })

      it("does not match a tab whose title differs only in case", async () => {
        const requests = serveSpreadsheet({
          tabs: [{ title: "Roadmaps" }, { title: "producta", index: 1 }],
        })

        await expect(itemsOf("producta")).rejects.toMatchObject({
          kind: "invalid-data",
        })
        expect(requests).toHaveLength(2)
      })
    })

    describe("failures and cancellation (S6)", () => {
      const googleError = (status: number) =>
        HttpResponse.json(
          { error: { code: status, status: "ERROR", message: "Failed" } },
          { status },
        )
      /** Serves the example spreadsheet with the read at `position` (0–2) failing. */
      const failingRead = (position: number, failure: () => Response) => {
        serveSpreadsheet()
        if (position === 0) {
          server.use(http.get(ENDPOINT, failure))
        } else {
          const title = position === 1 ? "Roadmaps" : "ProductA"
          server.use(
            http.get(VALUES_ENDPOINT, ({ request }) =>
              tabTitleOf(request) === title ? failure() : undefined,
            ),
          )
        }
      }
      const reads = [
        ["the tab list", 0],
        ["the index", 1],
        ["the roadmap's tab", 2],
      ] as const

      describe.each(reads)("when %s fails", (_, position) => {
        it.each([
          [401, "unauthenticated", false],
          [403, "forbidden", false],
          [429, "rate-limited", true],
          [500, "unknown", true],
          [503, "unknown", true],
        ])(
          "maps HTTP %i to %s (retryable: %s), as the list does",
          async (status, kind, retryable) => {
            failingRead(position, () => googleError(status))

            await expect(itemsOf("producta")).rejects.toMatchObject({
              kind,
              retryable,
              status,
            })
          },
        )

        it("maps a network failure to a retryable network error", async () => {
          failingRead(position, () => HttpResponse.error())

          await expect(itemsOf("producta")).rejects.toMatchObject({
            kind: "network",
            retryable: true,
          })
        })
      })

      it("rejects with the abort reason, reading no further, when cancelled mid-read", async () => {
        const controller = new AbortController()
        const reason = new DOMException("Superseded", "AbortError")
        const requests = serveSpreadsheet()
        server.use(
          http.get(VALUES_ENDPOINT, ({ request }) => {
            requests.push(request)
            controller.abort(reason)
            return HttpResponse.json({ values: EXAMPLE_ROWS })
          }),
        )

        await expect(itemsOf("producta", controller.signal)).rejects.toBe(
          reason,
        )
        expect(requests).toHaveLength(2)
      })

      it("rejects a malformed roadmap tab response as invalid-response", async () => {
        const { repository } = stubRepository(
          metadataFor(EXAMPLE_TABS),
          { values: EXAMPLE_ROWS },
          { values: [["Title"], [7]] },
        )

        await expect(
          repository.listRoadmapItems("producta"),
        ).rejects.toMatchObject({ kind: "invalid-response" })
      })
    })
  })

  describe("publishing a roadmap's changes", () => {
    /** The example spreadsheet as the stateful fake holds it, with its `Template` tab. */
    const exampleTabs = (): FakeTab[] => [
      gridTab("Roadmaps", EXAMPLE_ROWS, 0),
      gridTab("ProductA", EXAMPLE_TAB_ROWS.ProductA ?? [], 10, 1),
      gridTab("Template", [["Title", "Item ID", "Horizon"]], 20, 2),
    ]

    const titleChange = {
      ...NO_CHANGES,
      roadmap: { title: { base: "Product A roadmap", value: "Product A" } },
    }

    it("sends one batchUpdate after the three reads, as JSON with the token (S2)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(exampleTabs())

      await expect(
        httpRepository().publishRoadmapChanges("producta", titleChange),
      ).resolves.toEqual({ status: "published" })

      const [, , , write, ...rest] = spreadsheet.requests
      expect(rest).toEqual([])
      expect(write?.method).toBe("POST")
      expect(write?.url).toBe(`${ENDPOINT}:batchUpdate`)
      expect(write?.headers.get("authorization")).toBe("Bearer token-123")
      expect(write?.headers.get("content-type")).toBe("application/json")
      expect(
        spreadsheet.requests.slice(0, 3).map(({ method }) => method),
      ).toEqual(["GET", "GET", "GET"])
    })

    it("writes only the changed cell, an Item ID column and every item's ID, leaving all else as it was (S1, S6, S7)", async () => {
      const before = exampleTabs()
      const spreadsheet = serveStatefulSpreadsheet(before)

      await httpRepository().publishRoadmapChanges("producta", titleChange)

      const changes = changedCells(before, spreadsheet.tabs())
      expect(changes).toEqual([
        "Roadmaps!R2C3 Product A",
        "ProductA!R1C15 Item ID",
        ...Array.from(
          { length: 9 },
          (_, i) =>
            expect.stringMatching(
              new RegExp(`^ProductA!R${String(i + 2)}C15 \\S+$`),
            ) as string,
        ),
      ])
      const ids = changes.slice(2).map((change) => change.split(" ")[1])
      expect(new Set(ids).size).toBe(9)
      expect(spreadsheet.tabs()[1]).toMatchObject({ columnCount: 15 })
      const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
      expect(requests).toHaveLength(12)
      expect(requests.slice(0, 3)).toMatchObject([
        {
          updateCells: {
            start: { sheetId: 0, rowIndex: 1, columnIndex: 2 },
            rows: [
              {
                values: [{ userEnteredValue: { stringValue: "Product A" } }],
              },
            ],
            fields: "userEnteredValue",
          },
        },
        {
          appendDimension: { sheetId: 10, dimension: "COLUMNS", length: 1 },
        },
        {
          updateCells: {
            start: { sheetId: 10, rowIndex: 0, columnIndex: 14 },
            rows: [
              { values: [{ userEnteredValue: { stringValue: "Item ID" } }] },
            ],
          },
        },
      ])
    })

    it("sends every value as text and a cleared field as an empty cell (S3)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
      const [item] = await httpRepository().listRoadmapItems("producta")
      if (item === undefined) throw new Error("Product A has items")

      await httpRepository().publishRoadmapChanges("producta", {
        ...NO_CHANGES,
        roadmap: { statusLabel: { base: "Beta", value: "=SUM(A1)" } },
        items: [
          {
            item,
            position: 0,
            fields: {
              phase: { base: item.phase?.en ?? "", value: " 42 " },
              expectedOutcome: {
                base: item.expectedOutcome?.en ?? "",
                value: "",
              },
            },
          },
        ],
      })

      const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
      const values = requests.flatMap((request) =>
        "updateCells" in request && "rows" in request.updateCells
          ? request.updateCells.rows.flatMap(({ values }) => values)
          : [],
      )
      expect(values).toContainEqual({
        userEnteredValue: { stringValue: "=SUM(A1)" },
      })
      expect(values).toContainEqual({ userEnteredValue: { stringValue: "42" } })
      expect(values).toContainEqual({})
      expect(spreadsheet.tabs()[1]?.rows[1]?.[2]).toBe("")
    })

    it.each([
      ["sets", "2026-11-13", "Roadmaps!R2C7 2026-11-13"],
      ["clears", "", "Roadmaps!R2C7 "],
    ])(
      "%s Last updated as YYYY-MM-DD text, whatever format the cell held (STY-036 S5, S8)",
      async (_case, value, cell) => {
        const before = exampleTabs()
        const index = before[0]?.rows[1]
        if (index) index[6] = "01/10/2026"
        const spreadsheet = serveStatefulSpreadsheet(before)

        await expect(
          httpRepository().publishRoadmapChanges("producta", {
            ...NO_CHANGES,
            roadmap: { lastUpdated: { base: "2026-10-01", value } },
          }),
        ).resolves.toEqual({ status: "published" })

        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(requests[0]).toEqual({
          updateCells: {
            start: { sheetId: 0, rowIndex: 1, columnIndex: 6 },
            rows: [
              {
                values: [
                  value === ""
                    ? {}
                    : { userEnteredValue: { stringValue: value } },
                ],
              },
            ],
            fields: "userEnteredValue",
          },
        })
        expect(changedCells(before, spreadsheet.tabs())[0]).toBe(cell)
      },
    )

    it("writes a move as the public site's Horizon value, and moves the row whole, no other cell written (STY-031 S6, STY-051 S3)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
      const items = await httpRepository().listRoadmapItems("producta")
      const later = items.findIndex(({ placement }) => placement === "later")
      const item = items[later]
      if (item === undefined) throw new Error("Product A has a Later item")
      const [header = [], ...before] = EXAMPLE_TAB_ROWS.ProductA ?? []
      const horizon = header.indexOf("Horizon")

      await httpRepository().publishRoadmapChanges("producta", {
        ...NO_CHANGES,
        items: [
          {
            item,
            position: later,
            fields: {
              placement: { base: "later", value: "recently-delivered" },
            },
          },
        ],
      })

      // Each row's cells under the example's header: not the Item ID the publish added.
      const cells = (row: readonly string[]) =>
        trimRows([row.slice(0, header.length)])[0] ?? []
      // The row as it was but for its Horizon, now just after the last Recently delivered row.
      const moved = before[later]?.map((value, c) =>
        c === horizon ? "Recently delivered" : value,
      )
      const rest = before.filter((_, r) => r !== later)
      const last = rest.findLastIndex(
        (row) => row[horizon] === "Recently delivered",
      )
      expect(spreadsheet.tabs()[1]?.rows.slice(1).map(cells)).toEqual(
        [...rest.slice(0, last + 1), moved ?? [], ...rest.slice(last + 1)].map(
          cells,
        ),
      )
    })

    describe("a moved item's row (STY-051)", () => {
      const HEADER = ["Title", "Horizon", "Item ID", "Title (cy)", "Notes"]
      /** A row of `HEADER`'s tab: an item with an ID, its title squeezed. */
      const row = (title: string, horizon: string, ...more: string[]) => [
        title,
        horizon,
        title
          .toLowerCase()
          .replaceAll(/[^a-z]/g, "")
          .padEnd(8, "x")
          .slice(0, 8),
        ...more,
      ]
      /** Product A's tab holding `rows` under `HEADER`, with a spare row in its grid. */
      const tabsOf = (...rows: string[][]): FakeTab[] => [
        gridTab("Roadmaps", EXAMPLE_ROWS, 0),
        {
          ...gridTab("ProductA", [HEADER, ...rows], 10, 1),
          rowCount: rows.length + 2,
        },
      ]
      /** The move of one row, by 0-based index, to before the row then at `destinationIndex`. */
      const moveRow = (startIndex: number, destinationIndex: number) => ({
        moveDimension: {
          source: {
            sheetId: 10,
            dimension: "ROWS",
            startIndex,
            endIndex: startIndex + 1,
          },
          destinationIndex,
        },
      })
      const horizonCell = (rowIndex: number, stringValue: string) => ({
        updateCells: {
          start: { sheetId: 10, rowIndex, columnIndex: 1 },
          rows: [{ values: [{ userEnteredValue: { stringValue } }] }],
          fields: "userEnteredValue",
        },
      })

      /**
       * Publishes the moves of the items titled so, in that order, each to its
       * placement, over what `listRoadmapItems` read; gives the one body sent.
       */
      async function publishMoves(
        spreadsheet: ReturnType<typeof serveStatefulSpreadsheet>,
        moves: readonly [string, string][],
        more: Partial<typeof NO_CHANGES> = {},
      ) {
        const items = await httpRepository().listRoadmapItems("producta")
        const outcome = await httpRepository().publishRoadmapChanges(
          "producta",
          {
            ...NO_CHANGES,
            ...more,
            items: moves.map(([title, value]) => {
              const position = items.findIndex(
                (each) => each.title.en === title,
              )
              const item = items[position]
              if (item === undefined) throw new Error(`No item ${title}`)
              return {
                item,
                position,
                fields: { placement: { base: item.placement ?? "", value } },
              }
            }),
          },
        )
        expect(outcome).toEqual({ status: "published" })
        expect(spreadsheet.bodies).toHaveLength(1)
        return (spreadsheet.bodies[0] as BatchUpdateBody).requests
      }
      const titles = (spreadsheet: { tabs: () => FakeTab[] }) =>
        spreadsheet
          .tabs()[1]
          ?.rows.slice(1)
          .map(([title]) => title)

      it("writes the Horizon cell at the row as read, then moves the row to just after the placement's last item's, rewriting no cell (S3)", async () => {
        const booking = row("Online booking", "Next", "Archebu ar-lein", "=A3")
        const untitled = ["", "Now", "", "", "A row with no title is no item"]
        const spreadsheet = serveStatefulSpreadsheet(
          tabsOf(
            booking,
            row("A", "Now"),
            untitled,
            row("B", "Now"),
            row("Video", "Next"),
            row("C", "Now"),
            row("Later one", "Later"),
          ),
        )

        const requests = await publishMoves(spreadsheet, [
          ["Online booking", "now"],
        ])

        // Row 2 (index 1) goes to before what is at index 7: just after C's row, 7.
        expect(requests).toEqual([horizonCell(1, "Now"), moveRow(1, 7)])
        expect(spreadsheet.tabs()[1]?.rows.slice(1)).toEqual([
          row("A", "Now"),
          untitled,
          row("B", "Now"),
          row("Video", "Next"),
          row("C", "Now"),
          ["Online booking", "Now", ...booking.slice(2)],
          row("Later one", "Later"),
        ])
      })

      it("moves the row after the cell and Item ID writes and before an appended row (S3, S6)", async () => {
        const spreadsheet = serveStatefulSpreadsheet([
          gridTab("Roadmaps", EXAMPLE_ROWS, 0),
          gridTab(
            "ProductA",
            [
              ["Title", "Horizon"],
              ["Online booking", "Next"],
              ["A", "Now"],
            ],
            10,
            1,
          ),
        ])

        const requests = await publishMoves(
          spreadsheet,
          [["Online booking", "now"]],
          {
            newItems: [
              {
                ...NEW_CLINIC,
                values: { ...NEW_CLINIC.values, placement: "now" },
              },
            ],
          },
        )

        expect(requests.map((request) => Object.keys(request)[0])).toEqual([
          "appendDimension",
          // The Item ID header, the Horizon cell, then an ID for each of the two rows.
          "updateCells",
          "updateCells",
          "updateCells",
          "updateCells",
          "moveDimension",
          "appendCells",
        ])
        expect(requests[5]).toEqual(moveRow(1, 3))
        expect(titles(spreadsheet)).toEqual([
          "A",
          "Online booking",
          "Choose a clinic closer to home",
        ])
        const [, first, second] = spreadsheet.tabs()[1]?.rows ?? []
        // Each ID written at its row as read, then carried with it.
        expect([first?.[1], second?.[1]]).toEqual(["Now", "Now"])
        expect(first?.[2]).not.toBe(second?.[2])
      })

      it("goes after a row a co-lead added to the placement since, without a conflict (S4)", async () => {
        const loaded = [row("Online booking", "Next"), row("A", "Now")]
        const spreadsheet = serveStatefulSpreadsheet(tabsOf(...loaded))
        const [item] = await httpRepository().listRoadmapItems("producta")
        if (item === undefined) throw new Error("Product A has an item")
        server.resetHandlers()
        const reread = serveStatefulSpreadsheet(
          tabsOf(...loaded, row("Later one", "Later"), row("D", "Now")),
        )

        await expect(
          httpRepository().publishRoadmapChanges("producta", {
            ...NO_CHANGES,
            items: [
              {
                item,
                position: 0,
                fields: { placement: { base: "next", value: "now" } },
              },
            ],
          }),
        ).resolves.toEqual({ status: "published" })

        expect(spreadsheet.bodies).toEqual([])
        expect((reread.bodies[0] as BatchUpdateBody).requests).toEqual([
          horizonCell(1, "Now"),
          moveRow(1, 5),
        ])
        expect(titles(reread)).toEqual([
          "A",
          "Later one",
          "D",
          "Online booking",
        ])
      })

      it.each([
        [
          "below its new placement's rows",
          [row("A", "Now"), row("Later one", "Later"), row("Booking", "Next")],
          "now",
        ],
        [
          "the one item moved into a placement with no items",
          [row("Booking", "Next"), row("A", "Now")],
          "later",
        ],
      ] as const)(
        "writes the Horizon cell alone, and no move, for a row already last: %s (S5)",
        async (_where, rows, placement) => {
          const spreadsheet = serveStatefulSpreadsheet(tabsOf(...rows))
          const at = rows.findIndex(([title]) => title === "Booking")

          const requests = await publishMoves(spreadsheet, [
            ["Booking", placement],
          ])

          expect(requests).toEqual([
            horizonCell(at + 1, placement === "now" ? "Now" : "Later"),
          ])
          expect(titles(spreadsheet)).toEqual(rows.map(([title]) => title))
        },
      )

      it("moves several rows in the order they were moved, each over what the move before it left (S6)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(
          tabsOf(row("Y", "Next"), row("X", "Later"), row("A", "Now")),
        )

        const requests = await publishMoves(spreadsheet, [
          ["X", "now"],
          ["Y", "now"],
        ])

        expect(requests).toEqual([
          horizonCell(2, "Now"),
          horizonCell(1, "Now"),
          // X to after A; then Y, still at index 1, to after X, now at index 3.
          moveRow(2, 4),
          moveRow(1, 4),
        ])
        expect(titles(spreadsheet)).toEqual(["A", "X", "Y"])
      })

      it("moves the later moved after the earlier when the placement held no items and its row is above (S6)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(
          tabsOf(row("Y", "Later"), row("A", "Later"), row("X", "Later")),
        )

        const requests = await publishMoves(spreadsheet, [
          ["X", "now"],
          ["Y", "now"],
        ])

        expect(requests.slice(2)).toEqual([moveRow(1, 4)])
        expect(titles(spreadsheet)).toEqual(["A", "X", "Y"])
      })

      it("moves one row up, to just before the first of a run already in order, as the fewest moves (S6)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(
          tabsOf(row("Y", "Later"), row("Z", "Later"), row("X", "Later")),
        )

        const requests = await publishMoves(spreadsheet, [
          ["X", "now"],
          ["Y", "now"],
          ["Z", "now"],
        ])

        expect(requests.slice(3)).toEqual([moveRow(3, 1)])
        expect(titles(spreadsheet)).toEqual(["X", "Y", "Z"])
      })

      it("moves the row with “Save and publish” too, in its one batchUpdate (S3)", async () => {
        const spreadsheet = serveStatefulSpreadsheet([
          gridTab("Roadmaps", EXAMPLE_ROWS, 0),
          gridTab(
            "ProductC",
            [HEADER, row("Online booking", "Next"), row("A", "Now")],
            10,
            1,
          ),
        ])
        const repository = httpRepository()
        const loaded = (await repository.listRoadmaps()).find(
          ({ id }) => id === "productc",
        )
        const [item] = await repository.listRoadmapItems("productc")
        if (!loaded || !item) throw new Error("Product C has an item")

        await expect(
          repository.setRoadmapPublished(loaded, {
            published: true,
            changes: {
              ...NO_CHANGES,
              items: [
                {
                  item,
                  position: 0,
                  fields: { placement: { base: "next", value: "now" } },
                },
              ],
            },
          }),
        ).resolves.toEqual({ status: "set" })

        expect(spreadsheet.bodies).toHaveLength(1)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(requests.slice(-2)).toEqual([
          horizonCell(1, "Now"),
          moveRow(1, 3),
        ])
        expect(titles(spreadsheet)).toEqual(["A", "Online booking"])
      })

      it.each([
        [
          "a move of a row",
          "Invalid requests[1].moveDimension: You are trying to edit a protected cell or object. Please contact the spreadsheet owner to remove protection if you need to edit.",
        ],
        [
          "a write to a cell",
          "Invalid requests[0].updateCells: You are trying to edit a protected cell or object. Please contact the spreadsheet owner to remove protection if you need to edit.",
        ],
      ])(
        "rejects with protected, publishing nothing and trying once, when Google refuses %s the account may not edit (S7)",
        async (_what, message) => {
          const before = tabsOf(row("Online booking", "Next"), row("A", "Now"))
          const spreadsheet = serveStatefulSpreadsheet(before)
          const [item] = await httpRepository().listRoadmapItems("producta")
          if (item === undefined) throw new Error("Product A has an item")
          let writes = 0
          server.use(
            http.post(BATCH_UPDATE_ENDPOINT, () => {
              writes++
              return HttpResponse.json(
                { error: { code: 400, message, status: "INVALID_ARGUMENT" } },
                { status: 400 },
              )
            }),
          )

          await expect(
            httpRepository().publishRoadmapChanges("producta", {
              ...NO_CHANGES,
              items: [
                {
                  item,
                  position: 0,
                  fields: { placement: { base: "next", value: "now" } },
                },
              ],
            }),
          ).rejects.toMatchObject({
            kind: "protected",
            status: 400,
            retryable: false,
          })
          expect(writes).toBe(1)
          expect(spreadsheet.tabs()).toEqual(before)
          // Three reads to list the items, three before the write, and none after it:
          // nothing to settle.
          expect(
            spreadsheet.requests.filter(({ method }) => method === "GET"),
          ).toHaveLength(6)
        },
      )
    })

    describe("a placement's pending order (STY-050)", () => {
      const HEADER = ["Title", "Horizon", "Item ID", "Title (cy)", "Notes"]
      /** A row of `HEADER`'s tab: an item with an ID, its title squeezed. */
      const row = (title: string, horizon: string, ...more: string[]) => [
        title,
        horizon,
        title
          .toLowerCase()
          .replaceAll(/[^a-z]/g, "")
          .padEnd(8, "x")
          .slice(0, 8),
        ...more,
      ]
      /** `tab` holding `rows` under `HEADER`, with a spare row in its grid. */
      const tabsOf = (tab: string, ...rows: string[][]): FakeTab[] => [
        gridTab("Roadmaps", EXAMPLE_ROWS, 0),
        {
          ...gridTab(tab, [HEADER, ...rows], 10, 1),
          rowCount: rows.length + 2,
        },
      ]
      const moveRow = (startIndex: number, destinationIndex: number) => ({
        moveDimension: {
          source: {
            sheetId: 10,
            dimension: "ROWS",
            startIndex,
            endIndex: startIndex + 1,
          },
          destinationIndex,
        },
      })
      const insertRow = (startIndex: number) => ({
        insertDimension: {
          range: {
            sheetId: 10,
            dimension: "ROWS",
            startIndex,
            endIndex: startIndex + 1,
          },
          inheritFromBefore: false,
        },
      })
      const cellAt = (
        rowIndex: number,
        columnIndex: number,
        stringValue: string,
      ) => ({
        updateCells: {
          start: { sheetId: 10, rowIndex, columnIndex },
          rows: [{ values: [{ userEnteredValue: { stringValue } }] }],
          fields: "userEnteredValue",
        },
      })
      const newClinic = {
        ...NEW_CLINIC,
        values: { ...NEW_CLINIC.values, placement: "now" },
      }
      const titles = (spreadsheet: { tabs: () => FakeTab[] }) =>
        spreadsheet
          .tabs()[1]
          ?.rows.slice(1)
          .map(([title]) => title)

      /**
       * Now's order as the page that read `loaded` holds it once reordered to `order`,
       * its items by title, a new item by its ID.
       */
      function reordering(
        loaded: readonly RoadmapItem[],
        order: readonly string[],
        more: Partial<RoadmapChanges> = {},
      ): RoadmapChanges {
        const ordered = loaded.map((item, position) =>
          orderedItem(item, position),
        )
        const at = (title: string) =>
          loaded.findIndex((each) => each.title.en === title)
        return {
          ...NO_CHANGES,
          ...more,
          orders: [
            {
              placement: "now",
              base: ordered.filter((_, i) => loaded[i]?.placement === "now"),
              items: order.map((title) => ordered[at(title)] ?? { id: title }),
            },
          ],
        }
      }

      it("sends one moveDimension that moves the row whole to just before the placement's first, and writes no cell (S7)", async () => {
        const d = row("D", "Now", "Ch", "=A2")
        const spreadsheet = serveStatefulSpreadsheet(
          tabsOf(
            "ProductA",
            row("Video", "Next"),
            row("A", "Now"),
            row("B", "Now"),
            row("C", "Now"),
            d,
          ),
        )
        const repository = httpRepository()
        const loaded = await repository.listRoadmapItems("producta")

        await expect(
          repository.publishRoadmapChanges(
            "producta",
            reordering(loaded, ["D", "A", "B", "C"]),
          ),
        ).resolves.toEqual({ status: "published" })

        expect(spreadsheet.bodies).toEqual([{ requests: [moveRow(5, 2)] }])
        expect(spreadsheet.tabs()[1]?.rows.slice(1)).toEqual([
          row("Video", "Next"),
          d,
          row("A", "Now"),
          row("B", "Now"),
          row("C", "Now"),
        ])
      })

      it("sends the cell writes, then the moves, then a row inserted with its cells, then a row appended (S8)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(
          tabsOf(
            "ProductA",
            row("A", "Now"),
            row("B", "Now"),
            row("Later one", "Later"),
          ),
        )
        const repository = httpRepository()
        const loaded = await repository.listRoadmapItems("producta")
        const [a] = loaded
        if (!a) throw new Error("Product A has items")
        const last = {
          id: "zzxtqwmn",
          values: { ...newClinic.values, title: "Last" },
        }

        await expect(
          repository.publishRoadmapChanges(
            "producta",
            reordering(loaded, ["B", newClinic.id, "A", last.id], {
              items: [
                {
                  item: a,
                  position: 0,
                  fields: { title: { base: "A", value: "A1" } },
                },
              ],
              newItems: [newClinic, last],
            }),
          ),
        ).resolves.toEqual({ status: "published" })

        expect(spreadsheet.bodies).toHaveLength(1)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(requests.slice(0, -1)).toEqual([
          cellAt(1, 0, "A1"),
          // A's row goes to just after B's; the new row is then put in before it.
          moveRow(1, 3),
          insertRow(2),
          cellAt(2, 2, newClinic.id),
          cellAt(2, 0, "Choose a clinic closer to home"),
          cellAt(2, 1, "Now"),
        ])
        expect(Object.keys(requests.at(-1) ?? {})).toEqual(["appendCells"])
        expect(titles(spreadsheet)).toEqual([
          "B",
          "Choose a clinic closer to home",
          "A1",
          "Later one",
          "Last",
        ])
      })

      it("sends nothing when a co-lead has added an item to the placement, and reports the order conflict (S10)", async () => {
        const rows = [row("A", "Now"), row("B", "Now")]
        const repository = httpRepository()
        serveStatefulSpreadsheet(tabsOf("ProductA", ...rows))
        const loaded = await repository.listRoadmapItems("producta")
        const spreadsheet = serveStatefulSpreadsheet(
          tabsOf("ProductA", ...rows, row("Theirs", "Now")),
        )

        await expect(
          repository.publishRoadmapChanges(
            "producta",
            reordering(loaded, ["B", "A"]),
          ),
        ).resolves.toMatchObject({
          status: "refused",
          conflicts: [
            {
              subject: "order",
              placement: "now",
              current: [
                { title: { en: "A" } },
                { title: { en: "B" } },
                { title: { en: "Theirs" } },
              ],
            },
          ],
        })
        expect(spreadsheet.bodies).toEqual([])
      })

      it("is unconfirmed when the answer is lost and a re-read finds the placement in neither order (S14)", async () => {
        const rows = [row("A", "Now"), row("B", "Now"), row("C", "Now")]
        const spreadsheet = serveStatefulSpreadsheet(
          tabsOf("ProductA", ...rows),
          {
            write: { lost: "applied" },
            // A co-lead swaps A and B as the write is sent: it lands over their order.
            beforeWrite: (tabs) =>
              tabs.map((tab) =>
                tab.title === "ProductA"
                  ? {
                      ...tab,
                      rows: [
                        HEADER,
                        row("B", "Now"),
                        row("A", "Now"),
                        rows[2] ?? [],
                      ],
                    }
                  : tab,
              ),
          },
        )
        const repository = httpRepository()
        const loaded = await repository.listRoadmapItems("producta")

        await expect(
          repository.publishRoadmapChanges(
            "producta",
            reordering(loaded, ["C", "A", "B"]),
          ),
        ).resolves.toEqual({ status: "unconfirmed" })
        expect(titles(spreadsheet)).toEqual(["C", "B", "A"])
      })

      it("orders the placement with “Save and publish” too, after the row's Enabled cell (S8)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(
          tabsOf("ProductC", row("A", "Now"), row("B", "Now")),
        )
        const repository = httpRepository()
        const roadmap = (await repository.listRoadmaps()).find(
          ({ id }) => id === "productc",
        )
        if (!roadmap) throw new Error("Product C is listed")
        const loaded = await repository.listRoadmapItems("productc")

        await expect(
          repository.setRoadmapPublished(roadmap, {
            published: true,
            changes: reordering(loaded, ["B", "A"]),
          }),
        ).resolves.toEqual({ status: "set" })

        expect(spreadsheet.bodies).toHaveLength(1)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(requests.map((request) => Object.keys(request)[0])).toEqual([
          "updateCells",
          "moveDimension",
        ])
        expect(requests.at(-1)).toEqual(moveRow(1, 3))
        expect(titles(spreadsheet)).toEqual(["B", "A"])
      })
    })

    describe("an item's organisations (STY-034)", () => {
      const organisationsColumn = (rows: readonly string[][] | undefined) =>
        (rows?.[0]?.indexOf("Organisations") ?? -1) + 1

      /** Publishes a choice for the first item of the roadmap with `id`. */
      async function choose(id: string, base: string, value: string) {
        const [item] = await httpRepository().listRoadmapItems(id)
        if (item === undefined) throw new Error(`${id} has an item`)
        return httpRepository().publishRoadmapChanges(id, {
          ...NO_CHANGES,
          items: [
            { item, position: 0, fields: { organisationIds: { base, value } } },
          ],
        })
      }

      it("writes the codes, national first then by code, in that cell alone (S5)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        const before = spreadsheet.tabs()

        await choose("producta", "cavuhb,sbuhb", "national,sbuhb")

        const column = organisationsColumn(EXAMPLE_TAB_ROWS.ProductA)
        expect(
          changedCells(before, spreadsheet.tabs()).filter(
            (change) => !change.includes("C15 "),
          ),
        ).toEqual([`ProductA!R2C${String(column)} National, SBUHB`])
      })

      it("writes none chosen as an empty cell (S5)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())

        await choose("producta", "cavuhb,sbuhb", "")

        const column = organisationsColumn(EXAMPLE_TAB_ROWS.ProductA)
        expect(spreadsheet.tabs()[1]?.rows[1]?.[column - 1] ?? "").toBe("")
      })

      it("takes a co-lead's same set, respelt as `sbuhb,CAVUHB`, as no conflict and no write (S7)", async () => {
        const tabs = exampleTabs()
        const column = organisationsColumn(EXAMPLE_TAB_ROWS.ProductA)
        const row = tabs[1]?.rows[1]
        if (row === undefined) throw new Error("Product A has an item")
        row[column - 1] = "CAVUHB"
        const spreadsheet = serveStatefulSpreadsheet(tabs)
        const [item] = await httpRepository().listRoadmapItems("producta")
        if (item === undefined) throw new Error("Product A has an item")
        row[column - 1] = "sbuhb,CAVUHB"

        const outcome = await httpRepository().publishRoadmapChanges(
          "producta",
          {
            ...NO_CHANGES,
            items: [
              {
                item,
                position: 0,
                fields: {
                  organisationIds: { base: "cavuhb", value: "cavuhb,sbuhb" },
                },
              },
            ],
          },
        )

        expect(outcome).toEqual({ status: "published" })
        expect(spreadsheet.bodies).toEqual([])
      })

      it("adds an Organisations column to a tab with none, then writes the cell (S6)", async () => {
        const productC = EXAMPLE_TAB_ROWS.ProductC ?? []
        expect(productC[0]).not.toContain("Organisations")
        const width = Math.max(...productC.map((row) => row.length))
        const before = [
          ...exampleTabs(),
          gridTab(
            "ProductC",
            productC.map((row) => [...row]),
            30,
            3,
          ),
        ]
        const spreadsheet = serveStatefulSpreadsheet(before)

        await choose("productc", "", "pthb")

        expect(
          changedCells(before, spreadsheet.tabs()).filter((change) =>
            change.startsWith("ProductC!"),
          ),
        ).toEqual(
          expect.arrayContaining([
            `ProductC!R1C${String(width + 1)} Organisations`,
            `ProductC!R2C${String(width + 1)} PTHB`,
          ]),
        )
      })
    })

    describe("an item's tags (STY-037)", () => {
      const column = (rows: readonly string[][] | undefined, header: string) =>
        (rows?.[0]?.indexOf(header) ?? -1) + 1

      /** Publishes tags for the item of the roadmap with `id` titled `title`. */
      async function retag(
        id: string,
        title: string,
        base: string,
        value: string,
      ) {
        const items = await httpRepository().listRoadmapItems(id)
        const position = items.findIndex((item) => item.title.en === title)
        const item = items[position]
        if (item === undefined) throw new Error(`${id} has no ${title}`)
        return httpRepository().publishRoadmapChanges(id, {
          ...NO_CHANGES,
          items: [{ item, position, fields: { tags: { base, value } } }],
        })
      }

      it("writes the tags in order, separated by a comma and a space, in the Labels cell alone (S12)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        const before = spreadsheet.tabs()

        const outcome = await retag(
          "producta",
          "Longer-term idea",
          "Service Y, Service Z",
          "Service Y, Video appointments, Carers",
        )

        expect(outcome).toEqual({ status: "published" })
        const labels = column(EXAMPLE_TAB_ROWS.ProductA, "Labels")
        expect(
          changedCells(before, spreadsheet.tabs()).filter(
            (change) => !change.includes("C15 "),
          ),
        ).toEqual([
          `ProductA!R7C${String(labels)} Service Y, Video appointments, Carers`,
        ])
      })

      it("writes no tags as an empty cell (S12)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())

        await retag("producta", "Longer-term idea", "Service Y, Service Z", "")

        const labels = column(EXAMPLE_TAB_ROWS.ProductA, "Labels")
        expect(spreadsheet.tabs()[1]?.rows[6]?.[labels - 1] ?? "").toBe("")
      })

      it("adds a Labels column to a tab with none, then writes the cell (S12)", async () => {
        const rows = [
          ["Title", "Horizon"],
          ["Unpublished work", "Now"],
        ]
        const before = [...exampleTabs(), gridTab("ProductC", rows, 30, 3)]
        const spreadsheet = serveStatefulSpreadsheet(before)

        await retag("productc", "Unpublished work", "", "Patients, Carers")

        expect(
          changedCells(before, spreadsheet.tabs()).filter((change) =>
            change.startsWith("ProductC!"),
          ),
        ).toEqual(
          expect.arrayContaining([
            "ProductC!R1C3 Labels",
            "ProductC!R2C3 Patients, Carers",
          ]),
        )
      })

      it("writes nothing over tags whose Welsh cell holds anything, a count that doesn't pair included (S22)", async () => {
        const rows = [
          ["Item ID", "Title", "Horizon", "Labels", "Labels (cy)"],
          ["bookingx", "Unpublished work", "Now", "Patients, Carers", ""],
        ]
        const spreadsheet = serveStatefulSpreadsheet([
          ...exampleTabs(),
          gridTab("ProductC", rows, 30, 3),
        ])
        const [item] = await httpRepository().listRoadmapItems("productc")
        if (item === undefined) throw new Error("Product C has an item")
        // A co-lead's Welsh, one entry for two tags, after the item was read.
        rows[1]?.splice(4, 1, "Cleifion")

        const outcome = await httpRepository().publishRoadmapChanges(
          "productc",
          {
            ...NO_CHANGES,
            items: [
              {
                item,
                position: 0,
                fields: {
                  tags: { base: "Patients, Carers", value: "Carers" },
                },
              },
            ],
          },
        )

        expect(item.hasWelshTags).toBe(false)
        expect(outcome).toMatchObject({
          status: "refused",
          conflicts: [{ field: "tags", gainedWelsh: true }],
        })
        expect(spreadsheet.bodies).toEqual([])
      })
    })

    describe("an item's details (STY-039)", () => {
      const column = (rows: readonly string[][] | undefined, header: string) =>
        (rows?.[0]?.indexOf(header) ?? -1) + 1
      const MINE = [
        "Follow-up appointments in three specialties",
        "- Dermatology",
        "-- Adult clinics first",
        "First appointments stay in person",
      ].join("\n")

      /** Publishes details for the item of the roadmap with `id` titled `title`. */
      async function redetail(
        id: string,
        title: string,
        base: string,
        value: string,
      ) {
        const items = await httpRepository().listRoadmapItems(id)
        const position = items.findIndex((item) => item.title.en === title)
        const item = items[position]
        if (item === undefined) throw new Error(`${id} has no ${title}`)
        return httpRepository().publishRoadmapChanges(id, {
          ...NO_CHANGES,
          items: [{ item, position, fields: { details: { base, value } } }],
        })
      }

      it("writes a line for each detail, a hyphen for each level and a space, as text in the Details cell alone (S14)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        const before = spreadsheet.tabs()

        const outcome = await redetail("producta", "Longer-term idea", "", MINE)

        expect(outcome).toEqual({ status: "published" })
        const details = column(EXAMPLE_TAB_ROWS.ProductA, "Details")
        expect(
          changedCells(before, spreadsheet.tabs()).filter(
            (change) => !change.includes("C15 "),
          ),
        ).toEqual([`ProductA!R7C${String(details)} ${MINE}`])
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(JSON.stringify(requests)).toContain(
          JSON.stringify({ userEnteredValue: { stringValue: MINE } }),
        )
      })

      it("writes no details as an empty cell (S14)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())

        await redetail(
          "producta",
          "Earlier delivery this year",
          "What it included\nAnother thing it included",
          "",
        )

        const details = column(EXAMPLE_TAB_ROWS.ProductA, "Details")
        expect(spreadsheet.tabs()[1]?.rows[8]?.[details - 1] ?? "").toBe("")
      })

      it("adds a Details column to a tab with none, then writes the cell (S14)", async () => {
        const rows = [
          ["Title", "Horizon"],
          ["Unpublished work", "Now"],
        ]
        const before = [...exampleTabs(), gridTab("ProductC", rows, 30, 3)]
        const spreadsheet = serveStatefulSpreadsheet(before)

        await redetail("productc", "Unpublished work", "", "One\n- Two")

        expect(
          changedCells(before, spreadsheet.tabs()).filter((change) =>
            change.startsWith("ProductC!"),
          ),
        ).toEqual(
          expect.arrayContaining([
            "ProductC!R1C3 Details",
            "ProductC!R2C3 One\n- Two",
          ]),
        )
      })

      it("leaves a cell written another way as it is until the details change, then writes it at the levels shown (S20)", async () => {
        const rows = [
          ["Item ID", "Title", "Horizon", "Details"],
          [
            "videoxxx",
            "Unpublished work",
            "Now",
            "- One\n--- Two\n- -5 degrees",
          ],
        ]
        const spreadsheet = serveStatefulSpreadsheet([
          ...exampleTabs(),
          gridTab("ProductC", rows, 30, 3),
        ])
        const AS_SHOWN = "One\n- Two\n5 degrees"

        const unchanged = await redetail(
          "productc",
          "Unpublished work",
          AS_SHOWN,
          AS_SHOWN,
        )
        expect(unchanged).toEqual({ status: "published" })
        expect(spreadsheet.bodies).toEqual([])

        await redetail(
          "productc",
          "Unpublished work",
          AS_SHOWN,
          `${AS_SHOWN}\n- Three`,
        )

        expect(spreadsheet.tabs().at(-1)?.rows[1]?.[3]).toBe(
          "One\n- Two\n5 degrees\n- Three",
        )
      })

      it("writes nothing over details whose Welsh cell holds anything, a count that doesn't pair included (S19)", async () => {
        const rows = [
          ["Item ID", "Title", "Horizon", "Details", "Details (cy)"],
          ["videoxxx", "Unpublished work", "Now", "One\n- Two", ""],
        ]
        const spreadsheet = serveStatefulSpreadsheet([
          ...exampleTabs(),
          gridTab("ProductC", rows, 30, 3),
        ])
        const [item] = await httpRepository().listRoadmapItems("productc")
        if (item === undefined) throw new Error("Product C has an item")
        // A co-lead's Welsh, one line for two details, after the item was read.
        rows[1]?.splice(4, 1, "Un")

        const outcome = await httpRepository().publishRoadmapChanges(
          "productc",
          {
            ...NO_CHANGES,
            items: [
              {
                item,
                position: 0,
                fields: { details: { base: "One\n- Two", value: "One" } },
              },
            ],
          },
        )

        expect(item.hasWelshDetails).toBe(false)
        expect(outcome).toMatchObject({
          status: "refused",
          conflicts: [{ field: "details", gainedWelsh: true }],
        })
        expect(spreadsheet.bodies).toEqual([])
      })
    })

    describe("a missing column (S7)", () => {
      it("goes after the last used column, inside a grid wide enough for it", async () => {
        const rows = EXAMPLE_ROWS.map((row) => [
          ...row.slice(0, 8),
          ...row.slice(9),
        ])
        const index = { ...gridTab("Roadmaps", rows, 0), columnCount: 26 }
        const before = [index, ...exampleTabs().slice(1)]
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          roadmap: { vision: { base: "", value: "Where we are heading" } },
        })

        expect(
          changedCells(before, spreadsheet.tabs()).filter((change) =>
            change.startsWith("Roadmaps!"),
          ),
        ).toEqual([
          "Roadmaps!R1C15 Vision",
          "Roadmaps!R2C15 Where we are heading",
        ])
        expect(spreadsheet.tabs()[0]?.columnCount).toBe(26)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(
          requests.filter(
            (request) =>
              "appendDimension" in request &&
              request.appendDimension.sheetId === 0,
          ),
        ).toEqual([])
      })

      it("grows a grid that ends at the last used column, in the same request", async () => {
        const [header = [], ...body] = EXAMPLE_TAB_ROWS.ProductB ?? []
        const phase = header.indexOf("Phase")
        const withoutPhase = [header, ...body].map((row) =>
          row.filter((_, c) => c !== phase),
        )
        const before = [
          gridTab("Roadmaps", EXAMPLE_ROWS, 0),
          gridTab("ProductB", withoutPhase, 10, 1),
        ]
        const spreadsheet = serveStatefulSpreadsheet(before)
        const [item] = await httpRepository().listRoadmapItems("productb")
        if (item === undefined) throw new Error("Product B has items")

        await httpRepository().publishRoadmapChanges("productb", {
          ...NO_CHANGES,
          items: [
            {
              item,
              position: 0,
              fields: { phase: { base: "", value: "Beta" } },
            },
          ],
        })

        expect(changedCells(before, spreadsheet.tabs())).toEqual([
          "ProductB!R1C8 Phase",
          "ProductB!R1C9 Item ID",
          "ProductB!R2C8 Beta",
          ...body.map(
            (_, i) =>
              expect.stringMatching(
                new RegExp(`^ProductB!R${String(i + 2)}C9 \\S+$`),
              ) as string,
          ),
        ])
        expect(spreadsheet.tabs()[1]?.columnCount).toBe(9)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(requests[0]).toEqual({
          appendDimension: { sheetId: 10, dimension: "COLUMNS", length: 2 },
        })
      })
    })

    describe("a family or category (STY-028)", () => {
      const FAMILY_ROWS = [
        ["ID", "Name", "Name (cy)", "Colour"],
        ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12a3c9"],
        [
          "vdkxj63m",
          "Medicines & Diagnostics",
          "Meddyginiaethau a Diagnosteg",
          "#006747",
        ],
      ]
      const CATEGORY_ROWS = [
        ["ID", "Name", "Name (cy)"],
        ["khzpchkh", "GP & Community Services", "Meddygon Teulu"],
        ["w7vrv5kn", "Tests, Scans & Results", "Profion"],
      ]
      /** The example spreadsheet, its index's columns given by header, with both lists. */
      const listTabs = (index: string[][] = EXAMPLE_ROWS): FakeTab[] => [
        gridTab("Roadmaps", index, 0),
        gridTab("ProductA", EXAMPLE_TAB_ROWS.ProductA ?? [], 10, 1),
        gridTab("Families", FAMILY_ROWS, 30, 2),
        gridTab("Categories", CATEGORY_ROWS, 40, 3),
      ]
      /** The example index with Family ID and Category ID columns holding these. */
      const withIds = (familyId: string, categoryId: string) =>
        EXAMPLE_ROWS.map((row, r) =>
          r === 0
            ? [...row, "Family ID", "Category ID"]
            : r === 1
              ? [...row, familyId, categoryId]
              : row,
        )
      const indexChanges = (before: FakeTab[], after: FakeTab[]) =>
        changedCells(before, after).filter((change) =>
          change.startsWith("Roadmaps!"),
        )

      it("writes the chosen family's ID, names and colour, appending the ID columns (S2, S4)", async () => {
        const before = listTabs()
        const spreadsheet = serveStatefulSpreadsheet(before)

        await expect(
          httpRepository().publishRoadmapChanges("producta", {
            ...NO_CHANGES,
            roadmap: { familyId: { base: "fc29g5b9", value: "vdkxj63m" } },
          }),
        ).resolves.toEqual({ status: "published" })

        expect(indexChanges(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R1C16 Family ID",
          "Roadmaps!R1C17 Category ID",
          "Roadmaps!R2C5 Medicines & Diagnostics",
          "Roadmaps!R2C8 #006747",
          "Roadmaps!R2C13 Meddyginiaethau a Diagnosteg",
          "Roadmaps!R2C16 vdkxj63m",
          "Roadmaps!R2C17 khzpchkh",
        ])
        expect(spreadsheet.bodies).toHaveLength(1)
      })

      it("blanks the family's ID and names for no family, leaving its colour (S2)", async () => {
        const before = listTabs(withIds("fc29g5b9", "khzpchkh"))
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          roadmap: { familyId: { base: "fc29g5b9", value: "" } },
        })

        expect(indexChanges(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R2C5 ",
          "Roadmaps!R2C16 ",
        ])
        expect(spreadsheet.tabs()[0]?.rows[1]?.[7]).toBe("#325083")
      })

      it("writes no blank over a trailing cell Google leaves out of the row", async () => {
        const before = listTabs()
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          roadmap: { familyId: { base: "fc29g5b9", value: "" } },
        })

        // Family (cy), column 13, is a trailing blank the row's array leaves out.
        expect(indexChanges(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R1C16 Category ID",
          "Roadmaps!R2C5 ",
          "Roadmaps!R2C16 khzpchkh",
        ])
      })

      it("writes the chosen category's ID and English name, and blanks both for none (S3)", async () => {
        const before = listTabs(withIds("fc29g5b9", "khzpchkh"))
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          roadmap: { categoryId: { base: "khzpchkh", value: "w7vrv5kn" } },
        })
        const chosen = spreadsheet.tabs()
        await httpRepository().publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          roadmap: { categoryId: { base: "w7vrv5kn", value: "" } },
        })

        expect(indexChanges(before, chosen)).toEqual([
          "Roadmaps!R2C4 Tests, Scans & Results",
          "Roadmaps!R2C17 w7vrv5kn",
        ])
        expect(indexChanges(chosen, spreadsheet.tabs())).toEqual([
          "Roadmaps!R2C4 ",
          "Roadmaps!R2C17 ",
        ])
      })

      it("adds only a missing ID to a row linked by name, on any publish that writes (S4)", async () => {
        const index = withIds("", "unknown1")
        const before = listTabs(index)
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", titleChange)

        expect(indexChanges(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R2C3 Product A",
          "Roadmaps!R2C16 fc29g5b9",
        ])
      })

      it("fails with invalid-data, writing nothing, for a family no longer listed", async () => {
        const spreadsheet = serveStatefulSpreadsheet(listTabs())

        await expect(
          httpRepository().publishRoadmapChanges("producta", {
            ...NO_CHANGES,
            roadmap: { familyId: { base: "fc29g5b9", value: "gone0000" } },
          }),
        ).rejects.toMatchObject({ kind: "invalid-data" })
        expect(spreadsheet.bodies).toEqual([])
      })
    })

    describe("which tabs it writes (S1)", () => {
      /**
       * The example spreadsheet, with its family and category lists, and Product A's
       * index row naming `sheet`.
       */
      function naming(sheet: string): FakeTab[] {
        const [indexTab, ...rest] = exampleTabs()
        if (indexTab === undefined) throw new Error("The example has an index")
        const rows = indexTab.rows.map((row, r) =>
          r === 1 ? [sheet, ...row.slice(1)] : row,
        )
        return [
          { ...indexTab, rows },
          ...rest,
          gridTab("Families", [["ID", "Name", "Colour"]], 70),
          gridTab("Categories", [["ID", "Name"]], 71),
        ]
      }

      it.each([
        ["Template", "template"],
        ["Roadmaps", "roadmaps"],
        ["Families", "families"],
        ["Categories", "categories"],
      ])(
        "fails with invalid-data, writing nothing, for a roadmap whose tab is %s",
        async (sheet, roadmapId) => {
          const spreadsheet = serveStatefulSpreadsheet(naming(sheet))

          await expect(
            httpRepository().publishRoadmapChanges(roadmapId, {
              ...NO_CHANGES,
              roadmap: { title: { base: "Product A roadmap", value: "New" } },
            }),
          ).rejects.toMatchObject({ kind: "invalid-data", retryable: false })
          await expect(
            httpRepository().listRoadmapItems(roadmapId),
          ).rejects.toMatchObject({
            kind: "invalid-data",
            message: `Roadmap ${roadmapId} names the ${sheet} tab`,
          })
          expect(spreadsheet.bodies).toEqual([])
        },
      )

      it("fails with invalid-data, writing nothing, when the index is the Template tab", async () => {
        const [indexTab, ...rest] = exampleTabs()
        if (indexTab === undefined) throw new Error("The example has an index")
        const spreadsheet = serveStatefulSpreadsheet([
          { ...indexTab, title: "Template" },
          ...rest.filter(({ title }) => title !== "Template"),
        ])

        await expect(
          httpRepository().publishRoadmapChanges("producta", titleChange),
        ).rejects.toMatchObject({ kind: "invalid-data", retryable: false })
        expect(spreadsheet.bodies).toEqual([])
      })

      it("gives no new ID that a skipped row already holds", async () => {
        const spreadsheet = serveStatefulSpreadsheet([
          gridTab("Roadmaps", EXAMPLE_ROWS, 0),
          gridTab(
            "ProductA",
            [
              ["Title", "Horizon", "Item ID"],
              ["", "Now", "skipped2"],
              ["Kept", "Now", ""],
            ],
            10,
            1,
          ),
        ])
        nextItemIds.push("skipped2", "fresh234")

        await httpRepository().publishRoadmapChanges("producta", titleChange)

        expect(spreadsheet.tabs()[1]?.rows.map((row) => row[2])).toEqual([
          "Item ID",
          "skipped2",
          "fresh234",
        ])
      })
    })

    describe("a new item (STY-045)", () => {
      const text = (stringValue: string) => ({
        userEnteredValue: { stringValue },
      })
      /** The example spreadsheet with a Product A tab of one item, as wide as its header. */
      const smallTabs = (...rows: string[][]): FakeTab[] => [
        gridTab("Roadmaps", EXAMPLE_ROWS, 0),
        gridTab("ProductA", [["Title", "Horizon", "Item ID"], ...rows], 10, 1),
      ]
      const kept = ["Online booking", "Now", "k7q2xwbn"]

      it("appends one row after the tab's last row in use, with its Item ID, Title and Horizon, in the one batchUpdate (S2)", async () => {
        const before = exampleTabs()
        const spreadsheet = serveStatefulSpreadsheet(before)

        await expect(
          httpRepository().publishRoadmapChanges(
            "producta",
            addingItems(NEW_CLINIC),
          ),
        ).resolves.toEqual({ status: "published" })

        // Rows 2 to 10 hold the example's items: each gets an ID, as on any publish.
        expect(changedCells(before, spreadsheet.tabs()).slice(10)).toEqual([
          "ProductA!R11C1 Choose a clinic closer to home",
          "ProductA!R11C4 Next",
          "ProductA!R11C15 ckn7q2xw",
        ])
        expect(spreadsheet.bodies).toHaveLength(1)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(requests.at(-1)).toEqual({
          appendCells: {
            sheetId: 10,
            rows: [
              {
                values: [
                  text("Choose a clinic closer to home"),
                  {},
                  {},
                  text("Next"),
                  ...Array.from({ length: 10 }, () => ({})),
                  text("ckn7q2xw"),
                ],
              },
            ],
            fields: "userEnteredValue",
          },
        })
        expect(
          requests.filter((request) => "appendCells" in request),
        ).toHaveLength(1)
        expect(spreadsheet.requests.map(({ method }) => method)).toEqual([
          "GET",
          "GET",
          "GET",
          "POST",
        ])
      })

      it("writes each field it has as that field's edit is written, and no Welsh cell (S2)", async () => {
        const before = exampleTabs()
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges(
          "producta",
          addingItems(NEW_LETTERS),
        )

        expect(changedCells(before, spreadsheet.tabs()).slice(10)).toEqual([
          "ProductA!R11C1 Letters by email",
          "ProductA!R11C2 Read your letters online.\nNo post.",
          "ProductA!R11C3 Fewer lost letters",
          "ProductA!R11C4 Delivered this year",
          "ProductA!R11C5 Discovery",
          "ProductA!R11C6 Patients, Carers",
          "ProductA!R11C7 National, SBUHB",
          "ProductA!R11C8 Appointment letters\n- Outpatients\n-- Adult clinics first",
          "ProductA!R11C15 fwd9s3hj",
        ])
      })

      it("sends several in the order added, after the cells of the roadmap's other changes (S2)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(smallTabs(kept))
        const [item] = await httpRepository().listRoadmapItems("producta")
        if (item === undefined) throw new Error("Product A has an item")

        await httpRepository().publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          roadmap: { title: { base: "Product A roadmap", value: "Product A" } },
          items: [
            {
              item,
              position: 0,
              fields: { title: { base: "Online booking", value: "Booking" } },
            },
          ],
          newItems: [NEW_LETTERS, NEW_CLINIC],
        })

        expect(spreadsheet.bodies).toHaveLength(1)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(
          requests.map((request) =>
            "appendCells" in request
              ? request.appendCells.rows[0]?.values[2]
              : Object.keys(request)[0],
          ),
        ).toEqual([
          // The index's cell, then the tab's: its grid grown, six new headers, the
          // edited cell, then the new rows.
          "updateCells",
          "appendDimension",
          ...Array.from({ length: 7 }, () => "updateCells"),
          text("fwd9s3hj"),
          text("ckn7q2xw"),
        ])
        expect(spreadsheet.tabs()[1]?.rows.map((row) => row[0])).toEqual([
          "Title",
          "Booking",
          "Letters by email",
          "Choose a clinic closer to home",
        ])
      })

      it("adds a column the row needs and the tab lacks, and none for a field it lacks (S2)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(smallTabs(kept))

        await httpRepository().publishRoadmapChanges(
          "producta",
          addingItems({
            ...NEW_CLINIC,
            values: { ...NEW_CLINIC.values, phase: "Beta" },
          }),
        )

        expect(spreadsheet.bodies).toEqual([
          {
            requests: [
              {
                appendDimension: {
                  sheetId: 10,
                  dimension: "COLUMNS",
                  length: 1,
                },
              },
              {
                updateCells: {
                  start: { sheetId: 10, rowIndex: 0, columnIndex: 3 },
                  rows: [{ values: [text("Phase")] }],
                  fields: "userEnteredValue",
                },
              },
              {
                appendCells: {
                  sheetId: 10,
                  rows: [
                    {
                      values: [
                        text("Choose a clinic closer to home"),
                        text("Next"),
                        text("ckn7q2xw"),
                        text("Beta"),
                      ],
                    },
                  ],
                  fields: "userEnteredValue",
                },
              },
            ],
          },
        ])
        expect(spreadsheet.tabs()[1]?.rows).toEqual([
          ["Title", "Horizon", "Item ID", "Phase"],
          kept,
          ["Choose a clinic closer to home", "Next", "ckn7q2xw", "Beta"],
        ])
      })

      it("adds the Item ID and Horizon columns to a tab with neither (S2)", async () => {
        const spreadsheet = serveStatefulSpreadsheet([
          gridTab("Roadmaps", EXAMPLE_ROWS, 0),
          gridTab("ProductA", [["Title"]], 10, 1),
        ])

        await httpRepository().publishRoadmapChanges(
          "producta",
          addingItems(NEW_CLINIC),
        )

        expect(spreadsheet.tabs()[1]?.rows).toEqual([
          ["Title", "Item ID", "Horizon"],
          ["Choose a clinic closer to home", "ckn7q2xw", "Next"],
        ])
        expect(spreadsheet.tabs()[1]?.columnCount).toBe(3)
      })

      it("keeps a row a co-lead added after the read, appending after it (S3)", async () => {
        const theirs = ["Added by a co-lead", "Later", ""]
        const spreadsheet = serveStatefulSpreadsheet(smallTabs(kept), {
          beforeWrite: (tabs) =>
            tabs.map((tab) =>
              tab.title === "ProductA"
                ? {
                    ...tab,
                    rows: [...tab.rows, theirs],
                    rowCount: tab.rowCount + 1,
                  }
                : tab,
            ),
        })

        await expect(
          httpRepository().publishRoadmapChanges(
            "producta",
            addingItems(NEW_CLINIC),
          ),
        ).resolves.toEqual({ status: "published" })

        expect(spreadsheet.tabs()[1]?.rows.slice(1)).toEqual([
          kept,
          theirs,
          ["Choose a clinic closer to home", "Next", "ckn7q2xw"],
        ])
      })

      it("writes nothing for a new item the tab already holds, even in a row it no longer reads (S4)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(
          smallTabs(kept, ["", "Next", "ckn7q2xw"]),
        )

        await expect(
          httpRepository().publishRoadmapChanges(
            "producta",
            addingItems(NEW_CLINIC),
          ),
        ).resolves.toEqual({ status: "published" })

        expect(spreadsheet.bodies).toEqual([])
      })

      it("reads no item for a new item's row whose title a co-lead has cleared, so a read alone leaves it pending (S4)", async () => {
        serveStatefulSpreadsheet(smallTabs(kept, ["", "Next", "ckn7q2xw"]))
        const pending = addingItems(NEW_CLINIC)

        const items = await httpRepository().listRoadmapItems("producta")

        expect(items.map(({ id }) => id)).toEqual(["k7q2xwbn"])
        expect(dropPublishedNewItems(pending, items)).toBe(pending)
      })

      it("gives no row without an ID the ID of a new item (S1)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(
          smallTabs(["No ID yet", "Now", ""]),
        )
        nextItemIds.push("ckn7q2xw", "fresh234")

        await httpRepository().publishRoadmapChanges(
          "producta",
          addingItems(NEW_CLINIC),
        )

        expect(spreadsheet.tabs()[1]?.rows.map((row) => row[2])).toEqual([
          "Item ID",
          "fresh234",
          "ckn7q2xw",
        ])
      })

      it("settles a lost answer by one more read of the roadmap, which finds the new row by its ID (S4)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(smallTabs(kept), {
          write: { lost: "applied" },
        })

        await expect(
          httpRepository().publishRoadmapChanges(
            "producta",
            addingItems(NEW_CLINIC),
          ),
        ).resolves.toEqual({ status: "published" })

        expect(spreadsheet.requests.map(({ method }) => method)).toEqual([
          "GET",
          "GET",
          "GET",
          "POST",
          "GET",
          "GET",
          "GET",
        ])
      })

      it("sends it with the roadmap's published state, in the one batchUpdate (STY-035 S5)", async () => {
        const spreadsheet = serveStatefulSpreadsheet([
          gridTab("Roadmaps", EXAMPLE_ROWS, 0),
          gridTab("ProductC", [["Title", "Horizon", "Item ID"], kept], 30, 1),
        ])
        const loaded = (await httpRepository().listRoadmaps()).find(
          ({ id }) => id === "productc",
        )
        if (loaded === undefined) throw new Error("Product C is listed")

        await expect(
          httpRepository().setRoadmapPublished(loaded, {
            published: true,
            changes: addingItems(NEW_CLINIC),
          }),
        ).resolves.toEqual({ status: "set" })

        expect(spreadsheet.bodies).toHaveLength(1)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(requests.map((request) => Object.keys(request)[0])).toEqual([
          "updateCells",
          "appendCells",
        ])
        expect(spreadsheet.tabs()[1]?.rows.at(-1)).toEqual([
          "Choose a clinic closer to home",
          "Next",
          "ckn7q2xw",
        ])
      })
    })

    describe("failures and cancellation (S10)", () => {
      it("rejects with unauthenticated, writing nothing, when the session ends before the write", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        let reads = 0
        const repository = httpRepository(() =>
          ++reads <= 3 ? "token-123" : null,
        )

        await expect(
          repository.publishRoadmapChanges("producta", titleChange),
        ).rejects.toMatchObject({ kind: "unauthenticated" })
        expect(spreadsheet.bodies).toEqual([])
      })

      it("rejects with the abort reason, writing nothing, when cancelled during the reads", async () => {
        const controller = new AbortController()
        const reason = new DOMException("Left the page", "AbortError")
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        server.use(
          http.get(VALUES_ENDPOINT, ({ request }) => {
            // Returns nothing, so the stateful fake answers.
            if (tabTitleOf(request) === "ProductA") controller.abort(reason)
          }),
        )

        await expect(
          httpRepository().publishRoadmapChanges("producta", titleChange, {
            signal: controller.signal,
          }),
        ).rejects.toBe(reason)
        expect(spreadsheet.bodies).toEqual([])
      })

      it("publishes regardless once the write is sent, as it can't be taken back", async () => {
        const controller = new AbortController()
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        server.use(
          http.post(BATCH_UPDATE_ENDPOINT, () => {
            controller.abort()
          }),
        )

        await expect(
          httpRepository().publishRoadmapChanges("producta", titleChange, {
            signal: controller.signal,
          }),
        ).resolves.toEqual({ status: "published" })
        expect(spreadsheet.tabs()[0]?.rows[1]?.[2]).toBe("Product A")
      })

      it("does not retry a failed write", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        let writes = 0
        server.use(
          http.post(BATCH_UPDATE_ENDPOINT, () => {
            writes++
            return HttpResponse.json({}, { status: 503 })
          }),
        )

        await expect(
          httpRepository().publishRoadmapChanges("producta", titleChange),
        ).rejects.toMatchObject({ kind: "unknown", status: 503 })
        expect(writes).toBe(1)
        expect(
          spreadsheet.requests.filter(({ method }) => method === "GET"),
        ).toHaveLength(3)
      })
    })
  })

  describe("adding a roadmap (STY-040)", () => {
    const FAMILY_ROWS = [
      ["ID", "Name", "Name (cy)", "Colour"],
      ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12a3c9"],
    ]
    const CATEGORY_ROWS = [
      ["ID", "Name", "Name (cy)"],
      ["khzpchkh", "GP & Community Services", "Meddygon Teulu"],
    ]
    /**
     * The example index, whose rows name `ProductB` and `ProductC`, tabs that are not
     * there, with a hidden `Template`, the lists and a tab no roadmap lists.
     */
    const addingTabs = (): FakeTab[] => [
      gridTab("Roadmaps", EXAMPLE_ROWS, 0),
      gridTab("ProductA", EXAMPLE_TAB_ROWS.ProductA ?? [], 10, 1),
      { ...templateTab(20, 2), hidden: true },
      gridTab("Families", FAMILY_ROWS, 30, 3),
      gridTab("Categories", CATEGORY_ROWS, 40, 4),
      gridTab("Old notes", [["Anything"]], 50, 5),
    ]
    const input = (overrides: Partial<NewRoadmapInput> = {}) => ({
      title: "Community Nursing roadmap",
      shortName: "Community Nursing",
      familyId: null,
      categoryId: "khzpchkh",
      productLead: "Sam Evans",
      ...overrides,
    })
    const text = (stringValue: string) => ({
      userEnteredValue: { stringValue },
    })
    /** The ID the write chose for its copy of the `Template`. */
    const copyIdOf = (body: unknown): number => {
      const [first] = (body as BatchUpdateBody).requests
      if (first === undefined || !("duplicateSheet" in first)) {
        throw new Error("The write copies the Template first")
      }
      return first.duplicateSheet.newSheetId
    }
    const tabNamed = (tabs: readonly FakeTab[], title: string) =>
      tabs.find((tab) => tab.title === title)

    it("copies the Template and appends the index row in one batchUpdate, after five reads (S2)", async () => {
      const before = addingTabs()
      const spreadsheet = serveStatefulSpreadsheet(before)

      const outcome = await httpRepository().addRoadmap(input())

      expect(outcome).toMatchObject({
        status: "added",
        roadmap: { id: "community-nursing", published: false },
      })
      expect(spreadsheet.bodies).toHaveLength(1)
      const sheetId = copyIdOf(spreadsheet.bodies[0])
      expect(before.map((tab) => tab.sheetId)).not.toContain(sheetId)
      expect(spreadsheet.bodies[0]).toEqual({
        requests: [
          {
            duplicateSheet: {
              sourceSheetId: 20,
              insertSheetIndex: 6,
              newSheetId: sheetId,
              newSheetName: "Community Nursing",
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId, hidden: false },
              fields: "hidden",
            },
          },
          {
            deleteDimension: {
              range: { sheetId, dimension: "ROWS", startIndex: 2, endIndex: 5 },
            },
          },
          {
            updateCells: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 2 },
              fields: "*",
            },
          },
          { appendDimension: { sheetId: 0, dimension: "COLUMNS", length: 1 } },
          {
            updateCells: {
              start: { sheetId: 0, rowIndex: 0, columnIndex: 15 },
              rows: [{ values: [text("Category ID")] }],
              fields: "userEnteredValue",
            },
          },
          {
            appendCells: {
              sheetId: 0,
              rows: [
                {
                  values: [
                    text("Community Nursing"),
                    text("No"),
                    text("Community Nursing roadmap"),
                    text("GP & Community Services"),
                    ...Array.from({ length: 6 }, () => ({})),
                    text("Sam Evans"),
                    ...Array.from({ length: 4 }, () => ({})),
                    text("khzpchkh"),
                  ],
                },
              ],
              fields: "userEnteredValue",
            },
          },
        ],
      })

      const after = spreadsheet.tabs()
      expect(after.at(-1)).toEqual({
        title: "Community Nursing",
        sheetId,
        // Its header alone, over the one row Google keeps, emptied.
        rows: [before[2]?.rows[0], []],
        rowCount: 2,
        columnCount: before[2]?.columnCount,
        frozenRowCount: 1,
        index: 6,
      })
      expect(tabNamed(after, TEMPLATE_TAB)).toEqual(before[2])
      const gets = spreadsheet.requests.filter(({ method }) => method === "GET")
      expect(gets.slice(1).map(rangeOf).sort()).toEqual([
        "'Categories'",
        "'Families'",
        "'Roadmaps'",
        "'Template'!1:1",
      ])
      expect(gets).toHaveLength(5)
    })

    it("writes a chosen family as a publish does, adding the column its ID needs (S2)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(addingTabs())
      const repository = httpRepository()

      const outcome = await repository.addRoadmap(
        input({ familyId: "fc29g5b9", categoryId: null, productLead: "" }),
      )

      const [header, ...rows] = spreadsheet.tabs()[0]?.rows ?? []
      expect(header?.[15]).toBe("Family ID")
      expect(rows.at(-1)).toEqual([
        "Community Nursing",
        "No",
        "Community Nursing roadmap",
        "",
        "Single Record",
        "",
        "",
        "#12a3c9",
        "",
        "",
        "",
        "",
        "Cofnod Sengl",
        "",
        "",
        "fc29g5b9",
      ])
      const listed = (await repository.listRoadmaps()).at(-1)
      expect(listed).toMatchObject({
        family: { en: "Single Record", cy: "Cofnod Sengl" },
        colour: "#12a3c9",
        outOfStep: false,
      })
      expect(outcome).toStrictEqual({ status: "added", roadmap: listed })
    })

    it("keeps a row a co-lead added after the read, appending after it (S2)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(addingTabs(), {
        beforeWrite: (tabs) =>
          tabs.map((tab) =>
            tab.title === "Roadmaps"
              ? {
                  ...tab,
                  rows: [...tab.rows, ["ProductD", "No", "Product D roadmap"]],
                  rowCount: tab.rowCount + 1,
                }
              : tab,
          ),
      })

      await httpRepository().addRoadmap(input())

      expect(
        spreadsheet
          .tabs()[0]
          ?.rows.slice(-2)
          .map(([sheet]) => sheet),
      ).toEqual(["ProductD", "Community Nursing"])
    })

    it.each([
      ["template", "the Template tab, in another letter case"],
      ["FAMILIES", "the family list's tab"],
      ["categories", "the category list's tab"],
      ["roadmaps", "the roadmap index itself"],
      ["old notes", "a tab no roadmap lists"],
      ["PRODUCTB", "a published row whose tab is missing"],
      ["Productc", "a row that is not published"],
    ])("writes nothing for the short name %j: %s (S4)", async (shortName) => {
      const spreadsheet = serveStatefulSpreadsheet(addingTabs())

      await expect(
        httpRepository().addRoadmap(input({ shortName })),
      ).resolves.toEqual({ status: "short-name-taken" })
      expect(spreadsheet.bodies).toEqual([])
    })

    it("writes nothing for a short name a row the list skips has (S4)", async () => {
      const [index, ...rest] = addingTabs()
      if (index === undefined) throw new Error("The example has an index")
      const spreadsheet = serveStatefulSpreadsheet([
        {
          ...index,
          // Two rows with one address: the list keeps the first.
          rows: [
            ...index.rows,
            ["Pharmacy", "No", "Pharmacy roadmap"],
            ["pharmacy", "No", "A copy"],
          ],
          rowCount: index.rowCount + 2,
        },
        ...rest,
      ])

      await expect(
        httpRepository().addRoadmap(input({ shortName: "PHARMACY" })),
      ).resolves.toEqual({ status: "short-name-taken" })
      expect(spreadsheet.bodies).toEqual([])
    })

    it.each(["Families", "Categories"])(
      "keeps the name %s for its list while the spreadsheet has no such tab (S4)",
      async (shortName) => {
        const spreadsheet = serveStatefulSpreadsheet(
          addingTabs().filter(({ title }) => title !== shortName),
        )

        await expect(
          httpRepository().addRoadmap(
            input({ shortName, familyId: null, categoryId: null }),
          ),
        ).resolves.toEqual({ status: "short-name-taken" })
        expect(spreadsheet.bodies).toEqual([])
      },
    )

    it("fails with invalid-data, writing nothing, when the index is the Template tab (S6)", async () => {
      const [, ...rest] = addingTabs()
      const [header = [], ...rows] = EXAMPLE_ROWS
      const spreadsheet = serveStatefulSpreadsheet([
        // With the columns a template needs, so only its being the index refuses it.
        gridTab(TEMPLATE_TAB, [[...header, "Horizon"], ...rows], 0),
        ...rest.filter(({ title }) => title !== TEMPLATE_TAB),
      ])

      await expect(httpRepository().addRoadmap(input())).rejects.toMatchObject({
        kind: "invalid-data",
        message: "The roadmap index is the Template tab",
        retryable: false,
      })
      expect(spreadsheet.bodies).toEqual([])
    })

    it.each([
      ["no Title column", { Title: "Name" }],
      ["no Horizon column", { Horizon: "When" }],
    ])(
      "fails with invalid-data, writing nothing, when the Template's header has %s (S6)",
      async (_, renamed) => {
        const spreadsheet = serveStatefulSpreadsheet(
          addingTabs().map((tab) =>
            tab.title === TEMPLATE_TAB ? templateTab(20, 2, renamed) : tab,
          ),
        )

        await expect(
          httpRepository().addRoadmap(input()),
        ).rejects.toMatchObject({
          kind: "invalid-data",
          message: "The Template tab has no Title or no Horizon column",
        })
        expect(spreadsheet.bodies).toEqual([])
      },
    )

    it("asks for nothing of a Template with no cells to read, a chart's tab (S6)", async () => {
      // `metadataFor` gives no tab a grid.
      const requests = serveSpreadsheet({
        tabs: [...EXAMPLE_TABS, { title: TEMPLATE_TAB, index: 4 }],
      })

      await expect(httpRepository().addRoadmap(input())).rejects.toMatchObject({
        kind: "invalid-data",
        message: "The spreadsheet has no Template tab to copy",
      })
      expect(requests.map((request) => tabTitleOf(request))).not.toContain(
        TEMPLATE_TAB,
      )
    })

    it("leaves the copy's header alone frozen when the Template freezes a row under it too (S2)", async () => {
      const before = addingTabs().map((tab) =>
        tab.title === TEMPLATE_TAB ? { ...tab, frozenRowCount: 2 } : tab,
      )
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(httpRepository().addRoadmap(input())).resolves.toMatchObject(
        { status: "added" },
      )

      const after = spreadsheet.tabs()
      expect(after.at(-1)).toMatchObject({
        title: "Community Nursing",
        rows: [before[2]?.rows[0], []],
        rowCount: 2,
        frozenRowCount: 1,
      })
      expect(tabNamed(after, TEMPLATE_TAB)).toEqual(before[2])
      expect(spreadsheet.bodies).toHaveLength(1)
    })

    it("asks for nothing of a Template that is not there (S6)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(
        addingTabs().filter(({ title }) => title !== TEMPLATE_TAB),
      )

      await expect(httpRepository().addRoadmap(input())).rejects.toMatchObject({
        kind: "invalid-data",
        message: "The spreadsheet has no Template tab to copy",
      })
      expect(spreadsheet.requests).toHaveLength(4)
    })

    it.each([
      [401, "unauthenticated"],
      [403, "forbidden"],
      [429, "rate-limited"],
    ])(
      "rejects with the write's failure, HTTP %i as %s, sent once (S7)",
      async (status, kind) => {
        const spreadsheet = serveStatefulSpreadsheet(addingTabs())
        let writes = 0
        server.use(
          http.post(BATCH_UPDATE_ENDPOINT, () => {
            writes++
            return HttpResponse.json({}, { status })
          }),
        )

        await expect(
          httpRepository().addRoadmap(input()),
        ).rejects.toMatchObject({ kind, status })
        expect(writes).toBe(1)
        expect(
          tabNamed(spreadsheet.tabs(), "Community Nursing"),
        ).toBeUndefined()
      },
    )

    it("rejects with the abort reason, writing nothing, when cancelled during the reads (S7)", async () => {
      const controller = new AbortController()
      const reason = new DOMException("Left the page", "AbortError")
      const spreadsheet = serveStatefulSpreadsheet(addingTabs())
      server.use(
        http.get(VALUES_ENDPOINT, ({ request }) => {
          // Returns nothing, so the stateful fake answers.
          if (tabTitleOf(request) === TEMPLATE_TAB) controller.abort(reason)
        }),
      )

      await expect(
        httpRepository().addRoadmap(input(), { signal: controller.signal }),
      ).rejects.toBe(reason)
      expect(spreadsheet.bodies).toEqual([])
    })

    it("adds regardless once the write is sent, as it can't be taken back (S7)", async () => {
      const controller = new AbortController()
      const spreadsheet = serveStatefulSpreadsheet(addingTabs())
      server.use(
        http.post(BATCH_UPDATE_ENDPOINT, () => {
          controller.abort()
        }),
      )

      await expect(
        httpRepository().addRoadmap(input(), { signal: controller.signal }),
      ).resolves.toMatchObject({ status: "added" })
      expect(tabNamed(spreadsheet.tabs(), "Community Nursing")).toBeDefined()
    })

    it("says the short name is in use when a co-lead added a roadmap with the same title and short name while the answer was lost (S7)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(addingTabs(), {
        write: { lost: "not-applied" },
        beforeWrite: (tabs) => [
          ...tabs.map((tab) =>
            tab.title === "Roadmaps"
              ? {
                  ...tab,
                  rows: [
                    ...tab.rows,
                    [
                      "Community Nursing",
                      "No",
                      "Community Nursing roadmap",
                      "GP & Community Services",
                      ...Array.from({ length: 6 }, () => ""),
                      "Sam Evans",
                    ],
                  ],
                  rowCount: tab.rowCount + 1,
                }
              : tab,
          ),
          gridTab("Community Nursing", [["Title", "Horizon"]], 99, 6),
        ],
      })

      await expect(httpRepository().addRoadmap(input())).resolves.toEqual({
        status: "short-name-taken",
      })
      expect(spreadsheet.bodies).toHaveLength(1)
      expect(tabNamed(spreadsheet.tabs(), "Community Nursing")?.sheetId).toBe(
        99,
      )
    })

    it("says the roadmap may have been added when the re-read finds an index it can't read (S7)", async () => {
      serveStatefulSpreadsheet(addingTabs(), {
        write: { lost: "not-applied" },
        // A co-lead empties the index as the write is sent.
        beforeWrite: (tabs) =>
          tabs.map((tab) =>
            tab.title === "Roadmaps" ? { ...tab, rows: [] } : tab,
          ),
      })

      await expect(httpRepository().addRoadmap(input())).resolves.toEqual({
        status: "unconfirmed",
      })
    })
  })

  describe("adding or changing a family (STY-029)", () => {
    const FAMILY_ROWS = [
      ["ID", "Name", "Name (cy)", "Colour"],
      ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12A3C9"],
      ["vdkxj63m", "Medicines & Diagnostics", "", "#006747"],
      ["skipped1", "Bad colour", "", "teal"],
    ]
    /** The example index, as the first tab with this title, and the family list. */
    const familyTabs = (indexTitle = "Roadmaps"): FakeTab[] => [
      gridTab(indexTitle, EXAMPLE_ROWS, 0),
      gridTab("Families", FAMILY_ROWS, 30, 1),
    ]
    const singleRecord = {
      id: "fc29g5b9",
      name: { en: "Single Record", cy: "Cofnod Sengl" },
      colour: "#12a3c9",
    }
    const rename = {
      family: singleRecord,
      changes: { name: "Shared Care Record", colour: "#00796b" },
      members: ["producta"],
    }

    it("appends a row after the last, with an ID no row holds, after two reads (S2)", async () => {
      const before = familyTabs()
      const spreadsheet = serveStatefulSpreadsheet(before)
      nextItemIds.push("fc29g5b9", "skipped1", "newfamxx")

      await expect(
        httpRepository().addFamily({ name: "Screening", colour: "#00796b" }),
      ).resolves.toEqual({
        status: "saved",
        family: {
          id: "newfamxx",
          name: { en: "Screening", cy: "" },
          colour: "#00796b",
        },
      })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Families!R5C1 newfamxx",
        "Families!R5C2 Screening",
        "Families!R5C4 #00796b",
      ])
      expect(spreadsheet.bodies).toEqual([
        {
          requests: [
            {
              appendCells: {
                sheetId: 30,
                rows: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "newfamxx" } },
                      { userEnteredValue: { stringValue: "Screening" } },
                      {},
                      { userEnteredValue: { stringValue: "#00796b" } },
                    ],
                  },
                ],
                fields: "userEnteredValue",
              },
            },
          ],
        },
      ])
      expect(
        spreadsheet.requests.filter(({ method }) => method === "GET"),
      ).toHaveLength(2)
    })

    it("keeps a family a co-lead added after the read, appending after it (S2)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(familyTabs(), {
        beforeWrite: (tabs) =>
          tabs.map((tab) =>
            tab.title === "Families"
              ? {
                  ...tab,
                  rows: [
                    ...tab.rows,
                    ["colead01", "Screening Wales", "", "#123456"],
                  ],
                  rowCount: tab.rowCount + 1,
                }
              : tab,
          ),
      })

      await httpRepository().addFamily({ name: "Screening", colour: "#00796b" })

      const families = spreadsheet
        .tabs()
        .find(({ title }) => title === "Families")
      expect(families?.rows.slice(-2).map((row) => row[1])).toEqual([
        "Screening Wales",
        "Screening",
      ])
    })

    it("writes the family's changed cells and its roadmaps' rows, linking each by ID, in one batchUpdate (S4, S9)", async () => {
      const before = familyTabs()
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(httpRepository().changeFamily(rename)).resolves.toEqual({
        status: "saved",
        family: {
          ...singleRecord,
          name: { en: "Shared Care Record", cy: "Cofnod Sengl" },
          colour: "#00796b",
        },
      })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R1C16 Family ID",
        "Roadmaps!R2C5 Shared Care Record",
        "Roadmaps!R2C8 #00796b",
        "Roadmaps!R2C13 Cofnod Sengl",
        "Roadmaps!R2C16 fc29g5b9",
        "Families!R2C2 Shared Care Record",
        "Families!R2C4 #00796b",
      ])
      expect(spreadsheet.bodies).toHaveLength(1)
    })

    it("writes only the field changed", async () => {
      const before = familyTabs()
      const spreadsheet = serveStatefulSpreadsheet(before)

      await httpRepository().changeFamily({
        ...rename,
        changes: { name: "Shared Care Record" },
      })

      expect(
        changedCells(before, spreadsheet.tabs()).filter((change) =>
          change.startsWith("Families!"),
        ),
      ).toEqual(["Families!R2C2 Shared Care Record"])
    })

    it("fails with invalid-data, writing nothing, when the index is the Template tab", async () => {
      const spreadsheet = serveStatefulSpreadsheet(familyTabs("Template"))

      await expect(httpRepository().changeFamily(rename)).rejects.toMatchObject(
        { kind: "invalid-data" },
      )
      expect(spreadsheet.bodies).toEqual([])
    })

    it("rethrows a lost write's network error when the family holds the change but its roadmaps don't (S4)", async () => {
      const [index, families] = familyTabs()
      if (index === undefined || families === undefined) throw new Error()
      serveStatefulSpreadsheet(
        [
          index,
          {
            ...families,
            rows: families.rows.map((row) =>
              row[0] === "fc29g5b9" ? [...row.slice(0, 3), "#00796b"] : row,
            ),
          },
        ],
        { write: { lost: "not-applied" } },
      )

      await expect(
        httpRepository().changeFamily({
          family: singleRecord,
          changes: { colour: "#00796b" },
          members: ["producta"],
        }),
      ).rejects.toMatchObject({ kind: "network" })
    })

    it("rethrows a lost write's network error when a co-lead's rename unlinked a roadmap it named (S4)", async () => {
      serveStatefulSpreadsheet(familyTabs(), {
        write: { lost: "not-applied" },
        beforeWrite: (tabs) =>
          tabs.map((tab) =>
            tab.title === "Families"
              ? {
                  ...tab,
                  rows: tab.rows.map((row) =>
                    row[0] === "fc29g5b9"
                      ? [row[0], "Shared Care Record", ...row.slice(2)]
                      : row,
                  ),
                }
              : tab,
          ),
      })

      await expect(
        httpRepository().changeFamily({
          family: singleRecord,
          changes: { name: "Shared Care Record" },
          members: ["producta"],
        }),
      ).rejects.toMatchObject({ kind: "network" })
    })
  })

  describe("making a roadmap match its lists (STY-030)", () => {
    const FAMILY_ROWS = [
      ["ID", "Name", "Name (cy)", "Colour"],
      ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12a3c9"],
    ]
    const CATEGORY_ROWS = [
      ["ID", "Name", "Name (cy)"],
      ["khzpchkh", "GP & Community Services", "Meddygon Teulu"],
    ]
    /** The example index with these IDs and the colour it names, apart from the lists. */
    const index = (colour: string) =>
      EXAMPLE_ROWS.map((row, r) => {
        const cells =
          r === 0
            ? [...row, "Family ID", "Category ID"]
            : r === 1
              ? [...row, "fc29g5b9", "khzpchkh"]
              : row
        return r === 1
          ? cells.map((cell, c) => (c === 7 ? colour : cell))
          : cells
      })
    const tabs = (colour = "#325083"): FakeTab[] => [
      gridTab("Roadmaps", index(colour), 0),
      gridTab("ProductA", EXAMPLE_TAB_ROWS.ProductA ?? [], 10, 1),
      gridTab("Families", FAMILY_ROWS, 30, 2),
      gridTab("Categories", CATEGORY_ROWS, 40, 3),
    ]
    const loaded = (overrides: Partial<Roadmap> = {}): Roadmap => ({
      ...createTestRoadmap("producta", "Product A roadmap"),
      family: { en: "Single Record", cy: "Cofnod Sengl" },
      familyId: "fc29g5b9",
      colour: "#12a3c9",
      category: { en: "GP & Community Services", cy: "Meddygon Teulu" },
      categoryId: "khzpchkh",
      outOfStep: true,
      // What the example row holds, whatever the lists say.
      copied: {
        family: { en: "Single Record", cy: "" },
        colour: "#325083",
        category: "GP & Community Services",
      },
      ...overrides,
    })

    it("writes the row's copied cells from the lists in one batchUpdate, nothing else (S1)", async () => {
      const before = tabs()
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().matchRoadmapToLists(loaded()),
      ).resolves.toEqual({ status: "matched" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R2C8 #12a3c9",
        "Roadmaps!R2C13 Cofnod Sengl",
      ])
      expect(spreadsheet.bodies).toHaveLength(1)
    })

    it("settles a lost answer by a re-read: matched once it finds the row in step, unconfirmed once it fails (DEF-015)", async () => {
      serveStatefulSpreadsheet(tabs(), { write: { lost: "applied" } })
      await expect(
        httpRepository().matchRoadmapToLists(loaded()),
      ).resolves.toEqual({ status: "matched" })

      serveStatefulSpreadsheet(tabs(), { write: { lost: "reread-fails" } })
      await expect(
        httpRepository().matchRoadmapToLists(loaded()),
      ).resolves.toEqual({ status: "unconfirmed" })

      serveStatefulSpreadsheet(tabs(), { write: { lost: "not-applied" } })
      await expect(
        httpRepository().matchRoadmapToLists(loaded()),
      ).rejects.toMatchObject({ kind: "network" })
    })

    it("writes nothing when a co-lead edited one of the row's own copied cells meanwhile, though it is still out of step (S4)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(tabs("#ff0000"))

      await expect(
        httpRepository().matchRoadmapToLists(loaded()),
      ).resolves.toMatchObject({ status: "changed" })
      expect(spreadsheet.bodies).toEqual([])
    })

    it("writes nothing when the roadmap is no longer out of step, or changed since it loaded (S4)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(tabs("#12a3c9"))

      await expect(
        httpRepository().matchRoadmapToLists(loaded({ colour: "#ff0000" })),
      ).resolves.toMatchObject({ status: "changed" })
      expect(spreadsheet.bodies).toEqual([])
    })

    it("fails with invalid-data, writing nothing, when the index is the Template tab", async () => {
      const spreadsheet = serveStatefulSpreadsheet(
        tabs().map((tab) =>
          tab.title === "Roadmaps" ? { ...tab, title: "Template" } : tab,
        ),
      )

      await expect(
        httpRepository().matchRoadmapToLists(loaded()),
      ).rejects.toMatchObject({ kind: "invalid-data" })
      expect(spreadsheet.bodies).toEqual([])
    })
  })

  describe("publishing or unpublishing a roadmap (STY-035)", () => {
    /** The example spreadsheet, with its index's rows as `edit` leaves them. */
    const tabs = (edit = (rows: string[][]) => rows): FakeTab[] => [
      gridTab("Roadmaps", edit(EXAMPLE_ROWS.map((row) => [...row])), 0),
      gridTab("ProductA", EXAMPLE_TAB_ROWS.ProductA ?? [], 10, 1),
      gridTab("ProductC", EXAMPLE_TAB_ROWS.ProductC ?? [], 20, 2),
    ]
    /** The roadmap with this id as a page loads it from `before`. */
    const loadedFrom = async (before: FakeTab[], id: string) => {
      serveStatefulSpreadsheet(before)
      const roadmap = (await httpRepository().listRoadmaps()).find(
        (each) => each.id === id,
      )
      if (roadmap === undefined) throw new Error(`No ${id}`)
      return roadmap
    }
    /** The `Item ID` column added to Product C's tab, and its one item's new ID. */
    const productCItemId = [
      "ProductC!R1C8 Item ID",
      expect.stringMatching(/^ProductC!R2C8 \S+$/) as string,
    ]
    /** Product C's `Enabled` cell (row 4, column 2) set to `value`. */
    const enabled = (value: string) => (rows: string[][]) => {
      const row = rows[3]
      if (row) row[1] = value
      return rows
    }

    it("writes the row's Enabled cell as exactly Yes, alone, in one batchUpdate (S2)", async () => {
      const before = tabs()
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, { published: true }),
      ).resolves.toEqual({ status: "set" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R4C2 Yes",
      ])
      expect(spreadsheet.bodies).toHaveLength(1)
    })

    it.each(["yes", "", "TRUE"])(
      "overwrites an Enabled cell of %j with exactly Yes (D9)",
      async (value) => {
        const before = tabs(enabled(value))
        const productC = await loadedFrom(before, "productc")
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().setRoadmapPublished(productC, {
          published: true,
        })

        expect(changedCells(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R4C2 Yes",
        ])
      },
    )

    it("unpublishes by writing exactly No, reading no roadmap's tab (S3)", async () => {
      const before = tabs()
      const productA = await loadedFrom(before, "producta")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productA, { published: false }),
      ).resolves.toEqual({ status: "set" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R2C2 No",
      ])
      expect(
        spreadsheet.requests.map((request) => tabTitleOf(request)),
      ).not.toContain("ProductA")
    })

    it("writes exactly No over a blank Enabled cell (D9)", async () => {
      const before = tabs(enabled(""))
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await httpRepository().setRoadmapPublished(productC, {
        published: false,
      })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R4C2 No",
      ])
    })

    it("writes Enabled and today's date, ticked, in one batchUpdate (STY-036 S6)", async () => {
      const before = tabs()
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, {
          published: true,
          changes: markedUpdated(NO_CHANGES, "2026-11-13"),
        }),
      ).resolves.toEqual({ status: "set" })

      // Each item without an ID gets one, as with any write of a publish (ADR-012).
      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R4C2 Yes",
        "Roadmaps!R4C7 2026-11-13",
        ...productCItemId,
      ])
      expect(spreadsheet.bodies).toHaveLength(1)
    })

    it("still writes today's date, ticked, when Enabled already reads Yes (STY-036 D10)", async () => {
      const productC = await loadedFrom(tabs(), "productc")
      const before = tabs(enabled("Yes"))
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, {
          published: true,
          changes: markedUpdated(NO_CHANGES, "2026-11-13"),
        }),
      ).resolves.toEqual({ status: "set" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R4C7 2026-11-13",
        ...productCItemId,
      ])
    })

    it("adds an Enabled column, headed, when the index has none (D10)", async () => {
      const before = tabs((rows) => rows.map((row) => row.toSpliced(1, 1)))
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, { published: true }),
      ).resolves.toEqual({ status: "set" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R1C15 Enabled",
        "Roadmaps!R4C15 Yes",
      ])
    })

    it("refuses a three-digit colour however it is cased, naming it as written (S4)", async () => {
      const before = tabs((rows) => {
        const row = rows[3]
        if (row) row[7] = "#9A8"
        return rows
      })
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, { published: true }),
      ).resolves.toEqual({
        status: "unpublishable",
        problems: [{ code: "short-colour", colour: "#9A8" }],
      })
      expect(spreadsheet.bodies).toEqual([])
    })

    it("fails with invalid-data, writing nothing, when the index is the Template tab", async () => {
      const before = tabs()
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(
        before.map((tab) =>
          tab.title === "Roadmaps" ? { ...tab, title: "Template" } : tab,
        ),
      )

      await expect(
        httpRepository().setRoadmapPublished(productC, { published: true }),
      ).rejects.toMatchObject({ kind: "invalid-data" })
      expect(spreadsheet.bodies).toEqual([])
    })
  })
})
