import { z } from "zod"

import { AppError } from "@/lib/errors"

/** Response of `GET /{spreadsheetId}?fields=sheets(properties(sheetId,title,index,hidden))`. */
const spreadsheetMetadataSchema = z.object({
  // Google omits `sheets` (and `false`/default-valued fields) rather than sending them.
  sheets: z
    .array(
      z.object({
        properties: z.object({
          sheetId: z.int(),
          title: z.string(),
          index: z.int().optional(),
          hidden: z.boolean().optional(),
        }),
      }),
    )
    .default([]),
})

export type SpreadsheetMetadata = z.output<typeof spreadsheetMetadataSchema>

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

/** Google's JSON error envelope, read only for diagnostics. */
const googleErrorBodySchema = z.object({
  error: z.object({
    status: z.string().optional(),
    message: z.string().optional(),
  }),
})

/** Extracts `STATUS: message` from a Google error body, if it has the expected shape. */
export function describeGoogleError(body: unknown): string | undefined {
  const result = googleErrorBodySchema.safeParse(body)
  if (!result.success) return undefined
  const { status, message } = result.data.error
  return [status, message].filter(Boolean).join(": ") || undefined
}
