import { execFile, spawnSync } from "node:child_process"
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

/**
 * Drives `worktree.sh setup` in scratch worktrees against a scratch registry, with
 * `pnpm` stubbed out. It never runs `teardown`, which stops whatever listens on a
 * slot's real ports.
 */
const SCRIPT = join(import.meta.dirname, "worktree.sh")
const EDITOR_ENV_EXAMPLE = "VITE_GOOGLE_SPREADSHEET_ID=example\n"
const run = promisify(execFile)

let scratch: string
let registry: string
let env: NodeJS.ProcessEnv

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "worktree-script-"))
  registry = join(scratch, "registry")
  const bin = join(scratch, "bin")
  mkdirSync(bin)
  writeFileSync(join(bin, "pnpm"), "#!/bin/sh\nexit 0\n")
  chmodSync(join(bin, "pnpm"), 0o755)
  env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH ?? ""}`,
    RE_WORKTREE_REGISTRY: registry,
  }
})

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true })
})

/** A checkout holding just the script, as the script finds its root from its path. */
function worktree(name: string): string {
  const root = join(scratch, name)
  mkdirSync(join(root, "scripts", "worktree"), { recursive: true })
  copyFileSync(SCRIPT, join(root, "scripts", "worktree", "worktree.sh"))
  mkdirSync(join(root, "apps", "editor"), { recursive: true })
  writeFileSync(
    join(root, "apps", "editor", ".env.example"),
    EDITOR_ENV_EXAMPLE,
  )
  return root
}

async function setup(
  root: string,
  extraEnv: NodeJS.ProcessEnv = {},
): Promise<number> {
  await run(join(root, "scripts", "worktree", "worktree.sh"), ["setup"], {
    env: { ...env, ...extraEnv },
    // Kills a hung script, which would otherwise outlive the test and spin on.
    timeout: 30_000,
  })
  return slotOf(root)
}

function slotOf(root: string): number {
  const text = readFileSync(join(root, ".env.worktree"), "utf8")
  return Number(/^WORKTREE_SLOT=(\d+)$/m.exec(text)?.[1])
}

/** The pid of a process that has exited, as a crashed lock holder leaves behind. */
function deadPid(): number {
  // spawnSync returns once the process it ran has exited.
  return spawnSync("true").pid
}

describe("worktree.sh setup", () => {
  it("keeps a worktree's slot when it runs again", async () => {
    const root = worktree("a")
    const slot = await setup(root)

    expect(await setup(root)).toBe(slot)
    expect(readdirSync(registry).filter((f) => /^\d+$/.test(f))).toEqual([
      String(slot),
    ])
  })

  it("writes the ports at the root and the editor's .env.local from its example", async () => {
    const root = worktree("fresh")
    const slot = await setup(root)

    expect(readFileSync(join(root, ".env.worktree"), "utf8")).toContain(
      `DEV_PORT=${String(21000 + slot * 10)}`,
    )
    expect(
      readFileSync(join(root, "apps", "editor", ".env.local"), "utf8"),
    ).toBe(EDITOR_ENV_EXAMPLE)
  })

  it("reclaims the slot of a worktree deleted without a teardown", async () => {
    const deleted = worktree("deleted")
    const slot = await setup(deleted)
    rmSync(deleted, { recursive: true })

    expect(await setup(worktree("next"))).toBe(slot)
  })

  it("stops with the fix named when a crashed setup left both of its locks", async () => {
    mkdirSync(registry, { recursive: true })
    symlinkSync(String(deadPid()), join(registry, ".lock"))
    symlinkSync(String(deadPid()), join(registry, ".lock.break"))

    const failure = setup(worktree("blocked"), { RE_WORKTREE_LOCK_TRIES: "5" })

    await expect(failure).rejects.toThrow(/remove .*\.lock and .*\.lock\.break/)
  }, 10_000)

  it("gives concurrent setups distinct slots after a crashed setup left its lock", async () => {
    const roots = Array.from({ length: 8 }, (_, i) => worktree(`w${String(i)}`))
    mkdirSync(registry, { recursive: true })

    for (let round = 0; round < 20; round++) {
      for (const root of roots)
        rmSync(join(root, ".env.worktree"), { force: true })
      for (const file of readdirSync(registry)) rmSync(join(registry, file))
      symlinkSync(String(deadPid()), join(registry, ".lock"))

      const slots = await Promise.all(roots.map((root) => setup(root)))

      expect(new Set(slots).size).toBe(roots.length)
      expect(readdirSync(registry)).not.toContain(".lock")
    }
  }, 60_000)
})
