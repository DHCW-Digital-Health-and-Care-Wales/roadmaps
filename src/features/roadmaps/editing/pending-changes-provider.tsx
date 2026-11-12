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
import { useTranslation } from "react-i18next"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { DisconnectRequestContext } from "@/features/auth/disconnect-request"
import { useAuth } from "@/features/auth/use-auth"

import { roadmapKeys } from "../hooks/roadmap-queries"
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
 * is pending; and asks, on Disconnect, whether to keep them.
 */
export function PendingChangesProvider({
  children,
}: PendingChangesProviderProps) {
  const [store] = useState(createPendingChangesStore)
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  // Kept after the question closes, so its text does not change as it fades.
  const [roadmapCount, setRoadmapCount] = useState(0)
  const { disconnect } = useAuth()

  useEffect(() => reconcileOnRead(queryClient, store), [queryClient, store])
  useLeaveWarning(store)

  const leave = () => {
    setAsking(false)
    store.clearNotices()
    disconnect()
  }
  const requestDisconnect = () => {
    const pending = store.getSnapshot().changes.size
    if (pending === 0) {
      leave()
      return
    }
    setRoadmapCount(pending)
    setAsking(true)
  }

  return (
    <PendingChangesContext value={store}>
      <DisconnectRequestContext value={requestDisconnect}>
        {children}
        <DisconnectQuestion
          open={asking}
          roadmapCount={roadmapCount}
          onKeep={leave}
          onDiscard={() => {
            store.discardAll()
            leave()
          }}
          onCancel={() => {
            setAsking(false)
          }}
        />
      </DisconnectRequestContext>
    </PendingChangesContext>
  )
}

/**
 * After each successful read of the roadmap list or of a roadmap's items, drops from the
 * pending edits whatever the data source already holds, and moves each item's edits to
 * where its item now is. Returns the unsubscribe.
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
      for (const id of store.getSnapshot().changes.keys()) {
        const roadmap = roadmaps.find((each) => each.id === id)
        if (roadmap) {
          store.update(id, (changes) => reconcileRoadmap(changes, roadmap))
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

interface DisconnectQuestionProps {
  open: boolean
  roadmapCount: number
  onKeep: () => void
  onDiscard: () => void
  onCancel: () => void
}

/** Disconnect with pending edits: keep them for the next connection, discard, or stay. */
function DisconnectQuestion({
  open,
  roadmapCount,
  onKeep,
  onDiscard,
  onCancel,
}: DisconnectQuestionProps) {
  const { t } = useTranslation()
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("roadmaps.disconnect.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("roadmaps.disconnect.description", { count: roadmapCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onKeep}>{t("roadmaps.disconnect.keep")}</Button>
          <Button variant="destructive" onClick={onDiscard}>
            {t("roadmaps.disconnect.discard")}
          </Button>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
