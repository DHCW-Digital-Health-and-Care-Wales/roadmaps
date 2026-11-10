import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { act } from "react"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"

import {
  authScopedQueryKey,
  invalidateAuthScopedQueriesOnSessionEnd,
  removeAuthScopedQueries,
} from "./auth-scoped-queries"
import { createFakeAuthClient } from "./testing/fake-auth-client"

const scopedKey = [...authScopedQueryKey, "roadmaps"]
const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 60_000,
}

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
  it("marks auth-scoped data stale, but keeps it, when a session expires", async () => {
    const { queryClient, isInvalidated } = setup()
    const authClient = createFakeAuthClient(connected)
    invalidateAuthScopedQueriesOnSessionEnd(authClient, queryClient)

    act(() => {
      authClient.setState({ status: "expired" })
    })

    await vi.waitFor(() => {
      expect(isInvalidated(scopedKey)).toBe(true)
    })
    expect(queryClient.getQueryData(scopedKey)).toBe("cached")
    expect(isInvalidated(["public"])).toBe(false)
  })

  it("abandons a request in flight, so its late reply cannot make the data fresh", async () => {
    const { queryClient, isInvalidated } = setup()
    const authClient = createFakeAuthClient(connected)
    invalidateAuthScopedQueriesOnSessionEnd(authClient, queryClient)
    let reply: (data: string) => void = () => undefined
    let signal: AbortSignal | undefined
    const observer = new QueryObserver(queryClient, {
      queryKey: scopedKey,
      queryFn: (context) => {
        signal = context.signal
        return new Promise<string>((resolve) => {
          reply = resolve
        })
      },
      staleTime: 60_000,
    })
    const unsubscribe = observer.subscribe(() => undefined)
    void observer.refetch()

    act(() => {
      authClient.setState({ status: "expired" })
    })
    await vi.waitFor(() => {
      expect(isInvalidated(scopedKey)).toBe(true)
    })
    reply("late")
    await Promise.resolve()

    expect(signal?.aborted).toBe(true)
    expect(queryClient.getQueryState(scopedKey)).toMatchObject({
      data: "cached",
      fetchStatus: "idle",
      isInvalidated: true,
    })
    unsubscribe()
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
