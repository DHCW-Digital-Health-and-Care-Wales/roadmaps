import { describe, expect, it } from "vitest"
import { ZodError } from "zod"

import { AppError } from "@/lib/errors"

import { describeGoogleError, parseSpreadsheetMetadata } from "./sheets-schemas"

describe("parseSpreadsheetMetadata", () => {
  it("parses worksheet properties, ignoring fields it does not use", () => {
    const metadata = parseSpreadsheetMetadata({
      spreadsheetId: "abc",
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: "Roadmap",
            index: 0,
            gridProperties: {},
          },
          protectedRanges: [],
        },
        { properties: { sheetId: 9, title: "Old", index: 1, hidden: true } },
        { properties: { sheetId: 3, title: "Minimal" } },
      ],
    })

    expect(metadata).toStrictEqual({
      sheets: [
        { properties: { sheetId: 0, title: "Roadmap", index: 0 } },
        { properties: { sheetId: 9, title: "Old", index: 1, hidden: true } },
        { properties: { sheetId: 3, title: "Minimal" } },
      ],
    })
  })

  it.each([
    ["a missing sheets field", {}],
    ["an empty sheets array", { sheets: [] }],
  ])("treats %s as an empty spreadsheet", (_, json) => {
    expect(parseSpreadsheetMetadata(json)).toStrictEqual({ sheets: [] })
  })

  it.each([
    ["null", null],
    ["a string", "<html>"],
    ["an array", []],
    ["sheets that is not an array", { sheets: {} }],
    ["sheets: null", { sheets: null }],
    ["a sheet without properties", { sheets: [{}] }],
    ["a missing title", { sheets: [{ properties: { sheetId: 1 } }] }],
    ["a missing sheetId", { sheets: [{ properties: { title: "A" } }] }],
    [
      "a string sheetId",
      { sheets: [{ properties: { sheetId: "1", title: "A" } }] },
    ],
    [
      "a fractional sheetId",
      { sheets: [{ properties: { sheetId: 1.5, title: "A" } }] },
    ],
    ["a numeric title", { sheets: [{ properties: { sheetId: 1, title: 7 } }] }],
    [
      "a string hidden flag",
      { sheets: [{ properties: { sheetId: 1, title: "A", hidden: "true" } }] },
    ],
    [
      "a string index",
      { sheets: [{ properties: { sheetId: 1, title: "A", index: "0" } }] },
    ],
  ])("rejects %s as an invalid response", (_, json) => {
    let thrown: unknown
    try {
      parseSpreadsheetMetadata(json)
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(AppError)
    expect(thrown).toMatchObject({ kind: "invalid-response", retryable: false })
    expect((thrown as AppError).cause).toBeInstanceOf(ZodError)
  })
})

describe("describeGoogleError", () => {
  it("joins Google's error status and message", () => {
    expect(
      describeGoogleError({
        error: { code: 403, status: "PERMISSION_DENIED", message: "No access" },
      }),
    ).toBe("PERMISSION_DENIED: No access")
  })

  it("uses whichever part is present", () => {
    expect(describeGoogleError({ error: { status: "NOT_FOUND" } })).toBe(
      "NOT_FOUND",
    )
    expect(describeGoogleError({ error: { message: "Gone" } })).toBe("Gone")
  })

  it.each([[undefined], ["text"], [{}], [{ error: "x" }], [{ error: {} }]])(
    "returns undefined for the unexpected body %j",
    (body) => {
      expect(describeGoogleError(body)).toBeUndefined()
    },
  )
})
