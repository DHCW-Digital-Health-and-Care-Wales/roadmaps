import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { authScopedQueryKey } from "@/features/auth/auth-scoped-queries"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import {
  roadmapItemsQueryOptions,
  roadmapKeys,
  roadmapListQueryOptions,
} from "./roadmap-queries"

describe("roadmapKeys", () => {
  it("nests every roadmap key under the auth-scoped root", () => {
    expect(roadmapKeys.all.slice(0, authScopedQueryKey.length)).toEqual(
      authScopedQueryKey,
    )
    expect(roadmapKeys.list().slice(0, roadmapKeys.all.length)).toEqual(
      roadmapKeys.all,
    )
    expect(
      roadmapKeys.items("producta").slice(0, roadmapKeys.all.length),
    ).toEqual(roadmapKeys.all)
  })

  it("keys each roadmap's items apart from the list and each other", () => {
    const keys = [
      roadmapKeys.list(),
      roadmapKeys.items("producta"),
      roadmapKeys.items("productb"),
    ].map((key) => JSON.stringify(key))

    expect(new Set(keys).size).toBe(3)
  })
})

describe("roadmapListQueryOptions", () => {
  it("loads the list from the repository", async () => {
    const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]
    const queryClient = new QueryClient()

    await expect(
      queryClient.query(
        roadmapListQueryOptions(createInMemoryRoadmapRepository(roadmaps)),
      ),
    ).resolves.toEqual(roadmaps)
  })
})

describe("roadmapItemsQueryOptions", () => {
  it("loads one roadmap's items from the repository", async () => {
    const items = [createTestRoadmapItem("First")]
    const repository = createInMemoryRoadmapRepository(
      [createTestRoadmap("producta", "Product A roadmap")],
      { producta: items },
    )

    await expect(
      new QueryClient().query(roadmapItemsQueryOptions(repository, "producta")),
    ).resolves.toEqual(items)
  })
})
