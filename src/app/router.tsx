import { createHashHistory, createRouter } from "@tanstack/react-router"

import { routeTree } from "@/routeTree.gen"

// Hash history so deep links survive a refresh on GitHub Pages (ADR-0004).
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
