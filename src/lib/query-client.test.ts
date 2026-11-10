import { describe, expect, it } from "vitest"

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
