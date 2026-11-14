import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import {
  copyTemplateRequests,
  newSheetId,
  usableTemplate,
} from "./template-tab"

const properties = (rowCount?: number, hidden?: boolean) => ({
  sheetId: 20,
  title: "Template",
  ...(hidden === undefined ? {} : { hidden }),
  ...(rowCount === undefined ? {} : { gridProperties: { rowCount } }),
})
const copy = { sheetId: 77, title: "Community Nursing", index: 4 }

/** Each request's kind, in order. */
const kinds = (requests: readonly object[]) =>
  requests.flatMap((request) => Object.keys(request))

describe("usableTemplate (STY-040 S6)", () => {
  it("is the tab's ID, its rows and whether it is hidden", () => {
    expect(usableTemplate(properties(12, true), ["Title", "horizon"])).toEqual({
      sheetId: 20,
      rowCount: 12,
      hidden: true,
    })
    expect(usableTemplate(properties(1), ["Horizon", "Title"]).hidden).toBe(
      false,
    )
  })

  it.each([
    ["there is no Template tab", undefined, ["Title", "Horizon"]],
    ["it has no grid", properties(), ["Title", "Horizon"]],
    ["its header has no Title column", properties(3), ["Name", "Horizon"]],
    ["its header has no Horizon column", properties(3), ["Title"]],
    ["it is empty", properties(3), []],
  ])("throws invalid-data when %s", (_, tab, header) => {
    const error: unknown = (() => {
      try {
        return usableTemplate(tab, header)
      } catch (reason) {
        return reason
      }
    })()

    expect(isAppError(error) && error.kind).toBe("invalid-data")
  })
})

describe("copyTemplateRequests (STY-040 S2)", () => {
  it("copies a Template of a header alone, and nothing more", () => {
    expect(
      copyTemplateRequests({ sheetId: 20, rowCount: 1, hidden: false }, copy),
    ).toEqual([
      {
        duplicateSheet: {
          sourceSheetId: 20,
          insertSheetIndex: 4,
          newSheetId: 77,
          newSheetName: "Community Nursing",
        },
      },
    ])
  })

  it("clears the one row under the header, deleting none, when there is no other", () => {
    expect(
      kinds(
        copyTemplateRequests({ sheetId: 20, rowCount: 2, hidden: false }, copy),
      ),
    ).toEqual(["duplicateSheet", "updateCells"])
  })

  it("shows the copy of a hidden Template, deletes every row after the first under its header, and clears that one", () => {
    expect(
      copyTemplateRequests(
        { sheetId: 20, rowCount: 12, hidden: true },
        copy,
      ).slice(1),
    ).toEqual([
      {
        updateSheetProperties: {
          properties: { sheetId: 77, hidden: false },
          fields: "hidden",
        },
      },
      {
        deleteDimension: {
          range: {
            sheetId: 77,
            dimension: "ROWS",
            startIndex: 2,
            endIndex: 12,
          },
        },
      },
      {
        updateCells: {
          range: { sheetId: 77, startRowIndex: 1, endRowIndex: 2 },
          fields: "*",
        },
      },
    ])
  })
})

describe("newSheetId (STY-040 D13)", () => {
  it("is a number no tab has", () => {
    const random = [0, 20, 20, 41]

    expect(newSheetId(new Set([0, 20]), () => random.shift() ?? 99)).toBe(41)
  })

  it("is a whole number Google takes as a tab's ID", () => {
    const sheetId = newSheetId(new Set())

    expect(Number.isInteger(sheetId)).toBe(true)
    expect(sheetId).toBeGreaterThanOrEqual(0)
    expect(sheetId).toBeLessThan(2 ** 31)
  })
})
