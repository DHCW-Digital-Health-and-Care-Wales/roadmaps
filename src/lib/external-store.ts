/** A value that notifies subscribers on change, shaped for `useSyncExternalStore`. */
export interface ExternalStore<T> {
  /** The current snapshot. Its identity only changes when `setSnapshot` changes it. */
  readonly getSnapshot: () => T
  /** Registers a change listener and returns its unsubscribe function. */
  readonly subscribe: (listener: () => void) => () => void
  /** Replaces the snapshot and notifies listeners, unless `next` is the current one. */
  readonly setSnapshot: (next: T) => void
}

export function createExternalStore<T>(initial: T): ExternalStore<T> {
  let snapshot = initial
  const listeners = new Set<() => void>()

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setSnapshot(next) {
      if (Object.is(next, snapshot)) return
      snapshot = next
      // Copy first, so a listener that (un)subscribes doesn't affect this round.
      for (const listener of [...listeners]) listener()
    },
  }
}
