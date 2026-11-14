/**
 * The rules of the Details field's outline (STY-039, editor A): where a detail sits,
 * why it can't move, and what typing, Enter, Backspace and a paste make of the list.
 * Pure functions over the lines the editor shows, which are always settled.
 */

import {
  type DetailLine,
  detailLead,
  endOfDetail,
  hyphensIn,
  parseDetailLines,
  settleDetails,
  shiftedDetails,
  MAX_DETAIL_LEVEL,
} from "@/domain/roadmap/item-details"

/** A detail as the editor holds it: its text as typed, and an identity for React and focus. */
export interface EditorLine extends DetailLine {
  id: number
}

let made = 0

/** `detail` as an editor line, with an identity no other line has had. */
export function identify({ text, level }: DetailLine): EditorLine {
  made += 1
  return { id: made, text, level }
}

/** Why a detail can't be moved or removed: a key of `roadmaps.edit.details.refused`. */
export type Refusal =
  | "first"
  | "nested"
  | "deepest"
  | "top"
  | "firstAtLevel"
  | "lastAtLevel"
  | "nothing"

/** How many details are nested under the one at `index`, at any depth. */
export function nestedUnder(
  details: readonly DetailLine[],
  index: number,
): number {
  return endOfDetail(details, index) - index - 1
}

/** The detail the one at `index` is nested under, or `null` at the top level. */
export function parentOf<T extends DetailLine>(
  details: readonly T[],
  index: number,
): T | null {
  const level = details[index]?.level ?? 0
  for (let at = index - 1; at >= 0; at -= 1) {
    const above = details[at]
    if (above && above.level < level) return above
  }
  return null
}

/** Why the detail at `index` can't nest a level deeper, or `null` when it can (S3). */
export function whyNotIn(
  details: readonly DetailLine[],
  index: number,
): Refusal | null {
  const detail = details[index]
  const above = details[index - 1]
  if (!detail || !above) return "first"
  if (detail.level > above.level) return "nested"
  const deepest = Math.max(
    ...details
      .slice(index, endOfDetail(details, index))
      .map(({ level }) => level),
  )
  return deepest >= MAX_DETAIL_LEVEL ? "deepest" : null
}

/** Why the detail at `index` can't move out a level, or `null` when it can. */
export function whyNotOut(
  details: readonly DetailLine[],
  index: number,
): Refusal | null {
  return (details[index]?.level ?? 0) > 0 ? null : "top"
}

/** The index of the detail before this one at its level, under the same detail, or -1. */
function previousAtLevel(
  details: readonly DetailLine[],
  index: number,
): number {
  const level = details[index]?.level ?? 0
  for (let at = index - 1; at >= 0; at -= 1) {
    const above = details[at]?.level ?? 0
    if (above < level) return -1
    if (above === level) return at
  }
  return -1
}

/** The index of the detail after this one at its level, under the same detail, or -1. */
function nextAtLevel(details: readonly DetailLine[], index: number): number {
  const end = endOfDetail(details, index)
  return details[end]?.level === details[index]?.level ? end : -1
}

export function whyNotUp(
  details: readonly DetailLine[],
  index: number,
): Refusal | null {
  return previousAtLevel(details, index) === -1 ? "firstAtLevel" : null
}

export function whyNotDown(
  details: readonly DetailLine[],
  index: number,
): Refusal | null {
  return nextAtLevel(details, index) === -1 ? "lastAtLevel" : null
}

/**
 * The detail at `index`, with those nested under it, moved before the detail before it
 * at its level (S23); `details` as they are when it is the first.
 */
export function movedUp<T extends DetailLine>(
  details: readonly T[],
  index: number,
): T[] {
  const to = previousAtLevel(details, index)
  if (to === -1) return [...details]
  const end = endOfDetail(details, index)
  return [
    ...details.slice(0, to),
    ...details.slice(index, end),
    ...details.slice(to, index),
    ...details.slice(end),
  ]
}

