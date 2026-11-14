import { describe, expect, it } from "vitest"

import {
  checkShortName,
  SHORT_NAME_MAX_LENGTH,
  shortNameAddress,
  suggestShortName,
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

describe("suggestShortName (STY-041 S3)", () => {
  it("drops a final “roadmap” from the title, in any letter case", () => {
    expect(suggestShortName("Community Nursing roadmap")).toBe(
      "Community Nursing",
    )
    expect(suggestShortName("  Outpatient Booking  Roadmap ")).toBe(
      "Outpatient Booking",
    )
  })

  it("keeps a “roadmap” that is not the last word, or is the only one", () => {
    expect(suggestShortName("Roadmap for nursing")).toBe("Roadmap for nursing")
    expect(suggestShortName("Roadmap")).toBe("Roadmap")
    expect(suggestShortName("Nursingroadmap")).toBe("Nursingroadmap")
  })

  it("drops every character a short name can't hold, and the spaces left over", () => {
    expect(suggestShortName("Community Nursing (Pilot) / 2027 roadmap")).toBe(
      "Community Nursing Pilot 2027",
    )
    expect(suggestShortName("Ynys Môn: tests & scans")).toBe(
      "Ynys Môn tests scans",
    )
    expect(suggestShortName("Follow-up care")).toBe("Follow-up care")
  })

  it("suggests nothing for a title with nothing a short name can hold", () => {
    expect(suggestShortName("")).toBe("")
    expect(suggestShortName(" (…) ")).toBe("")
  })

  it("suggests no more than a short name can hold", () => {
    const suggested = suggestShortName(`${"Nursing ".repeat(20)}roadmap`)

    expect(suggested).toBe(`${"Nursing ".repeat(12)}Nurs`)
    expect(suggested).toHaveLength(SHORT_NAME_MAX_LENGTH)
    expect(checkShortName(suggested)).toEqual({ shortName: suggested })
  })

  it.each([
    "Community Nursing roadmap",
    "Môn (typed with a mark of its own: Môn)",
    "A/B testing — 2027!",
    `${"😀".repeat(60)} emoji`,
    // Cut where a letter of two UTF-16 units would be split.
    `a${"𝒜".repeat(80)}`,
  ])("suggests a name the rule allows, or none, for %j", (title) => {
    const suggested = suggestShortName(title)

    expect(checkShortName(suggested).shortName).toBe(suggested)
    expect(["blank", "no-address", undefined]).toContain(
      checkShortName(suggested).problem,
    )
  })
})
