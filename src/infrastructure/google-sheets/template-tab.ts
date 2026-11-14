import { AppError } from "@/lib/errors"

import { roadmapTabColumns } from "./roadmap-tab-parser"
import type { TabProperties } from "./sheets-schemas"
import type { BatchRequest } from "./tab-writer"

/**
 * The public site's tab of permitted columns, which Product Leads copied by hand to
 * start a roadmap. The editor copies it to start one, reading its header to check it
 * first; its rows are never read and it is never changed (ADR-011, ADR-012, STY-040).
 */
export const TEMPLATE_TAB = "Template"

/** The `Template` tab, checked, as a copy needs it. */
export interface TemplateTab {
  sheetId: number
  /** Every row of its grid, the header included. */
  rowCount: number
  hidden: boolean
}

/** A new roadmap's tab, to copy the `Template` to. */
export interface TemplateCopy {
  /** The ID chosen for it, which no tab has. */
  sheetId: number
  title: string
  /** Its place among the tabs: after the last. */
  index: number
}

/**
 * The `Template` tab, from its properties and its header row. Throws
 * `AppError('invalid-data')` when there is none, it has no grid, or its header has no
 * `Title` or no `Horizon` column, without which the public site can't read a copy
 * (STY-040 S6).
 */
export function usableTemplate(
  properties: TabProperties | undefined,
  header: readonly string[],
): TemplateTab {
  const rowCount = properties?.gridProperties?.rowCount
  if (properties === undefined || rowCount === undefined) {
    throw new AppError("invalid-data", {
      message: `The spreadsheet has no ${TEMPLATE_TAB} tab to copy`,
    })
  }
  const columns = roadmapTabColumns([header])
  if (!columns.has("Title") || !columns.has("Horizon")) {
    throw new AppError("invalid-data", {
      message: `The ${TEMPLATE_TAB} tab has no Title or no Horizon column`,
    })
  }
  return {
    sheetId: properties.sheetId,
    rowCount,
    hidden: properties.hidden === true,
  }
}

/**
 * The requests that copy the `Template` to a new roadmap's tab holding its header alone
 * (STY-040 S2): the copy, shown even when the `Template` is hidden, then every row under
 * the header deleted but the first, which is cleared instead, since Google keeps one row
 * that is not frozen in every tab. The `Template` itself is only the copy's source.
 */
export function copyTemplateRequests(
  template: TemplateTab,
  { sheetId, title, index }: TemplateCopy,
): BatchRequest[] {
  return [
    {
      duplicateSheet: {
        sourceSheetId: template.sheetId,
        insertSheetIndex: index,
        newSheetId: sheetId,
        newSheetName: title,
      },
    },
    ...(template.hidden
      ? [
          {
            updateSheetProperties: {
              properties: { sheetId, hidden: false as const },
              fields: "hidden" as const,
            },
          },
        ]
      : []),
    ...(template.rowCount > 2
      ? [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS" as const,
                startIndex: 2,
                endIndex: template.rowCount,
              },
            },
          },
        ]
      : []),
    ...(template.rowCount > 1
      ? [
          {
            updateCells: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 2 },
              fields: "*" as const,
            },
          },
        ]
      : []),
  ]
}

/** A random 31-bit number, as `crypto.getRandomValues` gives one. */
type RandomNumber = () => number

const cryptoRandomNumber: RandomNumber = () => {
  const [number = 0] = crypto.getRandomValues(new Uint32Array(1))
  return number >>> 1
}

/**
 * An ID for a new tab that none of `taken` has: chosen here, not by Google, so the same
 * write can change the tab, and a write whose answer is lost can be found again
 * (STY-040 D13).
 */
export function newSheetId(
  taken: ReadonlySet<number>,
  random: RandomNumber = cryptoRandomNumber,
): number {
  let sheetId = random()
  while (taken.has(sheetId)) sheetId = random()
  return sheetId
}
