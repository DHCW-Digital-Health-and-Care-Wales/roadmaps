import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import {
  copyTemplateRequests,
  newSheetId,
  type TemplateTab,
  usableTemplate,
} from "./template-tab"

const properties = (
  rowCount?: number,
  hidden?: boolean,
  frozenRowCount?: number,
) => ({
  sheetId: 20,
  title: "Template",
  ...(hidden === undefined ? {} : { hidden }),
  ...(rowCount === undefined
    ? {}
    : {
        gridProperties: {
          rowCount,
          ...(frozenRowCount === undefined ? {} : { frozenRowCount }),
        },
      }),
})
const template = (
  rowCount: number,
  overrides: Partial<TemplateTab> = {},
): TemplateTab => ({
  sheetId: 20,
  rowCount,
  frozenRowCount: 0,
  hidden: false,
  ...overrides,
})
const copy = { sheetId: 77, title: "Community Nursing", index: 4 }

/** Each request's kind, in order. */
const kinds = (requests: readonly object[]) =>
  requests.flatMap((request) => Object.keys(request))

describe("usableTemplate (STY-040 S6)", () => {
  it("is the tab's ID, its rows, those frozen and whether it is hidden", () => {
    expect(
      usableTemplate(properties(12, true, 2), ["Title", "horizon"]),
    ).toEqual({ sheetId: 20, rowCount: 12, frozenRowCount: 2, hidden: true })
    // Google leaves out a count of no frozen rows, and a tab that is shown.
    expect(usableTemplate(properties(1), ["Horizon", "Title"])).toEqual({
      sheetId: 20,
      rowCount: 1,
      frozenRowCount: 0,
      hidden: false,
    })
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
    expect(copyTemplateRequests(template(1), copy)).toEqual([
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
      kinds(copyTemplateRequests(template(2, { frozenRowCount: 1 }), copy)),
    ).toEqual(["duplicateSheet", "updateCells"])
  })

  it("shows the copy of a hidden Template, deletes every row after the first under its header, and clears that one", () => {
    expect(
      copyTemplateRequests(
        template(12, { hidden: true, frozenRowCount: 1 }),
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

  it("leaves the copy's header alone frozen, before deleting, when the Template freezes more rows", () => {
    const requests = copyTemplateRequests(
      template(12, { frozenRowCount: 3 }),
      copy,
    )

    expect(kinds(requests)).toEqual([
      "duplicateSheet",
      "updateSheetProperties",
      "deleteDimension",
      "updateCells",
    ])
    expect(requests[1]).toEqual({
      updateSheetProperties: {
        properties: { sheetId: 77, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    })
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
