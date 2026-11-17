import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import type { Category } from "../category"
import type { Family } from "../family"
import type { FamilyEdit } from "../family-changes"
import type { Roadmap } from "../roadmap"
import {
  type FieldChange,
  type ItemChanges,
  markedUpdated,
  NO_CHANGES,
  type RoadmapChanges,
} from "../roadmap-changes"
import type { RoadmapItem } from "../roadmap-item"
import type { RoadmapRepository } from "../roadmap-repository"
import { CO_LEAD_VALUE, type ContractWrite } from "./contract-write"
import { categoriesOf, familiesOf } from "./linked-lists"
import { describeMovedItems } from "./moved-item-contract"
import { describeNewItems } from "./new-item-contract"
import { describeNewRoadmap } from "./new-roadmap-contract"
import { describePublishedState } from "./published-state-contract"
import { createTestRoadmap, inStep } from "./test-roadmap"
import { createTestRoadmapItem } from "./test-roadmap-item"

/** Each roadmap's items by roadmap id; a roadmap with no entry has none. */
export type RoadmapItemsById = Readonly<Record<string, readonly RoadmapItem[]>>

export interface ContractOptions {
  /** Defaults to writes that succeed. */
  write?: ContractWrite | undefined
  /** Roadmaps whose items cannot be read: their tab is missing or invalid. */
  unreadableItems?: readonly string[] | undefined
  /** Defaults to the families the roadmaps are linked to; `null`: no family list. */
  families?: readonly Family[] | null | undefined
  /** Defaults to the categories the roadmaps are linked to; `null`: no category list. */
  categories?: readonly Category[] | null | undefined
  /**
   * More rows of the roadmap index, after the roadmaps', each with a roadmap's id: a
   * draft, or a co-lead's copy. The list keeps one roadmap per id, the first published,
   * else the first (ADR-009).
   */
  twins?: readonly Roadmap[] | undefined
  /**
   * What would fail the public site's nightly sync were the roadmap published, by
   * roadmap id (STY-035 S4); a missing tab is `unreadableItems`. A `short-colour`
   * roadmap's colour is one a three-digit colour expands to, such as `#aabbcc`.
   */
  syncFaults?: Readonly<Record<string, readonly SyncFault[]>> | undefined
  /**
   * The data source has nothing usable to start a roadmap from, so adding one rejects
   * with `invalid-data` (STY-040 S6); by default a roadmap can be added.
   */
  noStartingPoint?: boolean | undefined
  /**
   * Names the data source keeps something else under, which no roadmap's short name
   * may take, in any letter case (STY-040 S4).
   */
  otherNames?: readonly string[] | undefined
}

/** A mistake in the data source the public site's nightly sync fails on (STY-035). */
export type SyncFault = "short-colour" | "no-title-column" | "no-horizon-column"

