import { vi } from "vitest"

/**
 * A browser with view transitions and their types. It gives back the `startViewTransition`
 * spy, which records each transition started, and `ends`, which finishes those held.
 * Each transition draws its update `delay` ms after it was asked for, as a view
 * transition does, or at once with a `delay` of 0; with `held`, it draws it at once and
 * finishes only when its entry in `ends` is called (`delay` is ignored). Undo it with
 * `withoutViewTransitions`. Call it after a test's setup moves, or each of those is
 * drawn late too, and the next is chosen before it has landed.
 */
export function withViewTransitions({ delay = 50, held = false } = {}) {
  vi.stubGlobal(
    "ViewTransition",
    class {
      get types() {
        return new Set<string>()
      }
    },
  )
  const ends: (() => void)[] = []
  const start = vi.fn((options: StartViewTransitionOptions) => {
    let finished: Promise<void>
    if (held) {
      options.update?.()
      finished = new Promise<void>((resolve) => ends.push(resolve))
    } else if (delay > 0) {
      finished = new Promise<void>((resolve) => {
        setTimeout(() => {
          options.update?.()
          resolve()
        }, delay)
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
  return Object.assign(start, { ends })
}

/** Puts the browser back as it was before `withViewTransitions`. */
export function withoutViewTransitions() {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, "startViewTransition")
}
