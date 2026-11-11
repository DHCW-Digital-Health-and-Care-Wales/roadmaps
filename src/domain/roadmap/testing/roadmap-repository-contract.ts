import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import type { Roadmap } from "../roadmap"
import type {
  FieldChange,
  ItemChanges,
  RoadmapChanges,
} from "../roadmap-changes"
import type { RoadmapItem } from "../roadmap-item"
import type { RoadmapRepository } from "../roadmap-repository"
import { createTestRoadmap } from "./test-roadmap"
import { createTestRoadmapItem } from "./test-roadmap-item"

/** Each roadmap's items by roadmap id; a roadmap with no entry has none. */
export type RoadmapItemsById = Readonly<Record<string, readonly RoadmapItem[]>>

/**
 * How a publish's write goes in the data source: it fails with an `AppError` of this
 * kind, writing nothing, or its answer is lost (a network failure) after it was applied,
 * not applied, applied and then partly overwritten by a co-lead (the first value it
 * wrote, roadmap text before items', becomes `CO_LEAD_VALUE`), or applied with every
 * read after it failing.
 */
export type ContractWrite =
  | { fails: "forbidden" | "unauthenticated" }
  | { lost: "applied" | "not-applied" | "partly-applied" | "reread-fails" }

/** What a co-lead writes over the first value of a `partly-applied` write. */
export const CO_LEAD_VALUE = "Changed by a co-lead"

export interface ContractOptions {
  /** Defaults to writes that succeed. */
  write?: ContractWrite | undefined
  /** Roadmaps whose items cannot be read: their tab is missing or invalid. */
  unreadableItems?: readonly string[] | undefined
}

export interface RoadmapRepositoryContractSetup {
  /**
   * Returns a repository whose data source holds exactly these roadmaps, in this order.
   * Ids are URL-safe slugs (lower-case letters and digits, joined by single hyphens),
   * which every adapter can store and give back unchanged. `items` gives roadmaps their
   * items, in order; items may repeat an ID, as copied rows do. Publishing changes what
   * the repository later reads.
   */
  withRoadmaps(
    roadmaps: readonly Roadmap[],
    items?: RoadmapItemsById,
    options?: ContractOptions,
  ): RoadmapRepository
  /** Returns a repository whose data source fails on every request. */
  failing(): RoadmapRepository
}

const fixtures: readonly Roadmap[] = [
  createTestRoadmap("producta", "Product A roadmap", {
    category: "gp-community-services",
    family: { en: "Single Record", cy: "" },
    statusLabel: { en: "Beta", cy: "" },
    productLead: "Alex Jones, Sam Evans",
    lastUpdated: "2026-10-01",
    colour: "#325083",
    vision: { en: "Where Product A is heading.\nAnd why.", cy: "" },
    serviceDescription: { en: "What Product A does.", cy: "" },
  }),
  createTestRoadmap("product-b-2027", "Product B — 2027", {
    title: { en: "Product B — 2027", cy: "Cynnyrch B — 2027" },
    family: {
      en: "Medicines & Diagnostics",
      cy: "Meddyginiaethau a Diagnosteg",
    },
  }),
  createTestRoadmap("0", "Template", { published: false }),
]

const itemFixtures = {
  producta: [
    {
      ...createTestRoadmapItem("Every field"),
      id: "k7q2xw",
      title: { en: "Every field", cy: "Pob maes" },
      placement: "recently-delivered",
      description: { en: "What it is.\nIn two lines.", cy: "Beth ydyw." },
      expectedOutcome: { en: "What changes.", cy: "" },
      phase: { en: "Beta", cy: "Beta" },
      tags: [
        { en: "Service X", cy: "Gwasanaeth X" },
        { en: "Service Y", cy: "Gwasanaeth Y" },
      ],
      organisations: ["national", "cavuhb", "sbuhb"],
      details: [
        { text: { en: "First", cy: "Cyntaf" }, level: 0 },
        { text: { en: "Nested", cy: "Nythu" }, level: 1 },
        { text: { en: "Deeper", cy: "Dyfnach" }, level: 2 },
      ],
    },
    createTestRoadmapItem("Later work", { placement: "later" }),
    createTestRoadmapItem("Unplaced work", {
      placement: null,
      writtenHorizon: "Soon",
    }),
  ],
  "0": [createTestRoadmapItem("Template work", { placement: "not-doing" })],
} as const satisfies RoadmapItemsById

