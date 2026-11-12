import { useQuery } from "@tanstack/react-query"

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { useEnabledWhileConnected } from "./enabled-while-connected"
import {
  categoryListQueryOptions,
  familyListQueryOptions,
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

/** The family and category lists, fetched only while connected, like the roadmaps. */
export function useRoadmapLists() {
  const repository = useRoadmapRepository()
  const families = useQuery(
    useEnabledWhileConnected(familyListQueryOptions(repository)),
  )
  const categories = useQuery(
    useEnabledWhileConnected(categoryListQueryOptions(repository)),
  )
  const lists: RoadmapLists = {
    families: families.data,
    categories: categories.data,
  }
  const refetch = () => Promise.all([families.refetch(), categories.refetch()])
  return { lists, refetch }
}
