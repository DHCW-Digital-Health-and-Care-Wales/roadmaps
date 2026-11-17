import { z } from "zod/mini"

import { AppError } from "@/lib/errors"

/**
 * Response of `GET /{spreadsheetId}?fields=sheets(properties(sheetId,title,index,hidden,
 * gridProperties(rowCount,columnCount,frozenRowCount)))`.
 */
const spreadsheetMetadataSchema = z.object({
  // Google omits `sheets` (and `false`/default-valued fields) rather than sending them.
  sheets: z._default(
    z.array(
      z.object({
        properties: z.object({
          sheetId: z.int(),
          title: z.string(),
          index: z.optional(z.int()),
          hidden: z.optional(z.boolean()),
          // The grid's size, so a write can grow it first, and the rows frozen at its
          // top, which Google omits when there are none; absent for a non-grid sheet.
          gridProperties: z.optional(
            z.object({
              rowCount: z.optional(z.int()),
              columnCount: z.optional(z.int()),
              frozenRowCount: z.optional(z.int()),
            }),
          ),
        }),
      }),
    ),
    [],
  ),
})

export type SpreadsheetMetadata = z.output<typeof spreadsheetMetadataSchema>

/** One tab's properties, as the tab list gives them. */
export type TabProperties = SpreadsheetMetadata["sheets"][number]["properties"]

/** Validates untrusted spreadsheet metadata, or throws `AppError('invalid-response')`. */
export function parseSpreadsheetMetadata(json: unknown): SpreadsheetMetadata {
  const result = spreadsheetMetadataSchema.safeParse(json)
  if (!result.success) {
    throw new AppError("invalid-response", {
      message: `Unexpected spreadsheet metadata:\n${z.prettifyError(result.error)}`,
      cause: result.error,
    })
  }
  return result.data
}

/**
 * Response of `GET /{spreadsheetId}/values/{range}?majorDimension=ROWS&valueRenderOption=
 * FORMATTED_VALUE&fields=values`: every cell as displayed, so always a string. Google
 * drops trailing blank cells and rows, and omits `values` for a range with none.
 */
const sheetValuesSchema = z.object({
  values: z._default(z.array(z.array(z.string())), []),
})

/** Validates an untrusted values response into its rows, or throws `AppError('invalid-response')`. */
export function parseSheetValues(json: unknown): string[][] {
  const result = sheetValuesSchema.safeParse(json)
  if (!result.success) {
    throw new AppError("invalid-response", {
      message: `Unexpected sheet values:\n${z.prettifyError(result.error)}`,
      cause: result.error,
    })
  }
  return result.data.values
}

/** Google's JSON error envelope, read only for diagnostics. */
const googleErrorBodySchema = z.object({
  error: z.object({
    status: z.optional(z.string()),
    message: z.optional(z.string()),
  }),
})

/** Extracts `STATUS: message` from a Google error body, if it has the expected shape. */
export function describeGoogleError(body: unknown): string | undefined {
  const result = googleErrorBodySchema.safeParse(body)
  if (!result.success) return undefined
  const { status, message } = result.data.error
  return [status, message].filter(Boolean).join(": ") || undefined
}

/**
 * What Google's refusal to change a cell, a row or another object the account may not
 * edit says: the one thing that tells it from any other `INVALID_ARGUMENT` (STY-051 D6).
 */
const PROTECTED_REFUSAL = "protected cell or object"

/**
 * Whether a Google error body is its refusal of a write to a protected part of the
 * spreadsheet: "Invalid requests[0].moveDimension: You are trying to edit a protected
 * cell or object…", for a move as for a cell.
 */
export function isProtectedRefusal(body: unknown): boolean {
  const result = googleErrorBodySchema.safeParse(body)
  if (!result.success) return false
  const { status, message = "" } = result.data.error
  return status === "INVALID_ARGUMENT" && message.includes(PROTECTED_REFUSAL)
}
