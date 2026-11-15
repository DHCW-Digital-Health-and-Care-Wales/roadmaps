import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import {
  checkNewRoadmapInput,
  type NewRoadmapInput,
  planNewRoadmap,
  settleLostNewRoadmap,
  shortNameInUse,
} from "./new-roadmap"
import {
  GP_AND_COMMUNITY_SERVICES,
  MEDICINES_AND_DIAGNOSTICS,
} from "./testing/test-lists"
import { createTestRoadmap } from "./testing/test-roadmap"

const outpatients = createTestRoadmap(
  "outpatient-booking",
  "Outpatient Booking roadmap",
  { itemsLocation: "Outpatient Booking" },
)

const input = (overrides: Partial<NewRoadmapInput> = {}): NewRoadmapInput => ({
  title: "Community Nursing roadmap",
  shortName: "Community Nursing",
  familyId: null,
  categoryId: null,
  productLead: "",
  ...overrides,
})

const current = (
  overrides: Partial<Parameters<typeof planNewRoadmap>[1]> = {},
) => ({
  roadmaps: [outpatients],
  names: ["Roadmaps", "Outpatient Booking", "Template"],
  families: [MEDICINES_AND_DIAGNOSTICS],
  categories: [GP_AND_COMMUNITY_SERVICES],
  ...overrides,
})

describe("checkNewRoadmapInput", () => {
  it("trims the title, the short name and the product lead", () => {
    expect(
      checkNewRoadmapInput(
        input({
          title: "  Community Nursing roadmap ",
          shortName: " Community Nursing  ",
          productLead: " Sam Evans ",
        }),
      ),
    ).toEqual({
      input: input({ productLead: "Sam Evans" }),
      problems: {},
    })
  })

  it("refuses a blank title, and a short name the rule refuses (S1)", () => {
    expect(
      checkNewRoadmapInput(input({ title: "  ", shortName: "Nursing (Pilot)" }))
        .problems,
    ).toEqual({ title: "blank", shortName: "invalid-character" })
  })
})

describe("shortNameInUse (STY-040 S4)", () => {
  it.each([
    ["Outpatient Booking", "a roadmap's own short name"],
    ["outpatient-booking", "another spelling of a roadmap's address"],
    ["TEMPLATE", "a name kept for something else, in another letter case"],
    ["roadmaps", "the roadmap list's own name"],
  ])("finds %j in use: %s", (shortName) => {
    expect(shortNameInUse(shortName, current())).toBe(true)
  })

  it("finds a new short name free", () => {
    expect(shortNameInUse("Community Nursing", current())).toBe(false)
  })
})

describe("planNewRoadmap (STY-040)", () => {
  it("plans a roadmap that is not published, with nothing but what was given (S2)", () => {
    expect(
      planNewRoadmap(
        input({
          categoryId: GP_AND_COMMUNITY_SERVICES.id,
          productLead: " Sam Evans ",
        }),
        current(),
      ),
    ).toEqual({
      kind: "write",
      roadmap: {
        id: "community-nursing",
        itemsLocation: "Community Nursing",
        title: { en: "Community Nursing roadmap", cy: "" },
        published: false,
        category: GP_AND_COMMUNITY_SERVICES.name,
        categoryId: GP_AND_COMMUNITY_SERVICES.id,
        family: null,
        familyId: null,
        copied: {
          family: null,
          colour: null,
          category: "GP & Community Services",
        },
        outOfStep: false,
        familyNotListed: false,
        statusLabel: null,
        productLead: "Sam Evans",
        lastUpdated: null,
        colour: null,
        vision: null,
        serviceDescription: null,
      },
    })
  })

  it("copies a chosen family's names and colour (S2)", () => {
    // With a Welsh name, so the copy of both names is seen.
    const welsh = {
      ...MEDICINES_AND_DIAGNOSTICS,
      name: {
        en: "Medicines & Diagnostics",
        cy: "Meddyginiaethau a Diagnosteg",
      },
    }
    const plan = planNewRoadmap(
      input({ familyId: welsh.id }),
      current({ families: [welsh] }),
    )

    expect(plan).toMatchObject({
      kind: "write",
      roadmap: {
        family: welsh.name,
        familyId: welsh.id,
        colour: "#006747",
        copied: {
          family: welsh.name,
          colour: "#006747",
          category: "",
        },
        productLead: null,
      },
    })
  })

  it("allows another roadmap's title (S3)", () => {
    expect(
      planNewRoadmap(
        input({
          title: "Outpatient Booking roadmap",
          shortName: "Outpatient Booking new",
        }),
        current(),
      ),
    ).toMatchObject({
      kind: "write",
      roadmap: { id: "outpatient-booking-new" },
    })
  })

  it("settles a short name in use, writing nothing (S4)", () => {
    expect(
      planNewRoadmap(input({ shortName: "outpatient booking" }), current()),
    ).toEqual({ kind: "settled", outcome: { status: "short-name-taken" } })
  })

  it.each([
    [{ familyId: "gone1234" }, ["familyId"]],
    [{ categoryId: "gone1234" }, ["categoryId"]],
    [
      { familyId: "gone1234", categoryId: "gone5678" },
      ["familyId", "categoryId"],
    ],
  ])(
    "settles a family or category the list no longer has (S5): %j",
    (chosen, fields) => {
      expect(planNewRoadmap(input(chosen), current())).toEqual({
        kind: "settled",
        outcome: { status: "choice-not-listed", fields },
      })
    },
  )

  it("settles a family or category whose list has gone (S5)", () => {
    expect(
      planNewRoadmap(
        input({
          familyId: MEDICINES_AND_DIAGNOSTICS.id,
          categoryId: GP_AND_COMMUNITY_SERVICES.id,
        }),
        current({ families: null, categories: null }),
      ),
    ).toEqual({
      kind: "settled",
      outcome: {
        status: "choice-not-listed",
        fields: ["familyId", "categoryId"],
      },
    })
  })

  it("plans a roadmap with neither while both lists are gone", () => {
    expect(
      planNewRoadmap(input(), current({ families: null, categories: null })),
    ).toMatchObject({ kind: "write" })
  })

  it.each([{ title: " " }, { shortName: "ß" }])(
    "throws for input the check refuses, so none is ever written: %j",
    (unchecked) => {
      const error: unknown = (() => {
        try {
          return planNewRoadmap(input(unchecked), current())
        } catch (reason) {
          return reason
        }
      })()

      expect(isAppError(error) && error.kind).toBe("unknown")
    },
  )
})

describe("settleLostNewRoadmap (STY-040 S7)", () => {
  const roadmap = createTestRoadmap("community-nursing", "Community Nursing", {
    itemsLocation: "Community Nursing",
    published: false,
  })

  it("is added when the data source holds what this write made", () => {
    // Its own short name is then in use: by itself.
    expect(
      settleLostNewRoadmap(roadmap, true, {
        roadmaps: [outpatients, roadmap],
        names: ["Community Nursing"],
      }),
    ).toEqual({ status: "added", roadmap })
  })

  it("is in use when another's roadmap now has the short name, even with the same values", () => {
    expect(
      settleLostNewRoadmap(roadmap, false, {
        roadmaps: [outpatients, structuredClone(roadmap)],
        names: ["Community Nursing"],
      }),
    ).toEqual({ status: "short-name-taken" })
  })

  it("is not written when nothing has the short name", () => {
    expect(
      settleLostNewRoadmap(roadmap, false, {
        roadmaps: [outpatients],
        names: ["Outpatient Booking"],
      }),
    ).toBeNull()
  })
})
