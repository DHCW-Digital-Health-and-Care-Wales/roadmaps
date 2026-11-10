import { describe, expect, it } from "vitest"

import { AppError, type AppErrorKind, isAppError, toAppError } from "./errors"

describe("AppError", () => {
  it("is an Error carrying its kind, with the kind as the default message", () => {
    const error = new AppError("forbidden")

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("AppError")
    expect(error.kind).toBe("forbidden")
    expect(error.message).toBe("forbidden")
    expect(error.status).toBeUndefined()
    expect(error).not.toHaveProperty("cause")
  })

  it.each<[AppErrorKind, boolean]>([
    ["unauthenticated", false],
    ["forbidden", false],
    ["not-found", false],
    ["rate-limited", true],
    ["network", true],
    ["invalid-response", false],
    ["invalid-data", false],
    ["unknown", false],
  ])("defaults %s to retryable=%s", (kind, retryable) => {
    expect(new AppError(kind).retryable).toBe(retryable)
  })

  it("accepts an explicit message, retryable flag, status and cause", () => {
    const cause = new TypeError("boom")
    const error = new AppError("unknown", {
      message: "HTTP 503",
      retryable: true,
      status: 503,
      cause,
    })

    expect(error).toMatchObject({
      message: "HTTP 503",
      retryable: true,
      status: 503,
    })
    expect(error.cause).toBe(cause)
  })
})

describe("isAppError", () => {
  it("recognises only AppError instances", () => {
    expect(isAppError(new AppError("network"))).toBe(true)
    expect(isAppError(new Error("network"))).toBe(false)
    expect(isAppError({ kind: "network", retryable: true })).toBe(false)
    expect(isAppError(undefined)).toBe(false)
  })
})

describe("toAppError", () => {
  it("returns an AppError unchanged", () => {
    const error = new AppError("not-found")

    expect(toAppError(error)).toBe(error)
  })

  it("wraps other errors as unknown, keeping the message and cause", () => {
    const cause = new RangeError("out of range")
    const error = toAppError(cause)

    expect(error).toMatchObject({ kind: "unknown", retryable: false })
    expect(error.message).toBe("out of range")
    expect(error.cause).toBe(cause)
  })

  it.each([["a string"], [42], [null], [undefined], [{ any: "object" }]])(
    "wraps the non-Error value %j as unknown",
    (value) => {
      const error = toAppError(value)

      expect(error.kind).toBe("unknown")
      expect(error.message).toBe("unknown")
      expect(error.cause).toBe(value)
    },
  )
})