export interface RoadmapRepositoryContractSetup {
  /**
   * Returns a repository whose data source holds exactly these roadmaps, in this order.
   * Ids are URL-safe slugs (lower-case letters and digits, joined by single hyphens),
   * which every adapter can store and give back unchanged. `items` gives roadmaps their
   * items, in order; items may repeat an ID, as copied rows do. Publishing changes what
   * the repository later reads. A roadmap linked to a family or category is in step
   * with it: `familiesOf` and `categoriesOf` give the lists, unless `options` does.
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
    category: {
      en: "GP & Community Services",
      cy: "Meddygon Teulu a Gwasanaethau Cymunedol",
    },
    categoryId: "khzpchkh",
    family: { en: "Single Record", cy: "" },
    familyId: "fc29g5b9",
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
    familyId: "vdkxj63m",
    colour: "#006747",
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
      hasWelshTags: true,
      organisationIds: ["national", "cavuhb", "sbuhb"],
      details: [
        { text: { en: "First", cy: "Cyntaf" }, level: 0 },
        { text: { en: "Nested", cy: "Nythu" }, level: 1 },
        { text: { en: "Deeper", cy: "Dyfnach" }, level: 2 },
      ],
      hasWelshDetails: true,
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
  return { ...NO_CHANGES, roadmap }
}

/** A roadmap fixture with these fields changed. */
function productA(overrides: Partial<Roadmap>): Roadmap[] {
  const [first, ...rest] = fixtures
  return first ? [inStep({ ...first, ...overrides }), ...rest] : []
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

    it("lists the families and categories as plain data in data-source order", async () => {
      const families: Family[] = [
        {
          id: "vdkxj63m",
          name: { en: "Medicines", cy: "" },
          colour: "#006747",
        },
        {
          id: "fc29g5b9",
          name: { en: "Single Record", cy: "Cofnod Sengl" },
          colour: "#12a3c9",
        },
      ]
      const categories: Category[] = [
        {
          id: "khzpchkh",
          name: { en: "GP & Community Services", cy: "Meddygon Teulu" },
        },
      ]
      const repository = setup.withRoadmaps([], {}, { families, categories })

      expect(await repository.listFamilies()).toStrictEqual(families)
      expect(await repository.listCategories()).toStrictEqual(categories)
      expect(await setup.withRoadmaps(fixtures).listFamilies()).toStrictEqual(
        familiesOf(fixtures),
      )
    })

    it("lists no families or categories when the data source has no lists", async () => {
      const ownCells = createTestRoadmap("producta", "Product A roadmap", {
        family: { en: "Single record", cy: "" },
        colour: "#325083",
      })
      const repository = setup.withRoadmaps(
        [ownCells],
        {},
        {
          families: null,
          categories: null,
        },
      )

      expect(await repository.listFamilies()).toBeNull()
      expect(await repository.listCategories()).toBeNull()
      expect(await repository.listRoadmaps()).toStrictEqual([ownCells])
    })

    it("returns new lists on every call", async () => {
      const repository = setup.withRoadmaps(fixtures)

      const families = await repository.listFamilies()
      families?.pop()
      const categories = await repository.listCategories()
      categories?.pop()

      expect(await repository.listFamilies()).toStrictEqual(
        familiesOf(fixtures),
      )
      expect(await repository.listCategories()).toStrictEqual(
        categoriesOf(fixtures),
      )
    })

    it("rejects lists with an AppError when the data source fails, or with the abort reason", async () => {
      const failing = setup.failing()
      for (const read of [failing.listFamilies(), failing.listCategories()]) {
        expect(isAppError(await read.catch((reason: unknown) => reason))).toBe(
          true,
        )
      }
      const reason = new DOMException("Cancelled by test", "AbortError")
      const signal = AbortSignal.abort(reason)
      const repository = setup.withRoadmaps(fixtures)
      await expect(repository.listFamilies({ signal })).rejects.toBe(reason)
      await expect(repository.listCategories({ signal })).rejects.toBe(reason)
    })

    it("lists the organisations as plain data, each with its id, code, names and whether it is national (S2)", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)

      const organisations = await repository.listOrganisations()

      expect(organisations.length).toBeGreaterThan(0)
      expect(new Set(organisations.map(({ id }) => id)).size).toBe(
        organisations.length,
      )
      for (const organisation of organisations) {
        expect(organisation).toStrictEqual({
          id: expect.stringMatching(/^[a-z0-9]+$/) as unknown,
          code: expect.stringMatching(/\S/) as unknown,
          shortName: expect.stringMatching(/\S/) as unknown,
          name: {
            en: expect.stringMatching(/\S/) as unknown,
            cy: expect.any(String) as unknown,
          },
          national: expect.any(Boolean) as unknown,
        })
      }
      expect(organisations.filter(({ national }) => national)).toHaveLength(1)
      // A new array each call, so a screen can't change the list by sorting it.
      organisations.pop()
      expect(await repository.listOrganisations()).toHaveLength(
        organisations.length + 1,
      )
    })

    it("names, for every item, only organisations the list holds (S3)", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)

      const listed = new Set(
        (await repository.listOrganisations()).map(({ id }) => id),
      )
      const items = await repository.listRoadmapItems("producta")

      expect(items[0]?.organisationIds).toEqual(
        expect.arrayContaining(["national", "cavuhb", "sbuhb"]),
      )
      for (const { organisationIds } of items) {
        for (const id of organisationIds) expect(listed).toContain(id)
      }
    })

    it("rejects the organisation list with the abort reason when the signal is already aborted", async () => {
      const reason = new DOMException("Cancelled by test", "AbortError")

      await expect(
        setup
          .withRoadmaps(fixtures)
          .listOrganisations({ signal: AbortSignal.abort(reason) }),
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
    describeMovedItems(setup)
    describeNewItems(setup)
    describeNewRoadmap(setup)
    describeFamilyChanges(setup)
    describeListMatch(setup)
    describePublishedState(setup)
  })
}

