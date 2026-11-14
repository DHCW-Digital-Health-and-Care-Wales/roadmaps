import { describe, expect, it } from "vitest"

import {
  addTags,
  offeredTags,
  renameTag,
  settleTags,
  tagsInUse,
} from "./item-tags"

/** The other items' tags of STY-037 S3: Patients on three, two on two, one on one. */
const OTHERS = [
  ["Patients", "Appointments"],
  ["Patients", "Clinic staff"],
  ["Patients", "Waiting lists", "Appointments"],
  ["Clinic staff"],
  [],
]
const inUse = tagsInUse(OTHERS)

describe("tagsInUse", () => {
  it("counts the items carrying each tag, most used first, then alphabetical (S3)", () => {
    expect(inUse).toEqual([
      { tag: "Patients", count: 3 },
      { tag: "Appointments", count: 2 },
      { tag: "Clinic staff", count: 2 },
      { tag: "Waiting lists", count: 1 },
    ])
  })

  it("takes spellings that differ only in capitals as one tag, in the most used spelling (S21)", () => {
    expect(
      tagsInUse([["patients"], ["Patients"], ["Patients"], ["Carers"]]),
    ).toEqual([
      { tag: "Patients", count: 3 },
      { tag: "Carers", count: 1 },
    ])
  })

  it("takes the first spelling in the roadmap's order when two are used as often (S21)", () => {
    expect(tagsInUse([["clinic staff"], ["Clinic Staff"]])).toEqual([
      { tag: "clinic staff", count: 2 },
    ])
  })

  it("counts an item once for a tag it repeats in other capitals", () => {
    expect(tagsInUse([["Patients", "patients"]])).toEqual([
      { tag: "Patients", count: 1 },
    ])
  })

  it("is nothing for a roadmap whose other items have no tags (S10)", () => {
    expect(tagsInUse([[], []])).toEqual([])
  })
})

describe("offeredTags", () => {
  it("leaves out the tags the item has, whatever their capitals (S3)", () => {
    expect(offeredTags(inUse, ["patients"], "").map(({ tag }) => tag)).toEqual([
      "Appointments",
      "Clinic staff",
      "Waiting lists",
    ])
  })

  it("keeps only the tags holding what is typed, whatever its capitals (S3)", () => {
    expect(offeredTags(inUse, ["Patients"], " WAI ")).toEqual([
      { tag: "Waiting lists", count: 1 },
    ])
    expect(offeredTags(inUse, ["Patients"], "zzz")).toEqual([])
  })

  it("offers every tag in use to an item with none (S10)", () => {
    expect(offeredTags(inUse, [], "")).toEqual(inUse)
  })
})

describe("addTags", () => {
  it("adds a tag at the end (S2)", () => {
    expect(addTags(["Patients"], "Carers", inUse)).toEqual({
      tags: ["Patients", "Carers"],
      added: ["Carers"],
      notes: [],
    })
  })

  it("ends a tag at each comma or line break, trimming each and dropping blanks (S7)", () => {
    expect(
      addTags([], " Carers ,, Clinic  staff\nWaiting lists\r\n", []).tags,
    ).toEqual(["Carers", "Clinic staff", "Waiting lists"])
  })

  it("adds no tag the item has, whatever its capitals, and says which it has (S4)", () => {
    expect(addTags(["Patients"], "patients", [])).toEqual({
      tags: ["Patients"],
      added: [],
      notes: [{ kind: "repeat", typed: "patients", tag: "Patients" }],
    })
    expect(addTags(["Patients"], "Carers, carers", []).tags).toEqual([
      "Patients",
      "Carers",
    ])
  })

  it("adds a typed tag in the spelling the roadmap's other items use, and says so (S21)", () => {
    expect(addTags(["Patients"], "clinic staff", inUse)).toEqual({
      tags: ["Patients", "Clinic staff"],
      added: ["Clinic staff"],
      notes: [{ kind: "respelt", typed: "clinic staff", tag: "Clinic staff" }],
    })
  })

  it("says what was added and what was refused of one list (S11)", () => {
    expect(addTags(["Patients"], "Carers, patients", [])).toEqual({
      tags: ["Patients", "Carers"],
      added: ["Carers"],
      notes: [{ kind: "repeat", typed: "patients", tag: "Patients" }],
    })
  })

  it("adds nothing for blank text", () => {
    expect(addTags(["Patients"], " , ", inUse)).toEqual({
      tags: ["Patients"],
      added: [],
      notes: [],
    })
  })
})

describe("renameTag", () => {
  const tags = ["Patients", "Video consultations"]

  it("renames a tag in its place (S6)", () => {
    expect(renameTag(tags, 1, " Video appointments ", inUse)).toEqual({
      tags: ["Patients", "Video appointments"],
      notes: [],
    })
  })

  it("drops a tag renamed to one the item has, leaving that one once (S6)", () => {
    expect(renameTag(tags, 1, "patients", inUse)).toEqual({
      tags: ["Patients"],
      notes: [
        { kind: "merged", typed: "Video consultations", tag: "Patients" },
      ],
    })
  })

  it("keeps the old name for a blank or unchanged one", () => {
    expect(renameTag(tags, 1, "  ", inUse)).toEqual({ tags, notes: [] })
    expect(renameTag(tags, 1, "Video consultations", inUse)).toEqual({
      tags,
      notes: [],
    })
  })

  it("keeps a name left as it was read, white space and all", () => {
    const spaced = ["Clinic  staff"]

    expect(renameTag(spaced, 0, "Clinic  staff", inUse)).toEqual({
      tags: spaced,
      notes: [],
    })
  })

  it("takes a comma or a line break as a space, so the name stays one tag (S7)", () => {
    expect(renameTag(tags, 1, "Video,calls\nat home", inUse).tags).toEqual([
      "Patients",
      "Video calls at home",
    ])
  })

  it("renames to the roadmap's spelling, and says so (S21)", () => {
    expect(renameTag(tags, 1, "clinic staff", inUse)).toEqual({
      tags: ["Patients", "Clinic staff"],
      notes: [
        { kind: "respeltRename", typed: "clinic staff", tag: "Clinic staff" },
      ],
    })
  })
})

describe("settleTags", () => {
  it("keeps a name still being changed, then adds text typed but not yet added (S8, S15)", () => {
    expect(
      settleTags(
        ["Patients", "Video consultations"],
        {
          adding: "Carers",
          renaming: { index: 1, name: "Video appointments" },
        },
        inUse,
      ),
    ).toEqual({ tags: ["Patients", "Video appointments", "Carers"], notes: [] })
  })

  it("says what was not kept as typed (S4, S21)", () => {
    expect(
      settleTags(
        ["Patients", "Video consultations"],
        { adding: "patients, clinic staff", renaming: null },
        inUse,
      ),
    ).toEqual({
      tags: ["Patients", "Video consultations", "Clinic staff"],
      notes: [
        { kind: "repeat", typed: "patients", tag: "Patients" },
        { kind: "respelt", typed: "clinic staff", tag: "Clinic staff" },
      ],
    })
  })

  it("is the tags themselves with nothing half done", () => {
    const tags = ["Patients"]

    expect(settleTags(tags, { adding: " ", renaming: null }, inUse)).toEqual({
      tags,
      notes: [],
    })
  })
})
