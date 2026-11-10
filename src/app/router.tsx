import {
  createHashHistory,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router"

import { routeTree } from "@/routeTree.gen"

/**
 * The app router. Hash history by default, so deep links survive a refresh on GitHub
 * Pages (ADR-0004); tests pass a memory history.
 */
export function createAppRouter(history: RouterHistory = createHashHistory()) {
  return createRouter({ routeTree, history, scrollRestoration: true })
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
