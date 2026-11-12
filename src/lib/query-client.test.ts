import type { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { AppError } from "./errors"
import { createQueryClient, shouldRetryQuery } from "./query-client"

describe("shouldRetryQuery", () => {
  it("retries a retryable AppError at most twice", () => {
    const error = new AppError("network")

    expect(shouldRetryQuery(0, error)).toBe(true)
    expect(shouldRetryQuery(1, error)).toBe(true)
    expect(shouldRetryQuery(2, error)).toBe(false)
  })

  it.each([
    ["a non-retryable AppError", new AppError("forbidden")],
    ["an unexpected error", new Error("bug")],
    ["a non-Error value", "oops"],
  ])("never retries %s", (_name, error) => {
    expect(shouldRetryQuery(0, error)).toBe(false)
  })
})

describe("createQueryClient", () => {
  it("applies the app's query defaults", () => {
    const queries = createQueryClient().getDefaultOptions().queries

    expect(queries).toMatchObject({
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    })
  })
})

describe.each([
  [
    "a query",
    (client: QueryClient, error: Error) =>
      client.query({
        queryKey: ["scoped"],
        queryFn: () => Promise.reject(error),
        retry: false,
      }),
  ],
  [
    "a mutation",
    (client: QueryClient, error: Error) =>
      client
        .getMutationCache()
        .build(client, { mutationFn: () => Promise.reject(error) })
        .execute(undefined),
  ],
])("createQueryClient onUnauthenticated, for %s", (_name, run) => {
  async function failWith(error: Error) {
    const onUnauthenticated = vi.fn()
    await run(createQueryClient({ onUnauthenticated }), error).catch(
      () => undefined,
    )
    return onUnauthenticated
  }

  it("reports a rejected session once", async () => {
    expect(
      await failWith(new AppError("unauthenticated")),
    ).toHaveBeenCalledOnce()
  })

  it.each([
    ["another AppError", new AppError("forbidden")],
    ["an unexpected error", new Error("bug")],
  ])("ignores %s", async (_name, error) => {
    expect(await failWith(error)).not.toHaveBeenCalled()
  })
})

describe("createQueryClient onUnauthenticated, for a mutation and its session", () => {
  /** Starts a mutation in session `"a"`, moves to `after`, then fails with a 401. */
  async function lateFailure(after: string) {
    const onUnauthenticated = vi.fn()
    let session = "a"
    let reject: ((error: Error) => void) | undefined
    const client = createQueryClient({
      onUnauthenticated,
      currentSession: () => session,
    })
    const running = client
      .getMutationCache()
      .build(client, {
        mutationFn: () =>
          new Promise((_resolve, fail: (error: Error) => void) => {
            reject = fail
          }),
      })
      .execute(undefined)
    // The request is sent: the mutation function is waiting for its answer.
    const answer = await vi.waitFor(() => {
      if (reject === undefined) throw new Error("Not sent yet")
      return reject
    })

    session = after
    answer(new AppError("unauthenticated"))
    await expect(running).rejects.toMatchObject({ kind: "unauthenticated" })
    return onUnauthenticated
  }

  it("reports a 401 while the session it started in is current", async () => {
    expect(await lateFailure("a")).toHaveBeenCalledOnce()
  })

  it("ignores a 401 that arrives after the session changed", async () => {
    expect(await lateFailure("b")).not.toHaveBeenCalled()
  })
})
