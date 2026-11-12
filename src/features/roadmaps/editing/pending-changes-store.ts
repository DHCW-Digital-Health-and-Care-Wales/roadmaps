/**
 * The pending-edit store (EPC-005 "The pending-edit store"): every roadmap's pending
 * edits, which publishes are under way and what the last one came to. One per app, in
 * memory only: never written to storage or the URL, so a reload loses it (the browser
 * asks first). Not auth-scoped: Disconnect keeps it unless the Product Lead discards.
 */

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type {
  FieldConflict,
  RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { AppErrorKind } from "@/lib/errors"
import { createExternalStore } from "@/lib/external-store"

import { openConflicts } from "./conflicts"
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
  /**
   * Nothing was written: a co-lead changed what was edited (`conflicts`, those still to
   * decide in the review), or edited items are gone (`removed`, their loaded titles;
   * their changes are already discarded). Gone once nothing is left of either.
   */
  | {
      kind: "refused"
      conflicts: readonly FieldConflict[]
      removed: readonly LocalisedText[]
    }
  | { kind: "failed"; error: AppErrorKind }
)

export interface PendingChangesSnapshot {
  readonly changes: ReadonlyMap<string, RoadmapChanges>
  readonly publishing: ReadonlySet<string>
  readonly notices: ReadonlyMap<string, PublishNotice>
  /**
   * Roadmaps found gone from the list while they had changes, which were discarded
   * (S6): until a list holds them again, their page says so.
   */
  readonly removed: ReadonlySet<string>
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
  /** Ends a publish and records what it came to, if its page should say. */
  readonly finishPublish: (
    roadmapId: string,
    notice: PublishNotice | null,
  ) => void
  readonly clearNotice: (roadmapId: string) => void
  /** Forgets every roadmap's notice, as Disconnect does. */
  readonly clearNotices: () => void
  /** Discards the changes of a roadmap gone from the list, and remembers it gone. */
  readonly removeRoadmap: (roadmapId: string) => void
  /** Forgets that these roadmaps were gone, now a list holds them again. */
  readonly restoreRoadmaps: (roadmapIds: Iterable<string>) => void
}

const EMPTY: PendingChangesSnapshot = {
  changes: new Map(),
  publishing: new Set(),
  notices: new Map(),
  removed: new Set(),
}

export function createPendingChangesStore(): PendingChangesStore {
  const store = createExternalStore(EMPTY)
  const patch = (next: Partial<PendingChangesSnapshot>) => {
    const snapshot = { ...store.getSnapshot(), ...next }
    store.setSnapshot({
      ...snapshot,
      notices: retireDecided(snapshot.notices, snapshot.changes),
    })
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
      const updated = new Map(notices)
      if (notice) updated.set(roadmapId, notice)
      patch({ publishing: stillPublishing, notices: updated })
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
    removeRoadmap(roadmapId) {
      const { changes, notices, removed } = store.getSnapshot()
      if (!changes.has(roadmapId)) return
      const remaining = new Map(changes)
      remaining.delete(roadmapId)
      const otherNotices = new Map(notices)
      otherNotices.delete(roadmapId)
      patch({
        changes: remaining,
        notices: otherNotices,
        removed: new Set([...removed, roadmapId]),
      })
    },
    restoreRoadmaps(roadmapIds) {
      const { removed } = store.getSnapshot()
      const back = [...roadmapIds].filter((id) => removed.has(id))
      if (back.length === 0) return
      patch({
        removed: new Set([...removed].filter((id) => !back.includes(id))),
      })
    },
  }
}

/**
 * `notices` without each refusal's conflicts that are decided, however (a decision in the
 * review, Undo, a discard or a read), so a later edit of the field cannot reopen one; a
 * refusal left with nothing to say is gone. `notices` itself when nothing changes.
 */
function retireDecided(
  notices: ReadonlyMap<string, PublishNotice>,
  changes: ReadonlyMap<string, RoadmapChanges>,
): ReadonlyMap<string, PublishNotice> {
  let retired: Map<string, PublishNotice> | undefined
  for (const [roadmapId, notice] of notices) {
    if (notice.kind !== "refused") continue
    const open = new Set(
      openConflicts(notice.conflicts, changes.get(roadmapId)).map(
        ({ conflict }) => conflict,
      ),
    )
    if (open.size === notice.conflicts.length) continue
    retired ??= new Map(notices)
    const conflicts = notice.conflicts.filter((each) => open.has(each))
    if (conflicts.length === 0 && notice.removed.length === 0) {
      retired.delete(roadmapId)
    } else {
      retired.set(roadmapId, { ...notice, conflicts })
    }
  }
  return retired ?? notices
}
