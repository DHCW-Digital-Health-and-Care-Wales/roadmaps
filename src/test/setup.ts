import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { toast } from "sonner"
import { afterAll, afterEach, beforeAll } from "vitest"

import { server } from "@/test/msw-server"

// jsdom does not implement scrolling; TanStack Router calls it on navigation.
window.scrollTo = () => undefined

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" })
})

afterEach(() => {
  cleanup()
  // Sonner's store is global and replays active toasts into the next Toaster.
  toast.dismiss()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
