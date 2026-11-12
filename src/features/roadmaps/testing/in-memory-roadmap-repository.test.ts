import { describe, expect, it } from "vitest"

import { describeRoadmapRepositoryContract } from "@/domain/roadmap/testing/roadmap-repository-contract"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { AppError } from "@/lib/errors"

import { createInMemoryRoadmapRepository } from "./in-memory-roadmap-repository"

describeRoadmapRepositoryContract("createInMemoryRoadmapRepository", {
  withRoadmaps: (
    roadmaps,
    items = {},
    { write, unreadableItems = [], families, categories } = {},
  ) =>
    createInMemoryRoadmapRepository(
      roadmaps,
      {
        ...items,
        ...Object.fromEntries(
          unreadableItems.map((id) => [id, new AppError("invalid-data")]),
        ),
      },
      { write, families, categories },
    ),
  failing: () => createInMemoryRoadmapRepository(new AppError("network")),
})

describe("createInMemoryRoadmapRepository", () => {
  it("fails one roadmap's items with the AppError given for it", async () => {
    const failure = new AppError("invalid-data")
    const repository = createInMemoryRoadmapRepository(
      [
        createTestRoadmap("producta", "Product A"),
        createTestRoadmap("productb", "Product B"),
      ],
      { producta: failure },
    )

    await expect(repository.listRoadmapItems("producta")).rejects.toBe(failure)
    await expect(repository.listRoadmapItems("productb")).resolves.toEqual([])
  })
})
