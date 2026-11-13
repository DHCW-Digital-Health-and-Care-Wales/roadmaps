import { describe, expect, it } from "vitest"

import type {
  FieldConflict,
  ItemChanges,
  RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { TEST_ORGANISATIONS } from "@/domain/roadmap/testing/test-organisations"

import { editItem } from "./pending-changes"
import {
  describeOrganisations,
  discardItems,
  keepMine,
  openConflicts,
  takeTheirs,
  withCurrentItemText,
  withCurrentRoadmapText,
} from "./conflicts"

const first: ItemChanges = {
  item: createTestRoadmapItem("First", {
    id: "first",
    description: { en: "Loaded", cy: "" },
  }),
  position: 0,
  fields: {
    description: { base: "Loaded", value: "Mine" },
    title: { base: "First", value: "First, mine" },
  },
}
const second: ItemChanges = {
  item: createTestRoadmapItem("Second", { id: "second" }),
  position: 1,
  fields: { title: { base: "Second", value: "Second, mine" } },
}
const changes: RoadmapChanges = {
  roadmap: { vision: { base: "A vision", value: "My vision" } },
  items: [first, second],
}

const visionConflict: FieldConflict = {
  subject: "roadmap",
  field: "vision",
  base: "A vision",
  pending: "My vision",
  current: "Their vision",
}
const conflictOn = (
  entry: ItemChanges,
  field: "title" | "description",
  current: string,
): FieldConflict => {
  const change = entry.fields[field]
  if (!change) throw new Error(`No change to ${field}`)
  return {
    subject: "item",
    item: entry,
    field,
    base: change.base,
    pending: change.value,
    current,
  }
}

describe("openConflicts", () => {
  it("lists the roadmap's fields first, then items in their order, each in field order", () => {
    const conflicts = [
      conflictOn(second, "title", "Second, theirs"),
      conflictOn(first, "description", "Theirs"),
      visionConflict,
      conflictOn(first, "title", "First, theirs"),
    ]

    const open = openConflicts(conflicts, changes)

    expect(open.map(({ key }) => key)).toEqual([
      "roadmap-vision",
      "item-first-title",
      "item-first-description",
      "item-second-title",
    ])
    expect(open[0]?.item).toBeNull()
    expect(open[1]).toMatchObject({
      yours: "First, mine",
      item: { title: { en: "First, mine" } },
    })
  })

  it("shows the pending value as edited since the publish, and closes once edited from theirs", () => {
    const conflict = conflictOn(first, "title", "First, theirs")
    const editedAgain: RoadmapChanges = {
      ...changes,
      items: [
        {
          ...first,
          fields: { title: { base: "First", value: "First, again" } },
        },
      ],
    }

    expect(openConflicts([conflict], editedAgain)[0]?.yours).toBe(
      "First, again",
    )
    expect(openConflicts([conflict], keepMine(changes, conflict))).toEqual([])
  })

  it("finds an item's change by its ID after a read moved it", () => {
    const moved: RoadmapChanges = {
      roadmap: {},
      items: [{ ...first, position: 4 }],
    }

    expect(
      openConflicts([conflictOn(first, "title", "Theirs")], moved),
    ).toHaveLength(1)
  })

  it("has none open once the change is undone or there are no changes", () => {
    const conflict = conflictOn(second, "title", "Theirs")

    expect(openConflicts([conflict], { roadmap: {}, items: [first] })).toEqual(
      [],
    )
    expect(openConflicts([conflict], undefined)).toEqual([])
  })
})

describe("keepMine", () => {
  it("keeps the pending value, now edited from the current text", () => {
    const kept = keepMine(changes, conflictOn(first, "title", "First, theirs"))

    expect(kept.items[0]?.fields).toEqual({
      description: { base: "Loaded", value: "Mine" },
      title: { base: "First, theirs", value: "First, mine" },
    })
    expect(kept.items[1]).toBe(second)
    expect(keepMine(changes, visionConflict).roadmap.vision).toEqual({
      base: "Their vision",
      value: "My vision",
    })
  })
})

describe("takeTheirs", () => {
  it("drops the pending change, and the item's entry with its last field", () => {
    const fewer = takeTheirs(
      changes,
      conflictOn(first, "title", "First, theirs"),
    )
    expect(fewer.items[0]?.fields).toEqual({
      description: { base: "Loaded", value: "Mine" },
    })

    const none = takeTheirs(changes, conflictOn(second, "title", "Theirs"))
    expect(none.items).toEqual([first])
    expect(takeTheirs(changes, visionConflict).roadmap).toEqual({})
  })
})

describe("discardItems", () => {
  it("drops each missing entry, as sent or found again by its ID", () => {
    const unidentified: ItemChanges = {
      item: createTestRoadmapItem("Third"),
      position: 2,
      fields: { title: { base: "Third", value: "Third, mine" } },
    }
    const pending: RoadmapChanges = {
      roadmap: {},
      items: [{ ...first, position: 3 }, second, unidentified],
    }

    expect(discardItems(pending, [first, unidentified]).items).toEqual([second])
    expect(discardItems(pending, [])).toBe(pending)
  })

  it("drops an unidentified item edited again while it was being published", () => {
    const sent: ItemChanges = {
      item: createTestRoadmapItem("Third"),
      position: 2,
      fields: { title: { base: "Third", value: "Third, mine" } },
    }
    const other: ItemChanges = {
      item: createTestRoadmapItem("Fourth"),
      position: 3,
      fields: { title: { base: "Fourth", value: "Fourth, mine" } },
    }
    const edited = editItem(
      { roadmap: {}, items: [sent, other] },
      sent,
      sent.item,
      2,
      { title: "Third, mine", description: "Added while publishing" },
    )

    expect(edited.items).not.toContain(sent)
    expect(discardItems(edited, [sent]).items).toEqual([other])
  })
})

describe("withCurrentRoadmapText", () => {
  it("shows the roadmap's text a co-lead wrote, in English only", () => {
    const roadmap = createTestRoadmap("producta", "Product A", {
      vision: { en: "A vision", cy: "Gweledigaeth" },
    })
    const shown = withCurrentRoadmapText(
      roadmap,
      [visionConflict, conflictOn(first, "title", "First, theirs")],
      roadmap,
    )

    expect(shown).toEqual({
      ...roadmap,
      vision: { en: "Their vision", cy: "Gweledigaeth" },
    })
  })

  it("shows it over text no read during the publish changed, though not the text edited from", () => {
    const roadmap = createTestRoadmap("producta", "Product A", {
      vision: { en: "Their earlier vision", cy: "" },
    })

    expect(
      withCurrentRoadmapText(roadmap, [visionConflict], { ...roadmap }).vision
        ?.en,
    ).toBe("Their vision")
  })

  it("leaves a field a read during the publish changed, as that read may be newer", () => {
    const before = createTestRoadmap("producta", "Product A", {
      vision: { en: "A vision", cy: "" },
    })
    const roadmap = {
      ...before,
      vision: { en: "Their later vision", cy: "" },
    }

    expect(withCurrentRoadmapText(roadmap, [visionConflict], before)).toBe(
      roadmap,
    )
    expect(withCurrentRoadmapText(roadmap, [visionConflict], undefined)).toBe(
      roadmap,
    )
  })
})

describe("withCurrentItemText", () => {
  it("shows each item's text a co-lead wrote, finding it as the publish sent it", () => {
    const items = [
      first.item,
      second.item,
      createTestRoadmapItem("Third", { id: "third" }),
    ]
    const shown = withCurrentItemText(
      items,
      [
        visionConflict,
        conflictOn(second, "title", "Second, theirs"),
        conflictOn(first, "title", "First, theirs"),
        conflictOn(first, "description", "Theirs"),
      ],
      items,
    )

    expect(shown.map(({ title }) => title.en)).toEqual([
      "First, theirs",
      "Second, theirs",
      "Third",
    ])
    expect(shown[0]?.description?.en).toBe("Theirs")
    expect(shown[2]).toBe(items[2])
  })

  it("leaves a field a read during the publish changed, as that read may be newer", () => {
    const items = [
      {
        ...first.item,
        title: { ...first.item.title, en: "First, theirs later" },
      },
      second.item,
    ]
    const shown = withCurrentItemText(
      items,
      [
        conflictOn(first, "title", "First, theirs"),
        conflictOn(first, "description", "Theirs"),
        conflictOn(second, "title", "Second, theirs"),
      ],
      [first.item],
    )

    expect(shown[0]?.title.en).toBe("First, theirs later")
    expect(shown[0]?.description?.en).toBe("Theirs")
    expect(shown[1]).toBe(items[1])
  })

  it("shows a co-lead's move, and an item they unplaced as having no horizon (STY-031 S8)", () => {
    const later = createTestRoadmapItem("Later", {
      id: "later",
      placement: "later",
    })
    const moved: ItemChanges = {
      item: later,
      position: 0,
      fields: { placement: { base: "later", value: "now" } },
    }
    const theirs = (current: string): FieldConflict => ({
      subject: "item",
      item: moved,
      field: "placement",
      base: "later",
      pending: "now",
      current,
    })

    const [elsewhere] = withCurrentItemText([later], [theirs("next")], [later])
    const [unplaced] = withCurrentItemText([later], [theirs("")], [later])

    expect(elsewhere).toEqual({ ...later, placement: "next" })
    expect(unplaced).toEqual({ ...later, placement: null, writtenHorizon: "" })
  })
})

describe("describeOrganisations (STY-034 S7)", () => {
  it("names a set by short name, as the card sorts them", () => {
    expect(
      describeOrganisations("national,sbuhb,cavuhb", TEST_ORGANISATIONS, "en"),
    ).toBe("All Wales, Cardiff and Vale, Swansea Bay")
    expect(describeOrganisations("", TEST_ORGANISATIONS, "en")).toBe("")
  })

  it("names an organisation by its id while the list doesn't hold it, never leaving a set blank", () => {
    expect(describeOrganisations("cavuhb,pthb", TEST_ORGANISATIONS, "en")).toBe(
      "Cardiff and Vale, pthb",
    )
    expect(describeOrganisations("cavuhb,sbuhb", undefined, "en")).toBe(
      "cavuhb, sbuhb",
    )
  })
})
