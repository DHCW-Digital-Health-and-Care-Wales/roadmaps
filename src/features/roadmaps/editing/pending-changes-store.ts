/**
 * The pending-edit store (EPC-005 "The pending-edit store"): every roadmap's pending
 * edits, which publishes are under way and what the last one came to. One per app, in
 * memory only: never written to storage or the URL, so a reload loses it (the browser
 * asks first). Not auth-scoped: Disconnect keeps it unless the Product Lead discards.
 */

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
import type { AppErrorKind } from "@/lib/errors"
import { createExternalStore } from "@/lib/external-store"

import { countChanges, NO_CHANGES } from "./pending-changes"

/** "save" for a roadmap that is not published, whose changes go nowhere public. */
export type PublishAction = "publish" | "save"

/** What publishing `roadmap` is called (S11). */
export function publishAction(roadmap: Roadmap): PublishAction {
  return roadmap.published ? "publish" : "save"
}

/** What the last publish of a roadmap came to, as its page says it. */
export type PublishNotice = { action: PublishAction } & (
  | { kind: "published" }
  /** The answer was lost: the changes may be in the data source (ADR-012 Option 16). */
  | { kind: "unconfirmed" }
  /** A co-lead changed what was edited, or an edited item is gone. */
  | { kind: "refused" }
  | { kind: "failed"; error: AppErrorKind }
)

export interface PendingChangesSnapshot {
  readonly changes: ReadonlyMap<string, RoadmapChanges>
  readonly publishing: ReadonlySet<string>
  readonly notices: ReadonlyMap<string, PublishNotice>
}

/**
 * Whether a roadmap's last publish may have written its changes unseen, until a Refresh
 * reads what it holds (S18): its changes cannot be undone or discarded until then, or
 * the page would show the text from before a publish that landed.
 */
export function awaitingRefresh(
  snapshot: PendingChangesSnapshot,
  roadmapId: string,
): boolean {
  return snapshot.notices.get(roadmapId)?.kind === "unconfirmed"
}

export interface PendingChangesStore {
  readonly getSnapshot: () => PendingChangesSnapshot
  readonly subscribe: (listener: () => void) => () => void
  /** Replaces a roadmap's changes with `edit`'s result; none left removes the entry. */
  readonly update: (
    roadmapId: string,
    edit: (changes: RoadmapChanges) => RoadmapChanges,
  ) => void
  /** Forgets a roadmap's changes. */
  readonly discard: (roadmapId: string) => void
  readonly discardAll: () => void
  /** Marks a publish as under way: `false`, and nothing changes, when one already is. */
  readonly startPublish: (roadmapId: string) => boolean
  /** Ends a publish and records what it came to. */
  readonly finishPublish: (roadmapId: string, notice: PublishNotice) => void
  readonly clearNotice: (roadmapId: string) => void
  /** Forgets every roadmap's notice, as Disconnect does. */
  readonly clearNotices: () => void
}

const EMPTY: PendingChangesSnapshot = {
  changes: new Map(),
  publishing: new Set(),
  notices: new Map(),
}

export function createPendingChangesStore(): PendingChangesStore {
  const store = createExternalStore(EMPTY)
  const patch = (next: Partial<PendingChangesSnapshot>) => {
    store.setSnapshot({ ...store.getSnapshot(), ...next })
  }

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    update(roadmapId, edit) {
      const { changes } = store.getSnapshot()
      const current = changes.get(roadmapId)
      const next = edit(current ?? NO_CHANGES)
      const emptied = countChanges(next) === 0
      if (next === current || (emptied && current === undefined)) return
      const updated = new Map(changes)
      if (emptied) updated.delete(roadmapId)
      else updated.set(roadmapId, next)
      patch({ changes: updated })
    },
    discard(roadmapId) {
      const { changes } = store.getSnapshot()
      if (!changes.has(roadmapId)) return
      const remaining = new Map(changes)
      remaining.delete(roadmapId)
      patch({ changes: remaining })
    },
    discardAll() {
      if (store.getSnapshot().changes.size > 0) patch({ changes: new Map() })
    },
    startPublish(roadmapId) {
      const { publishing, notices } = store.getSnapshot()
      if (publishing.has(roadmapId)) return false
      const remaining = new Map(notices)
      remaining.delete(roadmapId)
      patch({
        publishing: new Set([...publishing, roadmapId]),
        notices: remaining,
      })
      return true
    },
    finishPublish(roadmapId, notice) {
      const { publishing, notices } = store.getSnapshot()
      const stillPublishing = new Set(publishing)
      stillPublishing.delete(roadmapId)
      patch({
        publishing: stillPublishing,
        notices: new Map(notices).set(roadmapId, notice),
      })
    },
    clearNotice(roadmapId) {
      const { notices } = store.getSnapshot()
      if (!notices.has(roadmapId)) return
      const remaining = new Map(notices)
      remaining.delete(roadmapId)
      patch({ notices: remaining })
    },
    clearNotices() {
      if (store.getSnapshot().notices.size > 0) patch({ notices: new Map() })
    },
  }
}
