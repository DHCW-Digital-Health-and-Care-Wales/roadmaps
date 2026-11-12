import { createContext, use, useSyncExternalStore } from "react"

import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"

import type {
  PendingChangesSnapshot,
  PendingChangesStore,
} from "./pending-changes-store"

/** Provided by `PendingChangesProvider`; read it through the hooks below. */
export const PendingChangesContext = createContext<PendingChangesStore | null>(
  null,
)

/** The app's one pending-edit store, for changing it. */
export function usePendingChangesStore(): PendingChangesStore {
  const store = use(PendingChangesContext)
  if (!store) {
    throw new Error(
      "usePendingChangesStore must be used within a PendingChangesProvider",
    )
  }
  return store
}

/** Every roadmap's pending edits, publishes and notices, re-rendering on change. */
export function usePendingChanges(): PendingChangesSnapshot {
  const store = usePendingChangesStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}

/** One roadmap's pending edits, if it has any. */
export function useRoadmapChanges(
  roadmapId: string,
): RoadmapChanges | undefined {
  return usePendingChanges().changes.get(roadmapId)
}
