import { describe, expect, it } from "vitest"

import { escapeRegExp } from "./escape-regexp"

describe("escapeRegExp", () => {
  it("makes a pattern that matches a string of every metacharacter, a backslash included, literally (DEF-029 S2)", () => {
    const text = String.raw`\^$.*+?()[]{}|/-`
    const pattern = new RegExp(`^${escapeRegExp(text)}$`)

    expect(pattern.test(text)).toBe(true)
    expect(pattern.test("x")).toBe(false)
  })

  it("keeps a backslash from escaping the character after it", () => {
    const pattern = new RegExp(`^${escapeRegExp(String.raw`a\.b`)}$`)

    expect(pattern.test(String.raw`a\.b`)).toBe(true)
    expect(pattern.test("a.b")).toBe(false)
    expect(pattern.test(String.raw`a\xb`)).toBe(false)
  })

  it("leaves a plain string as it was", () => {
    expect(escapeRegExp("abc 123")).toBe("abc 123")
  })
})
