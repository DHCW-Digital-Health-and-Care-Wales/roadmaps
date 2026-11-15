/**
 * The write hold (DEF-015): after a write the app couldn't read back, the whole app waits
 * behind one dialog until a Refresh reads what the data source now holds. One per app, in
 * memory only, so a reload ends it.
 */

import type { AppErrorKind } from "@/lib/errors"
import { createExternalStore } from "@/lib/external-store"

/** The write held, as its dialog names it. */
export type HeldWrite =
  /** The Publish changes or Save changes of a roadmap's pending edits. */
  | "publish"
  | "save"
  /** A roadmap published, with any pending edits, or unpublished. */
  | "published"
  | "unpublished"
  /** A roadmap added. */
  | "added"
  /** A family added or changed. */
  | "family"
  /** A roadmap matched to its family and category. */
  | "matched"

/** What a Refresh reads: the roadmap list, the family list, the organisations or one roadmap's items. */
export type HoldRead =
  "roadmaps" | "families" | "organisations" | { readonly items: string }

export interface WriteHoldRequest {
  readonly write: HeldWrite
  /**
   * `true` once the write landed and the read after it failed; `false` once its answer
   * was lost, so it may or may not have landed.
   */
  readonly landed: boolean
  /** What a Refresh must read before the hold ends. */
  readonly reads: readonly HoldRead[]
}

export type HoldRefresh =
  | { readonly status: "idle" }
  | { readonly status: "reading" }
  | { readonly status: "failed"; readonly error: AppErrorKind }

export interface WriteHold {
  /** The first write held, which the dialog names. */
  readonly request: WriteHoldRequest
  /** What a Refresh reads: every held write's reads. */
  readonly reads: readonly HoldRead[]
  /** How many writes are held, so a Refresh tells whether one joined while it read. */
  readonly writes: number
  readonly refresh: HoldRefresh
}

export interface WriteHoldStore {
  readonly getSnapshot: () => WriteHold | null
  readonly subscribe: (listener: () => void) => () => void
  /**
   * Holds the app for `request`, or adds its reads to the hold under way; settles once
   * the hold ends.
   */
  readonly hold: (request: WriteHoldRequest) => Promise<void>
  readonly setRefresh: (refresh: HoldRefresh) => void
  /**
   * Ends the hold, settling every `hold` made, unless more than `writes` are held: a
   * write held since the Refresh began may have changed what it read. Tells whether it
   * ended.
   */
  readonly release: (writes: number) => boolean
}

export function createWriteHoldStore(): WriteHoldStore {
  const store = createExternalStore<WriteHold | null>(null)
  let waiting: (() => void)[] = []

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    hold(request) {
      const current = store.getSnapshot()
      store.setSnapshot(
        current
          ? {
              ...current,
              reads: [
                ...current.reads,
                ...request.reads.filter(
                  (read) => !current.reads.some((each) => sameRead(each, read)),
                ),
              ],
              writes: current.writes + 1,
            }
          : {
              request,
              reads: request.reads,
              writes: 1,
              refresh: { status: "idle" },
            },
      )
      return new Promise((resolve) => {
        waiting.push(resolve)
      })
    },
    setRefresh(refresh) {
      const current = store.getSnapshot()
      if (current) store.setSnapshot({ ...current, refresh })
    },
    release(writes) {
      if (store.getSnapshot()?.writes !== writes) return false
      const released = waiting
      waiting = []
      store.setSnapshot(null)
      for (const resolve of released) resolve()
      return true
    },
  }
}

function sameRead(a: HoldRead, b: HoldRead): boolean {
  if (typeof a === "string" || typeof b === "string") return a === b
  return a.items === b.items
}