/** The form of an ID the repository gives an item (ADR-012). */
const NEW_ID = /^[bcdfghjkmnpqrstvwxz][bcdfghjkmnpqrstvwxz2-9]{7}$/

const [everyField, laterWork, unplacedWork] = itemFixtures.producta

const change = (base: string, value: string): FieldChange => ({ base, value })

function edit(
  item: RoadmapItem,
  position: number,
  fields: ItemChanges["fields"],
): ItemChanges {
  return { item, position, fields }
}

/** Only the roadmap's own text changes. */
function roadmapOnly(roadmap: RoadmapChanges["roadmap"]): RoadmapChanges {
  return { roadmap, items: [] }
}

/** A roadmap fixture with these fields changed. */
function productA(overrides: Partial<Roadmap>): Roadmap[] {
  const [first, ...rest] = fixtures
  return first ? [{ ...first, ...overrides }, ...rest] : []
}

/**
 * Behaviour every `RoadmapRepository` adapter must share (ADR-002). Call it from the
 * adapter's test file with a setup that seeds that adapter's data source.
 */
export function describeRoadmapRepositoryContract(
  adapterName: string,
  setup: RoadmapRepositoryContractSetup,
): void {
  describe(`${adapterName} satisfies the RoadmapRepository contract`, () => {
    it("lists every roadmap as plain data in data-source order", async () => {
      const roadmaps = await setup.withRoadmaps(fixtures).listRoadmaps()

      expect(roadmaps).toStrictEqual(fixtures)
    })

    it("lists nothing when the data source has no roadmaps", async () => {
      await expect(setup.withRoadmaps([]).listRoadmaps()).resolves.toEqual([])
    })

    it("returns a new array on every call", async () => {
      const repository = setup.withRoadmaps(fixtures)

      const first = await repository.listRoadmaps()
      first.pop()

      expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
    })

    it("rejects with an AppError when the data source fails", async () => {
      const error: unknown = await setup
        .failing()
        .listRoadmaps()
        .catch((reason: unknown) => reason)

      expect(isAppError(error)).toBe(true)
    })

    it("rejects with the abort reason when the signal is already aborted", async () => {
      const reason = new DOMException("Cancelled by test", "AbortError")

      await expect(
        setup
          .withRoadmaps(fixtures)
          .listRoadmaps({ signal: AbortSignal.abort(reason) }),
      ).rejects.toBe(reason)
    })

    it("lists a roadmap's items as plain data in data-source order", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)

      expect(await repository.listRoadmapItems("producta")).toStrictEqual(
        itemFixtures.producta,
      )
      expect(await repository.listRoadmapItems("0")).toStrictEqual(
        itemFixtures["0"],
      )
    })

    it("lists no items for a roadmap that has none", async () => {
      await expect(
        setup
          .withRoadmaps(fixtures, itemFixtures)
          .listRoadmapItems("product-b-2027"),
      ).resolves.toEqual([])
    })

    it("returns new items on every call", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)

      const first = await repository.listRoadmapItems("producta")
      first.pop()

      expect(await repository.listRoadmapItems("producta")).toStrictEqual(
        itemFixtures.producta,
      )
    })

    it("rejects with a not-found AppError, not retryable, for an unknown id", async () => {
      await expect(
        setup.withRoadmaps(fixtures, itemFixtures).listRoadmapItems("unknown"),
      ).rejects.toMatchObject({ kind: "not-found", retryable: false })
    })

    it("rejects items with an AppError when the data source fails", async () => {
      const error: unknown = await setup
        .failing()
        .listRoadmapItems("producta")
        .catch((reason: unknown) => reason)

      expect(isAppError(error)).toBe(true)
    })

    it("rejects items with the abort reason when the signal is already aborted", async () => {
      const reason = new DOMException("Cancelled by test", "AbortError")

      await expect(
        setup
          .withRoadmaps(fixtures, itemFixtures)
          .listRoadmapItems("producta", { signal: AbortSignal.abort(reason) }),
      ).rejects.toBe(reason)
    })

    describePublishing(setup)
  })
}

