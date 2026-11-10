import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { authScopedQueryKey } from "@/features/auth/auth-scoped-queries"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { roadmapKeys, roadmapListQueryOptions } from "./roadmap-queries"

describe("roadmapKeys", () => {
  it("nests every roadmap key under the auth-scoped root", () => {
    expect(roadmapKeys.all.slice(0, authScopedQueryKey.length)).toEqual(
      authScopedQueryKey,
    )
    expect(roadmapKeys.list().slice(0, roadmapKeys.all.length)).toEqual(
      roadmapKeys.all,
    )
  })
})

describe("roadmapListQueryOptions", () => {
  it("loads the list from the repository", async () => {
    const roadmaps = [createTestRoadmap("1", "Platform")]
    const queryClient = new QueryClient()

    await expect(
      queryClient.query(
        roadmapListQueryOptions(createInMemoryRoadmapRepository(roadmaps)),
      ),
    ).resolves.toEqual(roadmaps)
  })
})
