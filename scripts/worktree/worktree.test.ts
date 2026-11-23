import { execFile, spawnSync } from "node:child_process"
import {
  chmodSync,
  copyFileSync,
  existsSync,
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
 * Drives `worktree.sh` in scratch worktrees against a scratch registry, with `pnpm`,
 * `uv` and `docker` stubbed out, each recording its calls, and `lsof` and `fuser` too,
 * so `teardown` stops nothing listening on a slot's real ports.
 */
const SCRIPT = join(import.meta.dirname, "worktree.sh")
const EDITOR_ENV_EXAMPLE = "VITE_GOOGLE_SPREADSHEET_ID=example\n"
const run = promisify(execFile)

const STUBBED = ["pnpm", "uv", "docker", "lsof", "fuser"]

let scratch: string
let registry: string
let calls: string
let bin: string
let env: NodeJS.ProcessEnv

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "worktree-script-"))
  registry = join(scratch, "registry")
  calls = join(scratch, "calls")
  bin = join(scratch, "bin")
  mkdirSync(bin)
  for (const command of STUBBED) {
    writeFileSync(
      join(bin, command),
      `#!/bin/sh\necho "${command} $PWD $*" >> "${calls}"\nexit 0\n`,
    )
    chmodSync(join(bin, command), 0o755)
  }
  // The system's tools, and no uv or docker installed for the user.
  env = {
    ...process.env,
    PATH: `${bin}:/usr/bin:/bin`,
    RE_WORKTREE_REGISTRY: registry,
  }
})

/** The stubs' calls, as `<command> <working directory> <arguments>`. */
function called(command: string): string[] {
  if (!existsSync(calls)) return []
  return readFileSync(calls, "utf8")
    .split("\n")
    .filter((line) => line.startsWith(`${command} `))
    .map((line) => line.slice(command.length + 1))
}

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true })
})

/** A checkout holding just the script, as the script finds its root from its path. */
function worktree(name: string): string {
  const root = join(scratch, name)
  mkdirSync(join(root, "scripts", "worktree"), { recursive: true })
  copyFileSync(SCRIPT, join(root, "scripts", "worktree", "worktree.sh"))
  mkdirSync(join(root, "apps", "editor"), { recursive: true })
  mkdirSync(join(root, "apps", "api"), { recursive: true })
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

  it("writes each app's ports at the root and the editor's .env.local from its example", async () => {
    const root = worktree("fresh")
    const slot = await setup(root)
    const base = 21000 + slot * 10

    expect(readFileSync(join(root, ".env.worktree"), "utf8")).toContain(
      [
        `DEV_PORT=${String(base)}`,
        `PREVIEW_PORT=${String(base + 1)}`,
        `SITE_DEV_PORT=${String(base + 2)}`,
        `SITE_PREVIEW_PORT=${String(base + 3)}`,
        `API_PORT=${String(base + 4)}`,
        `DB_PORT=${String(base + 5)}`,
        `API_DB_PROJECT=roadmaps-slot-${String(slot)}`,
      ].join("\n"),
    )
    expect(
      readFileSync(join(root, "apps", "editor", ".env.local"), "utf8"),
    ).toBe(EDITOR_ENV_EXAMPLE)
  })

  it("installs the API's locked dependencies, and its Python with them", async () => {
    const root = worktree("python")
    await setup(root)

    expect(called("uv")).toEqual([`${join(root, "apps", "api")} sync --locked`])
  })

  it("stops, naming uv, when uv is not installed", async () => {
    rmSync(join(bin, "uv"))
    const root = worktree("no-uv")

    await expect(setup(root)).rejects.toThrow(
      /uv is required for apps\/api; install it/,
    )
    expect(called("pnpm")).toEqual([])
  })

  it("reclaims the slot of a worktree deleted without a teardown, removing its database", async () => {
    const deleted = worktree("deleted")
    const slot = await setup(deleted)
    rmSync(deleted, { recursive: true })

    expect(await setup(worktree("next"))).toBe(slot)
    expect(called("docker")).toEqual([
      `/ compose --project-name roadmaps-slot-${String(slot)} down --volumes --remove-orphans`,
    ])
  })

  it("keeps a deleted worktree's slot while its database cannot be removed", async () => {
    const deleted = worktree("deleted-docker-down")
    const slot = await setup(deleted)
    rmSync(deleted, { recursive: true })
    failDocker()

    expect(await setup(worktree("after"))).not.toBe(slot)
    expect(readdirSync(registry)).toContain(String(slot))
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

/** Makes the docker stub fail, as Docker does with its daemon stopped. */
function failDocker(): void {
  writeFileSync(
    join(bin, "docker"),
    `#!/bin/sh\necho "docker $PWD $*" >> "${calls}"\nexit 1\n`,
  )
}

describe("worktree.sh teardown", () => {
  it("keeps the slot, naming the fix, when its database cannot be removed", async () => {
    const root = worktree("docker-down")
    const slot = await setup(root)
    failDocker()

    const teardown = run(
      join(root, "scripts", "worktree", "worktree.sh"),
      ["teardown"],
      { env, timeout: 30_000 },
    )

    await expect(teardown).rejects.toThrow(
      /could not remove Compose project roadmaps-slot-\d+; start Docker and rerun/,
    )
    expect(readdirSync(registry)).toContain(String(slot))
  })

  it("removes the slot's database container and its volume, and releases the slot", async () => {
    const root = worktree("done")
    const slot = await setup(root)

    await run(join(root, "scripts", "worktree", "worktree.sh"), ["teardown"], {
      env,
      timeout: 30_000,
    })

    expect(called("docker")).toEqual([
      `/ compose --project-name roadmaps-slot-${String(slot)} down --volumes --remove-orphans`,
    ])
    expect(readdirSync(registry).filter((f) => /^\d+$/.test(f))).toEqual([])
  })
})

describe("worktree.sh info", () => {
  async function info(root: string): Promise<string> {
    const { stdout } = await run(
      join(root, "scripts", "worktree", "worktree.sh"),
      ["info"],
      { env, timeout: 30_000 },
    )
    return stdout
  }

  it("names each app's ports", async () => {
    const root = worktree("listed")
    const base = 21000 + (await setup(root)) * 10

    const output = await info(root)

    expect(output).toMatch(
      new RegExp(`editor:dev\\s+http://localhost:${String(base)}\\n`),
    )
    expect(output).toMatch(
      new RegExp(`site:dev\\s+http://localhost:${String(base + 2)}/`),
    )
    expect(output).toMatch(
      new RegExp(`site:preview.*\\s+http://localhost:${String(base + 3)}/`),
    )
    expect(output).toMatch(
      new RegExp(`api:dev\\s+http://127\\.0\\.0\\.1:${String(base + 4)}\\n`),
    )
    expect(output).toMatch(new RegExp(`127\\.0\\.0\\.1:${String(base + 5)}\\n`))
  })

  it("asks for setup again when .env.worktree predates a port", async () => {
    const root = worktree("older")
    await setup(root)
    writeFileSync(
      join(root, ".env.worktree"),
      "WORKTREE_SLOT=1\nDEV_PORT=21010\nPREVIEW_PORT=21011\n",
    )

    await expect(info(root)).rejects.toThrow(
      /no SITE_DEV_PORT — rerun pnpm worktree:setup/,
    )
  })
})
