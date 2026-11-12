import { describe, expect, it } from "vitest"

import { applyBatchUpdate, type GridTab } from "./apply-batch-update"

const index = (): GridTab => ({
  title: "Roadmaps",
  sheetId: 0,
  rows: [
    ["Sheet", "Title", "Last updated", "Title (cy)"],
    ["ProductA", "Old title", "2026-10-01", "Hen deitl"],
  ],
  rowCount: 2,
  columnCount: 4,
})

const template = (): GridTab => ({
  title: "Template",
  sheetId: 9,
  rows: [["Title"]],
  rowCount: 1,
  columnCount: 1,
})

const cell = (
  sheetId: number,
  rowIndex: number,
  columnIndex: number,
  stringValue?: string,
) => ({
  updateCells: {
    start: { sheetId, rowIndex, columnIndex },
    rows: [
      {
        values: [
          stringValue === undefined
            ? {}
            : { userEnteredValue: { stringValue } },
        ],
      },
    ],
    fields: "userEnteredValue",
  },
})

describe("applyBatchUpdate", () => {
  it("applies every request in order, appending columns before writing to them", () => {
    const tabs = [index()]

    const result = applyBatchUpdate(tabs, {
      requests: [
        cell(0, 1, 1, "New title"),
        {
          appendDimension: { sheetId: 0, dimension: "COLUMNS", length: 1 },
        },
        cell(0, 0, 4, "Colour"),
        cell(0, 1, 4, "#325083"),
        cell(0, 1, 0),
      ],
    })

    expect(result).toEqual({
      tabs: [
        {
          ...index(),
          rows: [
            ["Sheet", "Title", "Last updated", "Title (cy)", "Colour"],
            ["", "New title", "2026-10-01", "Hen deitl", "#325083"],
          ],
          columnCount: 5,
        },
      ],
      violations: [],
    })
    expect(tabs).toEqual([index()])
  })

  it.each([
    ["an unknown tab", cell(5, 1, 1, "x")],
    ["a cell beyond the grid", cell(0, 1, 4, "x")],
    ["a row beyond the grid", cell(0, 2, 0, "x")],
  ])("rejects the whole body, changing nothing, for %s", (_, bad) => {
    const result = applyBatchUpdate([index()], {
      requests: [cell(0, 1, 1, "New title"), bad],
    })

    expect(result).toMatchObject({ error: expect.any(String) as string })
  })

  it("rejects a body it cannot read, as a violation", () => {
    const result = applyBatchUpdate([index()], { requests: [{ nope: {} }] })

    expect(result).toMatchObject({ error: expect.any(String) as string })
    expect(result.violations).toHaveLength(1)
  })

  it.each([
    ["the Template tab", [template()], cell(9, 0, 0, "Name"), "in Template"],
    ["a Welsh column", [index()], cell(0, 1, 3, "Teitl"), "Welsh column"],
    [
      "a Welsh header",
      [{ ...index(), columnCount: 5 }],
      cell(0, 0, 4, "Vision (cy)"),
      "Welsh column",
    ],
    ["Last updated", [index()], cell(0, 1, 2, "2026-11-01"), "Last updated"],
    ["an unchanged cell", [index()], cell(0, 1, 1, "Old title"), "unchanged"],
    [
      "a number",
      [index()],
      {
        updateCells: {
          ...cell(0, 1, 1).updateCells,
          rows: [{ values: [{ userEnteredValue: { numberValue: 42 } }] }],
        },
      },
      "written as",
    ],
    [
      "other fields",
      [index()],
      {
        updateCells: {
          ...cell(0, 1, 1, "New").updateCells,
          fields: "*",
        },
      },
      "fields",
    ],
    [
      "added rows",
      [index()],
      { appendDimension: { sheetId: 0, dimension: "ROWS", length: 1 } },
      "not COLUMNS",
    ],
  ])("records a write to %s as a violation", (_, tabs, request, violation) => {
    const result = applyBatchUpdate(tabs, { requests: [request] })

    expect(result.violations).toEqual([
      expect.stringContaining(violation) as string,
    ])
  })

  it("appends a row to Families after the last row in use, growing the grid (STY-029)", () => {
    const families: GridTab = {
      title: "Families",
      sheetId: 1,
      rows: [
        ["ID", "Name", "Name (cy)", "Colour"],
        ["a1", "One", "", "#000000"],
        [],
      ],
      rowCount: 2,
      columnCount: 4,
    }
    const append = (name: string) => ({
      appendCells: {
        sheetId: 1,
        rows: [
          {
            values: [
              { userEnteredValue: { stringValue: "b2" } },
              { userEnteredValue: { stringValue: name } },
              {},
              { userEnteredValue: { stringValue: "#00796b" } },
            ],
          },
        ],
        fields: "userEnteredValue",
      },
    })

    const result = applyBatchUpdate([families], {
      requests: [append("Two"), append("Three")],
    })

    expect(result).toEqual({
      tabs: [
        {
          ...families,
          rows: [
            ["ID", "Name", "Name (cy)", "Colour"],
            ["a1", "One", "", "#000000"],
            ["b2", "Two", "", "#00796b"],
            ["b2", "Three", "", "#00796b"],
          ],
          rowCount: 4,
        },
      ],
      violations: [],
    })
  })

  it("records a row appended to a tab but Families as a violation", () => {
    const result = applyBatchUpdate([index()], {
      requests: [
        {
          appendCells: {
            sheetId: 0,
            rows: [{ values: [{ userEnteredValue: { stringValue: "x" } }] }],
            fields: "userEnteredValue",
          },
        },
      ],
    })

    expect(result.violations).toEqual(["appendCells on Roadmaps"])
  })

  it("allows Family (cy), the family's Welsh name copied from its list (ADR-013)", () => {
    const tab = {
      ...index(),
      rows: [["Sheet", "Family - Cymraeg"], ["ProductA"]],
      columnCount: 2,
    }

    const result = applyBatchUpdate([tab], {
      requests: [cell(0, 1, 1, "Cofnod Sengl")],
    })

    expect(result.violations).toEqual([])
  })
})
