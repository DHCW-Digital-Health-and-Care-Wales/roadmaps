import { queryOptions } from "@tanstack/react-query"

import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { authScopedQueryKey } from "@/features/auth/auth-scoped-queries"

/**
 * Query keys for roadmap data. They extend the auth-scoped root, so disconnecting drops
 * them (ADR-003).
 */
export const roadmapKeys = {
  all: [...authScopedQueryKey, "roadmaps"] as const,
  list: () => [...roadmapKeys.all, "list"] as const,
}

/**
 * The listed roadmaps, in source order. `staleTime` and retries come from the query
 * client's defaults; TanStack Query's abort signal cancels superseded requests.
 */
export function roadmapListQueryOptions(repository: RoadmapRepository) {
  return queryOptions({
    queryKey: roadmapKeys.list(),
    queryFn: ({ signal }) => repository.listRoadmaps({ signal }),
  })
}
