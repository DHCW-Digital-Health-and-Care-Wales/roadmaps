import { describe, expect, it } from "vitest"

import { planRoadmapPublish } from "@/domain/roadmap/publish-plan"
import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
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
  NO_CHANGES,
  reconcileItems,
  reconcileRoadmap,
  settlePublished,
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
})
