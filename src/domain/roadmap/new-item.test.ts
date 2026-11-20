import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import {
  addNewItem,
  checkNewItem,
  dropPublishedNewItems,
  editNewItem,
  hasOnlyTitle,
  removeNewItem,
} from "./new-item"
import {
  type ItemValues,
  type NewItem,
  NO_CHANGES,
  type RoadmapChanges,
} from "./roadmap-changes"
import { createTestRoadmapItem } from "./testing/test-roadmap-item"

/** The form of an `Item ID` (ADR-012). */
const ITEM_ID = /^[bcdfghjkmnpqrstvwxz][bcdfghjkmnpqrstvwxz2-9]{7}$/

const clinic: ItemValues = {
  title: "Choose a clinic closer to home",
  placement: "next",
}

/** `clinic` as the changes hold it: every field, `""` for none. */
const clinicValues: NewItem["values"] = {
  title: "Choose a clinic closer to home",
  description: "",
  expectedOutcome: "",
  phase: "",
  placement: "next",
  tags: "",
  organisationIds: "",
  details: "",
}

/** IDs handed out in turn. */
function idsOf(...ids: string[]) {
  return () => ids.shift() ?? "exhausted"
}

describe("checkNewItem (STY-045 S1)", () => {
  it("passes a title and a placement, every other field none", () => {
    expect(checkNewItem(clinic)).toEqual({ values: clinicValues, problems: {} })
  })

  it("keeps every field given, trimmed as an edit's value is", () => {
    const { values, problems } = checkNewItem({
      title: "  Choose a clinic closer to home \n",
      description: " Pick where you are seen.\nBy distance. ",
      expectedOutcome: " Shorter journeys ",
      phase: " Discovery ",
      placement: "now",
      tags: "Patients, Carers",
      organisationIds: "cavuhb,national",
      details: "Outpatients\n- Dermatology",
    })

    expect(problems).toEqual({})
    expect(values).toEqual({
      title: "Choose a clinic closer to home",
      description: "Pick where you are seen.\nBy distance.",
      expectedOutcome: "Shorter journeys",
      phase: "Discovery",
      placement: "now",
      tags: "Patients, Carers",
      organisationIds: "cavuhb,national",
      details: "Outpatients\n- Dermatology",
    })
  })

  it.each([{ title: "" }, { title: " \n " }, {}])(
    "refuses a blank title: %o",
    (title) => {
      expect(checkNewItem({ ...title, placement: "next" }).problems).toEqual({
        title: "blank",
      })
    },
  )

  it.each([{}, { placement: "" }, { placement: "Soon" }])(
    "refuses no placement, or one that is none of the six: %o",
    (placement) => {
      expect(
        checkNewItem({ title: "Online booking", ...placement }).problems,
      ).toEqual({ placement: "none" })
    },
  )
})

describe("addNewItem (STY-045 S1)", () => {
  it("holds the new item with an ID made then, in the Item ID format", () => {
    const changes = addNewItem(NO_CHANGES, clinic, [])

    expect(changes).toEqual({
      ...NO_CHANGES,
      newItems: [
        { id: expect.stringMatching(ITEM_ID) as string, values: clinicValues },
      ],
    })
  })

  it("gives it an ID no item of the roadmap as read has, nor another new item", () => {
    const items = [
      createTestRoadmapItem("Online booking", { id: "takenaaa" }),
      createTestRoadmapItem("No ID yet"),
    ]
    const first = addNewItem(
      NO_CHANGES,
      clinic,
      items,
      idsOf("takenaaa", "newidaaa"),
    )

    const second = addNewItem(
      first,
      { title: "Text reminders", placement: "later" },
      items,
      idsOf("newidaaa", "takenaaa", "newidbbb"),
    )

    expect(second.newItems.map(({ id }) => id)).toEqual([
      "newidaaa",
      "newidbbb",
    ])
  })

  it("adds it after the new items already pending, keeping every other change", () => {
    const item = createTestRoadmapItem("Online booking", { id: "takenaaa" })
    const pending: RoadmapChanges = {
      ...NO_CHANGES,
      roadmap: { vision: { base: "", value: "Clear" } },
      items: [
        { item, position: 0, fields: { phase: { base: "", value: "Beta" } } },
      ],
      newItems: [{ id: "firstnew", values: clinicValues }],
    }

    const changes = addNewItem(
      pending,
      { title: "Text reminders", placement: "later" },
      [item],
      idsOf("secondnw"),
    )

    expect(changes).toEqual({
      ...pending,
      newItems: [
        { id: "firstnew", values: clinicValues },
        {
          id: "secondnw",
          values: {
            ...clinicValues,
            title: "Text reminders",
            placement: "later",
          },
        },
      ],
    })
    expect(pending.newItems).toHaveLength(1)
  })

  it.each<ItemValues>([
    { title: " ", placement: "next" },
    { title: "Online booking" },
    { title: "Online booking", placement: "Soon" },
  ])("refuses input that was not checked: %o", (input) => {
    let thrown: unknown
    try {
      addNewItem(NO_CHANGES, input, [])
    } catch (error) {
      thrown = error
    }

    expect(isAppError(thrown) && thrown.kind).toBe("unknown")
  })
})

