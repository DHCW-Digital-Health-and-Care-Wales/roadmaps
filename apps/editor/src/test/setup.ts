import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterAll, afterEach, beforeAll } from "vitest"

import { server } from "@/test/msw-server"

// `findBy` and `waitFor` wait 1 s by default, which a page test's render outlasts on a
// busy host (DEF-022).
configure({ asyncUtilTimeout: 3_000 })

// jsdom does not implement scrolling; TanStack Router calls it on navigation.
window.scrollTo = () => undefined
Element.prototype.scrollIntoView = () => undefined

// Nor media queries, nor layout: no query matches, so nothing pins (`usePinning`).
window.matchMedia = (query) => {
  const onchange: MediaQueryList["onchange"] = null
  return Object.assign(new EventTarget(), {
    matches: false,
    media: query,
    onchange,
  }) as MediaQueryList
}

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
