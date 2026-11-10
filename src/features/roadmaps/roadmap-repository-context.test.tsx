import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  RoadmapRepositoryProvider,
  useRoadmapRepository,
} from "./roadmap-repository-context"
import { createInMemoryRoadmapRepository } from "./testing/in-memory-roadmap-repository"

describe("useRoadmapRepository", () => {
  it("returns the provided repository", () => {
    const repository = createInMemoryRoadmapRepository()
    const { result } = renderHook(useRoadmapRepository, {
      wrapper: ({ children }) => (
        <RoadmapRepositoryProvider repository={repository}>
          {children}
        </RoadmapRepositoryProvider>
      ),
    })

    expect(result.current).toBe(repository)
  })

  it("throws outside a RoadmapRepositoryProvider", () => {
    expect(() => renderHook(useRoadmapRepository)).toThrow(
      /within a RoadmapRepositoryProvider/,
    )
  })
})