/** The detail at `index`, with those nested under it, moved after the next at its level. */
export function movedDown<T extends DetailLine>(
  details: readonly T[],
  index: number,
): T[] {
  const next = nextAtLevel(details, index)
  return next === -1 ? [...details] : movedUp(details, next)
}

/** What typing made of the list. */
export interface Typed<T> {
  lines: T[]
  /** How many characters before the text were dropped: the caret moves back by them. */
  lead: number
  /** How many levels the detail was nested. */
  nested: number
  /** Why it was nested no further than that, if a hyphen asked for more. */
  refusal: Refusal | null
}

/**
 * `lines` with the text of the one at `index` as typed (S9, D21): hyphens and spaces
 * before it are dropped, and each hyphen nests the detail a level, as far as S3 allows.
 */
export function typedInto<T extends DetailLine>(
  lines: readonly T[],
  index: number,
  value: string,
): Typed<T> {
  const lead = detailLead(value)
  let next = lines.map((line, at) =>
    at === index ? { ...line, text: value.slice(lead.length) } : line,
  )
  let nested = 0
  let refusal: Refusal | null = null
  for (let step = 0; step < hyphensIn(lead) && refusal === null; step += 1) {
    refusal = whyNotIn(next, index)
    if (refusal === null) {
      next = shiftedDetails(next, index, 1)
      nested += 1
    }
  }
  return { lines: next, lead: lead.length, nested, refusal }
}

/**
 * `lines` with the one at `index` made two at the caret, the text selected dropped
 * (S21): `fresh` makes the new line, which follows at its level, or is the first of
 * those nested under it when the caret is at its end (D16).
 */
export function splitAt<T extends DetailLine>(
  lines: readonly T[],
  index: number,
  selectionStart: number,
  selectionEnd: number,
  fresh: (text: string, level: number) => T,
): T[] {
  const line = lines[index]
  if (!line) return [...lines]
  const after = line.text.slice(selectionEnd).trimStart()
  const joins = after === "" && nestedUnder(lines, index) > 0
  return [
    ...lines.slice(0, index),
    { ...line, text: line.text.slice(0, selectionStart).trimEnd() },
    fresh(after, line.level + (joins ? 1 : 0)),
    ...lines.slice(index + 1),
  ]
}

/**
 * `lines` with the text of the one at `index` joined to the detail above (S22): `into`
 * is that detail's index and `caret` where the two texts meet. The details nested under
 * the one joined keep their level where they still can.
 */
export function joinedToAbove<T extends DetailLine>(
  lines: readonly T[],
  index: number,
): { lines: T[]; into: number; caret: number } {
  const line = lines[index]
  const above = lines[index - 1]
  if (!line || !above) return { lines: [...lines], into: index, caret: 0 }
  return {
    lines: settleDetails([
      ...lines.slice(0, index - 1),
      { ...above, text: above.text + line.text },
      ...lines.slice(index + 1),
    ]),
    into: index - 1,
    caret: above.text.length,
  }
}

/**
 * `lines` with the lines of `text` pasted into the one at `index` (S8, D22), each made
 * by `fresh`: nested by their hyphens from its level, in its place when it has no text,
 * and otherwise after it and the details nested under it. `last` is the index of the
 * last one added; `null` when `text` holds no detail.
 */
export function pastedInto<T extends DetailLine>(
  lines: readonly T[],
  index: number,
  text: string,
  fresh: (line: DetailLine) => T,
): { lines: T[]; added: number; last: number } | null {
  const line = lines[index]
  if (!line) return null
  const pasted = parseDetailLines(text, line.level).map(fresh)
  if (pasted.length === 0) return null
  const blank = line.text.trim() === ""
  const at = blank ? index : endOfDetail(lines, index)
  return {
    lines: settleDetails([
      ...lines.slice(0, at),
      ...pasted,
      ...lines.slice(blank ? index + 1 : at),
    ]),
    added: pasted.length,
    last: at + pasted.length - 1,
  }
}
