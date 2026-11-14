import { describe, expect, it } from "vitest"

import type { DetailLine } from "@/domain/roadmap/item-details"

import {
  joinedToAbove,
  movedDown,
  movedUp,
  nestedUnder,
  parentOf,
  pastedInto,
  splitAt,
  typedInto,
  whyNotDown,
  whyNotIn,
  whyNotOut,
  whyNotUp,
  type EditorLine,
} from "./item-details"

/** Editor lines from `text:level` pairs, identified in order from 1. */
const lines = (...pairs: [string, number][]): EditorLine[] =>
  pairs.map(([text, level], index) => ({ id: index + 1, text, level }))
const plain = (list: readonly DetailLine[]) =>
  list.map(({ text, level }) => [text, level])

/** S1's details, with a third level under Dermatology. */
const LIST = lines(
  ["Follow-up", 0],
  ["Dermatology", 1],
  ["Adult clinics", 2],
  ["Rheumatology", 1],
  ["In person", 0],
)

describe("where a detail sits", () => {
  it("names the detail it is nested under, or none at the top level", () => {
    expect(parentOf(LIST, 2)?.text).toBe("Dermatology")
    expect(parentOf(LIST, 3)?.text).toBe("Follow-up")
    expect(parentOf(LIST, 4)).toBeNull()
  })

  it("counts the details nested under it, at any depth", () => {
    expect(nestedUnder(LIST, 0)).toBe(3)
    expect(nestedUnder(LIST, 3)).toBe(0)
  })
})

describe("why a detail can't move (S3, S23)", () => {
  it("can't nest the first detail, one already under the detail above, or one whose nested details are at the third level", () => {
    expect(whyNotIn(LIST, 0)).toBe("first")
    expect(whyNotIn(LIST, 1)).toBe("nested")
    expect(whyNotIn(LIST, 2)).toBe("nested")
    expect(whyNotIn(lines(["a", 0], ["b", 1], ["c", 1], ["d", 2]), 2)).toBe(
      "deepest",
    )
    expect(whyNotIn(lines(["a", 0], ["b", 1], ["c", 2], ["d", 2]), 3)).toBe(
      "deepest",
    )
    expect(whyNotIn(LIST, 3)).toBeNull()
    expect(whyNotIn(LIST, 4)).toBeNull()
  })

  it("can't move a top-level detail out", () => {
    expect(whyNotOut(LIST, 0)).toBe("top")
    expect(whyNotOut(LIST, 1)).toBeNull()
  })

  it("can't move the first at its level up, or the last down, under the same detail", () => {
    expect(whyNotUp(LIST, 1)).toBe("firstAtLevel")
    expect(whyNotUp(LIST, 2)).toBe("firstAtLevel")
    expect(whyNotUp(LIST, 3)).toBeNull()
    expect(whyNotDown(LIST, 3)).toBe("lastAtLevel")
    expect(whyNotDown(LIST, 2)).toBe("lastAtLevel")
    expect(whyNotDown(LIST, 0)).toBeNull()
  })
})

describe("moving a detail up or down (S7, S23)", () => {
  it("passes the detail before or after it at its level, taking those nested under it", () => {
    expect(plain(movedUp(LIST, 4))).toEqual([
      ["In person", 0],
      ["Follow-up", 0],
      ["Dermatology", 1],
      ["Adult clinics", 2],
      ["Rheumatology", 1],
    ])
    expect(plain(movedDown(LIST, 1))).toEqual([
      ["Follow-up", 0],
      ["Rheumatology", 1],
      ["Dermatology", 1],
      ["Adult clinics", 2],
      ["In person", 0],
    ])
  })
})

