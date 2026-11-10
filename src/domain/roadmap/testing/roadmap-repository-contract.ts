import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import type { Roadmap } from "../roadmap"
import type { RoadmapRepository } from "../roadmap-repository"
import { createTestRoadmap } from "./test-roadmap"

export interface RoadmapRepositoryContractSetup {
  /**
   * Returns a repository whose data source holds exactly these roadmaps, in this order.
   * Ids are URL-safe slugs (lower-case letters and digits, joined by single hyphens),
   * which every adapter can store and give back unchanged.
   */
  withRoadmaps(roadmaps: readonly Roadmap[]): RoadmapRepository
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
  })
}
