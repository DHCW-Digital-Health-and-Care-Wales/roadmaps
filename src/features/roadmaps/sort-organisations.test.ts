import { describe, expect, it } from "vitest"

import type { Organisation } from "@/domain/roadmap/organisation"
import { TEST_ORGANISATIONS } from "@/domain/roadmap/testing/test-organisations"

import { sortOrganisations } from "./sort-organisations"

const organisation = (id: string, shortName: string): Organisation => ({
  id,
  code: id.toUpperCase(),
  shortName,
  name: { en: shortName, cy: "" },
  national: false,
})

const shortName = ({ shortName }: Organisation) => shortName

describe("sortOrganisations", () => {
  it("puts the national organisation first, then sorts by the label shown", () => {
    const sorted = sortOrganisations(TEST_ORGANISATIONS, shortName, "en")

    expect(sorted.map(({ shortName }) => shortName)).toEqual([
      "All Wales",
      "Betsi Cadwaladr",
      "Cardiff and Vale",
      "Health Education and Improvement Wales",
      "Hywel Dda",
      "Public Health Wales",
      "Swansea Bay",
    ])
  })

  it("gives the same order whatever order the repository served", () => {
    const reversed = [...TEST_ORGANISATIONS].reverse()

    expect(sortOrganisations(reversed, shortName, "en")).toEqual(
      sortOrganisations(TEST_ORGANISATIONS, shortName, "en"),
    )
  })

  it("keeps a national organisation first, whatever its label sorts as", () => {
    const national = { ...organisation("wales", "Zzz"), national: true }

    const sorted = sortOrganisations(
      [organisation("a", "Aaa"), national],
      shortName,
      "en",
    )

    expect(sorted.map(({ id }) => id)).toEqual(["wales", "a"])
  })

  it("sorts as the interface's language does: Welsh counts ch, dd and ll as letters", () => {
    const organisations = [
      organisation("d", "Dyfed"),
      organisation("c", "Cymru"),
      organisation("ch", "Chwarae"),
    ]

    const labels = (language: "en" | "cy") =>
      sortOrganisations(organisations, shortName, language).map(
        ({ shortName }) => shortName,
      )

    expect(labels("en")).toEqual(["Chwarae", "Cymru", "Dyfed"])
    expect(labels("cy")).toEqual(["Cymru", "Chwarae", "Dyfed"])
  })

  it("does not change the list it is given", () => {
    const organisations = [...TEST_ORGANISATIONS]

    sortOrganisations(organisations, shortName, "en")

    expect(organisations).toEqual(TEST_ORGANISATIONS)
  })
})
