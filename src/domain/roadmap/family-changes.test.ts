import { describe, expect, it } from "vitest"

import type { Family } from "./family"
import {
  checkFamilyInput,
  familyHeld,
  planFamilyChange,
  planNewFamily,
  type FamilyEdit,
} from "./family-changes"
import { createTestRoadmap } from "./testing/test-roadmap"

const singleRecord: Family = {
  id: "fc29g5b9",
  name: { en: "Single Record", cy: "Cofnod Sengl" },
  colour: "#12a3c9",
}
const medicines: Family = {
  id: "vdkxj63m",
  name: { en: "Medicines & Diagnostics", cy: "" },
  colour: "#006747",
}
const families = [singleRecord, medicines]

const member = (id: string, published = true) =>
  createTestRoadmap(id, id, {
    familyId: singleRecord.id,
    family: singleRecord.name,
    colour: singleRecord.colour,
    published,
  })
const roadmaps = [
  member("a"),
  member("b", false),
  createTestRoadmap("c", "c", { familyId: medicines.id }),
]

/** IDs handed out in turn. */
function idsOf(...ids: string[]) {
  return () => ids.shift() ?? "exhausted"
}

function edit(
  changes: FamilyEdit["changes"],
  overrides: Partial<FamilyEdit> = {},
): FamilyEdit {
  return { family: singleRecord, changes, members: ["a", "b"], ...overrides }
}

describe("checkFamilyInput", () => {
  it("trims the name and the colour, and lower-cases the colour", () => {
    expect(
      checkFamilyInput({ name: "  Screening ", colour: " #00796B " }, families),
    ).toEqual({
      input: { name: "Screening", colour: "#00796b" },
      problems: {},
    })
  })

  it.each([
    ["", "blank"],
    ["   ", "blank"],
    ["single record", "taken"],
    ["Single-Recórd", "taken"],
    [" MEDICINES and diagnostics", null],
    ["Medicines Diagnostics", "taken"],
  ] as const)("finds the name %j %s", (name, problem) => {
    expect(
      checkFamilyInput({ name, colour: "#00796b" }, families).problems.name,
    ).toBe(problem ?? undefined)
  })

  it("lets a family keep its own name, in any case or spacing", () => {
    expect(
      checkFamilyInput(
        { name: "SINGLE  record", colour: "#12a3c9" },
        families,
        singleRecord.id,
      ).problems,
    ).toEqual({})
  })

  it.each(["", "00796b", "#00796", "#00796bb", "#0g796b", "#079", "teal"])(
    "refuses the colour %j",
    (colour) => {
      expect(
        checkFamilyInput({ name: "Screening", colour }, families).problems,
      ).toEqual({ colour: "invalid" })
    },
  )
})

describe("planNewFamily", () => {
  it("gives a new family an ID no row holds, and a blank Welsh name", () => {
    expect(
      planNewFamily(
        { name: "Screening", colour: "#00796b" },
        families,
        new Set(["fc29g5b9", "takenxxx"]),
        idsOf("fc29g5b9", "takenxxx", "newidaaa"),
      ),
    ).toEqual({
      kind: "write",
      family: {
        id: "newidaaa",
        name: { en: "Screening", cy: "" },
        colour: "#00796b",
      },
    })
  })

  it("refuses a name another family has, folded", () => {
    expect(
      planNewFamily({ name: "single-record", colour: "#00796b" }, families),
    ).toEqual({ kind: "settled", outcome: { status: "name-taken" } })
  })
})

describe("planFamilyChange", () => {
  const current = { families, roadmaps }

  it("renames the family, keeping its colour and Welsh name, with its members", () => {
    expect(
      planFamilyChange(edit({ name: "Shared Care Record" }), current),
    ).toEqual({
      kind: "write",
      family: {
        ...singleRecord,
        name: { en: "Shared Care Record", cy: "Cofnod Sengl" },
      },
      members: [roadmaps[0], roadmaps[1]],
    })
  })

  it("takes an unedited field as the family now holds it", () => {
    const recoloured = { ...singleRecord, colour: "#ff0000" }
    const plan = planFamilyChange(edit({ name: "Shared Care Record" }), {
      families: [recoloured, medicines],
      roadmaps,
    })
    expect(plan.kind === "write" && plan.family.colour).toBe("#ff0000")
  })

  it("refuses a field a co-lead changed since, showing each side", () => {
    const renamed = {
      ...singleRecord,
      name: { en: "Single Records", cy: "" },
      colour: "#ff0000",
    }
    expect(
      planFamilyChange(
        edit({ name: "Shared Care Record", colour: "#00796b" }),
        { families: [renamed, medicines], roadmaps },
      ),
    ).toEqual({
      kind: "settled",
      outcome: {
        status: "refused",
        conflicts: [
          {
            field: "name",
            base: "Single Record",
            pending: "Shared Care Record",
            current: "Single Records",
          },
          {
            field: "colour",
            base: "#12a3c9",
            pending: "#00796b",
            current: "#ff0000",
          },
        ],
      },
    })
  })

  it("is no conflict when a co-lead made the same change", () => {
    const renamed = {
      ...singleRecord,
      name: { en: "Shared Care Record", cy: "" },
    }
    expect(
      planFamilyChange(edit({ name: "Shared Care Record" }), {
        families: [renamed, medicines],
        roadmaps,
      }).kind,
    ).toBe("write")
  })

  it.each([
    ["one moved in", [...roadmaps, member("d")], ["a", "b", "d"]],
    ["one moved out", [roadmaps[0], roadmaps[2]], ["a"]],
  ] as const)(
    "gives the members found again when %s",
    (_case, current, ids) => {
      const plan = planFamilyChange(edit({ colour: "#00796b" }), {
        families,
        roadmaps: current.flatMap((each) => (each ? [each] : [])),
      })
      expect(
        plan.kind === "settled" &&
          plan.outcome.status === "members-changed" &&
          plan.outcome.members.map(({ id }) => id),
      ).toEqual(ids)
    },
  )

  it("refuses a name another family took since", () => {
    expect(
      planFamilyChange(edit({ name: "medicines-diagnostics" }), current),
    ).toEqual({ kind: "settled", outcome: { status: "name-taken" } })
  })

  it("is not found once the family is gone", () => {
    expect(
      planFamilyChange(edit({ name: "Shared Care Record" }), {
        families: [medicines],
        roadmaps,
      }),
    ).toEqual({ kind: "settled", outcome: { status: "family-not-found" } })
  })
})

describe("familyHeld", () => {
  it("holds a family listed with its name and colour", () => {
    expect(familyHeld(singleRecord, families)).toBe(true)
    expect(familyHeld({ ...singleRecord, colour: "#000000" }, families)).toBe(
      false,
    )
    expect(familyHeld(singleRecord, null)).toBe(false)
  })
})
