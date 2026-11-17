import { describe, expect, it } from "vitest"

import { addNewItem } from "@/domain/roadmap/new-item"
import { orderedItem } from "@/domain/roadmap/placement-order"
import {
  type FieldConflict,
  type ItemChanges,
  NO_CHANGES,
  type OrderConflict,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { TEST_ORGANISATIONS } from "@/domain/roadmap/testing/test-organisations"

import type { PageItem } from "./page-items"
import {
  applyItemChanges,
  editItem,
  matchItemChanges,
  shownNewItem,
} from "./pending-changes"
import {
  reorderItem,
  settleOrders,
  shownTurns,
  undoOrder,
} from "./placement-orders"
import {
  describeOrganisations,
  discardItems,
  keepMine,
  openConflicts,
  reviewedOrders,
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
  ...NO_CHANGES,
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
    expect(open[0]).toMatchObject({ item: null })
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

    expect(openConflicts([conflict], editedAgain)).toMatchObject([
      { yours: "First, again" },
    ])
    expect(openConflicts([conflict], keepMine(changes, conflict))).toEqual([])
  })

  it("finds an item's change by its ID after a read moved it", () => {
    const moved: RoadmapChanges = {
      ...NO_CHANGES,
      items: [{ ...first, position: 4 }],
    }

    expect(
      openConflicts([conflictOn(first, "title", "Theirs")], moved),
    ).toHaveLength(1)
  })

  it("has none open once the change is undone or there are no changes", () => {
    const conflict = conflictOn(second, "title", "Theirs")

    expect(
      openConflicts([conflict], { ...NO_CHANGES, items: [first] }),
    ).toEqual([])
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
      ...NO_CHANGES,
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
      { ...NO_CHANGES, items: [sent, other] },
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

describe("Welsh tags written since an item was read (STY-037 S22)", () => {
  const booking = createTestRoadmapItem("Online booking", {
    id: "bookingx",
    tags: [{ en: "Patients", cy: "" }],
  })
  const retagged: ItemChanges = {
    item: booking,
    position: 0,
    fields: {
      tags: { base: "Patients", value: "Patients, Carers" },
      title: { base: "Online booking", value: "Booking online" },
    },
  }
  const welshTags: FieldConflict = {
    subject: "item",
    item: retagged,
    field: "tags",
    base: "Patients",
    pending: "Patients, Carers",
    current: "Patients",
    gainedWelsh: true,
  }
  const pending: RoadmapChanges = { ...NO_CHANGES, items: [retagged] }

  it("stays open, though the English is as it was edited from, until the tag change is given up", () => {
    expect(openConflicts([welshTags], pending)).toMatchObject([
      { yours: "Patients, Carers" },
    ])

    const dropped = takeTheirs(pending, welshTags)

    expect(dropped.items[0]?.fields).toEqual({
      title: { base: "Online booking", value: "Booking online" },
    })
    expect(openConflicts([welshTags], dropped)).toEqual([])
  })

  it("shows the item as having Welsh tags, so its form no longer changes them", () => {
    const [shown] = withCurrentItemText([booking], [welshTags], [booking])

    expect(shown).toEqual({ ...booking, hasWelshTags: true })
  })
})

describe("Welsh details written since an item was read (STY-039 S19)", () => {
  const video = createTestRoadmapItem("Video appointments", {
    id: "videoxxx",
    details: [{ text: { en: "Follow-up appointments", cy: "" }, level: 0 }],
  })
  const redetailed: ItemChanges = {
    item: video,
    position: 0,
    fields: {
      details: {
        base: "Follow-up appointments",
        value: "Follow-up appointments\n- Dermatology",
      },
      title: { base: "Video appointments", value: "Video calls" },
    },
  }
  const welshDetails: FieldConflict = {
    subject: "item",
    item: redetailed,
    field: "details",
    base: "Follow-up appointments",
    pending: "Follow-up appointments\n- Dermatology",
    current: "Follow-up appointments",
    gainedWelsh: true,
  }
  const pending: RoadmapChanges = { ...NO_CHANGES, items: [redetailed] }

  it("stays open, though the English is as it was edited from, until the change of details is given up", () => {
    expect(openConflicts([welshDetails], pending)).toMatchObject([
      { yours: "Follow-up appointments\n- Dermatology" },
    ])

    const dropped = takeTheirs(pending, welshDetails)

    expect(dropped.items[0]?.fields).toEqual({
      title: { base: "Video appointments", value: "Video calls" },
    })
    expect(openConflicts([welshDetails], dropped)).toEqual([])
  })

  it("shows the item as having Welsh details, so its form no longer changes them", () => {
    const [shown] = withCurrentItemText([video], [welshDetails], [video])

    expect(shown).toEqual({ ...video, hasWelshDetails: true })
  })

  it("shows a co-lead's details on the item, each at its level", () => {
    const theirs: FieldConflict = {
      ...welshDetails,
      current: "Follow-up appointments\n- Diabetes",
    }
    delete theirs.gainedWelsh

    const [shown] = withCurrentItemText([video], [theirs], [video])

    expect(shown?.details).toEqual([
      { text: { en: "Follow-up appointments", cy: "" }, level: 0 },
      { text: { en: "Diabetes", cy: "" }, level: 1 },
    ])
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

describe("an order conflict (STY-050)", () => {
  const item = (title: string, placement: RoadmapPlacement = "now") =>
    createTestRoadmapItem(title, {
      id: `${title.toLowerCase()}idxxxx`,
      placement,
    })
  const a = item("A")
  const b = item("B")
  const c = item("C")
  const theirs = item("E")
  const loaded = [a, b, c]
  /** As a co-lead left the roadmap: C removed, E added. */
  const current = [a, b, theirs]
  const reordered = reorderItem(NO_CHANGES, loaded, 2, "top")
  const order = reordered.orders[0]
  if (!order) throw new Error("Now is reordered")
  const conflict: OrderConflict = {
    subject: "order",
    placement: "now",
    base: order.base,
    pending: order.items,
    current: current.map((each, position) => ({
      item: orderedItem(each, position),
      title: each.title,
    })),
  }
  /** The page's items over `read`, as `usePageItems` gives them. */
  const pageItemsOf = (
    read: readonly RoadmapItem[],
    pending: RoadmapChanges,
  ): PageItem[] => {
    const entries = matchItemChanges(read, pending)
    const turns = shownTurns(read, pending)
    return [
      ...read.map((each, position) => ({
        key: `read-${String(position)}`,
        item: each,
        shown: applyItemChanges(each, entries.get(position)),
        entry: entries.get(position),
        newItemId: undefined,
        turn: turns[position],
      })),
      ...pending.newItems.map((newItem, added) => ({
        key: `new-${newItem.id}`,
        item: shownNewItem(newItem),
        shown: shownNewItem(newItem),
        entry: undefined,
        newItemId: newItem.id,
        turn: turns[read.length + added],
      })),
    ]
  }
  const titles = (lines: readonly { title: { en: string } }[]) =>
    lines.map(({ title }) => title.en)

  it("is open while the order is pending from another order than the one found (S10)", () => {
    expect(openConflicts([conflict], reordered)).toEqual([
      { conflict, key: "order-now" },
    ])
    expect(openConflicts([conflict], NO_CHANGES)).toEqual([])
    expect(openConflicts([conflict], undoOrder(reordered, "now"))).toEqual([])
  })

  it("sits before the field conflicts of its placement's items, after the roadmap's and any item above them (S11)", () => {
    const next = item("Next one", "next")
    const edits: ItemChanges[] = [
      {
        item: next,
        position: 0,
        fields: { title: { base: "Next one", value: "Mine" } },
      },
      { item: b, position: 2, fields: { title: { base: "B", value: "My B" } } },
    ]
    const [aboveThem, inNow] = edits
    if (!aboveThem || !inNow) throw new Error("Two items are edited")
    const pending = { ...changes, items: edits, orders: [order] }

    const open = openConflicts(
      [
        conflictOn(inNow, "title", "Their B"),
        conflict,
        conflictOn(aboveThem, "title", "Theirs"),
        visionConflict,
      ],
      pending,
    )

    expect(open.map(({ key }) => key)).toEqual([
      "roadmap-vision",
      `item-${next.id ?? ""}-title`,
      "order-now",
      `item-${b.id ?? ""}-title`,
    ])
  })

  it("Keep mine makes the order found the base, the order still pending (S12)", () => {
    const kept = keepMine(reordered, conflict)

    expect(kept.orders).toEqual([
      { ...order, base: conflict.current.map(({ item: each }) => each) },
    ])
    expect(openConflicts([conflict], kept)).toEqual([])
  })

  it("Use theirs drops the pending order (S12)", () => {
    expect(takeTheirs(reordered, conflict)).toEqual(NO_CHANGES)
  })

  it("leaves another placement's order, and a field's change, as they are", () => {
    const both = reorderItem(
      { ...reordered, roadmap: changes.roadmap },
      [...loaded, item("X", "next"), item("Y", "next")],
      4,
      "top",
    )

    const taken = takeTheirs(both, conflict)

    expect(taken.orders.map(({ placement }) => placement)).toEqual(["next"])
    expect(taken.roadmap).toBe(both.roadmap)
  })

  describe("the two orders the review shows (S11)", () => {
    it("shows what Keep mine would publish beside the order found: a co-lead's item last, one they removed gone", () => {
      // The read after the refusal holds the co-lead's change.
      const pending = settleOrders(reordered, current)

      const { yours, theirs: found } = reviewedOrders(
        conflict,
        pageItemsOf(current, pending),
      )

      expect(titles(yours)).toEqual(["A", "B", "E"])
      expect(titles(found)).toEqual(["A", "B", "E"])
    })

    it("keeps the Product Lead's order of the items they know, and their own moves and new items", () => {
      const read = [...current, item("X", "next")]
      const pending = settleOrders(
        addNewItem(
          editItem(
            reorderItem(NO_CHANGES, [...loaded, item("X", "next")], 1, "top"),
            undefined,
            item("X", "next"),
            3,
            { placement: "now" },
          ),
          { title: "New", placement: "now" },
          read,
        ),
        read,
      )

      const { yours, theirs: found } = reviewedOrders(
        conflict,
        pageItemsOf(read, pending),
      )

      expect(titles(yours)).toEqual(["B", "A", "E", "X", "New"])
      expect(titles(found)).toEqual(["A", "B", "E"])
    })

    it("shows each item by the title the page shows, in both orders", () => {
      const pending = settleOrders(
        editItem(reorderItem(NO_CHANGES, loaded, 1, "top"), undefined, a, 0, {
          title: "My A",
        }),
        current,
      )

      const { yours, theirs: found } = reviewedOrders(
        conflict,
        pageItemsOf(current, pending),
      )

      expect(titles(yours)).toEqual(["B", "My A", "E"])
      expect(titles(found)).toEqual(["My A", "B", "E"])
    })

    it("shows a co-lead's items though the read after the refusal failed, and leaves out one the Product Lead moved out", () => {
      // The page still holds the roadmap as loaded: A, B and C.
      const pending = editItem(
        reorderItem(NO_CHANGES, loaded, 1, "top"),
        undefined,
        a,
        0,
        { placement: "later" },
      )

      const { yours } = reviewedOrders(conflict, pageItemsOf(loaded, pending))

      expect(titles(yours)).toEqual(["B", "E"])
    })
  })
})
