import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { Roadmap } from "@/domain/roadmap/roadmap"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { readBackAfterWrite } from "../write-hold/read-back"
import { useWriteHold } from "../write-hold/write-hold-context"
import { roadmapKeys } from "./roadmap-queries"

/**
 * Makes a roadmap's copied family and category cells match the lists (STY-030). The
 * write is never retried. A refusal returns the roadmap as it now is, which is put in
 * the cached list at once (keeping the list's age, so it still reads as stale), so the
 * page shows it even if reading the list again fails (S4); the roadmaps are then read
 * again once it settles, whatever its result. Once a match isn't read back, or the
 * answer was lost, the app is held until a Refresh reads it (DEF-015). Pending edits
 * are untouched.
 */
export function useMatchRoadmap() {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  const hold = useWriteHold()
  return useMutation({
    mutationFn: (loaded: Roadmap) => repository.matchRoadmapToLists(loaded),
    retry: false,
    onSuccess: (outcome) => {
      if (outcome.status !== "changed") return
      const state = queryClient.getQueryState<Roadmap[]>(roadmapKeys.list())
      if (state?.data === undefined) return
      queryClient.setQueryData<Roadmap[]>(
        roadmapKeys.list(),
        state.data.map((roadmap) =>
          roadmap.id === outcome.roadmap.id ? outcome.roadmap : roadmap,
        ),
        { updatedAt: state.dataUpdatedAt },
      )
    },
    onSettled: async (outcome) => {
      const held = { write: "matched", reads: ["roadmaps"] } as const
      if (outcome?.status === "unconfirmed") {
        void hold({ ...held, landed: false })
        return
      }
      const read = await readBackAfterWrite(queryClient, held.reads)
      if (!read && outcome?.status === "matched") {
        void hold({ ...held, landed: true })
      }
    },
  })
}
