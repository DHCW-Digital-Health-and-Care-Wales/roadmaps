import { vi } from "vitest"

/**
 * A browser with view transitions and their types. It gives back the `startViewTransition`
 * spy, which records each transition started, with `draw`, which draws the updates of
 * those deferred, and `ends`, which finishes those held. Each transition draws its update
 * at once; with `deferred`, only when `draw` is called, as a browser draws the update a
 * while after it was asked for; with `held`, it draws it at once and finishes only when
 * its entry in `ends` is called. Undo it with `withoutViewTransitions`. With `deferred`
 * or `held`, call it after a test's setup moves, or each of those waits too.
 */
export function withViewTransitions({ deferred = false, held = false } = {}) {
  vi.stubGlobal(
    "ViewTransition",
    class {
      get types() {
        return new Set<string>()
      }
    },
  )
  const ends: (() => void)[] = []
  const pending: (() => void)[] = []
  const start = vi.fn((options: StartViewTransitionOptions) => {
    let finished: Promise<void>
    if (held) {
      options.update?.()
      finished = new Promise<void>((resolve) => ends.push(resolve))
    } else if (deferred) {
      finished = new Promise<void>((resolve) => {
        pending.push(() => {
          options.update?.()
          resolve()
        })
      })
    } else {
      options.update?.()
      finished = Promise.resolve()
    }
    return {
      finished,
      ready: finished,
      updateCallbackDone: finished,
      skipTransition: vi.fn(),
    }
  })
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: start,
  })
  /** Draws the update of every deferred transition started so far. */
  const draw = () => {
    for (const drawUpdate of pending.splice(0)) drawUpdate()
  }
  return Object.assign(start, { ends, draw })
}

/** Puts the browser back as it was before `withViewTransitions`. */
export function withoutViewTransitions() {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, "startViewTransition")
}
