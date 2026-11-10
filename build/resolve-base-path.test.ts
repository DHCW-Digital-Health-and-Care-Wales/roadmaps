import { describe, expect, it } from "vitest"

import { resolveBasePath } from "./resolve-base-path.ts"

describe("resolveBasePath", () => {
  it("defaults to the root when nothing is set", () => {
    expect(resolveBasePath({})).toBe("/")
  })

  it("serves a project site under the repository name", () => {
    expect(
      resolveBasePath({ GITHUB_REPOSITORY: "collisdigital/roadmaps-editor" }),
    ).toBe("/roadmaps-editor/")
  })

  it("serves a user or organisation site at the root", () => {
    expect(
      resolveBasePath({
        GITHUB_REPOSITORY: "collisdigital/collisdigital.github.io",
      }),
    ).toBe("/")
    expect(
      resolveBasePath({
        GITHUB_REPOSITORY: "CollisDigital/collisdigital.GitHub.io",
      }),
    ).toBe("/")
  })

  it("serves a custom domain at the root", () => {
    expect(
      resolveBasePath({
        GITHUB_REPOSITORY: "collisdigital/roadmaps-editor",
        PAGES_CUSTOM_DOMAIN: "roadmaps.example.com",
      }),
    ).toBe("/")
  })

  it("lets VITE_BASE_PATH override everything, normalising slashes", () => {
    const env = {
      GITHUB_REPOSITORY: "collisdigital/roadmaps-editor",
      PAGES_CUSTOM_DOMAIN: "roadmaps.example.com",
    }
    expect(resolveBasePath({ ...env, VITE_BASE_PATH: "preview" })).toBe(
      "/preview/",
    )
    expect(resolveBasePath({ ...env, VITE_BASE_PATH: "/a/b/" })).toBe("/a/b/")
    expect(resolveBasePath({ ...env, VITE_BASE_PATH: "/" })).toBe("/")
  })

  it("treats blank values as unset, as Actions expands unset variables to empty", () => {
    expect(
      resolveBasePath({
        VITE_BASE_PATH: "",
        PAGES_CUSTOM_DOMAIN: " ",
        GITHUB_REPOSITORY: "collisdigital/roadmaps-editor",
      }),
    ).toBe("/roadmaps-editor/")
  })

  it.each(["owner", "owner/", "/repo", "owner/repo/extra"])(
    "rejects a malformed GITHUB_REPOSITORY %j",
    (repository) => {
      expect(() => resolveBasePath({ GITHUB_REPOSITORY: repository })).toThrow(
        /owner\/repo/,
      )
    },
  )

  it.each(["https://example.com/", "a b", "../up", "a//b", "a?b"])(
    "rejects an unsafe VITE_BASE_PATH %j",
    (path) => {
      expect(() => resolveBasePath({ VITE_BASE_PATH: path })).toThrow(
        /Unsupported base path/,
      )
    },
  )
})
