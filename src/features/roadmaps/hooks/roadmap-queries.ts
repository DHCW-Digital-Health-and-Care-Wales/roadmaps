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
  items: (roadmapId: string) =>
    [...roadmapKeys.all, "items", roadmapId] as const,
  families: () => [...roadmapKeys.all, "families"] as const,
  categories: () => [...roadmapKeys.all, "categories"] as const,
  organisations: () => [...roadmapKeys.all, "organisations"] as const,
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

/** One roadmap's items, in source order; defaults as for the list. */
export function roadmapItemsQueryOptions(
  repository: RoadmapRepository,
  roadmapId: string,
) {
  return queryOptions({
    queryKey: roadmapKeys.items(roadmapId),
    queryFn: ({ signal }) => repository.listRoadmapItems(roadmapId, { signal }),
  })
}

/** The family list, in source order; `null` without one (ADR-013). Defaults as for the list. */
export function familyListQueryOptions(repository: RoadmapRepository) {
  return queryOptions({
    queryKey: roadmapKeys.families(),
    queryFn: ({ signal }) => repository.listFamilies({ signal }),
  })
}

/** The category list, in source order; `null` without one (ADR-013). Defaults as for the list. */
export function categoryListQueryOptions(repository: RoadmapRepository) {
  return queryOptions({
    queryKey: roadmapKeys.categories(),
    queryFn: ({ signal }) => repository.listCategories({ signal }),
  })
}

/**
 * The organisation list, in no promised order (ADR-014): sort it with
 * `sortOrganisations`. Defaults as for the list.
 */
export function organisationListQueryOptions(repository: RoadmapRepository) {
  return queryOptions({
    queryKey: roadmapKeys.organisations(),
    queryFn: ({ signal }) => repository.listOrganisations({ signal }),
  })
}
