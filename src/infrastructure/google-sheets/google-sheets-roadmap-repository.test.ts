import { HttpResponse } from "msw"
import { http } from "msw/http"
import { describe, expect, it, vi } from "vitest"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import { describeRoadmapRepositoryContract } from "@/domain/roadmap/testing/roadmap-repository-contract"
import { AppError } from "@/lib/errors"
import { server } from "@/test/msw-server"

import roadmapsCsv from "../../../tests/fixtures/sheets/Roadmaps.csv?raw"
import { parseCsv } from "../../../tests/fixtures/sheets/parse-csv"
import { GoogleSheetsRoadmapRepository } from "./google-sheets-roadmap-repository"
import {
  CATEGORY_SHEET_VALUES,
  parseRoadmapIndex,
} from "./roadmap-index-parser"
import { createSheetsClient, type SheetsClient } from "./sheets-client"

const SPREADSHEET_ID = "spreadsheet-1"
const ENDPOINT = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
const VALUES_ENDPOINT = `${ENDPOINT}/values/*`
const METADATA_FIELDS = "sheets(properties(sheetId,title,index,hidden))"
const VALUES_PARAMS = [
  ["majorDimension", "ROWS"],
  ["valueRenderOption", "FORMATTED_VALUE"],
  ["fields", "values"],
]

/** The example spreadsheet's roadmap index (`tests/fixtures/sheets/Roadmaps.csv`). */
const EXAMPLE_ROWS = parseCsv(roadmapsCsv)

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
  /** The values response of whichever tab is read. */
  values?: unknown
}

/** Serves both reads over HTTP; records each request. */
function serveSpreadsheet({
  tabs = EXAMPLE_TABS,
  values = { values: EXAMPLE_ROWS },
}: Spreadsheet = {}) {
  const requests: Request[] = []
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      requests.push(request)
      return HttpResponse.json(metadataFor(tabs))
    }),
    http.get(VALUES_ENDPOINT, ({ request }) => {
      requests.push(request)
      return HttpResponse.json(values as Record<string, unknown>)
    }),
  )
  return requests
}

/** A repository over the real client, talking to MSW. */
function httpRepository() {
  return new GoogleSheetsRoadmapRepository({
    client: createSheetsClient({ getAccessToken: () => "token-123" }),
    spreadsheetId: SPREADSHEET_ID,
  })
}

/** A repository over a stub client that answers the metadata, then the values read. */
function stubRepository(metadata: unknown, values: unknown) {
  const getJson = vi
    .fn<SheetsClient["getJson"]>()
    .mockResolvedValueOnce(metadata)
    .mockResolvedValueOnce(values)
  const repository = new GoogleSheetsRoadmapRepository({
    client: { getJson },
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
    ],
    ...roadmaps.map((roadmap) => [
      roadmap.id,
      roadmap.published ? "Yes" : "No",
      roadmap.category ? CATEGORY_SHEET_VALUES[roadmap.category] : "",
      roadmap.productLead ?? "",
      roadmap.lastUpdated ?? "",
      roadmap.colour ?? "",
      ...text(roadmap.title),
      ...text(roadmap.family),
      ...text(roadmap.statusLabel),
      ...text(roadmap.vision),
      ...text(roadmap.serviceDescription),
    ]),
  ]
}

describeRoadmapRepositoryContract("GoogleSheetsRoadmapRepository", {
  withRoadmaps(roadmaps) {
    serveSpreadsheet({
      tabs: [
        { title: "Roadmaps" },
        ...roadmaps.map(({ id }, i) => ({ title: id, index: i + 1 })),
      ],
      values: { values: indexRowsFor(roadmaps) },
    })
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
        client: { getJson: () => Promise.reject(failure) },
        spreadsheetId: SPREADSHEET_ID,
      })

      await expect(repository.listRoadmaps()).rejects.toBe(failure)
    })
  })
})
