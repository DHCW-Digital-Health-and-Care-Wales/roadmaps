import { afterEach, describe, expect, it, vi } from "vitest"

import { FAKE_ACCESS_TOKEN, createFakeAuthClient } from "./fake-auth-client"

describe("createFakeAuthClient", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns a token only while connected and unexpired", () => {
    vi.useFakeTimers({ now: 1_000 })
    const client = createFakeAuthClient()
    expect(client.getAccessToken()).toBeNull()

    client.setState({ status: "connected", expiresAt: 2_000 })
    expect(client.getAccessToken()).toBe(FAKE_ACCESS_TOKEN)

    vi.setSystemTime(2_000)
    expect(client.getAccessToken()).toBeNull()
  })

  it("expires a connected session when unauthenticated is reported", () => {
    const client = createFakeAuthClient()
    client.connect()
    client.reportUnauthenticated()
    expect(client.getSnapshot()).toEqual({ status: "expired" })
    expect(client.getAccessToken()).toBeNull()
  })
})
