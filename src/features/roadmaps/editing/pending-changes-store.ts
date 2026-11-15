/**
 * The pending-edit store (EPC-005 "The pending-edit store"): every roadmap's pending
 * edits, which publishes are under way and what the last one came to. One per app, in
 * memory only: never written to storage or the URL, so a reload loses it (the browser
 * asks first). Not auth-scoped: Disconnect keeps it unless the Product Lead discards.
 */

import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  type FieldConflict,
  NO_CHANGES,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { AppErrorKind } from "@/lib/errors"
import { createExternalStore } from "@/lib/external-store"

import { openConflicts } from "./conflicts"
import { countChanges } from "./pending-changes"

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
  /**
   * Each roadmap's new items, by ID, that a confirmed publish wrote and no read has held
   * since, so they are still pending (DEF-009 D1). Only those still pending are kept.
   */
  readonly publishedNewItems: ReadonlyMap<string, ReadonlySet<string>>
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

/**
 * Whether a published new item of the roadmap waits for a read to hold it: the one
 * with `newItemId`, or any without (DEF-009 D1).
 */
function awaitingRead(
  snapshot: PendingChangesSnapshot,
  roadmapId: string,
  newItemId: string | undefined,
): boolean {
  const published = snapshot.publishedNewItems.get(roadmapId)
  if (!published) return false
  return newItemId === undefined || published.has(newItemId)
}

/**
 * Whether a roadmap's changes can be discarded, all of them or the new item with
 * `newItemId` alone: not while a publish of them is under way, nor until a Refresh
 * follows one that may have written them unseen, nor while a new item one published
 * waits for a read to hold it (DEF-009 D3). Dropping them then could hide what was
 * published.
 */
export function discardable(
  snapshot: PendingChangesSnapshot,
  roadmapId: string,
  newItemId?: string,
): boolean {
  return (
    !snapshot.publishing.has(roadmapId) &&
    !awaitingRefresh(snapshot, roadmapId) &&
    !awaitingRead(snapshot, roadmapId, newItemId)
  )
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
  /**
   * Records the roadmap's new items with these IDs as published, though still pending
   * until a read holds them (DEF-009 D1).
   */
  readonly keepPublished: (
    roadmapId: string,
    newItemIds: readonly string[],
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
  publishedNewItems: new Map(),
}

export function createPendingChangesStore(): PendingChangesStore {
  const store = createExternalStore(EMPTY)
  const patch = (next: Partial<PendingChangesSnapshot>) => {
    const snapshot = { ...store.getSnapshot(), ...next }
    store.setSnapshot({
      ...snapshot,
      notices: retireDecided(snapshot.notices, snapshot.changes),
      publishedNewItems: retireHeld(
        snapshot.publishedNewItems,
        snapshot.changes,
      ),
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
    keepPublished(roadmapId, newItemIds) {
      if (newItemIds.length === 0) return
      const { publishedNewItems } = store.getSnapshot()
      const updated = new Map(publishedNewItems)
      updated.set(
        roadmapId,
        new Set([...(publishedNewItems.get(roadmapId) ?? []), ...newItemIds]),
      )
      patch({ publishedNewItems: updated })
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
 * refusal left with nothing to say is gone. `notices` itself when nothing changes. What
 * is still open is `openConflicts`' rule, which the review shows by too.
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

/**
 * `published` with only the new items still pending: one a read held, Discard dropped
 * or a later publish settled is gone. `published` itself when nothing changes.
 */
function retireHeld(
  published: ReadonlyMap<string, ReadonlySet<string>>,
  changes: ReadonlyMap<string, RoadmapChanges>,
): ReadonlyMap<string, ReadonlySet<string>> {
  let retired: Map<string, ReadonlySet<string>> | undefined
  for (const [roadmapId, ids] of published) {
    const pending = new Set(
      changes.get(roadmapId)?.newItems.map(({ id }) => id) ?? [],
    )
    const still = [...ids].filter((id) => pending.has(id))
    if (still.length === ids.size) continue
    retired ??= new Map(published)
    if (still.length === 0) retired.delete(roadmapId)
    else retired.set(roadmapId, new Set(still))
  }
  return retired ?? published
}
