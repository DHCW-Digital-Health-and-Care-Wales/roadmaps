/**
 * An item's details as a Product Lead edits them (STY-039): English lines, each at the
 * level it shows at, and the one field value they are kept, compared and written as.
 */

import type { RoadmapItemDetail } from "./roadmap-item"

/** One detail as edited: its English, and how deep it is nested, 0 for the top level. */
export interface DetailLine {
  text: string
  level: number
}

/** The deepest level: 0 is the top, so a list has three (STY-039 D12). */
export const MAX_DETAIL_LEVEL = 2

/** The hyphens and spaces before a line's text: never text, however written (D21). */
export function detailLead(line: string): string {
  return /^[\s-]*/.exec(line)?.[0] ?? ""
}

/** How many levels `lead`'s hyphens nest a line. */
export function hyphensIn(lead: string): number {
  return lead.replace(/[^-]/g, "").length
}

/** A detail's text as kept: on one line, trimmed, with no hyphen or space before it. */
export function detailText(line: string): string {
  return line.slice(detailLead(line).length).replace(/\s+/g, " ").trim()
}

/** A line break however it is written: pasted text may part lines with `\r` alone. */
const LINE_BREAK = /\r\n|\r|\n/

/**
 * Lines of text as details: each hyphen before a line's text nests it a level deeper
 * than `base`, and a blank line is none (S8, S9). The levels are as written: settle them.
 */
export function parseDetailLines(text: string, base = 0): DetailLine[] {
  return text.split(LINE_BREAK).flatMap((line) => {
    const detail = detailText(line)
    return detail === ""
      ? []
      : [{ text: detail, level: base + hyphensIn(detailLead(line)) }]
  })
}

/**
 * Details at the levels they show at (S3, S20): each nests under the last one shallower
 * than it, one level in, however many levels deeper it was written, the first is at the
 * top and none is deeper than the third.
 */
export function settleDetails<T extends DetailLine>(
  details: readonly T[],
): T[] {
  // The levels, as written, of the details the next one could nest under.
  const open: number[] = []
  return details.map((detail) => {
    while (open.length > 0 && (open.at(-1) ?? 0) >= detail.level) open.pop()
    const level = Math.min(open.length, MAX_DETAIL_LEVEL)
    open.push(detail.level)
    return { ...detail, level }
  })
}

/** The index after the last detail nested under the one at `index`. */
export function endOfDetail(
  details: readonly DetailLine[],
  index: number,
): number {
  const level = details[index]?.level ?? 0
  let end = index + 1
  while (end < details.length && (details[end]?.level ?? 0) > level) end += 1
  return end
}

/** The detail at `index`, with those nested under it, moved `by` levels in or out. */
export function shiftedDetails<T extends DetailLine>(
  details: readonly T[],
  index: number,
  by: number,
): T[] {
  const end = endOfDetail(details, index)
  return details.map((detail, at) =>
    at >= index && at < end ? { ...detail, level: detail.level + by } : detail,
  )
}

/**
 * Settled details without the one at `index`, which is removed alone: those nested
 * under it stay, one level up (S6, D15).
 */
export function withoutDetail<T extends DetailLine>(
  details: readonly T[],
  index: number,
): T[] {
  return settleDetails(
    shiftedDetails(details, index, -1).filter((_, at) => at !== index),
  )
}

/**
 * Details as they are kept: settled, each text as `detailText` gives it, and one left
 * with no text removed as `withoutDetail` removes it (S5, D20).
 */
export function keptDetails<T extends DetailLine>(details: readonly T[]): T[] {
  let kept = settleDetails(
    details.map((detail) => ({ ...detail, text: detailText(detail.text) })),
  )
  for (let at = kept.length - 1; at >= 0; at -= 1) {
    if (kept[at]?.text === "") kept = withoutDetail(kept, at)
  }
  return kept
}

/**
 * An item's details as one field value (STY-039 D4, D14, D18): a line for each, in
 * order, starting with a hyphen for each level it shows at and then a space, a
 * top-level line with neither; `""` for none. It is what the `Details` cell is written
 * as (S14), and two cells that show as the same list give the same value (S20).
 */
export function detailsValue(details: readonly DetailLine[]): string {
  return keptDetails(details)
    .map(
      ({ text, level }) => `${"-".repeat(level)}${level > 0 ? " " : ""}${text}`,
    )
    .join("\n")
}

/** The details of a `detailsValue`, in its order, at the levels they show at. */
export function detailsOf(value: string): DetailLine[] {
  return keptDetails(parseDetailLines(value))
}

/**
 * The details of a `detailsValue` as an item holds them: English alone, as only an item
 * with no Welsh details has them changed (STY-039 S18).
 */
export function englishDetails(value: string): RoadmapItemDetail[] {
  return detailsOf(value).map(({ text, level }) => ({
    text: { en: text, cy: "" },
    level,
  }))
}
