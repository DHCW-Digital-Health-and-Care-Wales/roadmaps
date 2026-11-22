import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DEFAULT_DEV_PORTS, resolveDevPorts } from "./dev-ports.ts"

let dir: string
const file = () => pathToFileURL(join(dir, ".env.worktree"))

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "site-dev-ports-"))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe("resolveDevPorts", () => {
  it("keeps the canonical ports without a worktree's file", () => {
    expect(resolveDevPorts(file())).toEqual(DEFAULT_DEV_PORTS)
  })

  it("reads the public site's ports, not the editor's", () => {
    writeFileSync(
      file(),
      "WORKTREE_SLOT=6\nDEV_PORT=21060\nPREVIEW_PORT=21061\nSITE_DEV_PORT=21062\nSITE_PREVIEW_PORT=21063\n",
    )

    expect(resolveDevPorts(file())).toEqual({ dev: 21062, preview: 21063 })
  })

  it("asks for setup again when the file predates the site's ports", () => {
    writeFileSync(
      file(),
      "WORKTREE_SLOT=6\nDEV_PORT=21060\nPREVIEW_PORT=21061\n",
    )

    expect(() => resolveDevPorts(file())).toThrow(
      /no valid SITE_DEV_PORT; rerun pnpm worktree:setup/,
    )
  })
})
