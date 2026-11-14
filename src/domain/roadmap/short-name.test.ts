import { describe, expect, it } from "vitest"

import {
  checkShortName,
  SHORT_NAME_MAX_LENGTH,
  shortNameAddress,
} from "./short-name"

describe("checkShortName (STY-040 S1)", () => {
  it("trims a short name of letters, numbers, spaces and hyphens", () => {
    expect(checkShortName("  Community Nursing 2-b ")).toEqual({
      shortName: "Community Nursing 2-b",
    })
  })

  it("allows a letter with an accent, however it was typed", () => {
    expect(checkShortName("Môn")).toEqual({ shortName: "Môn" })
    // An `o` and a combining circumflex: the same letter, kept as one.
    expect(checkShortName("Môn")).toEqual({ shortName: "Môn" })
  })

  it.each(["", "   ", "\t"])("refuses a blank short name (%j)", (typed) => {
    expect(checkShortName(typed)).toEqual({ shortName: "", problem: "blank" })
  })

  it.each([
    "Community Nursing (Pilot) / 2027",
    "Nursing_2027",
    "Nursing & Care",
    "Nursing's",
    "Nursing\tCare",
    "Nursing\nCare",
    "Nursing.",
  ])(
    "refuses a character but a letter, number, space or hyphen (%j)",
    (typed) => {
      expect(checkShortName(typed).problem).toBe("invalid-character")
    },
  )

  it.each(["ß", "---", "- -", "日本"])(
    "refuses a short name whose address would be empty (%j)",
    (typed) => {
      expect(checkShortName(typed).problem).toBe("no-address")
    },
  )

  it("refuses a short name longer than a hundred characters", () => {
    expect(SHORT_NAME_MAX_LENGTH).toBe(100)
    expect(checkShortName("a".repeat(100)).problem).toBeUndefined()
    expect(checkShortName("a".repeat(101)).problem).toBe("too-long")
    // Trimmed before it is measured.
    expect(checkShortName(` ${"a".repeat(100)} `).problem).toBeUndefined()
  })
})

describe("shortNameAddress (STY-040 S1)", () => {
  it.each([
    ["Community Nursing", "community-nursing"],
    ["ProductA", "producta"],
    ["Môn", "mon"],
    ["  Ward 2 -- b ", "ward-2-b"],
    ["ß", ""],
    ["---", ""],
  ])("is the public site's slug of %j: %j", (shortName, address) => {
    expect(shortNameAddress(shortName)).toBe(address)
  })

  it("is the same for two short names that are the same", () => {
    expect(shortNameAddress("community nursing")).toBe(
      shortNameAddress("Community-Nursing"),
    )
  })
})
