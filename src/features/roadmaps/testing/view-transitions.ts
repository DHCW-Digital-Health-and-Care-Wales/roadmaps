import { vi } from "vitest"

/**
 * A browser with view transitions and their types, which draws each update a while
 * after it was asked for, as a view transition does, and records the types of each it
 * started. Undo it with `withoutViewTransitions`. Call it after a test's setup moves, or
 * each of those is drawn late too, and the next is chosen before it has landed.
 */
export function withViewTransitions(delay = 50) {
  vi.stubGlobal(
    "ViewTransition",
    class {
      get types() {
        return new Set<string>()
      }
    },
  )
  const started: (readonly string[] | undefined)[] = []
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: (options: StartViewTransitionOptions) => {
      started.push(options.types ?? undefined)
      const finished = new Promise<void>((resolve) => {
        setTimeout(() => {
          options.update?.()
          resolve()
        }, delay)
      })
      return {
        finished,
        ready: finished,
        updateCallbackDone: finished,
        skipTransition: vi.fn(),
      }
    },
  })
  return { started }
}

/** Puts the browser back as it was before `withViewTransitions`. */
export function withoutViewTransitions() {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, "startViewTransition")
}
