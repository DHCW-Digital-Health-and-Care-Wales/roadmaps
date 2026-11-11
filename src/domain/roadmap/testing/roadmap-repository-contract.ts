import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import type { Roadmap } from "../roadmap"
import type { RoadmapItem } from "../roadmap-item"
import type { RoadmapRepository } from "../roadmap-repository"
import { createTestRoadmap } from "./test-roadmap"
import { createTestRoadmapItem } from "./test-roadmap-item"

/** Each roadmap's items by roadmap id; a roadmap with no entry has none. */
export type RoadmapItemsById = Readonly<Record<string, readonly RoadmapItem[]>>

export interface RoadmapRepositoryContractSetup {
  /**
   * Returns a repository whose data source holds exactly these roadmaps, in this order.
   * Ids are URL-safe slugs (lower-case letters and digits, joined by single hyphens),
   * which every adapter can store and give back unchanged. `items` gives roadmaps their
   * items, in order.
   */
  withRoadmaps(
    roadmaps: readonly Roadmap[],
    items?: RoadmapItemsById,
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
  })
}
