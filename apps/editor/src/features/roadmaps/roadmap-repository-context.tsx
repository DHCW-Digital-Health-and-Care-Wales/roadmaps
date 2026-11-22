import { createContext, use, type ReactNode } from "react"

import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"

const RoadmapRepositoryContext = createContext<RoadmapRepository | null>(null)

export interface RoadmapRepositoryProviderProps {
  /** Created by the composition root; tests pass an in-memory repository. */
  repository: RoadmapRepository
  children: ReactNode
}

export function RoadmapRepositoryProvider({
  repository,
  children,
}: RoadmapRepositoryProviderProps) {
  return (
    <RoadmapRepositoryContext value={repository}>
      {children}
    </RoadmapRepositoryContext>
  )
}

/** The data source for roadmaps, without knowing which one it is (ADR-002). */
// eslint-disable-next-line react-refresh/only-export-components -- context and its hook belong together
export function useRoadmapRepository(): RoadmapRepository {
  const repository = use(RoadmapRepositoryContext)
  if (!repository) {
    throw new Error(
      "useRoadmapRepository must be used within a RoadmapRepositoryProvider",
    )
  }
  return repository
}
