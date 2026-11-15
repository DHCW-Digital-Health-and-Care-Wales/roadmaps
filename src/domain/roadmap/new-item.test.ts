import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import {
  addNewItem,
  checkNewItem,
  dropPublishedNewItems,
  type NewItemInput,
} from "./new-item"
import type { NewItem, RoadmapChanges } from "./roadmap-changes"
import { createTestRoadmapItem } from "./testing/test-roadmap-item"

const NO_CHANGES: RoadmapChanges = { roadmap: {}, items: [], newItems: [] }

/** The form of an `Item ID` (ADR-012). */
const ITEM_ID = /^[bcdfghjkmnpqrstvwxz][bcdfghjkmnpqrstvwxz2-9]{7}$/

const clinic: NewItemInput = {
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
      roadmap: {},
      items: [],
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

  it.each<NewItemInput>([
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
    roadmap: { vision: { base: "", value: "Clear" } },
    items: [],
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