/** ADR-012's publish: what is written, what is refused, and when the write fails. */
function describePublishing(setup: RoadmapRepositoryContractSetup): void {
  describe("publishing a roadmap's changes", () => {
    it("writes the changed English only, keeping Welsh and every other field (S1)", async () => {
      const repository = setup.withRoadmaps(fixtures, itemFixtures)

      const outcome = await repository.publishRoadmapChanges("producta", {
        ...NO_CHANGES,
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
        ...NO_CHANGES,
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
        ...NO_CHANGES,
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
        ...NO_CHANGES,
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
        ...NO_CHANGES,
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
        ...NO_CHANGES,
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
        ...NO_CHANGES,
        items: [edit(laterWork, 1, { phase: change("", "Alpha") })],
      })

      expect(outcome).toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        everyField,
        written,
      ])
    })

    it("refuses an item at its position whose Welsh differs, though its English is the pending edit (S5)", async () => {
      const other = {
        ...laterWork,
        title: { en: "Renamed", cy: "Rhywbeth arall" },
      }
      const repository = setup.withRoadmaps(fixtures, {
        producta: [everyField, other],
      })
      const changes = edit(laterWork, 1, {
        title: change("Later work", "Renamed"),
      })

      const outcome = await repository.publishRoadmapChanges("producta", {
        ...NO_CHANGES,
        items: [changes],
      })

      expect(outcome).toEqual({
        status: "refused",
        conflicts: [],
        missingItems: [changes],
      })
    })

    it("treats a repeated publish that clears translated English as published (S5, S12)", async () => {
      const translated = {
        ...laterWork,
        description: { en: "Before", cy: "Cyn" },
      }
      const repository = setup.withRoadmaps(fixtures, {
        producta: [everyField, translated],
      })
      const clear = {
        ...NO_CHANGES,
        items: [edit(translated, 1, { description: change("Before", "") })],
      }
      await repository.publishRoadmapChanges("producta", clear)
      const [, cleared] = await repository.listRoadmapItems("producta")

      const outcome = await repository.publishRoadmapChanges("producta", clear)

      expect(outcome).toEqual({ status: "published" })
      expect(cleared).toMatchObject({
        title: laterWork.title,
        description: null,
      })
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
        ...NO_CHANGES,
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
        ...NO_CHANGES,
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

    describe("Last updated (STY-036)", () => {
      it.each([
        ["sets", "2026-11-10", "2026-11-10"],
        ["clears", "", null],
      ] as const)(
        "%s the date, keeping every other field (S2, S5)",
        async (_case, value, read) => {
          const repository = setup.withRoadmaps(fixtures, itemFixtures)

          await expect(
            repository.publishRoadmapChanges("producta", {
              ...NO_CHANGES,
              roadmap: { lastUpdated: change("2026-10-01", value) },
            }),
          ).resolves.toEqual({ status: "published" })
          expect(await repository.listRoadmaps()).toStrictEqual(
            productA({ lastUpdated: read }),
          )
        },
      )

      it("refuses a date a co-lead changed, writing nothing (S9)", async () => {
        const roadmaps = productA({ lastUpdated: "2026-11-01" })
        const repository = setup.withRoadmaps(roadmaps, itemFixtures)

        await expect(
          repository.publishRoadmapChanges("producta", {
            ...NO_CHANGES,
            roadmap: { lastUpdated: change("2026-10-01", "2026-11-10") },
          }),
        ).resolves.toEqual({
          status: "refused",
          conflicts: [
            {
              subject: "roadmap",
              field: "lastUpdated",
              base: "2026-10-01",
              pending: "2026-11-10",
              current: "2026-11-01",
            },
          ],
          missingItems: [],
        })
        expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
      })

      it("writes today's date, ticked, over a co-lead's, beside the other edits (S6, S9)", async () => {
        const repository = setup.withRoadmaps(
          productA({ lastUpdated: "2026-11-01" }),
          itemFixtures,
        )

        await expect(
          repository.publishRoadmapChanges(
            "producta",
            markedUpdated(
              {
                ...NO_CHANGES,
                roadmap: { statusLabel: change("Beta", "Live") },
              },
              "2026-11-13",
            ),
          ),
        ).resolves.toEqual({ status: "published" })
        expect(await repository.listRoadmaps()).toStrictEqual(
          productA({
            statusLabel: { en: "Live", cy: "" },
            lastUpdated: "2026-11-13",
          }),
        )
      })
    })

    describe("a placement (STY-031)", () => {
      it("moves an item by its placement alone when it is already last there (S6; STY-051 S5)", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures)

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [
            edit(laterWork, 1, {
              placement: change("later", "recently-delivered"),
            }),
          ],
        })

        expect(outcome).toEqual({ status: "published" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          everyField,
          {
            ...laterWork,
            id: expect.stringMatching(NEW_ID) as string,
            placement: "recently-delivered",
          },
          { ...unplacedWork, id: expect.stringMatching(NEW_ID) as string },
        ])
      })

      it("places an unplaced item, so it no longer has a horizon as written (S4)", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures)

        await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [edit(unplacedWork, 2, { placement: change("", "later") })],
        })

        const items = await repository.listRoadmapItems("producta")
        expect(items[2]).toStrictEqual({
          ...unplacedWork,
          id: expect.stringMatching(NEW_ID) as string,
          placement: "later",
          writtenHorizon: null,
        })
      })

      it("refuses a co-lead's other move, writing nothing (S8)", async () => {
        const movedElsewhere = { ...everyField, placement: "next" } as const
        const repository = setup.withRoadmaps(fixtures, {
          producta: [movedElsewhere],
        })
        const move = edit(everyField, 0, {
          placement: change("recently-delivered", "now"),
        })

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [move],
        })

        expect(outcome).toEqual({
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: move,
              field: "placement",
              base: "recently-delivered",
              pending: "now",
              current: "next",
            },
          ],
          missingItems: [],
        })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          movedElsewhere,
        ])
      })

      it("moves an item over a co-lead's change to another field, keeping it (S8)", async () => {
        const described = {
          ...everyField,
          expectedOutcome: { en: "Theirs", cy: "" },
        }
        const repository = setup.withRoadmaps(fixtures, {
          producta: [described],
        })

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [
            edit(everyField, 0, {
              placement: change("recently-delivered", "now"),
            }),
          ],
        })

        expect(outcome).toEqual({ status: "published" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          { ...described, placement: "now" },
        ])
      })
    })

    describe("organisations (STY-034)", () => {
      const forCardiff = {
        ...laterWork,
        id: "cardiffx",
        organisationIds: ["cavuhb"],
        unknownOrganisationCodes: ["CAVHB"],
      }
      /** An item's organisations as a set, whatever order the read gives them in. */
      const organisationsOf = async (repository: RoadmapRepository) =>
        (await repository.listRoadmapItems("producta")).map((item) => ({
          ids: [...item.organisationIds].sort(),
          unknown: item.unknownOrganisationCodes,
        }))

      it("writes a chosen set, known codes only, so an unknown code goes (S4, S5)", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [forCardiff],
        })

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [
            edit(forCardiff, 0, {
              organisationIds: change("cavuhb", "national,sbuhb"),
            }),
          ],
        })

        expect(outcome).toEqual({ status: "published" })
        expect(await organisationsOf(repository)).toEqual([
          { ids: ["national", "sbuhb"], unknown: [] },
        ])
      })

      it("writes none chosen as no organisations (S5)", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [forCardiff],
        })

        await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [
            edit(forCardiff, 0, { organisationIds: change("cavuhb", "") }),
          ],
        })

        expect(await organisationsOf(repository)).toEqual([
          { ids: [], unknown: [] },
        ])
      })

      it("keeps an unknown code when the item's other fields are published (S4)", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [forCardiff],
        })

        await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [edit(forCardiff, 0, { phase: change("", "Beta") })],
        })

        expect(await organisationsOf(repository)).toEqual([
          { ids: ["cavuhb"], unknown: ["CAVHB"] },
        ])
      })

      const choice = edit(forCardiff, 0, {
        organisationIds: change("cavuhb", "cavuhb,sbuhb"),
      })

      it("refuses a co-lead's other set, writing nothing (S7)", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [{ ...forCardiff, organisationIds: ["pthb"] }],
        })

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [choice],
        })

        expect(outcome).toEqual({
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: choice,
              field: "organisationIds",
              base: "cavuhb",
              pending: "cavuhb,sbuhb",
              current: "pthb",
            },
          ],
          missingItems: [],
        })
        expect(await organisationsOf(repository)).toEqual([
          { ids: ["pthb"], unknown: ["CAVHB"] },
        ])
      })

      it("takes a co-lead's same set, in another order, as published (S7)", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [{ ...forCardiff, organisationIds: ["sbuhb", "cavuhb"] }],
        })

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [choice],
        })

        expect(outcome).toEqual({ status: "published" })
        expect(await organisationsOf(repository)).toEqual([
          { ids: ["cavuhb", "sbuhb"], unknown: ["CAVHB"] },
        ])
      })

      it("rejects an organisation the list doesn't hold, writing nothing", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [forCardiff],
        })

        const publishing = repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [
            edit(forCardiff, 0, {
              organisationIds: change("cavuhb", "cavuhb,cavhb"),
            }),
          ],
        })

        await expect(publishing).rejects.toMatchObject({ kind: "unknown" })
        expect(await organisationsOf(repository)).toEqual([
          { ids: ["cavuhb"], unknown: ["CAVHB"] },
        ])
      })
    })

    describe("tags (STY-037)", () => {
      const tagged = (...tags: string[]) => tags.map((en) => ({ en, cy: "" }))
      const booking = {
        ...laterWork,
        id: "bookingx",
        tags: tagged("Patients", "Video consultations"),
      }
      const BASE = "Patients, Video consultations"
      const retag = (value: string) =>
        edit(booking, 0, { tags: change(BASE, value) })
      const tagsOf = async (repository: RoadmapRepository) =>
        (await repository.listRoadmapItems("producta")).map(
          ({ tags, hasWelshTags }) => ({ tags, hasWelshTags }),
        )

      it("writes the tags in order, in English alone, keeping the item's other fields (S12)", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [booking, everyField],
        })

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [retag("Patients, Video appointments, Carers")],
        })

        expect(outcome).toEqual({ status: "published" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          {
            ...booking,
            tags: tagged("Patients", "Video appointments", "Carers"),
          },
          everyField,
        ])
      })

      it("writes no tags as none (S12)", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [booking],
        })

        await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [retag("")],
        })

        expect(await tagsOf(repository)).toEqual([
          { tags: [], hasWelshTags: false },
        ])
      })

      it("refuses a co-lead's other tags, or other order, writing nothing (S13)", async () => {
        const reordered = tagged("Video consultations", "Patients")
        const repository = setup.withRoadmaps(fixtures, {
          producta: [{ ...booking, tags: reordered }],
        })
        const mine = retag("Patients, Carers")

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [mine],
        })

        expect(outcome).toEqual({
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: mine,
              field: "tags",
              base: BASE,
              pending: "Patients, Carers",
              current: "Video consultations, Patients",
            },
          ],
          missingItems: [],
        })
        expect(await tagsOf(repository)).toEqual([
          { tags: reordered, hasWelshTags: false },
        ])
      })

      it("takes a co-lead's same tags, in the same order, as published (S13)", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [{ ...booking, tags: tagged("Patients", "Carers") }],
        })

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [retag("Patients, Carers")],
        })

        expect(outcome).toEqual({ status: "published" })
      })

      it("says an item has Welsh tags even when none pairs with the English (S20)", async () => {
        const unpaired = { ...booking, hasWelshTags: true }
        const repository = setup.withRoadmaps(fixtures, {
          producta: [unpaired],
        })

        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          unpaired,
        ])
      })

      it("refuses tags for an item that has gained Welsh ones, writing nothing, though its English is as it was (S22)", async () => {
        const withWelsh = {
          ...booking,
          tags: [
            { en: "Patients", cy: "Cleifion" },
            { en: "Video consultations", cy: "Ymgynghoriadau fideo" },
          ],
          hasWelshTags: true,
        }
        const repository = setup.withRoadmaps(fixtures, {
          producta: [withWelsh],
        })
        const mine = retag("Patients, Carers")

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [mine],
        })

        expect(outcome).toEqual({
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: mine,
              field: "tags",
              base: BASE,
              pending: "Patients, Carers",
              current: BASE,
              gainedWelsh: true,
            },
          ],
          missingItems: [],
        })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          withWelsh,
        ])
      })

      it("publishes the other fields of an item with Welsh tags, leaving its tags as they are (S20)", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures)

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [edit(everyField, 0, { phase: change("Beta", "Live") })],
        })

        expect(outcome).toEqual({ status: "published" })
        const [published] = await repository.listRoadmapItems("producta")
        expect(published).toMatchObject({
          phase: { en: "Live", cy: "Beta" },
          tags: everyField.tags,
          hasWelshTags: true,
        })
      })
    })

    describe("details (STY-039)", () => {
      const detailed = (...lines: [string, number][]) =>
        lines.map(([en, level]) => ({ text: { en, cy: "" }, level }))
      const video = {
        ...laterWork,
        id: "videoxxx",
        details: detailed(["Follow-up appointments", 0], ["Dermatology", 1]),
      }
      const BASE = "Follow-up appointments\n- Dermatology"
      const MINE =
        "Follow-up appointments\n- Dermatology\n-- Adult clinics first\nIn person"
      const redetail = (value: string) =>
        edit(video, 0, { details: change(BASE, value) })
      const detailsOf = async (repository: RoadmapRepository) =>
        (await repository.listRoadmapItems("producta")).map(
          ({ details, hasWelshDetails }) => ({ details, hasWelshDetails }),
        )

      it("writes the details in order, each at its level, in English alone, keeping the item's other fields (S14)", async () => {
        const repository = setup.withRoadmaps(fixtures, {
          producta: [video, everyField],
        })

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [redetail(MINE)],
        })

        expect(outcome).toEqual({ status: "published" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          {
            ...video,
            details: detailed(
              ["Follow-up appointments", 0],
              ["Dermatology", 1],
              ["Adult clinics first", 2],
              ["In person", 0],
            ),
          },
          everyField,
        ])
      })

      it("writes no details as none (S14)", async () => {
        const repository = setup.withRoadmaps(fixtures, { producta: [video] })

        await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [redetail("")],
        })

        expect(await detailsOf(repository)).toEqual([
          { details: [], hasWelshDetails: false },
        ])
      })

      it("refuses a co-lead's other details, writing nothing (S15)", async () => {
        const theirs = detailed(["Follow-up appointments", 0], ["Diabetes", 1])
        const repository = setup.withRoadmaps(fixtures, {
          producta: [{ ...video, details: theirs }],
        })
        const mine = redetail(MINE)

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [mine],
        })

        expect(outcome).toEqual({
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: mine,
              field: "details",
              base: BASE,
              pending: MINE,
              current: "Follow-up appointments\n- Diabetes",
            },
          ],
          missingItems: [],
        })
        expect(await detailsOf(repository)).toEqual([
          { details: theirs, hasWelshDetails: false },
        ])
      })

      it("takes a co-lead's details that show as the same list as published, leaving them as written (S15, S20)", async () => {
        // Every line a hyphen deeper than the editor writes it.
        const theirs = detailed(
          ["Follow-up appointments", 1],
          ["Dermatology", 2],
          ["Adult clinics first", 3],
          ["In person", 1],
        )
        const repository = setup.withRoadmaps(fixtures, {
          producta: [{ ...video, details: theirs }],
        })

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [redetail(MINE)],
        })

        expect(outcome).toEqual({ status: "published" })
        expect(await detailsOf(repository)).toEqual([
          { details: theirs, hasWelshDetails: false },
        ])
      })

      it("says an item has Welsh details even when none pairs with the English (S18)", async () => {
        const unpaired = { ...video, hasWelshDetails: true }
        const repository = setup.withRoadmaps(fixtures, {
          producta: [unpaired],
        })

        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          unpaired,
        ])
      })

      it("refuses details for an item that has gained Welsh ones, writing nothing, though its English is as it was (S19)", async () => {
        const withWelsh = {
          ...video,
          details: [
            {
              text: { en: "Follow-up appointments", cy: "Apwyntiadau dilynol" },
              level: 0,
            },
            { text: { en: "Dermatology", cy: "Dermatoleg" }, level: 1 },
          ],
          hasWelshDetails: true,
        }
        const repository = setup.withRoadmaps(fixtures, {
          producta: [withWelsh],
        })
        const mine = redetail(MINE)

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [mine],
        })

        expect(outcome).toEqual({
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: mine,
              field: "details",
              base: BASE,
              pending: MINE,
              current: BASE,
              gainedWelsh: true,
            },
          ],
          missingItems: [],
        })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          withWelsh,
        ])
      })

      it("publishes the other fields of an item with Welsh details, leaving its details as they are (S18)", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures)

        const outcome = await repository.publishRoadmapChanges("producta", {
          ...NO_CHANGES,
          items: [edit(everyField, 0, { phase: change("Beta", "Live") })],
        })

        expect(outcome).toEqual({ status: "published" })
        const [published] = await repository.listRoadmapItems("producta")
        expect(published).toMatchObject({
          phase: { en: "Live", cy: "Beta" },
          details: everyField.details,
          hasWelshDetails: true,
        })
      })
    })

    describe("a family or category (STY-028)", () => {
      const medicines = {
        family: {
          en: "Medicines & Diagnostics",
          cy: "Meddyginiaethau a Diagnosteg",
        },
        familyId: "vdkxj63m",
        colour: "#006747",
      }

      it("copies a chosen family's names and colour from its list, and blanks no category (S2, S3)", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures)

        const outcome = await repository.publishRoadmapChanges(
          "producta",
          roadmapOnly({
            familyId: change("fc29g5b9", "vdkxj63m"),
            categoryId: change("khzpchkh", ""),
          }),
        )

        expect(outcome).toEqual({ status: "published" })
        expect(await repository.listRoadmaps()).toStrictEqual(
          productA({ ...medicines, category: null, categoryId: null }),
        )
      })

      it("leaves the colour for no family (S2)", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures)

        await repository.publishRoadmapChanges(
          "producta",
          roadmapOnly({ familyId: change("fc29g5b9", "") }),
        )

        expect(await repository.listRoadmaps()).toStrictEqual(
          productA({ family: null, familyId: null }),
        )
      })

      it("refuses a family a co-lead moved, by its ID, writing nothing (S5)", async () => {
        const roadmaps = productA(medicines)
        const repository = setup.withRoadmaps(roadmaps, itemFixtures)

        const outcome = await repository.publishRoadmapChanges(
          "producta",
          roadmapOnly({ familyId: change("fc29g5b9", "") }),
        )

        expect(outcome).toEqual({
          status: "refused",
          conflicts: [
            {
              subject: "roadmap",
              field: "familyId",
              base: "fc29g5b9",
              pending: "",
              current: "vdkxj63m",
            },
          ],
          missingItems: [],
        })
        expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
      })

      it.each([
        ["family", { families: null }, { familyId: change("fc29g5b9", "") }],
        [
          "category",
          { categories: null },
          { categoryId: change("khzpchkh", "") },
        ],
      ] as const)(
        "rejects with invalid-data, writing nothing, for no %s while its list is missing",
        async (_, options, roadmap) => {
          const repository = setup.withRoadmaps(fixtures, itemFixtures, options)
          const before = await repository.listRoadmaps()

          await expect(
            repository.publishRoadmapChanges("producta", roadmapOnly(roadmap)),
          ).rejects.toMatchObject({ kind: "invalid-data" })
          expect(await repository.listRoadmaps()).toStrictEqual(before)
        },
      )

      it("rejects with invalid-data, writing nothing, for a choice no longer listed", async () => {
        const repository = setup.withRoadmaps(fixtures, itemFixtures)

        await expect(
          repository.publishRoadmapChanges(
            "producta",
            roadmapOnly({
              statusLabel: change("Beta", "Live"),
              categoryId: change("khzpchkh", "gone0000"),
            }),
          ),
        ).rejects.toMatchObject({ kind: "invalid-data" })
        expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
      })
    })

    it("refuses an edited item that is no longer there (S9)", async () => {
      const repository = setup.withRoadmaps(fixtures, {
        producta: [laterWork],
      })
      const gone = edit(everyField, 0, { phase: change("Beta", "Live") })

      const outcome = await repository.publishRoadmapChanges("producta", {
        ...NO_CHANGES,
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
        ...NO_CHANGES,
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
        ...NO_CHANGES,
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

function describeFamilyChanges(setup: RoadmapRepositoryContractSetup): void {
  const [singleRecord, medicines] = familiesOf(fixtures)
  if (singleRecord === undefined || medicines === undefined) {
    throw new Error("The fixtures need two families")
  }
  const productB = fixtures[1]
  if (productB === undefined) throw new Error("The fixtures need Product B")
  const recolour = (overrides: Partial<FamilyEdit> = {}): FamilyEdit => ({
    family: medicines,
    changes: { colour: "#00796b" },
    members: ["product-b-2027"],
    ...overrides,
  })

  describe("adding a family (STY-029)", () => {
    it("adds it to the end of the list with a new ID and no Welsh name (S2)", async () => {
      const repository = setup.withRoadmaps(fixtures)

      const outcome = await repository.addFamily({
        name: "Screening",
        colour: "#00796b",
      })

      const added = {
        id: expect.stringMatching(NEW_ID) as string,
        name: { en: "Screening", cy: "" },
        colour: "#00796b",
      }
      expect(outcome).toEqual({ status: "saved", family: added })
      expect(await repository.listFamilies()).toEqual([
        singleRecord,
        medicines,
        added,
      ])
      expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
    })

    it("refuses a name another family has, folded, writing nothing (S6)", async () => {
      const repository = setup.withRoadmaps(fixtures)

      await expect(
        repository.addFamily({ name: "single-record", colour: "#00796b" }),
      ).resolves.toEqual({ status: "name-taken" })
      expect(await repository.listFamilies()).toStrictEqual([
        singleRecord,
        medicines,
      ])
    })
  })

  describe("changing a family (STY-029)", () => {
    it("renames and recolours it and every roadmap in it, keeping Welsh (S3, S9)", async () => {
      const repository = setup.withRoadmaps(fixtures)
      const changed = {
        ...medicines,
        name: { en: "Medicines", cy: medicines.name.cy },
        colour: "#00796b",
      }

      const outcome = await repository.changeFamily(
        recolour({ changes: { name: "Medicines", colour: "#00796b" } }),
      )

      expect(outcome).toEqual({ status: "saved", family: changed })
      expect(await repository.listFamilies()).toStrictEqual([
        singleRecord,
        changed,
      ])
      expect(await repository.listRoadmaps()).toStrictEqual([
        fixtures[0],
        inStep({ ...productB, family: changed.name, colour: "#00796b" }),
        fixtures[2],
      ])
    })

    it("changes a family no roadmap is in, alone", async () => {
      const roadmaps = productA({ family: null, familyId: null })
      const repository = setup.withRoadmaps(
        roadmaps,
        {},
        {
          families: [singleRecord, medicines],
        },
      )

      await expect(
        repository.changeFamily({
          family: singleRecord,
          changes: { name: "Shared Care Record" },
          members: [],
        }),
      ).resolves.toMatchObject({ status: "saved" })
      expect(await repository.listFamilies()).toStrictEqual([
        { ...singleRecord, name: { en: "Shared Care Record", cy: "" } },
        medicines,
      ])
      expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
    })

    it("refuses a field a co-lead changed, writing nothing (S5)", async () => {
      const repository = setup.withRoadmaps(fixtures)
      const loaded = { ...medicines, colour: "#ff0000" }

      await expect(
        repository.changeFamily(recolour({ family: loaded })),
      ).resolves.toEqual({
        status: "refused",
        conflicts: [
          {
            field: "colour",
            base: "#ff0000",
            pending: "#00796b",
            current: "#006747",
          },
        ],
      })
      expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
    })

    it("gives the roadmaps in it now when they are not those confirmed, writing nothing (S8)", async () => {
      const repository = setup.withRoadmaps(fixtures)

      await expect(
        repository.changeFamily(recolour({ members: ["producta"] })),
      ).resolves.toEqual({ status: "members-changed", members: [productB] })
      expect(await repository.listFamilies()).toStrictEqual([
        singleRecord,
        medicines,
      ])
    })

    it("refuses a name another family has, folded, writing nothing (S6)", async () => {
      const repository = setup.withRoadmaps(fixtures)

      await expect(
        repository.changeFamily(
          recolour({ changes: { name: "SINGLE RECORD" } }),
        ),
      ).resolves.toEqual({ status: "name-taken" })
      expect(await repository.listRoadmaps()).toStrictEqual(fixtures)
    })

    it("says a family no longer listed is not found", async () => {
      const repository = setup.withRoadmaps(
        fixtures,
        {},
        {
          families: [singleRecord],
        },
      )

      await expect(repository.changeFamily(recolour())).resolves.toEqual({
        status: "family-not-found",
      })
    })
  })

  describe("adding or changing a family", () => {
    const calls = [
      [
        "adding",
        (repository: RoadmapRepository, signal?: AbortSignal) =>
          repository.addFamily(
            { name: "Screening", colour: "#00796b" },
            { signal },
          ),
      ],
      [
        "changing",
        (repository: RoadmapRepository, signal?: AbortSignal) =>
          repository.changeFamily(recolour(), { signal }),
      ],
    ] as const

    it.each(calls)(
      "rejects %s with invalid-data while the list is missing (S7)",
      async (_, call) => {
        const repository = setup.withRoadmaps(fixtures, {}, { families: null })
        const before = await repository.listRoadmaps()

        await expect(call(repository)).rejects.toMatchObject({
          kind: "invalid-data",
        })
        expect(await repository.listRoadmaps()).toStrictEqual(before)
      },
    )

    it.each(calls)(
      "rejects %s with a forbidden AppError when the write is refused, writing nothing",
      async (_, call) => {
        const repository = setup.withRoadmaps(
          fixtures,
          {},
          {
            write: { fails: "forbidden" },
          },
        )

        await expect(call(repository)).rejects.toMatchObject({
          kind: "forbidden",
        })
        expect(await repository.listFamilies()).toStrictEqual([
          singleRecord,
          medicines,
        ])
      },
    )

    it.each(calls)(
      "rejects %s with the abort reason when the signal is already aborted",
      async (_, call) => {
        const repository = setup.withRoadmaps(fixtures)
        const reason = new DOMException("Cancelled by test", "AbortError")

        await expect(call(repository, AbortSignal.abort(reason))).rejects.toBe(
          reason,
        )
        expect(await repository.listFamilies()).toStrictEqual([
          singleRecord,
          medicines,
        ])
      },
    )

    it.each(calls)(
      "saves %s whose answer is lost when a re-read finds it",
      async (_, call) => {
        const repository = setup.withRoadmaps(
          fixtures,
          {},
          {
            write: { lost: "applied" },
          },
        )

        await expect(call(repository)).resolves.toMatchObject({
          status: "saved",
        })
      },
    )

    it.each(calls)(
      "rejects %s whose answer is lost with a network AppError when a re-read finds none",
      async (_, call) => {
        const repository = setup.withRoadmaps(
          fixtures,
          {},
          {
            write: { lost: "not-applied" },
          },
        )

        await expect(call(repository)).rejects.toMatchObject({
          kind: "network",
        })
        expect(await repository.listFamilies()).toStrictEqual([
          singleRecord,
          medicines,
        ])
      },
    )

    it.each(calls)(
      "is unconfirmed when %s's answer is lost and the re-read fails (DEF-015)",
      async (_, call) => {
        const repository = setup.withRoadmaps(
          fixtures,
          {},
          {
            write: { lost: "reread-fails" },
          },
        )

        await expect(call(repository)).resolves.toEqual({
          status: "unconfirmed",
        })
      },
    )
  })
}

function describeListMatch(setup: RoadmapRepositoryContractSetup): void {
  // In step, as every fixture is: a row out of step is built by each adapter's own tests.
  const inStep = createTestRoadmap("producta", "Product A roadmap", {
    family: { en: "Single Record", cy: "" },
    familyId: "fc29g5b9",
    colour: "#12a3c9",
    category: { en: "GP & Community Services", cy: "" },
    categoryId: "khzpchkh",
  })
  const other = createTestRoadmap("product-b-2027", "Product B", {
    family: { en: "Medicines & Diagnostics", cy: "" },
    familyId: "vdkxj63m",
    colour: "#006747",
  })
  const roadmaps = [inStep, other]
  const loaded = { ...inStep, colour: "#325083", outOfStep: true }

  describe("making a roadmap match its lists (STY-030)", () => {
    it("writes nothing when the roadmap is already in step, or changed since it loaded (S4)", async () => {
      const repository = setup.withRoadmaps(roadmaps)

      await expect(repository.matchRoadmapToLists(loaded)).resolves.toEqual({
        status: "changed",
        roadmap: inStep,
      })
      expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
    })

    it("says so when the roadmap is no longer listed", async () => {
      const repository = setup.withRoadmaps([other])

      await expect(repository.matchRoadmapToLists(loaded)).resolves.toEqual({
        status: "roadmap-not-found",
      })
    })

    it("fails with invalid-data when the family list is gone", async () => {
      const repository = setup.withRoadmaps(roadmaps, {}, { families: null })

      await expect(
        repository.matchRoadmapToLists(loaded),
      ).rejects.toMatchObject({ kind: "invalid-data" })
    })
  })
}
