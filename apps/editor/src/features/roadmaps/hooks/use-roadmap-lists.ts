import { useQuery, useQueryClient } from "@tanstack/react-query"

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { useEnabledWhileConnected } from "./enabled-while-connected"
import {
  categoryListQueryOptions,
  familyListQueryOptions,
  JOIN_READ,
} from "./roadmap-queries"

/**
 * The family and category lists a roadmap's family and category are chosen from
 * (ADR-013). Each is `null` when the data source has none, and `undefined` until read,
 * or when it couldn't be.
 */
export interface RoadmapLists {
  families: readonly Family[] | null | undefined
  categories: readonly Category[] | null | undefined
}

/** Whether each list is being read for the first time. */
type RoadmapListsReading = Readonly<Record<keyof RoadmapLists, boolean>>

/**
 * The family and category lists, fetched while connected and only once `needed`, so a
 * roadmap's page spends no reads on them until a choice is made or shown: this is the
 * only gate on those reads (ADR-011). Refetching reads them again for every part of
 * the page that needs them now, and for none if none does.
 */
export function useRoadmapLists(needed: boolean) {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  const familyOptions = useEnabledWhileConnected(
    familyListQueryOptions(repository),
  )
  const categoryOptions = useEnabledWhileConnected(
    categoryListQueryOptions(repository),
  )
  const families = useQuery({
    ...familyOptions,
    enabled: familyOptions.enabled && needed,
  })
  const categories = useQuery({
    ...categoryOptions,
    enabled: categoryOptions.enabled && needed,
  })
  const lists: RoadmapLists = {
    families: families.data,
    categories: categories.data,
  }
  const reading: RoadmapListsReading = {
    families: families.isFetching && families.data === undefined,
    categories: categories.isFetching && categories.data === undefined,
  }
  const refetch = () =>
    Promise.all([
      queryClient.invalidateQueries(
        { queryKey: familyOptions.queryKey },
        JOIN_READ,
      ),
      queryClient.invalidateQueries(
        { queryKey: categoryOptions.queryKey },
        JOIN_READ,
      ),
    ])
  return { lists, reading, refetch }
}