describe("dropPublishedNewItems (STY-045 S4)", () => {
  const changes: RoadmapChanges = {
    ...NO_CHANGES,
    roadmap: { vision: { base: "", value: "Clear" } },
    newItems: [
      { id: "firstnew", values: clinicValues },
      { id: "secondnw", values: { ...clinicValues, title: "Text reminders" } },
    ],
  }

  it("drops a new item a read of the roadmap holds, by its ID, whatever the item then reads", () => {
    const read = [
      createTestRoadmapItem("Online booking", { id: "takenaaa" }),
      createTestRoadmapItem("Renamed by a co-lead", { id: "firstnew" }),
    ]

    expect(dropPublishedNewItems(changes, read)).toEqual({
      ...changes,
      newItems: [
        {
          id: "secondnw",
          values: { ...clinicValues, title: "Text reminders" },
        },
      ],
    })
  })

  it("gives back the very changes when the read holds none of them", () => {
    const read = [
      createTestRoadmapItem("Online booking", { id: "takenaaa" }),
      // The same title is not the new item: only its ID is.
      createTestRoadmapItem("Choose a clinic closer to home"),
    ]

    expect(dropPublishedNewItems(changes, read)).toBe(changes)
  })
})

describe("a new item, before it is published (STY-046 S6)", () => {
  const reminders = { ...clinicValues, title: "Text reminders" }
  const changes: RoadmapChanges = {
    ...NO_CHANGES,
    roadmap: { vision: { base: "", value: "Clear" } },
    newItems: [
      { id: "firstnew", values: clinicValues },
      { id: "secondnw", values: reminders },
    ],
  }

  it("is edited in place: the values given, trimmed, over those it held, its ID and its place kept", () => {
    expect(
      editNewItem(changes, "firstnew", {
        title: " Choose a clinic near you ",
        placement: "now",
        tags: "Patients",
      }),
    ).toEqual({
      ...changes,
      newItems: [
        {
          id: "firstnew",
          values: {
            ...clinicValues,
            title: "Choose a clinic near you",
            placement: "now",
            tags: "Patients",
          },
        },
        { id: "secondnw", values: reminders },
      ],
    })
  })

  it("gives back the very changes for an edit that changes nothing, or to a new item that has gone", () => {
    expect(
      editNewItem(changes, "firstnew", { title: clinicValues.title }),
    ).toBe(changes)
    expect(editNewItem(changes, "firstnew", {})).toBe(changes)
    expect(editNewItem(changes, "gonegone", { title: "Renamed" })).toBe(changes)
  })

  it.each<ItemValues>([
    { title: " " },
    { placement: "" },
    { placement: "Soon" },
  ])(
    "refuses an edit that leaves it without a title or a placement: %o",
    (values) => {
      let thrown: unknown
      try {
        editNewItem(changes, "firstnew", values)
      } catch (error) {
        thrown = error
      }

      expect(isAppError(thrown) && thrown.kind).toBe("unknown")
    },
  )

  it("is removed whole, the roadmap's other changes kept", () => {
    expect(removeNewItem(changes, "firstnew")).toEqual({
      ...changes,
      newItems: [{ id: "secondnw", values: reminders }],
    })
    expect(removeNewItem(changes, "gonegone")).toBe(changes)
  })
})

describe("hasOnlyTitle (STY-082 S1, D3)", () => {
  const titleOnly: NewItem = { id: "titleonl", values: clinicValues }

  it("is true for a title and a placement alone, whichever the placement", () => {
    expect(hasOnlyTitle(titleOnly)).toBe(true)
    expect(
      hasOnlyTitle({
        ...titleOnly,
        values: { ...clinicValues, placement: "not-doing" },
      }),
    ).toBe(true)
  })

  it.each<[string, ItemValues]>([
    ["a description", { description: "Pick where you are seen." }],
    ["an expected outcome", { expectedOutcome: "Shorter journeys" }],
    ["a phase", { phase: "Discovery" }],
    ["tags", { tags: "Patients" }],
    ["organisations", { organisationIds: "national" }],
    ["details", { details: "Outpatients" }],
  ])("is false for a title and %s", (_name, values) => {
    expect(
      hasOnlyTitle({ ...titleOnly, values: { ...clinicValues, ...values } }),
    ).toBe(false)
  })

  it("is the same for an item the item dialog made as for one quick add did", () => {
    const { values } = checkNewItem({ ...clinic, description: "  " })
    expect(hasOnlyTitle({ id: "titleonl", values })).toBe(true)
  })
})
