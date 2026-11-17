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

const productA = (): GridTab => ({
  title: "ProductA",
  sheetId: 10,
  rows: [["Title", "Horizon"]],
  rowCount: 1,
  columnCount: 2,
})

/** An `appendCells` of one row of text cells, a blank for `""`. */
const appendRow = (sheetId: number, values: readonly string[]) => ({
  appendCells: {
    sheetId,
    rows: [
      {
        values: values.map((stringValue) =>
          stringValue === "" ? {} : { userEnteredValue: { stringValue } },
        ),
      },
    ],
    fields: "userEnteredValue",
  },
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

  it.each(["2026-11-13", undefined])(
    "accepts Last updated written as a date or cleared, %j (STY-036 D2)",
    (value) => {
      expect(
        applyBatchUpdate([index()], { requests: [cell(0, 1, 2, value)] })
          .violations,
      ).toEqual([])
    },
  )

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
    [
      "Last updated, but as YYYY-MM-DD",
      [index()],
      cell(0, 1, 2, "13/11/2026"),
      "not YYYY-MM-DD",
    ],
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

  describe("a row appended to a roadmap's own tab (STY-045)", () => {
    /** Product A's tab, which the index's row names, holding one item. */
    const items = (): GridTab => ({
      ...productA(),
      rows: [
        ["Title", "Horizon", "Item ID", "Title (cy)"],
        ["Online booking", "Now", "k7q2xwbn"],
      ],
      rowCount: 2,
      columnCount: 4,
    })
    const other = (title: string): GridTab => ({
      title,
      sheetId: 11,
      rows: [["Title", "Horizon", "Item ID"]],
      rowCount: 1,
      columnCount: 3,
    })

    it("appends a new item's rows after the tab's last row in use", () => {
      const result = applyBatchUpdate([index(), items()], {
        requests: [
          appendRow(10, ["Letters by email", "Later", "fwd9s3hj"]),
          appendRow(10, ["Choose a clinic", "Not doing", "ckn7q2xw"]),
        ],
      })

      expect(result).toEqual({
        tabs: [
          index(),
          {
            ...items(),
            rows: [
              ...items().rows,
              ["Letters by email", "Later", "fwd9s3hj"],
              ["Choose a clinic", "Not doing", "ckn7q2xw"],
            ],
            rowCount: 4,
          },
        ],
        violations: [],
      })
    })

    it.each(["Notes", "Categories", "Template"])(
      "records a row appended to %s, a tab that is no roadmap's, as a violation",
      (title) => {
        const named = {
          ...index(),
          rows: [...index().rows, ["Categories"], ["Template"]],
          rowCount: 4,
        }

        const result = applyBatchUpdate([named, items(), other(title)], {
          requests: [appendRow(11, ["Choose a clinic", "Next", "ckn7q2xw"])],
        })

        expect(result.violations).toEqual([`appendCells on ${title}`])
      },
    )

    it.each([
      [
        "no Item ID",
        ["Choose a clinic", "Next"],
        "ProductA row appended without an Item ID",
      ],
      [
        "an Item ID another row has",
        ["Choose a clinic", "Next", "k7q2xwbn"],
        "ProductA row appended with the Item ID k7q2xwbn, which another row has",
      ],
      [
        "no title",
        ["", "Next", "ckn7q2xw"],
        "ProductA row appended without a Title",
      ],
      [
        "no horizon",
        ["Choose a clinic", "", "ckn7q2xw"],
        'ProductA row appended with the Horizon "", not one the public site reads',
      ],
      [
        "a horizon the public site doesn't write",
        ["Choose a clinic", "next", "ckn7q2xw"],
        'ProductA row appended with the Horizon "next", not one the public site reads',
      ],
      [
        "an Item ID the editor never makes",
        ["Choose a clinic", "Next", "clinic-1"],
        "ProductA row appended with the Item ID clinic-1, not in the Item ID format",
      ],
      [
        "a cell under no header",
        ["Choose a clinic", "Next", "ckn7q2xw", "", "Discovery"],
        "ProductA row appended with a cell under no header",
      ],
      [
        "a Welsh cell",
        ["Choose a clinic", "Next", "ckn7q2xw", "Dewis clinig"],
        "ProductA!R3C4 in a Welsh column",
      ],
    ])(
      "records a new item's row with %s as a violation",
      (_, row, violation) => {
        const result = applyBatchUpdate([index(), items()], {
          requests: [appendRow(10, row)],
        })

        expect(result.violations).toEqual([violation])
      },
    )

    it("finds each column by its header as the adapter does, whatever its case, spaces or punctuation", () => {
      const respelt = {
        ...items(),
        rows: [
          ["TITLE", " horizon ", "Item-ID", "Item ID"],
          ["Online booking", "Now", "k7q2xwbn"],
        ],
      }

      const result = applyBatchUpdate([index(), respelt], {
        requests: [appendRow(10, ["Choose a clinic", "Next", "ckn7q2xw"])],
      })

      expect(result.violations).toEqual([])
    })

    it("records the second of two rows appended with one Item ID as a violation", () => {
      const result = applyBatchUpdate([index(), items()], {
        requests: [
          appendRow(10, ["Letters by email", "Later", "ckn7q2xw"]),
          appendRow(10, ["Choose a clinic", "Next", "ckn7q2xw"]),
        ],
      })

      expect(result.violations).toEqual([
        "ProductA row appended with the Item ID ckn7q2xw, which another row has",
      ])
    })
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

describe("applyBatchUpdate copying the Template for a new roadmap (STY-040)", () => {
  const roadmaps = (): GridTab => ({
    title: "Roadmaps",
    sheetId: 0,
    rows: [
      ["Sheet", "Enabled", "Title"],
      ["ProductA", "Yes", "Product A roadmap"],
    ],
    rowCount: 2,
    columnCount: 3,
  })
  /** Hidden, its header frozen, with two example rows and a spare one. */
  const hiddenTemplate = (): GridTab => ({
    title: "Template",
    sheetId: 9,
    rows: [
      ["Title", "Horizon"],
      ["An example", "Now"],
      ["Another", "Later"],
    ],
    rowCount: 4,
    columnCount: 2,
    hidden: true,
    frozenRowCount: 1,
  })
  const tabs = () => [roadmaps(), productA(), hiddenTemplate()]

  const copy = (overrides: Record<string, unknown> = {}) => ({
    duplicateSheet: {
      sourceSheetId: 9,
      insertSheetIndex: 3,
      newSheetId: 77,
      newSheetName: "Community Nursing",
      ...overrides,
    },
  })
  const show = (sheetId = 77, hidden = false, fields = "hidden") => ({
    updateSheetProperties: { properties: { sheetId, hidden }, fields },
  })
  const freeze = (frozenRowCount: number, sheetId = 77) => ({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount } },
      fields: "gridProperties.frozenRowCount",
    },
  })
  const deleteRows = (
    startIndex: number,
    endIndex: number,
    sheetId = 77,
    dimension = "ROWS",
  ) => ({
    deleteDimension: { range: { sheetId, dimension, startIndex, endIndex } },
  })
  const clearRows = (
    startRowIndex: number,
    endRowIndex: number,
    sheetId = 77,
    fields = "*",
  ) => ({
    updateCells: { range: { sheetId, startRowIndex, endRowIndex }, fields },
  })
  const newRow = (enabled = "No", sheet = "Community Nursing") =>
    appendRow(0, [sheet, enabled, "Community Nursing roadmap"])

  it("copies the Template after the last tab, shown, down to its header, and appends the roadmap's row", () => {
    const before = tabs()

    const result = applyBatchUpdate(before, {
      requests: [copy(), show(), deleteRows(2, 4), clearRows(1, 2), newRow()],
    })

    expect(result).toEqual({
      tabs: [
        {
          ...roadmaps(),
          rows: [
            ...roadmaps().rows,
            ["Community Nursing", "No", "Community Nursing roadmap"],
          ],
          rowCount: 3,
        },
        productA(),
        hiddenTemplate(),
        {
          title: "Community Nursing",
          sheetId: 77,
          rows: [["Title", "Horizon"], []],
          rowCount: 2,
          columnCount: 2,
          frozenRowCount: 1,
        },
      ],
      violations: [],
    })
    expect(before).toEqual(tabs())
  })

  it.each([
    [
      "a name a tab has, in another letter case",
      [copy({ newSheetName: "PRODUCTA" })],
    ],
    ["an ID a tab has", [copy({ newSheetId: 10 })]],
    ["a source that is not there", [copy({ sourceSheetId: 5 })]],
    ["a place beyond the last tab", [copy({ insertSheetIndex: 4 })]],
    ["every row under a frozen header deleted", [copy(), deleteRows(1, 4)]],
    ["every row deleted", [copy({ sourceSheetId: 10 }), deleteRows(0, 1)]],
    ["rows deleted beyond the grid", [copy(), deleteRows(2, 5)]],
    ["rows cleared beyond the grid", [copy(), clearRows(1, 5)]],
    ["a tab that is not there unhidden", [show(5)]],
    ["every row of the copy frozen", [copy(), freeze(4)]],
  ])("rejects the whole body, as Google does, for %s", (_, requests) => {
    const result = applyBatchUpdate(tabs(), { requests })

    expect(result).toMatchObject({ error: expect.any(String) as string })
  })

  it.each([
    [
      "a copy of a tab but Template",
      [copy({ sourceSheetId: 10 })],
      "not Template",
    ],
    [
      "a copy placed first",
      [copy({ insertSheetIndex: 0 })],
      "not after the last tab",
    ],
    [
      "rows deleted from the Template",
      [deleteRows(2, 4, 9)],
      "not a tab this batchUpdate copied",
    ],
    [
      "a tab it did not copy unhidden",
      [show(9)],
      "not a tab this batchUpdate copied",
    ],
    [
      "cells cleared in the Template",
      [clearRows(1, 2, 9)],
      "not a tab this batchUpdate copied",
    ],
    ["the copy's header row deleted", [copy(), deleteRows(0, 2)], "header row"],
    ["the copy's header row cleared", [copy(), clearRows(0, 1)], "header row"],
    [
      "the copy's values cleared alone",
      [copy(), clearRows(1, 2, 77, "userEnteredValue")],
      "not *",
    ],
    [
      "the copy's columns deleted",
      [copy(), deleteRows(1, 2, 77, "COLUMNS")],
      "not ROWS",
    ],
    ["the copy hidden", [copy(), show(77, true)], "hides Community Nursing"],
    ["the copy's header unfrozen", [copy(), freeze(0)], "not its header alone"],
    [
      "the Template's frozen rows changed",
      [freeze(1, 9)],
      "not a tab this batchUpdate copied",
    ],
    [
      "another property of the copy changed",
      [copy(), show(77, false, "title")],
      "not hidden or gridProperties.frozenRowCount",
    ],
    [
      "a roadmap's row appended as published",
      [copy(), newRow("Yes")],
      "without Enabled No",
    ],
    [
      "a roadmap's row appended without its tab",
      [newRow()],
      "without its tab copied",
    ],
    [
      "a roadmap's row naming another tab",
      [copy(), newRow("No", "ProductA")],
      "without its tab copied",
    ],
  ])("records %s as a violation", (_, requests, violation) => {
    const result = applyBatchUpdate(tabs(), { requests })

    expect(result.violations).toEqual([
      expect.stringContaining(violation) as string,
    ])
  })

  it("deletes every row but one under the header once the copy has its header alone frozen", () => {
    const twoFrozen = { ...hiddenTemplate(), frozenRowCount: 2 }
    const before = [roadmaps(), twoFrozen]
    const start = copy({ insertSheetIndex: 2 })

    expect(
      applyBatchUpdate(before, { requests: [start, deleteRows(2, 4)] }),
    ).toMatchObject({ error: expect.stringContaining("non-frozen") as string })
    expect(
      applyBatchUpdate(before, {
        requests: [start, freeze(1), deleteRows(2, 4), clearRows(1, 2)],
      }),
    ).toMatchObject({
      tabs: [
        {},
        { title: "Template", frozenRowCount: 2 },
        {
          title: "Community Nursing",
          rows: [["Title", "Horizon"], []],
          rowCount: 2,
          frozenRowCount: 1,
        },
      ],
      violations: [],
    })
  })

  it("records a Welsh cell in an appended row as a violation", () => {
    const families: GridTab = {
      title: "Families",
      sheetId: 1,
      rows: [["ID", "Name", "Name (cy)"]],
      rowCount: 1,
      columnCount: 3,
    }

    const result = applyBatchUpdate([roadmaps(), families], {
      requests: [appendRow(1, ["b2", "Two", "Dau"])],
    })

    expect(result.violations).toEqual(["Families!R2C3 in a Welsh column"])
  })

  it("records a row appended to an index named Template as a violation", () => {
    const result = applyBatchUpdate([{ ...roadmaps(), title: "Template" }], {
      requests: [newRow()],
    })

    expect(result.violations).toContain("appendCells on Template")
  })
})

describe("applyBatchUpdate moving a roadmap tab's rows (STY-051)", () => {
  /** Product A's tab, which the index's row names: a header and five item rows. */
  const items = (): GridTab => ({
    ...productA(),
    rows: [["Title", "Horizon"], ...["A", "B", "C", "D", "E"].map(row)],
    rowCount: 8,
    columnCount: 2,
  })
  const row = (title: string) => [title, "Now"]

  const move = (
    sheetId: number,
    startIndex: number,
    destinationIndex: number,
    endIndex = startIndex + 1,
  ) => ({
    moveDimension: {
      source: { sheetId, dimension: "ROWS", startIndex, endIndex },
      destinationIndex,
    },
  })

  /** The titles of Product A's rows once `requests` are applied, or what refused them. */
  function titlesAfter(...requests: unknown[]) {
    const result = applyBatchUpdate([index(), items()], { requests })
    if ("error" in result) return result
    expect(result.violations).toEqual([])
    return result.tabs[1]?.rows.map(([title]) => title)
  }

  it("takes the destination as counted before the row is taken out: up to f is f, down to f is f + 1", () => {
    // Google's own example: 0,1,2,3,4 with [1,3) moved to 4 gives 0,3,1,2,4.
    expect(titlesAfter(move(10, 1, 4, 3))).toEqual([
      "Title",
      "C",
      "A",
      "B",
      "D",
      "E",
    ])
    // The owner's check (#109): row 3 moved to 5 lands in row 5.
    expect(titlesAfter(move(10, 2, 5))).toEqual([
      "Title",
      "A",
      "C",
      "D",
      "B",
      "E",
    ])
    expect(titlesAfter(move(10, 4, 1))).toEqual([
      "Title",
      "D",
      "A",
      "B",
      "C",
      "E",
    ])
  })

  it("makes each move over what the one before it left, a row carrying every cell it has", () => {
    const result = applyBatchUpdate([index(), items()], {
      requests: [cell(10, 1, 1, "Next"), move(10, 1, 6), move(10, 1, 3)],
    })

    expect(result).toMatchObject({
      tabs: [
        index(),
        {
          rows: [
            ["Title", "Horizon"],
            ["C", "Now"],
            ["B", "Now"],
            ["D", "Now"],
            ["E", "Now"],
            ["A", "Next"],
          ],
          rowCount: 8,
        },
      ],
      violations: [],
    })
  })

  it("moves a row to below the last row in use, into the grid's spare rows", () => {
    expect(titlesAfter(move(10, 1, 8))).toEqual([
      "Title",
      "B",
      "C",
      "D",
      "E",
      undefined,
      undefined,
      "A",
    ])
  })

  it.each([
    ["its own position", 2, 2],
    ["just after itself", 2, 3],
  ])(
    "rejects a move of a row to %s, as Google does, applying nothing",
    (_where, startIndex, destinationIndex) => {
      expect(
        titlesAfter(
          cell(10, 1, 0, "Renamed"),
          move(10, startIndex, destinationIndex),
        ),
      ).toEqual({
        error: `destinationIndex[${String(destinationIndex)}] must be outside the requested range[2-3]`,
        violations: [],
      })
    },
  )

  it.each([
    ["no rows", move(10, 2, 4, 2)],
    ["rows beyond the grid", move(10, 8, 1)],
    ["a destination beyond the grid", move(10, 1, 9)],
    ["a tab that is not there", move(99, 1, 3)],
  ])("rejects a move of %s", (_what, request) => {
    expect(titlesAfter(request)).toHaveProperty("error")
  })

  it("records what the editor never moves as violations: the header, columns, and rows of any tab but a roadmap's own", () => {
    const violationsOf = (tabs: GridTab[], request: unknown) =>
      applyBatchUpdate(tabs, { requests: [request] }).violations

    expect(violationsOf([index(), items()], move(10, 0, 3))).toEqual([
      "moveDimension of ProductA's header row",
    ])
    expect(violationsOf([index(), items()], move(10, 3, 0))).toEqual([
      "moveDimension above ProductA's header row",
    ])
    expect(
      violationsOf([index(), items()], {
        moveDimension: {
          source: {
            sheetId: 10,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 1,
          },
          destinationIndex: 2,
        },
      }),
    ).toEqual(["moveDimension of COLUMNS, not ROWS"])
    expect(
      violationsOf([{ ...index(), rowCount: 4 }, items()], move(0, 1, 3)),
    ).toEqual(["moveDimension on Roadmaps"])
    expect(
      violationsOf(
        [index(), items(), { ...template(), rowCount: 4 }],
        move(9, 1, 3),
      ),
    ).toEqual(["moveDimension on Template"])
  })
})

describe("applyBatchUpdate inserting a row in a roadmap's tab (STY-050)", () => {
  /** Product A's tab, which the index's row names: a header and two item rows. */
  const items = (): GridTab => ({
    ...productA(),
    rows: [
      ["Title", "Horizon", "Item ID"],
      ["A", "Now", "bcdfghjk"],
      ["B", "Now", "bcdfghjm"],
    ],
    rowCount: 5,
    columnCount: 3,
  })

  const insert = (
    sheetId: number,
    startIndex: number,
    { endIndex = startIndex + 1, inheritFromBefore = false } = {},
  ) => ({
    insertDimension: {
      range: { sheetId, dimension: "ROWS", startIndex, endIndex },
      inheritFromBefore,
    },
  })
  /** A new item's cells, written at the row inserted at `rowIndex`. */
  const newItem = (rowIndex: number, title = "New") => [
    cell(10, rowIndex, 0, title),
    cell(10, rowIndex, 1, "Now"),
    cell(10, rowIndex, 2, "bcdfghjn"),
  ]

  it("puts a blank row before the row at the index, the grid growing by it, and takes the cells then written there", () => {
    const result = applyBatchUpdate([index(), items()], {
      requests: [insert(10, 2), ...newItem(2)],
    })

    expect(result).toMatchObject({
      tabs: [
        index(),
        {
          rows: [
            ["Title", "Horizon", "Item ID"],
            ["A", "Now", "bcdfghjk"],
            ["New", "Now", "bcdfghjn"],
            ["B", "Now", "bcdfghjm"],
          ],
          rowCount: 6,
        },
      ],
      violations: [],
    })
  })

  it("makes each insert over what the requests before it left", () => {
    const result = applyBatchUpdate([index(), items()], {
      requests: [
        {
          moveDimension: {
            source: {
              sheetId: 10,
              dimension: "ROWS",
              startIndex: 2,
              endIndex: 3,
            },
            destinationIndex: 1,
          },
        },
        insert(10, 2),
        ...newItem(2),
      ],
    })

    expect(
      "tabs" in result && result.tabs[1]?.rows.map(([title]) => title),
    ).toEqual(["Title", "B", "New", "A"])
    expect(result.violations).toEqual([])
  })

  it.each([
    ["no rows", insert(10, 2, { endIndex: 2 })],
    ["a row beyond the grid", insert(10, 6)],
    ["a tab that is not there", insert(99, 1)],
    [
      "a row that takes after the one before it, where there is none",
      insert(10, 0, { inheritFromBefore: true }),
    ],
  ])("rejects an insert of %s, applying nothing", (_what, request) => {
    expect(
      applyBatchUpdate([index(), items()], {
        requests: [cell(10, 1, 0, "Renamed"), request],
      }),
    ).toHaveProperty("error")
  })

  it("records what the editor never inserts as violations: a row above the header, columns, several rows, one that takes after the row above, and a row in any tab but a roadmap's own", () => {
    const violationsOf = (tabs: GridTab[], ...requests: unknown[]) =>
      applyBatchUpdate(tabs, { requests }).violations

    expect(
      violationsOf([index(), items()], insert(10, 0), ...newItem(0)),
    ).toContain("insertDimension above ProductA's header row")
    expect(
      violationsOf([index(), items()], {
        insertDimension: {
          range: {
            sheetId: 10,
            dimension: "COLUMNS",
            startIndex: 1,
            endIndex: 2,
          },
          inheritFromBefore: false,
        },
      }),
    ).toEqual(["insertDimension of COLUMNS, not ROWS"])
    expect(
      violationsOf([index(), items()], insert(10, 2, { endIndex: 4 })),
    ).toContain("insertDimension of 2 rows in ProductA, not 1")
    expect(
      violationsOf(
        [index(), items()],
        insert(10, 2, { inheritFromBefore: true }),
        ...newItem(2),
      ),
    ).toEqual(["insertDimension in ProductA taking after the row before"])
    expect(violationsOf([index(), items()], insert(0, 1))).toContain(
      "insertDimension on Roadmaps",
    )
  })

  it("records a row inserted and left without a title, a Horizon the public site reads or an Item ID of its own as a violation", () => {
    const violationsOf = (...requests: unknown[]) =>
      applyBatchUpdate([index(), items()], { requests }).violations

    expect(violationsOf(insert(10, 2))).toEqual([
      "ProductA row inserted without an Item ID",
      "ProductA row inserted without a Title",
      'ProductA row inserted with the Horizon "", not one the public site reads',
    ])
    expect(
      violationsOf(
        insert(10, 2),
        cell(10, 2, 0, "New"),
        cell(10, 2, 1, "Now"),
        cell(10, 2, 2, "bcdfghjk"),
      ),
    ).toEqual([
      "ProductA row inserted with the Item ID bcdfghjk, which another row has",
    ])
  })
})
