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

  it("finds an item without an ID whose choice a lost publish already wrote", () => {
    const loaded = { ...forCardiff, id: null }
    const chosen = editItem(NO_CHANGES, undefined, loaded, 1, {
      organisationIds: "national",
    })
    const written = {
      ...loaded,
      organisationIds: ["national"],
      unknownOrganisationCodes: [],
    }

    expect(matchItemChanges([first, written], chosen).get(1)).toBe(
      chosen.items[0],
    )
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

  it("finds an item without an ID whose tags a lost publish already wrote", () => {
    const loaded = { ...booking, id: null }
    const retagged = editItem(NO_CHANGES, undefined, loaded, 1, {
      tags: "Carers",
    })
    const written = { ...loaded, tags: tagged("Carers") }

    expect(matchItemChanges([first, written], retagged).get(1)).toBe(
      retagged.items[0],
    )
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

  it("finds an item without an ID whose details a lost publish already wrote", () => {
    const loaded = { ...video, id: null }
    const changed = editItem(NO_CHANGES, undefined, loaded, 1, {
      details: "In person",
    })
    const written = { ...loaded, details: detailed(["In person", 0]) }

    expect(matchItemChanges([first, written], changed).get(1)).toBe(
      changed.items[0],
    )
  })
})

describe("an item without an ID whose details a co-lead wrote another way (STY-039 S15)", () => {
  const detailed = (...lines: [string, number][]) =>
    lines.map(([en, level]) => ({ text: { en, cy: "" }, level }))
  const loaded = createTestRoadmapItem("Video appointments", {
    details: detailed(["One", 0], ["Two", 1]),
  })
  // The same list, a hyphen on every line.
  const rewritten = { ...loaded, details: detailed(["One", 1], ["Two", 2]) }

  it("is still found, with a pending change of its details or of another field", () => {
    const redetailed = editItem(NO_CHANGES, undefined, loaded, 1, {
      details: "One\n- Two\nThree",
    })
    const retitled = editItem(NO_CHANGES, undefined, loaded, 1, {
      title: "Video calls",
    })

    expect(matchItemChanges([first, rewritten], redetailed).get(1)).toBe(
      redetailed.items[0],
    )
    expect(matchItemChanges([first, rewritten], retitled).get(1)).toBe(
      retitled.items[0],
    )
  })

  it("is not found once its details read as another list, or gain Welsh", () => {
    const retitled = editItem(NO_CHANGES, undefined, loaded, 1, {
      title: "Video calls",
    })
    const other = { ...loaded, details: detailed(["One", 0], ["Other", 1]) }
    const welsh = {
      ...loaded,
      details: [
        { text: { en: "One", cy: "Un" }, level: 0 },
        { text: { en: "Two", cy: "Dau" }, level: 1 },
      ],
      hasWelshDetails: true,
    }

    expect(matchItemChanges([first, other], retitled).size).toBe(0)
    expect(matchItemChanges([first, welsh], retitled).size).toBe(0)
  })
})
