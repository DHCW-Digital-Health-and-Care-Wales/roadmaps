import type { TabProperties } from "./sheets-schemas"

/** A tab's every row as displayed, with its properties, to write back to. */
export interface TabRows {
  properties: TabProperties
  rows: string[][]
}

/** One cell's new value: plain text, or `{}` to leave it blank (ADR-012 D6). */
interface CellData {
  userEnteredValue?: { stringValue: string }
}

/** One `spreadsheets.batchUpdate` request (ADR-012 D6, STY-040). */
export type BatchRequest =
  | {
      appendDimension: {
        sheetId: number
        dimension: "COLUMNS"
        length: number
      }
    }
  | {
      updateCells: {
        start: { sheetId: number; rowIndex: number; columnIndex: number }
        rows: [{ values: [CellData] }]
        fields: "userEnteredValue"
      }
    }
  | {
      /** With no rows: every cell of the range cleared, its format and checks too. */
      updateCells: {
        range: { sheetId: number; startRowIndex: number; endRowIndex: number }
        fields: "*"
      }
    }
  | {
      /** Google adds the rows after the last row any value uses (STY-029). */
      appendCells: {
        sheetId: number
        rows: [{ values: CellData[] }]
        fields: "userEnteredValue"
      }
    }
  | {
      /** A copy of a tab, with the ID given, so later requests can change it. */
      duplicateSheet: {
        sourceSheetId: number
        insertSheetIndex: number
        newSheetId: number
        newSheetName: string
      }
    }
  | {
      updateSheetProperties: {
        properties: { sheetId: number; hidden: false }
        fields: "hidden"
      }
    }
  | {
      updateSheetProperties: {
        properties: { sheetId: number; gridProperties: { frozenRowCount: 1 } }
        fields: "gridProperties.frozenRowCount"
      }
    }
  | {
      deleteDimension: {
        range: {
          sheetId: number
          dimension: "ROWS"
          startIndex: number
          endIndex: number
        }
      }
    }

/**
 * Collects one tab's cell writes. A column the header lacks is added after the last
 * column any row uses, with its English header (ADR-012 Option 9), the grid growing
 * to hold it; no existing column moves.
 */
export class TabWriter<Column extends string> {
  readonly #sheetId: number
  readonly #columnCount: number
  readonly #columns: Map<Column, number>
  #width: number
  readonly #headers: BatchRequest[] = []
  readonly #cells: BatchRequest[] = []
  readonly #appended: BatchRequest[] = []

  constructor(
    { properties, rows }: TabRows,
    columns: ReadonlyMap<Column, number>,
  ) {
    this.#sheetId = properties.sheetId
    this.#columns = new Map(columns)
    // Google drops trailing blank cells, so a row's length is where its last value ends.
    this.#width = Math.max(0, ...rows.map((row) => row.length))
    this.#columnCount = properties.gridProperties?.columnCount ?? this.#width
  }

  /** Writes `value` to `column` of spreadsheet row `row` (1 is the header). */
  write(row: number, column: Column, value: string): void {
    this.#cells.push(this.#cell(row, this.#columnIndex(column), value))
  }

  /**
   * Appends a row holding each cell under its column, after the last row any value
   * uses: Google picks the row as it applies the write, so a row a co-lead added
   * meanwhile is never overwritten (STY-029). A blank cell is left out, adding no column.
   */
  append(cells: Iterable<readonly [Column, string]>): void {
    const values: CellData[] = []
    for (const [column, value] of cells) {
      if (value === "") continue
      const columnIndex = this.#columnIndex(column)
      while (values.length < columnIndex) values.push({})
      values[columnIndex] = textCell(value)
    }
    this.#appended.push({
      appendCells: {
        sheetId: this.#sheetId,
        rows: [{ values }],
        fields: "userEnteredValue",
      },
    })
  }

  /** Growing the grid first, then headers, then cells, then appended rows. */
  requests(): BatchRequest[] {
    const grow = this.#width - this.#columnCount
    return [
      ...(grow > 0
        ? [
            {
              appendDimension: {
                sheetId: this.#sheetId,
                dimension: "COLUMNS" as const,
                length: grow,
              },
            },
          ]
        : []),
      ...this.#headers,
      ...this.#cells,
      ...this.#appended,
    ]
  }

  /** Where `column` is, adding it with its header when the tab has none. */
  #columnIndex(column: Column): number {
    let columnIndex = this.#columns.get(column)
    if (columnIndex === undefined) {
      columnIndex = this.#width++
      this.#columns.set(column, columnIndex)
      this.#headers.push(this.#cell(1, columnIndex, column))
    }
    return columnIndex
  }

  /** Sets one cell to `value` as plain text, never a formula or number (ADR-012 D6). */
  #cell(row: number, columnIndex: number, value: string): BatchRequest {
    return {
      updateCells: {
        start: { sheetId: this.#sheetId, rowIndex: row - 1, columnIndex },
        rows: [{ values: [textCell(value)] }],
        fields: "userEnteredValue",
      },
    }
  }
}

/** A cell set to `value` as plain text, never a formula or number (ADR-012 D6). */
function textCell(value: string): CellData {
  return value === "" ? {} : { userEnteredValue: { stringValue: value } }
}
