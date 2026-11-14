import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { NewRoadmapInput } from "@/domain/roadmap/new-roadmap"
import type { Roadmap } from "@/domain/roadmap/roadmap"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapKeys } from "./roadmap-queries"
import { patchQueryData } from "./use-publish-roadmap-changes"

/** The add's mutation key, so the dialog can tell one is under way. */
const ADD_ROADMAP_KEY = ["add-roadmap"] as const

/**
 * Adds a roadmap (STY-041), written at once and never retried. A roadmap added joins the
 * cached list at once, keeping the list's age, so its page opens without waiting for a
 * read; items read earlier under its address were a removed roadmap's, and are
 * forgotten. Whatever the write came to, the list is then read again; so are the family
 * and category lists once a choice was no longer listed.
 */
export function useAddRoadmap() {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ADD_ROADMAP_KEY,
    mutationFn: (input: NewRoadmapInput) => repository.addRoadmap(input),
    retry: false,
    onSuccess: (outcome) => {
      if (outcome.status === "added") {
        const { roadmap } = outcome
        queryClient.removeQueries({ queryKey: roadmapKeys.items(roadmap.id) })
        patchQueryData<readonly Roadmap[]>(
          queryClient,
          roadmapKeys.list(),
          (roadmaps) => [
            ...roadmaps.filter(({ id }) => id !== roadmap.id),
            roadmap,
          ],
        )
      } else if (outcome.status === "choice-not-listed") {
        void queryClient.invalidateQueries({ queryKey: roadmapKeys.families() })
        void queryClient.invalidateQueries({
          queryKey: roadmapKeys.categories(),
        })
      }
    },
    // Not awaited: the dialog's answer does not wait for the list.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: roadmapKeys.list() })
    },
  })
}

/** Whether a roadmap is being added. */
export function useAddingRoadmap(): boolean {
  return useIsMutating({ mutationKey: ADD_ROADMAP_KEY }) > 0
}
