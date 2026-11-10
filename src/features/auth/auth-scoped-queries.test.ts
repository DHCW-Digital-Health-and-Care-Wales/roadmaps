import { QueryClient } from "@tanstack/react-query"
import { act } from "react"
import { describe, expect, it } from "vitest"

import {
  authScopedQueryKey,
  invalidateAuthScopedQueriesOnSessionEnd,
  removeAuthScopedQueries,
} from "./auth-scoped-queries"
import { createFakeAuthClient } from "./testing/fake-auth-client"

const scopedKey = [...authScopedQueryKey, "roadmaps"]

function setup() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(scopedKey, "cached")
  queryClient.setQueryData(["public"], "kept")
  const isInvalidated = (key: readonly unknown[]) =>
    queryClient.getQueryState(key)?.isInvalidated
  return { queryClient, isInvalidated }
}

describe("removeAuthScopedQueries", () => {
  it("drops only auth-scoped data", () => {
    const { queryClient } = setup()

    removeAuthScopedQueries(queryClient)

    expect(queryClient.getQueryData(scopedKey)).toBeUndefined()
    expect(queryClient.getQueryData(["public"])).toBe("kept")
  })
})

describe("invalidateAuthScopedQueriesOnSessionEnd", () => {
  it("marks auth-scoped data stale, but keeps it, when a session expires", () => {
    const { queryClient, isInvalidated } = setup()
    const authClient = createFakeAuthClient({
      status: "connected",
      expiresAt: Date.now() + 60_000,
    })
    invalidateAuthScopedQueriesOnSessionEnd(authClient, queryClient)

    act(() => {
      authClient.setState({ status: "expired" })
    })

    expect(isInvalidated(scopedKey)).toBe(true)
    expect(queryClient.getQueryData(scopedKey)).toBe("cached")
    expect(isInvalidated(["public"])).toBe(false)
  })

  it("ignores changes that do not end a session", () => {
    const { queryClient, isInvalidated } = setup()
    const authClient = createFakeAuthClient({ status: "ready" })
    const stop = invalidateAuthScopedQueriesOnSessionEnd(
      authClient,
      queryClient,
    )

    act(() => {
      authClient.setState({ status: "connecting" })
    })
    stop()
    act(() => {
      authClient.setState({ status: "connected", expiresAt: Date.now() })
      authClient.setState({ status: "expired" })
    })

    expect(isInvalidated(scopedKey)).toBe(false)
  })
})
