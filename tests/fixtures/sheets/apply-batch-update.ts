import { z } from "zod/mini"

/** One tab of a faked spreadsheet, with its grid's size, as a write sees it. */
export interface GridTab {
  title: string
  sheetId: number
  rows: string[][]
  rowCount: number
  columnCount: number
}

/** The `spreadsheets.batchUpdate` requests the editor sends (ADR-012, STY-023 D6). */
const cellSchema = z.object({
  userEnteredValue: z.optional(z.record(z.string(), z.unknown())),
})
const requestSchema = z.union([
  z.object({
    appendDimension: z.object({
      sheetId: z.int(),
      dimension: z.string(),
      length: z.int(),
    }),
  }),
  z.object({
    updateCells: z.object({
      start: z.object({
        sheetId: z.int(),
        rowIndex: z._default(z.int(), 0),
        columnIndex: z._default(z.int(), 0),
      }),
      rows: z.array(z.object({ values: z._default(z.array(cellSchema), []) })),
      fields: z.string(),
    }),
  }),
])
const bodySchema = z.object({ requests: z.array(requestSchema) })

export type BatchUpdateBody = z.output<typeof bodySchema>

export type BatchUpdateResult =
  /** Applied: the tabs as they now are, and any misuse the real API would accept. */
  | { tabs: GridTab[]; violations: string[] }
  /** Rejected as the real API would (HTTP 400), nothing applied. */
  | { error: string; violations: string[] }

/**
 * A Welsh column's header, as the parsers read it (`sheet-header.ts`), kept apart so
 * the fakes check the app rather than share its code.
 */
const WELSH_HEADER = /^(.+?)[\s([\-_]+(?:cy|cym|cymraeg|welsh)[\s)\]]*$/i

/** The tab the editor never writes (ADR-012). */
const TEMPLATE_TAB = "Template"

/** The index column the editor never writes (STY-023 D5). */
const LAST_UPDATED_HEADER = /^\s*last\s+updated\s*$/i

/**
 * Applies a `batchUpdate` body to `tabs`, all or nothing as Google does: a request it
 * can't apply rejects the whole body and changes nothing. Beyond what Google rejects, it
 * records as violations what the editor must never write (STY-023 S11): the `Template`
 * tab, anything but a plain string or a cleared cell, a Welsh column, `Last updated`,
 * an unchanged cell.
 */
export function applyBatchUpdate(
  tabs: readonly GridTab[],
  body: unknown,
): BatchUpdateResult {
  const violations: string[] = []
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    violations.push(`batchUpdate body: ${z.prettifyError(parsed.error)}`)
    return { error: "Invalid batchUpdate body", violations }
  }
  const next = tabs.map((tab) => ({
    ...tab,
    rows: tab.rows.map((row) => [...row]),
  }))
  const tabOf = (sheetId: number) => next.find((tab) => tab.sheetId === sheetId)

  for (const request of parsed.data.requests) {
    if ("appendDimension" in request) {
      const { sheetId, dimension, length } = request.appendDimension
      const tab = tabOf(sheetId)
      if (tab === undefined || length < 1) {
        return { error: `appendDimension on ${String(sheetId)}`, violations }
      }
      if (tab.title === TEMPLATE_TAB)
        violations.push("appendDimension on Template")
      if (dimension !== "COLUMNS") {
        violations.push(`appendDimension of ${dimension}, not COLUMNS`)
      }
      if (dimension === "ROWS") tab.rowCount += length
      else tab.columnCount += length
      continue
    }

    const { start, rows, fields } = request.updateCells
    const tab = tabOf(start.sheetId)
    if (tab === undefined) {
      return { error: `updateCells on ${String(start.sheetId)}`, violations }
    }
    if (fields !== "userEnteredValue") {
      violations.push(`updateCells fields ${fields}, not userEnteredValue`)
    }
    for (const [r, { values }] of rows.entries()) {
      for (const [c, cell] of values.entries()) {
        const rowIndex = start.rowIndex + r
        const columnIndex = start.columnIndex + c
        if (rowIndex >= tab.rowCount || columnIndex >= tab.columnCount) {
          return {
            error: `${tab.title} has no cell at row ${String(rowIndex)}, column ${String(columnIndex)}`,
            violations,
          }
        }
        const where = `${tab.title}!R${String(rowIndex + 1)}C${String(columnIndex + 1)}`
        const value = cellValue(cell.userEnteredValue)
        if (value === null) {
          violations.push(
            `${where} written as ${JSON.stringify(cell.userEnteredValue)}`,
          )
          continue
        }
        if (tab.title === TEMPLATE_TAB) violations.push(`${where} in Template`)
        const header = tab.rows[0]?.[columnIndex] ?? ""
        const column = rowIndex === 0 ? value : header
        if (WELSH_HEADER.test(column)) {
          violations.push(`${where} in a Welsh column`)
        }
        if (LAST_UPDATED_HEADER.test(column)) {
          violations.push(`${where} in Last updated`)
        }
        while (tab.rows.length <= rowIndex) tab.rows.push([])
        // Never undefined: the rows were just padded to reach it.
        const row = tab.rows[rowIndex] ?? []
        while (row.length <= columnIndex) row.push("")
        if (row[columnIndex] === value) violations.push(`${where} unchanged`)
        row[columnIndex] = value
      }
    }
  }
  return { tabs: next, violations }
}

/** A cell's new text: a plain string, or `""` for a cleared cell; `null` otherwise. */
function cellValue(entered: Readonly<Record<string, unknown>> | undefined) {
  if (entered === undefined) return ""
  const keys = Object.keys(entered)
  const { stringValue } = entered
  return keys.length === 1 && typeof stringValue === "string"
    ? stringValue
    : null
}
