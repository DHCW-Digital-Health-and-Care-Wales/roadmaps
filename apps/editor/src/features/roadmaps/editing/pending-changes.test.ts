import { describe, expect, it } from "vitest"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { removeItem } from "@/domain/roadmap/item-removal"
import { addNewItem } from "@/domain/roadmap/new-item"
import { planRoadmapPublish } from "@/domain/roadmap/publish-plan"
import {
  type ItemValues,
  NO_CHANGES,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import { addingItems, NEW_CLINIC } from "@/domain/roadmap/testing/test-new-item"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"

import {
  applyItemChanges,
  applyRoadmapChanges,
  changedParts,
  countChanges,
  editItem,
  editRoadmap,
  matchItemChanges,
  publishesNoItems,
  reconcileItems,
  reconcileRoadmap,
  settlePublished,
  shownNewItem,
  undoItem,
} from "./pending-changes"

const roadmap = createTestRoadmap("producta", "Product A", {
  vision: { en: "A vision", cy: "Gweledigaeth" },
})
const first = createTestRoadmapItem("First", { id: "firstidx" })
const second = createTestRoadmapItem("Second")

describe("editRoadmap", () => {
  it("keeps trimmed values with the loaded text as their base", () => {
    const changes = editRoadmap(NO_CHANGES, roadmap, {
      title: "  New title ",
      vision: "",
      productLead: "",
    })

    expect(changes.roadmap).toEqual({
      title: { base: "Product A", value: "New title" },
      vision: { base: "A vision", value: "" },
    })
  })

  it("keeps the first base over later edits, and drops an edit back to it", () => {
    const once = editRoadmap(NO_CHANGES, roadmap, { title: "Second title" })
    const reread = createTestRoadmap("producta", "Co-lead's title")

    const twice = editRoadmap(once, reread, { title: "Third title" })
    expect(twice.roadmap.title).toEqual({
      base: "Product A",
      value: "Third title",
    })
    expect(editRoadmap(twice, reread, { title: "Product A" }).roadmap).toEqual(
      {},
    )
    expect(
      editRoadmap(twice, reread, { title: "Co-lead's title" }).roadmap,
    ).toEqual({})
  })
  it("edits from the Product Lead's own publish, landed while the form was open", () => {
    const pending = editRoadmap(NO_CHANGES, roadmap, { vision: "Published" })
    const shown = applyRoadmapChanges(roadmap, pending)
    const settled = settlePublished(pending, pending)
    const published = createTestRoadmap("producta", "Product A", {
      vision: { en: "Published", cy: "Gweledigaeth" },
    })

    const changes = editRoadmap(
      settled,
      roadmap,
      { vision: "Again" },
      { shown, latest: published },
    )

    expect(changes.roadmap).toEqual({
      vision: { base: "Published", value: "Again" },
    })
  })

  it("still edits from what the form opened on when a co-lead changed it since", () => {
    const coLead = createTestRoadmap("producta", "Product A", {
      vision: { en: "Co-lead's vision", cy: "Gweledigaeth" },
    })

    const changes = editRoadmap(
      NO_CHANGES,
      roadmap,
      { vision: "Mine" },
      { shown: roadmap, latest: coLead },
    )

    expect(changes.roadmap).toEqual({
      vision: { base: "A vision", value: "Mine" },
    })
  })
})

describe("editItem", () => {
  it("adds an entry, replaces it on the next edit and removes it when nothing differs", () => {
    const added = editItem(NO_CHANGES, undefined, second, 1, {
      title: "Second",
      phase: " Beta ",
    })
    expect(added.items).toEqual([
      {
        item: second,
        position: 1,
        fields: { phase: { base: "", value: "Beta" } },
      },
    ])

    const [entry] = added.items
    const replaced = editItem(added, entry, second, 1, { phase: "Live" })
    expect(replaced.items).toEqual([
      {
        item: second,
        position: 1,
        fields: { phase: { base: "", value: "Live" } },
      },
    ])

    expect(
      editItem(replaced, replaced.items[0], second, 1, { phase: "" }).items,
    ).toEqual([])
  })

  it("takes each base from the item the form opened on, keeping the item first loaded", () => {
    const opened = { ...first, phase: { en: "Alpha", cy: "" } }
    const once = editItem(NO_CHANGES, undefined, opened, 0, { title: "One" })
    const reread = { ...opened, phase: { en: "Co-lead's phase", cy: "" } }

    const twice = editItem(once, once.items[0], reread, 0, { phase: "Beta" })

    expect(twice.items).toEqual([
      {
        item: opened,
        position: 0,
        fields: {
          title: { base: "First", value: "One" },
          phase: { base: "Co-lead's phase", value: "Beta" },
        },
      },
    ])
  })

  it("undoes one item without touching another", () => {
    const one = editItem(NO_CHANGES, undefined, first, 0, { title: "One" })
    const both = editItem(one, undefined, second, 1, { title: "Two" })
    const [firstEntry] = both.items
    if (!firstEntry) throw new Error("expected an entry")

    expect(undoItem(both, firstEntry).items).toEqual([both.items[1]])
  })

  it("edits an item from the Product Lead's own publish, landed while its form was open", () => {
    const pending = editItem(NO_CHANGES, undefined, first, 0, {
      description: "Published",
    })
    const [entry] = pending.items
    const shown = applyItemChanges(first, entry)
    const settled = settlePublished(pending, pending)
    const published = { ...first, description: { en: "Published", cy: "" } }

    const changes = editItem(
      settled,
      undefined,
      first,
      0,
      { description: "Again" },
      { shown, latest: published },
    )

    expect(changes.items[0]?.fields).toEqual({
      description: { base: "Published", value: "Again" },
    })
  })
})

describe("matchItemChanges", () => {
  it("finds an item by its ID wherever it moved, and one without by its place and content", () => {
    let changes = editItem(NO_CHANGES, undefined, first, 0, { title: "One" })
    changes = editItem(changes, undefined, second, 1, { title: "Two" })

    const moved = matchItemChanges([second, first], changes)
    expect(moved.get(1)).toBe(changes.items[0])
    expect(moved.has(0)).toBe(false)

    const same = matchItemChanges([first, second], changes)
    expect(same.get(0)).toBe(changes.items[0])
    expect(same.get(1)).toBe(changes.items[1])
  })

  const worded = (...texts: string[]) =>
    texts.map((en) => ({ text: { en, cy: "" }, level: 0 }))

  it.each<
    [
      field: string,
      held: Partial<RoadmapItem>,
      edit: ItemValues,
      written: Partial<RoadmapItem>,
    ]
  >([
    [
      "choice",
      { organisationIds: ["cavuhb"], unknownOrganisationCodes: ["CAVHB"] },
      { organisationIds: "national" },
      { organisationIds: ["national"], unknownOrganisationCodes: [] },
    ],
    [
      "tags",
      { tags: [{ en: "Patients", cy: "" }] },
      { tags: "Carers" },
      { tags: [{ en: "Carers", cy: "" }] },
    ],
    [
      "details",
      { details: worded("Follow-up appointments") },
      { details: "In person" },
      { details: worded("In person") },
    ],
  ])(
    "finds an item without an ID whose %s a lost publish already wrote",
    (_, held, edit, written) => {
      const loaded = createTestRoadmapItem("Item", { ...held, id: null })
      const changes = editItem(NO_CHANGES, undefined, loaded, 1, edit)

      expect(
        matchItemChanges([first, { ...loaded, ...written }], changes).get(1),
      ).toBe(changes.items[0])
    },
  )
})

describe("reconcile", () => {
  it("drops what a fresh read already holds and keeps the rest, bases unchanged", () => {
    const changes = editRoadmap(NO_CHANGES, roadmap, {
      title: "New title",
      vision: "New vision",
    })
    const reread = { ...roadmap, title: { en: "New title", cy: "" } }

    expect(reconcileRoadmap(changes, reread).roadmap).toEqual({
      vision: { base: "A vision", value: "New vision" },
    })
    expect(reconcileRoadmap(changes, roadmap)).toBe(changes)
  })

  it("keeps No family or category pending while a read names one it can't link", () => {
    const linked = {
      ...roadmap,
      family: { en: "Single Record", cy: "Cofnod Sengl" },
      familyId: "fc29g5b9",
      category: { en: "Clinical", cy: "" },
      categoryId: "khzpchkh",
    }
    const changes = editRoadmap(NO_CHANGES, linked, {
      familyId: "",
      categoryId: "",
    })
    const listsMissing = { ...linked, familyId: null, categoryId: null }
    const cleared = {
      ...listsMissing,
      family: null,
      category: null,
    }

    expect(reconcileRoadmap(changes, listsMissing)).toBe(changes)
    expect(reconcileRoadmap(changes, cleared).roadmap).toEqual({})
  })

  it("follows an item to its new place, drops held fields and keeps an item not found", () => {
    let changes = editItem(NO_CHANGES, undefined, first, 0, {
      title: "One",
      phase: "Beta",
    })
    changes = editItem(changes, undefined, second, 1, { title: "Two" })
    const firstNow = { ...first, title: { en: "One", cy: "" } }
    const other = createTestRoadmapItem("Other")

    const reconciled = reconcileItems(changes, [other, firstNow])

    expect(reconciled.items).toEqual([
      {
        item: firstNow,
        position: 1,
        fields: { phase: { base: "", value: "Beta" } },
      },
      changes.items[1],
    ])
  })

  it("keeps the content first loaded, so a copy that became the first row is refused", () => {
    const loaded = createTestRoadmapItem("Shared", { id: "sharedid" })
    const changes = editItem(NO_CHANGES, undefined, loaded, 0, {
      title: "Mine",
    })
    const copy = {
      ...loaded,
      description: { en: "A co-lead's copy", cy: "" },
    }

    const reconciled = reconcileItems(changes, [copy])
    expect(reconciled).toBe(changes)

    const plan = planRoadmapPublish(reconciled, {
      roadmap,
      items: [copy, { ...loaded, id: null }],
      repeatedIds: new Set(["sharedid"]),
      takenIds: new Set(["sharedid"]),
      missingLists: new Set(),
      organisationIds: new Set(),
    })
    expect(plan).toMatchObject({
      kind: "settled",
      outcome: { status: "refused" },
    })
  })
})

describe("settlePublished", () => {
  it("removes what was sent and keeps edits made since, based on what was sent", () => {
    const sent = editItem(
      editRoadmap(NO_CHANGES, roadmap, { title: "Sent", vision: "Sent" }),
      undefined,
      first,
      0,
      { title: "Sent" },
    )
    const [sentEntry] = sent.items
    const since: RoadmapChanges = editItem(
      editRoadmap(sent, roadmap, { vision: "Later" }),
      sentEntry,
      first,
      0,
      { phase: "Later" },
    )

    const settled = settlePublished(since, sent)

    expect(settled.roadmap).toEqual({
      vision: { base: "Sent", value: "Later" },
    })
    expect(settled.items.map(({ fields }) => fields)).toEqual([
      { phase: { base: "", value: "Later" } },
    ])
    expect(settled.items[0]?.item.title.en).toBe("Sent")
    expect(countChanges(settlePublished(sent, sent))).toBe(0)
  })
})

describe("after a publish is read back (DEF-011)", () => {
  it("keeps an edit back to the text replaced pending, based on what was published", () => {
    const sent = editRoadmap(NO_CHANGES, roadmap, { title: "Sent" })
    const read = { ...roadmap, title: { en: "Sent", cy: "" } }

    const settled = reconcileRoadmap(settlePublished(sent, sent), read)
    const back = editRoadmap(settled, read, { title: roadmap.title.en })

    expect(back.roadmap).toEqual({
      title: { base: "Sent", value: roadmap.title.en },
    })
  })
})

describe("changedParts", () => {
  it("lists the roadmap's own fields, then each item in its order as it will read", () => {
    let changes = editRoadmap(NO_CHANGES, roadmap, { vision: "New" })
    changes = editItem(changes, undefined, second, 1, { phase: "Beta" })
    changes = editItem(changes, undefined, first, 0, { title: "One" })

    expect(changedParts(changes)).toEqual([
      { kind: "roadmap", fields: ["vision"] },
      {
        kind: "item",
        position: 0,
        item: { ...first, title: { en: "One", cy: "" } },
        fields: ["title"],
      },
      {
        kind: "item",
        position: 1,
        item: { ...second, phase: { en: "Beta", cy: "" } },
        fields: ["phase"],
      },
    ])
    expect(changedParts(NO_CHANGES)).toEqual([])
  })
})

describe("apply", () => {
  it("shows the pending English and keeps the Welsh; a cleared field reads as none", () => {
    const changes = editRoadmap(NO_CHANGES, roadmap, {
      title: "New title",
      vision: "",
      productLead: "Sam Evans",
    })

    expect(applyRoadmapChanges(roadmap, changes)).toMatchObject({
      title: { en: "New title", cy: "" },
      vision: null,
      productLead: "Sam Evans",
    })

    const item = createTestRoadmapItem("Item", {
      description: { en: "Old", cy: "Hen" },
    })
    const edited = editItem(NO_CHANGES, undefined, item, 0, {
      description: "New",
    })
    expect(applyItemChanges(item, edited.items[0]).description).toEqual({
      en: "New",
      cy: "Hen",
    })
  })

  describe("a chosen family or category (STY-028 S1)", () => {
    const singleRecord = createTestRoadmap("producta", "Product A", {
      family: { en: "Single Record", cy: "Cofnod Sengl" },
      familyId: "fc29g5b9",
      colour: "#12a3c9",
      category: { en: "GP & Community Services", cy: "Meddygon Teulu" },
      categoryId: "khzpchkh",
    })
    const lists = {
      families: [
        {
          id: "vdkxj63m",
          name: { en: "Medicines & Diagnostics", cy: "Meddyginiaethau" },
          colour: "#006747",
        },
      ],
      categories: [{ id: "w7vrv5kn", name: { en: "Tests", cy: "Profion" } }],
    }

    it("shows a chosen family and category as the lists name them, with the family's colour", () => {
      const changes = editRoadmap(NO_CHANGES, singleRecord, {
        familyId: "vdkxj63m",
        categoryId: "w7vrv5kn",
      })

      expect(applyRoadmapChanges(singleRecord, changes, lists)).toMatchObject({
        family: { en: "Medicines & Diagnostics", cy: "Meddyginiaethau" },
        familyId: "vdkxj63m",
        colour: "#006747",
        category: { en: "Tests", cy: "Profion" },
        categoryId: "w7vrv5kn",
      })
    })

    it("shows no family or category for none, keeping the colour", () => {
      const changes = editRoadmap(NO_CHANGES, singleRecord, {
        familyId: "",
        categoryId: "",
      })

      expect(applyRoadmapChanges(singleRecord, changes, lists)).toMatchObject({
        family: null,
        familyId: null,
        colour: "#12a3c9",
        category: null,
        categoryId: null,
      })
    })
  })
})

describe("a move (STY-031)", () => {
  const unplaced = createTestRoadmapItem("Unplaced", {
    id: "unplaced",
    placement: null,
    writtenHorizon: "Soon",
  })

  it("shows the item in its new placement, an unplaced one no longer flagged (S1, S4)", () => {
    const moved = editItem(NO_CHANGES, undefined, unplaced, 0, {
      placement: "later",
    })

    expect(moved.items[0]?.fields).toEqual({
      placement: { base: "", value: "later" },
    })
    expect(applyItemChanges(unplaced, moved.items[0])).toEqual({
      ...unplaced,
      placement: "later",
      writtenHorizon: null,
    })
    expect(countChanges(moved)).toBe(1)
  })

  it("leaves the public nothing to see until an item is in a horizon or section, counting a pending move (STY-042 S3)", () => {
    const moved = editItem(NO_CHANGES, undefined, unplaced, 0, {
      placement: "later",
    })
    const retitled = editItem(NO_CHANGES, undefined, unplaced, 0, {
      title: "Still unplaced",
    })

    expect(publishesNoItems([], undefined)).toBe(true)
    expect(publishesNoItems([unplaced], undefined)).toBe(true)
    expect(publishesNoItems([unplaced], retitled)).toBe(true)
    expect(publishesNoItems([unplaced], moved)).toBe(false)
    expect(publishesNoItems([unplaced, first], undefined)).toBe(false)
  })

  it("is no change once moved back (S5)", () => {
    const moved = editItem(NO_CHANGES, undefined, first, 0, {
      placement: "later",
    })

    expect(
      editItem(moved, moved.items[0], first, 0, { placement: "now" }),
    ).toEqual(NO_CHANGES)
  })

  it("is dropped by a read that finds the item already there, which it then holds (S9)", () => {
    const moved = editItem(NO_CHANGES, undefined, unplaced, 0, {
      placement: "now",
      title: "Placed",
    })
    const placed = {
      ...unplaced,
      placement: "now",
      writtenHorizon: null,
    } as const

    expect(reconcileItems(moved, [placed]).items).toEqual([
      {
        item: placed,
        position: 0,
        fields: { title: { base: "Unplaced", value: "Placed" } },
      },
    ])
  })

  it("finds an item without an ID that a lost publish already moved", () => {
    const moved = editItem(NO_CHANGES, undefined, second, 1, {
      placement: "later",
    })
    const read = [first, { ...second, placement: "later" } as const]

    expect(matchItemChanges(read, moved).get(1)).toBe(moved.items[0])
  })
})

describe("the order of moves (STY-051 D3)", () => {
  const third = createTestRoadmapItem("Third", { id: "thirdidx" })
  const titles = (changes: RoadmapChanges) =>
    changes.items.map(({ item }) => item.title.en)
  const entryOf = (changes: RoadmapChanges, item: typeof first) =>
    changes.items.find((entry) => entry.item === item)

  /** First moved to Later, then Third. */
  function bothMoved(): RoadmapChanges {
    const one = editItem(NO_CHANGES, undefined, first, 0, {
      placement: "later",
    })
    return editItem(one, undefined, third, 2, { placement: "later" })
  }

  it("keeps the items in the order they were moved, whatever else is edited since", () => {
    const moved = bothMoved()
    expect(titles(moved)).toEqual(["First", "Third"])

    const retitled = editItem(moved, entryOf(moved, first), first, 0, {
      title: "Renamed",
    })

    expect(titles(retitled)).toEqual(["First", "Third"])
    expect(retitled.items[0]?.fields).toEqual({
      placement: { base: "now", value: "later" },
      title: { base: "First", value: "Renamed" },
    })
  })

  it("keeps an item's turn when it is given the placement it is already moved to", () => {
    const moved = bothMoved()

    expect(
      titles(
        editItem(moved, entryOf(moved, first), first, 0, {
          placement: "later",
          phase: "Beta",
        }),
      ),
    ).toEqual(["First", "Third"])
  })

  it("puts an item moved again after those moved before it", () => {
    const moved = bothMoved()

    expect(
      titles(
        editItem(moved, entryOf(moved, first), first, 0, { placement: "next" }),
      ),
    ).toEqual(["Third", "First"])
  })

  it("keeps the order through a read and a publish that drop some of the items' changes", () => {
    const fourth = createTestRoadmapItem("Fourth", { id: "fourthid" })
    const moved = [third, fourth, first].reduce(
      (changes, item, at) =>
        editItem(changes, undefined, item, at, {
          placement: "later",
          title: `${item.title.en}, renamed`,
        }),
      NO_CHANGES,
    )
    // By ID: an entry's item takes each title a read or a publish settles.
    const ids = (changes: RoadmapChanges) =>
      changes.items.map(({ item }) => item.id)
    expect(ids(moved)).toEqual(["thirdidx", "fourthid", "firstidx"])

    // A read holds Fourth's whole change and Third's title; the others' moves stay.
    const read = [
      { ...third, title: { en: "Third, renamed", cy: "" } },
      {
        ...fourth,
        title: { en: "Fourth, renamed", cy: "" },
        placement: "later" as const,
      },
      first,
    ]
    const reconciled = reconcileItems(moved, read)
    expect(ids(reconciled)).toEqual(["thirdidx", "firstidx"])

    // A publish of the titles alone lands: the moves, made meanwhile, stay in order.
    const sent: RoadmapChanges = {
      ...moved,
      items: moved.items.map((entry) => ({
        ...entry,
        fields: { title: entry.fields.title },
      })) as RoadmapChanges["items"],
    }
    const settled = settlePublished(moved, sent)
    expect(ids(settled)).toEqual(["thirdidx", "fourthid", "firstidx"])
    expect(settled.items.map(({ fields }) => Object.keys(fields))).toEqual([
      ["placement"],
      ["placement"],
      ["placement"],
    ])
  })

  it("puts an item moved after one edited before it was, and one moved back and out again last", () => {
    const edited = editItem(NO_CHANGES, undefined, second, 1, {
      title: "Edited first",
    })
    const moved = editItem(edited, undefined, first, 0, { placement: "later" })
    const secondMoved = editItem(moved, entryOf(moved, second), second, 1, {
      placement: "later",
    })
    expect(titles(secondMoved)).toEqual(["First", "Second"])

    const back = editItem(secondMoved, entryOf(secondMoved, first), first, 0, {
      placement: "now",
      title: "Kept",
    })
    expect(titles(back)).toEqual(["First", "Second"])
    const again = editItem(back, entryOf(back, first), first, 0, {
      placement: "later",
    })
    expect(titles(again)).toEqual(["Second", "First"])
  })
})

describe("a choice of organisations (STY-034)", () => {
  const forCardiff = createTestRoadmapItem("For Cardiff", {
    id: "cardiffx",
    organisationIds: ["cavuhb"],
    unknownOrganisationCodes: ["CAVHB"],
  })

  it("shows the chosen set, whose unknown codes go once published (S2, S4)", () => {
    const chosen = editItem(NO_CHANGES, undefined, forCardiff, 0, {
      organisationIds: "cavuhb,sbuhb",
    })

    expect(chosen.items[0]?.fields).toEqual({
      organisationIds: { base: "cavuhb", value: "cavuhb,sbuhb" },
    })
    expect(applyItemChanges(forCardiff, chosen.items[0])).toEqual({
      ...forCardiff,
      organisationIds: ["cavuhb", "sbuhb"],
      unknownOrganisationCodes: [],
    })
    expect(
      changedParts(chosen).flatMap((part) =>
        part.kind === "item" ? part.fields : [],
      ),
    ).toEqual(["organisationIds"])
  })

  it("is no change once the set is ticked back, and none chosen is a change (S3)", () => {
    const chosen = editItem(NO_CHANGES, undefined, forCardiff, 0, {
      organisationIds: "cavuhb,sbuhb",
    })

    expect(
      editItem(chosen, chosen.items[0], forCardiff, 0, {
        organisationIds: "cavuhb",
      }),
    ).toEqual(NO_CHANGES)
    expect(
      editItem(NO_CHANGES, undefined, forCardiff, 0, { organisationIds: "" })
        .items[0]?.fields,
    ).toEqual({ organisationIds: { base: "cavuhb", value: "" } })
  })

  it("is dropped by a read that finds a co-lead made the same choice, in any order (S8)", () => {
    const chosen = editItem(NO_CHANGES, undefined, forCardiff, 0, {
      organisationIds: "cavuhb,sbuhb",
      title: "For Cardiff and Swansea",
    })
    const theirs = {
      ...forCardiff,
      organisationIds: ["sbuhb", "cavuhb"],
      unknownOrganisationCodes: [],
    }

    expect(reconcileItems(chosen, [theirs]).items).toEqual([
      {
        item: theirs,
        position: 0,
        fields: {
          title: { base: "For Cardiff", value: "For Cardiff and Swansea" },
        },
      },
    ])
  })

  it("keeps an edit made while a choice was published, whatever order the read gives the set in", () => {
    const loaded = { ...forCardiff, id: null, unknownOrganisationCodes: [] }
    const chosen = editItem(NO_CHANGES, undefined, loaded, 0, {
      organisationIds: "phw,sbuhb",
    })
    const [sent] = chosen.items
    const meanwhile = editItem(chosen, sent, loaded, 0, { title: "Renamed" })
    const published = settlePublished(meanwhile, chosen)
    // As the Google adapter reads it: the list's order, with the ID the publish wrote.
    const read = {
      ...loaded,
      id: "newidxxx",
      organisationIds: ["sbuhb", "phw"],
    }

    expect(matchItemChanges([read], published).size).toBe(1)
    const [kept] = reconcileItems(published, [read]).items
    expect(kept?.item.id).toBe("newidxxx")
    expect(kept?.fields).toEqual({
      title: { base: "For Cardiff", value: "Renamed" },
    })
  })
})

describe("a change of tags (STY-037)", () => {
  const tagged = (...tags: string[]) => tags.map((en) => ({ en, cy: "" }))
  const booking = createTestRoadmapItem("Online booking", {
    id: "bookingx",
    tags: tagged("Patients", "Video consultations"),
  })
  const BASE = "Patients, Video consultations"

  it("shows the pending tags in order, in English alone, among the changed fields (S2, S6)", () => {
    const retagged = editItem(NO_CHANGES, undefined, booking, 0, {
      tags: "Patients, Video appointments, Carers",
    })

    expect(retagged.items[0]?.fields).toEqual({
      tags: { base: BASE, value: "Patients, Video appointments, Carers" },
    })
    expect(applyItemChanges(booking, retagged.items[0])).toEqual({
      ...booking,
      tags: tagged("Patients", "Video appointments", "Carers"),
    })
    expect(
      changedParts(retagged).flatMap((part) =>
        part.kind === "item" ? part.fields : [],
      ),
    ).toEqual(["tags"])
  })

  it("is no change once the tags are as they were, and no tags is a change (S5, S9)", () => {
    const retagged = editItem(NO_CHANGES, undefined, booking, 0, {
      tags: "Patients",
    })

    expect(
      editItem(retagged, retagged.items[0], booking, 0, { tags: BASE }),
    ).toEqual(NO_CHANGES)
    const none = editItem(NO_CHANGES, undefined, booking, 0, { tags: "" })
    expect(none.items[0]?.fields).toEqual({ tags: { base: BASE, value: "" } })
    expect(applyItemChanges(booking, none.items[0]).tags).toEqual([])
  })

  it("is dropped by a read that finds a co-lead wrote the same tags in the same order, and kept for another order (S13)", () => {
    const retagged = editItem(NO_CHANGES, undefined, booking, 0, {
      tags: "Patients, Carers",
      title: "Booking online",
    })
    const same = { ...booking, tags: tagged("Patients", "Carers") }
    const reordered = { ...booking, tags: tagged("Carers", "Patients") }

    expect(reconcileItems(retagged, [same]).items).toEqual([
      {
        item: same,
        position: 0,
        fields: { title: { base: "Online booking", value: "Booking online" } },
      },
    ])
    expect(reconcileItems(retagged, [reordered])).toBe(retagged)
  })

  it("takes the read's Welsh tags with the tags a read already holds", () => {
    const retagged = editItem(NO_CHANGES, undefined, booking, 0, {
      tags: "Patients",
      title: "Booking online",
    })
    const theirs = {
      ...booking,
      tags: [{ en: "Patients", cy: "Cleifion" }],
      hasWelshTags: true,
    }

    expect(reconcileItems(retagged, [theirs]).items[0]?.item).toEqual(theirs)
  })
})

describe("a change of details (STY-039)", () => {
  const detailed = (...lines: [string, number][]) =>
    lines.map(([en, level]) => ({ text: { en, cy: "" }, level }))
  const video = createTestRoadmapItem("Video appointments", {
    id: "videoxxx",
    details: detailed(["Follow-up appointments", 0], ["Dermatology", 1]),
  })
  const BASE = "Follow-up appointments\n- Dermatology"
  const MINE = "Follow-up appointments\n- Dermatology\n-- Adult clinics first"

  it("shows the pending details in order, each at its level, in English alone, among the changed fields (S2, S3)", () => {
    const changed = editItem(NO_CHANGES, undefined, video, 0, { details: MINE })

    expect(changed.items[0]?.fields).toEqual({
      details: { base: BASE, value: MINE },
    })
    expect(applyItemChanges(video, changed.items[0])).toEqual({
      ...video,
      details: detailed(
        ["Follow-up appointments", 0],
        ["Dermatology", 1],
        ["Adult clinics first", 2],
      ),
    })
    expect(
      changedParts(changed).flatMap((part) =>
        part.kind === "item" ? part.fields : [],
      ),
    ).toEqual(["details"])
  })

  it("is no change once the details are as they were, and no details is a change (S6, S11)", () => {
    const changed = editItem(NO_CHANGES, undefined, video, 0, { details: MINE })

    expect(
      editItem(changed, changed.items[0], video, 0, { details: BASE }),
    ).toEqual(NO_CHANGES)
    const none = editItem(NO_CHANGES, undefined, video, 0, { details: "" })
    expect(none.items[0]?.fields).toEqual({
      details: { base: BASE, value: "" },
    })
    expect(applyItemChanges(video, none.items[0]).details).toEqual([])
  })

  it("is no change for details written another way that show as the same list (S20)", () => {
    const written = {
      ...video,
      details: detailed(["One", 1], ["Two", 3], ["-5 degrees", 1]),
    }

    expect(
      editItem(NO_CHANGES, undefined, written, 0, {
        details: "One\n- Two\n5 degrees",
      }),
    ).toEqual(NO_CHANGES)
  })

  it("is dropped by a read that finds a co-lead wrote the same list, however its hyphens, and kept for another (S15)", () => {
    const changed = editItem(NO_CHANGES, undefined, video, 0, {
      details: MINE,
      title: "Video calls",
    })
    const same = {
      ...video,
      details: detailed(
        ["Follow-up appointments", 1],
        ["Dermatology", 2],
        ["Adult clinics first", 3],
      ),
    }
    const other = {
      ...video,
      details: detailed(["Follow-up appointments", 0], ["Diabetes", 1]),
    }

    expect(reconcileItems(changed, [same]).items).toEqual([
      {
        item: same,
        position: 0,
        fields: {
          title: { base: "Video appointments", value: "Video calls" },
        },
      },
    ])
    expect(reconcileItems(changed, [other])).toBe(changed)
  })

  it("takes the read's Welsh details with the details a read already holds", () => {
    const changed = editItem(NO_CHANGES, undefined, video, 0, {
      details: "Follow-up appointments",
      title: "Video calls",
    })
    const theirs = {
      ...video,
      details: [
        {
          text: { en: "Follow-up appointments", cy: "Apwyntiadau dilynol" },
          level: 0,
        },
      ],
      hasWelshDetails: true,
    }

    expect(reconcileItems(changed, [theirs]).items[0]?.item).toEqual(theirs)
  })
})

describe("an item without an ID, found by the details it shows (STY-039 S15)", () => {
  /** Details of the levels given, each named for its place. */
  const detailed = (...levels: number[]) =>
    levels.map((level, index) => ({
      text: { en: `Detail ${String(index + 1)}`, cy: "" },
      level,
    }))
  const PENDING = "Detail 1\n- Detail 2\n-- Detail 3\n-- Detail 4"
  const welsh = detailed(0, 1).map((detail) => ({
    ...detail,
    text: { ...detail.text, cy: "Cymraeg" },
  }))

  it.each<
    [
      row: string,
      held: number[],
      edit: ItemValues,
      read: Partial<RoadmapItem>,
      found: boolean,
    ]
  >([
    [
      "is found in a row showing the same list with a hyphen on every line, whatever else is pending",
      [0, 1],
      { title: "Video calls" },
      { details: detailed(1, 2) },
      true,
    ],
    [
      "is found in a row showing the same list with a hyphen on every line, with a pending change of its details",
      [0, 1],
      { details: "Detail 1\n- Detail 2\nDetail 3" },
      { details: detailed(1, 2) },
      true,
    ],
    [
      "is found in a row showing the same list, written with other hyphens, below the third level",
      [0, 1, 2, 3],
      { phase: "Beta" },
      { details: detailed(1, 2, 3, 4) },
      true,
    ],
    [
      "is found in a row holding the pending details, however their hyphens are written",
      [0, 1],
      { details: PENDING },
      { details: detailed(0, 1, 2, 2) },
      true,
    ],
    [
      "is found in a row holding the pending details with a hyphen on every line",
      [0, 1],
      { details: PENDING },
      { details: detailed(1, 2, 3, 3) },
      true,
    ],
    [
      "is not found once its details read as another list",
      [0, 1],
      { title: "Video calls" },
      {
        details: detailed(0, 1).map((detail, index) =>
          index === 1 ? { ...detail, text: { en: "Other", cy: "" } } : detail,
        ),
      },
      false,
    ],
    [
      "is not found once its details gain Welsh",
      [0, 1],
      { title: "Video calls" },
      { details: welsh, hasWelshDetails: true },
      false,
    ],
    [
      "is not found in a row whose fourth level a co-lead moved to the third, though the field would show both alike",
      [0, 1, 2, 3],
      { phase: "Beta" },
      { details: detailed(0, 1, 2, 2) },
      false,
    ],
    [
      "is not found once a detail's text reads otherwise, a hyphen after its nesting included",
      [0, 1, 2, 3],
      { phase: "Beta" },
      {
        details: detailed(0, 1, 2, 3).map((detail, index) =>
          index === 3
            ? { ...detail, text: { en: "-Detail 4", cy: "" } }
            : detail,
        ),
      },
      false,
    ],
    [
      "is not found in a row that shows a fourth level, though the field would show it as the pending list",
      [0, 1],
      { details: PENDING },
      { details: detailed(0, 1, 2, 3) },
      false,
    ],
  ])("%s", (_, held, edit, read, found) => {
    const loaded = createTestRoadmapItem("Legacy", {
      details: detailed(...held),
    })
    const changes = editItem(NO_CHANGES, undefined, loaded, 1, edit)

    const matched = matchItemChanges([first, { ...loaded, ...read }], changes)

    expect(matched.size).toBe(found ? 1 : 0)
    expect(matched.get(1)).toBe(found ? changes.items[0] : undefined)
  })
})

describe("a new item (STY-045)", () => {
  const clinic = { title: "Choose a clinic closer to home", placement: "next" }
  const added = addNewItem(
    editItem(NO_CHANGES, undefined, first, 0, { phase: "Beta" }),
    clinic,
    [first, second],
  )
  const [newItem] = added.newItems
  if (newItem === undefined) throw new Error("The new item is pending")

  it("is one pending change, beside the fields edited (S1)", () => {
    expect(countChanges(added)).toBe(2)
    expect(countChanges(addNewItem(NO_CHANGES, clinic, []))).toBe(1)
  })

  it("stays pending over a read that doesn't hold it (S4)", () => {
    expect(reconcileItems(added, [first, second])).toBe(added)
  })

  it("is dropped by a read that holds an item with its ID, whatever a co-lead made of it since, the edits kept (S4)", () => {
    const landed = createTestRoadmapItem("Renamed by a co-lead", {
      id: newItem.id,
      placement: "later",
    })

    const reconciled = reconcileItems(added, [first, second, landed])

    expect(reconciled.newItems).toEqual([])
    expect(reconciled.items).toBe(added.items)
  })

  it("is no longer pending once the publish it was sent in lands, and one added since is (S4)", () => {
    const since = addNewItem(
      added,
      { title: "Text reminders", placement: "later" },
      [first, second],
    )

    const settled = settlePublished(since, added)

    expect(settled.newItems).toEqual(since.newItems.slice(1))
    expect(settled.items).toEqual([])
  })

  it("shows as the item it will read as once published: its English alone, placed, with its ID (STY-046 S3)", () => {
    expect(shownNewItem(NEW_CLINIC)).toEqual(
      createTestRoadmapItem("Choose a clinic closer to home", {
        id: NEW_CLINIC.id,
        placement: "next",
      }),
    )
    const [letters] = addNewItem(
      NO_CHANGES,
      {
        title: "Letters by email",
        description: "Read your letters online.\nNo post.",
        expectedOutcome: "Fewer lost letters",
        phase: "Discovery",
        placement: "delivered-this-year",
        tags: "Patients, Carers",
        organisationIds: "national,sbuhb",
        details: "Appointment letters\n- Outpatients\n-- Adult clinics first",
      },
      [],
    ).newItems
    if (letters === undefined) throw new Error("The new item is pending")

    expect(shownNewItem(letters)).toEqual(
      createTestRoadmapItem("Letters by email", {
        id: letters.id,
        placement: "delivered-this-year",
        description: { en: "Read your letters online.\nNo post.", cy: "" },
        expectedOutcome: { en: "Fewer lost letters", cy: "" },
        phase: { en: "Discovery", cy: "" },
        tags: [
          { en: "Patients", cy: "" },
          { en: "Carers", cy: "" },
        ],
        organisationIds: ["national", "sbuhb"],
        details: [
          { text: { en: "Appointment letters", cy: "" }, level: 0 },
          { text: { en: "Outpatients", cy: "" }, level: 1 },
          { text: { en: "Adult clinics first", cy: "" }, level: 2 },
        ],
      }),
    )
  })

  it("is an item the public would see, so publishing with one never leaves them nothing (STY-046 S10)", () => {
    const unplaced = createTestRoadmapItem("Unplaced", {
      placement: null,
      writtenHorizon: "Soon",
    })

    expect(publishesNoItems([], addingItems(NEW_CLINIC))).toBe(false)
    expect(publishesNoItems([unplaced], addingItems(NEW_CLINIC))).toBe(false)
    // One a read already holds is that item: it counts as the read has it.
    expect(
      publishesNoItems(
        [{ ...unplaced, id: NEW_CLINIC.id }],
        addingItems(NEW_CLINIC),
      ),
    ).toBe(true)
  })
})

describe("a removed item (STY-070)", () => {
  const edited = editItem(NO_CHANGES, undefined, first, 0, { phase: "Beta" })
  const removed = removeItem(removeItem(edited, first, 0), second, 1)

  it("is one pending change, its item's edits beneath it none (STY-049 D5)", () => {
    expect(countChanges(edited)).toBe(1)
    expect(countChanges(removeItem(edited, first, 0))).toBe(1)
    expect(countChanges(removed)).toBe(2)
  })

  it("is no longer pending once the publish it was sent in lands, with the edits beneath it, and one removed since is (S1)", () => {
    const sent = removeItem(edited, first, 0)
    const since = editItem(removed, undefined, second, 1, { phase: "Live" })

    const settled = settlePublished(since, sent)

    expect(settled.removals).toEqual([{ item: second, position: 1 }])
    expect(settled.items.map(({ item }) => item)).toEqual([second])
  })

  it("is no longer pending over a read that no longer holds its ID, while one without an ID follows its item (S5)", () => {
    const secondRead = { ...second, id: "secondid" }

    const reconciled = reconcileItems(removed, [
      createTestRoadmapItem("Other"),
      secondRead,
    ])

    expect(reconciled.removals).toEqual([{ item: secondRead, position: 1 }])
    // S5: the edits beneath the removal of an item gone go with it.
    expect(reconciled.items).toEqual([])
    expect(reconcileItems(removed, [first, secondRead]).removals).toEqual([
      { item: first, position: 0 },
      { item: secondRead, position: 1 },
    ])
  })
  it("is listed as removed at its item's place, as read, its edits beneath it not listed (STY-049 S3, S5)", () => {
    const changes = editItem(
      removeItem(edited, second, 1),
      undefined,
      second,
      1,
      { title: "Two" },
    )

    expect(changedParts(removeItem(changes, first, 0))).toEqual([
      { kind: "removal", position: 0, item: first },
      { kind: "removal", position: 1, item: second },
    ])
    expect(changedParts(edited)).toEqual([
      {
        kind: "item",
        position: 0,
        item: { ...first, phase: { en: "Beta", cy: "" } },
        fields: ["phase"],
      },
    ])
  })

  it("counts an item without an ID that is no longer where it was read as no removed item's (STY-049 S4)", () => {
    const fax = createTestRoadmapItem("Fax")
    const inserted = createTestRoadmapItem("Inserted")

    expect(publishesNoItems([fax], removeItem(NO_CHANGES, fax, 0))).toBe(true)
    expect(
      publishesNoItems([inserted, fax], removeItem(NO_CHANGES, fax, 1)),
    ).toBe(false)
    expect(publishesNoItems([inserted], removeItem(NO_CHANGES, fax, 0))).toBe(
      false,
    )
  })

  it("leaves the public site no items once every placed item is removed (STY-049 S4)", () => {
    const unplaced = createTestRoadmapItem("Unplaced", {
      placement: null,
      writtenHorizon: "Soon",
    })
    const read = [first, unplaced]

    expect(publishesNoItems(read, removeItem(NO_CHANGES, first, 0))).toBe(true)
    expect(publishesNoItems(read, edited)).toBe(false)
    // An edit beneath a removal places nothing.
    const placed = editItem(NO_CHANGES, undefined, unplaced, 0, {
      placement: "now",
    })
    expect(publishesNoItems([unplaced], placed)).toBe(false)
    expect(publishesNoItems([unplaced], removeItem(placed, unplaced, 0))).toBe(
      true,
    )
  })
})