describe("typing in a detail (S9)", () => {
  it("keeps the text as typed, with no refusal", () => {
    expect(typedInto(LIST, 3, "Rheumatology and  pain")).toMatchObject({
      refusal: null,
      nested: 0,
      lead: 0,
    })
    expect(typedInto(LIST, 3, "Rheumatology and  pain").lines[3]?.text).toBe(
      "Rheumatology and  pain",
    )
  })

  it("nests the detail a level for each hyphen before its text, which it never keeps", () => {
    const typed = typedInto(LIST, 4, "- In person")

    expect(plain(typed.lines).at(-1)).toEqual(["In person", 1])
    expect(typed).toMatchObject({ refusal: null, nested: 1, lead: 2 })
  })

  it("nests as far as it can and says why it stops", () => {
    const typed = typedInto(LIST, 4, "- - -5 degrees")

    expect(plain(typed.lines).at(-1)).toEqual(["5 degrees", 2])
    expect(typed).toMatchObject({ refusal: "nested", nested: 2, lead: 5 })
  })

  it("drops spaces before the text without nesting", () => {
    expect(typedInto(LIST, 4, "  In person")).toMatchObject({
      refusal: null,
      nested: 0,
      lead: 2,
    })
  })
})

describe("Enter (S21)", () => {
  const fresh = (text: string, level: number): EditorLine => ({
    id: 99,
    text,
    level,
  })

  it("starts the next detail at this one's level, split at the caret", () => {
    const split = splitAt(LIST, 3, 5, 5, fresh)

    expect(plain(split)).toEqual([
      ["Follow-up", 0],
      ["Dermatology", 1],
      ["Adult clinics", 2],
      ["Rheum", 1],
      ["atology", 1],
      ["In person", 0],
    ])
    expect(split[4]?.id).toBe(99)
  })

  it("drops the text selected, and the spaces either side of the break", () => {
    expect(plain(splitAt(lines(["One and two", 0]), 0, 4, 8, fresh))).toEqual([
      ["One", 0],
      ["two", 0],
    ])
  })

  it("starts the first of those nested, at the end of a detail that has others nested under it (D16)", () => {
    expect(plain(splitAt(LIST, 1, 11, 11, fresh)).slice(1, 4)).toEqual([
      ["Dermatology", 1],
      ["", 2],
      ["Adult clinics", 2],
    ])
  })
})

describe("Backspace at the start of a top-level detail (S22)", () => {
  it("joins its text to the detail above, saying where they meet, the details nested under it keeping their level", () => {
    const joined = joinedToAbove(lines(["One", 0], ["Two", 0], ["Three", 1]), 1)

    expect(plain(joined.lines)).toEqual([
      ["OneTwo", 0],
      ["Three", 1],
    ])
    expect(joined).toMatchObject({ into: 0, caret: 3 })
  })

  it("joins to a nested detail above, settling what follows", () => {
    expect(plain(joinedToAbove(LIST, 4).lines).slice(3)).toEqual([
      ["RheumatologyIn person", 1],
    ])
  })
})

describe("pasted lines (S8, D22)", () => {
  const fresh = (line: DetailLine): EditorLine => ({ ...line, id: 99 })

  it("take the place of a detail with no text, nested by their hyphens from its level", () => {
    const pasted = pastedInto(
      lines(["One", 0], ["", 1]),
      1,
      " Two \n- Three\n\n- Four",
      fresh,
    )

    expect(plain(pasted?.lines ?? [])).toEqual([
      ["One", 0],
      ["Two", 1],
      ["Three", 2],
      ["Four", 2],
    ])
    expect(pasted?.added).toBe(3)
  })

  it("follow a detail that holds text and the details nested under it", () => {
    const pasted = pastedInto(LIST, 1, "Paediatrics\n- Under 16s", fresh)

    expect(plain(pasted?.lines ?? []).slice(1, 5)).toEqual([
      ["Dermatology", 1],
      ["Adult clinics", 2],
      ["Paediatrics", 1],
      ["Under 16s", 2],
    ])
  })

  it("are none when every line is blank", () => {
    expect(pastedInto(LIST, 1, "\n \n", fresh)).toBeNull()
  })
})
