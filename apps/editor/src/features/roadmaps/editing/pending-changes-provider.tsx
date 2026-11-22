import {
  useQueryClient,
  type Query,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query"
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { DisconnectRequestContext } from "@/features/auth/disconnect-request"
import { useAuth } from "@/features/auth/use-auth"

import { roadmapKeys } from "../hooks/roadmap-queries"
import { DisconnectQuestionContext } from "./disconnect-question-context"
import { reconcileItems, reconcileRoadmap } from "./pending-changes"
import { PendingChangesContext } from "./pending-changes-context"
import {
  createPendingChangesStore,
  type PendingChangesStore,
} from "./pending-changes-store"

export interface PendingChangesProviderProps {
  children: ReactNode
}

/**
 * Holds every roadmap's pending edits for the life of the tab (ADR-012), outside the
 * query cache so Disconnect does not drop them. It drops, after each fresh read, every
 * change the data source already holds; asks before the tab is closed while any change
 * is pending; and holds the question Disconnect asks, whether to keep them, which
 * `DisconnectQuestion` puts to the Product Lead from inside the router. The store settles
 * each roadmap's pending orders against its items as cached (STY-050).
 */
export function PendingChangesProvider({
  children,
}: PendingChangesProviderProps) {
  const queryClient = useQueryClient()
  const [store] = useState(() =>
    createPendingChangesStore((roadmapId) =>
      queryClient.getQueryData(roadmapKeys.items(roadmapId)),
    ),
  )
  const [asking, setAsking] = useState(false)
  const { disconnect } = useAuth()

  useEffect(() => reconcileOnRead(queryClient, store), [queryClient, store])
  useLeaveWarning(store)

  const leave = () => {
    setAsking(false)
    store.clearNotices()
    disconnect()
  }
  const requestDisconnect = () => {
    if (store.getSnapshot().changes.size === 0) {
      leave()
      return
    }
    setAsking(true)
  }

  return (
    <PendingChangesContext value={store}>
      <DisconnectRequestContext value={requestDisconnect}>
        <DisconnectQuestionContext
          value={{
            open: asking,
            onKeep: leave,
            onDiscard: () => {
              store.discardAll()
              leave()
            },
            onCancel: () => {
              setAsking(false)
            },
          }}
        >
          {children}
        </DisconnectQuestionContext>
      </DisconnectRequestContext>
    </PendingChangesContext>
  )
}

/**
 * After each successful read of the roadmap list or of a roadmap's items, drops from the
 * pending edits whatever the data source already holds, and moves each item's edits to
 * where its item now is. A roadmap gone from the list loses its edits (STY-026 S6), and
 * only a read brings it back: data set by hand, such as a refusal's text, may still hold
 * a roadmap a publish found removed (DEF-003). Returns the unsubscribe.
 */
function reconcileOnRead(
  queryClient: QueryClient,
  store: PendingChangesStore,
): () => void {
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return
    const { queryKey: key } = event.query as Query
    if (isKey(key, roadmapKeys.list())) {
      const roadmaps = event.action.data as unknown as readonly Roadmap[]
      // `setQueryData` dispatches `success` too, with `manual`: it is no read.
      if (!event.action.manual) {
        store.restoreRoadmaps(roadmaps.map((each) => each.id))
      }
      for (const id of [...store.getSnapshot().changes.keys()]) {
        const roadmap = roadmaps.find((each) => each.id === id)
        if (roadmap) {
          store.update(id, (changes) => reconcileRoadmap(changes, roadmap))
        } else {
          store.removeRoadmap(id)
        }
      }
      return
    }
    const roadmapId = key.at(-1)
    if (
      typeof roadmapId === "string" &&
      isKey(key, roadmapKeys.items(roadmapId))
    ) {
      const items = event.action.data as unknown as readonly RoadmapItem[]
      store.update(roadmapId, (changes) => reconcileItems(changes, items))
    }
  })
}

function isKey(key: QueryKey, expected: QueryKey): boolean {
  return (
    key.length === expected.length &&
    key.every((part, index) => part === expected[index])
  )
}

/** The browser's "Leave site?" question, only while any change is pending (S8). */
function useLeaveWarning(store: PendingChangesStore) {
  const pending = useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().changes.size > 0,
  )
  useEffect(() => {
    if (!pending) return
    const ask = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", ask)
    return () => {
      window.removeEventListener("beforeunload", ask)
    }
  }, [pending])
}
