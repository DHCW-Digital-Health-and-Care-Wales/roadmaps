import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { PublishedStateChange } from "@/domain/roadmap/published-state"
import type { Roadmap } from "@/domain/roadmap/roadmap"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapKeys } from "./roadmap-queries"
import {
  type CurrentText,
  patchQueryData,
  readBefore,
  showCurrentText,
  useReadAgain,
} from "./use-publish-roadmap-changes"

const setPublishedKey = (roadmapId: string) =>
  ["set-roadmap-published", roadmapId] as const

/**
 * Publishes or unpublishes a roadmap, with any pending edits sent (STY-035). The write
 * is never retried. What it came to is put in the cached list at once, keeping the
 * list's age: the roadmap as asked once set, or as it now is once changed, so the page
 * shows it even if reading the list again fails; a refusal of pending edits shows the
 * text it found by `currentText`, as a publish of them does. The roadmap and its items
 * are read again once it settles, whatever its result, and `readBack` then tells which
 * of those reads succeeded. `writing` says whether one is under way for the roadmap, on
 * any page that started it.
 */
export function useSetRoadmapPublished(
  loaded: Roadmap,
  { currentText }: { currentText: CurrentText },
) {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  const roadmapId = loaded.id
  const { readAgain, readBack } = useReadAgain(roadmapId)
  const replaceRoadmap = (replace: (roadmap: Roadmap) => Roadmap) => {
    patchQueryData<readonly Roadmap[]>(
      queryClient,
      roadmapKeys.list(),
      (roadmaps) =>
        roadmaps.map((each) => (each.id === roadmapId ? replace(each) : each)),
    )
  }
  const mutation = useMutation({
    mutationKey: setPublishedKey(roadmapId),
    mutationFn: (change: PublishedStateChange) =>
      repository.setRoadmapPublished(loaded, change),
    retry: false,
    onMutate: () => readBefore(queryClient, roadmapId),
    onSuccess: (outcome, change, before) => {
      switch (outcome.status) {
        case "set":
          replaceRoadmap((roadmap) => ({
            ...roadmap,
            published: change.published,
          }))
          break
        case "changed":
          replaceRoadmap(() => outcome.roadmap)
          break
        case "refused":
          showCurrentText(queryClient, {
            roadmapId,
            conflicts: outcome.conflicts,
            currentText,
            before,
          })
          break
      }
    },
    // The items too: a change of state can change which row with the id is listed.
    onSettled: readAgain,
  })
  // Counted in the cache, where a write outlives the page that started it (STY-035).
  const writing = useIsMutating({ mutationKey: setPublishedKey(roadmapId) }) > 0
  return { ...mutation, writing, readBack }
}
