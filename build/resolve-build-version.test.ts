import { describe, expect, it } from "vitest"

import { resolveBuildVersion } from "./resolve-build-version.ts"

const SHA = "3F5A1C9D8E7B6A5948372615FEDCBA9876543210"

describe("resolveBuildVersion", () => {
  it("is dev for a local build", () => {
    expect(resolveBuildVersion("1.2.3", {})).toBe("dev")
  })

  it("is the package version and the short commit for a CI build", () => {
    expect(resolveBuildVersion("1.2.3", { GITHUB_SHA: SHA })).toBe(
      "1.2.3+3f5a1c9",
    )
  })

  it("treats a blank commit as unset", () => {
    expect(resolveBuildVersion("1.2.3", { GITHUB_SHA: "" })).toBe("dev")
    expect(resolveBuildVersion("1.2.3", { GITHUB_SHA: "  " })).toBe("dev")
  })

  it("rejects a commit that is not a SHA", () => {
    expect(() =>
      resolveBuildVersion("1.2.3", { GITHUB_SHA: "main; rm -rf /" }),
    ).toThrow(/GITHUB_SHA/)
    expect(() => resolveBuildVersion("1.2.3", { GITHUB_SHA: "abc" })).toThrow(
      /GITHUB_SHA/,
    )
  })
})