/** ADR-012's publish: what is written, what is refused, and when the write fails. */
function describePublishing(setup: RoadmapRepositoryContractSetup): void {
  describe("publishing a roadmap's changes", () => {
    it("writes the changed English only, keeping Welsh and every other field (S1)", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: { statusLabel: change("Beta", "Live") },
        items: [
          edit(everyField, 0, {
            title: change("Every field", "Every field, renamed"),
            phase: change("Beta", "Live"),
          }),
          edit(laterWork, 1, { description: change("", "Now described") }),
        ],
      })

      expect(outcome).toEqual({ status: "published" })
      expect(await repository.listRoadmaps()).toStrictEqual(
        productA({ statusLabel: { en: "Live", cy: "" } }),
      )
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        {
          ...everyField,
          title: { en: "Every field, renamed", cy: "Pob maes" },
          phase: { en: "Live", cy: "Beta" },
        },
        {
          ...laterWork,
          id: expect.stringMatching(NEW_ID) as string,
          description: { en: "Now described", cy: "" },
        },
        { ...unplacedWork, id: expect.stringMatching(NEW_ID) as string },
      ])
      expect(await repository.listRoadmapItems("0")).toStrictEqual(
        itemFixtures["0"],
      )
    })

    it("writes values exactly as typed, trimmed, and clears a field set to blank (S3)", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)

      await repository.publishRoadmapChanges("producta", {
        roadmap: {
          vision: change(
            "Where Product A is heading.\nAnd why.",
            "  Trimmed \n",
          ),
          productLead: change("Alex Jones, Sam Evans", ""),
        },
        items: [
          edit(everyField, 0, {
            description: change("What it is.\nIn two lines.", ""),
          }),
          edit(laterWork, 1, {
            title: change("Later work", "=SUM(A1)"),
            description: change("", "42"),
            expectedOutcome: change("", "1/2"),
            phase: change("", "TRUE"),
          }),
        ],
      })

      expect(await repository.listRoadmaps()).toStrictEqual(
        productA({ vision: { en: "Trimmed", cy: "" }, productLead: null }),
      )
      const [first, second] = await repository.listRoadmapItems("producta")
      expect(first).toStrictEqual({ ...everyField, description: null })
      expect(second).toMatchObject({
        title: { en: "=SUM(A1)" },
        description: { en: "42" },
        expectedOutcome: { en: "1/2" },
        phase: { en: "TRUE" },
      })
    })

    it("finds an item by its ID after its row has moved (S4)", async () => {
      const inserted = createTestRoadmapItem("Inserted by a co-lead")
      const repository = setup.withRoadmaps(fixtures, {
        producta: [inserted, everyField],
      })

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: {},
        items: [edit(everyField, 0, { phase: change("Beta", "Live") })],
      })

      expect(outcome).toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        { ...inserted, id: expect.stringMatching(NEW_ID) as string },
        { ...everyField, phase: { en: "Live", cy: "Beta" } },
      ])
    })

    it("writes to the first row of a copied ID and gives the copy its own (S4, S6)", async () => {
      const repository = setup.withRoadmaps(fixtures, {
        producta: [everyField, everyField],
      })

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: {},
        items: [edit(everyField, 0, { phase: change("Beta", "Live") })],
      })

      expect(outcome).toEqual({ status: "published" })
      const items = await repository.listRoadmapItems("producta")
      expect(items).toStrictEqual([
        { ...everyField, phase: { en: "Live", cy: "Beta" } },
        { ...everyField, id: expect.stringMatching(NEW_ID) as string },
      ])
    })

    it("refuses an item whose copied ID's first row no longer holds what was loaded (S4)", async () => {
      const edited = { ...everyField, expectedOutcome: null }
      const repository = setup.withRoadmaps(fixtures, {
        producta: [edited, everyField],
      })
      const changes = edit(everyField, 0, { phase: change("Beta", "Live") })

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: {},
        items: [changes],
      })

      expect(outcome).toEqual({
        status: "refused",
        conflicts: [],
        missingItems: [changes],
      })
      expect(outcome.status === "refused" && outcome.missingItems[0]).toBe(
        changes,
      )
    })

    it("finds an item without an ID at its position while it holds what was loaded (S5)", async () => {
      const inserted = createTestRoadmapItem("Inserted by a co-lead")
      const repository = setup.withRoadmaps(fixtures, {
        producta: [everyField, inserted, laterWork],
      })
      const moved = edit(laterWork, 1, { phase: change("", "Alpha") })

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: {},
        items: [moved],
      })

      expect(outcome).toEqual({
        status: "refused",
        conflicts: [],
        missingItems: [moved],
      })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        everyField,
        inserted,
        laterWork,
      ])
    })

    it("treats an item already holding the pending values as published (S5, S12)", async () => {
      const written = { ...laterWork, phase: { en: "Alpha", cy: "" } }
      const repository = setup.withRoadmaps(fixtures, {
        producta: [everyField, written],
      })

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: {},
        items: [edit(laterWork, 1, { phase: change("", "Alpha") })],
      })

      expect(outcome).toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        everyField,
        written,
      ])
    })

    it("gives every item without an ID a new one, all different (S6)", async () => {
      const repository = setup.withRoadmaps(fixtures, {
        producta: [laterWork, unplacedWork, laterWork],
      })

      await repository.publishRoadmapChanges(
        "producta",
        roadmapOnly({ statusLabel: change("Beta", "Live") }),
      )

      const ids = (await repository.listRoadmapItems("producta")).map(
        ({ id }) => id,
      )
      expect(ids).toEqual([
        expect.stringMatching(NEW_ID) as string,
        expect.stringMatching(NEW_ID) as string,
        expect.stringMatching(NEW_ID) as string,
      ])
      expect(new Set(ids).size).toBe(3)
    })

    it("refuses a field a co-lead changed, writing nothing (S8)", async () => {
      const coLeadItem = {
        ...everyField,
        expectedOutcome: { en: "Theirs", cy: "" },
      }
      const roadmaps = productA({ statusLabel: { en: "Live", cy: "" } })
      const repository = setup.withRoadmaps(roadmaps, {
        producta: [coLeadItem, laterWork],
      })
      const itemEdit = edit(everyField, 0, {
        title: change("Every field", "Every field, renamed"),
        expectedOutcome: change("What changes.", "Mine"),
      })

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: {
          statusLabel: change("Beta", "Alpha"),
          vision: change("Where Product A is heading.\nAnd why.", "New vision"),
        },
        items: [itemEdit],
      })

      expect(outcome).toEqual({
        status: "refused",
        conflicts: [
          {
            subject: "roadmap",
            field: "statusLabel",
            base: "Beta",
            pending: "Alpha",
            current: "Live",
          },
          {
            subject: "item",
            item: itemEdit,
            field: "expectedOutcome",
            base: "What changes.",
            pending: "Mine",
            current: "Theirs",
          },
        ],
        missingItems: [],
      })
      expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        coLeadItem,
        laterWork,
      ])
    })

    it("publishes a field a co-lead set to the same value, and keeps fields not edited (S8)", async () => {
      const coLeadItem = {
        ...everyField,
        title: { en: "Every field, renamed", cy: "Pob maes" },
        expectedOutcome: { en: "Theirs", cy: "" },
      }
      const repository = setup.withRoadmaps(fixtures, {
        producta: [coLeadItem, laterWork],
      })

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: {},
        items: [
          edit(everyField, 0, {
            title: change("Every field", "Every field, renamed"),
            phase: change("Beta", "Live"),
          }),
        ],
      })

      expect(outcome).toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        { ...coLeadItem, phase: { en: "Live", cy: "Beta" } },
        { ...laterWork, id: expect.stringMatching(NEW_ID) as string },
      ])
    })

    it("refuses an edited item that is no longer there (S9)", async () => {
      const repository = setup.withRoadmaps(fixtures, {
        producta: [laterWork],
      })
      const gone = edit(everyField, 0, { phase: change("Beta", "Live") })

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: { statusLabel: change("Beta", "Live") },
        items: [gone],
      })

      expect(outcome).toEqual({
        status: "refused",
        conflicts: [],
        missingItems: [gone],
      })
      expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        laterWork,
      ])
    })

    it("says a roadmap that is no longer listed is not found (S9)", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)

      await expect(
        repository.publishRoadmapChanges(
          "unknown",
          roadmapOnly({ statusLabel: change("Beta", "Live") }),
        ),
      ).resolves.toEqual({ status: "roadmap-not-found" })
    })

    it("rejects with invalid-data when the roadmap's items cannot be read (S9)", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures, {
        unreadableItems: ["producta"],
      })

      await expect(
        repository.publishRoadmapChanges(
          "producta",
          roadmapOnly({ statusLabel: change("Beta", "Live") }),
        ),
      ).rejects.toMatchObject({ kind: "invalid-data", retryable: false })
      expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
    })

    it("publishes without writing when nothing differs from what was loaded", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)

      const outcome = await repository.publishRoadmapChanges("producta", {
        roadmap: { statusLabel: change("Beta", " Beta ") },
        items: [
          edit(laterWork, 1, { title: change("Later work", "Later work") }),
        ],
      })

      expect(outcome).toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual(
        itemFixtures.producta,
      )
    })

    it.each(["forbidden", "unauthenticated"] as const)(
      "rejects with a %s AppError when the write is refused, writing nothing (S10)",
      async (kind) => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures, {
          write: { fails: kind },
        })

        await expect(
          repository.publishRoadmapChanges(
            "producta",
            roadmapOnly({ statusLabel: change("Beta", "Live") }),
          ),
        ).rejects.toMatchObject({ kind, retryable: false })
        expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
        expect(await repository.listRoadmapItems("producta")).toStrictEqual(
          itemFixtures.producta,
        )
      },
    )

    it("rejects with the abort reason when the signal is already aborted, writing nothing (S10)", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)
      const reason = new DOMException("Cancelled by test", "AbortError")

      await expect(
        repository.publishRoadmapChanges(
          "producta",
          roadmapOnly({ statusLabel: change("Beta", "Live") }),
          { signal: AbortSignal.abort(reason) },
        ),
      ).rejects.toBe(reason)
      expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
    })

    describe("when the write's answer is lost (S12)", () => {
      const changes: RoadmapChanges = {
        roadmap: { statusLabel: change("Beta", "Live") },
        items: [edit(laterWork, 1, { title: change("Later work", "Renamed") })],
      }

      it("is published when a re-read finds every change", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures, {
          write: { lost: "applied" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", changes),
        ).resolves.toEqual({ status: "published" })
        expect(await repository.listRoadmaps()).toStrictEqual(
          productA({ statusLabel: { en: "Live", cy: "" } }),
        )
      })

      it("rejects with a network AppError when a re-read finds none", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures, {
          write: { lost: "not-applied" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", changes),
        ).rejects.toMatchObject({ kind: "network" })
        expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
      })

      it("is unconfirmed when a re-read finds only some", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures, {
          write: { lost: "partly-applied" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", changes),
        ).resolves.toEqual({ status: "unconfirmed" })
        expect(await repository.listRoadmaps()).toStrictEqual(
          productA({ statusLabel: { en: CO_LEAD_VALUE, cy: "" } }),
        )
      })

      it("is unconfirmed when the re-read fails", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures, {
          write: { lost: "reread-fails" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", changes),
        ).resolves.toEqual({ status: "unconfirmed" })
      })
    })
  })
}
