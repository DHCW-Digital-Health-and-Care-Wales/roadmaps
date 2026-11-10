import { http, HttpResponse } from "msw/http"
import { describe, expect, it } from "vitest"

import { server } from "@/test/msw-server"

describe("test harness network", () => {
  it("serves requests from registered handlers", async () => {
    server.use(
      http.get("https://api.example.test/ping", () =>
        HttpResponse.json({ pong: true }),
      ),
    )

    const response = await fetch("https://api.example.test/ping")

    expect(await response.json()).toEqual({ pong: true })
  })

  it("fails requests that have no handler, keeping tests hermetic", async () => {
    await expect(fetch("https://api.example.test/unhandled")).rejects.toThrow()
  })
})
