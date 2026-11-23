import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

import { afterEach, describe, expect, it } from "vitest"

import { apiProxy } from "./api-proxy.ts"

describe("apiProxy", () => {
  let directory: string | undefined

  afterEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true })
  })

  it("sends /api to this worktree's API with the API's own host", () => {
    directory = mkdtempSync(join(tmpdir(), "api-proxy-"))
    const envFile = join(directory, ".env.worktree")
    writeFileSync(envFile, "WORKTREE_SLOT=3\nAPI_PORT=21034\n")

    expect(apiProxy(pathToFileURL(envFile))).toEqual({
      "/api": { target: "http://127.0.0.1:21034", changeOrigin: true },
    })
  })
})
