import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import type { Roadmap } from "../roadmap"
import type { RoadmapRepository } from "../roadmap-repository"

export interface RoadmapRepositoryContractSetup {
  /**
   * Returns a repository whose data source holds exactly these visible roadmaps, in this
   * order. Fixture ids are numeric strings so any data source can represent them.
   */
  withRoadmaps(roadmaps: readonly Roadmap[]): RoadmapRepository
  /** Returns a repository whose data source fails on every request. */
  failing(): RoadmapRepository
}

const fixtures: readonly Roadmap[] = [
  { id: "7", name: "Platform" },
  { id: "0", name: "Template" },
  { id: "1234567", name: "Mobile app — 2027" },
]

/**
 * Behaviour every `RoadmapRepository` adapter must share (ADR-0002). Call it from the
 * adapter's test file with a setup that seeds that adapter's data source.
 */
export function describeRoadmapRepositoryContract(
  adapterName: string,
  setup: RoadmapRepositoryContractSetup,
): void {
  describe(`${adapterName} satisfies the RoadmapRepository contract`, () => {
    it("lists every roadmap as plain { id, name } data in data-source order", async () => {
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
