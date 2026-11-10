import { HttpResponse } from "msw"
import { http } from "msw/http"
import { describe, expect, it, vi } from "vitest"

import { describeRoadmapRepositoryContract } from "@/domain/roadmap/testing/roadmap-repository-contract"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { AppError } from "@/lib/errors"
import { server } from "@/test/msw-server"

import { GoogleSheetsRoadmapRepository } from "./google-sheets-roadmap-repository"
import { createSheetsClient, type SheetsClient } from "./sheets-client"

const SPREADSHEET_ID = "spreadsheet-1"
const ENDPOINT = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
const FIELDS = "sheets(properties(sheetId,title,index,hidden))"

/** A repository over the real client, talking to MSW. */
function httpRepository() {
  return new GoogleSheetsRoadmapRepository({
    client: createSheetsClient({ getAccessToken: () => "token-123" }),
    spreadsheetId: SPREADSHEET_ID,
  })
}

/** A repository over a stub client that returns `json` for any request. */
function stubRepository(json: unknown) {
  const getJson = vi.fn<SheetsClient["getJson"]>(() => Promise.resolve(json))
  const repository = new GoogleSheetsRoadmapRepository({
    client: { getJson },
    spreadsheetId: SPREADSHEET_ID,
  })
  return { repository, getJson }
}

describeRoadmapRepositoryContract("GoogleSheetsRoadmapRepository", {
  withRoadmaps(roadmaps) {
    server.use(
      http.get(ENDPOINT, () =>
        HttpResponse.json({
          sheets: roadmaps.map(({ id, title }, index) => ({
            properties: { sheetId: Number(id), title: title.en, index },
          })),
        }),
      ),
    )
    return httpRepository()
  },
  failing() {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({}, { status: 500 })))
    return httpRepository()
  },
})

describe("GoogleSheetsRoadmapRepository", () => {
  it("requests the spreadsheet's worksheet metadata with an exact field mask", async () => {
    let request: Request | undefined
    server.use(
      http.get(ENDPOINT, (info) => {
        request = info.request
        return HttpResponse.json({})
      }),
    )

    await httpRepository().listRoadmaps()

    const url = new URL(request?.url ?? "")
    expect(url.origin + url.pathname).toBe(ENDPOINT)
    expect([...url.searchParams]).toEqual([["fields", FIELDS]])
    expect(request?.headers.get("Authorization")).toBe("Bearer token-123")
  })

  it("passes the abort signal to the client", async () => {
    const { repository, getJson } = stubRepository({})
    const { signal } = new AbortController()

    await repository.listRoadmaps({ signal })

    expect(getJson).toHaveBeenCalledWith(`/${SPREADSHEET_ID}`, {
      searchParams: { fields: FIELDS },
      signal,
    })
  })

  it("maps sheetId to a string id (including 0) and the title to an English title", async () => {
    const { repository } = stubRepository({
      sheets: [
        { properties: { sheetId: 0, title: "First", index: 0 } },
        { properties: { sheetId: 2_147_483_647, title: "Big id", index: 1 } },
      ],
    })

    await expect(repository.listRoadmaps()).resolves.toStrictEqual([
      createTestRoadmap("0", "First"),
      createTestRoadmap("2147483647", "Big id"),
    ])
  })

  it("lists each worksheet as published, with nothing else known about it (until STY-011)", async () => {
    const { repository } = stubRepository({
      sheets: [{ properties: { sheetId: 7, title: "Platform", index: 0 } }],
    })

    await expect(repository.listRoadmaps()).resolves.toStrictEqual([
      {
        id: "7",
        title: { en: "Platform", cy: "" },
        published: true,
        category: null,
        family: null,
        statusLabel: null,
        productLead: null,
        lastUpdated: null,
        colour: null,
        vision: null,
        serviceDescription: null,
      },
    ])
  })

  it("preserves response order rather than sorting by index or id", async () => {
    const { repository } = stubRepository({
      sheets: [
        { properties: { sheetId: 5, title: "C", index: 2 } },
        { properties: { sheetId: 1, title: "A", index: 0 } },
        { properties: { sheetId: 3, title: "B", index: 1 } },
      ],
    })

    const roadmaps = await repository.listRoadmaps()

    expect(roadmaps.map(({ title }) => title.en)).toEqual(["C", "A", "B"])
  })

  it("excludes hidden worksheets but keeps explicitly visible ones", async () => {
    const { repository } = stubRepository({
      sheets: [
        { properties: { sheetId: 1, title: "Visible" } },
        { properties: { sheetId: 2, title: "Hidden", hidden: true } },
        { properties: { sheetId: 3, title: "Shown", hidden: false } },
      ],
    })

    const roadmaps = await repository.listRoadmaps()

    expect(roadmaps.map(({ id }) => id)).toEqual(["1", "3"])
  })

  it("keeps worksheets regardless of their name", async () => {
    const { repository } = stubRepository({
      sheets: [
        { properties: { sheetId: 1, title: "Template" } },
        { properties: { sheetId: 2, title: "Roadmap template" } },
        { properties: { sheetId: 3, title: "_config" } },
      ],
    })

    const roadmaps = await repository.listRoadmaps()

    expect(roadmaps.map(({ title }) => title.en)).toEqual([
      "Template",
      "Roadmap template",
      "_config",
    ])
  })

  it("rejects a malformed response as invalid-response", async () => {
    const { repository } = stubRepository({
      sheets: [{ properties: { title: "A" } }],
    })

    await expect(repository.listRoadmaps()).rejects.toMatchObject({
      kind: "invalid-response",
    })
  })

  it("propagates client failures unchanged", async () => {
    const failure = new AppError("forbidden", { status: 403 })
    const repository = new GoogleSheetsRoadmapRepository({
      client: { getJson: () => Promise.reject(failure) },
      spreadsheetId: SPREADSHEET_ID,
    })

    await expect(repository.listRoadmaps()).rejects.toBe(failure)
  })

  it("maps an HTTP permission failure end to end", async () => {
    server.use(
      http.get(ENDPOINT, () =>
        HttpResponse.json(
          {
            error: {
              code: 403,
              status: "PERMISSION_DENIED",
              message: "No access",
            },
          },
          { status: 403 },
        ),
      ),
    )

    await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
      kind: "forbidden",
      status: 403,
    })
  })
})
