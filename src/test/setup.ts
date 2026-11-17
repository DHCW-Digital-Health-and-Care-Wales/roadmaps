import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll } from "vitest"

import { server } from "@/test/msw-server"

// jsdom does not implement scrolling; TanStack Router calls it on navigation.
window.scrollTo = () => undefined

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
