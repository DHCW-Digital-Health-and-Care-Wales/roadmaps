import { describe, expect, it } from "vitest"

import { describeRoadmapRepositoryContract } from "@/domain/roadmap/testing/roadmap-repository-contract"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { AppError } from "@/lib/errors"

import { createInMemoryRoadmapRepository } from "./in-memory-roadmap-repository"

describeRoadmapRepositoryContract("createInMemoryRoadmapRepository", {
  withRoadmaps: (
    roadmaps,
    items = {},
    {
      write,
      unreadableItems = [],
      families,
      categories,
      twins = [],
      syncFaults,
    } = {},
  ) =>
    createInMemoryRoadmapRepository(
      [...roadmaps, ...twins],
      {
        ...items,
        ...Object.fromEntries(
          unreadableItems.map((id) => [id, new AppError("invalid-data")]),
        ),
      },
      { write, families, categories, syncFaults },
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

describe("createInMemoryRoadmapRepository matching a roadmap to its lists (STY-030)", () => {
  const outOfStep = createTestRoadmap("producta", "Product A", {
    family: { en: "Single Record", cy: "" },
    familyId: "fc29g5b9",
    colour: "#12a3c9",
    outOfStep: true,
  })

  it("clears the flag (S1)", async () => {
    const repository = createInMemoryRoadmapRepository([outOfStep])

    await expect(repository.matchRoadmapToLists(outOfStep)).resolves.toEqual({
      status: "matched",
    })
    expect(await repository.listRoadmaps()).toEqual([
      { ...outOfStep, outOfStep: false },
    ])
  })

  it("settles a lost write by a re-read", async () => {
    const applied = createInMemoryRoadmapRepository(
      [outOfStep],
      {},
      {
        write: { lost: "applied" },
      },
    )
    const notApplied = createInMemoryRoadmapRepository(
      [outOfStep],
      {},
      {
        write: { lost: "not-applied" },
      },
    )

    await expect(applied.matchRoadmapToLists(outOfStep)).resolves.toEqual({
      status: "matched",
    })
    await expect(
      notApplied.matchRoadmapToLists(outOfStep),
    ).rejects.toMatchObject({ kind: "network" })
  })
})
