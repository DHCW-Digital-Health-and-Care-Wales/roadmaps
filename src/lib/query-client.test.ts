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
